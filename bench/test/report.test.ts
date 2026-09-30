import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { generateReport, nearestRank } from "../lib/report.ts";
import type { BenchCase, RunMeta, RunRecord } from "../lib/types.ts";

function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') (cell += '"'), i++;
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") row.push(cell), (cell = "");
    else if (ch === "\n") row.push(cell), rows.push(row), (row = []), (cell = "");
    else cell += ch;
  }
  const [head = [], ...body] = rows;
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ""])));
}

const cases: BenchCase[] = [
  { id: "f1", kind: "fetch", dataset: "fixture", url: "http://127.0.0.1:1/f1", category: "article", description: "dev article", mustContain: [], mustNotContain: [] },
  { id: "f2", kind: "fetch", dataset: "fixture", url: "http://127.0.0.1:1/f2", category: "tables", description: "held-out table", heldOut: true, mustContain: [], mustNotContain: [] },
  { id: "e1", kind: "fetch", dataset: "fixture", url: "http://127.0.0.1:1/404", category: "errors", description: "404", expectError: true, mustContain: [], mustNotContain: [] },
  { id: "l1", kind: "fetch", dataset: "live", url: "https://example.com/", category: "article", description: "live", mustContain: [], mustNotContain: [] },
];

function rec(profile: string, engine: RunRecord["engine"], caseId: string, repetition: number, extra: Partial<RunRecord>): RunRecord {
  const c = cases.find((x) => x.id === caseId);
  if (!c || c.kind !== "fetch") throw new Error(caseId);
  return {
    runId: "r", suite: "test", profile, engine, caseId, dataset: c.dataset, category: c.category, heldOut: c.heldOut === true, repetition,
    outcome: "ok", startedAt: "2026-01-01T00:00:00Z", latencyMs: null, ...extra,
  };
}

const ok = (usable: number, latencyMs: number, passageRecall = 1): Partial<RunRecord> => ({
  outcome: "ok", latencyMs, output: { chars: 100, tokens: 20 }, scores: { usable, passageRecall, citation: null },
});

const records: RunRecord[] = [
  rec("fk", "fetchkeep", "f1", 1, { ...ok(1, 100), rawPath: "raw/fk/f1.r1.md" }),
  rec("fk", "fetchkeep", "f1", 2, ok(1, 20)),
  rec("fk", "fetchkeep", "f1", 3, ok(1, 40)),
  rec("fk", "fetchkeep", "f2", 1, ok(1, 200)),
  rec("fk", "fetchkeep", "f2", 2, ok(0, 10, 0.2)),
  rec("fk", "fetchkeep", "f2", 3, { outcome: "error", latencyMs: 5000, error: { kind: "timeout", message: "timed out" } }),
  rec("fk", "fetchkeep", "e1", 1, { outcome: "error", latencyMs: 30, error: { kind: "http_error", message: "404" }, scores: { correctError: 1, usable: null } }),
  rec("fk", "fetchkeep", "l1", 1, ok(1, 300)),
  ...["f1", "f2", "e1"].map((id) => rec("fc", "firecrawl", id, 1, { outcome: "na", naReason: "hosted service cannot reach local fixtures" })),
  rec("fc", "firecrawl", "l1", 1, ok(1, 500)),
  ...["f1", "f2", "e1", "l1"].map((id) => rec("ds", "donsetch", id, 1, { outcome: "unavailable", naReason: "binary not found" })),
];

const engine = (profile: string, name: RunRecord["engine"], available: boolean): RunMeta["engines"][number] => ({
  profile, engine: name, version: "1", config: {}, settingDifferences: [], transport: "stdio",
  availability: available ? { available } : { available, reason: "binary not found" },
});

const meta: RunMeta = {
  runId: "r", suite: "test", startedAt: "2026-01-01T00:00:00Z", finishedAt: "2026-01-01T00:01:00Z", command: "node bench/run.ts", rerun: "node bench/run.ts --seed 1",
  seed: 1, repetitions: 3, timeoutMs: 5000, concurrency: 1, tokenizer: { name: "tiktoken", encoding: "o200k_base", version: "1" }, environment: { os: "test" },
  fixtureServer: { origin: "http://127.0.0.1:1", bind: "127.0.0.1" }, datasets: [{ name: "fixtures", path: "bench/datasets/fixtures.json", sha256: "abc", cases: 3 }],
  engines: [engine("fk", "fetchkeep", true), engine("fc", "firecrawl", true), engine("ds", "donsetch", false)], notes: [],
};

