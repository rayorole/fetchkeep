import { Readability, isProbablyReaderable } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import type TurndownService from "turndown";
import type { Block, BlockType, ExtractedDocument, Link, RenderSignals } from "../schema.js";
import { EXTRACTOR_VERSION } from "../../version.js";
import { buildDocument, normalizeText, textOf, type RawBlock } from "./blocks.js";
import { codeLanguage, codeText, createTurndown, rowCells, tableRows } from "./markdown.js";

/** Elements that never carry readable content. Removed before any extraction. */
const ALWAYS_REMOVE = "script,style,noscript,template,iframe,object,embed,canvas,svg,link,meta,dialog";
/** Page chrome removed by the structural extractor. */
const CHROME = [
  "nav",
  "aside",
  "form",
  "button",
  "input",
  "select",
  "textarea",
  "[role=navigation]",
  "[role=banner]",
  "[role=contentinfo]",
  "[role=complementary]",
  "[role=search]",
  "[aria-hidden=true]",
  "[hidden]",
].join(",");
const NOISE_RE =
  /(?:^|[\s_-])(nav|navbar|navigation|menu|sidebar|side-bar|breadcrumbs?|cookie|consent|gdpr|advert|advertisement|ads|sponsor|social|share|sharing|related|newsletter|subscribe|popup|modal|skip|skip-link|footer|masthead|toolbar|pagination|comments?|toc|table-of-contents)(?:$|[\s_-])/i;
const HIDDEN_STYLE_RE = /display\s*:\s*none|visibility\s*:\s*hidden/i;
const JS_REQUIRED_RE = /(enable|requires?|turn on|activate)\s+javascript|javascript\s+(is\s+)?(disabled|required|must be enabled)/i;
const APP_ROOTS = "#root,#app,#__next,#__nuxt,#svelte,[data-reactroot],app-root,[ng-app],[ng-version]";

const LEAF: Record<string, BlockType> = {
  H1: "heading",
  H2: "heading",
  H3: "heading",
  H4: "heading",
  H5: "heading",
  H6: "heading",
  P: "paragraph",
  PRE: "code",
  TABLE: "table",
  UL: "list",
  OL: "list",
  DL: "list",
  MENU: "list",
  BLOCKQUOTE: "quote",
  FIGURE: "paragraph",
  ADDRESS: "paragraph",
};
const INLINE: Record<string, true> = {
  A: true, ABBR: true, B: true, BDI: true, BDO: true, BR: true, CITE: true, CODE: true, DATA: true, DFN: true, EM: true, I: true,
  IMG: true, KBD: true, LABEL: true, MARK: true, Q: true, S: true, SAMP: true, SMALL: true, SPAN: true, STRONG: true, SUB: true,
  SUP: true, TIME: true, U: true, VAR: true, WBR: true, DEL: true, INS: true, STRIKE: true, FONT: true, TT: true, BIG: true,
};
const SKIP: Record<string, true> = { HR: true, BR: true, HEAD: true, TITLE: true };
/** Above these element counts Readability is not run (see extractHtml). */
export const READABILITY_MAX_ELEMENTS = 10_000;
export const READABILITY_SEMANTIC_MAX_ELEMENTS = 5_000;
const PERMALINK_TEXT: Record<string, true> = { "": true, "¶": true, "#": true, "§": true, "🔗": true, "⚓": true, "link": true };
const TITLE_SEPARATORS = [" | ", " - ", " — ", " – ", " · ", " :: "];

export interface HtmlExtractOptions {
  /** URL the HTML was served from (after redirects); used to resolve relative links. */
  url: string;
}

