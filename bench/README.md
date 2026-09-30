# Fetchkeep benchmark: Fetchkeep vs Firecrawl vs DonSeTch

An engine-neutral, reproducible benchmark for web retrieval tools used by AI agents. Every engine receives the same
URLs, the same per-request deadline and is scored with the same functions (`bench/lib/score.ts`). Engines that are
missing, unconfigured or unable to run a case are recorded as **unavailable** or **N/A** with a reason, never as
zeros and never with invented numbers.

```sh
npm run bench -- --engines fetchkeep,firecrawl,donsetch --suite smoke
npm run bench -- --engines fetchkeep,firecrawl,donsetch --suite fetch
npm run bench -- --engines fetchkeep,firecrawl,donsetch --suite crawl
npm run bench -- --engines fetchkeep,firecrawl,donsetch --suite full --cold-start --footprint
npm run bench -- --engines fetchkeep,firecrawl,donsetch --suite full --repetitions 7 --cold-start --footprint
npm run bench -- --engines fetchkeep,firecrawl,donsetch --suite validation
npm run bench:report -- --run bench/runs/<run-directory>
npm run bench:publish -- --run bench/runs/<run-directory>     # copy to bench/results/ for committing
```

`--engines` takes engine names (expanded to all their profiles) or individual profiles, so any engine or profile can
run on its own:

| Engine | Profiles | Interface used |
|---|---|---|
| Fetchkeep | `fetchkeep-http`, `fetchkeep-chromium`, `fetchkeep-lightpanda`, `fetchkeep-auto` | MCP stdio server (`web_fetch`, `web_crawl`, `web_read`) |
| Firecrawl | `firecrawl-selfhost`, `firecrawl-hosted` (separate, never substituted) | REST API v2 (`/v2/scrape`, `/v2/crawl`) |
| DonSeTch | `donsetch` | MCP stdio server (`web_fetch`, `web_crawl`) |

Other options: `--repetitions`, `--seed`, `--timeout <ms>` (default 30000), `--cold-start`, `--footprint`,
`--advertise <host>`, `--allow-paid --budget-credits <n>`, `--out`, `--no-report`. See `bench/run.ts`.

`full` includes all 44 fetch cases and both crawl cases, with three repetitions, in a single run and report.
Use it for a shareable complete comparison; `smoke` is only a quick engine/setup check. Resource measurements
for a full run include both fetch and crawl work and must not be compared directly to fetch-only totals.

For performance work, use at least seven repetitions rather than treating the historical three-repetition
default as a precise estimate. Keep the old `full` inputs unchanged and run `validation` separately.

### Startup and extraction profiling

These measure different costs from the persistent MCP fetch comparison:

```sh
npm run build
node bench/startup.ts --repetitions 15 --out bench/runs/startup.json
node --cpu-prof --cpu-prof-dir=bench/runs bench/extraction.ts --out bench/runs/extraction.json
# Compare a second compiled implementation against a saved extraction profile:
node bench/extraction.ts --entry /path/to/other/dist/src/core/extract/html.js \
  --compare bench/runs/extraction.json --out bench/runs/extraction-other.json
```

`startup.ts` measures fresh CLI spawn-to-exit for help, doctor, saved read and a fresh local HTTP fetch, interleaved
by repetition. Persistence remains enabled and reads use a populated workspace. `extraction.ts` measures four
synthetic document shapes, excludes the first pass, records peak process RSS and hashes the complete extracted
objects. A changed output hash fails `--compare`; faster but different output is not silently accepted as equivalent.
Both commands retain raw samples. Match Node version, filesystem/path depth and machine load for before/after
measurements; OS/module disk caches are not flushed. Neither is an end-to-end live-web speed claim.

### Multi-operation MCP and saved-library workloads

```sh
node bench/workloads.ts --profiles fetchkeep-http,fetchkeep-auto,donsetch \
  --repetitions 7 --operations 4 --out bench/runs/workloads
```

Use a **new** output directory. The command writes `workloads.json` (raw operation evidence) and `workloads.md`.
The session workload makes fresh retrieval calls over persistent MCP for both tools. The separate saved-library
workflow exercises local search, exact quote lookup/reopening and retained-version citations with the fixture
server offline. Unsupported competitor library operations are N/A, never failures or zero-latency wins.
These local synthetic workloads are separate from the common fetch ranking and its CSVs. Publish them without
their runtime state using `node bench/publish.ts --run bench/runs/workloads --name <new-result-name>`.
The publisher refuses existing result directories. Browser profiles use the same environment as below.

## Prerequisites

The published results were produced on Linux (Ubuntu 24.04 under WSL2); process-tree CPU/memory sampling uses
`/proc` and is reported as unavailable on other platforms.

