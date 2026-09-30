/**
 * Turns a benchmark run directory into `summary.csv`, `cases.csv`, `crawl.csv` (when crawl records exist),
 * `report.md` and a self-contained `report.html`.
 *
 * Every figure is computed from the run's records. Missing data is rendered as `n/a` (CSV: empty cell) with
 * its sample count, never as zero. Percentiles use the nearest-rank method.
 */
import { Buffer } from "node:buffer";
import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { BenchCase, ColdStartRecord, CrawlRecord, EngineName, FootprintRecord, ResourceRecord, RunMeta, RunRecord } from "./types.ts";

type Dataset = "fixture" | "live";
type Split = "all" | "heldOut" | "dev";

const DATASETS: readonly Dataset[] = ["fixture", "live"];
const SPLITS: readonly Split[] = ["all", "heldOut", "dev"];
const RAW_PREVIEW_CHARS = 4000;
const PERCENTILE_METHOD =
  "Percentiles use the nearest-rank method: sort the latencies of `ok` tasks ascending and take the value at rank ceil(p/100 × n). " +
  "`first` = repetition 1 (includes any per-URL cold work such as the first request to a host); `warm` = repetitions ≥ 2.";

// ---------------------------------------------------------------- loading

interface RunData {
  dir: string;
  meta: RunMeta;
  records: RunRecord[];
  crawl: CrawlRecord[];
  coldstart: ColdStartRecord[];
  resources: ResourceRecord[];
  footprint: FootprintRecord[];
  cases: Map<string, BenchCase>;
  /** Case ids in presentation order (cases.json order, then any extra ids seen in records). */
  caseOrder: string[];
  /** Profiles in presentation order (meta.engines order, then any extra profiles seen in records). */
  profiles: string[];
}

async function readOptional(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

function parseJsonl<T>(text: string | null, file: string): T[] {
  if (text === null) return [];
  const out: T[] = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]?.trim();
    if (!line) continue;
    try {
      out.push(JSON.parse(line) as T);
    } catch (error) {
      throw new Error(`${file}:${i + 1}: invalid JSON (${(error as Error).message})`);
    }
  }
  return out;
}

function parseJson<T>(text: string, file: string): T {
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    throw new Error(`${file}: invalid JSON (${(error as Error).message})`);
  }
}

async function loadRun(dir: string): Promise<RunData> {
  const file = (name: string) => readOptional(join(dir, name));
  const metaText = await file("meta.json");
  if (metaText === null) throw new Error(`${join(dir, "meta.json")} not found — not a run directory?`);
  const meta = parseJson<RunMeta>(metaText, "meta.json");
  const [records, crawl, coldstart, resources, footprint, caseList] = await Promise.all([
    file("records.jsonl").then((t) => parseJsonl<RunRecord>(t, "records.jsonl")),
    file("crawl.jsonl").then((t) => parseJsonl<CrawlRecord>(t, "crawl.jsonl")),
    file("coldstart.json").then((t) => (t === null ? [] : parseJson<ColdStartRecord[]>(t, "coldstart.json"))),
    file("resources.json").then((t) => (t === null ? [] : parseJson<ResourceRecord[]>(t, "resources.json"))),
    file("footprint.json").then((t) => (t === null ? [] : parseJson<FootprintRecord[]>(t, "footprint.json"))),
    file("cases.json").then((t) => (t === null ? [] : parseJson<BenchCase[]>(t, "cases.json"))),
  ]);
  const cases = new Map<string, BenchCase>();
  for (const c of caseList) cases.set(c.id, c);
  const caseOrder = uniq([...caseList.map((c) => c.id), ...records.map((r) => r.caseId), ...crawl.map((r) => r.caseId)]);
  const profiles = uniq([
    ...(meta.engines ?? []).map((e) => e.profile),
    ...records.map((r) => r.profile),
    ...crawl.map((r) => r.profile),
    ...resources.map((r) => r.profile),
    ...coldstart.map((r) => r.profile),
    ...footprint.map((r) => r.profile),
  ]);
  return { dir, meta, records, crawl, coldstart, resources, footprint, cases, caseOrder, profiles };
}

function uniq<T>(values: Iterable<T>): T[] {
  return [...new Set(values)];
}

// ---------------------------------------------------------------- statistics

/** Nearest-rank percentile: value at rank ceil(p/100 × n) of the ascending sample; null for an empty sample. */
export function nearestRank(values: readonly number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.min(sorted.length, Math.max(1, Math.ceil((p / 100) * sorted.length)));
  return sorted[rank - 1] ?? null;
}

/** An aggregate value and the number of samples it was computed from. `value` is null when `n` is 0. */
export interface Agg {
  value: number | null;
  n: number;
}

const mean = (values: readonly number[]): Agg => ({
  value: values.length ? values.reduce((a, b) => a + b, 0) / values.length : null,
  n: values.length,
});
const rate = (hits: number, n: number): Agg => ({ value: n ? hits / n : null, n });
const percentile = (values: readonly number[], p: number): Agg => ({ value: nearestRank(values, p), n: values.length });

export interface Stats {
  nTasks: number;
  nOk: number;
  nError: number;
  nUnavailable: number;
  nNa: number;
  /** ok + error: tasks the engine actually ran. Denominator of success/timeout/blocked rates. */
  nAttempted: number;
  usable: Agg;
  success: Agg;
  timeout: Agg;
  blocked: Agg;
  extractionFailure: Agg;
  passageRecall: Agg;
  boilerplate: Agg;
  tokenPrecision: Agg;
  tokenRecall: Agg;
  tokenF1: Agg;
  headings: Agg;
  tables: Agg;
  code: Agg;
  correctError: Agg;
  citation: Agg;
  chars: Agg;
  tokens: Agg;
  latencyFirstP50: Agg;
  latencyFirstP95: Agg;
  latencyWarmP50: Agg;
  latencyWarmP95: Agg;
  latencyAllP50: Agg;
  escalation: Agg;
  attempts: Agg;
  /** Summed engine-reported cost per unit, e.g. "12 credits (estimated)"; null when no record carries a cost. */
  cost: string | null;
}