export function extractHtml(html: string, opts: HtmlExtractOptions): ExtractedDocument {
  const td = createTurndown();
  const { document } = parseHTML(html);
  const baseUrl = resolveBase(document, opts.url);
  const signals = collectSignals(document);
  const meta = readMetadata(document, baseUrl);

  absolutize(document, baseUrl);
  const outlinks = collectOutlinks(document);
  for (const el of [...document.querySelectorAll(ALWAYS_REMOVE)]) el.remove();
  removePermalinks(document);
  const elementCount = document.querySelectorAll("*").length;

  // Candidate 1: structural main-content extraction.
  const { root: structural, semantic } = structuralRoot(document);

  // Candidate 2: Readability on an independent copy (it mutates the DOM).
  const warnings: string[] = [];
  let readable: Element | null = null;
  let byline: string | undefined;
  let readableTitle: string | undefined;
  // Readability's scoring is super-linear: on very large pages (specifications, long references) it costs seconds
  // and hundreds of MB. It is skipped above READABILITY_MAX_ELEMENTS, and above READABILITY_SEMANTIC_MAX_ELEMENTS
  // when the page marks its main content (<main>/<article>), where the structural result is reliable.
  const runReadability = elementCount <= (semantic ? READABILITY_SEMANTIC_MAX_ELEMENTS : READABILITY_MAX_ELEMENTS);
  if (runReadability) {
    try {
      const copy = parseHTML(html).document;
      absolutize(copy, baseUrl);
      for (const el of [...copy.querySelectorAll(ALWAYS_REMOVE)]) el.remove();
      removePermalinks(copy);
      for (const h of copy.querySelectorAll("h1")) h.setAttribute("data-fk-h1", "");
      if (isProbablyReaderable(copy as unknown as Document, { minContentLength: 140, minScore: 20 })) {
        const article = new Readability<Element>(copy as unknown as Document, {
          keepClasses: true,
          charThreshold: 200,
          serializer: (n) => n as Element,
        }).parse();
        readable = article?.content ?? null;
        if (readable) restoreH1(readable);
        byline = article?.byline ?? undefined;
        readableTitle = article?.title ? normalizeText(article.title) : undefined;
      }
    } catch (err) {
      warnings.push(`readability failed: ${(err as Error).message}`);
    }
  }

  const sStats = domStats(structural);
  const rStats = readable ? domStats(readable) : null;
  const threshold = semantic ? 0.7 : 0.3;
  const useReadability =
    rStats !== null &&
    rStats.chars >= 200 &&
    rStats.chars >= threshold * sStats.chars &&
    rStats.tables >= sStats.tables &&
    rStats.pre >= sStats.pre;
  const chosen = useReadability ? readable! : structural;

  const raw = walkBlocks(chosen, td);
  // Readability drops an <h1> that duplicates the title; restore it (or the page title) as the level-1 heading.
  const headingTitle =
    (useReadability ? meta.h1 || (readableTitle && headingFromTitle(readableTitle, meta.siteName)) : undefined) ||
    headingFromTitle(meta.title, meta.siteName);
  if (headingTitle && !raw.some((b) => b.type === "heading" && b.level === 1)) {
    raw.unshift({ type: "heading", level: 1, text: headingTitle, markdown: `# ${headingTitle}` });
  }
  if (raw.length === 0) warnings.push("no readable content found in HTML");

  const links = collectLinks(chosen);
  const built = buildDocument(raw);
  signals.extractedChars = built.text.length;

  const doc: ExtractedDocument = {
    title: meta.title,
    markdown: built.markdown,
    blocks: built.blocks,
    links,
    outlinks,
    strategy: useReadability ? "readability" : "structural",
    extractorVersion: EXTRACTOR_VERSION,
    warnings,
    stats: statsFor(built.blocks, built.text),
    signals,
  };
  if (meta.lang) doc.lang = meta.lang;
  if (meta.siteName) doc.siteName = meta.siteName;
  if (byline ?? meta.author) doc.byline = (byline ?? meta.author)!;
  if (meta.description) doc.description = meta.description;
  if (meta.publishedAt) doc.publishedAt = meta.publishedAt;
  if (meta.canonical) doc.canonicalUrl = meta.canonical;
  return doc;
}

export function statsFor(blocks: Block[], text: string): ExtractedDocument["stats"] {
  return {
    chars: text.length,
    words: text.split(/\s+/).filter(Boolean).length,
    headings: blocks.filter((b) => b.type === "heading").length,
    tables: blocks.filter((b) => b.type === "table").length,
    codeBlocks: blocks.filter((b) => b.type === "code").length,
  };
}

function resolveBase(document: Document, url: string): string {
  const href = document.querySelector("base[href]")?.getAttribute("href");
  if (href) {
    try {
      return new URL(href, url).href;
    } catch {
      // ignore invalid <base>
    }
  }
  return url;
}

function collectSignals(document: Document): RenderSignals {
  const body = document.body;
  const scripts = document.querySelectorAll("script");
  let noscriptWarning = false;
  for (const ns of document.querySelectorAll("noscript")) {
    if (JS_REQUIRED_RE.test(ns.textContent ?? "")) noscriptWarning = true;
  }
  let bodyText = "";
  if (body) {
    const clone = body.cloneNode(true) as HTMLElement;
    for (const el of [...clone.querySelectorAll("script,style,noscript,template")]) el.remove();
    bodyText = normalizeText(clone.textContent ?? "");
    if (bodyText.length < 400 && JS_REQUIRED_RE.test(bodyText)) noscriptWarning = true;
  }
  let appRootEmpty = false;
  for (const el of document.querySelectorAll(APP_ROOTS)) {
    if (normalizeText(el.textContent ?? "").length < 200) appRootEmpty = true;
  }
  let external = 0;
  let inlineChars = 0;
  for (const s of scripts) {
    const type = (s.getAttribute("type") ?? "").toLowerCase();
    if (type && !/javascript|module|json/.test(type)) continue;
    if (s.hasAttribute("src")) external++;
    else inlineChars += (s.textContent ?? "").length;
  }
  return {
    bodyTextChars: bodyText.length,
    extractedChars: 0,
    scriptCount: scripts.length,
    externalScriptCount: external,
    inlineScriptChars: inlineChars,
    appRootEmpty,
    noscriptWarning,
  };
}

