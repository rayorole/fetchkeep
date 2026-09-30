import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { createServer, connect } from "node:net";
import { once } from "node:events";
import { basename } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import type * as Puppeteer from "puppeteer-core";
import type { Browser, HTTPRequest } from "puppeteer-core";
import { FetchkeepError, toFetchkeepError } from "../core/errors.js";
import type { BrowserAvailability, BrowserProvider, RenderRequest, RenderResult, RequestStats } from "./provider.js";

export interface LightpandaOptions {
  /** CDP endpoint of a running `lightpanda serve`, e.g. `ws://127.0.0.1:9222`. */
  endpoint?: string | undefined;
  /** Executable to spawn (`lightpanda`, or a wrapper such as `wsl`). */
  executablePath?: string | undefined;
  /** Arguments placed before `serve` (e.g. `-d Ubuntu -- /opt/lightpanda` when using `wsl`). */
  executableArgs: string[];
  /** Pass `--block-private-networks` when spawning (defense in depth when the policy allows no private destination). */
  blockPrivateNetworks: boolean;
}

type PuppeteerModule = typeof Puppeteer;

const INSTALL_HINT =
  "Lightpanda is experimental and optional. Install `puppeteer-core` next to fetchkeep, then either run `lightpanda serve` yourself and set " +
  "FETCHKEEP_LIGHTPANDA_ENDPOINT=ws://127.0.0.1:9222, or set FETCHKEEP_LIGHTPANDA_EXECUTABLE to the binary. Lightpanda (AGPL-3.0) is not bundled; " +
  "Linux/macOS builds only — on Windows run it inside WSL2.";

async function loadPuppeteer(): Promise<PuppeteerModule | null> {
  try {
    // Optional peer dependency: only loaded when the Lightpanda backend is configured.
    return await import("puppeteer-core");
  } catch {
    return null;
  }
}

async function freePort(): Promise<number> {
  const srv = createServer();
  const listening = once(srv, "listening");
  srv.listen(0, "127.0.0.1");
  await listening;
  const port = (srv.address() as { port: number }).port;
  srv.close();
  return port;
}

async function waitForPort(port: number, deadline: number, child: ChildProcess): Promise<void> {
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new FetchkeepError("browser_failed", `lightpanda exited with code ${child.exitCode} during startup`);
    const probe = Promise.withResolvers<boolean>();
    const s = connect(port, "127.0.0.1");
    s.once("connect", () => {
      s.destroy();
      probe.resolve(true);
    });
    s.once("error", () => probe.resolve(false));
    const ok = await probe.promise;
    if (ok) return;
    await sleep(50);
  }
  throw new FetchkeepError("timeout", "lightpanda did not start listening before the deadline");
}

/**
 * EXPERIMENTAL. Lightpanda over CDP with puppeteer-core. Either connects to a user-provided endpoint or spawns
 * `lightpanda serve` on a free loopback port (telemetry disabled via LIGHTPANDA_DISABLE_TELEMETRY). Lightpanda is a
 * separate AGPL-3.0 program; Fetchkeep never bundles or downloads it.
 */
export class LightpandaProvider implements BrowserProvider {
  readonly name = "lightpanda" as const;
  private child: ChildProcess | null = null;
  private endpoint: string | null = null;

  constructor(private readonly opts: LightpandaOptions) {}

  get running(): boolean {
    return this.child !== null && this.child.exitCode === null;
  }

  async availability(): Promise<BrowserAvailability> {
    const pp = await loadPuppeteer();
    if (!pp) return { available: false, detail: `puppeteer-core is not installed. ${INSTALL_HINT}` };
    if (this.opts.endpoint) return { available: true, detail: `CDP endpoint ${this.opts.endpoint} (reachability checked on first use)` };
    if (this.opts.executablePath) {
      const bare = !this.opts.executablePath.includes("/") && !this.opts.executablePath.includes("\\");
      return bare || existsSync(this.opts.executablePath)
        ? { available: true, detail: `spawns ${[this.opts.executablePath, ...this.opts.executableArgs].join(" ")} serve` }
        : { available: false, detail: `Lightpanda executable not found: ${this.opts.executablePath}` };
    }
    return { available: false, detail: `No Lightpanda endpoint or executable configured. ${INSTALL_HINT}` };
  }

