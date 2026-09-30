import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { cpus, networkInterfaces, release, totalmem, type as osType } from "node:os";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { countTokens } from "gpt-tokenizer/encoding/o200k_base";
import { DonsetchAdapter } from "../engines/donsetch.ts";
import { FetchkeepAdapter, type FetchkeepProfile } from "../engines/fetchkeep.ts";
import { FirecrawlAdapter } from "../engines/firecrawl.ts";
import { startFixtureServer } from "./fixture-server.ts";
import { measureFootprint } from "./footprint.ts";
import { ResourceMonitor } from "./procmon.ts";
import { plain, scoreFetch } from "./score.ts";
import type {
  Availability,
  BenchCase,
  ColdStartRecord,
  CrawlCase,
  CrawlOutput,
  CrawlRecord,
  EngineAdapter,
  EngineInfo,
  FetchCase,
  FetchOutput,
  ResourceRecord,
  RunMeta,
  RunRecord,
  Suite,
} from "./types.ts";

export const BENCH = fileURLToPath(new URL("../", import.meta.url));
const REPO = join(BENCH, "..");

export const ALL_PROFILES = [
  "fetchkeep-http",
  "fetchkeep-chromium",
  "fetchkeep-lightpanda",
  "fetchkeep-auto",
  "firecrawl-selfhost",
  "firecrawl-hosted",
  "donsetch",
] as const;

const ENGINE_PROFILES: Record<string, string[]> = {
  fetchkeep: ["fetchkeep-http", "fetchkeep-chromium", "fetchkeep-lightpanda", "fetchkeep-auto"],
  firecrawl: ["firecrawl-selfhost", "firecrawl-hosted"],
  donsetch: ["donsetch"],
};

export interface RunOptions {
  engines: string[];
  suite: string;
  repetitions?: number;
  seed: number;
  timeoutMs: number;
  out?: string;
  allowPaid: boolean;
  budgetCredits: number;
  advertise?: string;
  bind: string;
  coldStart: boolean;
  footprint: boolean;
  command: string;
}

