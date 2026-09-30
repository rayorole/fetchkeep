import { execFileSync, spawn } from "node:child_process";
import { once } from "node:events";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { McpSession } from "../lib/mcp.ts";
import type { Availability, Capabilities, CrawlOutput, EngineAdapter, EngineError, EngineInfo, FetchOutput, ResourceTarget } from "../lib/types.ts";

const REPO = fileURLToPath(new URL("../../", import.meta.url));
const CLI = join(REPO, "dist", "src", "cli", "main.js");

export type FetchkeepProfile = "fetchkeep-http" | "fetchkeep-chromium" | "fetchkeep-lightpanda" | "fetchkeep-auto";

const MODE: Record<FetchkeepProfile, string> = {
  "fetchkeep-http": "http",
  "fetchkeep-chromium": "chromium",
  "fetchkeep-lightpanda": "lightpanda",
  "fetchkeep-auto": "auto",
};

interface Envelope {
  status: "success" | "partial" | "error";
  document?: { ref: string; finalUrl: string; title: string; httpStatus: number };
  content?: { text: string };
  backend?: { used: string | null; escalated: boolean; attempts: unknown[] };
  error?: { code: string; message: string };
  data?: Record<string, unknown>;
}

function errorKind(code: string): EngineError["kind"] {
  if (code === "timeout") return "timeout";
  if (code === "blocked_by_policy" || code === "robots_disallowed") return "blocked";
  if (code === "http_error" || code === "too_many_redirects") return "http_error";
  if (code === "unsupported_content_type") return "unsupported";
  if (code === "dns_failure" || code === "connect_failed") return "network";
  return "engine_error";
}

export interface FetchkeepOptions {
  profile: FetchkeepProfile;
  home: string;
  /** Private CIDR of the fixture server (e.g. 172.31.172.243/32); the only private destination allowed. */
  allowCidr: string;
  lightpandaExecutable?: string | undefined;
}

/**
 * Fetchkeep through its MCP server (warm) — the way agents use it. One server per profile with its own store.
 * Mode per profile: http | chromium | lightpanda | auto (auto escalates to Chromium).
 */
export class FetchkeepAdapter implements EngineAdapter {
  readonly engine = "fetchkeep" as const;
  readonly profile: FetchkeepProfile;
  readonly capabilities: Capabilities;
  private session: McpSession | null = null;

  private readonly opts: FetchkeepOptions;

  constructor(opts: FetchkeepOptions) {
    this.opts = opts;
    this.profile = opts.profile;
    this.capabilities = {
      fetch: true,
      crawl: true,
      localFixtures: true,
      citations: true,
      javascript: opts.profile === "fetchkeep-http" ? "never" : opts.profile === "fetchkeep-auto" ? "auto" : "always",
    };
  }

  private env(): Record<string, string> {
    const env: Record<string, string> = {
      PATH: process.env.PATH ?? "",
      HOME: process.env.HOME ?? "",
      FETCHKEEP_HOME: this.opts.home,
      FETCHKEEP_ALLOW_CIDRS: this.opts.allowCidr,
    };
    if (this.profile === "fetchkeep-chromium" || this.profile === "fetchkeep-auto") env.FETCHKEEP_CHROMIUM = "1";
    if (this.profile === "fetchkeep-lightpanda" && this.opts.lightpandaExecutable) env.FETCHKEEP_LIGHTPANDA_EXECUTABLE = this.opts.lightpandaExecutable;
    return env;
  }

