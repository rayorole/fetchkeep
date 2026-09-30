import { FetchkeepError } from "../errors.js";
import { decodeText } from "../http.js";
import type { ExtractedDocument } from "../schema.js";
import { extractHtml } from "./html.js";
import { extractPdf } from "./pdf.js";
import { extractText } from "./text.js";

export type ContentKind = "html" | "pdf" | "text";

export function classifyContent(contentType: string, body: Uint8Array): ContentKind | null {
  const ct = contentType.toLowerCase();
  if (ct === "text/html" || ct === "application/xhtml+xml") return "html";
  if (ct === "application/pdf" || ct === "application/x-pdf") return "pdf";
  if (ct.startsWith("text/") || /\+?(json|xml)$/.test(ct) || ct === "application/javascript") return "text";
  if (!ct || ct === "application/octet-stream" || ct === "binary/octet-stream") {
    const head = Buffer.from(body.subarray(0, 512)).toString("latin1").trimStart();
    if (head.startsWith("%PDF-")) return "pdf";
    if (/^<(!doctype html|html|head|body)/i.test(head)) return "html";
  }
  return null;
}

export interface ExtractInput {
  body: Uint8Array;
  contentType: string;
  /** Raw Content-Type header value, used for charset detection. */
  contentTypeHeader?: string;
  url: string;
}

export async function extractContent(input: ExtractInput): Promise<ExtractedDocument> {
  const kind = classifyContent(input.contentType, input.body);
  try {
    switch (kind) {
      case "html":
        return extractHtml(decodeText(input.body, input.contentTypeHeader, true), { url: input.url });
      case "pdf":
        return await extractPdf(input.body);
      case "text":
        return extractText(decodeText(input.body, input.contentTypeHeader, false), input.contentType);
      default:
        throw new FetchkeepError("unsupported_content_type", `Cannot extract content of type "${input.contentType || "unknown"}"`, {
          hint: "Supported: HTML, text-based PDF, plain text, Markdown, JSON and XML.",
        });
    }
  } catch (err) {
    if (err instanceof FetchkeepError) throw err;
    throw new FetchkeepError("extraction_failed", `Extraction failed: ${(err as Error).message}`, { cause: err });
  }
}