interface PageMeta {
  title: string;
  h1?: string;
  lang?: string;
  siteName?: string;
  author?: string;
  description?: string;
  publishedAt?: string;
  canonical?: string;
}

function readMetadata(document: Document, baseUrl: string): PageMeta {
  const metaContent = (sel: string) => document.querySelector(sel)?.getAttribute("content")?.trim() || undefined;
  const titleTag = normalizeText(document.querySelector("title")?.textContent ?? "");
  const h1 = normalizeText(document.querySelector("h1")?.textContent ?? "");
  const title = metaContent('meta[property="og:title"]') ?? (titleTag || h1);
  const meta: PageMeta = { title: normalizeText(title) };
  if (h1) meta.h1 = h1;
  const lang = document.documentElement?.getAttribute("lang")?.trim();
  if (lang) meta.lang = lang;
  const siteName = metaContent('meta[property="og:site_name"]');
  if (siteName) meta.siteName = siteName;
  const author = metaContent('meta[name="author"]');
  if (author) meta.author = author;
  const description = metaContent('meta[name="description"]') ?? metaContent('meta[property="og:description"]');
  if (description) meta.description = description;
  const published = metaContent('meta[property="article:published_time"]') ?? metaContent('meta[name="date"]');
  if (published) meta.publishedAt = published;
  const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute("href");
  if (canonical) {
    try {
      meta.canonical = new URL(canonical, baseUrl).href;
    } catch {
      // ignore
    }
  }
  return meta;
}

function absolutize(document: Document, baseUrl: string): void {
  for (const a of [...document.querySelectorAll("a[href]")]) {
    const href = a.getAttribute("href")!.trim();
    if (/^(javascript|data|vbscript):/i.test(href)) {
      a.removeAttribute("href");
      continue;
    }
    try {
      a.setAttribute("href", new URL(href, baseUrl).href);
    } catch {
      a.removeAttribute("href");
    }
  }
  for (const img of [...document.querySelectorAll("img")]) {
    const src = img.getAttribute("src") ?? img.getAttribute("data-src");
    img.removeAttribute("srcset");
    if (!src) continue;
    try {
      img.setAttribute("src", src.startsWith("data:") ? src : new URL(src, baseUrl).href);
    } catch {
      img.removeAttribute("src");
    }
  }
}

function collectOutlinks(document: Document): string[] {
  const seen = new Set<string>();
  for (const a of document.querySelectorAll("a[href]")) {
    const href = a.getAttribute("href");
    if (href && /^https?:/i.test(href)) seen.add(href);
  }
  return [...seen];
}

function collectLinks(root: Element): Link[] {
  const out: Link[] = [];
  const seen = new Set<string>();
  for (const a of root.querySelectorAll("a[href]")) {
    const href = a.getAttribute("href")!;
    if (!/^https?:/i.test(href) || seen.has(href)) continue;
    seen.add(href);
    out.push({ href, text: normalizeText(a.textContent ?? "") });
  }
  return out;
}

function structuralRoot(document: Document): { root: Element; semantic: boolean } {
  const main = document.querySelector("main,[role=main]");
  const articles = [...document.querySelectorAll("article")];
  const picked = main ?? (articles.length === 1 ? articles[0]! : null);
  const root = (picked ?? document.body ?? document.documentElement).cloneNode(true) as Element;
  stripChrome(root);
  return { root, semantic: picked !== null };
}

function stripChrome(root: Element): void {
  for (const el of [...root.querySelectorAll(CHROME)]) el.remove();
  for (const el of [...root.querySelectorAll("[style]")]) {
    if (HIDDEN_STYLE_RE.test(el.getAttribute("style") ?? "")) el.remove();
  }
  for (const el of [...root.querySelectorAll("header")]) {
    if (!el.querySelector("h1,h2")) el.remove();
  }
  for (const el of [...root.querySelectorAll("footer")]) el.remove();
  const total = normalizeText(root.textContent ?? "").length || 1;
  for (const el of [...root.querySelectorAll("[class],[id]")]) {
    if (!el.isConnected || el.matches("main,article,body,html,pre,code,table,h1,h2,h3,h4,h5,h6")) continue;
    const label = `${el.getAttribute("class") ?? ""} ${el.getAttribute("id") ?? ""}`;
    if (!NOISE_RE.test(label)) continue;
    // Never drop a container that holds most of the page text or the main heading.
    if (el.querySelector("main,article,h1")) continue;
    if (normalizeText(el.textContent ?? "").length > 0.4 * total) continue;
    el.remove();
  }
}

