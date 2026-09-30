import type { Browsers } from "../browser/registry.js";
import type { BrowserName } from "../browser/provider.js";
import { FetchkeepError, toFetchkeepError } from "./errors.js";
import { extractHtml } from "./extract/html.js";
import { fetchViaHttp, type FetchedPage } from "./fetch-http.js";
import { sha256 } from "./hash.js";
import { shouldEscalate } from "./heuristics.js";
import type { HttpClient, HttpLimits } from "./http.js";
import type { NetworkPolicy } from "./netpolicy.js";
import type { Attempt, BackendInfo, FetchMode } from "./schema.js";

export interface RetrieveOptions {
  url: string;
  mode: FetchMode;
  signal: AbortSignal;
  /** Absolute deadline (epoch ms) shared by every attempt. */
  deadline: number;
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
  browsers: Browsers;
  policy: NetworkPolicy;
  userAgent: string;
  settleMs: number;
}

/** Below this remaining budget a browser attempt is skipped rather than started. */
const MIN_BROWSER_BUDGET_MS = 1000;

async function renderPage(deps: RetrieveDeps, name: BrowserName, opts: RetrieveOptions): Promise<FetchedPage> {
  const pool = deps.browsers.pool(name);
  if (!pool) throw new FetchkeepError("browser_unavailable", `${name} backend is not enabled`);
  const fetchedAt = new Date().toISOString();
  const r = await pool.render({
    url: opts.url,
    signal: opts.signal,
    deadline: opts.deadline,
    policy: deps.policy,
    userAgent: deps.userAgent,
    settleMs: deps.settleMs,
    maxBytes: opts.limits.maxBytes,
  });
  if (r.status >= 400) {
    throw new FetchkeepError("http_error", `HTTP ${r.status} from ${r.finalUrl} (${name})`, {
      retryable: r.status === 429 || r.status >= 500,
      details: { status: r.status, finalUrl: r.finalUrl },
    });
  }
  const t0 = performance.now();
  const extracted = extractHtml(r.html, { url: r.finalUrl });
  if (r.truncated) extracted.warnings.push("rendered HTML exceeded the size limit and was cut; content may be incomplete");
  if (r.requests.blocked) extracted.warnings.push(`${r.requests.blocked} browser subrequest(s) blocked by the network policy`);
  const body = Buffer.from(r.html, "utf8");
  return {
    backend: name,
    requestedUrl: opts.url,
    finalUrl: r.finalUrl,
    httpStatus: r.status,
    contentType: "text/html",
    contentTypeHeader: "text/html; charset=utf-8",
    fetchedAt,
    body,
    rawHash: sha256(body),
    inputTruncated: r.truncated ? "decompressed_limit" : null,
    redirects: [],
    extracted,
    timings: {
      browserLaunchMs: r.timings.launchMs,
      navigateMs: r.timings.navigateMs,
      renderMs: r.timings.totalMs,
      extractMs: performance.now() - t0,
      subrequests: r.requests.total,
      subrequestsBlocked: r.requests.blocked,
    },
  };
}

function failedAttempt(backend: Attempt["backend"], err: FetchkeepError, durationMs: number): Attempt {
  const a: Attempt = { backend, outcome: err.code === "browser_unavailable" ? "unavailable" : "failed", reason: err.message, errorCode: err.code, durationMs };
  const status = err.details?.status;
  if (typeof status === "number") a.httpStatus = status;
  return a;
}

/**
 * Runs backends for one URL under a single deadline and records every attempt.
 *
 * - `http`: HTTP only.
 * - `chromium` / `lightpanda`: that browser only.
 * - `browser`: enabled browsers, preferred first.
 * - `auto`: HTTP first; escalate to enabled browsers only when {@link shouldEscalate} says the result looks
 *   incomplete. Without an enabled browser the HTTP result is returned as `partial` with an explanation.
 */
