import { clusterEstimate, pairedComparison, uncertainty, validationCase, type Estimate, type PairedComparison } from "./statistics.ts";
import { TIMING_PHASES } from "./timings.ts";
import type { BenchCase, RunRecord } from "./types.ts";

export type AnalysisSplit = "all" | "heldOut" | "dev" | "validation";
export function inSplit(r: RunRecord, split: AnalysisSplit): boolean {
  if (split === "all") return true;
  if (split === "validation") return validationCase(r.caseId);
  return !validationCase(r.caseId) && (split === "heldOut") === r.heldOut;
}
export interface Evidence {
  uncertainty: { profile: string; dataset: string; split: AnalysisSplit; metric: string; estimate: Estimate }[];
  paired: PairedComparison[];
  phases: { profile: string; dataset: string; phase: string; definition: string; eligibleAttempts: number; estimate: Estimate }[];
}
export function analyze(records: readonly RunRecord[], cases: Map<string, BenchCase>, profiles: readonly string[]): Evidence {
  const result: Evidence = { uncertainty: [], paired: [], phases: [] };
  for (const dataset of ["fixture", "live"] as const) {
    const cohort = records.filter((r) => r.dataset === dataset);
    if (!cohort.length) continue;
    const present = profiles.filter((profile) => cohort.some((r) => r.profile === profile));
    for (const profile of present) {
      const rows = cohort.filter((r) => r.profile === profile);
      for (const split of ["all", "heldOut", "dev", "validation"] as const) {
        const selected = rows.filter((r) => inSplit(r, split));
        if (!selected.length) continue;
        for (const [metric, estimate] of Object.entries(uncertainty(selected, cases))) result.uncertainty.push({ profile, dataset, split, metric, estimate });
      }
      const warm = rows.filter((r) => r.repetition >= 2 && r.outcome === "ok");
      for (const [phase, definition] of Object.entries(TIMING_PHASES)) {
        // Historical-only fields appear only when a producer actually recorded them.
        if ((phase === "browserLaunchMs" || phase === "fetchMs") && !warm.some((r) => r.timings?.[phase] !== undefined)) continue;
        const observations = warm.flatMap((r) => {
          const value = r.timings?.[phase];
          return typeof value === "number" && Number.isFinite(value) && value >= 0 ? [{ caseId: r.caseId, value }] : [];
        });
        result.phases.push({ profile, dataset, phase, definition, eligibleAttempts: warm.length, estimate: clusterEstimate(observations, "p50") });
      }
    }
    for (let i = 0; i < present.length; i++) for (let j = i + 1; j < present.length; j++) {
      result.paired.push(pairedComparison(cohort, cases, present[i]!, present[j]!, dataset));
    }
  }
  return result;
}
