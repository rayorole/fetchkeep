/**
 * Generates the deterministic local fixture site, gold texts and the fixture dataset manifest.
 *
 *   node --experimental-strip-types bench/fixtures/build.ts   (or: npm run bench:fixtures)
 *
 * All text is original and written for this repository (Apache-2.0). Output is committed; SHA256SUMS lets a run
 * prove which fixture bytes it used. Dynamic behaviours (redirects, errors, slow responses, encodings, robots.txt)
 * are implemented by bench/lib/fixture-server.ts and described in the manifest.
 */
import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { makePdf } from "../../test/support/pdf.ts";
import type { CrawlCase, FetchCase } from "../lib/types.ts";

const ROOT = dirname(fileURLToPath(import.meta.url));
const SITE = join(ROOT, "site");
const GOLD = join(ROOT, "gold");

// ---------------------------------------------------------------------------------------------------------------
// Page chrome shared by fixtures: realistic navigation, sidebars, cookie banners and footers that should NOT be
// extracted. Each boilerplate string is listed in mustNotContain.

const NAV = `<header class="site-header"><a class="logo" href="/">Northwind Journal</a>
<nav class="main-nav"><ul><li><a href="/">Home</a></li><li><a href="/sections/world">World desk</a></li><li><a href="/sections/tech">Technology desk</a></li>
<li><a href="/subscribe">Subscribe for four dollars a month</a></li><li><a href="/login">Sign in to your account</a></li></ul></nav></header>`;
const COOKIE = `<div class="cookie-banner" role="dialog">We use cookies to measure audience engagement. <button>Accept all cookies</button></div>`;
const FOOTER = `<footer class="site-footer"><p>Copyright Northwind Media Group. All rights reserved.</p>
<ul><li><a href="/privacy">Privacy policy and data rights</a></li><li><a href="/careers">Careers at Northwind</a></li></ul></footer>`;
const SIDEBAR = `<aside class="sidebar"><h3>Trending now</h3><ul><li><a href="/t/1">Ten gadgets you will regret buying</a></li>
<li><a href="/t/2">Celebrity chef opens floating restaurant</a></li></ul><div class="ad">Advertisement: Premium noise-cancelling headphones</div></aside>`;
const BOILER = [
  "Subscribe for four dollars a month",
  "We use cookies to measure audience engagement",
  "Copyright Northwind Media Group",
  "Ten gadgets you will regret buying",
  "Advertisement: Premium noise-cancelling headphones",
];

const DOCS_NAV = `<nav class="docs-sidebar" aria-label="Documentation"><ul><li><a href="/docs/">Overview of Tidewater</a></li>
<li><a href="/docs/install">Installing the toolchain</a></li><li><a href="/docs/config">Configuration reference</a></li>
<li><a href="/docs/cli">Command line interface</a></li></ul></nav>`;
const DOCS_HEADER = `<header class="docs-top"><a href="/">Tidewater Docs</a> <input type="search" placeholder="Search the Tidewater documentation"> <a href="https://example.org/gh">Star us on the code forge</a></header>`;
const DOCS_FOOTER = `<footer><p>Edit this page on the code forge</p><p>Tidewater is maintained by volunteers of the Tidewater Collective.</p></footer>`;
const DOCS_BOILER = ["Overview of Tidewater", "Star us on the code forge", "Edit this page on the code forge", "maintained by volunteers of the Tidewater Collective"];

