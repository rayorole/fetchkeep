import type { ExtractedDocument } from "../schema.js";
import { EXTRACTOR_VERSION } from "../../version.js";
import { buildDocument, normalizeText, type RawBlock } from "./blocks.js";
import { statsFor } from "./html.js";

/** Plain text / Markdown / JSON / XML bodies: split on blank lines; Markdown headings and fences are recognised. */
export function extractText(body: string, contentType: string): ExtractedDocument {
  const raw: RawBlock[] = [];
  const text = body.replace(/\r\n?/g, "\n");
  if (/json|xml|javascript|csv/.test(contentType)) {
    const lang = /json/.test(contentType) ? "json" : /xml/.test(contentType) ? "xml" : /csv/.test(contentType) ? "csv" : "javascript";
    const code = text.replace(/\s+$/, "");
    raw.push({ type: "code", lang, text: code, markdown: `\`\`\`${lang}\n${code}\n\`\`\`` });
  } else {
    const markdownish = /markdown/.test(contentType);
    const lines = text.split("\n");
    let buf: string[] = [];
    let fence: string | null = null;
    const flush = () => {
      const chunk = buf.join("\n").replace(/\s+$/, "");
      buf = [];
      if (!chunk.trim()) return;
      const heading = markdownish ? /^(#{1,6})\s+(.*)$/.exec(chunk) : null;
      if (heading && !chunk.includes("\n")) {
        raw.push({ type: "heading", level: heading[1]!.length, text: normalizeText(heading[2]!), markdown: chunk });
      } else if (markdownish && /^(```|~~~)/.test(chunk)) {
        const body = chunk.split("\n").slice(1, -1).join("\n");
        const lang = /^(?:```|~~~)\s*([\w+#.-]*)/.exec(chunk)?.[1] ?? "";
        const block: RawBlock = { type: "code", text: body, markdown: chunk };
        if (lang) block.lang = lang;
        raw.push(block);
      } else {
        raw.push({ type: "paragraph", text: normalizeText(chunk), markdown: chunk });
      }
    };
    for (const line of lines) {
      if (fence) {
        buf.push(line);
        if (line.trim().startsWith(fence)) {
          fence = null;
          flush();
        }
        continue;
      }
      if (markdownish && /^(```|~~~)/.test(line.trim())) {
        flush();
        fence = line.trim().slice(0, 3);
        buf.push(line);
        continue;
      }
      if (!line.trim()) flush();
      else buf.push(line);
    }
    flush();
  }
  const built = buildDocument(raw);
  const first = raw.find((b) => b.type === "heading")?.text ?? raw[0]?.text.slice(0, 120) ?? "";
  return {
    title: first,
    markdown: built.markdown,
    blocks: built.blocks,
    links: [],
    outlinks: [],
    strategy: "text",
    extractorVersion: EXTRACTOR_VERSION,
    warnings: [],
    stats: statsFor(built.blocks, built.text),
  };
}
