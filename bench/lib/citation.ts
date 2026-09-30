export interface CitationMatch {
  quote: string;
  offset: number;
  blockId: string;
  citation: { ref: string; version: number; contentHash: string; blockId?: string; blockHash?: string };
}
export interface CitationRead {
  status: string;
  document?: { ref: string; version: number; contentHash: string };
  content?: { blocks?: { id: string; text: string; hash: string }[] };
}

/** Check the exact persisted source span and version identity, not formatting in rendered Markdown. */
export function citationVerified(match: CitationMatch, reopened: CitationRead | undefined, requested: string): boolean {
  const normalize = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
  if (!reopened || reopened.status === "error" || !requested.trim() || normalize(match.quote) !== normalize(requested)) return false;
  if (!Number.isSafeInteger(match.offset) || match.offset < 0) return false;
  if (reopened.document?.version !== match.citation.version || reopened.document.contentHash !== match.citation.contentHash) return false;
  if (match.citation.ref !== `${reopened.document.ref}#${match.blockId}`) return false;
  const block = reopened.content?.blocks?.find((b) => b.id === match.blockId && b.id === match.citation.blockId);
  return !!block && block.hash === match.citation.blockHash && block.text.slice(match.offset, match.offset + match.quote.length) === match.quote;
}
