import { execFileSync, spawn } from "node:child_process";
import { once } from "node:events";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { McpSession } from "../lib/mcp.ts";
import type { Availability, Capabilities, CrawlOutput, EngineAdapter, EngineError, EngineInfo, FetchOutput, ResourceTarget } from "../lib/types.ts";

export interface DonsetchOptions {
  /** Path to the `donsetch` binary (npm package `donsetch`, pinned version). */
  binary: string;
  /** Directory for DonSeTch's cache/state during the run (isolated per run). */
  home: string;
  /** Chromium used for tier-2 escalation (same Chromium build as the Fetchkeep Chromium profile). */
  chromium?: string | undefined;
}

function errorKind(code: string | undefined, text: string): EngineError["kind"] {
  const c = `${code ?? ""} ${text}`.toLowerCase();
  if (/timeout|deadline/.test(c)) return "timeout";
  if (/notfound|not found|http 4\d\d|http 5\d\d|status=\d{3}|redirect/.test(c)) return "http_error";
  if (/private|ssrf|blocked|walled|robots/.test(c)) return "blocked";
  if (/unsupported/.test(c)) return "unsupported";
  if (/dns|connect|network/.test(c)) return "network";
  return "engine_error";
}

/** DonSeTch via its MCP server (`donsetch mcp`), warm, with isolated cache and config. */
export class DonsetchAdapter implements EngineAdapter {
  readonly engine = "donsetch" as const;
  readonly profile = "donsetch";
  readonly capabilities: Capabilities = { fetch: true, crawl: true, localFixtures: true, citations: false, javascript: "auto" };
  private session: McpSession | null = null;

  private readonly opts: DonsetchOptions;

  constructor(opts: DonsetchOptions) {
    this.opts = opts;
  }

  private env(): Record<string, string> {
    const env: Record<string, string> = {
      PATH: process.env.PATH ?? "",
      HOME: this.opts.home,
      DONSETCH_CACHE_DIR: join(this.opts.home, "cache"),
      DONSETCH_NO_CONFIG_FILE: "1",
      // The fixture server runs on a private address; DonSeTch blocks private egress by default.
      DONSETCH_ALLOW_PRIVATE_EGRESS: "1",
      // Never use the paid Bright Data unlocker (inert without a key anyway).
      DONSETCH_BYPASS: "0",
      DONSETCH_BROWSER_BACKEND: "headless",
    };
    if (this.opts.chromium) env.DONSETCH_BROWSER__CHROMIUM_PATH = this.opts.chromium;
    return env;
  }

  async availability(): Promise<Availability> {
    if (!existsSync(this.opts.binary)) {
      return { available: false, reason: `donsetch binary not found at ${this.opts.binary} (npm install donsetch@4.4.1, set FETCHKEEP_BENCH_DONSETCH)` };
    }
    return { available: true };
  }

  async info(): Promise<EngineInfo> {
    let version = "unknown";
    try {
      version = execFileSync(this.opts.binary, ["version"], { encoding: "utf8", env: this.env(), timeout: 30_000 }).split("\n")[0]!.replace(/^DonSeTch\s+/, "").trim();
    } catch {
      // reported as unknown
    }
    return {
      profile: this.profile,
      engine: "donsetch",
      version,
      revision: `v${version} release binary (npm donsetch@${version})`,
      transport: "MCP stdio (web_fetch / web_crawl), warm server",
      config: { tier: "auto (default)", archive: "off", max_chars: 1_000_000, browserBackend: "headless", chromium: this.opts.chromium ?? "auto-discovery" },
      settingDifferences: [
        "DONSETCH_ALLOW_PRIVATE_EGRESS=1: all private destinations allowed (DonSeTch has no per-address allow-list), needed for the local fixture server",
        "archive=off: disables the default Wayback/archive fallback so results come from the live page",
        "DONSETCH_BYPASS=0 and isolated cache/config dir (DONSETCH_CACHE_DIR, DONSETCH_NO_CONFIG_FILE=1)",
        "browser: DONSETCH_BROWSER_BACKEND=headless with the same Chromium 153 build that Playwright installed (full Chromium, not the headless shell)",
      ],
    };
  }

