import { z } from "zod";
import { ERROR_CODES } from "./errors.js";
import { BACKENDS, FETCH_MODES } from "./modes.js";

export const BackendName = z.enum(BACKENDS);
export type BackendName = z.infer<typeof BackendName>;

export const FetchMode = z.enum(FETCH_MODES);
export type FetchMode = z.infer<typeof FetchMode>;

export const BlockType = z.enum(["heading", "paragraph", "list", "table", "code", "quote", "other"]);
export type BlockType = z.infer<typeof BlockType>;

export const Block = z.object({
  /** Stable within a document version: `b1`, `b2`, … in reading order. */
  id: z.string(),
  type: BlockType,
  level: z.number().int().optional(),
  lang: z.string().optional(),
  page: z.number().int().optional(),
  /** Plain text suitable for exact quotation. */
  text: z.string(),
  markdown: z.string(),
  /** Short SHA-256 of type + markdown. */
  hash: z.string(),
  /** Character offset of this block inside the document Markdown. */
  offset: z.number().int(),
});
export type Block = z.infer<typeof Block>;

export const Link = z.object({ href: z.string(), text: z.string() });
export type Link = z.infer<typeof Link>;

export const ExtractionStrategy = z.enum(["readability", "structural", "pdf", "text"]);
export type ExtractionStrategy = z.infer<typeof ExtractionStrategy>;

/** Signals used by the auto-mode escalation heuristic. Only present for HTML. */
export const RenderSignals = z.object({
  bodyTextChars: z.number(),
  extractedChars: z.number(),
  scriptCount: z.number(),
  externalScriptCount: z.number(),
  inlineScriptChars: z.number(),
  appRootEmpty: z.boolean(),
  noscriptWarning: z.boolean(),
});
export type RenderSignals = z.infer<typeof RenderSignals>;

export const ExtractedDocument = z.object({
  title: z.string(),
  lang: z.string().optional(),
  siteName: z.string().optional(),
  byline: z.string().optional(),
  description: z.string().optional(),
  publishedAt: z.string().optional(),
  canonicalUrl: z.string().optional(),
  markdown: z.string(),
  blocks: z.array(Block),
  /** Links found inside the extracted content. */
  links: z.array(Link),
  /** All same-document anchors (including navigation), used for crawling. */
  outlinks: z.array(z.string()),
  strategy: ExtractionStrategy,
  extractorVersion: z.string(),
  warnings: z.array(z.string()),
  stats: z.object({ chars: z.number(), words: z.number(), headings: z.number(), tables: z.number(), codeBlocks: z.number(), pages: z.number().optional() }),
  signals: RenderSignals.optional(),
});
export type ExtractedDocument = z.infer<typeof ExtractedDocument>;

export const ErrorInfoSchema = z.object({
  code: z.enum(ERROR_CODES),
  message: z.string(),
  retryable: z.boolean(),
  hint: z.string().optional(),
  details: z.record(z.string(), z.unknown()).optional(),
});

export const Attempt = z.object({
  backend: BackendName,
  outcome: z.enum(["success", "insufficient", "failed", "unavailable", "skipped"]),
  reason: z.string().optional(),
  errorCode: z.enum(ERROR_CODES).optional(),
  httpStatus: z.number().int().optional(),
  durationMs: z.number(),
});
export type Attempt = z.infer<typeof Attempt>;

export const BackendInfo = z.object({
  mode: FetchMode,
  used: BackendName.nullable(),
  escalated: z.boolean(),
  attempts: z.array(Attempt),
});
export type BackendInfo = z.infer<typeof BackendInfo>;

export const DocumentRef = z.object({
  /** Stable document id (per workspace), e.g. `d_3f2a…`. */
  id: z.string(),
  version: z.number().int(),
  /** `fk:<id>@<version>` */
  ref: z.string(),
  requestedUrl: z.string(),
  finalUrl: z.string(),
  title: z.string(),
  contentType: z.string(),
  httpStatus: z.number().int(),
  fetchedAt: z.string(),
  contentHash: z.string(),
  rawHash: z.string().nullable(),
  extractorVersion: z.string(),
  strategy: ExtractionStrategy,
  backend: BackendName,
  saved: z.boolean(),
  unchanged: z.boolean().optional(),
});
export type DocumentRef = z.infer<typeof DocumentRef>;

export const Citation = z.object({
  ref: z.string(),
  url: z.string(),
  title: z.string(),
  fetchedAt: z.string(),
  version: z.number().int(),
  contentHash: z.string(),
  blockId: z.string().optional(),
  blockHash: z.string().optional(),
  quote: z.string().optional(),
});
export type Citation = z.infer<typeof Citation>;

export const Truncation = z.object({
  truncated: z.boolean(),
  /** Why output or input was cut: output budget, response-size limits while downloading, or the extraction prompt budget. */
  reasons: z.array(z.enum(["output_budget", "compressed_limit", "decompressed_limit", "page_limit", "prompt_budget"])),
  totalChars: z.number().int(),
  returnedChars: z.number().int(),
  offset: z.number().int(),
  nextOffset: z.number().int().nullable(),
});
export type Truncation = z.infer<typeof Truncation>;

export const ContentPayload = z.object({
  format: z.literal("markdown"),
  text: z.string(),
  blocks: z.array(Block).optional(),
});

export const Envelope = z.object({
  status: z.enum(["success", "partial", "error"]),
  tool: z.string(),
  document: DocumentRef.optional(),
  citation: Citation.optional(),
  content: ContentPayload.optional(),
  backend: BackendInfo.optional(),
  truncation: Truncation.optional(),
  timings: z.record(z.string(), z.number()),
  warnings: z.array(z.string()),
  error: ErrorInfoSchema.optional(),
  /** Tool-specific payload (search results, crawl summary, extraction result …). */
  data: z.unknown().optional(),
});
export type Envelope = z.infer<typeof Envelope>;
