import TurndownService from "turndown";

/**
 * Turndown configured for GitHub-flavoured Markdown. The GFM rules (tables, strikethrough, task lists, fenced
 * code with language) are implemented here because the published plugins rely on DOM APIs that linkedom does not
 * provide (`HTMLTableElement.rows`, CSSOM) and silently degrade tables to plain text.
 */
export function createTurndown(): TurndownService {
  const td = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
    emDelimiter: "_",
    strongDelimiter: "**",
    linkStyle: "inlined",
    hr: "---",
  });

  td.addRule("fkPre", {
    filter: (node) => node.nodeName === "PRE",
    replacement: (_content, node) => {
      const el = node as HTMLElement;
      const code = codeText(el);
      const lang = codeLanguage(el);
      const longest = Math.max(2, ...[...code.matchAll(/`+/g)].map((m) => m[0].length));
      const fence = "`".repeat(longest + 1);
      return `\n\n${fence}${lang}\n${code}\n${fence}\n\n`;
    },
  });

  td.addRule("fkTable", {
    filter: (node) => node.nodeName === "TABLE",
    replacement: (_content, node) => `\n\n${renderTable(node as HTMLTableElement, td)}\n\n`,
  });

  td.addRule("fkStrike", {
    filter: (node) => node.nodeName === "DEL" || node.nodeName === "S" || node.nodeName === "STRIKE",
    replacement: (content) => (content.trim() ? `~~${content}~~` : ""),
  });

  td.addRule("fkTask", {
    filter: (node) =>
      node.nodeName === "INPUT" && (node as HTMLInputElement).getAttribute("type") === "checkbox" && node.parentNode?.nodeName === "LI",
    replacement: (_content, node) => ((node as HTMLInputElement).hasAttribute("checked") ? "[x] " : "[ ] "),
  });

  td.addRule("fkListItem", {
    filter: "li",
    replacement: (content, node) => {
      const li = node as HTMLElement;
      const parent = li.parentNode as HTMLElement | null;
      let prefix = "- ";
      if (parent?.nodeName === "OL") {
        const start = Number(parent.getAttribute("start") ?? "1");
        const index = Array.prototype.indexOf.call(parent.children, li) as number;
        prefix = `${(Number.isFinite(start) ? start : 1) + index}. `;
      }
      const body = content.replace(/^\n+/, "").replace(/\n+$/, "\n").replace(/\n/gm, `\n${" ".repeat(prefix.length)}`);
      return prefix + body + (li.nextSibling && !/\n$/.test(body) ? "\n" : "");
    },
  });

  td.addRule("fkImage", {
    filter: "img",
    replacement: (_content, node) => {
      const img = node as HTMLImageElement;
      const alt = (img.getAttribute("alt") ?? "").replace(/[\r\n\]]+/g, " ").trim();
      const src = img.getAttribute("src") ?? "";
      if (!src || src.startsWith("data:")) return alt;
      return `![${alt}](${src})`;
    },
  });

  return td;
}

export function codeText(pre: Element): string {
  return (pre.textContent ?? "").replace(/\r\n?/g, "\n").replace(/^\n+/, "").replace(/\s+$/, "");
}

const LANG_RE = /(?:^|\s)(?:(?:language|lang|highlight-source|highlight)-|brush:\s*)([\w+#.-]+)/i;

export function codeLanguage(pre: Element): string {
  const candidates = [pre, pre.querySelector("code"), pre.parentElement];
  for (const el of candidates) {
    if (!el) continue;
    const m = LANG_RE.exec(el.getAttribute("class") ?? "");
    if (m?.[1] && !/^(plaintext|text|none|nohighlight)$/i.test(m[1])) return m[1].toLowerCase();
    const data = el.getAttribute("data-lang") ?? el.getAttribute("data-language");
    if (data) return data.toLowerCase();
  }
  return "";
}

/** Rows of a table, excluding rows that belong to nested tables. */
export function tableRows(table: Element): Element[] {
  return [...table.querySelectorAll("tr")].filter((tr) => tr.closest("table") === table);
}

export function rowCells(tr: Element): Element[] {
  return [...tr.children].filter((c) => c.nodeName === "TD" || c.nodeName === "TH");
}

function renderTable(table: HTMLTableElement, td: TurndownService): string {
  const rows = tableRows(table).map((tr) => {
    const cells: string[] = [];
    for (const cell of rowCells(tr)) {
      // Turndown converts the root's children and clones internally; no separate cell wrapper is needed.
      const md = td
        .turndown(cell as unknown as HTMLElement)
        .replace(/\n+/g, " <br> ")
        .replace(/\|/g, "\\|")
        .trim()
        // Block-level escapes (\- item, 1\. item) are meaningless inside a table cell.
        .replace(/^\\([-+#>])/, "$1")
        .replace(/^(\d+)\\\./, "$1.");
      cells.push(md);
      const span = Math.min(Number(cell.getAttribute("colspan") ?? "1") || 1, 50);
      for (let i = 1; i < span; i++) cells.push("");
    }
    return cells;
  });
  const caption = table.querySelector("caption")?.textContent?.trim();
  if (rows.length === 0) return caption ?? "";
  const width = Math.max(...rows.map((r) => r.length));
  const line = (r: string[]) => `| ${Array.from({ length: width }, (_, i) => r[i] ?? "").join(" | ")} |`;
  const out = [line(rows[0]!), `| ${Array.from({ length: width }, () => "---").join(" | ")} |`, ...rows.slice(1).map(line)];
  return (caption ? `${caption}\n\n` : "") + out.join("\n");
}
