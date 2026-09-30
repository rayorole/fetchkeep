import { existsSync } from "node:fs";
import type * as Playwright from "playwright-core";
import type { Browser, BrowserContext, Route, WebSocketRoute } from "playwright-core";
import { FetchkeepError, toFetchkeepError } from "../core/errors.js";
import type { BrowserAvailability, BrowserProvider, RenderRequest, RenderResult, RequestStats } from "./provider.js";
import { inspectDocument, waitForContent } from "./readiness.js";

export interface ChromiumOptions {
  /** Playwright channel (`chromium`, `chrome`, `msedge`, …). Default: Playwright's Chromium headless shell. */
  channel?: string | undefined;
  /** Explicit browser executable (e.g. an installed Chrome/Edge). Takes precedence over `channel`. */
  executablePath?: string | undefined;
  /** Keep Chromium's OS sandbox on (default). Disable only where the environment cannot support it. */
  sandbox: boolean;
}

type PlaywrightModule = typeof Playwright;

const INSTALL_HINT =
  "Install the optional Chromium backend: `npm install playwright-core` next to fetchkeep, then `npx playwright-core install --only-shell chromium` " +
  "(downloads only the headless shell). Or point browser.chromium.executablePath / FETCHKEEP_CHROMIUM_EXECUTABLE at an installed Chrome/Edge.";

async function loadPlaywright(): Promise<PlaywrightModule | null> {
  try {
    // Optional peer dependency: only loaded when the Chromium backend is configured.
    return await import("playwright-core");
  } catch {
    return null;
  }
}

/**
 * Chromium via Playwright. One browser process is launched lazily and reused; every render gets a fresh
 * incognito-like context (no cookies, storage, cache or service workers shared between requests) and a temporary
 * automation profile. The user's own browser profile is never used.
 */
export class ChromiumProvider implements BrowserProvider {
  readonly name = "chromium" as const;
  private browser: Browser | null = null;
  private launching: Promise<Browser> | null = null;

  constructor(private readonly opts: ChromiumOptions) {}

  get running(): boolean {
    return this.browser !== null;
  }

  async availability(): Promise<BrowserAvailability> {
    const pw = await loadPlaywright();
    if (!pw) return { available: false, detail: `playwright-core is not installed. ${INSTALL_HINT}` };
    if (this.opts.executablePath) {
      return existsSync(this.opts.executablePath)
        ? { available: true, detail: `Chromium-compatible browser at ${this.opts.executablePath}` }
        : { available: false, detail: `browser.chromium.executablePath does not exist: ${this.opts.executablePath}` };
    }
    // Playwright exposes no public path for the headless shell, so availability is established by launching it.
    // The launched browser is kept and reused by the render that follows.
    try {
      await this.ensureBrowser(Date.now() + 30_000);
      return { available: true, detail: `Chromium ${this.browser?.version() ?? ""} (${this.opts.executablePath ?? this.opts.channel ?? "Playwright headless shell"})` };
    } catch (err) {
      return { available: false, detail: (err as Error).message + (err instanceof FetchkeepError && err.hint ? ` ${err.hint}` : "") };
    }
  }

  private async ensureBrowser(deadline: number): Promise<Browser> {
    if (this.browser?.isConnected()) return this.browser;
    this.launching ??= (async () => {
      const pw = await loadPlaywright();
      if (!pw) throw new FetchkeepError("browser_unavailable", "playwright-core is not installed", { hint: INSTALL_HINT });
      try {
        const browser = await pw.chromium.launch({
          headless: true,
          chromiumSandbox: this.opts.sandbox,
          timeout: Math.max(1, deadline - Date.now()),
          ...(this.opts.executablePath ? { executablePath: this.opts.executablePath } : this.opts.channel ? { channel: this.opts.channel } : {}),
          args: ["--disable-background-networking", "--disable-component-update", "--no-first-run", "--disable-sync", "--metrics-recording-only"],
        });
        browser.on("disconnected", () => {
          if (this.browser === browser) this.browser = null;
        });
        return browser;
      } catch (err) {
        const msg = (err as Error).message ?? String(err);
        if (/Executable doesn't exist|Failed to launch|not found|ENOENT/i.test(msg)) {
          throw new FetchkeepError("browser_unavailable", `Chromium could not be launched: ${msg.split("\n")[0]}`, { hint: INSTALL_HINT });
        }
        throw new FetchkeepError("browser_failed", `Chromium launch failed: ${msg.split("\n")[0]}`, { cause: err });
      }
    })();
    try {
      this.browser = await this.launching;
    } finally {
      this.launching = null;
    }
    return this.browser;
  }

