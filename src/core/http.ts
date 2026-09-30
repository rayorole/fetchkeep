import { Readable } from "node:stream";
import type { Duplex } from "node:stream";
import zlib from "node:zlib";
import { Agent, request } from "undici";
import type { Dispatcher } from "undici";
import { FetchkeepError, toFetchkeepError } from "./errors.js";
import type { NetworkPolicy } from "./netpolicy.js";

export interface HttpLimits {
  /** Maximum bytes read from the socket (after transfer, before decompression). */
  maxCompressedBytes: number;
  /** Maximum bytes after content decoding. */
  maxBytes: number;
  maxRedirects: number;
}

export const DEFAULT_HTTP_LIMITS: HttpLimits = {
  maxCompressedBytes: 10 * 1024 * 1024,
  maxBytes: 25 * 1024 * 1024,
  maxRedirects: 10,
};

export interface HttpRequest {
  url: string;
  signal: AbortSignal;
  headers?: Record<string, string>;
  limits?: Partial<HttpLimits>;
}

export interface RedirectHop {
  url: string;
  status: number;
}

export type TruncationReason = "compressed_limit" | "decompressed_limit";

export interface HttpResponse {
  requestedUrl: string;
  finalUrl: string;
  status: number;
  headers: Record<string, string>;
  contentType: string;
  body: Buffer;
  compressedBytes: number;
  bytes: number;
  truncated: TruncationReason | null;
  redirects: RedirectHop[];
  timings: { firstByteMs: number; totalMs: number };
}

const zstd = zlib as unknown as { createZstdDecompress?: () => Duplex };
const ACCEPT_ENCODING = zstd.createZstdDecompress ? "gzip, deflate, br, zstd" : "gzip, deflate, br";
const REDIRECT_STATUSES: Record<number, true> = { 301: true, 302: true, 303: true, 307: true, 308: true };
const DEFAULT_ACCEPT = "text/html,application/xhtml+xml,application/xml;q=0.9,application/pdf;q=0.9,text/plain;q=0.8,*/*;q=0.5";

export class HttpClient {
  private readonly agent: Agent;

  constructor(
    private readonly policy: NetworkPolicy,
    private readonly userAgent: string,
  ) {
    this.agent = new Agent({
      connect: { lookup: policy.lookup, timeout: 15_000 },
      connections: 16,
      keepAliveTimeout: 4_000,
      maxResponseSize: -1,
    });
  }

  async fetch(req: HttpRequest): Promise<HttpResponse> {
    const limits = { ...DEFAULT_HTTP_LIMITS, ...req.limits };
    const started = performance.now();
    const redirects: RedirectHop[] = [];
    let current = this.policy.checkUrl(req.url);

    for (let hop = 0; ; hop++) {
      let res: Dispatcher.ResponseData;
      try {
        res = await request(current, {
          dispatcher: this.agent,
          method: "GET",
          signal: req.signal,
          headers: {
            "user-agent": this.userAgent,
            accept: DEFAULT_ACCEPT,
            "accept-encoding": ACCEPT_ENCODING,
            "accept-language": "en;q=0.9,*;q=0.5",
            ...req.headers,
          },
        });
      } catch (err) {
        throw toFetchkeepError(err, req.signal);
      }
      const firstByteMs = performance.now() - started;
      const headers = flattenHeaders(res.headers);

      if (REDIRECT_STATUSES[res.statusCode] && headers.location) {
        await res.body.dump().catch(() => undefined);
        redirects.push({ url: current.href, status: res.statusCode });
        if (hop >= limits.maxRedirects) {
          throw new FetchkeepError("too_many_redirects", `Exceeded ${limits.maxRedirects} redirects`, { details: { redirects } });
        }
        let next: URL;
        try {
          next = new URL(headers.location, current);
        } catch {
          throw new FetchkeepError("invalid_url", `Invalid redirect location: ${headers.location}`);
        }
        current = this.policy.checkUrl(next);
        continue;
      }

      const state = { compressed: 0, truncated: null as TruncationReason | null };
      const chunks: Buffer[] = [];
      let bytes = 0;
      try {
        const source = Readable.from(limitStream(res.body, limits.maxCompressedBytes, state));
        const decoder = createDecoder(headers["content-encoding"]);
        let stream: Readable = source;
        if (decoder) {
          source.on("error", (e) => decoder.destroy(e));
          stream = source.pipe(decoder);
        }
        for await (const chunk of stream as AsyncIterable<Buffer>) {
          if (bytes + chunk.length > limits.maxBytes) {
            chunks.push(chunk.subarray(0, limits.maxBytes - bytes));
            bytes = limits.maxBytes;
            state.truncated = "decompressed_limit";
            break;
          }
          chunks.push(chunk);
          bytes += chunk.length;
        }
      } catch (err) {
        if (!(state.truncated && bytes > 0)) throw toFetchkeepError(err, req.signal);
      } finally {
        res.body.destroy();
      }

      return {
        requestedUrl: req.url,
        finalUrl: current.href,
        status: res.statusCode,
        headers,
        contentType: (headers["content-type"] ?? "").split(";")[0]!.trim().toLowerCase(),
        body: Buffer.concat(chunks),
        compressedBytes: state.compressed,
        bytes,
        truncated: state.truncated,
        redirects,
        timings: { firstByteMs, totalMs: performance.now() - started },
      };
    }
  }