function newsPage(title: string, main: string, extraHead = ""): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title} | Northwind Journal</title>${extraHead}</head>
<body>${COOKIE}${NAV}<div class="layout">${SIDEBAR}<main><article>${main}</article></main></div>${FOOTER}</body></html>`;
}

function docsPage(title: string, main: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title} - Tidewater Docs</title></head>
<body>${DOCS_HEADER}<div class="docs-layout">${DOCS_NAV}<main class="docs-content">${main}</main>
<aside class="toc"><p>On this page</p><ul><li><a href="#a">Jump to section</a></li></ul></aside></div>${DOCS_FOOTER}</body></html>`;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Gold text: visible text of the main-content HTML, via a deliberately simple tag stripper (not Fetchkeep's). */
function goldText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

const files = new Map<string, string | Buffer>();
const fetchCases: FetchCase[] = [];
const crawlCases: CrawlCase[] = [];

function add(path: string, body: string | Buffer): void {
  files.set(path, body);
}

function fetchCase(c: Omit<FetchCase, "kind" | "dataset"> & { goldHtml?: string }): void {
  const { goldHtml, ...rest } = c;
  const fc: FetchCase = { kind: "fetch", dataset: "fixture", ...rest };
  if (goldHtml) {
    const goldPath = `gold/${c.id}.txt`;
    files.set(goldPath, `${goldText(goldHtml)}\n`);
    fc.gold = goldPath;
  }
  fetchCases.push(fc);
}

// ---------------------------------------------------------------------------------------------------------------
// Articles

const tideMain = `<h1>Harbor town rebuilds its tide gauge after sixty years</h1>
<p class="byline">By Mara Ellison</p>
<p>The volunteers of Saltmarsh Point spent the summer replacing a tide gauge that had recorded sea levels since the town was founded.
The original instrument, a float in a stilling well connected to a paper chart, stopped working during the spring storms.</p>
<p>Local engineer Tobias Varga led the effort. He explained that the new gauge uses a pressure sensor and logs readings every six minutes,
which lets researchers compare the record with nearby stations without converting units by hand.</p>
<h2>Why a small gauge matters</h2>
<p>Long, continuous records are rare. A single gap of a few months can make it harder to separate seasonal swings from long-term change,
so the team kept the old chart recorder running in parallel until the new sensor had been calibrated.</p>
<blockquote><p>We did not want to lose even one tide cycle of data.</p></blockquote>
<p>The town council has agreed to fund maintenance for the next ten years, and the readings are already published on the harbor office noticeboard.</p>`;
add("articles/tide-gauge.html", newsPage("Harbor town rebuilds its tide gauge", tideMain));
fetchCase({
  id: "fx-article-basic",
  url: "/articles/tide-gauge.html",
  category: "article",
  description: "News article with cookie banner, navigation, sidebar with ads and footer.",
  mustContain: [
    "spent the summer replacing a tide gauge",
    "logs readings every six minutes",
    "We did not want to lose even one tide cycle of data",
    "fund maintenance for the next ten years",
  ],
  mustNotContain: BOILER,
  headings: ["Harbor town rebuilds its tide gauge after sixty years", "Why a small gauge matters"],
  goldHtml: tideMain,
});

const orchardMain = `<h1>The orchard that keeps a ledger of frost</h1>
<p>For three generations the Aldana family has written down the date of the first autumn frost on the inside of a barn door.
The oldest entry, in faded pencil, reads the fourteenth of October.</p>
<h2>A record written on wood</h2>
<p>Historians visiting the farm photographed every entry. Some years have two dates, because a warm spell melted the first frost and the family decided it did not count.</p>
<ul><li>Entries begin in the spring of the first planting.</li><li>Every entry lists the variety that was picked last.</li><li>Three years are missing because the barn was being repaired.</li></ul>
<h2>Comparing the door with instruments</h2>
<p>A regional weather station opened twelve kilometres away decades later. Where the two overlap, the door agrees with the station to within four days in most years.</p>
<figure><img src="/img/door.png" alt="Pencil marks on a barn door"><figcaption>Pencil marks on the barn door, photographed in autumn.</figcaption></figure>
<h3>What the family plans next</h3>
<p>The youngest Aldana has started a spreadsheet, but the door will stay. Nobody, she said, is going to paint over it.</p>`;
add("articles/frost-ledger.html", newsPage("The orchard that keeps a ledger of frost", orchardMain));
fetchCase({
  id: "fx-article-long",
  url: "/articles/frost-ledger.html",
  category: "article",
  heldOut: true,
  description: "Longer article with subsections, a list and a figure caption.",
  mustContain: [
    "written down the date of the first autumn frost",
    "Every entry lists the variety that was picked last",
    "agrees with the station to within four days",
    "Nobody, she said, is going to paint over it",
  ],
  mustNotContain: BOILER,
  headings: ["The orchard that keeps a ledger of frost", "A record written on wood", "Comparing the door with instruments", "What the family plans next"],
  goldHtml: orchardMain,
});

// ---------------------------------------------------------------------------------------------------------------
// Documentation, tables and code

const installMain = `<h1 id="install">Installing the toolchain</h1>
<p>Tidewater ships as a single binary. You need a 64-bit operating system and about 200 megabytes of free disk space.</p>
<div class="admonition note"><p>Note: older releases required a separate runtime. That is no longer necessary.</p></div>
<h2 id="download">Download</h2>
<p>Use the installer script, then confirm that the binary is on your path:</p>
<pre><code class="language-bash">curl -fsSL https://example.org/tidewater/install.sh | sh
tidewater --version</code></pre>
<h2 id="options">Installer options</h2>
<table><thead><tr><th>Option</th><th>Default</th><th>Description</th></tr></thead>
<tbody><tr><td><code>--prefix</code></td><td>/usr/local</td><td>Directory that receives the binary</td></tr>
<tr><td><code>--channel</code></td><td>stable</td><td>Release channel to install from</td></tr>
<tr><td><code>--no-modify-path</code></td><td>off</td><td>Do not edit shell profile files</td></tr></tbody></table>
<h2 id="verify">Verify the installation</h2>
<pre><code class="language-python">import tidewater

print(tidewater.version())
assert tidewater.ping() == "pong"</code></pre>
<p>If the ping fails, run <code>tidewater doctor</code> and include its output when you report a problem.</p>`;
add("docs/install.html", docsPage("Installing the toolchain", installMain));
fetchCase({
  id: "fx-docs-install",
  url: "/docs/install.html",
  category: "docs",
  description: "Documentation page with sidebar navigation, table of contents, admonition, table and two code blocks.",
  mustContain: [
    "Tidewater ships as a single binary",
    "older releases required a separate runtime",
    "include its output when you report a problem",
  ],
  mustNotContain: DOCS_BOILER,
  headings: ["Installing the toolchain", "Download", "Installer options", "Verify the installation"],
  tables: [{ rows: [["Option", "Default", "Description"], ["--prefix", "/usr/local", "Directory that receives the binary"], ["--no-modify-path", "off", "Do not edit shell profile files"]] }],
  code: ["curl -fsSL https://example.org/tidewater/install.sh | sh\ntidewater --version", 'import tidewater\n\nprint(tidewater.version())\nassert tidewater.ping() == "pong"'],
  goldHtml: installMain,
});

const configMain = `<h1>Configuration reference</h1>
<p>Tidewater reads <code>tidewater.toml</code> from the project root. Every key can also be set with an environment variable.</p>
<div class="tabs"><div class="tab" data-lang="toml"><pre class="highlight-source-toml">[server]
port = 8080
workers = 4</pre></div>
<div class="tab" data-lang="shell"><pre><code class="lang-shell">export TIDEWATER_SERVER_PORT=8080
export TIDEWATER_SERVER_WORKERS=4</code></pre></div></div>
<h2>Keys</h2>
<table><thead><tr><th>Key</th><th>Type</th><th>Default</th></tr></thead><tbody>
<tr><td>server.port</td><td>integer</td><td>8080</td></tr>
<tr><td>server.workers</td><td>integer</td><td>number of CPU cores</td></tr>
<tr><td>log.format</td><td>string</td><td>text</td></tr></tbody></table>
<h2>Precedence</h2>
<ol><li>Command line flags</li><li>Environment variables</li><li>The configuration file</li><li>Built-in defaults</li></ol>
<p>Values that cannot be parsed stop startup with an error that names the offending key.</p>`;
add("docs/config.html", docsPage("Configuration reference", configMain));
fetchCase({
  id: "fx-docs-tabs",
  url: "/docs/config.html",
  category: "docs",
  heldOut: true,
  description: "Docs page with tabbed code samples (pre without code element), a key table and an ordered list.",
  mustContain: ["reads tidewater.toml from the project root", "Values that cannot be parsed stop startup", "Environment variables"],
  mustNotContain: DOCS_BOILER,
  headings: ["Configuration reference", "Keys", "Precedence"],
  tables: [{ rows: [["server.port", "integer", "8080"], ["log.format", "string", "text"]] }],
  code: ["[server]\nport = 8080\nworkers = 4", "export TIDEWATER_SERVER_PORT=8080\nexport TIDEWATER_SERVER_WORKERS=4"],
  goldHtml: configMain,
});

const tablesMain = `<h1>Regional rainfall, first half of the year</h1>
<p>Monthly totals in millimetres, measured at three stations operated by the valley water board.</p>
<table class="data"><caption>Rainfall by station</caption><thead><tr><th>Month</th><th>Upper Ford</th><th>Millbrook</th><th>Estuary</th></tr></thead>
<tbody><tr><td>January</td><td>112</td><td>98</td><td>74</td></tr><tr><td>February</td><td>87</td><td>90</td><td>61</td></tr>
<tr><td>March</td><td>101</td><td>84</td><td>70</td></tr><tr><td>April</td><td>64</td><td>59</td><td>42</td></tr>
<tr><td>May</td><td>55</td><td>60</td><td>38</td></tr><tr><td>June</td><td>47</td><td>41</td><td>29</td></tr></tbody></table>
<h2>Station metadata</h2>
<table><tr><th>Station</th><th>Elevation</th><th>Opened</th></tr><tr><td>Upper Ford</td><td>412 m</td><td>1961</td></tr>
<tr><td>Millbrook</td><td colspan="2">not recorded</td></tr><tr><td>Estuary</td><td>3 m</td><td>1988</td></tr></table>
<p>Totals for Millbrook in March were estimated from a neighbouring gauge after a sensor fault.</p>`;
add("data/rainfall.html", newsPage("Regional rainfall", tablesMain));
fetchCase({
  id: "fx-tables",
  url: "/data/rainfall.html",
  category: "table",
  description: "Two data tables (thead/tbody, caption, header row without thead, colspan) inside news chrome.",
  mustContain: ["measured at three stations operated by the valley water board", "estimated from a neighbouring gauge after a sensor fault"],
  mustNotContain: BOILER,
  tables: [
    { rows: [["Month", "Upper Ford", "Millbrook", "Estuary"], ["January", "112", "98", "74"], ["June", "47", "41", "29"]] },
    { rows: [["Station", "Elevation", "Opened"], ["Upper Ford", "412 m", "1961"], ["Estuary", "3 m", "1988"]] },
  ],
  goldHtml: tablesMain,
});

const ledgerMain = `<h1>Quarterly results for the ferry cooperative</h1>
<p>The cooperative carried more passengers than in any previous quarter, but fuel costs rose faster than fares.</p>
<table><thead><tr><th>Line item</th><th>Q1</th><th>Q2</th><th>Change</th></tr></thead><tbody>
<tr><td>Passenger fares</td><td>1,204,000</td><td>1,388,500</td><td>+15.3%</td></tr>
<tr><td>Fuel</td><td>402,100</td><td>497,900</td><td>+23.8%</td></tr>
<tr><td>Crew wages</td><td>511,000</td><td>519,400</td><td>+1.6%</td></tr>
<tr><td><strong>Operating surplus</strong></td><td>290,900</td><td>371,200</td><td>+27.6%</td></tr></tbody></table>
<p>Members will vote on a fare adjustment at the annual meeting.</p>`;
add("data/ferry-results.html", newsPage("Quarterly results for the ferry cooperative", ledgerMain));
fetchCase({
  id: "fx-table-financial",
  url: "/data/ferry-results.html",
  category: "table",
  heldOut: true,
  description: "Financial table with thousands separators, percentages and bold cells.",
  mustContain: ["fuel costs rose faster than fares", "vote on a fare adjustment at the annual meeting"],
  mustNotContain: BOILER,
  tables: [{ rows: [["Line item", "Q1", "Q2", "Change"], ["Fuel", "402,100", "497,900", "+23.8%"], ["Operating surplus", "290,900", "371,200", "+27.6%"]] }],
  goldHtml: ledgerMain,
});

const codeMain = `<h1>Parsing log lines with a state machine</h1>
<p>This tutorial builds a tiny parser for lines such as <code>level=warn msg="disk almost full"</code>.</p>
<h2>The token type</h2>
<pre><code class="language-rust">enum Token&lt;'a&gt; {
    Key(&amp;'a str),
    Value(&amp;'a str),
}</code></pre>
<h2>The loop</h2>
<p>Each character moves the parser between three states. Quotes switch into a mode where spaces are kept.</p>
<pre>for ch in line.chars() {
    match (state, ch) {
        (State::Key, '=') =&gt; state = State::Value,
        _ =&gt; buf.push(ch),
    }
}</pre>
<h2>Testing it</h2>
<pre><code class="language-js">const out = parse('level=warn msg="disk almost full"');
console.assert(out.msg === "disk almost full");</code></pre>
<p>Escaped quotes inside values are left as an exercise; the reference solution handles them with one extra state.</p>`;
add("tutorials/state-machine.html", docsPage("Parsing log lines with a state machine", codeMain));
fetchCase({
  id: "fx-code",
  url: "/tutorials/state-machine.html",
  category: "code",
  description: "Tutorial with inline code, HTML entities inside code, a pre block without a code element and several languages.",
  mustContain: ["builds a tiny parser for lines", "Quotes switch into a mode where spaces are kept", "handles them with one extra state"],
  mustNotContain: DOCS_BOILER,
  headings: ["Parsing log lines with a state machine", "The token type", "The loop", "Testing it"],
  code: [
    "enum Token<'a> {\n    Key(&'a str),\n    Value(&'a str),\n}",
    "for ch in line.chars() {\n    match (state, ch) {\n        (State::Key, '=') => state = State::Value,\n        _ => buf.push(ch),\n    }\n}",
    "const out = parse('level=warn msg=\"disk almost full\"');\nconsole.assert(out.msg === \"disk almost full\");",
  ],
  goldHtml: codeMain,
});

// ---------------------------------------------------------------------------------------------------------------
// Navigation-heavy page: a small article buried in a portal with large menus and link lists.

const megaMenu = `<nav class="mega-menu">${Array.from({ length: 8 }, (_, i) => `<div class="col"><h4>Department ${i + 1}</h4><ul>${Array.from({ length: 12 }, (_, j) => `<li><a href="/dept/${i}/${j}">Catalogue aisle ${i + 1}-${j + 1}</a></li>`).join("")}</ul></div>`).join("")}</nav>`;
const linkFooter = `<footer class="fat-footer">${Array.from({ length: 6 }, (_, i) => `<ul>${Array.from({ length: 10 }, (_, j) => `<li><a href="/f/${i}/${j}">Store locator region ${i * 10 + j}</a></li>`).join("")}</ul>`).join("")}<p>Prices include sales tax where applicable.</p></footer>`;
const recallMain = `<h1>Product recall: travel kettle model TK-200</h1>
<p>We are recalling the TK-200 travel kettle because the base can overheat when the kettle is switched on without water.</p>
<p>Stop using the kettle and return it to any branch for a full refund. You do not need a receipt.</p>
<p>Kettles sold after the first of March carry a green dot on the base and are not affected.</p>`;
add(
  "portal/recall.html",
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Recall notice - Harbour Stores</title></head><body>
<div class="promo-bar">Free delivery on orders over fifty pounds</div>${megaMenu}
<div class="breadcrumbs"><a href="/">Home</a> / <a href="/help">Help centre</a> / Recalls</div>
<div class="content"><div class="notice">${recallMain}</div>
<div class="related-products"><h3>Customers also viewed</h3><ul><li>Stainless steel water bottle</li><li>Folding travel hair dryer</li></ul></div></div>
${linkFooter}</body></html>`,
);
fetchCase({
  id: "fx-nav-heavy",
  url: "/portal/recall.html",
  category: "nav-heavy",
  description: "Short notice inside a portal with a 96-link mega menu, breadcrumbs, related products and a 60-link footer; no main/article elements.",
  mustContain: ["base can overheat when the kettle is switched on without water", "You do not need a receipt", "carry a green dot on the base"],
  mustNotContain: ["Catalogue aisle 3-7", "Store locator region 42", "Free delivery on orders over fifty pounds", "Folding travel hair dryer"],
  headings: ["Product recall: travel kettle model TK-200"],
  goldHtml: recallMain,
});

// ---------------------------------------------------------------------------------------------------------------
// JavaScript-dependent pages

add(
  "js/spa.html",
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Loading…</title></head><body>
<div id="root"></div><noscript>You need to enable JavaScript to run this app.</noscript>
<script>
fetch("/api/timetable.json").then(function (r) { return r.json(); }).then(function (d) {
  document.title = d.title;
  var rows = d.rows.map(function (r) { return "<tr><td>" + r[0] + "</td><td>" + r[1] + "</td><td>" + r[2] + "</td></tr>"; }).join("");
  document.getElementById("root").innerHTML = "<main><h1>" + d.title + "</h1><p>" + d.intro + "</p>" +
    "<table><thead><tr><th>Departure</th><th>Destination</th><th>Pier</th></tr></thead><tbody>" + rows + "</tbody></table>" +
    "<p>" + d.note + "</p></main>";
});
</script></body></html>`,
);
add(
  "api/timetable.json",
  JSON.stringify({
    title: "Island ferry timetable",
    intro: "Winter sailings run daily except on public holidays.",
    note: "Vehicles must check in thirty minutes before departure.",
    rows: [["07:15", "Gull Island", "Pier 2"], ["09:40", "Heron Key", "Pier 1"], ["13:05", "Gull Island", "Pier 2"]],
  }),
);
fetchCase({
  id: "fx-js-spa",
  url: "/js/spa.html",
  category: "js",
  requiresJs: true,
  description: "Empty single-page-app shell; content and table arrive via fetch() from a JSON endpoint.",
  mustContain: ["Winter sailings run daily except on public holidays", "Vehicles must check in thirty minutes before departure"],
  mustNotContain: ["You need to enable JavaScript to run this app"],
  headings: ["Island ferry timetable"],
  tables: [{ rows: [["Departure", "Destination", "Pier"], ["09:40", "Heron Key", "Pier 1"]] }],
});

const hydrateServer = `<h1>Community garden opens a seed library</h1>
<p>Residents can now borrow seeds from a cabinet in the tool shed and return seeds from their own harvest in autumn.</p>
<p>The library started with forty varieties donated by a retired market gardener.</p>`;
add(
  "js/hydrate.html",
  newsPage(
    "Community garden opens a seed library",
    `${hydrateServer}<section id="comments"><p class="loading">Loading comments…</p></section>
<script>setTimeout(function () { document.getElementById("comments").innerHTML = "<h2>Comments</h2><p>Great idea, I will bring runner beans.</p>"; }, 50);</script>`,
  ),
);
fetchCase({
  id: "fx-js-hydrate",
  url: "/js/hydrate.html",
  category: "js",
  description: "Server-rendered article; JavaScript only adds comments. HTTP alone should be sufficient for the article.",
  mustContain: ["borrow seeds from a cabinet in the tool shed", "forty varieties donated by a retired market gardener"],
  mustNotContain: BOILER,
  headings: ["Community garden opens a seed library"],
  goldHtml: hydrateServer,
});

add(
  "js/next-data.html",
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Glossary</title></head><body><div id="__next"></div>
<script id="__NEXT_DATA__" type="application/json">${JSON.stringify({
    props: {
      pageProps: {
        title: "Glossary of harbour terms",
        entries: [
          ["Bollard", "A short post on a quay used for mooring ships."],
          ["Fender", "A cushion that protects a hull from the quay wall."],
          ["Slipway", "A ramp that lets boats move between land and water."],
        ],
      },
    },
  })}</script>
<script>
var d = JSON.parse(document.getElementById("__NEXT_DATA__").textContent).props.pageProps;
document.getElementById("__next").innerHTML = "<main><h1>" + d.title + "</h1><dl>" +
  d.entries.map(function (e) { return "<dt>" + e[0] + "</dt><dd>" + e[1] + "</dd>"; }).join("") + "</dl></main>";
</script></body></html>`,
);
fetchCase({
  id: "fx-js-inline-data",
  url: "/js/next-data.html",
  category: "js",
  requiresJs: true,
  heldOut: true,
  description: "Framework-style page: content is embedded as JSON and rendered by an inline script (no network request).",
  mustContain: ["A short post on a quay used for mooring ships", "A ramp that lets boats move between land and water"],
  mustNotContain: [],
  headings: ["Glossary of harbour terms"],
});

// ---------------------------------------------------------------------------------------------------------------
// PDFs (text layer), plain text and encodings

add(
  "files/annual-report.pdf",
  makePdf(
    [
      [
        { text: "Valley Water Board Annual Report", size: 22 },
        { text: "" },
        { text: "The board supplied drinking water to eleven thousand households this year." },
        { text: "Leakage fell for the third consecutive year after the pipe renewal programme." },
        { text: "" },
        { text: "Finances", size: 15 },
        { text: "" },
        { text: "Operating costs were covered entirely by water charges and connection fees." },
      ],
      [
        { text: "Outlook", size: 15 },
        { text: "" },
        { text: "Next year the board will replace the Millbrook pumping station." },
      ],
    ],
    "Valley Water Board Annual Report",
  ),
);
fetchCase({
  id: "fx-pdf",
  url: "/files/annual-report.pdf",
  category: "pdf",
  description: "Two-page text PDF with headings.",
  mustContain: [
    "supplied drinking water to eleven thousand households",
    "Leakage fell for the third consecutive year",
    "replace the Millbrook pumping station",
  ],
  mustNotContain: [],
});

add(
  "files/ferry-safety.pdf",
  makePdf(
    [
      [
        { text: "Passenger Safety Briefing", size: 20 },
        { text: "" },
        { text: "Life jackets are stored under every seat on the upper deck." },
        { text: "Children under twelve must wear a life jacket on open decks." },
      ],
      [{ text: "Muster stations", size: 14 }, { text: "" }, { text: "Muster station B is next to the cafe on the main deck." }],
      [{ text: "In an emergency, follow the instructions of the crew at all times." }],
    ],
    "Passenger Safety Briefing",
  ),
);
fetchCase({
  id: "fx-pdf-3page",
  url: "/files/ferry-safety.pdf",
  category: "pdf",
  heldOut: true,
  description: "Three-page text PDF.",
  mustContain: ["Life jackets are stored under every seat", "Muster station B is next to the cafe", "follow the instructions of the crew"],
  mustNotContain: [],
});

add(
  "files/notice.txt",
  "HARBOUR NOTICE 17\n\nThe north breakwater will be closed to pedestrians from Monday for resurfacing.\n\nAnglers may use the south pier during the works.\n",
);
fetchCase({
  id: "fx-plain-text",
  url: "/files/notice.txt",
  category: "plain",
  description: "text/plain document.",
  mustContain: ["north breakwater will be closed to pedestrians", "Anglers may use the south pier"],
  mustNotContain: [],
});

fetchCase({
  id: "fx-encoding-latin1",
  url: "/enc/latin1.html",
  category: "encoding",
  heldOut: true,
  description: "windows-1252 page declared only in the Content-Type header (served by the fixture server).",
  mustContain: ["Crème brûlée", "café on the quay", "costs €4"],
  mustNotContain: [],
});

// ---------------------------------------------------------------------------------------------------------------
// Redirects and failures (dynamic routes in fixture-server.ts)

fetchCase({
  id: "fx-redirect-chain",
  url: "/go/old-tide",
  category: "redirect",
  description: "301 → 302 → article; the final URL must be the article.",
  mustContain: ["spent the summer replacing a tide gauge"],
  mustNotContain: [],
});
fetchCase({ id: "fx-404", url: "/missing/page.html", category: "failure", expectError: true, description: "404 Not Found.", mustContain: [], mustNotContain: [] });
fetchCase({ id: "fx-500", url: "/fail/500", category: "failure", expectError: true, description: "500 Internal Server Error.", mustContain: [], mustNotContain: [] });
fetchCase({ id: "fx-redirect-loop", url: "/loop/a", category: "failure", expectError: true, description: "Infinite redirect loop.", mustContain: [], mustNotContain: [] });
fetchCase({
  id: "fx-slow",
  url: "/slow/2500",
  category: "latency",
  description: "Page that takes 2.5 s to respond (within every deadline).",
  mustContain: ["This page was deliberately slow"],
  mustNotContain: [],
});

// ---------------------------------------------------------------------------------------------------------------
// Crawl graph under /crawl/ with robots.txt (served dynamically), a sitemap and known expectations.

const crawlPages: Record<string, { title: string; body: string; links: string[] }> = {
  "/crawl/": { title: "Estuary field guide", body: "An illustrated guide to birds, plants and tides of the estuary.", links: ["/crawl/birds/", "/crawl/plants/", "/crawl/tides/", "/crawl/private/notes.html", "https://example.org/elsewhere", "/crawl/birds/#top"] },
  "/crawl/birds/": { title: "Birds", body: "Waders feed on the mudflats at low tide.", links: ["/crawl/birds/curlew.html", "/crawl/birds/redshank.html", "/crawl/birds/avocet.html", "/crawl/"] },
  "/crawl/birds/curlew.html": { title: "Curlew", body: "The curlew has a long curved bill for probing deep mud.", links: ["/crawl/birds/", "/crawl/birds/curlew.html?utm_source=newsletter"] },
  "/crawl/birds/redshank.html": { title: "Redshank", body: "Redshanks are nervous birds that raise the alarm for the whole flock.", links: ["/crawl/birds/"] },
  "/crawl/birds/avocet.html": { title: "Avocet", body: "The avocet sweeps its upturned bill from side to side through shallow water.", links: ["/crawl/birds/avocet-eggs.html"] },
  "/crawl/birds/avocet-eggs.html": { title: "Avocet eggs", body: "Avocets lay three or four speckled eggs in a shallow scrape.", links: ["/crawl/birds/avocet-deep.html"] },
  "/crawl/birds/avocet-deep.html": { title: "Beyond the depth limit", body: "This page is four links away from the start page.", links: [] },
  "/crawl/plants/": { title: "Plants", body: "Salt marsh plants tolerate being flooded twice a day.", links: ["/crawl/plants/samphire.html", "/crawl/plants/sea-lavender.html", "/crawl/plants/samphire-copy.html"] },
  "/crawl/plants/samphire.html": { title: "Samphire", body: "Samphire is a succulent that grows on the lowest part of the marsh.", links: [] },
  "/crawl/plants/samphire-copy.html": { title: "Samphire", body: "Samphire is a succulent that grows on the lowest part of the marsh.", links: [] },
  "/crawl/plants/sea-lavender.html": { title: "Sea lavender", body: "Sea lavender turns the upper marsh purple in late summer.", links: [] },
  "/crawl/tides/": { title: "Tides", body: "Spring tides happen shortly after new and full moons.", links: ["/crawl/tides/tables.html", "/crawl/tides/old-tables"] },
  "/crawl/tides/tables.html": { title: "Tide tables", body: "Always check the tide tables before walking on the flats.", links: [] },
  "/crawl/private/notes.html": { title: "Private notes", body: "Robots.txt disallows this page.", links: [] },
  "/crawl/hidden/lighthouse.html": { title: "Lighthouse", body: "The lighthouse is only listed in the sitemap.", links: [] },
};
for (const [path, p] of Object.entries(crawlPages)) {
  const file = path.endsWith("/") ? `${path}index.html` : path;
  add(
    file.slice(1),
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${p.title}</title></head><body><nav><a href="/crawl/">Guide home</a></nav><main><h1>${p.title}</h1><p>${p.body}</p><ul>${p.links.map((l) => `<li><a href="${l}">${esc(l)}</a></li>`).join("")}</ul></main></body></html>`,
  );
}
add(
  "crawl/sitemap.xml",
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${["/crawl/", "/crawl/birds/", "/crawl/hidden/lighthouse.html"].map((p) => `  <url><loc>__ORIGIN__${p}</loc></url>`).join("\n")}\n</urlset>\n`,
);
crawlCases.push({
  id: "fx-crawl-estuary",
  kind: "crawl",
  dataset: "fixture",
  url: "/crawl/",
  description:
    "15-page site: robots.txt disallows /crawl/private/, one page only in the sitemap, a duplicate-content page, a redirect (/crawl/tides/old-tables → tables.html), tracking-parameter and fragment variants, an external link and a page beyond depth 3.",
  maxPages: 30,
  maxDepth: 3,
  expectedPages: [
    "/crawl/",
    "/crawl/birds/",
    "/crawl/birds/curlew.html",
    "/crawl/birds/redshank.html",
    "/crawl/birds/avocet.html",
    "/crawl/birds/avocet-eggs.html",
    "/crawl/plants/",
    "/crawl/plants/samphire.html",
    "/crawl/plants/sea-lavender.html",
    "/crawl/plants/samphire-copy.html",
    "/crawl/tides/",
    "/crawl/tides/tables.html",
    "/crawl/hidden/lighthouse.html",
  ],
  forbiddenPages: ["/crawl/private/notes.html", "/crawl/birds/avocet-deep.html"],
});

// ---------------------------------------------------------------------------------------------------------------
// Write everything.

rmSync(SITE, { recursive: true, force: true });
rmSync(GOLD, { recursive: true, force: true });
for (const [path, body] of files) {
  const full = join(ROOT, path.startsWith("gold/") ? path : join("site", path));
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, body);
}
const manifest = {
  name: "fixtures",
  description: "Deterministic local fixtures served by bench/lib/fixture-server.ts. Synthetic; generated by bench/fixtures/build.ts.",
  license: "Apache-2.0 (original text written for Fetchkeep)",
  cases: [...fetchCases, ...crawlCases],
};
const datasetsDir = join(ROOT, "..", "datasets");
mkdirSync(datasetsDir, { recursive: true });
writeFileSync(join(datasetsDir, "fixtures.json"), `${JSON.stringify(manifest, null, 2)}\n`);

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}
const sums = [...walk(SITE), ...walk(GOLD), join(datasetsDir, "fixtures.json")]
  .map((p) => `${createHash("sha256").update(readFileSync(p)).digest("hex")}  ${relative(join(ROOT, ".."), p).replace(/\\/g, "/")}`)
  .sort((a, b) => a.slice(66).localeCompare(b.slice(66)));
writeFileSync(join(ROOT, "SHA256SUMS"), `${sums.join("\n")}\n`);
console.error(`fixtures: ${files.size} files, ${fetchCases.length} fetch cases, ${crawlCases.length} crawl cases`);