  async availability(): Promise<Availability> {
    if (!existsSync(CLI)) return { available: false, reason: "dist/ not built; run npm run build" };
    if (this.profile === "fetchkeep-lightpanda") {
      if (!this.opts.lightpandaExecutable) return { available: false, reason: "FETCHKEEP_BENCH_LIGHTPANDA (Lightpanda executable) not set" };
      if (!existsSync(this.opts.lightpandaExecutable)) return { available: false, reason: `Lightpanda not found at ${this.opts.lightpandaExecutable}` };
    }
    if (this.profile !== "fetchkeep-http") {
      mkdirSync(this.opts.home, { recursive: true });
      try {
        const out = execFileSync(process.execPath, [CLI, "--json", "doctor"], { env: this.env(), encoding: "utf8", timeout: 60_000 });
        const checks = (JSON.parse(out) as Envelope).data?.checks as { name: string; ok: boolean; detail: string }[];
        const browser = checks.find((c) => c.name.startsWith(`browser:${this.profile === "fetchkeep-lightpanda" ? "lightpanda" : "chromium"}`));
        if (!browser?.ok) return { available: false, reason: browser?.detail ?? "browser check failed" };
      } catch (err) {
        const out = (err as { stdout?: string }).stdout;
        const checks = out ? ((JSON.parse(out) as Envelope).data?.checks as { name: string; ok: boolean; detail: string }[] | undefined) : undefined;
        const failed = checks?.filter((c) => !c.ok).map((c) => `${c.name}: ${c.detail}`).join("; ");
        return { available: false, reason: failed || (err as Error).message };
      }
    }
    return { available: true };
  }

  async info(): Promise<EngineInfo> {
    const pkg = JSON.parse(readFileSync(join(REPO, "package.json"), "utf8")) as { version: string };
    let revision = "unknown";
    try {
      revision = execFileSync("git", ["rev-parse", "HEAD"], { cwd: REPO, encoding: "utf8" }).trim();
    } catch {
      // not a git checkout
    }
    const differences = [
      `network: only the fixture server address (${this.opts.allowCidr}) is allowed besides public addresses (FETCHKEEP_ALLOW_CIDRS)`,
      "documents are saved to a per-profile store (Fetchkeep default behaviour); no HTTP cache",
    ];
    if (this.profile === "fetchkeep-chromium" || this.profile === "fetchkeep-auto") {
      differences.push("browser: Playwright Chromium headless shell 153 (playwright-core 1.63.0), sandbox on, settleMs 500 (default)");
    }
    if (this.profile === "fetchkeep-auto") differences.push("auto: HTTP first, escalates to Chromium only when the heuristic flags the HTTP result (docs/browsers.md)");
    if (this.profile === "fetchkeep-lightpanda") differences.push("browser: Lightpanda nightly (see engine config), spawned by Fetchkeep with telemetry disabled, settleMs 500 (default)");
    return {
      profile: this.profile,
      engine: "fetchkeep",
      version: pkg.version,
      revision,
      transport: "MCP stdio (web_fetch / web_crawl / web_read), warm server per profile",
      config: {
        mode: MODE[this.profile],
        maxChars: 1_000_000,
        ...(this.profile === "fetchkeep-lightpanda" ? { lightpanda: this.opts.lightpandaExecutable ?? null, lightpandaVersion: this.lightpandaVersion() } : {}),
      },
      settingDifferences: differences,
    };
  }

  private lightpandaVersion(): string | null {
    if (!this.opts.lightpandaExecutable) return null;
    try {
      return execFileSync(this.opts.lightpandaExecutable, ["version"], { encoding: "utf8", env: { ...process.env, LIGHTPANDA_DISABLE_TELEMETRY: "true" }, timeout: 10_000 }).trim();
    } catch {
      return null;
    }
  }

  async start(): Promise<{ readyMs: number }> {
    mkdirSync(this.opts.home, { recursive: true });
    this.session = new McpSession(process.execPath, [CLI, "mcp"], this.env());
    return { readyMs: await this.session.start() };
  }