| Profile | Needs | Environment variable |
|---|---|---|
| Fetchkeep (all) | `npm ci && npm run build` (the `bench` script builds) | — |
| `fetchkeep-chromium`, `fetchkeep-auto` | `npx playwright-core install --only-shell chromium` (+ system libs on Linux) | — |
| `fetchkeep-lightpanda` | Lightpanda executable (Linux/macOS) | `FETCHKEEP_BENCH_LIGHTPANDA=/path/to/lightpanda` |
| `donsetch` | `npm install --prefix bench/.tools donsetch@4.4.1` (downloads the release binary) | `FETCHKEEP_BENCH_DONSETCH` (default `bench/.tools/node_modules/donsetch/binaries/donsetch`) |
| `donsetch` browser tier | a Chromium: `npx playwright-core install chromium` | `FETCHKEEP_BENCH_CHROMIUM=$(node -e 'console.log(require("playwright-core").chromium.executablePath())')` |
| `firecrawl-selfhost` | Docker; see [engines/firecrawl/README.md](engines/firecrawl/README.md) | `FIRECRAWL_SELFHOST_URL` (default `http://localhost:3002`), `FIRECRAWL_CHECKOUT` |
| `firecrawl-hosted` | API key **and** explicit opt-in to spend credits | `FIRECRAWL_API_KEY`, `--allow-paid --budget-credits N` |

## Datasets

| Dataset | File | Content |
|---|---|---|
| Local fixtures (synthetic) | `datasets/fixtures.json`, `fixtures/site/`, `fixtures/gold/` | 20 fetch cases: articles, documentation, tables, code, navigation-heavy page, three JavaScript pages, text PDFs, plain text, a windows-1252 page, redirects, 404/500/redirect loop, a slow page; one 15-page crawl graph with robots.txt, sitemap-only page, duplicate content, a redirect and depth/robots traps. Generated by `fixtures/build.ts` (`npm run bench:fixtures`); hashes in `fixtures/SHA256SUMS`. |
| Live websites | `datasets/live.json` | 24 public pages (Wikipedia, MDN, Python, Node.js, Rust, React docs, RFCs, IANA, PDFs on arXiv, JavaScript-only pages, …) with expected passages, boilerplate, headings, tables and code, **annotated on 2026-09-30**. Content and availability change; results are comparable only within a run. |
| Live crawl | `datasets/live-crawl.json` | One bounded crawl of a scraping-practice site with a small must-have page set. |
| Fresh validation | `datasets/validation.json`, `fixtures/validation.ts` | Eight synthetic cases frozen before optimized implementations for #37–40 were exercised. Separate `val-*` suite with seven repetitions. Project-maintained, not independently validated. |

About 25% of the original cases were marked `heldOut` and initially excluded from tuning. Those published cases
have now been inspected during optimization: their grouping is retained for historical comparison, but they are
**regression evidence, not unseen validation**. The separate validation suite was frozen before its first run;
after inspection, those cases must also be treated as regression inputs for any subsequent tuning. Results must
identify the dataset hash and source revision rather than claim an indefinitely untouched holdout.

The first `2026-09-30-validation` run uncovered a missing brace in the nested-shadow fixture script, not a product
defect. That run remains published. `validation-corrected` identifies the rerun after fixing that brace; the fixture
correction changes no expectations or scoring. The final product also addresses the original historical ten-second
timer case, not a new validation failure. Do not present the broken first run as eight valid unseen cases, or the
corrected rerun as a newly blinded holdout.

Hosted services cannot reach the local fixture server (it is deliberately not exposed to the internet), so hosted
profiles are N/A for fixture cases.

## Fairness rules implemented