function score(r: RunRecord, key: string): number | null {
  const v = r.scores?.[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function isExpectError(r: RunRecord, cases: Map<string, BenchCase>): boolean {
  const c = cases.get(r.caseId);
  return (c?.kind === "fetch" && c.expectError === true) || score(r, "correctError") !== null;
}

function nums(values: Iterable<number | null | undefined>): number[] {
  const out: number[] = [];
  for (const v of values) if (typeof v === "number" && Number.isFinite(v)) out.push(v);
  return out;
}

function sumCost(items: readonly { cost?: { unit: string; amount: number; estimated: boolean } }[]): string | null {
  const byUnit = new Map<string, { amount: number; estimated: boolean }>();
  for (const it of items) {
    if (!it.cost) continue;
    const cur = byUnit.get(it.cost.unit) ?? { amount: 0, estimated: false };
    cur.amount += it.cost.amount;
    cur.estimated ||= it.cost.estimated;
    byUnit.set(it.cost.unit, cur);
  }
  if (byUnit.size === 0) return null;
  return [...byUnit]
    .map(([unit, c]) => `${round(c.amount, 4)} ${unit}${c.estimated ? " (estimated)" : ""}`)
    .join("; ");
}

/**
 * Aggregates fetch records.
 * - Rates over `nAttempted` (ok + error); unavailable/N/A tasks are counted separately and never enter a rate.
 * - `usable`: attempted tasks of cases that do not expect an error; an errored task without a usable score counts as 0.
 * - Quality means (passage recall, token P/R/F1, headings, tables, code, boilerplate, citation): over `ok` tasks where the metric applies.
 * - `correctError`: over attempted tasks of expect-error cases that carry the score.
 * - `extractionFailure`: `ok` tasks with passage recall < 0.5, over `ok` tasks with a passage recall score.
 */
export function computeStats(records: readonly RunRecord[], cases: Map<string, BenchCase>): Stats {
  const ok = records.filter((r) => r.outcome === "ok");
  const errors = records.filter((r) => r.outcome === "error");
  const attempted = records.filter((r) => r.outcome === "ok" || r.outcome === "error");
  const usableVals: number[] = [];
  for (const r of attempted) {
    if (isExpectError(r, cases)) continue;
    const u = score(r, "usable");
    if (u !== null) usableVals.push(u);
    else if (r.outcome === "error") usableVals.push(0);
  }
  const okScore = (key: string) => mean(nums(ok.map((r) => score(r, key))));
  const recall = nums(ok.map((r) => score(r, "passageRecall")));
  const lat = (pred: (r: RunRecord) => boolean) => nums(ok.filter(pred).map((r) => r.latencyMs));
  const first = lat((r) => r.repetition === 1);
  const warm = lat((r) => r.repetition >= 2);
  const escalated = ok.flatMap((r) => (typeof r.output?.escalated === "boolean" ? [r.output.escalated] : []));
  return {
    nTasks: records.length,
    nOk: ok.length,
    nError: errors.length,
    nUnavailable: records.filter((r) => r.outcome === "unavailable").length,
    nNa: records.filter((r) => r.outcome === "na").length,
    nAttempted: attempted.length,
    usable: mean(usableVals),
    success: rate(ok.length, attempted.length),
    timeout: rate(errors.filter((r) => r.error?.kind === "timeout").length, attempted.length),
    blocked: rate(errors.filter((r) => r.error?.kind === "blocked").length, attempted.length),
    extractionFailure: rate(recall.filter((v) => v < 0.5).length, recall.length),
    passageRecall: mean(recall),
    boilerplate: okScore("boilerplateExclusion"),
    tokenPrecision: okScore("tokenPrecision"),
    tokenRecall: okScore("tokenRecall"),
    tokenF1: okScore("tokenF1"),
    headings: okScore("headings"),
    tables: okScore("tables"),
    code: okScore("code"),
    correctError: mean(nums(attempted.map((r) => score(r, "correctError")))),
    citation: okScore("citation"),
    chars: mean(nums(ok.map((r) => r.output?.chars))),
    tokens: mean(nums(ok.map((r) => r.output?.tokens))),
    latencyFirstP50: percentile(first, 50),
    latencyFirstP95: percentile(first, 95),
    latencyWarmP50: percentile(warm, 50),
    latencyWarmP95: percentile(warm, 95),
    latencyAllP50: percentile(lat(() => true), 50),
    escalation: rate(escalated.filter(Boolean).length, escalated.length),
    attempts: mean(nums(ok.map((r) => r.output?.attempts))),
    cost: sumCost(records),
  };
}

// ---------------------------------------------------------------- formatting

function round(v: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
}

const csvNum = (a: Agg | number | null, digits = 4): string => {
  const v = typeof a === "number" || a === null ? a : a.value;
  return v === null ? "" : String(round(v, digits));
};

function csvCell(v: string | number | boolean | null | undefined): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(head: readonly string[], rows: readonly (readonly (string | number | boolean | null | undefined)[])[]): string {
  return [head, ...rows].map((row) => row.map(csvCell).join(",")).join("\n") + "\n";
}

const NA = "n/a";
const fScore = (a: Agg): string => (a.value === null ? `${NA} (n=0)` : `${a.value.toFixed(3)} (n=${a.n})`);
const fRate = (a: Agg): string => (a.value === null ? `${NA} (n=0)` : `${(a.value * 100).toFixed(1)}% (n=${a.n})`);
const fMs = (a: Agg): string => (a.value === null ? `${NA} (n=0)` : `${Math.round(a.value)} ms (n=${a.n})`);
const fMb = (v: number | null): string => (v === null ? NA : `${v.toFixed(1)} MB`);

function fBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GiB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MiB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${bytes} B`;
}

function fValue(v: unknown): string {
  if (v === null || v === undefined) return NA;
  return typeof v === "string" ? v : JSON.stringify(v);
}

function listSome(values: readonly string[], max = 8): string {
  return values.length <= max ? values.join(", ") : `${values.slice(0, max).join(", ")} … (+${values.length - max} more)`;
}

const SCOPE_LABEL: Record<ResourceRecord["scope"], string> = {
  "process-tree": "local process tree (engine process + children)",
  "docker-stack": "whole Docker stack (all containers of the engine)",
  remote: "remote service — not measurable",
};

// ---------------------------------------------------------------- document model (rendered to Markdown and HTML)

type Cell = string;
type Block =
  | { kind: "h"; level: 1 | 2 | 3; text: string }
  | { kind: "p"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "table"; head: Cell[]; rows: Cell[][] }
  | { kind: "code"; text: string }
  /** HTML-only fragment (charts). Already escaped/safe. */
  | { kind: "html"; html: string };

const h = (level: 1 | 2 | 3, text: string): Block => ({ kind: "h", level, text });
const p = (text: string): Block => ({ kind: "p", text });
const list = (items: string[]): Block => ({ kind: "list", items });
const table = (head: Cell[], rows: Cell[][]): Block => ({ kind: "table", head, rows });

function mdEscapeCell(s: string): string {
  return s.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function renderMarkdown(blocks: readonly Block[]): string {
  const out: string[] = [];
  for (const b of blocks) {
    switch (b.kind) {
      case "h":
        out.push(`${"#".repeat(b.level)} ${b.text}`);
        break;
      case "p":
        out.push(b.text);
        break;
      case "list":
        out.push(b.items.length ? b.items.map((i) => `- ${i.replace(/\r?\n/g, " ")}`).join("\n") : "_(none)_");
        break;
      case "table":
        if (b.rows.length === 0) {
          out.push("_(no rows)_");
          break;
        }
        out.push(
          [
            `| ${b.head.map(mdEscapeCell).join(" | ")} |`,
            `|${b.head.map(() => "---").join("|")}|`,
            ...b.rows.map((r) => `| ${r.map(mdEscapeCell).join(" | ")} |`),
          ].join("\n"),
        );
        break;
      case "code": {
        const fence = b.text.includes("```") ? "````" : "```";
        out.push(`${fence}\n${b.text}\n${fence}`);
        break;
      }
      case "html":
        break;
    }
  }
  return out.join("\n\n") + "\n";
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** Escapes text, then turns `code` spans into <code>. */
function inlineHtml(s: string): string {
  return escapeHtml(s).replace(/`([^`]+)`/g, "<code>$1</code>");
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "section";
}

function renderHtmlBlocks(blocks: readonly Block[]): string {
  const out: string[] = [];
  for (const b of blocks) {
    switch (b.kind) {
      case "h":
        out.push(b.level === 2 ? `<h2 id="${slug(b.text)}">${inlineHtml(b.text)}</h2>` : `<h${b.level}>${inlineHtml(b.text)}</h${b.level}>`);
        break;
      case "p":
        out.push(`<p>${inlineHtml(b.text)}</p>`);
        break;
      case "list":
        out.push(b.items.length ? `<ul>${b.items.map((i) => `<li>${inlineHtml(i)}</li>`).join("")}</ul>` : `<p class="muted">(none)</p>`);
        break;
      case "table":
        out.push(
          b.rows.length === 0
            ? `<p class="muted">(no rows)</p>`
            : `<div class="tw" tabindex="0" role="region" aria-label="Scrollable data table"><table><thead><tr>${b.head.map((c) => `<th scope="col">${inlineHtml(c)}</th>`).join("")}</tr></thead><tbody>${b.rows
                .map((r) => `<tr>${r.map((c, i) => i === 0 ? `<th scope="row">${inlineHtml(c)}</th>` : `<td>${inlineHtml(c)}</td>`).join("")}</tr>`)
                .join("")}</tbody></table></div>`,
        );
        break;
      case "code":
        out.push(`<pre>${escapeHtml(b.text)}</pre>`);
        break;
      case "html":
        out.push(`<div class="chart-wrap" tabindex="0" role="region" aria-label="Scrollable chart">${b.html}</div>`);
        break;
    }
  }
  return out.join("\n");
}

// ---------------------------------------------------------------- SVG charts

interface Bar {
  label: string;
  value: number | null;
  /** Text shown next to the bar (value and n), or the reason when value is null. */
  text: string;
}

function svgBarChart(title: string, bars: readonly Bar[], opts: { max?: number } = {}): string {
  const labelW = 210;
  const barArea = 310;
  const textW = 280;
  const rowH = 32;
  const top = 38;
  const width = labelW + barArea + textW;
  const height = top + Math.max(1, bars.length) * rowH + 8;
  const max = opts.max ?? Math.max(0, ...bars.map((b) => b.value ?? 0));
  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" class="chart" role="img" aria-label="${escapeHtml(title)}" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<text x="0" y="18" class="ct">${escapeHtml(title)}</text>`,
  ];
  if (bars.length === 0) parts.push(`<text x="0" y="${top + 16}" class="cn">no data</text>`);
  bars.forEach((b, i) => {
    const y = top + i * rowH;
    const w = b.value === null || max <= 0 ? 0 : Math.max(1, (b.value / max) * barArea);
    parts.push(`<text x="${labelW - 8}" y="${y + 16}" text-anchor="end" class="cl">${escapeHtml(b.label)}</text>`);
    if (b.value !== null) parts.push(`<rect x="${labelW}" y="${y + 4}" width="${w.toFixed(1)}" height="${rowH - 8}" class="cb"/>`);
    parts.push(`<text x="${labelW + w + 6}" y="${y + 16}" class="${b.value === null ? "cn" : "cv"}">${escapeHtml(b.text)}</text>`);
  });
  parts.push("</svg>");
  return parts.join("");
}

// ---------------------------------------------------------------- report sections

interface Ctx {
  data: RunData;
  engineOf: (profile: string) => EngineName | string;
  statsFor: (profile: string, dataset: Dataset, split: Split) => Stats;
  datasetsPresent: Dataset[];
}

function makeCtx(data: RunData): Ctx {
  const engines = new Map<string, string>();
  for (const e of data.meta.engines ?? []) engines.set(e.profile, e.engine);
  for (const r of [...data.records, ...data.crawl, ...data.resources, ...data.coldstart, ...data.footprint]) {
    if (!engines.has(r.profile)) engines.set(r.profile, r.engine);
  }
  const cache = new Map<string, Stats>();
  return {
    data,
    engineOf: (profile) => engines.get(profile) ?? "unknown",
    statsFor: (profile, dataset, split) => {
      const key = `${profile}\u0000${dataset}\u0000${split}`;
      let s = cache.get(key);
      if (!s) {
        s = computeStats(
          data.records.filter(
            (r) => r.profile === profile && r.dataset === dataset && (split === "all" || (split === "heldOut") === (r.heldOut === true)),
          ),
          data.cases,
        );
        cache.set(key, s);
      }
      return s;
    },
    datasetsPresent: DATASETS.filter((d) => data.records.some((r) => r.dataset === d)),
  };
}

function profilesWithRecords(ctx: Ctx, dataset: Dataset, split: Split = "all"): string[] {
  return ctx.data.profiles.filter((pr) => ctx.statsFor(pr, dataset, split).nTasks > 0);
}

function summaryCsv(ctx: Ctx): string {
  const head = [
    "profile", "engine", "dataset", "split", "n_tasks", "n_ok", "n_error", "n_unavailable", "n_na", "n_attempted",
    "usable_rate", "usable_n", "success_rate", "timeout_rate", "blocked_rate", "extraction_failure_rate", "extraction_failure_n",
    "passage_recall_mean", "passage_recall_n", "boilerplate_exclusion_mean", "boilerplate_exclusion_n", "token_f1_mean", "token_f1_n",
    "headings_mean", "headings_n", "tables_mean", "tables_n", "code_mean", "code_n", "correct_error_rate", "correct_error_n",
    "citation_mean", "citation_n", "chars_mean", "tokens_mean", "output_n", "latency_first_p50", "latency_first_n",
    "latency_warm_p50", "latency_warm_p95", "latency_warm_n", "escalation_rate", "escalation_n", "attempts_mean", "attempts_n", "cost_total",
  ];
  const rows: (string | number)[][] = [];
  for (const profile of ctx.data.profiles) {
    for (const dataset of DATASETS) {
      for (const split of SPLITS) {
        const s = ctx.statsFor(profile, dataset, split);
        if (s.nTasks === 0) continue;
        rows.push([
          profile, ctx.engineOf(profile), dataset, split, s.nTasks, s.nOk, s.nError, s.nUnavailable, s.nNa, s.nAttempted,
          csvNum(s.usable), s.usable.n, csvNum(s.success), csvNum(s.timeout), csvNum(s.blocked), csvNum(s.extractionFailure), s.extractionFailure.n,
          csvNum(s.passageRecall), s.passageRecall.n, csvNum(s.boilerplate), s.boilerplate.n, csvNum(s.tokenF1), s.tokenF1.n,
          csvNum(s.headings), s.headings.n, csvNum(s.tables), s.tables.n, csvNum(s.code), s.code.n, csvNum(s.correctError), s.correctError.n,
          csvNum(s.citation), s.citation.n, csvNum(s.chars, 1), csvNum(s.tokens, 1), s.chars.n, csvNum(s.latencyFirstP50, 1), s.latencyFirstP50.n,
          csvNum(s.latencyWarmP50, 1), csvNum(s.latencyWarmP95, 1), s.latencyWarmP50.n, csvNum(s.escalation), s.escalation.n,
          csvNum(s.attempts, 2), s.attempts.n, s.cost ?? "",
        ]);
      }
    }
  }
  return toCsv(head, rows);
}

interface CaseInfo {
  id: string;
  dataset: Dataset | "";
  category: string;
  heldOut: boolean;
  description: string;
  url: string;
  expectError: boolean;
  kind: "fetch" | "crawl";
}

function caseInfo(data: RunData, id: string): CaseInfo {
  const c = data.cases.get(id);
  const r = data.records.find((x) => x.caseId === id);
  const cr = data.crawl.find((x) => x.caseId === id);
  return {
    id,
    dataset: c?.dataset ?? r?.dataset ?? cr?.dataset ?? "",
    category: c?.kind === "fetch" ? c.category : (r?.category ?? (c?.kind === "crawl" || cr ? "crawl" : "")),
    heldOut: c?.kind === "fetch" ? c.heldOut === true : (r?.heldOut ?? false),
    description: c?.description ?? "",
    url: c?.url ?? "",
    expectError: c?.kind === "fetch" && c.expectError === true,
    kind: c?.kind ?? (r ? "fetch" : "crawl"),
  };
}

function errorKinds(records: readonly RunRecord[]): string {
  const counts = new Map<string, number>();
  for (const r of records) if (r.outcome === "error") counts.set(r.error?.kind ?? "unknown", (counts.get(r.error?.kind ?? "unknown") ?? 0) + 1);
  return [...counts].map(([k, n]) => `${k}×${n}`).join("; ");
}

function naReasons(records: readonly RunRecord[] | readonly CrawlRecord[]): string {
  const counts = new Map<string, number>();
  for (const r of records) {
    if (r.outcome !== "na" && r.outcome !== "unavailable") continue;
    const key = `${r.outcome}: ${r.naReason ?? "no reason recorded"}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts].map(([k, n]) => `${k} (×${n})`).join("; ");
}

function fetchCaseIds(data: RunData): string[] {
  return data.caseOrder.filter((id) => data.records.some((r) => r.caseId === id));
}

function casesCsv(ctx: Ctx): string {
  const { data } = ctx;
  const head = [
    "case_id", "dataset", "category", "held_out", "profile", "n", "ok", "usable_rate", "passage_recall", "tables", "code", "headings",
    "latency_p50", "chars_mean", "error_kinds", "na_reason",
  ];
  const rows: (string | number | boolean)[][] = [];
  for (const id of fetchCaseIds(data)) {
    const info = caseInfo(data, id);
    for (const profile of data.profiles) {
      const recs = data.records.filter((r) => r.caseId === id && r.profile === profile);
      if (recs.length === 0) continue;
      const s = computeStats(recs, data.cases);
      rows.push([
        id, info.dataset, info.category, info.heldOut, profile, s.nTasks, s.nOk, csvNum(s.usable), csvNum(s.passageRecall), csvNum(s.tables),
        csvNum(s.code), csvNum(s.headings), csvNum(s.latencyAllP50, 1), csvNum(s.chars, 1), errorKinds(recs), naReasons(recs),
      ]);
    }
  }
  return toCsv(head, rows);
}

function crawlCsv(data: RunData): string {
  const head = [
    "profile", "case", "dataset", "repetition", "outcome", "coverage", "pages_returned", "forbidden_returned", "duplicate_rate", "latency",
    "stop_reason", "missing_pages", "error", "na_reason",
  ];
  const rows = data.crawl.map((r) => [
    r.profile, r.caseId, r.dataset, r.repetition, r.outcome, csvNum(r.coverage), r.pagesReturned, r.forbiddenReturned, csvNum(r.duplicateRate),
    csvNum(r.latencyMs, 1), r.stopReason ?? "", r.missingPages.join(" "), r.error ? `${r.error.kind}: ${r.error.message}` : "", r.naReason ?? "",
  ]);
  return toCsv(head, rows);
}

function resultsTable(ctx: Ctx, statsOf: (profile: string) => Stats, profiles: readonly string[]): Block {
  return table(
    ["profile", "tasks", "ok / error / unavail. / N/A", "success", "usable", "passage recall", "boilerplate excl.", "token F1", "first p50", "warm p50", "warm p95", "correct error", "cost"],
    profiles.map((pr) => {
      const s = statsOf(pr);
      return [
        pr, String(s.nTasks), `${s.nOk} / ${s.nError} / ${s.nUnavailable} / ${s.nNa}`, fRate(s.success), fRate(s.usable), fScore(s.passageRecall),
        fScore(s.boilerplate), fScore(s.tokenF1), fMs(s.latencyFirstP50), fMs(s.latencyWarmP50), fMs(s.latencyWarmP95), fRate(s.correctError),
        s.cost ?? NA,
      ];
    }),
  );
}

/** Cases of `dataset` that every profile with at least one attempted (ok/error) task in that dataset attempted. */
function commonCases(data: RunData, dataset: Dataset): { profiles: string[]; cases: string[]; total: number } {
  const recs = data.records.filter((r) => r.dataset === dataset);
  const attempted = recs.filter((r) => r.outcome === "ok" || r.outcome === "error");
  const profiles = data.profiles.filter((pr) => attempted.some((r) => r.profile === pr));
  const all = uniq(recs.map((r) => r.caseId));
  const cases = all.filter((id) => profiles.every((pr) => attempted.some((r) => r.profile === pr && r.caseId === id)));
  return { profiles, cases, total: all.length };
}

interface ChartSet {
  usable: Block[];
  recall: Block[];
  latency: Block[];
}

function chartBlocks(ctx: Ctx): ChartSet {
  const usable: Block[] = [];
  const recall: Block[] = [];
  const latency: Block[] = [];
  for (const d of ctx.datasetsPresent) {
    const profiles = profilesWithRecords(ctx, d);
    const bars = (get: (s: Stats) => Agg, text: (a: Agg) => string) =>
      profiles.map((pr): Bar => {
        const s = ctx.statsFor(pr, d, "all");
        const a = get(s);
        const reason = s.nUnavailable === s.nTasks ? "unavailable" : s.nNa === s.nTasks ? "N/A for this dataset" : "no samples";
        return { label: pr, value: a.value, text: a.value === null ? `n/a — ${reason}` : text(a) };
      });
    usable.push({ kind: "html", html: svgBarChart(`Usable rate — ${d}`, bars((s) => s.usable, fRate), { max: 1 }) });
    recall.push({ kind: "html", html: svgBarChart(`Passage recall (mean over ok tasks) — ${d}`, bars((s) => s.passageRecall, fScore), { max: 1 }) });
    latency.push({ kind: "html", html: svgBarChart(`Warm p50 latency (nearest rank) — ${d}`, bars((s) => s.latencyWarmP50, fMs)) });
  }
  return { usable, recall, latency };
}

function leaderSentence(
  label: string,
  rows: readonly { profile: string; a: Agg }[],
  opts: { higherBetter: boolean; fmt: (a: Agg) => string; relative?: boolean },
): string | null {
  const c = rows.filter((r) => r.a.value !== null).sort((x, y) => ((x.a.value ?? 0) - (y.a.value ?? 0)) * (opts.higherBetter ? -1 : 1));
  const best = c[0];
  if (!best || best.a.value === null) return null;
  const second = c[1];
  if (!second || second.a.value === null) return `${label}: only ${best.profile} has data (${opts.fmt(best.a)}).`;
  const minN = Math.min(...c.map((r) => r.a.n));
  const small = minN < 10 ? ` — small sample (n=${minN})` : "";
  const tied = c.filter((r) => r.a.value === best.a.value);
  if (tied.length > 1) return `${label}: tie between ${tied.map((r) => `${r.profile} ${opts.fmt(r.a)}`).join(", ")}${small}.`;
  const margin = Math.abs(best.a.value - second.a.value);
  const close = opts.relative ? margin <= 0.1 * Math.abs(second.a.value) : margin < 0.05;
  const qualifiers: string[] = [];
  if (close) qualifiers.push(opts.relative ? "within 10% of the runner-up, not a meaningful difference" : "margin below 0.05 (5 points), not a meaningful difference");
  if (minN < 10) qualifiers.push(`small sample (n=${minN})`);
  return `${label}: ${best.profile} ${opts.fmt(best.a)} vs next-best ${second.profile} ${opts.fmt(second.a)}${qualifiers.length ? ` — ${qualifiers.join("; ")}` : ""}.`;
}

function tradeoffBlocks(ctx: Ctx): Block[] {
  const blocks: Block[] = [];
  for (const d of ctx.datasetsPresent) {
    const profiles = profilesWithRecords(ctx, d);
    const rows = (get: (s: Stats) => Agg) => profiles.map((pr) => ({ profile: pr, a: get(ctx.statsFor(pr, d, "all")) }));
    const items = [
      leaderSentence("Usable rate", rows((s) => s.usable), { higherBetter: true, fmt: fRate }),
      leaderSentence("Passage recall", rows((s) => s.passageRecall), { higherBetter: true, fmt: fScore }),
      leaderSentence("Boilerplate exclusion", rows((s) => s.boilerplate), { higherBetter: true, fmt: fScore }),
      leaderSentence("Token F1", rows((s) => s.tokenF1), { higherBetter: true, fmt: fScore }),
      leaderSentence("Warm p50 latency", rows((s) => s.latencyWarmP50), { higherBetter: false, fmt: fMs, relative: true }),
      leaderSentence("First-request p50 latency", rows((s) => s.latencyFirstP50), { higherBetter: false, fmt: fMs, relative: true }),
    ].filter((x): x is string => x !== null);
    blocks.push(h(3, `Trade-offs on ${d} tasks (derived from this run only)`));
    blocks.push(items.length ? list(items) : p("No profile produced comparable aggregates on this dataset."));

    const categories = uniq(ctx.data.records.filter((r) => r.dataset === d).map((r) => r.category)).sort();
    const catRows: Cell[][] = [];
    for (const cat of categories) {
      const per = profiles.map((pr) => {
        const recs = ctx.data.records.filter((r) => r.profile === pr && r.dataset === d && r.category === cat);
        return { profile: pr, recs, s: computeStats(recs, ctx.data.cases) };
      });
      const lead = [
        leaderSentence("usable", per.map((x) => ({ profile: x.profile, a: x.s.usable })), { higherBetter: true, fmt: fRate }),
        leaderSentence("warm p50", per.map((x) => ({ profile: x.profile, a: x.s.latencyWarmP50 })), { higherBetter: false, fmt: fMs, relative: true }),
      ].filter((x): x is string => x !== null).join(" ");
      catRows.push([
        cat,
        ...per.map(({ recs, s }) => {
          if (s.nTasks === 0) return "no tasks";
          if (s.nAttempted === 0) return naReasons(recs);
          return `${fRate(s.usable)}; warm p50 ${s.latencyWarmP50.value === null ? NA : `${Math.round(s.latencyWarmP50.value)} ms`} (n=${s.latencyWarmP50.n})`;
        }),
        lead || "no comparable data",
      ]);
    }
    blocks.push(p(`Per workload (category) on ${d}: usable rate and warm p50 per profile. Leaders are named only with the margin and sample size; small n means the ranking can flip on a re-run.`));
    blocks.push(table(["category", ...profiles, "leaders (usable rate; warm p50)"], catRows));
  }
  return blocks;
}

function unsupportedBlocks(ctx: Ctx): Block[] {
  const { data } = ctx;
  const blocks: Block[] = [];
  const engineItems = (data.meta.engines ?? [])
    .filter((e) => !e.availability.available)
    .map((e) => `${e.profile} (${e.engine}): unavailable — ${e.availability.reason ?? "no reason recorded"}`);
  blocks.push(h(3, "Unavailable engines"));
  blocks.push(list(engineItems));

  const group = <R extends { profile: string; dataset: string; outcome: string; naReason?: string; caseId: string }>(recs: readonly R[], what: string): string[] => {
    const groups = new Map<string, string[]>();
    for (const r of recs) {
      if (r.outcome !== "na" && r.outcome !== "unavailable") continue;
      const key = `${r.profile}\u0000${r.dataset}\u0000${r.outcome}\u0000${r.naReason ?? "no reason recorded"}`;
      const g = groups.get(key) ?? [];
      g.push(r.caseId);
      groups.set(key, g);
    }
    return [...groups].map(([key, ids]) => {
      const [profile, dataset, outcome, reason] = key.split("\u0000");
      return `${profile} — ${dataset} ${what}: ${outcome === "na" ? "N/A" : "unavailable"} for ${ids.length} task(s) (${reason}); cases: ${listSome(uniq(ids))}`;
    });
  };
  blocks.push(h(3, "Tasks not run (unavailable / N/A)"));
  blocks.push(list([...group(data.records, "fetch"), ...group(data.crawl, "crawl")]));

  const metrics: [string, string][] = [
    ["passageRecall", "passage recall"], ["boilerplateExclusion", "boilerplate exclusion"], ["tokenF1", "token F1"], ["headings", "headings"],
    ["tables", "tables"], ["code", "code"], ["citation", "citation"],
  ];
  const metricItems: string[] = [];
  for (const d of ctx.datasetsPresent) {
    for (const [key, label] of metrics) {
      const scored = profilesWithRecords(ctx, d).filter((pr) => data.records.some((r) => r.profile === pr && r.dataset === d && score(r, key) !== null));
      if (scored.length === 0) continue;
      for (const pr of profilesWithRecords(ctx, d)) {
        const s = ctx.statsFor(pr, d, "all");
        if (!scored.includes(pr) && s.nOk > 0) metricItems.push(`${pr} — ${d}: ${label} not scored (metric not applicable to this engine or no ok task carried it); shown as n/a, not 0.`);
      }
    }
  }
  blocks.push(h(3, "Metrics not applicable"));
  blocks.push(list(metricItems));
  return blocks;
}

function resourcesBlocks(data: RunData): { blocks: Block[]; chart: Block | null } {
  const blocks: Block[] = [
    p(
      "Scope matters: a local process tree, a whole Docker stack and a remote service are different things. Numbers are only comparable between profiles with the same scope; remote services cannot be measured and are never compared.",
    ),
  ];
  const rows = data.resources.map((r) => {
    const remote = r.scope === "remote";
    return [
      r.profile, r.engine, SCOPE_LABEL[r.scope], remote ? "not measurable" : r.cpuSeconds === null ? NA : `${r.cpuSeconds.toFixed(2)} s`,
      remote ? "not measurable" : fMb(r.peakRssMb), remote ? "not measurable" : fMb(r.idleRssMb), String(r.samples), r.note ?? "",
    ];
  });
  blocks.push(table(["profile", "engine", "scope", "CPU (run)", "peak RSS", "idle RSS", "samples", "note"], rows));
  const measured = data.resources.filter((r) => r.scope !== "remote" && r.peakRssMb !== null);
  const scopes = uniq(measured.map((r) => r.scope));
  if (scopes.length > 1) blocks.push(p(`Measured scopes differ (${scopes.join(", ")}): peak RSS bars below are labelled with their scope and are not like-for-like.`));
  const chart: Block | null = measured.length
    ? {
        kind: "html",
        html: svgBarChart(
          "Peak RSS where measured (MB)",
          measured.map((r) => ({ label: `${r.profile} (${r.scope})`, value: r.peakRssMb, text: `${fMb(r.peakRssMb)} (${r.samples} samples)` })),
        ),
      }
    : null;
  return { blocks, chart };
}

function crawlBlocks(data: RunData): Block[] {
  if (data.crawl.length === 0) return [p("No crawl tasks in this run.")];
  const rows: Cell[][] = [];
  for (const id of uniq(data.crawl.map((r) => r.caseId))) {
    for (const profile of data.profiles) {
      const recs = data.crawl.filter((r) => r.caseId === id && r.profile === profile);
      if (recs.length === 0) continue;
      const ran = recs.filter((r) => r.outcome === "ok" || r.outcome === "error");
      const ok = recs.filter((r) => r.outcome === "ok");
      if (ran.length === 0) {
        rows.push([id, profile, String(recs.length), naReasons(recs), NA, NA, NA, NA, NA, NA, ""]);
        continue;
      }
      const missing = uniq(ran.flatMap((r) => r.missingPages));
      rows.push([
        id, profile, String(recs.length), `ok ${ok.length} / error ${ran.length - ok.length}`, fScore(mean(nums(ran.map((r) => r.coverage)))),
        fScore(mean(ran.map((r) => r.pagesReturned))), String(ran.reduce((a, r) => a + r.forbiddenReturned, 0)), fScore(mean(nums(ran.map((r) => r.duplicateRate)))),
        fMs(percentile(nums(ok.map((r) => r.latencyMs)), 50)), uniq(ran.map((r) => r.stopReason ?? (r.error ? `error: ${r.error.kind}` : "none"))).join("; "),
        listSome(missing, 5),
      ]);
    }
  }
  return [
    p("Coverage = expected pages found / expected pages (mean over tasks that ran). Forbidden = robots-disallowed or out-of-scope pages returned (summed). Duplicate rate = duplicate pages / pages returned. Latency p50 over ok tasks (nearest rank)."),
    table(["case", "profile", "tasks", "outcomes", "coverage", "pages returned (mean)", "forbidden returned", "duplicate rate", "latency p50", "stop reason(s)", "missing pages"], rows),
  ];
}

function buildBlocks(ctx: Ctx): Block[] {
  const { data } = ctx;
  const m = data.meta;
  const charts = chartBlocks(ctx);
  const blocks: Block[] = [];
  blocks.push(h(1, `Fetchkeep benchmark report — ${m.suite} — ${m.runId}`));

  blocks.push(h(2, "Summary of what was run"));
  blocks.push(
    list([
      `Suite: ${m.suite}; run id: ${m.runId}`,
      `Started ${m.startedAt}, finished ${m.finishedAt}`,
      `Seed: ${m.seed}; repetitions per case: ${m.repetitions}; per-task timeout: ${m.timeoutMs} ms; concurrency: ${m.concurrency}`,
      `Tokenizer: ${m.tokenizer.name} (${m.tokenizer.encoding}, version ${m.tokenizer.version})`,
      `Fetch tasks: ${data.records.length} over ${fetchCaseIds(data).length} cases; crawl tasks: ${data.crawl.length}`,
      `Profiles: ${data.profiles.join(", ") || "none"}`,
      `Fixture server: ${m.fixtureServer.origin} (bound to ${m.fixtureServer.bind})`,
      `Command: \`${m.command}\``,
      ...(m.notes ?? []).map((n) => `Note: ${n}`),
    ]),
  );

  blocks.push(h(2, "Environment"));
  blocks.push(table(["key", "value"], Object.entries(m.environment ?? {}).map(([k, v]) => [k, fValue(v)])));

  blocks.push(h(2, "Engines"));
  blocks.push(
    table(
      ["profile", "engine", "version", "revision", "transport", "available", "reason", "ready"],
      (m.engines ?? []).map((e) => [
        e.profile, e.engine, e.version, e.revision ?? NA, e.transport, e.availability.available ? "yes" : "no", e.availability.reason ?? "",
        e.readyMs === undefined ? NA : `${Math.round(e.readyMs)} ms`,
      ]),
    ),
  );
  blocks.push(h(3, "Setting differences"));
  blocks.push(list((m.engines ?? []).flatMap((e) => (e.settingDifferences.length ? e.settingDifferences.map((s) => `${e.profile}: ${s}`) : [`${e.profile}: none recorded`]))));
  blocks.push(h(3, "Configuration"));
  blocks.push(table(["profile", "config"], (m.engines ?? []).map((e) => [e.profile, JSON.stringify(e.config)])));

  blocks.push(h(2, "Results"));
  blocks.push(
    p(
      "Rates are over attempted tasks (ok + error); unavailable and N/A tasks are counted in their own columns and never enter a rate. Usable rate excludes cases whose correct outcome is an error (see `correct error`). Quality scores are means over ok tasks where the metric applies. Every aggregate shows its sample count; `n/a (n=0)` means no sample, not zero.",
    ),
  );
  blocks.push(...charts.usable);
  for (const d of DATASETS) {
    blocks.push(h(3, d === "fixture" ? "Fixtures (synthetic, served locally)" : "Live websites"));
    const profiles = profilesWithRecords(ctx, d);
    if (profiles.length === 0) {
      blocks.push(p(`No ${d} tasks in this run.`));
      continue;
    }
    const common = commonCases(data, d);
    blocks.push(
      p(
        `Common tasks: ${common.cases.length} of ${common.total} ${d} cases were attempted by every profile that ran any ${d} task (${common.profiles.join(", ") || "none"}). This is the like-for-like comparison.`,
      ),
    );
    const commonSet = new Set(common.cases);
    blocks.push(
      resultsTable(
        ctx,
        (pr) => computeStats(data.records.filter((r) => r.profile === pr && r.dataset === d && commonSet.has(r.caseId)), data.cases),
        common.profiles,
      ),
    );
    blocks.push(p(`All ${d} tasks per profile (includes cases only some profiles could run):`));
    blocks.push(resultsTable(ctx, (pr) => ctx.statsFor(pr, d, "all"), profiles));
  }
  blocks.push(h(3, "Held-out subset"));
  blocks.push(p("Held-out cases were excluded from development tuning. Compare with the dev subset: a large gap suggests overfitting to the dev cases."));
  for (const d of DATASETS) {
    const held = profilesWithRecords(ctx, d, "heldOut");
    if (held.length === 0) {
      if (d === "fixture") blocks.push(p("No held-out fixture tasks in this run."));
      continue;
    }
    blocks.push(p(`${d} — held-out:`));
    blocks.push(resultsTable(ctx, (pr) => ctx.statsFor(pr, d, "heldOut"), held));
    const dev = profilesWithRecords(ctx, d, "dev");
    blocks.push(p(`${d} — dev (not held out):`));
    blocks.push(resultsTable(ctx, (pr) => ctx.statsFor(pr, d, "dev"), dev));
  }

  blocks.push(h(2, "Quality detail"));
  blocks.push(...charts.recall);
  blocks.push(
    table(
      ["profile", "dataset", "passage recall", "extraction failure (recall < 0.5)", "boilerplate excl.", "token precision", "token recall", "token F1", "headings", "tables", "code", "chars (mean)", "tokens (mean)"],
      ctx.datasetsPresent.flatMap((d) =>
        profilesWithRecords(ctx, d).map((pr) => {
          const s = ctx.statsFor(pr, d, "all");
          return [
            pr, d, fScore(s.passageRecall), fRate(s.extractionFailure), fScore(s.boilerplate), fScore(s.tokenPrecision), fScore(s.tokenRecall), fScore(s.tokenF1),
            fScore(s.headings), fScore(s.tables), fScore(s.code),
            s.chars.value === null ? `${NA} (n=0)` : `${Math.round(s.chars.value)} (n=${s.chars.n})`,
            s.tokens.value === null ? `${NA} (n=0)` : `${Math.round(s.tokens.value)} (n=${s.tokens.n})`,
          ];
        }),
      ),
    ),
  );
  blocks.push(h(3, "Errors, escalation and retries"));
  blocks.push(
    table(
      ["profile", "dataset", "timeout", "blocked", "error kinds", "browser escalation", "attempts (mean)"],
      ctx.datasetsPresent.flatMap((d) =>
        profilesWithRecords(ctx, d).map((pr) => {
          const s = ctx.statsFor(pr, d, "all");
          return [
            pr, d, fRate(s.timeout), fRate(s.blocked), errorKinds(data.records.filter((r) => r.profile === pr && r.dataset === d)) || "none",
            fRate(s.escalation), s.attempts.value === null ? `${NA} (n=0)` : `${s.attempts.value.toFixed(2)} (n=${s.attempts.n})`,
          ];
        }),
      ),
    ),
  );

  blocks.push(h(2, "Latency"));
  blocks.push(p(PERCENTILE_METHOD));
  blocks.push(...charts.latency);
  blocks.push(
    table(
      ["profile", "dataset", "first p50", "first p95", "warm p50", "warm p95"],
      ctx.datasetsPresent.flatMap((d) =>
        profilesWithRecords(ctx, d).map((pr) => {
          const s = ctx.statsFor(pr, d, "all");
          return [pr, d, fMs(s.latencyFirstP50), fMs(s.latencyFirstP95), fMs(s.latencyWarmP50), fMs(s.latencyWarmP95)];
        }),
      ),
    ),
  );

  blocks.push(h(2, "Crawl"));
  blocks.push(...crawlBlocks(data));

  blocks.push(h(2, "Resources"));
  const res = resourcesBlocks(data);
  if (data.resources.length === 0) blocks.push(p("No resource measurements in this run."));
  else {
    blocks.push(...res.blocks);
    if (res.chart) blocks.push(res.chart);
  }

  blocks.push(h(2, "Cold start"));
  blocks.push(
    data.coldstart.length === 0
      ? p("No cold-start measurements in this run.")
      : table(
          ["profile", "engine", "method", "p50", "min", "max", "samples"],
          data.coldstart.map((c) => {
            const s = nums(c.samplesMs);
            return [
              c.profile, c.engine, c.method, fMs(percentile(s, 50)), s.length ? `${Math.round(Math.min(...s))} ms` : NA,
              s.length ? `${Math.round(Math.max(...s))} ms` : NA, s.map((v) => String(Math.round(v))).join(", ") || "none",
            ];
          }),
        ),
  );
  if (data.coldstart.length) blocks.push(p("Cold-start methods differ per engine (see the method column); compare only rows that measure the same thing."));

  blocks.push(h(2, "Footprint"));
  blocks.push(
    data.footprint.length === 0
      ? p("No footprint measurements in this run.")
      : table(["profile", "engine", "component", "size", "bytes", "method"], data.footprint.map((f) => [f.profile, f.engine, f.component, fBytes(f.bytes), String(f.bytes), f.method])),
  );
  if (data.footprint.length) blocks.push(p("Components are listed separately and not summed: they can overlap (e.g. an image and the layers it shares)."));

  blocks.push(h(2, "Fetchkeep-specific features"));
  blocks.push(p("Citation checks verify that a quoted passage can be re-read and cited from Fetchkeep's store. Other engines have no equivalent, so this is not part of the common-task comparison."));
  const citeRows: Cell[][] = [];
  for (const d of ctx.datasetsPresent) {
    for (const pr of profilesWithRecords(ctx, d)) {
      if (ctx.engineOf(pr) !== "fetchkeep") continue;
      citeRows.push([pr, d, fScore(ctx.statsFor(pr, d, "all").citation)]);
    }
  }
  blocks.push(citeRows.length ? table(["profile", "dataset", "citation verified"], citeRows) : p("No Fetchkeep profile ran fetch tasks in this run."));

  blocks.push(h(2, "Unsupported / N/A / unavailable"));
  blocks.push(...unsupportedBlocks(ctx));

  blocks.push(h(2, "How to read this"));
  blocks.push(
    list([
      "Fixtures are synthetic pages served locally: they isolate specific extraction problems (tables, code, boilerplate, JS rendering) with gold answers, but they are not a sample of the web. Live results reflect real sites at run time and can change between runs.",
      "Short output is not good extraction: fewer characters or tokens can mean missing content. Read chars/tokens together with passage recall, boilerplate exclusion and token F1.",
      "There is no overall winner. The trade-offs below are derived from this run's numbers only, with margins and sample sizes; engines differ in transport (local MCP stdio, REST, hosted service), so latency includes very different overheads.",
      "Hosted services cannot run local fixtures; those tasks are N/A and excluded from rates rather than counted as failures.",
      PERCENTILE_METHOD,
    ]),
  );
  blocks.push(...tradeoffBlocks(ctx));

  blocks.push(h(2, "Reproduce"));
  blocks.push(p("Re-run with:"));
  blocks.push({ kind: "code", text: m.rerun });
  blocks.push(table(["dataset", "path", "sha256", "cases"], (m.datasets ?? []).map((d) => [d.name, d.path, d.sha256, String(d.cases)])));
  blocks.push(p("Per-case outputs: see `cases.csv` and the per-case inspection section of `report.html`; raw engine output is under `raw/`."));
  return blocks;
}