  async fetch(url: string, timeoutMs: number): Promise<FetchOutput> {
    const res = await this.session!.call("web_fetch", { url, mode: MODE[this.profile], timeoutMs, maxChars: 1_000_000 }, timeoutMs + 15_000);
    const env = res.structured as unknown as Envelope | undefined;
    if (!env) return { ok: false, markdown: "", error: { kind: "engine_error", message: res.text.slice(0, 500) }, raw: res.text };
    const out: FetchOutput = {
      ok: env.status !== "error",
      markdown: env.content?.text ?? "",
      raw: env,
    };
    if (env.document) {
      out.title = env.document.title;
      out.finalUrl = env.document.finalUrl;
      out.httpStatus = env.document.httpStatus;
      out.citationRef = env.document.ref;
    }
    if (env.backend) {
      out.backend = env.backend.used ?? "none";
      out.escalated = env.backend.escalated;
      out.attempts = env.backend.attempts.length;
    }
    if (env.error) out.error = { kind: errorKind(env.error.code), code: env.error.code, message: env.error.message };
    return out;
  }

  async crawl(url: string, o: { maxPages: number; maxDepth: number; timeoutMs: number }): Promise<CrawlOutput> {
    const res = await this.session!.call(
      "web_crawl",
      { url, maxPages: o.maxPages, maxDepth: o.maxDepth, timeoutMs: o.timeoutMs, mode: MODE[this.profile] },
      o.timeoutMs + 30_000,
    );
    const env = res.structured as unknown as Envelope | undefined;
    if (!env) return { ok: false, pages: [], error: { kind: "engine_error", message: res.text.slice(0, 500) }, raw: res.text };
    const data = (env.data ?? {}) as { pages?: { url: string; state: string; ref?: string }[]; stopReason?: string };
    const pages: CrawlOutput["pages"] = [];
    const seenRefs = new Set<string>();
    for (const p of data.pages ?? []) {
      if (p.state !== "done" || !p.ref || seenRefs.has(p.ref)) continue;
      seenRefs.add(p.ref);
      const read = await this.session!.call("web_read", { target: p.ref, maxChars: 1_000_000 }, 30_000);
      const r = read.structured as unknown as Envelope | undefined;
      pages.push({ url: r?.document?.finalUrl ?? p.url, markdown: r?.content?.text ?? "" });
    }
    const out: CrawlOutput = { ok: env.status !== "error", pages, raw: env };
    if (data.stopReason) out.stopReason = data.stopReason;
    if (env.error) out.error = { kind: errorKind(env.error.code), code: env.error.code, message: env.error.message };
    return out;
  }

  async verifyCitation(ref: string, quote: string): Promise<boolean> {
    const found = (await this.session!.call("web_read", { target: ref, find: quote }, 30_000)).structured as unknown as Envelope | undefined;
    const match = (found?.data?.matches as { quote: string; citation: { ref: string } }[] | undefined)?.[0];
    if (!match) return false;
    const block = (await this.session!.call("web_read", { target: match.citation.ref }, 30_000)).structured as unknown as Envelope | undefined;
    const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
    return norm(match.quote) === norm(quote) && norm(block?.content?.text ?? "").includes(norm(quote));
  }

  readonly coldStartMethod = "CLI one-shot: node dist/src/cli/main.js --json fetch <fixture> (process spawn → result → exit)";
  readonly coldStartSamples = 5;

  async coldStart(url: string, timeoutMs: number): Promise<number | null> {
    const home = join(this.opts.home, "coldstart");
    mkdirSync(home, { recursive: true });
    const t0 = performance.now();
    const child = spawn(process.execPath, [CLI, "--json", "fetch", url, "--mode", MODE[this.profile], "--timeout", String(timeoutMs)], {
      env: { ...this.env(), FETCHKEEP_HOME: home },
      stdio: ["ignore", "pipe", "ignore"],
    });
    let out = "";
    child.stdout.on("data", (d: Buffer) => (out += d.toString()));
    const [code] = (await once(child, "exit")) as [number | null];
    const ms = performance.now() - t0;
    try {
      return code === 0 && (JSON.parse(out) as Envelope).status !== "error" ? ms : null;
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
