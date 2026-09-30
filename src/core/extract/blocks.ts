import { shortHash } from "../hash.js";
import type { Block, BlockType } from "../schema.js";

export interface RawBlock {
  type: BlockType;
  text: string;
  markdown: string;
  level?: number;
  lang?: string;
  page?: number;
}

export interface BuiltDocument {
  markdown: string;
  text: string;
  blocks: Block[];
}

export const BLOCK_SEPARATOR = "\n\n";

export function normalizeText(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

const BREAKING: Record<string, true> = {
  BR: true, P: true, DIV: true, LI: true, UL: true, OL: true, TR: true, TD: true, TH: true, H1: true, H2: true, H3: true,
  H4: true, H5: true, H6: true, PRE: true, BLOCKQUOTE: true, SECTION: true, ARTICLE: true, DT: true, DD: true, TABLE: true,
  HR: true, FIGCAPTION: true, FIGURE: true, DL: true, HEADER: true, FOOTER: true, MAIN: true, ASIDE: true, NAV: true,
};

/** Visible text of a node with whitespace inserted at element boundaries that break lines (`<br>`, `<li>`, …). */
export function textOf(node: Node): string {
  const parts: string[] = [];
  const walk = (n: Node) => {
    if (n.nodeType === 3) {
      parts.push(n.textContent ?? "");
      return;
    }
    if (n.nodeType !== 1) return;
    const brk = BREAKING[n.nodeName.toUpperCase()] === true;
    if (brk) parts.push(" ");
    for (const c of n.childNodes) walk(c);
    if (brk) parts.push(" ");
  };
  walk(node);
  return normalizeText(parts.join(""));
}

/**
 * Assigns ids, hashes and offsets. The document Markdown is exactly the block Markdown joined with a blank line, so
 * `markdown.slice(block.offset, block.offset + block.markdown.length) === block.markdown` always holds.
 */
export function buildDocument(raw: RawBlock[]): BuiltDocument {
  const blocks: Block[] = [];
  let offset = 0;
  for (const r of raw) {
    if (!r.markdown) continue;
    const b: Block = {
      id: `b${blocks.length + 1}`,
      type: r.type,
      text: r.text,
      markdown: r.markdown,
      hash: shortHash(`${r.type}\n${r.markdown}`),
      offset,
    };
    if (r.level !== undefined) b.level = r.level;
    if (r.lang) b.lang = r.lang;
    if (r.page !== undefined) b.page = r.page;
    blocks.push(b);
    offset += r.markdown.length + BLOCK_SEPARATOR.length;
  }
  return {
    markdown: blocks.map((b) => b.markdown).join(BLOCK_SEPARATOR),
    text: blocks.map((b) => b.text).join("\n\n"),
    blocks,
  };
}
