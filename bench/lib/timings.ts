/** Definitions refer to engine-reported phases, not inferred splits of the MCP round trip. */
export const TIMING_PHASES: Record<string, string> = {
  downloadMs: "HTTP network and body decoding, including redirects",
  firstByteMs: "HTTP first byte (nested within downloadMs; not additive)",
  fetchMs: "Legacy retrieval timer (producer-specific; not additive)",
  launchMs: "Browser launch/acquire",
  navigateMs: "Browser navigation",
  readinessMs: "Bounded content readiness",
  serializeMs: "DOM serialization",
  extractMs: "Content extraction",
  renderMs: "Browser render total (overlaps browser phases; not additive)",
  saveMs: "Local persistence",
  totalMs: "Engine total (includes phases; do not sum with them)",
  browserLaunchMs: "Legacy browser launch field (historical producer only)",
};

/** Preserve only finite nonnegative engine measurements. Missing is unavailable, including unsupported engines. */
export function reportedTimings(value: unknown): Record<string, number> | undefined {
  if (!value || typeof value !== "object") return undefined;
  const result: Record<string, number> = {};
  for (const [name, ms] of Object.entries(value)) {
    if (Object.hasOwn(TIMING_PHASES, name) && typeof ms === "number" && Number.isFinite(ms) && ms >= 0) result[name] = ms;
  }
  return Object.keys(result).length ? result : undefined;
}
