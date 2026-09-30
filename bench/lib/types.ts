/** Shared benchmark types. Engine-neutral: nothing here knows about a specific tool. */

export type EngineName = "fetchkeep" | "firecrawl" | "donsetch";

export interface TableExpectation {
  /** Cells of rows that must appear, each row on one output line with cells in order. */
  rows: string[][];
}

export interface FetchCase {
  id: string;
  kind: "fetch";
  /** Dataset: `fixture` (served locally, synthetic) or `live` (public website). */
  dataset: "fixture" | "live";
  /** Path on the fixture server (fixtures) or absolute URL (live). */
  url: string;
  category: string;
  description: string;
  /** Held-out cases are excluded from development tuning and reported separately. */
  heldOut?: boolean;
  /** Needs JavaScript to show its content. */
  requiresJs?: boolean;
  /** The correct outcome is an error (404, redirect loop, blocked…). */
  expectError?: boolean;
  /** Key passages that a usable extraction must contain. */
  mustContain: string[];
  /** Boilerplate that a clean extraction should not contain. */
  mustNotContain: string[];
  headings?: string[];
  tables?: TableExpectation[];
  /** Code blocks that must appear verbatim (whitespace at line ends ignored). */
  code?: string[];
  /** Fixture only: path (relative to bench/fixtures) of the gold main-content text for token P/R. */
  gold?: string;
  /** Live only: when the expectations were last checked by a human. */
  annotatedAt?: string;
}

export interface CrawlCase {
  id: string;
  kind: "crawl";
  dataset: "fixture" | "live";
  url: string;
  description: string;
  maxPages: number;
  maxDepth: number;
  /** Paths (fixture) or URLs (live) that a complete crawl must return. */
  expectedPages: string[];
  /** Paths that must not be returned (robots-disallowed, other origins…). */
  forbiddenPages: string[];
  annotatedAt?: string;
}

export type BenchCase = FetchCase | CrawlCase;

export interface Suite {
  name: string;
  description: string;
  /** Restrict to fetch or crawl cases. */
  kind?: "fetch" | "crawl";
  cases: string[];
  repetitions: number;
}

export interface EngineInfo {
  profile: string;
  engine: EngineName;
  version: string;
  /** Source revision or release the engine was built from. */
  revision?: string;
  config: Record<string, unknown>;
  /** Settings that differ from other engines and why. */
  settingDifferences: string[];
  /** How this engine is invoked (MCP stdio, REST, CLI). */
  transport: string;
}

export interface Availability {
  available: boolean;
  reason?: string;
}

export interface Capabilities {
  fetch: boolean;
  crawl: boolean;
  /** Can reach the benchmark's local fixture server. */
  localFixtures: boolean;
  /** Returns stable, re-readable citations. */
  citations: boolean;
  /** JavaScript rendering: never, always, or automatic escalation. */
  javascript: "never" | "always" | "auto";
}

export type ErrorKind = "timeout" | "blocked" | "http_error" | "unsupported" | "engine_error" | "network" | "other";

export interface EngineError {
  kind: ErrorKind;
  message: string;
  code?: string;
}

export interface FetchOutput {
  ok: boolean;
  markdown: string;
  title?: string;
  finalUrl?: string;
  httpStatus?: number;
  /** Backend actually used, and whether a browser was used after an initial attempt (engine-reported). */
  backend?: string;
  escalated?: boolean;
  /** Number of attempts the engine reported (retries + escalations). */
  attempts?: number;
  /** Engine-specific citation handle, if any. */
  citationRef?: string;
  error?: EngineError;
  /** Usage cost as reported by the engine (e.g. credits). */
  cost?: { unit: string; amount: number; estimated: boolean };
  raw: unknown;
}

export interface CrawlPage {
  url: string;
  markdown: string;
}

export interface CrawlOutput {
  ok: boolean;
  pages: CrawlPage[];
  stopReason?: string;
  error?: EngineError;
  cost?: { unit: string; amount: number; estimated: boolean };
  raw: unknown;
}

export interface ResourceTarget {
  /** Root PIDs whose whole process tree is measured. */
  pids: number[];
  /** Docker containers measured as a whole stack. */
  containers: string[];
  scope: "process-tree" | "docker-stack" | "remote";
}

