import { describe, expect, it } from "vitest";
import { sliceMarkdown } from "../src/core/budget.js";
import { extractHtml, headingFromTitle } from "../src/core/extract/html.js";
import { extractContent } from "../src/core/extract/index.js";
import { extractText } from "../src/core/extract/text.js";
import { makePdf } from "./support/pdf.js";

const lorem = "Retrieval systems keep evidence close to the claims they support. ".repeat(12);

const docsPage = `<!doctype html><html lang="en"><head><title>Install guide – Widget Docs</title>
<meta name="description" content="How to install Widget"><link rel="canonical" href="/docs/install"></head>
<body>
<header class="site-header"><a href="/">Widget</a><nav><a href="/docs">Docs</a><a href="/blog">Blog</a></nav></header>
<div class="layout">
  <aside class="sidebar"><ul><li><a href="/docs/intro">Intro</a></li><li><a href="/docs/install">Install</a></li></ul></aside>
  <main>
    <h1>Install guide</h1>
    <p>Widget needs <strong>Node 22</strong> or newer. See the <a href="../changelog">changelog</a>.</p>
    <h2 id="steps">Steps</h2>
    <ol><li>Download the package</li><li>Run the installer<ul><li>Choose a directory</li></ul></li></ol>
    <pre><code class="language-bash">npm install widget
widget --version</code></pre>
    <h2>Options</h2>
    <table><thead><tr><th>Flag</th><th>Default</th><th>Meaning</th></tr></thead>
      <tbody><tr><td><code>--fast</code></td><td>false</td><td>Skip checks | faster</td></tr>
      <tr><td>--dir</td><td colspan="2">current directory</td></tr></tbody></table>
    <blockquote><p>Tip: pin versions.</p></blockquote>
    <p><del>Deprecated</del> flags are ignored.</p>
  </main>
</div>
<footer class="footer"><p>© Widget Inc. Privacy · Terms</p></footer>
</body></html>`;

describe("extractHtml on a documentation page", () => {
  const doc = extractHtml(docsPage, { url: "https://docs.example.com/docs/install" });

  it("keeps metadata", () => {
    expect(doc.title).toBe("Install guide – Widget Docs");
    expect(doc.lang).toBe("en");
    expect(doc.description).toBe("How to install Widget");
    expect(doc.canonicalUrl).toBe("https://docs.example.com/docs/install");
  });

  it("preserves headings, links, lists, code and tables as GFM", () => {
    const md = doc.markdown;
    expect(md).toContain("# Install guide");
    expect(md).toContain("## Steps");
    expect(md).toContain("[changelog](https://docs.example.com/changelog)");
    expect(md).toMatch(/1\. Download the package\n2\. Run the installer\n {3}- Choose a directory/);
    expect(md).toContain("```bash\nnpm install widget\nwidget --version\n```");
    expect(md).toContain("| Flag | Default | Meaning |\n| --- | --- | --- |");
    expect(md).toContain("| `--fast` | false | Skip checks \\| faster |");
    expect(md).toContain("| --dir | current directory |  |");
    expect(md).toContain("> Tip: pin versions.");
    expect(md).toContain("~~Deprecated~~");
  });

  it("drops navigation, sidebars and footers", () => {
    expect(doc.markdown).not.toMatch(/Privacy|Intro\]|Blog/);
    // but crawl links still see navigation
    expect(doc.outlinks).toContain("https://docs.example.com/blog");
  });

  it("produces typed blocks whose offsets index into the markdown", () => {
    expect(doc.blocks.map((b) => b.type)).toEqual(["heading", "paragraph", "heading", "list", "code", "heading", "table", "quote", "paragraph"]);
    for (const b of doc.blocks) expect(doc.markdown.slice(b.offset, b.offset + b.markdown.length)).toBe(b.markdown);
    const code = doc.blocks.find((b) => b.type === "code")!;
    expect(code.lang).toBe("bash");
    expect(code.text).toBe("npm install widget\nwidget --version");
    const table = doc.blocks.find((b) => b.type === "table")!;
    expect(table.text.split("\n")[1]).toBe("--fast\tfalse\tSkip checks | faster");
    expect(doc.stats).toMatchObject({ headings: 3, tables: 1, codeBlocks: 1 });
  });

  it("is deterministic", () => {
    const again = extractHtml(docsPage, { url: "https://docs.example.com/docs/install" });
    expect(again.blocks.map((b) => b.hash)).toEqual(doc.blocks.map((b) => b.hash));
  });
});

