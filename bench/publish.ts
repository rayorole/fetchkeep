/**
 * Copies a run directory into bench/results/<runId>/ for committing, then regenerates the reports there.
 *
 *   node bench/publish.ts --run bench/runs/<runId>
 *
 * Raw outputs of live websites are third-party content: they are replaced by a manifest with their SHA-256 and
 * length so the published report can still be checked against a rerun, while fixture outputs (synthetic, written for
 * this repository) are published in full. Local state (stores, caches) is never copied.
 */
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { parseArgs } from "node:util";
import { generateReport } from "./lib/report.ts";
import { BENCH } from "./lib/runner.ts";

const { values } = parseArgs({ options: { run: { type: "string" }, name: { type: "string" } } });
if (!values.run) {
  process.stderr.write("usage: node bench/publish.ts --run <run-directory> [--name <result-name>]\n");
  process.exit(2);
}
const src = values.run;
const dest = join(BENCH, "results", values.name ?? basename(src));
if (existsSync(dest)) throw new Error(`refusing to overwrite an existing result: ${dest}; choose a new --name`);
mkdirSync(join(dest, "raw"), { recursive: true });
if (existsSync(join(src, "workloads.json"))) {
  for (const file of ["workloads.json", "workloads.md"]) cpSync(join(src, file), join(dest, file));
  process.stderr.write(`published separate workload evidence ${dest}\n`);
  process.exit(0);
}

for (const f of ["meta.json", "cases.json", "records.jsonl", "crawl.jsonl", "coldstart.json", "resources.json", "footprint.json"]) {
  if (existsSync(join(src, f))) cpSync(join(src, f), join(dest, f));
}

const withheld: { path: string; sha256: string; bytes: number }[] = [];
const rawRoot = join(src, "raw");
if (existsSync(rawRoot)) {
  for (const profile of readdirSync(rawRoot)) {
    for (const file of readdirSync(join(rawRoot, profile))) {
      const from = join(rawRoot, profile, file);
      if (!statSync(from).isFile()) continue;
      const rel = relative(src, from).replace(/\\/g, "/");
      if (file.startsWith("live-")) {
        const body = readFileSync(from);
        withheld.push({ path: rel, sha256: createHash("sha256").update(body).digest("hex"), bytes: body.length });
      } else {
        mkdirSync(join(dest, "raw", profile), { recursive: true });
        cpSync(from, join(dest, "raw", profile, file));
      }
    }
  }
}
writeFileSync(
  join(dest, "raw", "WITHHELD.json"),
  `${JSON.stringify({ reason: "Raw outputs of live third-party websites are not redistributed. Hashes allow comparison with a rerun.", files: withheld }, null, 2)}\n`,
);
const { files } = await generateReport(dest);
process.stderr.write(`published ${dest}\n${files.join("\n")}\n`);
