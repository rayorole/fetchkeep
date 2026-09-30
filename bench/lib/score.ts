/**
 * Engine-neutral quality scoring. Every engine's Markdown is scored with exactly the same functions.
 * Scores are in [0, 1]; `null` means "not applicable to this case".
 */
import type { FetchCase } from "./types.ts";

const ENTITIES: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&nbsp;": " " };

/** Markdown → comparable plain text: drops link targets and markup characters, lower-cases, collapses whitespace. */
export function plain(md: string): string {
  return md
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (e) => ENTITIES[e] ?? e)
    .replace(/\\([\\`*_{}[\]()#+\-.!|>~])/g, "$1")
    .replace(/[*_`#>|~]/g, " ")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function norm(s: string): string {
  return plain(s);
}

export function containsPassage(outputPlain: string, passage: string): boolean {
  return outputPlain.includes(norm(passage));
}

export function words(s: string): string[] {
  return s.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
}

/** Multiset token overlap precision/recall/F1 against a gold text (CleanEval-style bag-of-words). */
export function tokenPRF(output: string, gold: string): { precision: number; recall: number; f1: number } {
  const out = words(plain(output));
  const ref = words(gold);
  if (out.length === 0 || ref.length === 0) return { precision: 0, recall: 0, f1: 0 };
  const counts = new Map<string, number>();
  for (const w of ref) counts.set(w, (counts.get(w) ?? 0) + 1);
  let overlap = 0;
  for (const w of out) {
    const c = counts.get(w) ?? 0;
    if (c > 0) {
      overlap++;
      counts.set(w, c - 1);
    }
  }
  const precision = overlap / out.length;
  const recall = overlap / ref.length;
  return { precision, recall, f1: precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall) };
}

/** Heading lines, ATX (`## x`) or setext (`x` followed by `===`/`---`). */
export function headingTexts(md: string): string[] {
  const lines = md.split(/\r?\n/);
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const atx = /^\s{0,3}#{1,6}\s+(.*?)\s*#*\s*$/.exec(line);
    if (atx) out.push(norm(atx[1]!));
    else if (line.trim() && /^\s{0,3}(=+|-+)\s*$/.test(lines[i + 1] ?? "") && !/^\s*[-*+]\s/.test(line)) out.push(norm(line));
  }
  return out;
}

/** A table row is preserved when one Markdown table line contains all its cells, in order, as separate cells. */
export function tableRowPreserved(md: string, row: string[]): boolean {
  const want = row.map(norm);
  for (const line of md.split(/\r?\n/)) {
    if (!line.includes("|")) continue;
    const cells = line
      .replace(/\\\|/g, "\u0000")
      .split("|")
      .map((c) => norm(c.replace(/\u0000/g, "|")))
      .filter((c) => c.length > 0);
    let j = 0;
    for (const c of cells) if (j < want.length && c === want[j]) j++;
    if (j === want.length) return true;
  }
  return false;
}

/**
 * A code block is preserved when its lines appear consecutively inside a fenced (``` / ~~~) or indented block,
 * byte-for-byte except trailing whitespace and a constant indentation prefix.
 */
export function codePreserved(md: string, code: string): boolean {
  const lines = md.split(/\r?\n/).map((l) => l.replace(/\s+$/, ""));
  const want = code.split("\n").map((l) => l.replace(/\s+$/, ""));
  let inFence = false;
  const fenced: boolean[] = lines.map((l) => {
    if (/^\s*(```|~~~)/.test(l)) {
      inFence = !inFence;
      return false;
    }
    return inFence || /^( {4}|\t)/.test(l);
  });
  for (let i = 0; i < lines.length; i++) {
    const first = lines[i]!;
    if (!fenced[i] || !first.endsWith(want[0]!)) continue;
    const prefix = first.slice(0, first.length - want[0]!.length);
    if (prefix.trim() !== "") continue;
    let ok = true;
    for (let k = 1; k < want.length; k++) {
      const got = lines[i + k];
      const exp = want[k]!;
      if (got === undefined || (exp === "" ? got.trim() !== "" : got !== prefix + exp) || !fenced[i + k]) {
        ok = false;
        break;
      }
    }
    if (ok) return true;
  }
  return false;
}

export interface CaseScores {
  passageRecall: number | null;
  boilerplateExclusion: number | null;
  tokenPrecision: number | null;
  tokenRecall: number | null;
  tokenF1: number | null;
  headings: number | null;
  tables: number | null;
  code: number | null;
  usable: number | null;
  correctError: number | null;
  citation: number | null;
}

/** Usable = returned content that contains at least 75% of the annotated key passages. */
export const USABLE_RECALL = 0.75;

export function scoreFetch(c: FetchCase, ok: boolean, markdown: string, gold: string | null): CaseScores {
  const empty: CaseScores = {
    passageRecall: null,
    boilerplateExclusion: null,
    tokenPrecision: null,
    tokenRecall: null,
    tokenF1: null,
    headings: null,
    tables: null,
    code: null,
    usable: null,
    correctError: null,
    citation: null,
  };
  if (c.expectError) return { ...empty, correctError: ok ? 0 : 1 };
  const mustContain = c.mustContain ?? [];
  const mustNotContain = c.mustNotContain ?? [];
  const text = ok ? markdown : "";
  const p = plain(text);
  const frac = (n: number, d: number) => (d === 0 ? null : n / d);
  const passageRecall = frac(mustContain.filter((s) => containsPassage(p, s)).length, mustContain.length);
  const leaked = mustNotContain.filter((s) => containsPassage(p, s)).length;
  const heads = headingTexts(text);
  const s: CaseScores = {
    ...empty,
    passageRecall,
    boilerplateExclusion: mustNotContain.length ? 1 - leaked / mustNotContain.length : null,
    headings: c.headings?.length ? frac(c.headings.filter((h) => heads.includes(norm(h))).length, c.headings.length) : null,
    tables: c.tables?.length ? frac(c.tables.flatMap((t) => t.rows).filter((r) => tableRowPreserved(text, r)).length, c.tables.flatMap((t) => t.rows).length) : null,
    code: c.code?.length ? frac(c.code.filter((k) => codePreserved(text, k)).length, c.code.length) : null,
    usable: ok && text.trim().length > 0 && (passageRecall ?? 1) >= USABLE_RECALL ? 1 : 0,
  };
  if (gold !== null) {
    const prf = tokenPRF(text, gold);
    s.tokenPrecision = prf.precision;
    s.tokenRecall = prf.recall;
    s.tokenF1 = prf.f1;
  }
  return s;
}
