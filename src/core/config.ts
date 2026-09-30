import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { z } from "zod";
import { FetchkeepError } from "./errors.js";

const Network = z
  .object({
    allowPrivateNetwork: z.boolean().default(false),
    allowHosts: z.array(z.string()).default([]),
    allowCidrs: z.array(z.string()).default([]),
  })
  .strict();

const Limits = z
  .object({
    maxCompressedBytes: z.number().int().positive().default(10 * 1024 * 1024),
    maxBytes: z.number().int().positive().default(25 * 1024 * 1024),
    maxRedirects: z.number().int().min(0).max(30).default(10),
  })
  .strict();

const Chromium = z
  .object({
    enabled: z.boolean().default(false),
    /** Playwright channel: `chromium-headless-shell` (default), `chromium`, `chrome`, `msedge`, … */
    channel: z.string().optional(),
    /** Explicit browser executable. Takes precedence over `channel`. */
    executablePath: z.string().optional(),
    sandbox: z.boolean().default(true),
  })
  .strict();

const Lightpanda = z
  .object({
    enabled: z.boolean().default(false),
    /** CDP WebSocket endpoint of an already running `lightpanda serve`, e.g. `ws://127.0.0.1:9222`. */
    endpoint: z.string().optional(),
    /** Executable (or wrapper such as `wsl`) to spawn `serve` on demand. */
    executablePath: z.string().optional(),
    /** Arguments placed before `serve …` (e.g. `["-d", "Ubuntu", "--", "/opt/lightpanda"]` with `wsl`). */
    executableArgs: z.array(z.string()).default([]),
  })
  .strict();

const Browser = z
  .object({
    /** Browser used by `auto` escalation and `--mode browser`. */
    preferred: z.enum(["chromium", "lightpanda"]).default("chromium"),
    maxConcurrency: z.number().int().min(1).max(16).default(2),
    idleMs: z.number().int().min(1000).default(60_000),
    /** Extra wait after load for late network activity (ms). */
    settleMs: z.number().int().min(0).max(30_000).default(500),
    chromium: Chromium.default(Chromium.parse({})),
    lightpanda: Lightpanda.default(Lightpanda.parse({})),
  })
  .strict();

const Crawl = z
  .object({
    maxPages: z.number().int().min(1).max(10_000).default(50),
    maxDepth: z.number().int().min(0).max(20).default(3),
    delayMs: z.number().int().min(0).max(60_000).default(500),
    respectRobots: z.boolean().default(true),
  })
  .strict();

export const ConfigSchema = z
  .object({
    home: z.string(),
    workspace: z.string().default("default"),
    timeoutMs: z.number().int().min(100).max(600_000).default(30_000),
    maxChars: z.number().int().min(100).max(10_000_000).default(40_000),
    rawSnapshots: z.enum(["all", "latest", "none"]).default("latest"),
    userAgent: z.string().optional(),
    network: Network.default(Network.parse({})),
    limits: Limits.default(Limits.parse({})),
    browser: Browser.default(Browser.parse({})),
    crawl: Crawl.default(Crawl.parse({})),
    search: z
      .object({ searxng: z.object({ url: z.string().url(), engines: z.string().optional(), timeoutMs: z.number().int().default(10_000) }).strict().optional() })
      .strict()
      .default({}),
    ollama: z
      .object({ url: z.string().url().default("http://127.0.0.1:11434"), model: z.string().optional(), timeoutMs: z.number().int().default(120_000) })
      .strict()
      .default({ url: "http://127.0.0.1:11434", timeoutMs: 120_000 }),
  })
  .strict();

export type FetchkeepConfig = z.infer<typeof ConfigSchema>;
export type ConfigInput = z.input<typeof ConfigSchema>;

type DeepPartial<T> = {
  [K in keyof T]?: NonNullable<T[K]> extends (infer U)[] ? U[] : NonNullable<T[K]> extends object ? DeepPartial<NonNullable<T[K]>> : T[K];
};
export type ConfigOverrides = DeepPartial<FetchkeepConfig>;

const truthy = (v: string | undefined) => v !== undefined && /^(1|true|yes|on)$/i.test(v);
const list = (v: string | undefined) => (v ? v.split(",").map((s) => s.trim()).filter(Boolean) : undefined);