let dir: string;
let summary: Record<string, string>[];

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "bench-report-"));
  await mkdir(join(dir, "raw", "fk"), { recursive: true });
  await writeFile(join(dir, "raw", "fk", "f1.r1.md"), "# Title\n<script>alert(1)</script>\n");
  await writeFile(join(dir, "meta.json"), JSON.stringify(meta));
  await writeFile(join(dir, "cases.json"), JSON.stringify(cases));
  await writeFile(join(dir, "records.jsonl"), records.map((r) => JSON.stringify(r)).join("\n") + "\n");
  await writeFile(join(dir, "resources.json"), JSON.stringify([{ profile: "fc", engine: "firecrawl", scope: "remote", cpuSeconds: null, peakRssMb: null, idleRssMb: null, samples: 0 }]));
  await generateReport(dir);
  summary = parseCsv(await readFile(join(dir, "summary.csv"), "utf8"));
});

afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

const row = (profile: string, dataset: string, split: string) => {
  const r = summary.find((x) => x.profile === profile && x.dataset === dataset && x.split === split);
  if (!r) throw new Error(`missing summary row ${profile}/${dataset}/${split}`);
  return r;
};

describe("nearestRank", () => {
  it("takes the value at rank ceil(p/100 × n)", () => {
    expect(nearestRank([50, 15, 40, 20, 35], 30)).toBe(20);
    expect(nearestRank([50, 15, 40, 20, 35], 100)).toBe(50);
    expect(nearestRank([50, 15, 40, 20, 35], 0)).toBe(15);
    expect(nearestRank([10, 20, 40], 95)).toBe(40);
    expect(nearestRank([], 50)).toBeNull();
  });
});

describe("generateReport", () => {
  it("splits latency into first request and warm with nearest-rank percentiles over ok tasks", () => {
    const r = row("fk", "fixture", "all");
    expect(r.latency_first_p50).toBe("100"); // first: [100, 200] (e1 errored)
    expect(r.latency_warm_p50).toBe("20"); // warm ok: [20, 40, 10]; the timed-out repetition is excluded
    expect(r.latency_warm_p95).toBe("40");
    expect(r.latency_warm_n).toBe("3");
  });

  it("computes usable rate over attempted non-expect-error tasks, counting errors as unusable", () => {
    const all = row("fk", "fixture", "all");
    expect(all.n_attempted).toBe("7");
    expect(Number(all.usable_rate)).toBeCloseTo(4 / 6, 4);
    expect(all.usable_n).toBe("6");
    expect(Number(all.timeout_rate)).toBeCloseTo(1 / 7, 4);
    expect(all.correct_error_rate).toBe("1");
    expect(Number(all.extraction_failure_rate)).toBeCloseTo(1 / 5, 4);
    expect(Number(row("fk", "fixture", "heldOut").usable_rate)).toBeCloseTo(1 / 3, 4);
    expect(row("fk", "fixture", "dev").usable_rate).toBe("1");
  });

  it("keeps unavailable and N/A tasks out of rates instead of reporting zeros", () => {
    const na = row("fc", "fixture", "all");
    expect([na.n_na, na.n_attempted, na.usable_rate, na.usable_n, na.success_rate, na.latency_warm_p50]).toEqual(["3", "0", "", "0", "", ""]);
    expect(row("fc", "live", "all").usable_rate).toBe("1");
    const un = row("ds", "fixture", "all");
    expect([un.n_unavailable, un.n_na, un.usable_rate, un.passage_recall_mean]).toEqual(["3", "0", "", ""]);
    expect(Number(row("ds", "live", "all").n_unavailable)).toBe(1);
  });

  it("lists reasons for unavailable/N/A work and escapes raw output in HTML", async () => {
    const md = await readFile(join(dir, "report.md"), "utf8");
    expect(md).toContain("hosted service cannot reach local fixtures");
    expect(md).toContain("binary not found");
    expect(md).toContain("not measurable");
    const html = await readFile(join(dir, "report.html"), "utf8");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("<script>alert(1)");
  });
});
