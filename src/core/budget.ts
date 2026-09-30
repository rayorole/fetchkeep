import type { Block } from "./schema.js";

export interface Slice {
  text: string;
  blocks: Block[];
  offset: number;
  nextOffset: number | null;
  totalChars: number;
  truncated: boolean;
}

/**
 * Returns at most `maxChars` of `markdown` starting at `offset`, cutting at a block boundary when one exists in the
 * window (so quotes are never split mid-block unless a single block exceeds the budget). `nextOffset` resumes
 * exactly where this slice ended.
 */
export function sliceMarkdown(markdown: string, blocks: Block[], offset: number, maxChars: number): Slice {
  const total = markdown.length;
  const start = Math.max(0, Math.min(offset, total));
  let end = Math.min(total, start + Math.max(1, maxChars));
  if (end < total) {
    // Prefer ending at the last block boundary inside the window.
    const boundary = [...blocks].reverse().find((b) => b.offset > start && b.offset <= end);
    if (boundary) end = boundary.offset;
  }
  const text = markdown.slice(start, end).replace(/\n+$/, "");
  const inWindow = blocks.filter((b) => b.offset + b.markdown.length > start && b.offset < end);
  return {
    text,
    blocks: inWindow,
    offset: start,
    nextOffset: end < total ? end : null,
    totalChars: total,
    truncated: start > 0 || end < total,
  };
}