/** Environment variables → partial config. Documented in docs/configuration.md. */
export function envOverrides(env: NodeJS.ProcessEnv = process.env): ConfigOverrides {
  const o: ConfigOverrides = {};
  if (env.FETCHKEEP_WORKSPACE) o.workspace = env.FETCHKEEP_WORKSPACE;
  const network: DeepPartial<FetchkeepConfig["network"]> = {};
  if (env.FETCHKEEP_ALLOW_PRIVATE_NETWORK !== undefined) network.allowPrivateNetwork = truthy(env.FETCHKEEP_ALLOW_PRIVATE_NETWORK);
  const hosts = list(env.FETCHKEEP_ALLOW_HOSTS);
  if (hosts) network.allowHosts = hosts;
  const cidrs = list(env.FETCHKEEP_ALLOW_CIDRS);
  if (cidrs) network.allowCidrs = cidrs;
  if (Object.keys(network).length) o.network = network;
  const chromium: DeepPartial<FetchkeepConfig["browser"]["chromium"]> = {};
  if (env.FETCHKEEP_CHROMIUM !== undefined) chromium.enabled = truthy(env.FETCHKEEP_CHROMIUM);
  if (env.FETCHKEEP_CHROMIUM_CHANNEL) chromium.channel = env.FETCHKEEP_CHROMIUM_CHANNEL;
  if (env.FETCHKEEP_CHROMIUM_EXECUTABLE) chromium.executablePath = env.FETCHKEEP_CHROMIUM_EXECUTABLE;
  if (env.FETCHKEEP_CHROMIUM_SANDBOX !== undefined) chromium.sandbox = truthy(env.FETCHKEEP_CHROMIUM_SANDBOX);
  const lightpanda: DeepPartial<FetchkeepConfig["browser"]["lightpanda"]> = {};
  if (env.FETCHKEEP_LIGHTPANDA_ENDPOINT) lightpanda.endpoint = env.FETCHKEEP_LIGHTPANDA_ENDPOINT;
  if (env.FETCHKEEP_LIGHTPANDA_EXECUTABLE) lightpanda.executablePath = env.FETCHKEEP_LIGHTPANDA_EXECUTABLE;
  if (env.FETCHKEEP_LIGHTPANDA_ENDPOINT || env.FETCHKEEP_LIGHTPANDA_EXECUTABLE) lightpanda.enabled = true;
  if (env.FETCHKEEP_LIGHTPANDA !== undefined) lightpanda.enabled = truthy(env.FETCHKEEP_LIGHTPANDA);
  const browser: DeepPartial<FetchkeepConfig["browser"]> = {};
  if (Object.keys(chromium).length) browser.chromium = chromium;
  if (Object.keys(lightpanda).length) browser.lightpanda = lightpanda;
  if (env.FETCHKEEP_BROWSER === "chromium" || env.FETCHKEEP_BROWSER === "lightpanda") browser.preferred = env.FETCHKEEP_BROWSER;
  if (Object.keys(browser).length) o.browser = browser;
  if (env.FETCHKEEP_SEARXNG_URL) o.search = { searxng: { url: env.FETCHKEEP_SEARXNG_URL } };
  if (env.FETCHKEEP_OLLAMA_URL || env.FETCHKEEP_OLLAMA_MODEL) {
    o.ollama = {};
    if (env.FETCHKEEP_OLLAMA_URL) o.ollama.url = env.FETCHKEEP_OLLAMA_URL;
    if (env.FETCHKEEP_OLLAMA_MODEL) o.ollama.model = env.FETCHKEEP_OLLAMA_MODEL;
  }
  return o;
}

function deepMerge(base: Record<string, unknown>, over: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(over)) {
    if (v === undefined) continue;
    const cur = out[k];
    out[k] =
      v && typeof v === "object" && !Array.isArray(v) && cur && typeof cur === "object" && !Array.isArray(cur)
        ? deepMerge(cur as Record<string, unknown>, v as Record<string, unknown>)
        : v;
  }
  return out;
}

export function defaultHome(env: NodeJS.ProcessEnv = process.env): string {
  return resolve(env.FETCHKEEP_HOME ?? join(homedir(), ".fetchkeep"));
}

export interface LoadConfigOptions {
  /** Explicit config file; otherwise `$FETCHKEEP_HOME/config.json` if it exists. */
  configPath?: string;
  env?: NodeJS.ProcessEnv;
  overrides?: ConfigOverrides;
}

/** Precedence (lowest → highest): defaults, config file, environment, explicit overrides (CLI flags). */
export function loadConfig(opts: LoadConfigOptions = {}): FetchkeepConfig {
  const env = opts.env ?? process.env;
  const home = opts.overrides?.home ?? defaultHome(env);
  let file: Record<string, unknown> = {};
  const path = opts.configPath ?? env.FETCHKEEP_CONFIG ?? join(home, "config.json");
  if (existsSync(path)) {
    try {
      file = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
    } catch (err) {
      throw new FetchkeepError("invalid_argument", `Cannot parse config file ${path}: ${(err as Error).message}`);
    }
  } else if (opts.configPath) {
    throw new FetchkeepError("invalid_argument", `Config file not found: ${path}`);
  }
  const merged = deepMerge(deepMerge(deepMerge({ home }, file), envOverrides(env) as Record<string, unknown>), (opts.overrides ?? {}) as Record<string, unknown>);
  const parsed = ConfigSchema.safeParse(merged);
  if (!parsed.success) {
    throw new FetchkeepError("invalid_argument", `Invalid configuration: ${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
}