describe("extractHtml on an article", () => {
  const article = `<html><head><title>Why evidence matters | The Blog</title><meta property="og:site_name" content="The Blog"></head><body>
    <div id="top-menu" class="menu"><a href="/a">A</a> <a href="/b">B</a> <a href="/c">C</a></div>
    <div class="post"><h1>Why evidence matters</h1><p class="byline">By Ada</p><p>${lorem}</p><p>${lorem}</p>
    <h2>Details</h2><p>${lorem}</p></div>
    <div class="share-buttons">Share on social</div><div class="related">Related posts: foo bar</div>
  </body></html>`;
  const doc = extractHtml(article, { url: "https://blog.example.com/post" });

  it("uses Readability for article-like pages without dropping the h1", () => {
    expect(doc.strategy).toBe("readability");
    expect(doc.blocks[0]).toMatchObject({ type: "heading", level: 1, text: "Why evidence matters" });
    expect(doc.markdown).toContain("## Details");
    expect(doc.markdown).not.toMatch(/Share on social|Related posts/);
    expect(doc.siteName).toBe("The Blog");
  });
});

describe("candidate and block isolation", () => {
  it("keeps structural code, tables and relative links when the article candidate discards them", () => {
    const doc = extractHtml(
      `<html><head><title>Care guide</title><base href="https://docs.example.com/manual/"></head><body><main>
       <h1>Care guide</h1><p>${lorem}</p>
       <div class="comment"><pre class="language-js"><code>pump.stop();
inspect(seal);</code></pre>
       <table><tr><th>Part</th><th>Spec</th></tr><tr><td><a href="seal">Seal</a></td>
       <td><code>PTFE</code> | <strong>10 mm</strong></td></tr></table></div>
       <p>Read the <a href="maintenance">maintenance guide</a> next.</p></main></body></html>`,
      { url: "https://docs.example.com/start" },
    );
    expect(doc.strategy).toBe("structural");
    expect(doc.blocks.find((b) => b.type === "code")).toMatchObject({ text: "pump.stop();\ninspect(seal);", lang: "js" });
    expect(doc.blocks.find((b) => b.type === "table")).toMatchObject({ text: "Part\tSpec\nSeal\tPTFE | 10 mm" });
    expect(doc.markdown).toContain("| [Seal](https://docs.example.com/manual/seal) | `PTFE` \\| **10 mm** |");
    expect(doc.links).toEqual([
      { href: "https://docs.example.com/manual/seal", text: "Seal" },
      { href: "https://docs.example.com/manual/maintenance", text: "maintenance guide" },
    ]);
  });

  it("preserves sibling order, plain citation text and links through inline and table conversion", () => {
    const doc = extractHtml(
      `<html><body><main><h1>Service log</h1>
       <div>Inspect <em>every</em> seal and <a href="/parts">order parts</a> before departure.</div>
       <p>Set <code>pump.mode</code> to <strong>safe</strong>.</p>
       <pre><code>pump.stop();
inspect(seal);</code></pre>
       <table><caption>Required items</caption><tr><th>Item</th><th>Detail</th></tr>
       <tr><td><a href="/seals">Seal</a></td><td><strong>10 mm</strong><br><code>PTFE</code> | flexible</td></tr></table>
       <p>Finally, close the <a href="/log">service log</a>.</p></main></body></html>`,
      { url: "https://docs.example.com/start" },
    );
    expect(doc.blocks.map((b) => b.type)).toEqual(["heading", "paragraph", "paragraph", "code", "table", "paragraph"]);
    expect(doc.blocks[1]?.text).toBe("Inspect every seal and order parts before departure.");
    expect(doc.blocks[2]?.text).toBe("Set pump.mode to safe.");
    expect(doc.blocks[3]?.text).toBe("pump.stop();\ninspect(seal);");
    expect(doc.blocks[4]?.text).toBe("Item\tDetail\nSeal\t10 mm PTFE | flexible");
    expect(doc.blocks[4]?.markdown).toContain("**10 mm**");
    expect(doc.blocks[4]?.markdown).toContain("<br> `PTFE` \\| flexible");
    expect(doc.blocks[5]?.markdown).toContain("[service log](https://docs.example.com/log)");
    expect(doc.links.map((link) => link.href)).toEqual([
      "https://docs.example.com/parts",
      "https://docs.example.com/seals",
      "https://docs.example.com/log",
    ]);
    for (const block of doc.blocks) expect(doc.markdown.slice(block.offset, block.offset + block.markdown.length)).toBe(block.markdown);
  });
});