  async render(req: RenderRequest): Promise<RenderResult> {
    req.signal.throwIfAborted();
    const started = performance.now();
    const browser = await this.ensureBrowser(req.deadline);
    const stats: RequestStats = { total: 0, blocked: 0, failed: 0 };
    let context: BrowserContext | null = null;
    const onAbort = () => void context?.close().catch(() => undefined);
    req.signal.addEventListener("abort", onAbort, { once: true });
    try {
      context = await browser.newContext({
        userAgent: req.userAgent,
        serviceWorkers: "block",
        acceptDownloads: false,
        javaScriptEnabled: true,
        ignoreHTTPSErrors: false,
      });
      req.signal.throwIfAborted();
      await context.route("**/*", async (route: Route) => {
        stats.total++;
        const target = route.request().url();
        if (/^(data|blob|about):/i.test(target)) return route.continue();
        try {
          const url = req.policy.checkUrl(target);
          await req.policy.resolve(url.hostname);
          await route.continue();
        } catch {
          stats.blocked++;
          await route.abort("blockedbyclient").catch(() => undefined);
        }
      });
      await context.routeWebSocket(/.*/, async (ws: WebSocketRoute) => {
        try {
          const url = new URL(ws.url());
          if (url.protocol !== "ws:" && url.protocol !== "wss:") throw new Error("scheme");
          await req.policy.resolve(url.hostname);
          ws.connectToServer();
        } catch {
          stats.blocked++;
          await ws.close({ code: 1008, reason: "blocked by fetchkeep network policy" });
        }
      });
      const page = await context.newPage();
      page.on("requestfailed", () => stats.failed++);
      req.signal.throwIfAborted();
      const navStart = performance.now();
      const launchMs = navStart - started;
      const timeout = Math.max(1, req.deadline - Date.now());
      const response = await page.goto(req.url, { waitUntil: "load", timeout });
      const readinessStart = performance.now();
      const navigateMs = readinessStart - navStart;
      await waitForContent(() => page.evaluate(inspectDocument, false), req);
      const serializeStart = performance.now();
      const readinessMs = serializeStart - readinessStart;
      let { html } = await page.evaluate(inspectDocument, true);
      let truncated = false;
      if (Buffer.byteLength(html) > req.maxBytes) {
        html = Buffer.from(html).subarray(0, req.maxBytes).toString("utf8");
        truncated = true;
      }
      const headers = response ? await response.allHeaders().catch(() => ({}) as Record<string, string>) : {};
      return {
        finalUrl: page.url(),
        status: response?.status() ?? 200,
        contentType: (headers["content-type"] ?? "text/html").split(";")[0]!.trim().toLowerCase(),
        html,
        truncated,
        requests: stats,
        timings: { launchMs, navigateMs, readinessMs, serializeMs: performance.now() - serializeStart, totalMs: performance.now() - started },
      };
    } catch (err) {
      if (req.signal.aborted) throw toFetchkeepError(err, req.signal);
      const msg = (err as Error).message ?? String(err);
      if (/Timeout .*exceeded/i.test(msg)) throw new FetchkeepError("timeout", `Chromium navigation timed out: ${msg.split("\n")[0]}`);
      if (/ERR_BLOCKED_BY_CLIENT/.test(msg)) {
        throw new FetchkeepError("blocked_by_policy", `Chromium navigation to ${req.url} was blocked by the network policy`);
      }
      if (/Download is starting/i.test(msg)) {
        throw new FetchkeepError("unsupported_content_type", "The URL triggers a download (e.g. a PDF); use mode http for non-HTML resources");
      }
      throw new FetchkeepError("browser_failed", `Chromium render failed: ${msg.split("\n")[0]}`, { cause: err });
    } finally {
      req.signal.removeEventListener("abort", onAbort);
      await context?.close().catch(() => undefined);
    }
  }

  async close(): Promise<void> {
    const b = this.browser;
    this.browser = null;
    await b?.close().catch(() => undefined);
  }
}
