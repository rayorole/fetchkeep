# Measured results — 2026-09-30

## Recommendation

Keep the default install browser-free and HTTP-first. Enable **Chromium for auto escalation** when JavaScript rendering is needed. In this run auto matched Chromium's 69/72 usable live outputs while escalating only 9/72 requests; its warm median was 394 ms versus 1,832 ms for always-Chromium. Chromium's sandbox and broader compatibility make it the recommended optional backend for arbitrary sites, not a guarantee of safe execution.

Keep **Lightpanda experimental and opt-in**, preferably in an isolated environment for trusted workloads. It was materially lighter and faster than always-Chromium, but yielded 68/72 usable live outputs, preserved fewer annotated code blocks, has no Chromium-equivalent sandbox, and was tested only on Linux x86_64. Do not silently substitute it for Chromium.

There is no overall winner: DonSeTch had the fastest warm live median and cold start. Firecrawl self-hosted offers a different deployment model; these results say nothing about the unavailable hosted service or proprietary Fire-engine.

## Artifacts and method

- [Fetch report](2026-09-30-fetch/report.md), [standalone HTML](2026-09-30-fetch/report.html), [summary CSV](2026-09-30-fetch/summary.csv), [per-task JSONL](2026-09-30-fetch/records.jsonl).
- [Crawl report](2026-09-30-crawl/report.md), [standalone HTML](2026-09-30-crawl/report.html), [per-task JSONL](2026-09-30-crawl/crawl.jsonl).
- Each directory includes exact cases, environment/version metadata and resource samples. Synthetic raw outputs are included; live third-party content is withheld with hashes and byte counts in `raw/WITHHELD.json`.
- Reproduction and adapter configuration: [benchmark guide](../README.md). Quality definitions and denominators are in the generated reports.

Measured clean commit `a244b9aee566fd73516585973d1ed2d8256d90a6` (package version then 0.0.0; v0.1.0 changes packaging/docs, not retrieval code). Ubuntu 24.04.1 under WSL2, i7-9700K, 8 logical CPUs, 15.6 GiB RAM, Node 24.15.0. Chromium 153.0.8010.12, Playwright 1.63.0; Lightpanda `1.0.0-nightly.9929+e774f9bba`; DonSeTch 4.4.1; Firecrawl source `7e4a959dca0efbdad2f0a9d82b0fce20afeb9a4d`. See `meta.json` for commands and full pins.

Fetch: 20 synthetic cases plus 24 live cases, three repetitions, concurrency one, seeded shuffle. 924 records include 132 unavailable hosted-Firecrawl records. Six live cases and six fixture cases were held out from tuning. Crawl: two cases, two repetitions, 28 records including four unavailable hosted records. Development cases informed fixes before this final clean run; held-out cases did not. This small curated sample is not a population estimate or statistical proof of superiority. Live content and network conditions drift.

Fetchkeep and DonSeTch use warm MCP servers; Firecrawl uses REST v2 with `maxAge: 0`, `storeInCache: false`, default `waitFor: 0`. DonSeTch archive and bypass are disabled, with isolated cache. Default waits are intentionally not tuned per website. No LLM judge was used. Hosted Firecrawl was not run: no API key and no paid spend.

## Fetch quality and latency

Usable means at least 75% annotated passage recall. Expected-error fixtures are excluded from usable denominators and scored separately: all six available profiles correctly returned all nine expected errors. Latency includes successful task responses, including those with insufficient extracted content; it excludes errors. Warm means repetitions two and three, not necessarily a fresh origin cache.

| Profile | Fixture usable (of 51) | Live usable (of 72) | Warm live p50 / p95, ms | Warm latency n |
|---|---:|---:|---:|---:|
| Fetchkeep HTTP | 45 (88.2%) | 63 (87.5%) | 363 / 1,256 | 48 |
| Fetchkeep Chromium | 51 (100%) | 69 (95.8%) | 1,832 / 2,991 | 48 |
| Fetchkeep Lightpanda | 51 (100%) | 68 (94.4%) | 1,102 / 1,885 | 48 |
| Fetchkeep auto (Chromium) | 51 (100%) | 69 (95.8%) | 394 / 2,276 | 48 |
| Firecrawl self-hosted | 48 (94.1%) | 66 (91.7%) | 782 / 5,837 | 46 |
| DonSeTch | 51 (100%) | 66 (91.7%) | 207 / 945 | 46 |

