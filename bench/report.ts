// Usage: `node bench/report.ts --run <run-dir>` — writes summary.csv, cases.csv, crawl.csv (if any), report.md and report.html into the run dir.
import { generateReport } from "./lib/report.ts";

const i = process.argv.indexOf("--run");
const runDir = i > 0 ? process.argv[i + 1] : undefined;
if (!runDir) {
  process.stderr.write("usage: node bench/report.ts --run <run-dir>\n");
  process.exit(2);
}
try {
  const { files } = await generateReport(runDir);
  for (const f of files) process.stderr.write(`wrote ${f}\n`);
} catch (error) {
  process.stderr.write(`report failed: ${(error as Error).message}\n`);
  process.exit(1);
}
