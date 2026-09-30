import type { FetchkeepError } from "./errors.js";
import type { ExtractedDocument } from "./schema.js";

export interface EscalationDecision {
  escalate: boolean;
  reason: string;
}

/** Thresholds of the auto-mode heuristic (see docs/browsers.md). */
export const ESCALATION = {
  /** Below this many extracted characters a scripted page is treated as not rendered. */
  minChars: 200,
  /** An empty SPA root (`#root`, `#__next`, …) escalates while extracted text is below this. */
  spaRootChars: 1000,
  /** A "JavaScript required" notice escalates while extracted text is below this. */
  noscriptChars: 1500,
  /** HTTP statuses that often mean a JavaScript challenge or bot wall rather than a real error. */
  challengeStatuses: [403, 429, 503] as number[],
};

/**
 * Decides whether an HTTP result looks incomplete enough that a JavaScript-capable browser should be tried.
 * Purely deterministic; uses only signals recorded during extraction.
 */
export function shouldEscalate(doc: ExtractedDocument | null, error: FetchkeepError | null): EscalationDecision {
  if (error) {
    const status = error.details?.status;
    if (error.code === "http_error" && typeof status === "number" && ESCALATION.challengeStatuses.includes(status)) {
      return { escalate: true, reason: `HTTP ${status} may be a JavaScript challenge` };
    }
    return { escalate: false, reason: `HTTP attempt failed with ${error.code}` };
  }
  if (!doc) return { escalate: false, reason: "no document" };
  const s = doc.signals;
  if (!s) return { escalate: false, reason: `${doc.strategy} content does not need a browser` };
  if (s.appRootEmpty && s.extractedChars < ESCALATION.spaRootChars) {
    return { escalate: true, reason: `empty single-page-app root and only ${s.extractedChars} chars extracted` };
  }
  if (s.noscriptWarning && s.extractedChars < ESCALATION.noscriptChars) {
    return { escalate: true, reason: `page states JavaScript is required and only ${s.extractedChars} chars extracted` };
  }
  if (s.extractedChars < ESCALATION.minChars && s.scriptCount > 0) {
    return { escalate: true, reason: `only ${s.extractedChars} chars extracted from a page with ${s.scriptCount} scripts` };
  }
  return { escalate: false, reason: `${s.extractedChars} chars extracted; content looks complete` };
}
