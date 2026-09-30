# Fetchkeep benchmark report — crawl — 2026-09-30T17-03-19-crawl

## Summary of what was run

- Suite: crawl; run id: 2026-09-30T17-03-19-crawl
- Started 2026-09-30T17:03:19.227Z, finished 2026-09-30T17:06:57.623Z
- Seed: 42; repetitions per case: 2; per-task timeout: 30000 ms; concurrency: 1
- Tokenizer: gpt-tokenizer (o200k_base, version 4.0.0)
- Fetch tasks: 0 over 0 cases; crawl tasks: 28
- Profiles: fetchkeep-http, fetchkeep-chromium, fetchkeep-lightpanda, fetchkeep-auto, firecrawl-selfhost, firecrawl-hosted, donsetch
- Fixture server: http://172.31.172.243:41237 (bound to 0.0.0.0)
- Command: `node bench/run.ts --engines fetchkeep,firecrawl,donsetch --suite crawl`
- Note: Tasks run sequentially (concurrency 1) in a seeded random order per repetition; all engines see the same URLs and per-request deadline.
- Note: Repetition 1 is the first request after the engine started (browsers launch lazily); later repetitions are warm.
- Note: Live websites change: live results are only comparable within one run.

## Environment

| key | value |
|---|---|
| os | Linux 6.18.33.2-microsoft-standard-WSL2 |
| distribution | Ubuntu 24.04.1 LTS |
| wsl | true |
| cpu | Intel(R) Core(TM) i7-9700K CPU @ 3.60GHz |
| logicalCpus | 8 |
| memoryGb | 15.6 |
| node | v24.15.0 |
| docker | 28.1.1 |
| fetchkeepCommit | a244b9aee566fd73516585973d1ed2d8256d90a6 |
| fetchkeepDirty | false |

## Engines

