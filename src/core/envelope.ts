import type { ErrorInfo } from "./errors.js";
import { toFetchkeepError } from "./errors.js";
import type { Envelope } from "./schema.js";

export type Status = Envelope["status"];

export function errorEnvelope(tool: string, err: unknown, extra: Partial<Envelope> = {}, signal?: AbortSignal): Envelope {
  const info: ErrorInfo = toFetchkeepError(err, signal).toInfo();
  return { status: "error", tool, timings: {}, warnings: [], ...extra, error: info };
}

export function roundTimings(t: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(t)) out[k] = Math.round(v * 10) / 10;
  return out;
}
