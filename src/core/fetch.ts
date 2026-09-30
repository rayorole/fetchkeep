import { FetchkeepError, toFetchkeepError } from "./errors.js";
import { fetchViaHttp, type FetchedPage } from "./fetch-http.js";
import type { HttpClient, HttpLimits } from "./http.js";
import type { Attempt, BackendInfo, FetchMode } from "./schema.js";

export interface RetrieveOptions {
  url: string;
  mode: FetchMode;
  signal: AbortSignal;
  limits: HttpLimits;
}

export interface RetrieveResult {
  page: FetchedPage | null;
  backend: BackendInfo;
  error: FetchkeepError | null;
  warnings: string[];
}

export interface RetrieveDeps {
  http: HttpClient;
}

/** Runs the configured backends for one URL under a single deadline and records every attempt. */
export async function retrieve(deps: RetrieveDeps, opts: RetrieveOptions): Promise<RetrieveResult> {
  const attempts: Attempt[] = [];
  const warnings: string[] = [];
  const backend: BackendInfo = { mode: opts.mode, used: null, escalated: false, attempts };
  if (opts.mode !== "http" && opts.mode !== "auto") {
    const error = new FetchkeepError("browser_unavailable", `Backend "${opts.mode}" is not available in this build`);
    attempts.push({ backend: "chromium", outcome: "unavailable", reason: error.message, durationMs: 0 });
    return { page: null, backend, error, warnings };
  }
  const t0 = performance.now();
  try {
    const page = await fetchViaHttp(deps.http, opts.url, opts.signal, opts.limits);
    attempts.push({ backend: "http", outcome: "success", httpStatus: page.httpStatus, durationMs: performance.now() - t0 });
    backend.used = "http";
    return { page, backend, error: null, warnings };
  } catch (err) {
    const error = toFetchkeepError(err, opts.signal);
    const attempt: Attempt = { backend: "http", outcome: "failed", reason: error.message, errorCode: error.code, durationMs: performance.now() - t0 };
    const status = error.details?.status;
    if (typeof status === "number") attempt.httpStatus = status;
    attempts.push(attempt);
    return { page: null, backend, error, warnings };
  }
}
