import { execFileSync } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { request } from "undici";
import { composeContainers } from "../lib/procmon.ts";
import type { Availability, Capabilities, CrawlOutput, EngineAdapter, EngineError, EngineInfo, FetchOutput, ResourceTarget } from "../lib/types.ts";

export const FIRECRAWL_REVISION = "7e4a959dca0efbdad2f0a9d82b0fce20afeb9a4d";

export interface FirecrawlOptions {
  profile: "firecrawl-selfhost" | "firecrawl-hosted";
  baseUrl: string;
  apiKey?: string | undefined;
  /** Hosted only: paid runs need explicit opt-in and a credit budget. */
  allowPaid?: boolean;
  creditBudget?: number;
  /** Self-host only: docker compose project name and checkout directory (for version/revision metadata). */
  composeProject?: string;
  checkout?: string | undefined;
}

interface ScrapeResponse {
  success: boolean;
  code?: string;
  error?: string;
  data?: { markdown?: string; metadata?: { title?: string; sourceURL?: string; url?: string; statusCode?: number; creditsUsed?: number; error?: string } };
}

interface CrawlStatus {
  success?: boolean;
  status?: string;
  completed?: number;
  total?: number;
  creditsUsed?: number;
  next?: string | null;
  error?: string;
  data?: { markdown?: string; metadata?: { sourceURL?: string; url?: string } }[];
}

function kindFor(code: string | undefined, message: string, status: number): EngineError["kind"] {
  const t = `${code ?? ""} ${message}`.toLowerCase();
  if (/timeout|timed out/.test(t) || status === 408) return "timeout";
  if (/blocked|forbidden|robots|not allowed/.test(t) || status === 403) return "blocked";
  if (/404|not found|status code|all scraping engines failed/.test(t)) return "http_error";
  if (/unsupported/.test(t)) return "unsupported";
  return "engine_error";
}

/**
 * Firecrawl through its REST API v2 (the documented interface). Self-hosted and hosted are separate profiles and
 * are never substituted for one another. Requests use formats=["markdown"], the default onlyMainContent=true,
 * maxAge=0 and storeInCache=false so every request is a fresh scrape.
 */
export class FirecrawlAdapter implements EngineAdapter {
  readonly engine = "firecrawl" as const;
  readonly profile: FirecrawlOptions["profile"];
  readonly capabilities: Capabilities;
  private creditsSpent = 0;
  private containers: string[] = [];

  private readonly opts: FirecrawlOptions;

  constructor(opts: FirecrawlOptions) {
    this.opts = opts;
    this.profile = opts.profile;
    this.capabilities = { fetch: true, crawl: true, localFixtures: opts.profile === "firecrawl-selfhost", citations: false, javascript: "auto" };
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { "content-type": "application/json" };
    if (this.opts.apiKey) h.authorization = `Bearer ${this.opts.apiKey}`;
    return h;
  }

  private async call<T>(method: "GET" | "POST", path: string, body: unknown, timeoutMs: number): Promise<{ status: number; json: T }> {
    const res = await request(path.startsWith("http") ? path : `${this.opts.baseUrl}${path}`, {
      method,
      headers: this.headers(),
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      headersTimeout: timeoutMs,
      bodyTimeout: timeoutMs,
      signal: AbortSignal.timeout(timeoutMs),
    });
    const text = await res.body.text();
    let json: T;
    try {
      json = JSON.parse(text) as T;
    } catch {
      json = { success: false, error: text.slice(0, 500) } as T;
    }
    return { status: res.statusCode, json };
  }

  private spend(credits: number): void {
    this.creditsSpent += credits;
  }

  budgetExhausted(): boolean {
    return this.profile === "firecrawl-hosted" && this.creditsSpent >= (this.opts.creditBudget ?? 0);
  }