- Same URLs, same deadline (`--timeout`, passed to each engine's own deadline parameter), concurrency 1.
- Tasks are interleaved in a seeded random order per repetition (`--seed`), so drift in live sites or the machine
  affects engines alike. Repetition 1 is the **first pass over all cases**, not a fresh process per case; later
  passes are reported separately as warm. MCP servers persist and browsers launch lazily.
- Caches: Firecrawl requests use `maxAge: 0, storeInCache: false`; DonSeTch runs with an isolated cache directory and
  `archive: "off"` (no Wayback fallback); Fetchkeep has no HTTP cache (it saves documents, which is part of its cost).
- Every retry and browser escalation happens inside the engine call, so it is included in the measured latency.
  Engine-reported attempts and escalations are recorded.
- Unavoidable setting differences (e.g. how each engine is allowed to reach the private fixture address) are
  recorded per engine in `meta.json` and in the report.
- Quality is never inferred from brevity: short output that misses annotated passages scores low.
- Fetchkeep-only features (stable citations) are reported in a separate section, not mixed into common tasks.
- Competitors' published numbers are never used.

## Metrics

| Metric | Definition |
|---|---|
| Usable retrieval | Engine returned content containing ≥ 75% of the annotated key passages. |
| Passage recall | Fraction of `mustContain` passages found in the output (markup-insensitive, case-insensitive). |
| Boilerplate exclusion | 1 − fraction of annotated boilerplate strings (nav, footer, cookie banner, ads) present. |
| Token precision / recall / F1 | Multiset word overlap with the gold main text (fixtures only). |
| Headings / tables / code | Fraction of expected headings (ATX or setext), table rows (all cells on one Markdown table row, in order) and code blocks (verbatim inside a fenced/indented block) preserved. |
| Correct error | For cases whose correct outcome is an error (404, 500, redirect loop): the engine reported an error. |
| Failure rates | Timeout, blocked, and extraction failure (success but < 50% passage recall), from engine-reported errors. |
| Output size | Characters and tokens (`gpt-tokenizer` `o200k_base`, version recorded). |
| Latency | End-to-end wall time of the engine call; p50/p95 by the nearest-rank method with sample counts. |
| Crawl | Coverage of expected pages, forbidden pages returned (robots-disallowed, beyond depth), duplicate rate (same normalized URL returned twice), stop reason. |
| Escalation | Fraction of requests where the engine reported switching to a browser, and attempts per request. |
| Cold start | Fetchkeep/DonSeTch: one-shot CLI process spawn → fetch → exit. Firecrawl self-host: full stack restart until the first successful scrape. |
| Footprint | Bytes on disk (`du -sb`) of what each profile needs installed; Docker image sizes for Firecrawl. |
| CPU / peak memory | Whole process tree of the engine (server + browsers) via `/proc`, or the whole Docker Compose stack via the Engine API. Scopes are labelled; hosted services are "not measurable". |
| Cost | Credits reported by hosted APIs (estimates are labelled). |
| Citations (Fetchkeep only) | For each passage present in the output, re-reading it from the store by `fk:` reference returns the exact quote. |
| Phase diagnostics | Engine-reported timings only. Fetchkeep exposes network/body, extraction, browser setup/navigation/readiness/serialization and persistence. Missing competitor phases remain N/A. `firstByteMs` is nested within `downloadMs`; `renderMs` overlaps browser phases. Failed-attempt stage breakdowns remain unavailable. |
| Uncertainty | Deterministic case-cluster bootstrap intervals: all repetitions of a URL are resampled together rather than treated as independent websites. Read independent-case and attempt counts alongside intervals. |
| Paired latency | Match successful outputs on the same case **and repetition** for each profile pair. Show matched counts and retain each profile's full quality/error denominators; conditioning on common success does not erase failures. |

No LLM judge is used in the published results.

The old citation verifier searched Markdown for a plain-text quote, incorrectly rejecting quotations spanning
inline code (historically `fx-docs-tabs`). Current verification reopens the exact structured block and checks the
reported text span. Historical artifacts remain unchanged; the correction is a measurement fix, not a new product
ability or an extraction-quality gain.

## Output

A run directory contains `meta.json` (environment, engine versions/revisions, configuration, dataset hashes, exact
rerun command), `cases.json`, `records.jsonl`, `crawl.jsonl`, `coldstart.json`, `resources.json`,
`footprint.json`, raw outputs and errors under `raw/<profile>/`, and the generated `summary.csv`, `cases.csv`,
`crawl.csv`, `report.md` and standalone `report.html` (charts and per-case inspection).

Published runs live in [`results/`](results/). Raw outputs of live third-party pages are withheld there (their
SHA-256 and length are listed in `raw/WITHHELD.json`); rerun the benchmark to inspect them.

### Using the HTML report

Open `report.html` in a browser, including via `file://`. It has no external scripts, fonts or stylesheets:
share that one file without deploying a website.

- Start with **Compare this run**. Choose local fixtures or live websites, a development/held-out split,
  and all tasks or common cases. Hide profiles or sort by usable rate, recall or warm p50; missing measurements
  remain `n/a`, not zero. Read sample counts alongside every score.
- Use **Case inspector** to search IDs, URLs and descriptions, filter cases, and expand raw previews/errors.
  Crawl cases include missing/unexpected pages and stop reasons.
- Use sidebar navigation (horizontal on mobile) to reach resources, cold start, footprint, methodology and
  reproduction details. Wide tables scroll within their own region rather than widening the page.
- **Download summary.csv / cases.csv / crawl.csv** exports data embedded in the HTML itself. No adjacent
  files or server are needed. Crawl export appears only when crawl records exist.
- Print from your browser for a static report. Filtering never changes the underlying run records or CSV exports.