| profile | engine | version | revision | transport | available | reason | ready |
|---|---|---|---|---|---|---|---|
| fetchkeep-http | fetchkeep | 0.0.0 | a244b9aee566fd73516585973d1ed2d8256d90a6 | MCP stdio (web_fetch / web_crawl / web_read), warm server per profile | yes |  | 372 ms |
| fetchkeep-chromium | fetchkeep | 0.0.0 | a244b9aee566fd73516585973d1ed2d8256d90a6 | MCP stdio (web_fetch / web_crawl / web_read), warm server per profile | yes |  | 347 ms |
| fetchkeep-lightpanda | fetchkeep | 0.0.0 | a244b9aee566fd73516585973d1ed2d8256d90a6 | MCP stdio (web_fetch / web_crawl / web_read), warm server per profile | yes |  | 360 ms |
| fetchkeep-auto | fetchkeep | 0.0.0 | a244b9aee566fd73516585973d1ed2d8256d90a6 | MCP stdio (web_fetch / web_crawl / web_read), warm server per profile | yes |  | 357 ms |
| firecrawl-selfhost | firecrawl | apps/api 1.0.0 (self-hosted build) | 7e4a959dca0efbdad2f0a9d82b0fce20afeb9a4d | REST API v2 (http://localhost:3002) | yes |  | 0 ms |
| firecrawl-hosted | firecrawl | hosted API v2 | hosted service (version not exposed) | REST API v2 (https://api.firecrawl.dev) | no | FIRECRAWL_API_KEY is not set | n/a |
| donsetch | donsetch | 4.4.1 | v4.4.1 release binary (npm donsetch@4.4.1) | MCP stdio (web_fetch / web_crawl), warm server | yes |  | 52 ms |

### Setting differences

- fetchkeep-http: network: only the fixture server address (172.31.172.243/32) is allowed besides public addresses (FETCHKEEP_ALLOW_CIDRS)
- fetchkeep-http: documents are saved to a per-profile store (Fetchkeep default behaviour); no HTTP cache
- fetchkeep-chromium: network: only the fixture server address (172.31.172.243/32) is allowed besides public addresses (FETCHKEEP_ALLOW_CIDRS)
- fetchkeep-chromium: documents are saved to a per-profile store (Fetchkeep default behaviour); no HTTP cache
- fetchkeep-chromium: browser: Playwright Chromium headless shell 153 (playwright-core 1.63.0), sandbox on, settleMs 500 (default)
- fetchkeep-lightpanda: network: only the fixture server address (172.31.172.243/32) is allowed besides public addresses (FETCHKEEP_ALLOW_CIDRS)
- fetchkeep-lightpanda: documents are saved to a per-profile store (Fetchkeep default behaviour); no HTTP cache
- fetchkeep-lightpanda: browser: Lightpanda nightly (see engine config), spawned by Fetchkeep with telemetry disabled, settleMs 500 (default)
- fetchkeep-auto: network: only the fixture server address (172.31.172.243/32) is allowed besides public addresses (FETCHKEEP_ALLOW_CIDRS)
- fetchkeep-auto: documents are saved to a per-profile store (Fetchkeep default behaviour); no HTTP cache
- fetchkeep-auto: browser: Playwright Chromium headless shell 153 (playwright-core 1.63.0), sandbox on, settleMs 500 (default)
- fetchkeep-auto: auto: HTTP first, escalates to Chromium only when the heuristic flags the HTTP result (docs/browsers.md)
- firecrawl-selfhost: formats=[markdown], onlyMainContent=true (default), waitFor=0 (default), maxAge=0 and storeInCache=false (fresh scrapes, no Firecrawl cache)
- firecrawl-selfhost: self-host: upstream docker-compose.yaml at the pinned commit, services api+playwright-service+redis+rabbitmq+nuq-postgres; no Fire-engine, no proxies, auth disabled
- firecrawl-selfhost: ALLOW_LOCAL_WEBHOOKS=true and TEST_SUITE_SELF_HOSTED=true (bench/engines/firecrawl/compose.override.yaml) so the stack can reach the private fixture server
- firecrawl-hosted: formats=[markdown], onlyMainContent=true (default), waitFor=0 (default), maxAge=0 and storeInCache=false (fresh scrapes, no Firecrawl cache)
- firecrawl-hosted: hosted: cannot reach local fixtures (marked N/A); credits counted from responses (creditsUsed) with 1 credit/scrape as the estimate when absent
- donsetch: DONSETCH_ALLOW_PRIVATE_EGRESS=1: all private destinations allowed (DonSeTch has no per-address allow-list), needed for the local fixture server
- donsetch: archive=off: disables the default Wayback/archive fallback so results come from the live page
- donsetch: DONSETCH_BYPASS=0 and isolated cache/config dir (DONSETCH_CACHE_DIR, DONSETCH_NO_CONFIG_FILE=1)
- donsetch: browser: DONSETCH_BROWSER_BACKEND=headless with the same Chromium 153 build that Playwright installed (full Chromium, not the headless shell)

### Configuration

| profile | config |
|---|---|
| fetchkeep-http | {"mode":"http","maxChars":1000000} |
| fetchkeep-chromium | {"mode":"chromium","maxChars":1000000} |
| fetchkeep-lightpanda | {"mode":"lightpanda","maxChars":1000000,"lightpanda":"/home/rayor/fkbench/lightpanda","lightpandaVersion":"1.0.0-nightly.9929+e774f9bba"} |
| fetchkeep-auto | {"mode":"auto","maxChars":1000000} |
| firecrawl-selfhost | {"baseUrl":"http://localhost:3002","creditBudget":null} |
| firecrawl-hosted | {"baseUrl":"https://api.firecrawl.dev","creditBudget":0} |
| donsetch | {"tier":"auto (default)","archive":"off","max_chars":1000000,"browserBackend":"headless","chromium":"/home/rayor/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome"} |

## Results

Rates are over attempted tasks (ok + error); unavailable and N/A tasks are counted in their own columns and never enter a rate. Usable rate excludes cases whose correct outcome is an error (see `correct error`). Quality scores are means over ok tasks where the metric applies. Every aggregate shows its sample count; `n/a (n=0)` means no sample, not zero.

### Fixtures (synthetic, served locally)

No fixture tasks in this run.

### Live websites

No live tasks in this run.

### Held-out subset

Held-out cases were excluded from development tuning. Compare with the dev subset: a large gap suggests overfitting to the dev cases.

No held-out fixture tasks in this run.

## Quality detail

_(no rows)_

### Errors, escalation and retries

_(no rows)_

## Latency

Percentiles use the nearest-rank method: sort the latencies of `ok` tasks ascending and take the value at rank ceil(p/100 × n). `first` = repetition 1 (includes any per-URL cold work such as the first request to a host); `warm` = repetitions ≥ 2.

_(no rows)_

## Crawl

Coverage = expected pages found / expected pages (mean over tasks that ran). Forbidden = robots-disallowed or out-of-scope pages returned (summed). Duplicate rate = duplicate pages / pages returned. Latency p50 over ok tasks (nearest rank).

| case | profile | tasks | outcomes | coverage | pages returned (mean) | forbidden returned | duplicate rate | latency p50 | stop reason(s) | missing pages |
|---|---|---|---|---|---|---|---|---|---|---|
| fx-crawl-estuary | fetchkeep-http | 2 | ok 2 / error 0 | 1.000 (n=2) | 13.000 (n=2) | 0 | 0.000 (n=2) | 6518 ms (n=2) | depth_limit |  |
| fx-crawl-estuary | fetchkeep-chromium | 2 | ok 2 / error 0 | 1.000 (n=2) | 13.000 (n=2) | 0 | 0.000 (n=2) | 7860 ms (n=2) | depth_limit |  |
| fx-crawl-estuary | fetchkeep-lightpanda | 2 | ok 2 / error 0 | 1.000 (n=2) | 13.000 (n=2) | 0 | 0.000 (n=2) | 7032 ms (n=2) | depth_limit |  |
| fx-crawl-estuary | fetchkeep-auto | 2 | ok 2 / error 0 | 1.000 (n=2) | 13.000 (n=2) | 0 | 0.000 (n=2) | 6518 ms (n=2) | depth_limit |  |
| fx-crawl-estuary | firecrawl-selfhost | 2 | ok 2 / error 0 | 1.000 (n=2) | 14.500 (n=2) | 1 | 0.069 (n=2) | 11240 ms (n=2) | completed |  |
| fx-crawl-estuary | firecrawl-hosted | 2 | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×2) | n/a | n/a | n/a | n/a | n/a | n/a |  |
| fx-crawl-estuary | donsetch | 2 | ok 2 / error 0 | 0.846 (n=2) | 12.000 (n=2) | 2 | 0.000 (n=2) | 4172 ms (n=2) | FrontierEmpty | /crawl/plants/samphire.html, /crawl/hidden/lighthouse.html |
| live-crawl-quotes | fetchkeep-http | 2 | ok 2 / error 0 | 0.667 (n=2) | 15.000 (n=2) | 0 | 0.000 (n=2) | 7716 ms (n=2) | page_limit | https://quotes.toscrape.com/page/2/ |
| live-crawl-quotes | fetchkeep-chromium | 2 | ok 2 / error 0 | 0.667 (n=2) | 15.000 (n=2) | 0 | 0.000 (n=2) | 16349 ms (n=2) | page_limit | https://quotes.toscrape.com/page/2/ |
| live-crawl-quotes | fetchkeep-lightpanda | 2 | ok 2 / error 0 | 0.667 (n=2) | 15.000 (n=2) | 0 | 0.000 (n=2) | 9044 ms (n=2) | page_limit | https://quotes.toscrape.com/page/2/ |
| live-crawl-quotes | fetchkeep-auto | 2 | ok 2 / error 0 | 0.667 (n=2) | 15.000 (n=2) | 0 | 0.000 (n=2) | 7607 ms (n=2) | page_limit | https://quotes.toscrape.com/page/2/ |
| live-crawl-quotes | firecrawl-selfhost | 2 | ok 2 / error 0 | 0.667 (n=2) | 15.000 (n=2) | 0 | 0.000 (n=2) | 7065 ms (n=2) | completed | https://quotes.toscrape.com/page/2/ |
| live-crawl-quotes | firecrawl-hosted | 2 | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×2) | n/a | n/a | n/a | n/a | n/a | n/a |  |
| live-crawl-quotes | donsetch | 2 | ok 2 / error 0 | 0.500 (n=2) | 13.500 (n=2) | 0 | 0.000 (n=2) | 5495 ms (n=2) | MaxPages | https://quotes.toscrape.com/login, https://quotes.toscrape.com/page/2/ |