export async function retrieve(deps: RetrieveDeps, opts: RetrieveOptions): Promise<RetrieveResult> {
  const attempts: Attempt[] = [];
  const warnings: string[] = [];
  const backend: BackendInfo = { mode: opts.mode, used: null, escalated: false, attempts };

  const tryBrowsers = async (names: BrowserName[]): Promise<{ page: FetchedPage | null; error: FetchkeepError | null }> => {
    let lastError: FetchkeepError | null = null;
    for (const name of names) {
      if (opts.deadline - Date.now() < MIN_BROWSER_BUDGET_MS) {
        attempts.push({ backend: name, outcome: "skipped", reason: "not enough time left before the deadline", durationMs: 0 });
        lastError ??= new FetchkeepError("timeout", "Deadline reached before a browser could be tried");
        continue;
      }
      // Availability may launch the browser (Chromium); that time belongs to this attempt.
      const t0 = performance.now();
      const avail = await deps.browsers.availability(name);
      if (!avail.available) {
        attempts.push({ backend: name, outcome: "unavailable", reason: avail.detail, durationMs: performance.now() - t0 });
        lastError = new FetchkeepError("browser_unavailable", `${name} is not available: ${avail.detail}`);
        continue;
      }
      try {
        const page = await renderPage(deps, name, opts);
        attempts.push({ backend: name, outcome: "success", httpStatus: page.httpStatus, durationMs: performance.now() - t0 });
        return { page, error: null };
      } catch (err) {
        const e = toFetchkeepError(err, opts.signal);
        attempts.push(failedAttempt(name, e, performance.now() - t0));
        lastError = e;
        if (opts.signal.aborted) break;
      }
    }
    return { page: null, error: lastError };
  };

  const browserOrder = (): BrowserName[] => {
    if (opts.mode === "chromium" || opts.mode === "lightpanda") return [opts.mode];
    return deps.browsers.enabled();
  };

  if (opts.mode !== "http" && opts.mode !== "auto") {
    const names = browserOrder();
    if (names.length === 0 || (opts.mode !== "browser" && !deps.browsers.pool(opts.mode as BrowserName))) {
      const name = (opts.mode === "browser" ? deps.browsers.preferred : opts.mode) as BrowserName;
      attempts.push({ backend: name, outcome: "unavailable", reason: "not enabled in the configuration", durationMs: 0 });
      const error = new FetchkeepError("browser_unavailable", `Mode "${opts.mode}" needs a browser backend, but none is enabled`, {
        hint: "Enable one with FETCHKEEP_CHROMIUM=1 (see docs/browsers.md) or use mode http/auto. Fetchkeep never installs browsers automatically.",
      });
      return { page: null, backend, error, warnings };
    }
    const { page, error } = await tryBrowsers(names);
    backend.used = page?.backend ?? null;
    return { page, backend, error: page ? null : error, warnings };
  }

  // HTTP first (http and auto).
  const t0 = performance.now();
  let httpPage: FetchedPage | null = null;
  let httpError: FetchkeepError | null = null;
  try {
    httpPage = await fetchViaHttp(deps.http, opts.url, opts.signal, opts.limits);
  } catch (err) {
    httpError = toFetchkeepError(err, opts.signal);
  }
  const httpMs = performance.now() - t0;
  if (opts.mode === "http" || opts.signal.aborted) {
    attempts.push(httpPage ? { backend: "http", outcome: "success", httpStatus: httpPage.httpStatus, durationMs: httpMs } : failedAttempt("http", httpError!, httpMs));
    backend.used = httpPage ? "http" : null;
    return { page: httpPage, backend, error: httpError, warnings };
  }

  const decision = shouldEscalate(httpPage?.extracted ?? null, httpError);
  if (!decision.escalate) {
    attempts.push(httpPage ? { backend: "http", outcome: "success", httpStatus: httpPage.httpStatus, durationMs: httpMs } : failedAttempt("http", httpError!, httpMs));
    backend.used = httpPage ? "http" : null;
    return { page: httpPage, backend, error: httpError, warnings };
  }

  attempts.push(
    httpPage
      ? { backend: "http", outcome: "insufficient", reason: decision.reason, httpStatus: httpPage.httpStatus, durationMs: httpMs }
      : { ...failedAttempt("http", httpError!, httpMs), reason: `${httpError!.message}; ${decision.reason}` },
  );
  const names = browserOrder();
  if (names.length === 0) {
    attempts.push({ backend: deps.browsers.preferred, outcome: "unavailable", reason: "no browser backend is enabled", durationMs: 0 });
    const note = `partial: JavaScript rendering looks necessary (${decision.reason}) but no browser backend is enabled; see docs/browsers.md`;
    if (httpPage) {
      backend.used = "http";
      warnings.push(note);
      return { page: httpPage, backend, error: null, warnings };
    }
    return { page: null, backend, error: httpError, warnings: [note] };
  }

  backend.escalated = true;
  const { page: rendered, error: browserError } = await tryBrowsers(names);
  if (rendered) {
    const httpChars = httpPage?.extracted.stats.chars ?? 0;
    if (!httpPage || rendered.extracted.stats.chars >= httpChars) {
      backend.used = rendered.backend;
      return { page: rendered, backend, error: null, warnings };
    }
    warnings.push(`${rendered.backend} rendered less text (${rendered.extracted.stats.chars} chars) than HTTP (${httpChars}); kept the HTTP result`);
    backend.used = "http";
    return { page: httpPage, backend, error: null, warnings };
  }
  if (httpPage) {
    backend.used = "http";
    warnings.push(`partial: browser escalation failed (${browserError?.message ?? "unknown error"}); returning the HTTP result`);
    return { page: httpPage, backend, error: null, warnings };
  }
  return { page: null, backend, error: browserError ?? httpError, warnings };
}