  private async ensureEndpoint(deadline: number): Promise<{ endpoint: string; launchMs: number }> {
    if (this.opts.endpoint) return { endpoint: this.opts.endpoint, launchMs: 0 };
    if (this.endpoint && this.running) return { endpoint: this.endpoint, launchMs: 0 };
    if (!this.opts.executablePath) throw new FetchkeepError("browser_unavailable", "No Lightpanda endpoint or executable configured", { hint: INSTALL_HINT });
    const t0 = performance.now();
    const port = await freePort();
    const args = [
      ...this.opts.executableArgs,
      "serve",
      "--host",
      "127.0.0.1",
      "--port",
      String(port),
      "--log-level",
      "warn",
      ...(this.opts.blockPrivateNetworks ? ["--block-private-networks"] : []),
    ];
    const env: NodeJS.ProcessEnv = { ...process.env, LIGHTPANDA_DISABLE_TELEMETRY: "true" };
    // When launched through `wsl`, environment variables only cross the boundary if listed in WSLENV.
    if (/^wsl(\.exe)?$/i.test(basename(this.opts.executablePath))) {
      env.WSLENV = [process.env.WSLENV, "LIGHTPANDA_DISABLE_TELEMETRY"].filter(Boolean).join(":");
    }
    const child = spawn(this.opts.executablePath, args, { env, stdio: ["ignore", "ignore", "pipe"], windowsHide: true });
    let stderr = "";
    child.stderr?.on("data", (d: Buffer) => {
      stderr = (stderr + d.toString()).slice(-4000);
    });
    const spawnFailed = Promise.withResolvers<never>();
    child.once("error", (e) => spawnFailed.reject(new FetchkeepError("browser_unavailable", `Cannot start Lightpanda: ${e.message}`, { hint: INSTALL_HINT })));
    spawnFailed.promise.catch(() => undefined);
    this.child = child;
    child.once("exit", () => {
      if (this.child === child) {
        this.child = null;
        this.endpoint = null;
      }
    });
    try {
      await Promise.race([waitForPort(port, Math.min(deadline, Date.now() + 15_000), child), spawnFailed.promise]);
    } catch (err) {
      child.kill();
      const e = toFetchkeepError(err);
      throw new FetchkeepError(e.code, `${e.message}${stderr ? `: ${stderr.trim().split("\n").slice(-3).join(" | ")}` : ""}`, e.hint ? { hint: e.hint } : {});
    }
    this.endpoint = `ws://127.0.0.1:${port}`;
    return { endpoint: this.endpoint, launchMs: performance.now() - t0 };
  }

  async render(req: RenderRequest): Promise<RenderResult> {
    const started = performance.now();
    const pp = await loadPuppeteer();
    if (!pp) throw new FetchkeepError("browser_unavailable", "puppeteer-core is not installed", { hint: INSTALL_HINT });
    const { endpoint, launchMs } = await this.ensureEndpoint(req.deadline);
    const stats: RequestStats = { total: 0, blocked: 0, failed: 0 };
    let browser: Browser | null = null;
    const onAbort = () => void browser?.disconnect().catch(() => undefined);
    req.signal.addEventListener("abort", onAbort, { once: true });
    try {
      // One CDP connection per render: Lightpanda isolates state per connection/browser context.
      browser = await pp.connect({ browserWSEndpoint: endpoint, protocolTimeout: Math.max(1000, req.deadline - Date.now()) });
      const context = await browser.createBrowserContext().catch(() => null);
      const page = context ? await context.newPage() : await browser.newPage();
      await page.setUserAgent({ userAgent: req.userAgent }).catch(() => undefined);
      await page.setRequestInterception(true);
      page.on("request", (r: HTTPRequest) => {
        stats.total++;
        const target = r.url();
        if (/^(data|blob|about):/i.test(target)) return void r.continue().catch(() => undefined);
        void (async () => {
          try {
            const url = req.policy.checkUrl(target);
            await req.policy.resolve(url.hostname);
            await r.continue();
          } catch {
            stats.blocked++;
            await r.abort("blockedbyclient").catch(() => undefined);
          }
        })();
      });
      page.on("requestfailed", () => stats.failed++);
      const navStart = performance.now();
      const response = await page.goto(req.url, { waitUntil: "load", timeout: Math.max(500, req.deadline - Date.now()) });
      const settle = Math.min(req.settleMs, Math.max(0, req.deadline - Date.now() - 250));
      if (settle > 0) await sleep(settle, undefined, { signal: req.signal });
      let html = await page.content();
      let truncated = false;
      if (Buffer.byteLength(html) > req.maxBytes) {
        html = Buffer.from(html).subarray(0, req.maxBytes).toString("utf8");
        truncated = true;
      }
      const headers = response?.headers() ?? {};
      const result: RenderResult = {
        finalUrl: page.url(),
        status: response?.status() ?? 200,
        contentType: (headers["content-type"] ?? "text/html").split(";")[0]!.trim().toLowerCase(),
        html,
        truncated,
        requests: stats,
        timings: { launchMs, navigateMs: performance.now() - navStart, totalMs: performance.now() - started },
      };
      await (context ? context.close() : page.close()).catch(() => undefined);
      return result;
    } catch (err) {
      if (req.signal.aborted) throw toFetchkeepError(err, req.signal);
      const msg = (err as Error).message ?? String(err);
      if (/timeout/i.test(msg) && /Navigation|exceeded/i.test(msg)) throw new FetchkeepError("timeout", `Lightpanda navigation timed out: ${msg.split("\n")[0]}`);
      if (/ECONNREFUSED|WebSocket|socket hang up/i.test(msg)) {
        throw new FetchkeepError("browser_unavailable", `Cannot connect to Lightpanda at ${endpoint}: ${msg.split("\n")[0]}`, { hint: INSTALL_HINT });
      }
      if (/ERR_BLOCKED_BY_CLIENT|blockedbyclient/i.test(msg)) throw new FetchkeepError("blocked_by_policy", `Navigation to ${req.url} was blocked by the network policy`);
      throw new FetchkeepError("browser_failed", `Lightpanda render failed: ${msg.split("\n")[0]}`, { cause: err });
    } finally {
      req.signal.removeEventListener("abort", onAbort);
      await browser?.disconnect().catch(() => undefined);
    }
  }

  async close(): Promise<void> {
    const c = this.child;
    this.child = null;
    this.endpoint = null;
    if (c && c.exitCode === null) {
      const exited = once(c, "exit");
      c.kill();
      await Promise.race([exited, sleep(2000)]);
      if (c.exitCode === null) c.kill("SIGKILL");
    }
  }
}
