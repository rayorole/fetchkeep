/** CPU profiling: node --cpu-prof --cpu-prof-dir=bench/runs bench/extraction.ts --out bench/runs/extraction.json */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import type { ExtractedDocument } from "../src/core/schema.ts";

const { values } = parseArgs({ options: {
  entry: { type: "string", default: "dist/src/core/extract/html.js" },
  out: { type: "string", default: "bench/runs/extraction.json" },
  compare: { type: "string" },
  repetitions: { type: "string", default: "15" },
}, allowPositionals: false });
const repetitions = Number(values.repetitions);
if (!Number.isSafeInteger(repetitions) || repetitions < 2) throw new Error("--repetitions must be an integer of at least two (first pass excluded)");
const entry = resolve(values.entry!);
const { extractHtml } = await import(pathToFileURL(entry).href) as { extractHtml(html: string, opts: { url: string }): ExtractedDocument };
const page = (content: string) => `<!doctype html><html lang="en"><head><title>Subsystem operations | Field Manual</title><meta name="author" content="J. Arden"><base href="https://docs.example.com/manual/"></head><body><header><a href="/">Field Manual</a></header><nav><a href="/topics">Topics</a></nav>${content}<footer>All rights reserved</footer></body></html>`;
const paragraph = (n: number) => `During inspection ${n}, the operator records the temperature and calibrates the pressure sensor against an independent instrument. Do not disconnect the pump while a measurement is in progress. Inspect the seal after each cycle and record every replacement in the <a href="reference">reference log</a>.`;
const section = (n: number) => `<section><h2 id="step-${n}">Operation ${n}<a href="#step-${n}">¶</a></h2><p>${paragraph(n)}</p><pre class="language-js"><code>const sample${n} = { pressure: ${n}, ready: true };\nconsole.log(sample${n});</code></pre><table><tr><th>Channel</th><th>Reading</th></tr><tr><td><a href="channels/${n}">probe ${n}</a></td><td><strong>${n}</strong> | stable</td></tr></table></section>`;
const corpus: [string, string][] = [
  ["small-semantic", page('<main><h1>Operations</h1>' + Array.from({ length: 30 }, (_, n) => section(n)).join("") + '</main>')],
  ["large-semantic", page('<main><h1>Operations</h1>' + Array.from({ length: 700 }, (_, n) => section(n)).join("") + '</main>')],
  ["ambiguous-article", page('<div class="columns"><div class="post"><h1>Why measurement matters</h1>' + Array.from({ length: 100 }, (_, n) => `<p>${paragraph(n)}</p>`).join("") + '</div><div class="related"><p>Related stories and promotional links.</p></div></div>')],
  ["sparse-semantic", page('<main><h1>Quick reference</h1><p>Inspect <em>every</em> seal.</p><div>Carry <strong>two</strong> spare seals and <a href="parts">order parts</a> before departure.</div><pre>pump.stop()</pre><table><tr><th>Item</th><th>Quantity</th></tr><tr><td>Seal</td><td>2</td></tr></table></main>')],
];
const measurements: { name: string; repetition: number; ms: number }[] = [];
const outputHashes: Record<string, string> = {};
for (let repetition = 0; repetition < repetitions; repetition++) {
  for (const [name, html] of corpus) {
    const started = performance.now();
    const output = extractHtml(html, { url: "https://docs.example.com/manual/start" });
    measurements.push({ name, repetition, ms: performance.now() - started });
    const hash = createHash("sha256").update(JSON.stringify(output)).digest("hex");
    if (outputHashes[name]) assert.equal(hash, outputHashes[name], `${name}: extraction is not deterministic`);
    outputHashes[name] = hash;
  }
}
if (values.compare) {
  const baseline = JSON.parse(await readFile(values.compare, "utf8")) as { outputHashes: Record<string, string> };
  assert.deepEqual(outputHashes, baseline.outputHashes, "Extraction content/metadata changed; inspect differences before claiming an equivalent optimization");
}
const summary = corpus.map(([name, html]) => {
  const samples = measurements.filter(m => m.name === name && m.repetition > 0).map(m => m.ms).sort((a, b) => a - b);
  return { name, bytes: Buffer.byteLength(html), n: samples.length, medianMs: samples[Math.ceil(samples.length / 2) - 1], p95Ms: samples[Math.ceil(samples.length * 0.95) - 1] };
});
const result = { node: process.version, platform: process.platform, entry, at: new Date().toISOString(),
  command: `node bench/extraction.ts ${process.argv.slice(2).join(" ")}`,
  method: "Synthetic extraction-only workload, one process, interleaved documents; first pass discarded. Full ExtractedDocument hashes include Markdown, typed blocks, citations offsets/hashes, links and metadata. No network or persistence; not end-to-end fetch latency.",
  peakRssMb: process.resourceUsage().maxRSS / 1024, summary, measurements, outputHashes };
await mkdir(dirname(resolve(values.out!)), { recursive: true });
await writeFile(values.out!, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ summary, peakRssMb: result.peakRssMb, outputHashes }, null, 2));