/** Deterministic PRNG (mulberry32) so interleaving is reproducible from the seed. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], rand: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function sh(cmd: string, args: string[]): string {
  try {
    return execFileSync(cmd, args, { encoding: "utf8", timeout: 15_000 }).trim();
  } catch {
    return "unavailable";
  }
}

function detectAddress(): string {
  for (const [name, addrs] of Object.entries(networkInterfaces())) {
    if (/^(lo|docker|br-|veth)/.test(name)) continue;
    const v4 = addrs?.find((a) => a.family === "IPv4" && !a.internal);
    if (v4) return v4.address;
  }
  return "127.0.0.1";
}

function environment(): Record<string, unknown> {
  const osRelease = existsSync("/etc/os-release") ? /PRETTY_NAME="([^"]+)"/.exec(readFileSync("/etc/os-release", "utf8"))?.[1] : undefined;
  return {
    os: `${osType()} ${release()}`,
    distribution: osRelease ?? null,
    wsl: /microsoft/i.test(release()),
    cpu: cpus()[0]?.model ?? "unknown",
    logicalCpus: cpus().length,
    memoryGb: Math.round((totalmem() / 1073741824) * 10) / 10,
    node: process.version,
    docker: sh("docker", ["version", "--format", "{{.Server.Version}}"]),
    fetchkeepCommit: sh("git", ["-C", REPO, "rev-parse", "HEAD"]),
    fetchkeepDirty: sh("git", ["-C", REPO, "status", "--porcelain"]) !== "",
  };
}

export function loadDatasets(): { cases: BenchCase[]; datasets: RunMeta["datasets"] } {
  const cases: BenchCase[] = [];
  const datasets: RunMeta["datasets"] = [];
  for (const name of ["fixtures", "live", "live-crawl"]) {
    const path = join(BENCH, "datasets", `${name}.json`);
    if (!existsSync(path)) continue;
    const ds = JSON.parse(readFileSync(path, "utf8")) as { cases: BenchCase[] };
    cases.push(...ds.cases);
    datasets.push({ name, path: relative(REPO, path).replace(/\\/g, "/"), sha256: sha256File(path), cases: ds.cases.length });
  }
  return { cases, datasets };
}

function makeAdapter(profile: string, runDir: string, opts: RunOptions, fixtureCidr: string): EngineAdapter {
  const env = process.env;
  if (profile.startsWith("fetchkeep-")) {
    return new FetchkeepAdapter({
      profile: profile as FetchkeepProfile,
      home: join(runDir, "state", profile),
      allowCidr: fixtureCidr,
      lightpandaExecutable: env.FETCHKEEP_BENCH_LIGHTPANDA,
    });
  }
  if (profile === "firecrawl-selfhost") {
    return new FirecrawlAdapter({
      profile,
      baseUrl: env.FIRECRAWL_SELFHOST_URL ?? "http://localhost:3002",
      composeProject: env.FIRECRAWL_COMPOSE_PROJECT ?? "firecrawl",
      checkout: env.FIRECRAWL_CHECKOUT,
    });
  }
  if (profile === "firecrawl-hosted") {
    return new FirecrawlAdapter({
      profile,
      baseUrl: "https://api.firecrawl.dev",
      apiKey: env.FIRECRAWL_API_KEY,
      allowPaid: opts.allowPaid,
      creditBudget: opts.budgetCredits,
    });
  }
  if (profile === "donsetch") {
    return new DonsetchAdapter({
      binary: env.FETCHKEEP_BENCH_DONSETCH ?? join(BENCH, ".tools", "node_modules", "donsetch", "binaries", "donsetch"),
      home: join(runDir, "state", "donsetch"),
      chromium: env.FETCHKEEP_BENCH_CHROMIUM,
    });
  }
  throw new Error(`unknown profile ${profile}`);
}

function resolveUrl(c: BenchCase, origin: string): string {
  return c.dataset === "fixture" ? `${origin}${c.url}` : c.url;
}

interface Task {
  c: BenchCase;
  profile: string;
  repetition: number;
}

export async function run(opts: RunOptions): Promise<string> {
  const suitePath = join(BENCH, "suites", `${opts.suite}.json`);
  if (!existsSync(suitePath)) throw new Error(`unknown suite ${opts.suite} (see bench/suites/)`);
  const suite = JSON.parse(readFileSync(suitePath, "utf8")) as Suite;
  const { cases: allCases, datasets } = loadDatasets();
  const selected = suite.cases.flatMap((pattern) => {
    const re = new RegExp(`^${pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")}$`);
    return allCases.filter((c) => re.test(c.id) && (!suite.kind || c.kind === suite.kind));
  });
  if (selected.length === 0) throw new Error(`suite ${opts.suite} selects no cases (is bench/datasets/live.json present?)`);
  const repetitions = opts.repetitions ?? suite.repetitions;

  const startedAt = new Date();
  const runId = `${startedAt.toISOString().replace(/[:.]/g, "-").slice(0, 19)}-${opts.suite}`;
  const runDir = opts.out ?? join(BENCH, "runs", runId);
  mkdirSync(join(runDir, "raw"), { recursive: true });

  const advertise = opts.advertise ?? detectAddress();
  const fixtures = await startFixtureServer({ host: opts.bind, advertise });
  const fixtureCidr = `${advertise}/32`;
  const log = (m: string) => process.stderr.write(`[bench] ${m}\n`);
  log(`run ${runId}: suite=${opts.suite} cases=${selected.length} reps=${repetitions} fixtures=${fixtures.origin}`);

  const profiles = [...new Set(opts.engines.flatMap((e) => ENGINE_PROFILES[e] ?? [e]))];
  for (const p of profiles) if (!(ALL_PROFILES as readonly string[]).includes(p)) throw new Error(`unknown engine/profile ${p}`);

  const resolved = selected.map((c) => ({ ...c, url: resolveUrl(c, fixtures.origin) }));
  writeFileSync(join(runDir, "cases.json"), `${JSON.stringify(resolved, null, 2)}\n`);

  const adapters = new Map<string, EngineAdapter>();
  const engineMeta: RunMeta["engines"] = [];
  const monitors = new Map<string, ResourceMonitor>();
  const availabilityOf = new Map<string, Availability>();
  for (const profile of profiles) {
    const adapter = makeAdapter(profile, runDir, opts, fixtureCidr);
    const availability = await adapter.availability().catch((e: unknown) => ({ available: false, reason: String(e) }));
    availabilityOf.set(profile, availability);
    let info: EngineInfo;
    try {
      info = await adapter.info();
    } catch (err) {
      info = { profile, engine: adapter.engine, version: "unknown", config: {}, settingDifferences: [], transport: "n/a" };
      log(`${profile}: info failed: ${String(err)}`);
    }
    const entry: RunMeta["engines"][number] = { ...info, availability };
    if (availability.available) {
      try {
        const { readyMs } = await adapter.start();
        entry.readyMs = Math.round(readyMs);
        adapters.set(profile, adapter);
        const mon = new ResourceMonitor(profile, adapter.engine, adapter.resources());
        await mon.start();
        monitors.set(profile, mon);
        log(`${profile}: ready in ${entry.readyMs} ms`);
      } catch (err) {
        entry.availability = { available: false, reason: `failed to start: ${(err as Error).message}` };
        availabilityOf.set(profile, entry.availability);
        log(`${profile}: start failed: ${(err as Error).message}`);
      }
    } else {
      log(`${profile}: unavailable (${availability.reason})`);
    }
    engineMeta.push(entry);
  }

  const golds = new Map<string, string>();
  for (const c of selected) {
    if (c.kind === "fetch" && c.gold) golds.set(c.id, readFileSync(join(BENCH, "fixtures", c.gold), "utf8"));
  }

  const recordsPath = join(runDir, "records.jsonl");
  const crawlPath = join(runDir, "crawl.jsonl");
  const rand = rng(opts.seed);
  let done = 0;
  const tasks: Task[] = [];
  for (let rep = 1; rep <= repetitions; rep++) {
    const round: Task[] = [];
    for (const c of resolved) for (const profile of profiles) round.push({ c, profile, repetition: rep });
    tasks.push(...shuffle(round, rand));
  }

  for (const t of tasks) {
    const adapter = adapters.get(t.profile);
    const base = {
      runId,
      suite: opts.suite,
      profile: t.profile,
      engine: (engineMeta.find((e) => e.profile === t.profile)?.engine ?? "fetchkeep") as RunRecord["engine"],
      caseId: t.c.id,
      dataset: t.c.dataset,
      repetition: t.repetition,
    };
    const naReason = !adapter
      ? `engine unavailable: ${availabilityOf.get(t.profile)?.reason ?? "not started"}`
      : t.c.dataset === "fixture" && !adapter.capabilities.localFixtures
        ? "hosted service cannot reach local fixtures (not exposed publicly by design)"
        : t.c.kind === "crawl" && !adapter.crawl
          ? "crawl not supported"
          : null;
    if (t.c.kind === "fetch") {
      const fc = t.c;
      const rec: RunRecord = {
        ...base,
        category: fc.category,
        heldOut: Boolean(fc.heldOut),
        outcome: "ok",
        startedAt: new Date().toISOString(),
        latencyMs: null,
      };
      if (naReason) {
        rec.outcome = adapter ? "na" : "unavailable";
        rec.naReason = naReason;
      } else {
        const t0 = performance.now();
        const out: FetchOutput = await adapter!.fetch(fc.url, opts.timeoutMs).catch((err: unknown): FetchOutput => ({
          ok: false,
          markdown: "",
          error: { kind: /timeout/i.test(String(err)) ? ("timeout" as const) : ("engine_error" as const), message: String((err as Error).message ?? err).slice(0, 500) },
          raw: null,
        }));
        rec.latencyMs = Math.round((performance.now() - t0) * 10) / 10;
        rec.outcome = out.ok ? "ok" : "error";
        const md = out.ok ? out.markdown : "";
        rec.output = { chars: md.length, tokens: md ? countTokens(md) : 0 };
        if (out.title) rec.output.title = out.title;
        if (out.finalUrl) rec.output.finalUrl = out.finalUrl;
        if (out.backend) rec.output.backend = out.backend;
        if (out.escalated !== undefined) rec.output.escalated = out.escalated;
        if (out.attempts !== undefined) rec.output.attempts = out.attempts;
        if (out.error) rec.error = out.error;
        if (out.cost) rec.cost = out.cost;
        const scores: Record<string, number | null> = { ...scoreFetch(fc, out.ok, md, golds.get(fc.id) ?? null) };
        if (adapter!.verifyCitation && out.ok && out.citationRef && (fc.mustContain ?? []).length && !fc.expectError) {
          let verified = 0;
          const outPlain = plain(md);
          const present = (fc.mustContain ?? []).filter((p) => outPlain.includes(plain(p)));
          for (const p of present) if (await adapter!.verifyCitation(out.citationRef, p).catch(() => false)) verified++;
          scores.citation = present.length ? verified / present.length : null;
        }
        rec.scores = scores;
        const rawBase = join("raw", t.profile, `${fc.id}.r${t.repetition}`);
        mkdirSync(join(runDir, "raw", t.profile), { recursive: true });
        writeFileSync(join(runDir, `${rawBase}.md`), out.markdown ?? "");
        writeFileSync(join(runDir, `${rawBase}.json`), JSON.stringify(out.raw ?? null, null, 2).slice(0, 2_000_000));
        rec.rawPath = `${rawBase}.md`.replace(/\\/g, "/");
      }
      appendFileSync(recordsPath, `${JSON.stringify(rec)}\n`);
    } else {
      const cc = t.c as CrawlCase;
      const rec: CrawlRecord = { ...base, outcome: "ok", latencyMs: null, pagesReturned: 0, coverage: null, forbiddenReturned: 0, duplicateRate: null, unexpectedPages: [], missingPages: [] };
      if (naReason) {
        rec.outcome = adapter ? "na" : "unavailable";
        rec.naReason = naReason;
      } else {
        const t0 = performance.now();
        const out: CrawlOutput = await adapter!.crawl!(cc.url, { maxPages: cc.maxPages, maxDepth: cc.maxDepth, timeoutMs: Math.max(opts.timeoutMs * 4, 120_000) }).catch((err: unknown): CrawlOutput => ({
          ok: false,
          pages: [],
          error: { kind: "engine_error" as const, message: String((err as Error).message ?? err).slice(0, 500) },
          raw: null,
        }));
        rec.latencyMs = Math.round((performance.now() - t0) * 10) / 10;
        rec.outcome = out.ok ? "ok" : "error";
        Object.assign(rec, scoreCrawl(cc, out.pages, fixtures.origin));
        if (out.stopReason) rec.stopReason = out.stopReason;
        if (out.error) rec.error = out.error;
        if (out.cost) rec.cost = out.cost;
        const rawBase = join("raw", t.profile, `${cc.id}.r${t.repetition}`);
        mkdirSync(join(runDir, "raw", t.profile), { recursive: true });
        writeFileSync(join(runDir, `${rawBase}.md`), out.pages.map((p) => `<!-- ${p.url} -->\n${p.markdown}`).join("\n\n"));
        writeFileSync(join(runDir, `${rawBase}.json`), JSON.stringify(out.raw ?? null, null, 2).slice(0, 2_000_000));
        rec.rawPath = `${rawBase}.md`.replace(/\\/g, "/");
      }
      appendFileSync(crawlPath, `${JSON.stringify(rec)}\n`);
    }
    done++;
    if (done % 10 === 0 || done === tasks.length) log(`${done}/${tasks.length} tasks`);
  }

  const resources: ResourceRecord[] = [];
  for (const [, mon] of monitors) resources.push(await mon.stop());
  for (const e of engineMeta) {
    if (!monitors.has(e.profile)) {
      resources.push({ profile: e.profile, engine: e.engine, scope: e.profile === "firecrawl-hosted" ? "remote" : "process-tree", cpuSeconds: null, peakRssMb: null, idleRssMb: null, samples: 0, note: "engine not started" });
    }
  }
  writeFileSync(join(runDir, "resources.json"), `${JSON.stringify(resources, null, 2)}\n`);

  if (opts.coldStart) {
    const cold: ColdStartRecord[] = [];
    const target = `${fixtures.origin}/articles/tide-gauge.html`;
    for (const [profile, adapter] of adapters) {
      if (!adapter.coldStart) continue;
      const samples: number[] = [];
      for (let i = 0; i < (adapter.coldStartSamples ?? 5); i++) {
        const ms = await adapter.coldStart(target, opts.timeoutMs).catch(() => null);
        if (ms !== null) samples.push(Math.round(ms));
      }
      cold.push({ profile, engine: adapter.engine, method: adapter.coldStartMethod ?? "one-shot", samplesMs: samples });
      log(`${profile}: cold start ${samples.join(", ")} ms`);
    }
    writeFileSync(join(runDir, "coldstart.json"), `${JSON.stringify(cold, null, 2)}\n`);
  }

  if (opts.footprint) {
    const records = await measureFootprint(REPO, process.env);
    writeFileSync(join(runDir, "footprint.json"), `${JSON.stringify(records, null, 2)}\n`);
    log(`footprint: ${records.length} components measured`);
  }

  for (const [, adapter] of adapters) await adapter.stop().catch(() => undefined);
  await fixtures.close();

  const quote = (s: string) => (/^[\w./:=,@-]+$/.test(s) ? s : `'${s.replace(/'/g, "'\\''")}'`);
  const meta: RunMeta = {
    runId,
    suite: opts.suite,
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    command: opts.command,
    rerun: `npm run bench -- --engines ${profiles.join(",")} --suite ${opts.suite} --repetitions ${repetitions} --seed ${opts.seed} --timeout ${opts.timeoutMs}${opts.coldStart ? " --cold-start" : ""}${opts.footprint ? " --footprint" : ""}${opts.allowPaid ? ` --allow-paid --budget-credits ${opts.budgetCredits}` : ""}`
      .split(" ")
      .map(quote)
      .join(" "),
    seed: opts.seed,
    repetitions,
    timeoutMs: opts.timeoutMs,
    concurrency: 1,
    tokenizer: { name: "gpt-tokenizer", encoding: "o200k_base", version: readPkgVersion("gpt-tokenizer") },
    environment: environment(),
    fixtureServer: { origin: fixtures.origin, bind: opts.bind },
    datasets: [...datasets, { name: "fixture-files", path: "bench/fixtures/SHA256SUMS", sha256: sha256File(join(BENCH, "fixtures", "SHA256SUMS")), cases: 0 }],
    engines: engineMeta,
    notes: [
      "Tasks run sequentially (concurrency 1) in a seeded random order per repetition; all engines see the same URLs and per-request deadline.",
      "Repetition 1 is the first request after the engine started (browsers launch lazily); later repetitions are warm.",
      "Live websites change: live results are only comparable within one run.",
    ],
  };
  writeFileSync(join(runDir, "meta.json"), `${JSON.stringify(meta, null, 2)}\n`);
  log(`records written to ${runDir}`);
  return runDir;
}

function readPkgVersion(name: string): string {
  try {
    return (JSON.parse(readFileSync(join(REPO, "node_modules", name, "package.json"), "utf8")) as { version: string }).version;
  } catch {
    return "unknown";
  }
}

/** URL identity for crawl scoring: path + query without tracking params, no fragment, trailing index.html dropped. */
function pageKey(url: string, origin: string): string {
  try {
    const u = new URL(url, origin);
    u.hash = "";
    for (const k of [...u.searchParams.keys()]) if (/^utm_/.test(k)) u.searchParams.delete(k);
    return (u.origin === new URL(origin).origin ? "" : u.origin) + u.pathname.replace(/index\.html$/, "") + u.search;
  } catch {
    return url;
  }
}

export function scoreCrawl(c: CrawlCase, pages: { url: string; markdown: string }[], origin: string): Partial<CrawlRecord> {
  const keys = pages.map((p) => pageKey(p.url, origin));
  const unique = new Set(keys);
  const expected = c.expectedPages.map((p) => pageKey(p, origin));
  const forbidden = new Set(c.forbiddenPages.map((p) => pageKey(p, origin)));
  const missing = expected.filter((e) => !unique.has(e));
  const unexpected = [...unique].filter((k) => !expected.includes(k));
  return {
    pagesReturned: pages.length,
    coverage: expected.length ? (expected.length - missing.length) / expected.length : null,
    forbiddenReturned: [...unique].filter((k) => forbidden.has(k)).length,
    // Same page (after URL normalization) returned more than once. Distinct URLs with identical content are not counted:
    // the fixture graph contains one deliberate content duplicate that a crawler cannot know about in advance.
    duplicateRate: pages.length ? (pages.length - unique.size) / pages.length : null,
    missingPages: missing,
    unexpectedPages: unexpected,
  };
}
