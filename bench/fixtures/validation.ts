import type { FetchCase } from "../lib/types.ts";

/** Independently authored from implementation edits; first execution is validation, subsequent use is regression. */
export function validationFixtures(): { files: Map<string, string>; cases: FetchCase[] } {
  const files = new Map<string, string>();
  const cases: FetchCase[] = [];
  const escape = (s: string) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  function add(id: string, title: string, body: string, spec: Omit<FetchCase, "id" | "kind" | "dataset" | "url" | "heldOut" | "gold">, gold: string): void {
    const path = `/validation/${id}.html`;
    files.set(path, `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title}</title></head><body>${body}</body></html>`);
    files.set(`gold/val-${id}.txt`, `${gold}\n`);
    cases.push({ id: `val-${id}`, kind: "fetch", dataset: "fixture", url: path, heldOut: true, gold: `gold/val-${id}.txt`, ...spec });
  }
  const article = [
    "The inland lighthouse was converted into a seed library after the reservoir was drained.",
    "Each packet carries the collection date and the altitude of its original garden.",
    "Visitors return twice as many seeds at the end of the growing season, but failed crops incur no penalty.",
    "The collection is stored in clay drawers that remain cool during the afternoon heat.",
    "A printed inventory is mailed to villages that have no reliable internet connection.",
  ];
  add("seed-library", "A lighthouse full of seeds", `<header><nav>Subscribe to the valley bulletin</nav></header><div class="layout"><aside>Sponsored garden equipment</aside><article><h1>A lighthouse full of seeds</h1>${article.slice(0,3).map(p=>`<p>${p}</p>`).join("")}<h2>Keeping the collection usable</h2>${article.slice(3).map(p=>`<p>${p}</p>`).join("")}</article></div><footer>Valley bulletin membership offers</footer>`, {
    category: "article", description: "Unseen article layout with an aside outside the article and long prose paragraphs.",
    mustContain: article, mustNotContain: ["Subscribe to the valley bulletin", "Sponsored garden equipment", "Valley bulletin membership offers"], headings: ["A lighthouse full of seeds", "Keeping the collection usable"],
  }, `A lighthouse full of seeds ${article.slice(0,3).join(" ")} Keeping the collection usable ${article.slice(3).join(" ")}`);
  const code = 'async function sample(sensor) {\n  const value = await sensor.read();\n  return { value, unit: "kPa" };\n}';
  add("reference-table", "Pressure sampler reference", `<nav>Purchase a sampler subscription</nav><main><h1>Pressure sampler reference</h1><p>Use the sampler only after the reference chamber reaches ambient temperature.</p><h2>Parameters</h2><table><thead><tr><th>Field</th><th>Type</th><th>Meaning</th></tr></thead><tbody><tr><td>interval</td><td>integer</td><td>Seconds between samples</td></tr><tr><td>unit</td><td>string</td><td>Output pressure unit</td></tr></tbody></table><h2>Example</h2><pre><code class="language-js">${escape(code)}</code></pre><p>Store the raw reading before applying any calibration correction.</p><a href="../calibration.html">Calibration procedure</a></main>`, {
    category: "docs", description: "Unseen semantic reference with a table, multiline JavaScript and a relative link.",
    mustContain: ["reference chamber reaches ambient temperature", "Seconds between samples", "Store the raw reading before applying any calibration correction"], mustNotContain: ["Purchase a sampler subscription"], headings: ["Pressure sampler reference", "Parameters", "Example"], code: [code], tables: [{ rows: [["Field","Type","Meaning"],["interval","integer","Seconds between samples"],["unit","string","Output pressure unit"]] }],
  }, `Pressure sampler reference Use the sampler only after the reference chamber reaches ambient temperature. Parameters Field Type Meaning interval integer Seconds between samples unit string Output pressure unit Example ${code} Store the raw reading before applying any calibration correction. Calibration procedure`);
  add("inline-evidence", "Archive recovery notes", '<main><h1>Archive recovery notes</h1><p>The operator reads <code>archive.lock</code> before opening the <strong>recovery journal</strong>.</p><p>A successful restore preserves the original timestamp and the owner’s signature.</p><p>Never replace a verified snapshot with an incomplete copy.</p></main>', {
    category: "citations", description: "Exact quotations spanning inline code, strong emphasis and typographic punctuation.",
    mustContain: ["reads archive.lock before opening the recovery journal", "preserves the original timestamp and the owner’s signature", "Never replace a verified snapshot with an incomplete copy"], mustNotContain: [],
  }, 'Archive recovery notes The operator reads archive.lock before opening the recovery journal. A successful restore preserves the original timestamp and the owner’s signature. Never replace a verified snapshot with an incomplete copy.');
  const delayed = '<h1>Reservoir inspection</h1><p>The western spillway reopened after engineers replaced the damaged control cable.</p><p>Inspection photographs are retained for seven years in the municipal archive.</p><p>The next inspection will compare vibration measurements from all four gates.</p>';
  add("delayed-shell", "Reservoir inspection", `<main id="content" aria-busy="true"><h1>Reservoir inspection</h1><p role="status">Loading inspection details…</p></main><script>setTimeout(()=>{const el=document.querySelector('#content');el.innerHTML=${JSON.stringify(delayed)};el.setAttribute('aria-busy','false')},1250)</script>`, {
    category: "javascript", description: "An asynchronous application fills a busy main region 1.25 seconds after navigation.", requiresJs: true,
    mustContain: ["replaced the damaged control cable", "retained for seven years in the municipal archive", "vibration measurements from all four gates"], mustNotContain: ["Loading inspection details"], headings: ["Reservoir inspection"],
  }, 'Reservoir inspection The western spillway reopened after engineers replaced the damaged control cable. Inspection photographs are retained for seven years in the municipal archive. The next inspection will compare vibration measurements from all four gates.');
  const shadowCode = 'const reading = { depth: 17, unit: "metres" };\nconsole.log(reading.depth);';
  const shadowMain = `<h1>Depth logger</h1><p>The logger writes one depth measurement after each completed descent.</p><logger-code><span slot="caption">Example depth record</span></logger-code><p>Disconnect the probe before replacing its protective cap.</p>`;
  add("nested-shadow", "Depth logger", `<main><depth-manual></depth-manual></main><script>customElements.define('logger-code',class extends HTMLElement{connectedCallback(){this.attachShadow({mode:'open'}).innerHTML=${JSON.stringify(`<section><slot name="caption">Unused fallback caption</slot><pre><code class="language-js">${escape(shadowCode)}</code></pre></section>`)}});customElements.define('depth-manual',class extends HTMLElement{connectedCallback(){this.attachShadow({mode:'open'}).innerHTML=${JSON.stringify(shadowMain)}}});</script>`, {
    category: "javascript", description: "Nested open shadow roots with a named slot and exact multiline code; fallback slot text is not rendered.", requiresJs: true,
    mustContain: ["one depth measurement after each completed descent", "Example depth record", "Disconnect the probe before replacing its protective cap"], mustNotContain: ["Unused fallback caption"], headings: ["Depth logger"], code: [shadowCode],
  }, `Depth logger The logger writes one depth measurement after each completed descent. Example depth record ${shadowCode} Disconnect the probe before replacing its protective cap.`);
  add("background-clock", "Glacier measurements", '<aside><span id="clock">0</span></aside><main><h1>Glacier measurements</h1><p>The survey team measures the terminus from the same brass marker every August.</p><p>Measurements are corrected for the slope of the valley floor before publication.</p><p>Archived field notebooks remain available at the regional geology library.</p></main><script>setInterval(()=>document.querySelector("#clock").textContent=String(Date.now()),40)</script>', {
    category: "javascript", description: "Complete static main content with a continuously mutating peripheral clock.", requiresJs: true,
    mustContain: ["same brass marker every August", "corrected for the slope of the valley floor", "regional geology library"], mustNotContain: [], headings: ["Glacier measurements"],
  }, 'Glacier measurements The survey team measures the terminus from the same brass marker every August. Measurements are corrected for the slope of the valley floor before publication. Archived field notebooks remain available at the regional geology library.');
  add("short-notice", "Bridge notice", '<main><h1>Bridge notice</h1><p>The footbridge is closed on Tuesday for a cable inspection.</p><p>Use the signed path beside the mill.</p></main>', {
    category: "short-content", description: "Legitimate short content must not be rejected as an empty application shell.",
    mustContain: ["closed on Tuesday for a cable inspection", "signed path beside the mill"], mustNotContain: [], headings: ["Bridge notice"],
  }, 'Bridge notice The footbridge is closed on Tuesday for a cable inspection. Use the signed path beside the mill.');
  add("unicode-protocol", "Station protocol", '<main><h1>Station protocol</h1><p>La température est relevée à midi dans l’abri météorologique.</p><p>観測記録は毎週金曜日に保存されます。</p><blockquote>Never round a raw measurement before archiving it.</blockquote><pre><code>station = "Ålesund"\nthreshold = 0.125</code></pre></main>', {
    category: "unicode", description: "Mixed-language evidence, curly apostrophes, block quote and non-ASCII source code.",
    mustContain: ["La température est relevée à midi", "観測記録は毎週金曜日に保存されます", "Never round a raw measurement before archiving it"], mustNotContain: [], code: ['station = "Ålesund"\nthreshold = 0.125'],
  }, 'Station protocol La température est relevée à midi dans l’abri météorologique. 観測記録は毎週金曜日に保存されます。 Never round a raw measurement before archiving it. station = "Ålesund" threshold = 0.125');
  return { files, cases };
}