function domStats(root: Element): { chars: number; tables: number; pre: number } {
  return {
    chars: normalizeText(root.textContent ?? "").length,
    tables: root.querySelectorAll("table").length,
    pre: root.querySelectorAll("pre").length,
  };
}

/** Splits a content root into ordered blocks. Inline runs (text directly inside containers) become paragraphs. */
function walkBlocks(root: Element, td: TurndownService): RawBlock[] {
  const out: RawBlock[] = [];
  const doc = root.ownerDocument;
  let run: Node[] = [];

  const flush = () => {
    if (run.length === 0) return;
    const p = doc.createElement("p");
    for (const n of run) p.appendChild(n.cloneNode(true));
    run = [];
    const text = textOf(p);
    if (!text && !p.querySelector("img")) return;
    const markdown = toMarkdown(p, td);
    if (markdown) out.push({ type: "paragraph", text, markdown });
  };

  const visit = (el: Element) => {
    for (const node of [...el.childNodes]) {
      if (node.nodeType === 3) {
        if ((node.textContent ?? "").trim()) run.push(node);
        else if (run.length) run.push(node);
        continue;
      }
      if (node.nodeType !== 1) continue;
      const child = node as Element;
      const tag = child.nodeName.toUpperCase();
      if (SKIP[tag] && tag !== "BR") {
        flush();
        continue;
      }
      if (INLINE[tag] && !child.querySelector(Object.keys(LEAF).join(","))) {
        run.push(child);
        continue;
      }
      flush();
      const type = LEAF[tag];
      if (type) emit(child, type);
      else visit(child);
    }
  };

  const emit = (el: Element, type: BlockType) => {
    const tag = el.nodeName.toUpperCase();
    const markdown = toMarkdown(el, td);
    if (!markdown) return;
    let text: string;
    const block: RawBlock = { type, text: "", markdown };
    if (type === "code") {
      text = codeText(el);
      const lang = codeLanguage(el);
      if (lang) block.lang = lang;
    } else if (type === "table") {
      text = tableRows(el)
        .map((tr) => rowCells(tr).map((c) => textOf(c)).join("\t"))
        .join("\n");
    } else if (type === "list") {
      const items = [...el.children].filter((c) => c.nodeName === "LI" || c.nodeName === "DT" || c.nodeName === "DD");
      text = items.map((li) => textOf(li)).filter(Boolean).join("\n");
    } else {
      text = textOf(el);
    }
    if (!text && !el.querySelector("img")) return;
    block.text = text;
    if (type === "heading") block.level = Number(tag.slice(1));
    out.push(block);
  };

  visit(root);
  flush();
  return out;
}

function toMarkdown(el: Element, td: TurndownService): string {
  const wrapper = el.ownerDocument.createElement("div");
  wrapper.appendChild(el.cloneNode(true));
  return td.turndown(wrapper as unknown as HTMLElement).trim();
}

/** Removes heading permalink anchors (`¶`, `#`, `§`, icon-only links to a fragment of the same page). */
function removePermalinks(document: Document): void {
  for (const a of [...document.querySelectorAll("h1 a, h2 a, h3 a, h4 a, h5 a, h6 a, a.headerlink, a.anchor, a.hash-link, a.anchorjs-link")]) {
    const href = a.getAttribute("href") ?? "";
    const text = normalizeText(a.textContent ?? "").toLowerCase();
    if (href.includes("#") && PERMALINK_TEXT[text] && !a.querySelector("img[alt]:not([alt=''])")) a.remove();
  }
}

/**
 * Heading text derived from a page title: drops a trailing site name (`Title | Site`), either matching og:site_name or
 * short (≤ 4 words) when the remaining title is at least as long.
 */
export function headingFromTitle(title: string, siteName?: string): string {
  for (const sep of TITLE_SEPARATORS) {
    const i = title.lastIndexOf(sep);
    if (i <= 0) continue;
    const head = title.slice(0, i).trim();
    const tail = title.slice(i + sep.length).trim();
    const matchesSite = siteName !== undefined && tail.toLowerCase() === siteName.toLowerCase();
    const words = (s: string) => s.split(/\s+/).filter(Boolean).length;
    if (matchesSite || (words(tail) <= 4 && words(head) >= words(tail))) return head;
  }
  return title;
}

/** Readability demotes every `<h1>` to `<h2>`; undo that using the marker set before parsing. */
function restoreH1(root: Element): void {
  for (const h of [...root.querySelectorAll("[data-fk-h1]")]) {
    h.removeAttribute("data-fk-h1");
    if (h.nodeName !== "H2") continue;
    const h1 = root.ownerDocument.createElement("h1");
    for (const c of [...h.childNodes]) h1.appendChild(c);
    h.replaceWith(h1);
  }
}