  async availability(): Promise<Availability> {
    if (this.profile === "firecrawl-hosted") {
      if (!this.opts.apiKey) return { available: false, reason: "FIRECRAWL_API_KEY is not set" };
      if (!this.opts.allowPaid) return { available: false, reason: "hosted Firecrawl is a paid service: pass --allow-paid and --budget-credits N to opt in" };
      if (!this.opts.creditBudget || this.opts.creditBudget <= 0) return { available: false, reason: "--budget-credits must be > 0 for hosted runs" };
    }
    try {
      const res = await request(`${this.opts.baseUrl}/`, { method: "GET", headersTimeout: 5000, bodyTimeout: 5000 });
      await res.body.dump();
      if (res.statusCode >= 500) return { available: false, reason: `${this.opts.baseUrl} returned HTTP ${res.statusCode}` };
    } catch (err) {
      return {
        available: false,
        reason:
          this.profile === "firecrawl-selfhost"
            ? `self-hosted Firecrawl not reachable at ${this.opts.baseUrl} (${(err as Error).message}); start it with bench/engines/firecrawl/README.md`
            : `hosted API not reachable: ${(err as Error).message}`,
      };
    }
    return { available: true };
  }

  async info(): Promise<EngineInfo> {
    let revision = this.profile === "firecrawl-selfhost" ? FIRECRAWL_REVISION : "hosted service (version not exposed)";
    if (this.opts.checkout) {
      try {
        revision = execFileSync("git", ["rev-parse", "HEAD"], { cwd: this.opts.checkout, encoding: "utf8" }).trim();
      } catch {
        // keep pinned value
      }
    }
    const differences = [
      "formats=[markdown], onlyMainContent=true (default), waitFor=0 (default), maxAge=0 and storeInCache=false (fresh scrapes, no Firecrawl cache)",
    ];
    if (this.profile === "firecrawl-selfhost") {
      differences.push(
        "self-host: upstream docker-compose.yaml at the pinned commit, services api+playwright-service+redis+rabbitmq+nuq-postgres; no Fire-engine, no proxies, auth disabled",
        "ALLOW_LOCAL_WEBHOOKS=true and TEST_SUITE_SELF_HOSTED=true (bench/engines/firecrawl/compose.override.yaml) so the stack can reach the private fixture server",
      );
    } else {
      differences.push("hosted: cannot reach local fixtures (marked N/A); credits counted from responses (creditsUsed) with 1 credit/scrape as the estimate when absent");
    }
    return {
      profile: this.profile,
      engine: "firecrawl",
      version: this.profile === "firecrawl-selfhost" ? "apps/api 1.0.0 (self-hosted build)" : "hosted API v2",
      revision,
      transport: `REST API v2 (${this.opts.baseUrl})`,
      config: { baseUrl: this.opts.baseUrl, creditBudget: this.opts.creditBudget ?? null },
      settingDifferences: differences,
    };
  }

  async start(): Promise<{ readyMs: number }> {
    if (this.opts.composeProject) this.containers = (await composeContainers(this.opts.composeProject).catch(() => [])).map((c) => c.id);
    return { readyMs: 0 };
  }

  async fetch(url: string, timeoutMs: number): Promise<FetchOutput> {
    if (this.budgetExhausted()) return { ok: false, markdown: "", error: { kind: "other", code: "budget_exhausted", message: "credit budget exhausted" }, raw: null };
    const { status, json } = await this.call<ScrapeResponse>(
      "POST",
      "/v2/scrape",
      { url, formats: ["markdown"], timeout: timeoutMs, maxAge: 0, storeInCache: false },
      timeoutMs + 15_000,
    );
    const credits = json.data?.metadata?.creditsUsed ?? (json.success ? 1 : 0);
    this.spend(credits);
    const cost = this.profile === "firecrawl-hosted" ? { unit: "credits", amount: credits, estimated: json.data?.metadata?.creditsUsed === undefined } : undefined;
    if (!json.success || status >= 400) {
      const message = json.error ?? `HTTP ${status}`;
      const out: FetchOutput = { ok: false, markdown: "", error: { kind: kindFor(json.code, message, status), code: json.code ?? String(status), message: message.slice(0, 500) }, raw: json };
      if (cost) out.cost = cost;
      return out;
    }
    const md = json.data?.metadata;
    const out: FetchOutput = { ok: true, markdown: json.data?.markdown ?? "", raw: json };
    if (md?.title) out.title = md.title;
    if (md?.url ?? md?.sourceURL) out.finalUrl = (md.url ?? md.sourceURL)!;
    if (md?.statusCode) out.httpStatus = md.statusCode;
    if (md?.statusCode && md.statusCode >= 400) {
      out.ok = false;
      out.error = { kind: "http_error", code: String(md.statusCode), message: `target returned HTTP ${md.statusCode}` };
    }
    if (cost) out.cost = cost;
    return out;
  }