## Resources

Scope matters: a local process tree, a whole Docker stack and a remote service are different things. Numbers are only comparable between profiles with the same scope; remote services cannot be measured and are never compared.

| profile | engine | scope | CPU (run) | peak RSS | idle RSS | samples | note |
|---|---|---|---|---|---|---|---|
| fetchkeep-http | fetchkeep | local process tree (engine process + children) | 1.01 s | 141.6 MB | 99.2 MB | 864 |  |
| fetchkeep-chromium | fetchkeep | local process tree (engine process + children) | 10.16 s | 906.7 MB | 99.1 MB | 862 |  |
| fetchkeep-lightpanda | fetchkeep | local process tree (engine process + children) | 2.21 s | 198.2 MB | 99.3 MB | 860 |  |
| fetchkeep-auto | fetchkeep | local process tree (engine process + children) | 0.99 s | 174.1 MB | 99.5 MB | 858 |  |
| firecrawl-selfhost | firecrawl | whole Docker stack (all containers of the engine) | 62.34 s | 3957.8 MB | 3897.9 MB | 858 |  |
| donsetch | donsetch | local process tree (engine process + children) | 1.46 s | 1561.4 MB | 15.8 MB | 857 |  |
| firecrawl-hosted | firecrawl | remote service — not measurable | not measurable | not measurable | not measurable | 0 | engine not started |

