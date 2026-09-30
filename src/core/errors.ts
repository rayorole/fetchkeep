export const ERROR_CODES = [
  "invalid_url",
  "invalid_argument",
  "blocked_by_policy",
  "dns_failure",
  "connect_failed",
  "timeout",
  "cancelled",
  "too_many_redirects",
  "http_error",
  "response_too_large",
  "unsupported_content_type",
  "extraction_failed",
  "browser_unavailable",
  "browser_failed",
  "robots_disallowed",
  "not_found",
  "search_provider_unavailable",
  "ollama_unavailable",
  "ollama_failed",
  "invalid_schema",
  "internal",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

/** Codes where retrying the same request later may succeed. */
const RETRYABLE: Partial<Record<ErrorCode, true>> = { timeout: true, connect_failed: true, dns_failure: true, browser_failed: true };

export interface ErrorInfo {
  code: ErrorCode;
  message: string;
  retryable: boolean;
  hint?: string;
  details?: Record<string, unknown>;
}

export class FetchkeepError extends Error {
  readonly code: ErrorCode;
  readonly retryable: boolean;
  readonly hint: string | undefined;
  readonly details: Record<string, unknown> | undefined;

  constructor(code: ErrorCode, message: string, opts: { hint?: string; details?: Record<string, unknown>; cause?: unknown; retryable?: boolean } = {}) {
    super(message, opts.cause === undefined ? undefined : { cause: opts.cause });
    this.name = "FetchkeepError";
    this.code = code;
    this.retryable = opts.retryable ?? RETRYABLE[code] === true;
    this.hint = opts.hint;
    this.details = opts.details;
  }

  toInfo(): ErrorInfo {
    const info: ErrorInfo = { code: this.code, message: this.message, retryable: this.retryable };
    if (this.hint) info.hint = this.hint;
    if (this.details) info.details = this.details;
    return info;
  }
}

/** Normalizes any thrown value into a FetchkeepError, classifying common Node/Undici failures. */
export function toFetchkeepError(err: unknown, signal?: AbortSignal): FetchkeepError {
  if (err instanceof FetchkeepError) return err;
  if (signal?.aborted) {
    const reason: unknown = signal.reason;
    if (reason instanceof FetchkeepError) return reason;
    if (reason instanceof Error && reason.name === "TimeoutError") {
      return new FetchkeepError("timeout", "Deadline exceeded", { cause: err });
    }
    return new FetchkeepError("cancelled", "Request was cancelled", { cause: err });
  }
  const e = err as { code?: string; message?: string; name?: string; cause?: unknown };
  const cause = e?.cause as { code?: string; message?: string } | undefined;
  if (cause instanceof FetchkeepError) return cause;
  const code = e?.code ?? cause?.code ?? "";
  const message = e?.message ?? String(err);
  if (code === "ENOTFOUND" || code === "EAI_AGAIN" || code === "ENODATA") {
    return new FetchkeepError("dns_failure", `DNS lookup failed: ${message}`, { cause: err });
  }
  if (
    code === "UND_ERR_HEADERS_TIMEOUT" ||
    code === "UND_ERR_BODY_TIMEOUT" ||
    code === "UND_ERR_CONNECT_TIMEOUT" ||
    code === "ETIMEDOUT" ||
    e?.name === "TimeoutError"
  ) {
    return new FetchkeepError("timeout", `Timed out: ${message}`, { cause: err });
  }
  if (e?.name === "AbortError") return new FetchkeepError("cancelled", "Request was cancelled", { cause: err });
  if (["ECONNREFUSED", "ECONNRESET", "EHOSTUNREACH", "ENETUNREACH", "UND_ERR_SOCKET", "EPIPE", "CERT_HAS_EXPIRED", "ERR_TLS_CERT_ALTNAME_INVALID", "UNABLE_TO_VERIFY_LEAF_SIGNATURE", "DEPTH_ZERO_SELF_SIGNED_CERT", "SELF_SIGNED_CERT_IN_CHAIN"].includes(code)) {
    return new FetchkeepError("connect_failed", `Connection failed (${code}): ${message}`, { cause: err });
  }
  return new FetchkeepError("internal", message, { cause: err });
}