export interface EngineAdapter {
  readonly profile: string;
  readonly engine: EngineName;
  readonly capabilities: Capabilities;
  availability(): Promise<Availability>;
  info(): Promise<EngineInfo>;
  /** Starts a warm instance (server/process). Returns time until ready. */
  start(): Promise<{ readyMs: number }>;
  fetch(url: string, timeoutMs: number): Promise<FetchOutput>;
  crawl?(url: string, opts: { maxPages: number; maxDepth: number; timeoutMs: number }): Promise<CrawlOutput>;
  /** Fetchkeep-specific: verify that a quote can be re-read and cited from the store. */
  verifyCitation?(ref: string, quote: string): Promise<boolean>;
  /** One-shot cold start: spawn, fetch `url`, exit. Returns wall time or null if not applicable. */
  coldStart?(url: string, timeoutMs: number): Promise<number | null>;
  readonly coldStartMethod?: string;
  readonly coldStartSamples?: number;
  resources(): ResourceTarget;
  stop(): Promise<void>;
}

export interface ResourceSample {
  cpuSeconds: number;
  peakRssMb: number;
  samples: number;
  scope: ResourceTarget["scope"];
}

export interface RunRecord {
  runId: string;
  suite: string;
  profile: string;
  engine: EngineName;
  caseId: string;
  dataset: "fixture" | "live";
  category: string;
  heldOut: boolean;
  repetition: number;
  /** `ok`, `error`, `unavailable` (engine missing), `na` (engine cannot run this case, e.g. hosted vs local fixture). */
  outcome: "ok" | "error" | "unavailable" | "na";
  naReason?: string;
  startedAt: string;
  latencyMs: number | null;
  output?: { chars: number; tokens: number; title?: string; finalUrl?: string; backend?: string; escalated?: boolean; attempts?: number };
  error?: EngineError;
  scores?: Record<string, number | null>;
  cost?: { unit: string; amount: number; estimated: boolean };
  /** Relative path of the raw output file. */
  rawPath?: string;
}

export interface CrawlRecord {
  runId: string;
  suite: string;
  profile: string;
  engine: EngineName;
  caseId: string;
  dataset: "fixture" | "live";
  repetition: number;
  outcome: "ok" | "error" | "unavailable" | "na";
  naReason?: string;
  latencyMs: number | null;
  pagesReturned: number;
  /** Expected pages found / expected pages. */
  coverage: number | null;
  /** Forbidden pages (robots-disallowed, beyond depth) returned. */
  forbiddenReturned: number;
  /** Returned pages whose URL (normalized) or content duplicates another returned page, / pages returned. */
  duplicateRate: number | null;
  unexpectedPages: string[];
  missingPages: string[];
  stopReason?: string;
  error?: EngineError;
  cost?: { unit: string; amount: number; estimated: boolean };
  rawPath?: string;
}

export interface ColdStartRecord {
  profile: string;
  engine: EngineName;
  /** What was measured, e.g. "CLI process spawn → first fetch result" or "docker compose up → first scrape". */
  method: string;
  samplesMs: number[];
}

export interface ResourceRecord {
  profile: string;
  engine: EngineName;
  scope: "process-tree" | "docker-stack" | "remote";
  /** CPU seconds consumed by the measured scope while the run was active. */
  cpuSeconds: number | null;
  peakRssMb: number | null;
  /** Memory measured after start, before the first request. */
  idleRssMb: number | null;
  samples: number;
  note?: string;
}

export interface FootprintRecord {
  profile: string;
  engine: EngineName;
  component: string;
  bytes: number;
  method: string;
}

export interface RunMeta {
  runId: string;
  suite: string;
  startedAt: string;
  finishedAt: string;
  command: string;
  rerun: string;
  seed: number;
  repetitions: number;
  timeoutMs: number;
  concurrency: number;
  tokenizer: { name: string; encoding: string; version: string };
  environment: Record<string, unknown>;
  fixtureServer: { origin: string; bind: string };
  datasets: { name: string; path: string; sha256: string; cases: number }[];
  engines: (EngineInfo & { availability: Availability; readyMs?: number })[];
  notes: string[];
}