describe("heading and code details", () => {
  it("drops heading permalink anchors and detects `brush:` code languages", () => {
    const doc = extractHtml(
      `<html><head><title>T</title></head><body><main><h1>Guide<a class="headerlink" href="#guide">¶</a></h1>
       <h2 id="x">Install <a href="#x" aria-hidden="true">#</a></h2><p>Text about the guide that is long enough.</p>
       <pre class="brush: js notranslate">const a = 1;</pre></main></body></html>`,
      { url: "https://docs.example.com/g" },
    );
    expect(doc.blocks.filter((b) => b.type === "heading").map((b) => b.markdown)).toEqual(["# Guide", "## Install"]);
    expect(doc.blocks.find((b) => b.type === "code")).toMatchObject({ lang: "js", text: "const a = 1;" });
  });

  it("derives a heading from the title without the site name when the page has no h1", () => {
    expect(headingFromTitle("Announcing Rust 1.0 | Rust Blog")).toBe("Announcing Rust 1.0");
    expect(headingFromTitle("Install guide – Widget Docs", "Widget Docs")).toBe("Install guide");
    expect(headingFromTitle("A - B")).toBe("A");
    expect(headingFromTitle("Pride and Prejudice")).toBe("Pride and Prejudice");
    expect(headingFromTitle("Short | A much longer trailing part of the title")).toBe("Short | A much longer trailing part of the title");
    const doc = extractHtml(`<html><head><title>Release notes | Example Blog</title></head><body><main><p>${"Body text. ".repeat(10)}</p></main></body></html>`, {
      url: "https://blog.example.com/r",
    });
    expect(doc.blocks[0]).toMatchObject({ type: "heading", level: 1, text: "Release notes" });
    expect(doc.title).toBe("Release notes | Example Blog");
  });
});

describe("render signals", () => {
  it("flags empty SPA shells", () => {
    const doc = extractHtml(
      `<html><head><title>App</title><script src="/bundle.js"></script></head><body><div id="root"></div><noscript>You need to enable JavaScript to run this app.</noscript></body></html>`,
      { url: "https://app.example.com/" },
    );
    expect(doc.signals).toMatchObject({ appRootEmpty: true, noscriptWarning: true, scriptCount: 1 });
    expect(doc.signals!.bodyTextChars).toBeLessThan(10);
  });

  it("counts body text without script, style, template or noscript subtrees", () => {
    const doc = extractHtml(
      `<html><head><title>Signals</title><script src="/bundle.js"></script></head><body>Before <span>inline</span> after.<div><style>p { color: red; }</style><script>window.ready = true;</script><template><p>Template content</p></template><noscript>Enable JavaScript to continue.</noscript>Next block.</div><!-- not visible --></body></html>`,
      { url: "https://app.example.com/" },
    );
    expect(doc.signals).toMatchObject({
      bodyTextChars: "Before inline after.Next block.".length,
      scriptCount: 2,
      externalScriptCount: 1,
      inlineScriptChars: "window.ready = true;".length,
      noscriptWarning: true,
    });
    expect(doc.blocks.filter((b) => b.type === "paragraph").map((b) => b.text)).toEqual(["Before inline after.", "Next block."]);
  });
});