  async crawl(url: string, o: { maxPages: number; maxDepth: number; timeoutMs: number }): Promise<CrawlOutput> {
    const deadline = Date.now() + o.timeoutMs;
    const started = await this.call<{ success: boolean; id?: string; error?: string }>(
      "POST",
      "/v2/crawl",
      { url, limit: o.maxPages, maxDiscoveryDepth: o.maxDepth, sitemap: "include", scrapeOptions: { formats: ["markdown"], maxAge: 0, storeInCache: false } },
      30_000,
    );
    if (!started.json.success || !started.json.id) {
      const message = started.json.error ?? `HTTP ${started.status}`;
      return { ok: false, pages: [], error: { kind: kindFor(undefined, message, started.status), message }, raw: started.json };
    }
    let status: CrawlStatus = {};
    const pages: CrawlOutput["pages"] = [];
    while (Date.now() < deadline) {
      status = (await this.call<CrawlStatus>("GET", `/v2/crawl/${started.json.id}`, undefined, 30_000)).json;
      if (status.status === "completed" || status.status === "failed" || status.status === "cancelled") break;
      await sleep(500);
    }
    if (status.status !== "completed" && status.status !== "failed") {
      await this.call("GET", `/v2/crawl/${started.json.id}`, undefined, 10_000).catch(() => undefined);
    }
    let page: CrawlStatus | null = status;
    while (page) {
      for (const d of page.data ?? []) pages.push({ url: d.metadata?.url ?? d.metadata?.sourceURL ?? "", markdown: d.markdown ?? "" });
      page = page.next ? (await this.call<CrawlStatus>("GET", page.next, undefined, 30_000)).json : null;
    }
    const credits = status.creditsUsed ?? pages.length;
    this.spend(credits);
    const out: CrawlOutput = { ok: status.status === "completed", pages, stopReason: status.status ?? "deadline", raw: { ...status, data: undefined } };
    if (status.status !== "completed") out.error = { kind: status.status === undefined ? "timeout" : "engine_error", message: status.error ?? `crawl ${status.status ?? "did not finish before the deadline"}` };
    if (this.profile === "firecrawl-hosted") out.cost = { unit: "credits", amount: credits, estimated: status.creditsUsed === undefined };
    return out;
  }

  resources(): ResourceTarget {
    return this.profile === "firecrawl-selfhost" ? { pids: [], containers: this.containers, scope: "docker-stack" } : { pids: [], containers: [], scope: "remote" };
  }

  readonly coldStartMethod = "docker compose stop → docker compose up -d api → first successful /v2/scrape of a local fixture";
  readonly coldStartSamples = 3;

  /** Self-host only: full stack restart until the first successful scrape. Requires FIRECRAWL_CHECKOUT. */
  async coldStart(url: string, timeoutMs: number): Promise<number | null> {
    if (this.profile !== "firecrawl-selfhost" || !this.opts.checkout) return null;
    const override = new URL("./firecrawl/compose.override.yaml", import.meta.url).pathname;
    const args = ["compose", "-f", `${this.opts.checkout}/docker-compose.yaml`, "-f", override];
    execFileSync("docker", [...args, "stop"], { cwd: this.opts.checkout, stdio: "ignore", timeout: 300_000 });
    const t0 = performance.now();
    execFileSync("docker", [...args, "up", "-d", "api"], { cwd: this.opts.checkout, stdio: "ignore", timeout: 600_000 });
    const deadline = Date.now() + 300_000;
    while (Date.now() < deadline) {
      const out = await this.fetch(url, timeoutMs).catch(() => null);
      if (out?.ok) {
        const ms = performance.now() - t0;
        this.containers = (await composeContainers(this.opts.composeProject ?? "firecrawl").catch(() => [])).map((c) => c.id);
        return ms;
      }
      await sleep(500);
    }
    return null;
  }

  async stop(): Promise<void> {
    // The self-hosted stack is managed outside the benchmark (it is shared across runs); nothing to stop.
  }
}
