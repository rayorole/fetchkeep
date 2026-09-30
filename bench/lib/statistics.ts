import type { BenchCase, RunRecord } from "./types.ts";

export const BOOTSTRAP_DRAWS = 2000;
export const BOOTSTRAP_SEED = 424242;
export interface Observation { caseId: string; value: number }
export interface Estimate {
  value: number | null;
  low: number | null;
  high: number | null;
  cases: number;
  attempts: number;
}

export function quantile(values: readonly number[], p: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1))]!;
}
const average = (values: readonly number[]): number | null => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;

/** Resample cases, carrying every repetition of each sampled case together. Never IID-resample attempts. */
export function clusterEstimate(observations: readonly Observation[], statistic: "mean" | "p50" | "p95" = "mean", seed = BOOTSTRAP_SEED): Estimate {
  const groups = new Map<string, number[]>();
  for (const { caseId, value } of observations) {
    if (!Number.isFinite(value)) continue;
    const group = groups.get(caseId) ?? [];
    group.push(value);
    groups.set(caseId, group);
  }
  const clusters = [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([, values]) => values.sort((a, b) => a - b));
  const reduce = (values: readonly number[]) => statistic === "mean" ? average(values) : quantile(values, statistic === "p50" ? 0.5 : 0.95);
  const values = clusters.flat();
  const result: Estimate = { value: reduce(values), low: null, high: null, cases: clusters.length, attempts: values.length };
  // One case contains no information about case-to-case uncertainty, even with many repetitions.
  if (clusters.length < 2) return result;
  let state = seed >>> 0;
  const random = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), state | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const draws: number[] = [];
  for (let i = 0; i < BOOTSTRAP_DRAWS; i++) {
    const sample: number[] = [];
    for (let j = 0; j < clusters.length; j++) sample.push(...clusters[Math.floor(random() * clusters.length)]!);
    draws.push(reduce(sample)!);
  }
  result.low = quantile(draws, 0.025);
  result.high = quantile(draws, 0.975);
  return result;
}

export const attempted = (r: RunRecord): boolean => r.outcome === "ok" || r.outcome === "error";
export const caseKey = (r: RunRecord): string => `${r.dataset}:${r.caseId}`;
export const validationCase = (id: string): boolean => id.startsWith("val-");
export function usableValue(r: RunRecord, cases: Map<string, BenchCase>): number | null {
  const c = cases.get(r.caseId);
  if (!attempted(r) || (c?.kind === "fetch" && c.expectError) || typeof r.scores?.correctError === "number") return null;
  if (r.outcome === "error") return 0;
  const value = r.scores?.usable;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function uncertainty(records: readonly RunRecord[], cases: Map<string, BenchCase>): Record<string, Estimate> {
  const samples = (get: (r: RunRecord) => number | null | undefined): Observation[] => records.flatMap((r) => {
    const value = get(r);
    return typeof value === "number" && Number.isFinite(value) ? [{ caseId: caseKey(r), value }] : [];
  });
  const quality = (key: string) => clusterEstimate(samples((r) => r.outcome === "ok" ? r.scores?.[key] : null));
  const warm = samples((r) => r.outcome === "ok" && r.repetition >= 2 ? r.latencyMs : null);
  return {
    usable: clusterEstimate(samples((r) => usableValue(r, cases))),
    success: clusterEstimate(samples((r) => attempted(r) ? Number(r.outcome === "ok") : null)),
    warmP50: clusterEstimate(warm, "p50"),
    warmP95: clusterEstimate(warm, "p95"),
    passageRecall: quality("passageRecall"),
    tokenPrecision: quality("tokenPrecision"),
    tokenRecall: quality("tokenRecall"),
    tokenF1: quality("tokenF1"),
    boilerplate: quality("boilerplateExclusion"),
    headings: quality("headings"),
    tables: quality("tables"),
    code: quality("code"),
    citation: quality("citation"),
    correctError: clusterEstimate(samples((r) => attempted(r) ? r.scores?.correctError : null)),
    timeout: clusterEstimate(samples((r) => attempted(r) ? Number(r.outcome === "error" && r.error?.kind === "timeout") : null)),
    blocked: clusterEstimate(samples((r) => attempted(r) ? Number(r.outcome === "error" && r.error?.kind === "blocked") : null)),
  };
}

export interface PairedComparison {
  a: string;
  b: string;
  dataset: string;
  /** Both attempted this exact case + repetition; unavailable/missing records never become pairs. */
  matchedAttempts: number;
  matchedCases: number;
  onlyAAttempted: number;
  onlyBAttempted: number;
  aErrors: number;
  bErrors: number;
  aUsable: Estimate;
  bUsable: Estimate;
  usableDifference: Estimate;
  aWarmP50: Estimate;
  bWarmP50: Estimate;
  /** A minus B per matched successful warm request; negative favors A. */
  warmDeltaP50: Estimate;
  /** A divided by B per matched successful warm request; below one favors A. */
  warmRatioP50: Estimate;
}

export function pairedComparison(records: readonly RunRecord[], cases: Map<string, BenchCase>, a: string, b: string, dataset: string): PairedComparison {
  const index = (profile: string) => {
    const map = new Map<string, RunRecord>();
    for (const r of records) {
      if (r.profile !== profile || r.dataset !== dataset || !attempted(r)) continue;
      const key = `${r.caseId}\u0000${r.repetition}`;
      if (map.has(key)) throw new Error(`Duplicate paired attempt: ${profile}/${r.caseId}/r${r.repetition}`);
      map.set(key, r);
    }
    return map;
  };
  const left = index(a), right = index(b);
  const pairs = [...left].flatMap(([key, ar]) => right.has(key) ? [{ a: ar, b: right.get(key)! }] : []);
  const quality = pairs.flatMap((pair) => {
    const av = usableValue(pair.a, cases), bv = usableValue(pair.b, cases);
    return av === null || bv === null ? [] : [{ caseId: caseKey(pair.a), a: av, b: bv }];
  });
  const warm = pairs.flatMap((pair) => {
    const av = pair.a.latencyMs, bv = pair.b.latencyMs;
    return pair.a.repetition >= 2 && pair.a.outcome === "ok" && pair.b.outcome === "ok" &&
      av !== null && bv !== null && Number.isFinite(av) && Number.isFinite(bv) && av >= 0 && bv >= 0
      ? [{ caseId: caseKey(pair.a), a: av, b: bv }] : [];
  });
  const estimate = (rows: typeof warm, get: (r: typeof warm[number]) => number, statistic: "mean" | "p50") =>
    clusterEstimate(rows.map((r) => ({ caseId: r.caseId, value: get(r) })), statistic);
  return {
    a, b, dataset, matchedAttempts: pairs.length, matchedCases: new Set(pairs.map((p) => caseKey(p.a))).size,
    onlyAAttempted: left.size - pairs.length, onlyBAttempted: right.size - pairs.length,
    aErrors: pairs.filter((p) => p.a.outcome === "error").length, bErrors: pairs.filter((p) => p.b.outcome === "error").length,
    aUsable: estimate(quality, (r) => r.a, "mean"), bUsable: estimate(quality, (r) => r.b, "mean"),
    usableDifference: estimate(quality, (r) => r.a - r.b, "mean"),
    aWarmP50: estimate(warm, (r) => r.a, "p50"), bWarmP50: estimate(warm, (r) => r.b, "p50"),
    warmDeltaP50: estimate(warm, (r) => r.a - r.b, "p50"),
    warmRatioP50: estimate(warm.filter((r) => r.b > 0), (r) => r.a / r.b, "p50"),
  };
}
