import { FetchkeepError } from "./errors.js";
import { extractContent } from "./extract/index.js";
import { classifyContent } from "./extract/index.js";
import { sha256 } from "./hash.js";
import type { HttpClient, HttpLimits, RedirectHop, TruncationReason } from "./http.js";
import type { BackendName, ExtractedDocument } from "./schema.js";

/** A fetched and extracted page, independent of the backend that produced it. */
export interface FetchedPage {
  backend: BackendName;
  requestedUrl: string;
  finalUrl: string;
  httpStatus: number;
  contentType: string;
  contentTypeHeader: string;
  fetchedAt: string;
  /** Raw source bytes as received (HTML serialized by the browser for browser backends). */
  body: Buffer;
  rawHash: string;
  inputTruncated: TruncationReason | null;
  redirects: RedirectHop[];
  extracted: ExtractedDocument;
  timings: Record<string, number>;
}

export async function fetchViaHttp(http: HttpClient, url: string, signal: AbortSignal, limits?: Partial<HttpLimits>): Promise<FetchedPage> {
  const fetchedAt = new Date().toISOString();
  const res = await http.fetch({ url, signal, ...(limits ? { limits } : {}) });
  if (res.status < 200 || res.status >= 300) {
    throw new FetchkeepError("http_error", `HTTP ${res.status} from ${res.finalUrl}`, {
      retryable: res.status === 429 || res.status >= 500,
      details: { status: res.status, finalUrl: res.finalUrl, redirects: res.redirects },
      ...(res.status === 403 || res.status === 429 ? { hint: "The site may block automated clients or rate-limit requests." } : {}),
    });
  }
  const kind = classifyContent(res.contentType, res.body);
  if (res.truncated && kind === "pdf") {
    throw new FetchkeepError("response_too_large", `PDF exceeds the configured size limit (${res.truncated})`, {
      hint: "Raise limits.maxBytes / limits.maxCompressedBytes to fetch larger PDFs.",
      details: { bytes: res.bytes, compressedBytes: res.compressedBytes },
    });
  }
  const t0 = performance.now();
  const extracted = await extractContent({
    body: res.body,
    contentType: res.contentType,
    contentTypeHeader: res.headers["content-type"] ?? "",
    url: res.finalUrl,
  });
  if (res.truncated) extracted.warnings.push(`response body was cut at the ${res.truncated.replace("_", " ")}; content may be incomplete`);
  return {
    backend: "http",
    requestedUrl: url,
    finalUrl: res.finalUrl,
    httpStatus: res.status,
    contentType: res.contentType,
    contentTypeHeader: res.headers["content-type"] ?? "",
    fetchedAt,
    body: res.body,
    rawHash: sha256(res.body),
    inputTruncated: res.truncated,
    redirects: res.redirects,
    extracted,
    timings: { firstByteMs: res.timings.firstByteMs, downloadMs: res.timings.totalMs, extractMs: performance.now() - t0 },
  };
}
