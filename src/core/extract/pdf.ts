import type { ExtractedDocument } from "../schema.js";
import { EXTRACTOR_VERSION } from "../../version.js";
import { buildDocument, normalizeText, type RawBlock } from "./blocks.js";
import { statsFor } from "./html.js";

export interface PdfExtractOptions {
  maxPages?: number;
}

interface Line {
  text: string;
  y: number;
  size: number;
  page: number;
}

interface TextItemLike {
  str: string;
  transform: number[];
  height: number;
  hasEOL: boolean;
}

/**
 * Text-layer PDF extraction with PDF.js. No rendering, no OCR, no PDF JavaScript (scripting is a viewer feature
 * PDF.js 6 no longer uses eval). Scanned/image-only PDFs yield no text and a warning.
 */
export async function extractPdf(data: Uint8Array, opts: PdfExtractOptions = {}): Promise<ExtractedDocument> {
  // Lazy: PDF.js is large and only needed for PDF responses; a static import slows every CLI start.
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = pdfjs.getDocument({
    data: new Uint8Array(data),
    disableFontFace: true,
    useSystemFonts: false,
    disableAutoFetch: true,
    isOffscreenCanvasSupported: false,
    stopAtErrors: false,
    verbosity: 0,
  });
  const pdf = await task.promise;
  const warnings: string[] = [];
  try {
    const maxPages = Math.min(pdf.numPages, opts.maxPages ?? 500);
    if (pdf.numPages > maxPages) warnings.push(`PDF has ${pdf.numPages} pages; extracted the first ${maxPages}`);
    const lines: Line[] = [];
    for (let p = 1; p <= maxPages; p++) {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      let current = "";
      let y = 0;
      let size = 0;
      for (const raw of content.items) {
        if (!("str" in raw)) continue;
        const item = raw as TextItemLike;
        if (!current) {
          y = item.transform[5] ?? 0;
          size = item.height || Math.abs(item.transform[3] ?? 0);
        }
        current += item.str;
        if (item.hasEOL) {
          lines.push({ text: current, y, size, page: p });
          current = "";
        }
      }
      if (current.trim()) lines.push({ text: current, y, size, page: p });
      page.cleanup();
    }

    const sizes = lines.filter((l) => l.text.trim()).map((l) => l.size).sort((a, b) => a - b);
    const median = sizes[Math.floor(sizes.length / 2)] ?? 10;
    const raw: RawBlock[] = [];
    let para: Line[] = [];
    const flush = () => {
      if (!para.length) return;
      const text = normalizeText(para.map((l) => l.text).join(" ").replace(/(\w)- (\w)/g, "$1$2"));
      const first = para[0]!;
      para = [];
      if (!text) return;
      if (first.size >= median * 1.2 && text.length < 200) {
        const level = first.size >= median * 1.6 ? 1 : 2;
        raw.push({ type: "heading", level, text, markdown: `${"#".repeat(level)} ${text}`, page: first.page });
      } else {
        raw.push({ type: "paragraph", text, markdown: text, page: first.page });
      }
    };
    let prev: Line | null = null;
    for (const line of lines) {
      if (!line.text.trim()) {
        flush();
        prev = null;
        continue;
      }
      if (prev) {
        const gap = Math.abs(prev.y - line.y);
        const sizeChange = Math.abs(prev.size - line.size) > 0.15 * Math.max(prev.size, line.size);
        if (line.page !== prev.page || sizeChange || gap > Math.max(prev.size, line.size) * 1.6) flush();
      }
      para.push(line);
      prev = line;
    }
    flush();

    const info = (await pdf.getMetadata().catch(() => null))?.info as { Title?: string; Author?: string; Language?: string } | undefined;
    const title = normalizeText(info?.Title ?? "") || raw.find((b) => b.type === "heading")?.text || raw[0]?.text.slice(0, 120) || "";
    if (raw.length === 0) warnings.push("PDF has no extractable text layer (scanned or image-only PDFs need OCR, which is not supported)");
    const built = buildDocument(raw);
    const doc: ExtractedDocument = {
      title,
      markdown: built.markdown,
      blocks: built.blocks,
      links: [],
      outlinks: [],
      strategy: "pdf",
      extractorVersion: EXTRACTOR_VERSION,
      warnings,
      stats: { ...statsFor(built.blocks, built.text), pages: pdf.numPages },
    };
    if (info?.Author) doc.byline = info.Author;
    if (info?.Language) doc.lang = info.Language;
    return doc;
  } finally {
    await task.destroy();
  }
}