// ---------------------------------------------------------------- HTML per-case inspection

async function rawPreview(dir: string, r: RunRecord | CrawlRecord): Promise<string> {
  if (!r.rawPath) return "(no raw output recorded)";
  const text = await readOptional(resolve(dir, r.rawPath));
  if (text === null) return `(raw file not found: ${r.rawPath})`;
  const chars = Array.from(text);
  return chars.length > RAW_PREVIEW_CHARS
    ? `${chars.slice(0, RAW_PREVIEW_CHARS).join("")}\n\n… (truncated: showing first ${RAW_PREVIEW_CHARS} of ${chars.length} characters)`
    : text;
}

async function caseInspectionHtml(ctx: Ctx): Promise<string> {
  const { data } = ctx;
  const ids = uniq([...fetchCaseIds(data), ...data.crawl.map((r) => r.caseId)]);
  const infos = ids.map((id) => caseInfo(data, id));
  const datasets = uniq(infos.map((i) => i.dataset)).filter(Boolean).sort();
  const categories = uniq(infos.map((i) => i.category)).filter(Boolean).sort();
  const opt = (v: string) => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`;
  const parts: string[] = [
    `<h2>Case inspector</h2>`,
    `<p>Fetch scores aggregate repetitions: quality means and nearest-rank latency over ok tasks. Fetch previews show repetition 1; crawl previews show each repetition. Each embedded preview includes up to ${RAW_PREVIEW_CHARS} characters; full raw files are not embedded.</p>`,
    `<form id="case-filters" class="filters interactive" role="search" aria-label="Filter benchmark cases">`,
    `<label class="search-field">Search cases <input id="f-search" type="search" placeholder="Case, URL, profile, error or preview" autocomplete="off"></label>`,
    `<label>Dataset <select id="f-dataset"><option value="">All datasets</option>${datasets.map(opt).join("")}</select></label>`,
    `<label>Category <select id="f-category"><option value="">All categories</option>${categories.map(opt).join("")}</select></label>`,
    `<label>Split <select id="f-split"><option value="">All splits</option><option value="heldout">Held-out</option><option value="dev">Dev</option><option value="none">Not split (crawl)</option></select></label>`,
    `<button type="reset">Reset filters</button></form>`,
    `<p id="f-count" class="muted" role="status" aria-live="polite">${infos.length} cases</p>`,
    `<p id="f-empty" class="empty-state" hidden>No cases match these filters. Clear the search or reset filters to see every case.</p>`,
  ];
  for (const info of infos) {
    const profiles = data.profiles.filter((pr) => data.records.some((r) => r.caseId === info.id && r.profile === pr));
    const rows: string[] = [];
    const details: string[] = [];
    for (const pr of profiles) {
      const recs = data.records.filter((r) => r.caseId === info.id && r.profile === pr).sort((a, b) => a.repetition - b.repetition);
      const s = computeStats(recs, data.cases);
      const outcomes = (["ok", "error", "unavailable", "na"] as const)
        .map((o) => [o, recs.filter((r) => r.outcome === o).length] as const)
        .filter(([, n]) => n > 0)
        .map(([o, n]) => `${o === "na" ? "N/A" : o} ${n}`)
        .join(", ");
      const notes = [errorKinds(recs), naReasons(recs)].filter(Boolean).join("; ");
      const cells = [
        pr, outcomes, fRate(s.usable), fScore(s.passageRecall), fScore(s.boilerplate), fScore(s.tokenF1), fScore(s.headings), fScore(s.tables),
        fScore(s.code), fRate(s.correctError), fMs(s.latencyAllP50), s.chars.value === null ? NA : String(Math.round(s.chars.value)), notes,
      ];
      rows.push(`<tr>${cells.map((c) => `<td>${escapeHtml(c)}</td>`).join("")}</tr>`);
      const first = recs.find((r) => r.repetition === 1) ?? recs[0];
      if (!first) continue;
      const errs = recs.filter((r) => r.error).map((r) => `r${r.repetition}: ${r.error?.kind}: ${r.error?.message}`);
      let body: string;
      if (first.outcome === "unavailable" || first.outcome === "na") body = `${first.outcome === "na" ? "N/A" : "unavailable"}: ${first.naReason ?? "no reason recorded"}`;
      else body = await rawPreview(data.dir, first);
      details.push(
        `<details><summary>${escapeHtml(pr)} — raw Markdown (repetition ${first.repetition}, ${escapeHtml(first.outcome)})</summary>` +
          (errs.length ? `<p class="err">${errs.map(escapeHtml).join("<br>")}</p>` : "") +
          `<pre>${escapeHtml(body)}</pre></details>`,
      );
    }
    const crawl = data.crawl.filter((r) => r.caseId === info.id);
    for (const r of crawl) {
      const preview = await rawPreview(data.dir, r);
      details.push(
        `<details><summary>${escapeHtml(r.profile)} — crawl output (repetition ${r.repetition}, ${escapeHtml(r.outcome)})</summary>` +
          (r.error ? `<p class="err">${escapeHtml(`${r.error.kind}: ${r.error.message}`)}</p>` : "") +
          (r.naReason ? `<p>${escapeHtml(r.naReason)}</p>` : "") +
          `<p>Missing pages: ${escapeHtml(r.missingPages.join(", ") || "none")}</p>` +
          `<p>Unexpected pages: ${escapeHtml(r.unexpectedPages.join(", ") || "none")}</p>` +
          `<pre>${escapeHtml(preview)}</pre></details>`,
      );
    }
    const split = info.kind === "crawl" ? "none" : info.heldOut ? "heldout" : "dev";
    const meta = [
      info.dataset, info.category, split === "none" ? "not split" : info.heldOut ? "held-out" : "dev", info.expectError ? "expects an error" : "",
    ].filter(Boolean).join(" / ");
    parts.push(
      `<section class="case" data-dataset="${escapeHtml(info.dataset)}" data-category="${escapeHtml(info.category)}" data-split="${split}">` +
        `<h3>${escapeHtml(info.id)}</h3><p class="muted">${escapeHtml(meta)}${info.url ? ` / <span class="url">${escapeHtml(info.url)}</span>` : ""}</p>` +
        (info.description ? `<p>${escapeHtml(info.description)}</p>` : "") +
        (rows.length ? `<div class="tw" tabindex="0" role="region" aria-label="Case scores"><table><thead><tr>${["profile", "outcomes", "usable", "passage recall", "boilerplate", "token F1", "headings", "tables", "code", "correct error", "latency p50", "chars", "errors / reasons"]
          .map((c) => `<th scope="col">${escapeHtml(c)}</th>`)
          .join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>` : "") +
        (crawl.length ? renderHtmlBlocks(crawlBlocks({ ...data, crawl })) : "") +
        `${details.join("")}</section>`,
    );
  }
  return parts.join("\n");
}

/** A compact HTML-only view; the full tables and all exported aggregates stay unchanged. */
function comparisonHtml(ctx: Ctx): string {
  if (!ctx.data.records.length) return `<p>No fetch tasks were recorded. <a href="#crawl">Read the crawl results</a> and inspect individual crawl outputs below.</p>`;
  const parts = [
    `<form id="comparison-filters" class="interactive" aria-label="Compare fetch results">`,
    `<div class="filters"><label>Dataset <select id="c-dataset">${ctx.datasetsPresent.map((d) => `<option value="${d}">${d === "fixture" ? "Local fixtures" : "Live websites"}</option>`).join("")}</select></label>`,
    `<label>Split <select id="c-split"><option value="all">All splits</option><option value="heldOut">Held-out</option><option value="dev">Dev</option></select></label>`,
    `<label>Coverage <select id="c-scope"><option value="all">All tasks (coverage varies)</option><option value="common">Common cases (like-for-like)</option></select></label>`,
    `<label>Order profiles <select id="c-sort"><option value="recorded">As recorded</option><option value="usable">Usable: high to low</option><option value="recall">Recall: high to low</option><option value="latency">Warm p50: low to high</option></select></label>`,
    `<button type="reset">Reset comparison</button></div>`,
    `<details class="profile-selection"><summary>Choose profiles</summary><fieldset class="profile-filters"><legend>Show profiles</legend>${ctx.data.profiles.filter((pr) => ctx.data.records.some((r) => r.profile === pr)).map((pr) =>
      `<label><input type="checkbox" name="profile" value="${escapeHtml(pr)}" checked> ${escapeHtml(pr)}</label>`).join("")}</fieldset></details></form>`,
    `<p id="c-count" class="muted interactive" role="status" aria-live="polite"></p>`,
    `<p id="c-empty" class="empty-state" hidden>No profiles match this selection. Choose another dataset or split, or reset the comparison.</p>`,
  ];
  for (const dataset of ctx.datasetsPresent) {
    const common = commonCases(ctx.data, dataset);
    const commonIds = new Set(common.cases);
    for (const split of SPLITS) {
      for (const scope of ["all", "common"] as const) {
        const records = ctx.data.records.filter((r) =>
          r.dataset === dataset && (split === "all" || (split === "heldOut") === (r.heldOut === true)) &&
          (scope === "all" || commonIds.has(r.caseId)));
        const profiles = (scope === "common" ? common.profiles : ctx.data.profiles)
          .filter((pr) => records.some((r) => r.profile === pr));
        const rows = profiles.map((profile, index) => {
          const recs = records.filter((r) => r.profile === profile);
          const stats = computeStats(recs, ctx.data.cases);
          const note = naReasons(recs);
          return `<tr data-profile="${escapeHtml(profile)}" data-recorded="${index}" data-usable="${stats.usable.value ?? ""}" data-recall="${stats.passageRecall.value ?? ""}" data-latency="${stats.latencyWarmP50.value ?? ""}">` +
            `<th scope="row">${escapeHtml(profile)}${note ? `<span class="row-note">${escapeHtml(note)}</span>` : ""}</th>` +
            `<td>${stats.nTasks}<span class="row-note">${stats.nOk} ok / ${stats.nError} error<br>${stats.nUnavailable} unavailable / ${stats.nNa} N/A</span></td>` +
            `<td>${fRate(stats.usable)}</td><td>${fScore(stats.passageRecall)}</td><td>${fMs(stats.latencyWarmP50)}</td></tr>`;
        });
        const initial = dataset === ctx.datasetsPresent[0] && split === "all" && scope === "all";
        const cohort = uniq(records.map((r) => r.caseId)).length;
        const label = `${dataset === "fixture" ? "Local fixtures" : "Live websites"} / ${split === "all" ? "all splits" : split === "heldOut" ? "held-out" : "dev"} / ${scope === "all" ? "all tasks" : "common cases"}`;
        parts.push(
          `<div class="comparison-pane" data-dataset="${dataset}" data-split="${split}" data-scope="${scope}"${initial ? "" : " hidden"}>` +
          `<div class="tw" tabindex="0" role="region" aria-label="Fetch comparison"><table class="comparison-table"><caption>${escapeHtml(label)} / ${cohort} cases</caption><thead><tr><th scope="col">Profile</th><th scope="col">Tasks &amp; outcomes</th><th scope="col">Usable rate</th><th scope="col">Passage recall</th><th scope="col">Warm p50</th></tr></thead><tbody>${rows.join("")}</tbody></table></div>` +
          `<p class="cohort-note">${scope === "common"
            ? `Common cases were attempted by every profile that attempted this dataset (${escapeHtml(common.profiles.join(", ") || "none")}); the split then narrows that fixed cohort.`
            : "Each profile includes every recorded task in this selection. Coverage can differ; use common cases for a like-for-like comparison."}</p></div>`,
        );
      }
    }
  }
  parts.push(`<p class="cohort-note">Controls change only this comparison. Missing values sort last, never as zero. Hiding a profile does not change the common-case cohort or any denominator. Rates use attempted tasks (ok + error), excluding unavailable and N/A; usable rate also excludes expected-error cases. Quality and latency use applicable ok samples. <code>n/a (n=0)</code> means no sample.</p>`);
  return parts.join("\n");
}

const CSS = `
:root{color-scheme:light;--ink:#17283d;--muted:#50647a;--blue:#1958a6;--teal:#146c65;--pale:#f1f6fc;--line:#d8e2ee;--paper:#fff;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:var(--ink);background:var(--paper)}
*{box-sizing:border-box}body{margin:0;font-size:16px;line-height:1.6}::selection{background:#d6e8ff;color:var(--ink)}a{color:var(--blue);text-underline-offset:3px}a:hover{text-decoration-thickness:2px}button,input,select{font:inherit}input{accent-color:var(--blue);caret-color:var(--blue)}:focus-visible{outline:3px solid var(--blue);outline-offset:4px}[hidden]{display:none!important}.interactive{display:none}.js .interactive{display:block}
.skip-link{position:fixed;top:8px;left:16px;z-index:10;padding:10px 16px;background:white;transform:translateY(-180%)}.skip-link:focus{transform:none}.report-layout{display:grid;grid-template-columns:232px minmax(0,1fr);max-width:1800px;margin:auto}.sidebar{position:sticky;top:0;height:100vh;overflow-y:auto;padding:32px 18px;background:var(--pale);border-right:1px solid var(--line)}.sidebar-title{font-size:18px;font-weight:700;margin:0 12px 4px}.sidebar-description{font-size:13px;color:var(--muted);margin:0 12px 24px}.sidebar ul{list-style:none;margin:0;padding:0}.sidebar a{display:block;padding:7px 12px;border-radius:5px;text-decoration:none;font-size:14px;line-height:1.4;color:var(--muted)}.sidebar a:hover,.sidebar a[aria-current="location"]{background:#e0ebf9;color:var(--blue)}.sidebar a[aria-current="location"]{font-weight:650}
main{min-width:0;padding:44px 48px 80px}header{padding-bottom:24px;border-bottom:1px solid var(--line);margin-bottom:32px}h1{font-size:32px;line-height:1.2;letter-spacing:-.025em;margin:0 0 14px;font-weight:700}h2{font-size:24px;line-height:1.3;letter-spacing:-.015em;margin:0 0 18px}h3{font-size:18px;line-height:1.4;margin:28px 0 12px}p{margin:12px 0;max-width:78ch}li{max-width:90ch}li+li{margin-top:6px}h1,h2,h3,td,th,.run-identity{overflow-wrap:anywhere}.report-section{margin-top:48px;padding-top:28px;border-top:1px solid var(--line);scroll-margin-top:24px}#overview{border:0;padding:0;margin-top:0}.run-identity{margin:0;color:var(--muted);font-size:15px}.run-identity strong{color:var(--ink)}.run-volume{font-size:15px;margin-top:10px}.method-note{background:var(--pale);padding:14px 18px;border-radius:6px;margin:18px 0 24px;max-width:90ch}.method-note p{margin:0}.method-note p+p{margin-top:8px}.exports{display:flex;gap:10px;flex-wrap:wrap;margin:20px 0 0}.exports a,button{display:inline-flex;align-items:center;justify-content:center;min-height:42px;padding:8px 13px;border:1px solid #aec3de;border-radius:5px;background:white;color:var(--blue);font-weight:600;font-size:14px;text-decoration:none;cursor:pointer}.exports a:hover,button:hover{background:#eaf2fd;border-color:var(--blue)}button:active,.exports a:active{background:#dceaff}
.tw,.chart-wrap{overflow:auto;max-width:100%;scrollbar-color:#9aafc8 var(--pale);margin:16px 0 24px}.tw{border:1px solid var(--line);border-radius:6px}table{border-collapse:separate;border-spacing:0;width:100%;font-size:14px;line-height:1.5;font-variant-numeric:tabular-nums}th,td{padding:12px 14px;text-align:left;vertical-align:top;border-bottom:1px solid var(--line);min-width:100px;max-width:520px}thead th{background:var(--pale);font-size:13px;font-weight:650;white-space:normal;color:var(--muted)}tbody th{font-weight:600;min-width:165px}tbody tr:last-child>*{border-bottom:0}tbody tr:nth-child(even){background:#f9fbfe}tbody tr:hover{background:#edf4fc}.comparison-table{min-width:760px}.comparison-table td{white-space:nowrap}.comparison-table th:first-child{width:25%}.comparison-table td:nth-child(3){color:var(--teal);font-weight:600}.row-note{display:block;margin-top:4px;max-width:36ch;font-size:12px;font-weight:400;line-height:1.5;color:var(--muted);white-space:normal}.cohort-note{font-size:14px;color:var(--muted)}
code{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:.875em;background:#eaf0f7;padding:2px 4px;border-radius:3px;overflow-wrap:anywhere}pre{background:var(--pale);border:1px solid var(--line);border-radius:6px;padding:18px;white-space:pre-wrap;overflow-wrap:anywhere;max-height:480px;overflow:auto;font:13px/1.65 ui-monospace,SFMono-Regular,Consolas,monospace;tab-size:2}.muted{color:var(--muted)}.err{color:#a32734;overflow-wrap:anywhere}.url{overflow-wrap:anywhere}.chart{display:block;width:800px;max-width:100%;min-width:700px;height:auto;margin:0;color:var(--ink)}.chart text{fill:var(--ink);font-family:inherit}.chart .ct{font-weight:650;font-size:15px}.chart .cl,.chart .cv,.chart .cn{font-size:13px}.chart .cb{fill:var(--teal)}.chart .cn{fill:var(--muted);font-style:italic}
.filters,.js .filters{display:flex;gap:16px;align-items:end;flex-wrap:wrap;margin:18px 0}.filters label{display:flex;flex-direction:column;gap:6px;font-size:13px;font-weight:600;color:var(--muted)}.filters select,.filters input{min-height:44px;padding:9px 12px;color:var(--ink);background:white;border:1px solid #9eb1c9;border-radius:5px;font-size:14px;max-width:100%}.filters input::placeholder{color:#64758a;opacity:1}.filters .search-field{flex:1 1 290px}.filters button{min-height:44px}.profile-filters{padding:12px 0 4px;margin:0;border:0;display:flex;flex-wrap:wrap;gap:8px 20px}.profile-filters legend{font-size:13px;font-weight:600;color:var(--muted);padding:0;margin-bottom:8px}.profile-filters label{display:flex;gap:7px;align-items:center;font-size:14px;overflow-wrap:anywhere;min-height:30px}.profile-filters input{width:17px;height:17px;flex-shrink:0}.empty-state{padding:20px;background:var(--pale);border:1px dashed #9eb1c9;border-radius:6px;max-width:none}.case{border-top:1px solid var(--line);padding:4px 0 24px}.case h3{margin-top:24px}details{margin:8px 0;border-bottom:1px solid var(--line)}summary{padding:12px 0;cursor:pointer;font-size:14px;font-weight:600;color:var(--blue);overflow-wrap:anywhere}summary:hover{color:var(--ink)}details[open]{padding-bottom:16px}.report-footer{margin-top:48px;padding-top:20px;border-top:1px solid var(--line);font-size:13px;color:var(--muted)}
@media(min-width:1600px){main{padding-left:64px;padding-right:64px}}@media(max-width:1100px){.report-layout{grid-template-columns:200px minmax(0,1fr)}main{padding:32px 28px 64px}.sidebar{padding:28px 10px}.sidebar a{font-size:13px}}@media(max-width:760px){.report-layout{display:block}.sidebar{height:auto;position:sticky;z-index:5;padding:8px 12px;border-right:0;border-bottom:1px solid var(--line);overflow:visible}.sidebar-title,.sidebar-description{display:none}.sidebar ul{display:flex;overflow-x:auto;gap:4px;padding:4px}.sidebar li{flex:0 0 auto;margin:0}.sidebar a{padding:10px 12px;font-size:14px;white-space:nowrap}main{padding:28px 18px 48px}h1{font-size:28px}h2{font-size:22px}.report-section{margin-top:36px;padding-top:24px;scroll-margin-top:90px}.filters{gap:12px}.filters label{flex:1 1 145px;min-width:0}.filters select{width:100%}.filters .search-field{flex-basis:100%}.method-note{padding:14px}th,td{padding:10px 12px}.exports a{flex:1 1 auto}}
@media print{@page{size:landscape;margin:12mm}body{font-size:10pt;color:#000}.report-layout{display:block}.sidebar,.skip-link,.interactive,.js .interactive,.exports,#f-count,#f-empty,#c-count,#c-empty{display:none!important}main{padding:0}header{padding-bottom:12px;margin-bottom:20px}h1{font-size:24pt}h2{font-size:18pt}h3{font-size:12pt}.report-section{margin-top:24px;padding-top:16px}.tw{overflow:visible;border:0}.chart-wrap{overflow:visible}.chart{min-width:0;max-width:100%;break-inside:avoid}table,.comparison-table{table-layout:fixed;min-width:0;font-size:7pt;width:100%}th,td,tbody th{min-width:0;padding:5px;overflow-wrap:anywhere}.comparison-table td{white-space:normal}thead{display:table-header-group}tr{break-inside:avoid}.row-note{font-size:7pt}pre{max-height:none;overflow:visible;font-size:8pt}details> :not(summary){display:block!important}summary{color:#000;break-after:avoid}h2,h3{break-after:avoid}.case[hidden]{display:block!important}a{color:#000;text-decoration:none}.method-note{padding:10px}.report-footer{margin-top:24px}}
caption{text-align:left;padding:12px 14px;font-size:14px;font-weight:600;background:white;border-bottom:1px solid var(--line)}.profile-selection{border:0;margin:0}.profile-selection summary{padding:4px 0}.profile-selection[open]{padding-bottom:8px}#c-count{font-size:13px;margin:8px 0}.filters.interactive{display:none}.js .filters.interactive{display:flex}@media print{.js .filters.interactive{display:none}.profile-selection{display:none}}
p,li{overflow-wrap:anywhere}
`;

const JS = `
(function(){
  document.documentElement.classList.add('js');
  var ds=document.getElementById('f-dataset'),cat=document.getElementById('f-category'),sp=document.getElementById('f-split'),search=document.getElementById('f-search'),cnt=document.getElementById('f-count');
  var cases=Array.from(document.querySelectorAll('section.case')).map(function(node){return {node:node,text:node.textContent.toLowerCase()};});
  function applyCases(){
    var shown=0,query=search.value.trim().toLowerCase();
    cases.forEach(function(item){
      var s=item.node,ok=(!ds.value||s.dataset.dataset===ds.value)&&(!cat.value||s.dataset.category===cat.value)&&(!sp.value||s.dataset.split===sp.value)&&(!query||item.text.includes(query));
      s.hidden=!ok;if(ok)shown++;
    });
    cnt.textContent=shown+' of '+cases.length+' cases shown';
    document.getElementById('f-empty').hidden=shown!==0;
  }
  var caseForm=document.getElementById('case-filters');
  caseForm.addEventListener('submit',function(event){event.preventDefault();});
  caseForm.addEventListener('input',applyCases);
  caseForm.addEventListener('change',applyCases);
  caseForm.addEventListener('reset',function(){setTimeout(applyCases,0);});
  applyCases();
  var compare=document.getElementById('comparison-filters');
  if(compare){
    var dataset=document.getElementById('c-dataset'),split=document.getElementById('c-split'),scope=document.getElementById('c-scope'),sort=document.getElementById('c-sort');
    var panes=Array.from(document.querySelectorAll('.comparison-pane'));
    function applyComparison(){
      var selected=Array.from(compare.querySelectorAll('input[name="profile"]:checked')).map(function(input){return input.value;});
      var shown=0;
      panes.forEach(function(pane){
        pane.hidden=pane.dataset.dataset!==dataset.value||pane.dataset.split!==split.value||pane.dataset.scope!==scope.value;
        if(pane.hidden)return;
        var body=pane.querySelector('tbody'),rows=Array.from(body.rows),key=sort.value;
        rows.sort(function(a,b){
          var av=a.dataset[key],bv=b.dataset[key];
          if(av===''&&bv==='')return Number(a.dataset.recorded)-Number(b.dataset.recorded);
          if(av==='')return 1;if(bv==='')return -1;
          var difference=Number(av)-Number(bv);
          return (key==='usable'||key==='recall'?-difference:difference)||Number(a.dataset.recorded)-Number(b.dataset.recorded);
        });
        rows.forEach(function(row){row.hidden=!selected.includes(row.dataset.profile);if(!row.hidden)shown++;body.appendChild(row);});
      });
      document.getElementById('c-count').textContent=shown+' profiles shown. '+sort.options[sort.selectedIndex].text+'.';
      document.getElementById('c-empty').hidden=shown!==0;
    }
    compare.addEventListener('submit',function(event){event.preventDefault();});
    compare.addEventListener('change',applyComparison);
    compare.addEventListener('reset',function(){setTimeout(applyComparison,0);});
    applyComparison();
  }
  var links=Array.from(document.querySelectorAll('.sidebar a'));
  if('IntersectionObserver' in window){
    var observer=new IntersectionObserver(function(entries){
      entries.forEach(function(entry){if(entry.isIntersecting){links.forEach(function(link){
        if(link.hash==='#'+entry.target.id)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');
      });}});
    },{rootMargin:'0px 0px -70% 0px'});
    document.querySelectorAll('main>.report-section').forEach(function(section){observer.observe(section);});
  }
  var closedForPrint=[];
  window.addEventListener('beforeprint',function(){closedForPrint=Array.from(document.querySelectorAll('details:not([open])'));closedForPrint.forEach(function(detail){detail.open=true;});});
  window.addEventListener('afterprint',function(){closedForPrint.forEach(function(detail){detail.open=false;});closedForPrint=[];});
})();
`;

function renderHtml(title: string, blocks: readonly Block[], inspection: string, ctx: Ctx, exports: readonly [string, string][]): string {
  const sections: { title: string; blocks: Block[] }[] = [];
  for (const block of blocks) {
    if (block.kind === "h" && block.level === 1) continue;
    if (block.kind === "h" && block.level === 2) sections.push({ title: block.text, blocks: [] });
    else sections[sections.length - 1]?.blocks.push(block);
  }
  const order = [
    ...(ctx.data.records.length ? ["Results", "Crawl"] : ["Crawl", "Results"]),
    "Quality detail", "Latency", "Per-case inspection", "Resources", "Cold start", "Footprint",
    "Fetchkeep-specific features", "Unsupported / N/A / unavailable", "How to read this",
    "Summary of what was run", "Environment", "Engines", "Reproduce",
  ];
  const labels: Record<string, string> = {
    Results: "Full fetch results", "Per-case inspection": "Case inspector",
    "Fetchkeep-specific features": "Citation checks", "Unsupported / N/A / unavailable": "Availability & limitations",
    "How to read this": "Methodology & trade-offs", "Summary of what was run": "Run configuration",
  };
  const toc = [
    `<li><a href="#overview" aria-current="location">Overview &amp; comparison</a></li>`,
    ...order.map((name) => `<li><a href="#${slug(name)}">${escapeHtml(labels[name] ?? name)}</a></li>`),
  ].join("");
  const content = order.map((name) => {
    if (name === "Per-case inspection") return `<section class="report-section" id="${slug(name)}">${inspection}</section>`;
    const section = sections.find((s) => s.title === name);
    if (!section) return "";
    return `<section class="report-section" id="${slug(name)}"><h2>${escapeHtml(labels[name] ?? name)}</h2>${renderHtmlBlocks(section.blocks)}</section>`;
  }).join("\n");
  const m = ctx.data.meta;
  const downloads = exports.filter(([name]) => name.endsWith(".csv")).map(([name, csv]) =>
    `<a download="${escapeHtml(name)}" href="data:text/csv;charset=utf-8;base64,${Buffer.from(csv, "utf8").toString("base64")}">Download ${escapeHtml(name)}</a>`).join("");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title><style>${CSS}</style></head>
<body><a class="skip-link" href="#main">Skip to report</a>
<div class="report-layout"><nav class="sidebar" aria-label="Report sections"><p class="sidebar-title">Fetchkeep</p><p class="sidebar-description">Benchmark report</p><ul>${toc}</ul></nav>
<main id="main"><header><h1>Benchmark report</h1>
<p class="run-identity"><strong>${escapeHtml(m.suite)}</strong> / Run ${escapeHtml(m.runId)}<br>Started <time>${escapeHtml(m.startedAt)}</time></p>
<p class="run-volume">${ctx.data.records.length} fetch tasks across ${fetchCaseIds(ctx.data).length} cases; ${ctx.data.crawl.length} crawl tasks across ${uniq(ctx.data.crawl.map((r) => r.caseId)).length} cases. ${ctx.data.profiles.length} recorded profiles.</p>
<div class="exports" aria-label="Embedded CSV downloads">${downloads}</div></header>
<section class="report-section" id="overview"><h2>${ctx.data.records.length ? "Compare this run" : "Crawl results overview"}</h2>
<div class="method-note"><p>No overall winner: compare coverage, quality and latency together. Fixtures are synthetic; live sites and transport overheads vary. <a href="#how-to-read-this">Methodology &amp; trade-offs</a>.</p></div>
${comparisonHtml(ctx)}
${ctx.data.records.length && ctx.data.crawl.length ? `<p><a href="#crawl">Read crawl coverage, missing pages and stop reasons</a>. Fetch controls do not filter crawl results.</p>` : ""}
<noscript><p>JavaScript is disabled. Full results and embedded CSV downloads remain available below; enable JavaScript to filter and sort.</p></noscript></section>
${content}
<footer class="report-footer">Standalone snapshot. CSV downloads and displayed raw previews are embedded in this file; no server or network connection is needed. Source paths identify the original run and are not required to read this report.</footer>
</main></div><script>${JS}</script></body></html>
`;
}

// ---------------------------------------------------------------- entry point

export async function generateReport(runDir: string): Promise<{ files: string[] }> {
  const dir = resolve(runDir);
  const data = await loadRun(dir);
  const ctx = makeCtx(data);
  const blocks = buildBlocks(ctx);
  const outputs: [string, string][] = [
    ["summary.csv", summaryCsv(ctx)],
    ["cases.csv", casesCsv(ctx)],
  ];
  if (data.crawl.length) outputs.push(["crawl.csv", crawlCsv(data)]);
  outputs.push(["report.md", renderMarkdown(blocks)]);
  const title = `Fetchkeep benchmark report — ${data.meta.suite} — ${data.meta.runId}`;
  outputs.push(["report.html", renderHtml(title, blocks, await caseInspectionHtml(ctx), ctx, outputs)]);
  const files: string[] = [];
  for (const [name, content] of outputs) {
    const path = join(dir, name);
    await writeFile(path, content, "utf8");
    files.push(path);
  }
  return { files };
}