Measured scopes differ (process-tree, docker-stack): peak RSS bars below are labelled with their scope and are not like-for-like.

## Cold start

No cold-start measurements in this run.

## Footprint

No footprint measurements in this run.

## Fetchkeep-specific features

Citation checks verify that a quoted passage can be re-read and cited from Fetchkeep's store. Other engines have no equivalent, so this is not part of the common-task comparison.

No Fetchkeep profile ran fetch tasks in this run.

## Unsupported / N/A / unavailable

### Unavailable engines

- firecrawl-hosted (firecrawl): unavailable — FIRECRAWL_API_KEY is not set

### Tasks not run (unavailable / N/A)

- firecrawl-hosted — live crawl: unavailable for 2 task(s) (engine unavailable: FIRECRAWL_API_KEY is not set); cases: live-crawl-quotes
- firecrawl-hosted — fixture crawl: unavailable for 2 task(s) (engine unavailable: FIRECRAWL_API_KEY is not set); cases: fx-crawl-estuary

### Metrics not applicable

_(none)_

## How to read this

- Fixtures are synthetic pages served locally: they isolate specific extraction problems (tables, code, boilerplate, JS rendering) with gold answers, but they are not a sample of the web. Live results reflect real sites at run time and can change between runs.
- Short output is not good extraction: fewer characters or tokens can mean missing content. Read chars/tokens together with passage recall, boilerplate exclusion and token F1.
- There is no overall winner. The trade-offs below are derived from this run's numbers only, with margins and sample sizes; engines differ in transport (local MCP stdio, REST, hosted service), so latency includes very different overheads.
- Hosted services cannot run local fixtures; those tasks are N/A and excluded from rates rather than counted as failures.
- Percentiles use the nearest-rank method: sort the latencies of `ok` tasks ascending and take the value at rank ceil(p/100 × n). `first` = repetition 1 (includes any per-URL cold work such as the first request to a host); `warm` = repetitions ≥ 2.

## Reproduce

Re-run with:

```
npm run bench -- --engines fetchkeep-http,fetchkeep-chromium,fetchkeep-lightpanda,fetchkeep-auto,firecrawl-selfhost,firecrawl-hosted,donsetch --suite crawl --repetitions 2 --seed 42 --timeout 30000
```

| dataset | path | sha256 | cases |
|---|---|---|---|
| fixtures | bench/datasets/fixtures.json | 8c7b0a6f99ea2f1fd5551747be2df264f7fbfacc03973227cc484e740f576749 | 21 |
| live | bench/datasets/live.json | d458c8afc2696bd34699711b710ebee36bfbaf2f9557ae1893b31090ae6f7474 | 24 |
| live-crawl | bench/datasets/live-crawl.json | 166f4d2d133883c97d2b24c57650f1f9edd4e72d02611cda8b2e98d5a164ec75 | 1 |
| fixture-files | bench/fixtures/SHA256SUMS | 9d450f2677512812812f7a05020e5e75cd8cd2588895585786a35fb74679de52 | 0 |

Per-case outputs: see `cases.csv` and the per-case inspection section of `report.html`; raw engine output is under `raw/`.