Fixture gold-word multiset F1: HTTP/auto 0.9725, Chromium/Lightpanda 0.9650, Firecrawl 0.9477, DonSeTch 0.8220 (27 applicable successful tasks each). Live boilerplate exclusion: Fetchkeep 0.8750, Firecrawl 0.6597 (48 tasks each), DonSeTch 0.8000 (45). Live code preservation: HTTP/auto 1.0000, Chromium/DonSeTch 0.8571, Lightpanda 0.7143, Firecrawl 0.3333 (21 applicable tasks each). These are separate metrics, not a weighted leaderboard.

All profiles missed the deliberately delayed JavaScript quotes page at default waits. Chromium/auto passed crates.io/serde three times; Lightpanda twice; Firecrawl errored three times; HTTP and DonSeTch missed the annotated content. Firecrawl's default wait missed the fixture's XHR SPA. Browser DOM serialization omitted shadow-DOM code on MDN; HTTP/auto retained it. PDFs worked through HTTP fallback in Fetchkeep browser profiles.

Fetchkeep citation readback averaged 1.0 on applicable live outputs (HTTP n=63, Chromium/auto n=69, Lightpanda n=68), but not on every fixture: auto/browser 0.9804 (n=51), HTTP 0.9778 (n=45). The held-out mismatch is retained, not tuned away. Competitor citation fields are not equivalent and are not assigned fake zero scores. DonSeTch escalation is unavailable, not zero.

## Resources, cold start and installation

Full fetch-run CPU and peak summed resident memory, including child browser processes or Firecrawl's entire Docker stack:

| Profile | CPU seconds | Peak RSS MiB | Idle RSS MiB | Cold-start median ms |
|---|---:|---:|---:|---:|
| HTTP | 23.13 | 560.4 | 98.8 | 406 |
| Chromium | 73.17 | 1,281.2 | 99.2 | 1,830 |
| Lightpanda | 34.33 | 622.6 | 99.4 | 1,381 |
| Auto | 28.85 | 1,061.9 | 99.3 | 422 |
| Firecrawl stack | 190.30 | 3,865.3 | 3,636.0 | 26,499 |
| DonSeTch | 5.61 | 3,118.1 | 15.4 | 36 |

Sampling is every 250 ms; short-lived children can be missed and summed RSS can count shared mappings more than once. CPU assumes Linux 100 Hz ticks and memory 4 KiB pages. These are measurements on this host, not portable budgets. Cold start uses five one-shot CLI-to-local-page samples for Fetchkeep/DonSeTch, versus three whole-compose-restart-to-first-scrape samples for Firecrawl: different operational boundaries, disclosed rather than equated. See `resources.json` and `coldstart.json`.

Measured Fetchkeep production `node_modules`: 96.6 MiB without browsers; tarball approximately 0.1 MiB. Additional Playwright core: 12.8 MiB, Chromium headless shell: 259.9 MiB. Puppeteer core alone: 5.7 MiB (dependencies excluded), Lightpanda binary: 172.9 MiB. DonSeTch package: 44.7 MiB plus its optional dependencies and 391.2 MiB full Chromium. Firecrawl image sizes total approximately 4,005 MiB; shared layers may overlap. These sizes are not interchangeable install totals; raw measurements and exclusions are in `footprint.json`.

## Crawl

All Fetchkeep profiles found 13/13 required fixture pages in both runs, with no forbidden or duplicate URLs. HTTP/auto took approximately 6.5 seconds, Lightpanda 7.0 seconds, Chromium 7.9–8.3 seconds. Firecrawl found 13/13 but returned duplicates (6.7–7.1%) and one forbidden URL in one run, taking 11.2–16.3 seconds. DonSeTch found 11/13, with one forbidden URL each run, taking 4.2 seconds.

The live crawl is a bounded ordering smoke, not exhaustive coverage: Fetchkeep and Firecrawl found 2/3 must-have pages within the 15-page cap; DonSeTch found 2/3 then 1/3. Do not infer whole-site completeness from this result.
