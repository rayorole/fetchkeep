import { setTimeout as sleep } from "node:timers/promises";
import type { RenderRequest } from "./provider.js";

export interface ContentSnapshot {
  signature: number;
  meaningful: boolean;
  pending: boolean;
  scripted: boolean;
  html: string;
}

/** Runs in the page in either backend. Only serialization creates nodes, in a detached, inert document. */
export function inspectDocument(serialize: boolean): ContentSnapshot {
  const children = (node: Node): ArrayLike<Node> => {
    if (node.nodeType === 1) {
      const el = node as Element;
      if (el.shadowRoot) return el.shadowRoot.childNodes;
      if (el.localName === "slot" && typeof (el as HTMLSlotElement).assignedNodes === "function") {
        const assigned = (el as HTMLSlotElement).assignedNodes({ flatten: true });
        if (assigned.length) return assigned;
      }
    }
    return node.childNodes;
  };
  const result: ContentSnapshot = { signature: 2166136261, meaningful: false, pending: false, scripted: false, html: "" };
  if (serialize) {
    // Most pages have no shadow roots: keep their native serialization and avoid cloning the DOM.
    const walker = document.createTreeWalker(document.documentElement, 1);
    let hasShadow = !!document.documentElement.shadowRoot;
    while (!hasShadow && walker.nextNode()) hasShadow = !!(walker.currentNode as Element).shadowRoot;
    if (!hasShadow) {
      result.html = document.documentElement.outerHTML;
      return result;
    }
    const inert = document.implementation.createHTMLDocument("");
    const root = inert.importNode(document.documentElement, false);
    const pending: { source: Node; target: Node }[] = [{ source: document.documentElement, target: root }];
    while (pending.length) {
      const { source, target } = pending.pop()!;
      const nodes = children(source);
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i]!;
        const copy = inert.importNode(node, false);
        target.appendChild(copy);
        if (node.nodeType === 1) pending.push({ source: node, target: copy });
      }
    }
    result.html = root.outerHTML;
    return result;
  }

  result.scripted = document.querySelector("script:not([type]), script[type=''], script[type='module'], script[type='text/javascript'], script[type='application/javascript']") !== null;
  let chars = 0;
  let hasCode = false;
  let hasParagraph = false;
  const primary = document.querySelector("main, [role='main']") ?? document.querySelector("article");
  const nodes: Node[] = [primary ?? document.body ?? document.documentElement];
  while (nodes.length) {
    const node = nodes.pop()!;
    if (node.nodeType === 3) {
      const text = node.textContent?.trim() ?? "";
      if (!text) continue;
      chars += text.length;
      for (let i = 0; i < text.length; i++) result.signature = Math.imul(result.signature ^ text.charCodeAt(i), 16777619);
      // A short loading label is evidence of unfinished content, not a reason to wait on prose mentioning loading.
      if (text.length <= 100 && /^(?:loading\b|please wait\b|fetching\b|initializing\b|rendering\b)/i.test(text)) result.pending = true;
      continue;
    }
    if (node.nodeType !== 1) continue;
    const el = node as Element;
    if (/^(script|style|noscript|template|svg)$/i.test(el.localName) || el.hasAttribute("hidden") || el.getAttribute("aria-hidden") === "true") continue;
    if (/^(header|footer|nav|aside)$/i.test(el.localName) || /^(banner|navigation|contentinfo|complementary)$/.test(el.getAttribute("role") ?? "")) continue;
    if (el.getAttribute("aria-busy") === "true" || el.getAttribute("role") === "progressbar") result.pending = true;
    if ((el.localName === "pre" || el.localName === "code") && el.textContent?.trim()) hasCode = true;
    if (el.localName === "p") hasParagraph = true;
    const childNodes = children(el);
    for (let i = childNodes.length - 1; i >= 0; i--) nodes.push(childNodes[i]!);
  }
  result.meaningful = chars >= 80 || hasCode || (hasParagraph && (primary !== null ? chars > 0 : chars >= 40));
  return result;
}

/**
 * settleMs is a minimum observation window after load, not a second sleep after network-idle.
 * Script-driven empty pages and visible loading states may need the remaining request deadline.
 * Static short pages need only stable content and the minimum window; navigation/footer text is not readiness.
 */
export async function waitForContent(snapshot: () => Promise<ContentSnapshot>, req: RenderRequest): Promise<void> {
  const started = performance.now();
  const budget = Math.max(0, req.deadline - Date.now() - 250);
  let previous: number | undefined;
  let stableSince = started;
  while (performance.now() - started < budget) {
    req.signal.throwIfAborted();
    const state = await snapshot();
    const now = performance.now();
    if (previous !== state.signature) stableSince = now;
    previous = state.signature;
    if (now - started >= req.settleMs && (state.meaningful || !state.scripted) && !state.pending && now - stableSince >= 100) return;
    const remaining = Math.min(budget - (now - started), req.deadline - Date.now() - 250);
    if (remaining <= 0) break;
    await sleep(Math.min(100, remaining), undefined, { signal: req.signal });
  }
  req.signal.throwIfAborted();
}