  async start(): Promise<{ readyMs: number }> {
    mkdirSync(join(this.opts.home, "cache"), { recursive: true });
    this.session = new McpSession(this.opts.binary, ["mcp"], this.env());
    return { readyMs: await this.session.start() };
  }

  async fetch(url: string, timeoutMs: number): Promise<FetchOutput> {
    const res = await this.session!.call("web_fetch", { url, deadline_ms: timeoutMs, max_chars: 1_000_000, archive: "off" }, timeoutMs + 15_000);
    const meta = (res.structured ?? {}) as { code?: string; status?: number; url?: string; content_ok?: boolean; escalation?: { tier?: string; action?: string }[] };
    const escalated = (meta.escalation ?? []).some((e) => e.tier === "2" || /browser|ghost/i.test(e.action ?? ""));
    if (res.isError) {
      const out: FetchOutput = { ok: false, markdown: "", error: { kind: errorKind(meta.code, res.text), code: meta.code ?? "error", message: res.text.slice(0, 500) }, raw: res };
      if (typeof meta.status === "number") out.httpStatus = meta.status;
      if (meta.escalation) out.attempts = meta.escalation.length;
      return out;
    }
    const out: FetchOutput = { ok: meta.content_ok !== false, markdown: res.text, raw: res, escalated };
    if (meta.url) out.finalUrl = meta.url;
    if (meta.content_ok === false) out.error = { kind: "engine_error", code: "content_not_ok", message: "content_ok=false" };
    return out;
  }

  async crawl(url: string, o: { maxPages: number; maxDepth: number; timeoutMs: number }): Promise<CrawlOutput> {
    const res = await this.session!.call(
      "web_crawl",
      { url, max_pages: o.maxPages, max_depth: o.maxDepth, deadline_s: Math.max(5, Math.min(600, Math.round(o.timeoutMs / 1000))), dataset: true },
      o.timeoutMs + 30_000,
    );
    const meta = (res.structured ?? {}) as { stop?: string; code?: string };
    if (res.isError) return { ok: false, pages: [], error: { kind: errorKind(meta.code, res.text), message: res.text.slice(0, 500) }, raw: res };
    const pages: CrawlOutput["pages"] = [];
    for (const line of res.text.split("\n")) {
      if (!line.trim().startsWith("{")) continue;
      try {
        const row = JSON.parse(line) as { url?: string; markdown?: string };
        if (row.url) pages.push({ url: row.url, markdown: row.markdown ?? "" });
      } catch {
        // non-JSON line (should not happen in dataset mode)
      }
    }
    const out: CrawlOutput = { ok: true, pages, raw: res };
    if (meta.stop) out.stopReason = meta.stop;
    return out;
  }

  readonly coldStartMethod = "CLI one-shot: donsetch fetch <fixture> --json (process spawn → result → exit)";
  readonly coldStartSamples = 5;

  async coldStart(url: string, timeoutMs: number): Promise<number | null> {
    const t0 = performance.now();
    const child = spawn(this.opts.binary, ["fetch", url, "--json", "--quiet", "--archive", "off", "--deadline-ms", String(timeoutMs)], {
      env: this.env(),
      stdio: ["ignore", "pipe", "ignore"],
    });
    let out = "";
    child.stdout.on("data", (d: Buffer) => (out += d.toString()));
    const [code] = (await once(child, "exit")) as [number | null];
    const ms = performance.now() - t0;
    try {
      return code === 0 && (JSON.parse(out) as { ok?: boolean }).ok ? ms : null;
    } catch {
      return null;
    }
  }

  resources(): ResourceTarget {
    const pid = this.session?.pid;
    return { pids: pid ? [pid] : [], containers: [], scope: "process-tree" };
  }

  async stop(): Promise<void> {
    await this.session?.stop();
    this.session = null;
  }
}
