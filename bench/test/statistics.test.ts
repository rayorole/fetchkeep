import { describe, expect, it } from "vitest";
import { inSplit } from "../lib/analysis.ts";
import { clusterEstimate, pairedComparison, uncertainty } from "../lib/statistics.ts";
import { reportedTimings } from "../lib/timings.ts";
import type { RunRecord } from "../lib/types.ts";

function record(profile: string, caseId: string, repetition: number, extra: Partial<RunRecord> = {}): RunRecord {
  return { runId: "run", suite: "test", profile, engine: profile === "a" ? "fetchkeep" : "donsetch", caseId, dataset: "fixture", category: "article", heldOut: false,
    repetition, outcome: "ok", startedAt: "2026-01-01T00:00:00Z", latencyMs: 20, scores: { usable: 1 }, ...extra };
}

describe("case-cluster uncertainty", () => {
  it("keeps correlated repetitions together and is deterministic under input permutation", () => {
    const rows = Array.from({ length: 20 }, () => [{ caseId: "a", value: 0 }, { caseId: "b", value: 1 }]).flat();
    const estimate = clusterEstimate(rows);
    expect(estimate).toEqual({ value: 0.5, low: 0, high: 1, cases: 2, attempts: 40 });
    expect(clusterEstimate([...rows].reverse())).toEqual(estimate);
  });
  it("does not invent case uncertainty from repetitions of one case or absent values", () => {
    expect(clusterEstimate([{ caseId: "a", value: 10 }, { caseId: "a", value: 30 }], "p50")).toEqual({ value: 10, low: null, high: null, cases: 1, attempts: 2 });
    expect(clusterEstimate([])).toEqual({ value: null, low: null, high: null, cases: 0, attempts: 0 });
  });
  it("keeps failures in usable rates, unavailable and expected-error slots out, and only warm successes in latency", () => {
    const rows = [record("a", "a", 1), record("a", "a", 2, { latencyMs: 40 }), record("a", "b", 2, { outcome: "error", scores: {} }),
      record("a", "c", 2, { outcome: "unavailable" }), record("a", "expected", 2, { outcome: "error", scores: { correctError: 1 } })];
    const stats = uncertainty(rows, new Map());
    expect(stats.usable).toMatchObject({ value: 2 / 3, cases: 2, attempts: 3 });
    expect(stats.warmP50).toMatchObject({ value: 40, cases: 1, attempts: 1 });
    expect(stats.success).toMatchObject({ value: 0.5, cases: 3, attempts: 4 });
  });
});

describe("paired same-case same-repetition comparisons", () => {
  it("never pairs unrelated repetitions or failures while retaining their quality denominator", () => {
    const rows = [record("a", "one", 2, { latencyMs: 10 }), record("b", "one", 2, { latencyMs: 20 }),
      record("a", "one", 3), record("b", "one", 4),
      record("a", "two", 2, { outcome: "error", scores: {} }), record("b", "two", 2, { latencyMs: 30 })];
    const pair = pairedComparison(rows, new Map(), "a", "b", "fixture");
    expect(pair).toMatchObject({ matchedAttempts: 2, matchedCases: 2, onlyAAttempted: 1, onlyBAttempted: 1, aErrors: 1, bErrors: 0 });
    expect(pair.warmDeltaP50).toMatchObject({ value: -10, cases: 1, attempts: 1 });
    expect(pair.warmRatioP50).toMatchObject({ value: 0.5, attempts: 1 });
    expect(pair.aUsable).toMatchObject({ value: 0.5, attempts: 2 });
    expect(pair.bUsable).toMatchObject({ value: 1, attempts: 2 });
  });
  it("uses a separate ratio denominator for zero latency and rejects ambiguous duplicate attempts", () => {
    const rows = [record("a", "one", 2, { latencyMs: 10 }), record("b", "one", 2, { latencyMs: 0 })];
    const pair = pairedComparison(rows, new Map(), "a", "b", "fixture");
    expect(pair.warmDeltaP50.attempts).toBe(1);
    expect(pair.warmRatioP50).toMatchObject({ value: null, attempts: 0 });
    expect(() => pairedComparison([...rows, rows[0]!], new Map(), "a", "b", "fixture")).toThrow("Duplicate paired attempt");
  });
});

it("keeps new validation separate from exposed historical held-out grouping", () => {
  const validation = record("a", "val-example", 1, { heldOut: true });
  expect(inSplit(validation, "validation")).toBe(true);
  expect(inSplit(validation, "heldOut")).toBe(false);
  expect(inSplit(validation, "dev")).toBe(false);
  expect(inSplit(record("a", "fx-example", 1, { heldOut: true }), "heldOut")).toBe(true);
});

it("does not turn missing or invalid engine phases into zero measurements", () => {
  expect(reportedTimings(undefined)).toBeUndefined();
  expect(reportedTimings({ extractMs: -2, totalMs: Infinity, latencyMs: 99 })).toBeUndefined();
  expect(reportedTimings({ launchMs: 0, extractMs: 12.5, totalMs: 20, downloadMs: 4 })).toEqual({ launchMs: 0, extractMs: 12.5, totalMs: 20, downloadMs: 4 });
});