  async close(): Promise<void> {
    await this.agent.close();
  }
}

async function* limitStream(body: AsyncIterable<Buffer>, max: number, state: { compressed: number; truncated: TruncationReason | null }) {
  for await (const chunk of body) {
    if (state.compressed + chunk.length > max) {
      yield chunk.subarray(0, max - state.compressed);
      state.compressed = max;
      state.truncated = "compressed_limit";
      return;
    }
    state.compressed += chunk.length;
    yield chunk;
  }
}

function createDecoder(encoding: string | undefined): Duplex | null {
  const enc = (encoding ?? "").trim().toLowerCase();
  // Truncated input must not throw: flush what can be decoded.
  if (enc === "gzip" || enc === "x-gzip") return zlib.createGunzip({ finishFlush: zlib.constants.Z_SYNC_FLUSH });
  if (enc === "deflate") return zlib.createInflate({ finishFlush: zlib.constants.Z_SYNC_FLUSH });
  if (enc === "br") return zlib.createBrotliDecompress({ finishFlush: zlib.constants.BROTLI_OPERATION_FLUSH });
  if (enc === "zstd" && zstd.createZstdDecompress) return zstd.createZstdDecompress();
  if (enc === "" || enc === "identity") return null;
  throw new FetchkeepError("unsupported_content_type", `Unsupported content-encoding: ${enc}`);
}

function flattenHeaders(h: Record<string, string | string[] | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(h)) {
    if (v === undefined) continue;
    out[k.toLowerCase()] = Array.isArray(v) ? v.join(", ") : v;
  }
  return out;
}

/** Decodes an HTML/text body using header charset, BOM or `<meta charset>`; defaults to UTF-8. */
export function decodeText(body: Uint8Array, contentTypeHeader: string | undefined, sniffHtml: boolean): string {
  let label = /charset\s*=\s*"?([\w.:-]+)/i.exec(contentTypeHeader ?? "")?.[1];
  if (body[0] === 0xef && body[1] === 0xbb && body[2] === 0xbf) label = "utf-8";
  else if (body[0] === 0xff && body[1] === 0xfe) label = "utf-16le";
  else if (body[0] === 0xfe && body[1] === 0xff) label = "utf-16be";
  else if (!label && sniffHtml) {
    const head = Buffer.from(body.subarray(0, 4096)).toString("latin1");
    label = /<meta[^>]+charset\s*=\s*["']?([\w.:-]+)/i.exec(head)?.[1];
  }
  try {
    return new TextDecoder(label ?? "utf-8").decode(body);
  } catch {
    return new TextDecoder("utf-8").decode(body);
  }
}