describe("extractContent", () => {
  it("extracts text-based PDFs with headings and page numbers", async () => {
    const pdf = makePdf(
      [
        [{ text: "Quarterly Report", size: 24 }, { text: "" }, { text: "Revenue grew by twelve percent in the third quarter." }, { text: "Costs were flat." }],
        [{ text: "Outlook", size: 16 }, { text: "" }, { text: "We expect steady growth next year." }],
      ],
      "Quarterly Report 2026",
    );
    const doc = await extractContent({ body: pdf, contentType: "application/pdf", url: "https://example.com/r.pdf" });
    expect(doc.strategy).toBe("pdf");
    expect(doc.title).toBe("Quarterly Report 2026");
    expect(doc.stats.pages).toBe(2);
    expect(doc.blocks[0]).toMatchObject({ type: "heading", level: 1, text: "Quarterly Report", page: 1 });
    expect(doc.markdown).toContain("Revenue grew by twelve percent in the third quarter. Costs were flat.");
    expect(doc.blocks.find((b) => b.text === "Outlook")).toMatchObject({ type: "heading", page: 2 });
  });

  it("sniffs PDFs served as octet-stream and rejects unknown binaries", async () => {
    const pdf = makePdf([[{ text: "Hello PDF" }]], "t");
    expect((await extractContent({ body: pdf, contentType: "application/octet-stream", url: "https://e.com/x" })).strategy).toBe("pdf");
    await expect(extractContent({ body: Buffer.from([0, 1, 2]), contentType: "image/png", url: "https://e.com/x" })).rejects.toMatchObject({
      code: "unsupported_content_type",
    });
  });

  it("splits Markdown text into blocks and keeps fences", () => {
    const doc = extractText("# Title\n\nPara one\ncontinues.\n\n```js\nlet a = 1;\n\nlet b = 2;\n```\n\n## Next", "text/markdown");
    expect(doc.blocks.map((b) => b.type)).toEqual(["heading", "paragraph", "code", "heading"]);
    expect(doc.blocks[2]).toMatchObject({ lang: "js", text: "let a = 1;\n\nlet b = 2;" });
  });
});

describe("sliceMarkdown", () => {
  const doc = extractHtml(docsPage, { url: "https://docs.example.com/docs/install" });
  it("cuts at block boundaries and resumes exactly", () => {
    const first = sliceMarkdown(doc.markdown, doc.blocks, 0, 120);
    expect(first.truncated).toBe(true);
    expect(first.nextOffset).not.toBeNull();
    expect(doc.blocks.some((b) => b.offset === first.nextOffset)).toBe(true);
    let offset = 0;
    let rebuilt = "";
    for (let i = 0; i < 100; i++) {
      const s = sliceMarkdown(doc.markdown, doc.blocks, offset, 120);
      rebuilt += doc.markdown.slice(offset, s.nextOffset ?? doc.markdown.length);
      if (s.nextOffset === null) break;
      offset = s.nextOffset;
    }
    expect(rebuilt).toBe(doc.markdown);
  });
  it("does not truncate when the budget fits", () => {
    const all = sliceMarkdown(doc.markdown, doc.blocks, 0, 1_000_000);
    expect(all.truncated).toBe(false);
    expect(all.text).toBe(doc.markdown);
  });
});
