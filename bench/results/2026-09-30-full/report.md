# Fetchkeep benchmark report — full — 2026-09-30T18-03-03-full

## Summary of what was run

- Suite: full; run id: 2026-09-30T18-03-03-full
- Started 2026-09-30T18:03:03.220Z, finished 2026-09-30T18:21:13.731Z
- Seed: 42; repetitions per case: 3; per-task timeout: 30000 ms; concurrency: 1
- Tokenizer: gpt-tokenizer (o200k_base, version 4.0.0)
- Fetch tasks: 924 over 44 cases; crawl tasks: 42
- Profiles: fetchkeep-http, fetchkeep-chromium, fetchkeep-lightpanda, fetchkeep-auto, firecrawl-selfhost, firecrawl-hosted, donsetch
- Fixture server: http://172.31.172.243:44735 (bound to 0.0.0.0)
- Command: `node bench/run.ts --engines fetchkeep,firecrawl,donsetch --suite full --cold-start --footprint --out bench/runs/2026-09-30-full`
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
| fetchkeepCommit | a74656b520ff90d632366b757bb6777d17df2bdd |
| fetchkeepDirty | false |

## Engines

| profile | engine | version | revision | transport | available | reason | ready |
|---|---|---|---|---|---|---|---|
| fetchkeep-http | fetchkeep | 0.1.2 | a74656b520ff90d632366b757bb6777d17df2bdd | MCP stdio (web_fetch / web_crawl / web_read), warm server per profile | yes |  | 437 ms |
| fetchkeep-chromium | fetchkeep | 0.1.2 | a74656b520ff90d632366b757bb6777d17df2bdd | MCP stdio (web_fetch / web_crawl / web_read), warm server per profile | yes |  | 382 ms |
| fetchkeep-lightpanda | fetchkeep | 0.1.2 | a74656b520ff90d632366b757bb6777d17df2bdd | MCP stdio (web_fetch / web_crawl / web_read), warm server per profile | yes |  | 373 ms |
| fetchkeep-auto | fetchkeep | 0.1.2 | a74656b520ff90d632366b757bb6777d17df2bdd | MCP stdio (web_fetch / web_crawl / web_read), warm server per profile | yes |  | 396 ms |
| firecrawl-selfhost | firecrawl | apps/api 1.0.0 (self-hosted build) | 7e4a959dca0efbdad2f0a9d82b0fce20afeb9a4d | REST API v2 (http://localhost:3002) | yes |  | 0 ms |
| firecrawl-hosted | firecrawl | hosted API v2 | hosted service (version not exposed) | REST API v2 (https://api.firecrawl.dev) | no | FIRECRAWL_API_KEY is not set | n/a |
| donsetch | donsetch | 4.4.1 | v4.4.1 release binary (npm donsetch@4.4.1) | MCP stdio (web_fetch / web_crawl), warm server | yes |  | 68 ms |

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

Common tasks: 20 of 20 fixture cases were attempted by every profile that ran any fixture task (fetchkeep-http, fetchkeep-chromium, fetchkeep-lightpanda, fetchkeep-auto, firecrawl-selfhost, donsetch). This is the like-for-like comparison.

| profile | tasks | ok / error / unavail. / N/A | success | usable | passage recall | boilerplate excl. | token F1 | first p50 | warm p50 | warm p95 | correct error | cost |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| fetchkeep-http | 60 | 51 / 9 / 0 / 0 | 85.0% (n=60) | 88.2% (n=51) | 0.882 (n=51) | 0.950 (n=30) | 0.973 (n=27) | 9 ms (n=17) | 8 ms (n=34) | 2509 ms (n=34) | 100.0% (n=9) | n/a |
| fetchkeep-chromium | 60 | 51 / 9 / 0 / 0 | 85.0% (n=60) | 100.0% (n=51) | 1.000 (n=51) | 0.950 (n=30) | 0.965 (n=27) | 1060 ms (n=17) | 1060 ms (n=34) | 3550 ms (n=34) | 100.0% (n=9) | n/a |
| fetchkeep-lightpanda | 60 | 51 / 9 / 0 / 0 | 85.0% (n=60) | 100.0% (n=51) | 1.000 (n=51) | 0.950 (n=30) | 0.965 (n=27) | 525 ms (n=17) | 522 ms (n=34) | 3016 ms (n=34) | 100.0% (n=9) | n/a |
| fetchkeep-auto | 60 | 51 / 9 / 0 / 0 | 85.0% (n=60) | 100.0% (n=51) | 1.000 (n=51) | 0.950 (n=30) | 0.973 (n=27) | 12 ms (n=17) | 6 ms (n=34) | 2503 ms (n=34) | 100.0% (n=9) | n/a |
| firecrawl-selfhost | 60 | 48 / 12 / 0 / 0 | 80.0% (n=60) | 94.1% (n=51) | 1.000 (n=48) | 0.833 (n=27) | 0.948 (n=27) | 86 ms (n=16) | 81 ms (n=32) | 2574 ms (n=32) | 100.0% (n=9) | n/a |
| donsetch | 60 | 51 / 9 / 0 / 0 | 85.0% (n=60) | 100.0% (n=51) | 1.000 (n=51) | 0.900 (n=30) | 0.822 (n=27) | 4 ms (n=17) | 4 ms (n=34) | 4233 ms (n=34) | 100.0% (n=9) | n/a |

All fixture tasks per profile (includes cases only some profiles could run):

| profile | tasks | ok / error / unavail. / N/A | success | usable | passage recall | boilerplate excl. | token F1 | first p50 | warm p50 | warm p95 | correct error | cost |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| fetchkeep-http | 60 | 51 / 9 / 0 / 0 | 85.0% (n=60) | 88.2% (n=51) | 0.882 (n=51) | 0.950 (n=30) | 0.973 (n=27) | 9 ms (n=17) | 8 ms (n=34) | 2509 ms (n=34) | 100.0% (n=9) | n/a |
| fetchkeep-chromium | 60 | 51 / 9 / 0 / 0 | 85.0% (n=60) | 100.0% (n=51) | 1.000 (n=51) | 0.950 (n=30) | 0.965 (n=27) | 1060 ms (n=17) | 1060 ms (n=34) | 3550 ms (n=34) | 100.0% (n=9) | n/a |
| fetchkeep-lightpanda | 60 | 51 / 9 / 0 / 0 | 85.0% (n=60) | 100.0% (n=51) | 1.000 (n=51) | 0.950 (n=30) | 0.965 (n=27) | 525 ms (n=17) | 522 ms (n=34) | 3016 ms (n=34) | 100.0% (n=9) | n/a |
| fetchkeep-auto | 60 | 51 / 9 / 0 / 0 | 85.0% (n=60) | 100.0% (n=51) | 1.000 (n=51) | 0.950 (n=30) | 0.973 (n=27) | 12 ms (n=17) | 6 ms (n=34) | 2503 ms (n=34) | 100.0% (n=9) | n/a |
| firecrawl-selfhost | 60 | 48 / 12 / 0 / 0 | 80.0% (n=60) | 94.1% (n=51) | 1.000 (n=48) | 0.833 (n=27) | 0.948 (n=27) | 86 ms (n=16) | 81 ms (n=32) | 2574 ms (n=32) | 100.0% (n=9) | n/a |
| firecrawl-hosted | 60 | 0 / 0 / 60 / 0 | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a |
| donsetch | 60 | 51 / 9 / 0 / 0 | 85.0% (n=60) | 100.0% (n=51) | 1.000 (n=51) | 0.900 (n=30) | 0.822 (n=27) | 4 ms (n=17) | 4 ms (n=34) | 4233 ms (n=34) | 100.0% (n=9) | n/a |

### Live websites

Common tasks: 24 of 24 live cases were attempted by every profile that ran any live task (fetchkeep-http, fetchkeep-chromium, fetchkeep-lightpanda, fetchkeep-auto, firecrawl-selfhost, donsetch). This is the like-for-like comparison.

| profile | tasks | ok / error / unavail. / N/A | success | usable | passage recall | boilerplate excl. | token F1 | first p50 | warm p50 | warm p95 | correct error | cost |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| fetchkeep-http | 72 | 72 / 0 / 0 / 0 | 100.0% (n=72) | 87.5% (n=72) | 0.875 (n=72) | 0.875 (n=48) | n/a (n=0) | 406 ms (n=24) | 382 ms (n=48) | 1300 ms (n=48) | n/a (n=0) | n/a |
| fetchkeep-chromium | 72 | 72 / 0 / 0 / 0 | 100.0% (n=72) | 95.8% (n=72) | 0.958 (n=72) | 0.875 (n=48) | n/a (n=0) | 1967 ms (n=24) | 1913 ms (n=48) | 3341 ms (n=48) | n/a (n=0) | n/a |
| fetchkeep-lightpanda | 72 | 72 / 0 / 0 / 0 | 100.0% (n=72) | 93.1% (n=72) | 0.931 (n=72) | 0.875 (n=48) | n/a (n=0) | 1109 ms (n=24) | 1116 ms (n=48) | 2094 ms (n=48) | n/a (n=0) | n/a |
| fetchkeep-auto | 72 | 72 / 0 / 0 / 0 | 100.0% (n=72) | 95.8% (n=72) | 0.958 (n=72) | 0.875 (n=48) | n/a (n=0) | 393 ms (n=24) | 456 ms (n=48) | 2314 ms (n=48) | n/a (n=0) | n/a |
| firecrawl-selfhost | 72 | 69 / 3 / 0 / 0 | 95.8% (n=72) | 91.7% (n=72) | 0.957 (n=69) | 0.681 (n=48) | n/a (n=0) | 895 ms (n=23) | 805 ms (n=46) | 2217 ms (n=46) | n/a (n=0) | n/a |
| donsetch | 72 | 69 / 3 / 0 / 0 | 95.8% (n=72) | 91.7% (n=72) | 0.957 (n=69) | 0.800 (n=45) | n/a (n=0) | 406 ms (n=23) | 260 ms (n=46) | 946 ms (n=46) | n/a (n=0) | n/a |

All live tasks per profile (includes cases only some profiles could run):

| profile | tasks | ok / error / unavail. / N/A | success | usable | passage recall | boilerplate excl. | token F1 | first p50 | warm p50 | warm p95 | correct error | cost |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| fetchkeep-http | 72 | 72 / 0 / 0 / 0 | 100.0% (n=72) | 87.5% (n=72) | 0.875 (n=72) | 0.875 (n=48) | n/a (n=0) | 406 ms (n=24) | 382 ms (n=48) | 1300 ms (n=48) | n/a (n=0) | n/a |
| fetchkeep-chromium | 72 | 72 / 0 / 0 / 0 | 100.0% (n=72) | 95.8% (n=72) | 0.958 (n=72) | 0.875 (n=48) | n/a (n=0) | 1967 ms (n=24) | 1913 ms (n=48) | 3341 ms (n=48) | n/a (n=0) | n/a |
| fetchkeep-lightpanda | 72 | 72 / 0 / 0 / 0 | 100.0% (n=72) | 93.1% (n=72) | 0.931 (n=72) | 0.875 (n=48) | n/a (n=0) | 1109 ms (n=24) | 1116 ms (n=48) | 2094 ms (n=48) | n/a (n=0) | n/a |
| fetchkeep-auto | 72 | 72 / 0 / 0 / 0 | 100.0% (n=72) | 95.8% (n=72) | 0.958 (n=72) | 0.875 (n=48) | n/a (n=0) | 393 ms (n=24) | 456 ms (n=48) | 2314 ms (n=48) | n/a (n=0) | n/a |
| firecrawl-selfhost | 72 | 69 / 3 / 0 / 0 | 95.8% (n=72) | 91.7% (n=72) | 0.957 (n=69) | 0.681 (n=48) | n/a (n=0) | 895 ms (n=23) | 805 ms (n=46) | 2217 ms (n=46) | n/a (n=0) | n/a |
| firecrawl-hosted | 72 | 0 / 0 / 72 / 0 | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a |
| donsetch | 72 | 69 / 3 / 0 / 0 | 95.8% (n=72) | 91.7% (n=72) | 0.957 (n=69) | 0.800 (n=45) | n/a (n=0) | 406 ms (n=23) | 260 ms (n=46) | 946 ms (n=46) | n/a (n=0) | n/a |

### Held-out subset

Held-out cases were excluded from development tuning. Compare with the dev subset: a large gap suggests overfitting to the dev cases.

fixture — held-out:

| profile | tasks | ok / error / unavail. / N/A | success | usable | passage recall | boilerplate excl. | token F1 | first p50 | warm p50 | warm p95 | correct error | cost |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| fetchkeep-http | 18 | 18 / 0 / 0 / 0 | 100.0% (n=18) | 83.3% (n=18) | 0.833 (n=18) | 1.000 (n=9) | 0.982 (n=9) | 8 ms (n=6) | 7 ms (n=12) | 19 ms (n=12) | n/a (n=0) | n/a |
| fetchkeep-chromium | 18 | 18 / 0 / 0 / 0 | 100.0% (n=18) | 100.0% (n=18) | 1.000 (n=18) | 1.000 (n=9) | 0.982 (n=9) | 1050 ms (n=6) | 1049 ms (n=12) | 1167 ms (n=12) | n/a (n=0) | n/a |
| fetchkeep-lightpanda | 18 | 18 / 0 / 0 / 0 | 100.0% (n=18) | 100.0% (n=18) | 1.000 (n=18) | 1.000 (n=9) | 0.982 (n=9) | 520 ms (n=6) | 520 ms (n=12) | 583 ms (n=12) | n/a (n=0) | n/a |
| fetchkeep-auto | 18 | 18 / 0 / 0 / 0 | 100.0% (n=18) | 100.0% (n=18) | 1.000 (n=18) | 1.000 (n=9) | 0.982 (n=9) | 8 ms (n=6) | 6 ms (n=12) | 1195 ms (n=12) | n/a (n=0) | n/a |
| firecrawl-selfhost | 18 | 18 / 0 / 0 / 0 | 100.0% (n=18) | 100.0% (n=18) | 1.000 (n=18) | 0.867 (n=9) | 0.955 (n=9) | 80 ms (n=6) | 75 ms (n=12) | 138 ms (n=12) | n/a (n=0) | n/a |
| firecrawl-hosted | 18 | 0 / 0 / 18 / 0 | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a |
| donsetch | 18 | 18 / 0 / 0 / 0 | 100.0% (n=18) | 100.0% (n=18) | 1.000 (n=18) | 1.000 (n=9) | 0.904 (n=9) | 5 ms (n=6) | 4 ms (n=12) | 4228 ms (n=12) | n/a (n=0) | n/a |

fixture — dev (not held out):

| profile | tasks | ok / error / unavail. / N/A | success | usable | passage recall | boilerplate excl. | token F1 | first p50 | warm p50 | warm p95 | correct error | cost |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| fetchkeep-http | 42 | 33 / 9 / 0 / 0 | 78.6% (n=42) | 90.9% (n=33) | 0.909 (n=33) | 0.929 (n=21) | 0.968 (n=18) | 15 ms (n=11) | 8 ms (n=22) | 2509 ms (n=22) | 100.0% (n=9) | n/a |
| fetchkeep-chromium | 42 | 33 / 9 / 0 / 0 | 78.6% (n=42) | 100.0% (n=33) | 1.000 (n=33) | 0.929 (n=21) | 0.956 (n=18) | 1064 ms (n=11) | 1062 ms (n=22) | 3550 ms (n=22) | 100.0% (n=9) | n/a |
| fetchkeep-lightpanda | 42 | 33 / 9 / 0 / 0 | 78.6% (n=42) | 100.0% (n=33) | 1.000 (n=33) | 0.929 (n=21) | 0.956 (n=18) | 526 ms (n=11) | 522 ms (n=22) | 3016 ms (n=22) | 100.0% (n=9) | n/a |
| fetchkeep-auto | 42 | 33 / 9 / 0 / 0 | 78.6% (n=42) | 100.0% (n=33) | 1.000 (n=33) | 0.929 (n=21) | 0.968 (n=18) | 13 ms (n=11) | 6 ms (n=22) | 2503 ms (n=22) | 100.0% (n=9) | n/a |
| firecrawl-selfhost | 42 | 30 / 12 / 0 / 0 | 71.4% (n=42) | 90.9% (n=33) | 1.000 (n=30) | 0.817 (n=18) | 0.944 (n=18) | 86 ms (n=10) | 85 ms (n=20) | 2574 ms (n=20) | 100.0% (n=9) | n/a |
| firecrawl-hosted | 42 | 0 / 0 / 42 / 0 | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a |
| donsetch | 42 | 33 / 9 / 0 / 0 | 78.6% (n=42) | 100.0% (n=33) | 1.000 (n=33) | 0.857 (n=21) | 0.781 (n=18) | 4 ms (n=11) | 4 ms (n=22) | 4233 ms (n=22) | 100.0% (n=9) | n/a |

live — held-out:

| profile | tasks | ok / error / unavail. / N/A | success | usable | passage recall | boilerplate excl. | token F1 | first p50 | warm p50 | warm p95 | correct error | cost |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| fetchkeep-http | 18 | 18 / 0 / 0 / 0 | 100.0% (n=18) | 83.3% (n=18) | 0.833 (n=18) | 1.000 (n=12) | n/a (n=0) | 287 ms (n=6) | 274 ms (n=12) | 760 ms (n=12) | n/a (n=0) | n/a |
| fetchkeep-chromium | 18 | 18 / 0 / 0 / 0 | 100.0% (n=18) | 83.3% (n=18) | 0.833 (n=18) | 1.000 (n=12) | n/a (n=0) | 1607 ms (n=6) | 1532 ms (n=12) | 2048 ms (n=12) | n/a (n=0) | n/a |
| fetchkeep-lightpanda | 18 | 18 / 0 / 0 / 0 | 100.0% (n=18) | 83.3% (n=18) | 0.833 (n=18) | 1.000 (n=12) | n/a (n=0) | 840 ms (n=6) | 933 ms (n=12) | 1451 ms (n=12) | n/a (n=0) | n/a |
| fetchkeep-auto | 18 | 18 / 0 / 0 / 0 | 100.0% (n=18) | 83.3% (n=18) | 0.833 (n=18) | 1.000 (n=12) | n/a (n=0) | 319 ms (n=6) | 296 ms (n=12) | 2314 ms (n=12) | n/a (n=0) | n/a |
| firecrawl-selfhost | 18 | 18 / 0 / 0 / 0 | 100.0% (n=18) | 83.3% (n=18) | 0.833 (n=18) | 0.625 (n=12) | n/a (n=0) | 720 ms (n=6) | 647 ms (n=12) | 1561 ms (n=12) | n/a (n=0) | n/a |
| firecrawl-hosted | 18 | 0 / 0 / 18 / 0 | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a |
| donsetch | 18 | 15 / 3 / 0 / 0 | 83.3% (n=18) | 83.3% (n=18) | 1.000 (n=15) | 0.667 (n=9) | n/a (n=0) | 394 ms (n=5) | 216 ms (n=10) | 626 ms (n=10) | n/a (n=0) | n/a |

live — dev (not held out):

| profile | tasks | ok / error / unavail. / N/A | success | usable | passage recall | boilerplate excl. | token F1 | first p50 | warm p50 | warm p95 | correct error | cost |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| fetchkeep-http | 54 | 54 / 0 / 0 / 0 | 100.0% (n=54) | 88.9% (n=54) | 0.889 (n=54) | 0.833 (n=36) | n/a (n=0) | 478 ms (n=18) | 405 ms (n=36) | 1493 ms (n=36) | n/a (n=0) | n/a |
| fetchkeep-chromium | 54 | 54 / 0 / 0 / 0 | 100.0% (n=54) | 100.0% (n=54) | 1.000 (n=54) | 0.833 (n=36) | n/a (n=0) | 2099 ms (n=18) | 2006 ms (n=36) | 3426 ms (n=36) | n/a (n=0) | n/a |
| fetchkeep-lightpanda | 54 | 54 / 0 / 0 / 0 | 100.0% (n=54) | 96.3% (n=54) | 0.963 (n=54) | 0.833 (n=36) | n/a (n=0) | 1109 ms (n=18) | 1144 ms (n=36) | 2208 ms (n=36) | n/a (n=0) | n/a |
| fetchkeep-auto | 54 | 54 / 0 / 0 / 0 | 100.0% (n=54) | 100.0% (n=54) | 1.000 (n=54) | 0.833 (n=36) | n/a (n=0) | 448 ms (n=18) | 462 ms (n=36) | 2722 ms (n=36) | n/a (n=0) | n/a |
| firecrawl-selfhost | 54 | 51 / 3 / 0 / 0 | 94.4% (n=54) | 94.4% (n=54) | 1.000 (n=51) | 0.699 (n=36) | n/a (n=0) | 944 ms (n=17) | 824 ms (n=34) | 10562 ms (n=34) | n/a (n=0) | n/a |
| firecrawl-hosted | 54 | 0 / 0 / 54 / 0 | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a |
| donsetch | 54 | 54 / 0 / 0 / 0 | 100.0% (n=54) | 94.4% (n=54) | 0.944 (n=54) | 0.833 (n=36) | n/a (n=0) | 406 ms (n=18) | 260 ms (n=36) | 968 ms (n=36) | n/a (n=0) | n/a |

## Quality detail

| profile | dataset | passage recall | extraction failure (recall < 0.5) | boilerplate excl. | token precision | token recall | token F1 | headings | tables | code | chars (mean) | tokens (mean) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| fetchkeep-http | fixture | 0.882 (n=51) | 11.8% (n=51) | 0.950 (n=30) | 0.951 (n=27) | 0.998 (n=27) | 0.973 (n=27) | 0.778 (n=27) | 0.800 (n=15) | 1.000 (n=9) | 488 (n=51) | 114 (n=51) |
| fetchkeep-chromium | fixture | 1.000 (n=51) | 0.0% (n=51) | 0.950 (n=30) | 0.938 (n=27) | 0.998 (n=27) | 0.965 (n=27) | 1.000 (n=27) | 1.000 (n=15) | 1.000 (n=9) | 518 (n=51) | 121 (n=51) |
| fetchkeep-lightpanda | fixture | 1.000 (n=51) | 0.0% (n=51) | 0.950 (n=30) | 0.938 (n=27) | 0.998 (n=27) | 0.965 (n=27) | 1.000 (n=27) | 1.000 (n=15) | 1.000 (n=9) | 518 (n=51) | 121 (n=51) |
| fetchkeep-auto | fixture | 1.000 (n=51) | 0.0% (n=51) | 0.950 (n=30) | 0.951 (n=27) | 0.998 (n=27) | 0.973 (n=27) | 1.000 (n=27) | 1.000 (n=15) | 1.000 (n=9) | 516 (n=51) | 121 (n=51) |
| firecrawl-selfhost | fixture | 1.000 (n=48) | 0.0% (n=48) | 0.833 (n=27) | 0.904 (n=27) | 1.000 (n=27) | 0.948 (n=27) | 1.000 (n=24) | 1.000 (n=12) | 0.556 (n=9) | 593 (n=48) | 130 (n=48) |
| firecrawl-hosted | fixture | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) |
| donsetch | fixture | 1.000 (n=51) | 0.0% (n=51) | 0.900 (n=30) | 0.752 (n=27) | 0.992 (n=27) | 0.822 (n=27) | 1.000 (n=27) | 1.000 (n=15) | 1.000 (n=9) | 804 (n=51) | 205 (n=51) |
| fetchkeep-http | live | 0.875 (n=72) | 12.5% (n=72) | 0.875 (n=48) | n/a (n=0) | n/a (n=0) | n/a (n=0) | 1.000 (n=30) | 1.000 (n=9) | 1.000 (n=21) | 57786 (n=72) | 16095 (n=72) |
| fetchkeep-chromium | live | 0.958 (n=72) | 4.2% (n=72) | 0.875 (n=48) | n/a (n=0) | n/a (n=0) | n/a (n=0) | 1.000 (n=30) | 1.000 (n=9) | 0.857 (n=21) | 59059 (n=72) | 16469 (n=72) |
| fetchkeep-lightpanda | live | 0.931 (n=72) | 6.9% (n=72) | 0.875 (n=48) | n/a (n=0) | n/a (n=0) | n/a (n=0) | 1.000 (n=30) | 1.000 (n=9) | 0.714 (n=21) | 58640 (n=72) | 16357 (n=72) |
| fetchkeep-auto | live | 0.958 (n=72) | 4.2% (n=72) | 0.875 (n=48) | n/a (n=0) | n/a (n=0) | n/a (n=0) | 1.000 (n=30) | 1.000 (n=9) | 1.000 (n=21) | 57947 (n=72) | 16135 (n=72) |
| firecrawl-selfhost | live | 0.957 (n=69) | 4.3% (n=69) | 0.681 (n=48) | n/a (n=0) | n/a (n=0) | n/a (n=0) | 0.458 (n=30) | 1.000 (n=9) | 0.333 (n=21) | 62523 (n=69) | 17117 (n=69) |
| firecrawl-hosted | live | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) |
| donsetch | live | 0.957 (n=69) | 4.3% (n=69) | 0.800 (n=45) | n/a (n=0) | n/a (n=0) | n/a (n=0) | 0.867 (n=30) | 1.000 (n=9) | 0.857 (n=21) | 37897 (n=69) | 8902 (n=69) |

### Errors, escalation and retries

| profile | dataset | timeout | blocked | error kinds | browser escalation | attempts (mean) |
|---|---|---|---|---|---|---|
| fetchkeep-http | fixture | 0.0% (n=60) | 0.0% (n=60) | http_error×9 | 0.0% (n=51) | 1.00 (n=51) |
| fetchkeep-chromium | fixture | 0.0% (n=60) | 0.0% (n=60) | http_error×6; engine_error×3 | 0.0% (n=51) | 1.18 (n=51) |
| fetchkeep-lightpanda | fixture | 0.0% (n=60) | 0.0% (n=60) | engine_error×3; http_error×6 | 0.0% (n=51) | 1.18 (n=51) |
| fetchkeep-auto | fixture | 0.0% (n=60) | 0.0% (n=60) | http_error×9 | 11.8% (n=51) | 1.12 (n=51) |
| firecrawl-selfhost | fixture | 0.0% (n=60) | 0.0% (n=60) | http_error×12 | n/a (n=0) | n/a (n=0) |
| firecrawl-hosted | fixture | n/a (n=0) | n/a (n=0) | none | n/a (n=0) | n/a (n=0) |
| donsetch | fixture | 0.0% (n=60) | 5.0% (n=60) | http_error×6; blocked×3 | n/a (n=0) | n/a (n=0) |
| fetchkeep-http | live | 0.0% (n=72) | 0.0% (n=72) | none | 0.0% (n=72) | 1.00 (n=72) |
| fetchkeep-chromium | live | 0.0% (n=72) | 0.0% (n=72) | none | 0.0% (n=72) | 1.13 (n=72) |
| fetchkeep-lightpanda | live | 0.0% (n=72) | 0.0% (n=72) | none | 0.0% (n=72) | 1.13 (n=72) |
| fetchkeep-auto | live | 0.0% (n=72) | 0.0% (n=72) | none | 12.5% (n=72) | 1.13 (n=72) |
| firecrawl-selfhost | live | 0.0% (n=72) | 0.0% (n=72) | http_error×3 | n/a (n=0) | n/a (n=0) |
| firecrawl-hosted | live | n/a (n=0) | n/a (n=0) | none | n/a (n=0) | n/a (n=0) |
| donsetch | live | 0.0% (n=72) | 4.2% (n=72) | blocked×3 | n/a (n=0) | n/a (n=0) |

## Latency

Percentiles use the nearest-rank method: sort the latencies of `ok` tasks ascending and take the value at rank ceil(p/100 × n). `first` = repetition 1 (includes any per-URL cold work such as the first request to a host); `warm` = repetitions ≥ 2.

| profile | dataset | first p50 | first p95 | warm p50 | warm p95 |
|---|---|---|---|---|---|
| fetchkeep-http | fixture | 9 ms (n=17) | 2560 ms (n=17) | 8 ms (n=34) | 2509 ms (n=34) |
| fetchkeep-chromium | fixture | 1060 ms (n=17) | 4121 ms (n=17) | 1060 ms (n=34) | 3550 ms (n=34) |
| fetchkeep-lightpanda | fixture | 525 ms (n=17) | 3027 ms (n=17) | 522 ms (n=34) | 3016 ms (n=34) |
| fetchkeep-auto | fixture | 12 ms (n=17) | 2508 ms (n=17) | 6 ms (n=34) | 2503 ms (n=34) |
| firecrawl-selfhost | fixture | 86 ms (n=16) | 2589 ms (n=16) | 81 ms (n=32) | 2574 ms (n=32) |
| firecrawl-hosted | fixture | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) |
| donsetch | fixture | 4 ms (n=17) | 4833 ms (n=17) | 4 ms (n=34) | 4233 ms (n=34) |
| fetchkeep-http | live | 406 ms (n=24) | 1330 ms (n=24) | 382 ms (n=48) | 1300 ms (n=48) |
| fetchkeep-chromium | live | 1967 ms (n=24) | 3502 ms (n=24) | 1913 ms (n=48) | 3341 ms (n=48) |
| fetchkeep-lightpanda | live | 1109 ms (n=24) | 2460 ms (n=24) | 1116 ms (n=48) | 2094 ms (n=48) |
| fetchkeep-auto | live | 393 ms (n=24) | 2546 ms (n=24) | 456 ms (n=48) | 2314 ms (n=48) |
| firecrawl-selfhost | live | 895 ms (n=23) | 2723 ms (n=23) | 805 ms (n=46) | 2217 ms (n=46) |
| firecrawl-hosted | live | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) |
| donsetch | live | 406 ms (n=23) | 939 ms (n=23) | 260 ms (n=46) | 946 ms (n=46) |

## Crawl

Coverage = expected pages found / expected pages (mean over tasks that ran). Forbidden = robots-disallowed or out-of-scope pages returned (summed). Duplicate rate = duplicate pages / pages returned. Latency p50 over ok tasks (nearest rank).

| case | profile | tasks | outcomes | coverage | pages returned (mean) | forbidden returned | duplicate rate | latency p50 | stop reason(s) | missing pages |
|---|---|---|---|---|---|---|---|---|---|---|
| live-crawl-quotes | fetchkeep-http | 3 | ok 3 / error 0 | 0.667 (n=3) | 15.000 (n=3) | 0 | 0.000 (n=3) | 7747 ms (n=3) | page_limit | https://quotes.toscrape.com/page/2/ |
| live-crawl-quotes | fetchkeep-chromium | 3 | ok 3 / error 0 | 0.667 (n=3) | 15.000 (n=3) | 0 | 0.000 (n=3) | 17487 ms (n=3) | page_limit | https://quotes.toscrape.com/page/2/ |
| live-crawl-quotes | fetchkeep-lightpanda | 3 | ok 3 / error 0 | 0.667 (n=3) | 15.000 (n=3) | 0 | 0.000 (n=3) | 9412 ms (n=3) | page_limit | https://quotes.toscrape.com/page/2/ |
| live-crawl-quotes | fetchkeep-auto | 3 | ok 3 / error 0 | 0.667 (n=3) | 15.000 (n=3) | 0 | 0.000 (n=3) | 7744 ms (n=3) | page_limit | https://quotes.toscrape.com/page/2/ |
| live-crawl-quotes | firecrawl-selfhost | 3 | ok 3 / error 0 | 0.667 (n=3) | 15.000 (n=3) | 0 | 0.000 (n=3) | 11252 ms (n=3) | completed | https://quotes.toscrape.com/page/2/ |
| live-crawl-quotes | firecrawl-hosted | 3 | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×3) | n/a | n/a | n/a | n/a | n/a | n/a |  |
| live-crawl-quotes | donsetch | 3 | ok 3 / error 0 | 0.667 (n=3) | 13.333 (n=3) | 0 | 0.000 (n=3) | 6721 ms (n=3) | MaxPages | https://quotes.toscrape.com/login |
| fx-crawl-estuary | fetchkeep-http | 3 | ok 3 / error 0 | 1.000 (n=3) | 13.000 (n=3) | 0 | 0.000 (n=3) | 6527 ms (n=3) | depth_limit |  |
| fx-crawl-estuary | fetchkeep-chromium | 3 | ok 3 / error 0 | 1.000 (n=3) | 13.000 (n=3) | 0 | 0.000 (n=3) | 7971 ms (n=3) | depth_limit |  |
| fx-crawl-estuary | fetchkeep-lightpanda | 3 | ok 3 / error 0 | 1.000 (n=3) | 13.000 (n=3) | 0 | 0.000 (n=3) | 7030 ms (n=3) | depth_limit |  |
| fx-crawl-estuary | fetchkeep-auto | 3 | ok 3 / error 0 | 1.000 (n=3) | 13.000 (n=3) | 0 | 0.000 (n=3) | 6519 ms (n=3) | depth_limit |  |
| fx-crawl-estuary | firecrawl-selfhost | 3 | ok 3 / error 0 | 1.000 (n=3) | 14.667 (n=3) | 2 | 0.068 (n=3) | 11221 ms (n=3) | completed |  |
| fx-crawl-estuary | firecrawl-hosted | 3 | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×3) | n/a | n/a | n/a | n/a | n/a | n/a |  |
| fx-crawl-estuary | donsetch | 3 | ok 3 / error 0 | 0.846 (n=3) | 12.000 (n=3) | 3 | 0.000 (n=3) | 4171 ms (n=3) | FrontierEmpty | /crawl/plants/samphire-copy.html, /crawl/hidden/lighthouse.html, /crawl/plants/samphire.html |

## Resources

Scope matters: a local process tree, a whole Docker stack and a remote service are different things. Numbers are only comparable between profiles with the same scope; remote services cannot be measured and are never compared.

| profile | engine | scope | CPU (run) | peak RSS | idle RSS | samples | note |
|---|---|---|---|---|---|---|---|
| fetchkeep-http | fetchkeep | local process tree (engine process + children) | 26.06 s | 441.0 MB | 99.9 MB | 3834 |  |
| fetchkeep-chromium | fetchkeep | local process tree (engine process + children) | 103.04 s | 1196.3 MB | 99.8 MB | 3831 |  |
| fetchkeep-lightpanda | fetchkeep | local process tree (engine process + children) | 44.48 s | 639.3 MB | 99.8 MB | 3829 |  |
| fetchkeep-auto | fetchkeep | local process tree (engine process + children) | 37.16 s | 1057.7 MB | 100.6 MB | 3827 |  |
| firecrawl-selfhost | firecrawl | whole Docker stack (all containers of the engine) | 350.56 s | 3994.0 MB | 3675.7 MB | 3826 |  |
| donsetch | donsetch | local process tree (engine process + children) | 8.99 s | 3086.4 MB | 15.4 MB | 3825 |  |
| firecrawl-hosted | firecrawl | remote service — not measurable | not measurable | not measurable | not measurable | 0 | engine not started |

Measured scopes differ (process-tree, docker-stack): peak RSS bars below are labelled with their scope and are not like-for-like.

## Cold start

| profile | engine | method | p50 | min | max | samples |
|---|---|---|---|---|---|---|
| fetchkeep-http | fetchkeep | CLI one-shot: node dist/src/cli/main.js --json fetch <fixture> (process spawn → result → exit) | 435 ms (n=5) | 429 ms | 475 ms | 475, 429, 435, 436, 433 |
| fetchkeep-chromium | fetchkeep | CLI one-shot: node dist/src/cli/main.js --json fetch <fixture> (process spawn → result → exit) | 1889 ms (n=5) | 1845 ms | 1894 ms | 1894, 1889, 1860, 1845, 1890 |
| fetchkeep-lightpanda | fetchkeep | CLI one-shot: node dist/src/cli/main.js --json fetch <fixture> (process spawn → result → exit) | 1407 ms (n=5) | 1400 ms | 1426 ms | 1426, 1400, 1408, 1407, 1402 |
| fetchkeep-auto | fetchkeep | CLI one-shot: node dist/src/cli/main.js --json fetch <fixture> (process spawn → result → exit) | 440 ms (n=5) | 429 ms | 472 ms | 472, 446, 429, 440, 430 |
| firecrawl-selfhost | firecrawl | docker compose stop → docker compose up -d api → first successful /v2/scrape of a local fixture | 25452 ms (n=3) | 25336 ms | 34332 ms | 34332, 25336, 25452 |
| donsetch | donsetch | CLI one-shot: donsetch fetch <fixture> --json (process spawn → result → exit) | 40 ms (n=5) | 37 ms | 42 ms | 42, 40, 39, 41, 37 |

Cold-start methods differ per engine (see the method column); compare only rows that measure the same thing.

## Footprint

| profile | engine | component | size | bytes | method |
|---|---|---|---|---|---|
| fetchkeep-http | fetchkeep | npm tarball | 128.0 KiB | 131106 | npm pack |
| fetchkeep-http | fetchkeep | node_modules (fetchkeep + runtime deps, no browser) | 96.7 MiB | 101367913 | npm install <tarball> --omit=dev; du -sb node_modules |
| fetchkeep-chromium | fetchkeep | playwright-core package | 12.8 MiB | 13453369 | du -sb node_modules/playwright-core |
| fetchkeep-lightpanda | fetchkeep | puppeteer-core (+deps not shared) | 5.7 MiB | 5981213 | du -sb node_modules/puppeteer-core (dependencies excluded) |
| fetchkeep-chromium | fetchkeep | Chromium headless shell | 259.9 MiB | 272533063 | du -sb ~/.cache/ms-playwright/chromium_headless_shell-* |
| fetchkeep-lightpanda | fetchkeep | Lightpanda binary | 172.9 MiB | 181265952 | du -sb <lightpanda> |
| donsetch | donsetch | npm package (binary + libonnxruntime) | 44.7 MiB | 46883975 | du -sb node_modules/donsetch |
| donsetch | donsetch | Chromium (full, for tier-2 escalation) | 391.2 MiB | 410251304 | du -sb ~/.cache/ms-playwright/chromium-* (Playwright full Chromium) |
| firecrawl-selfhost | firecrawl | docker image firecrawl-api | 1.20 GiB | 1292439393 | Docker Engine API /images/{id}/json Size |
| firecrawl-selfhost | firecrawl | docker image firecrawl-nuq-postgres | 435.2 MiB | 456315864 | Docker Engine API /images/{id}/json Size |
| firecrawl-selfhost | firecrawl | docker image redis:alpine | 113.3 MiB | 118840064 | Docker Engine API /images/{id}/json Size |
| firecrawl-selfhost | firecrawl | docker image rabbitmq:3-management | 239.9 MiB | 251501716 | Docker Engine API /images/{id}/json Size |
| firecrawl-selfhost | firecrawl | docker image firecrawl-playwright-service | 1.94 GiB | 2080421880 | Docker Engine API /images/{id}/json Size |

Components are listed separately and not summed: they can overlap (e.g. an image and the layers it shares).

## Fetchkeep-specific features

Citation checks verify that a quoted passage can be re-read and cited from Fetchkeep's store. Other engines have no equivalent, so this is not part of the common-task comparison.

| profile | dataset | citation verified |
|---|---|---|
| fetchkeep-http | fixture | 0.978 (n=45) |
| fetchkeep-chromium | fixture | 0.980 (n=51) |
| fetchkeep-lightpanda | fixture | 0.980 (n=51) |
| fetchkeep-auto | fixture | 0.980 (n=51) |
| fetchkeep-http | live | 1.000 (n=63) |
| fetchkeep-chromium | live | 1.000 (n=69) |
| fetchkeep-lightpanda | live | 1.000 (n=67) |
| fetchkeep-auto | live | 1.000 (n=69) |

## Unsupported / N/A / unavailable

### Unavailable engines

- firecrawl-hosted (firecrawl): unavailable — FIRECRAWL_API_KEY is not set

### Tasks not run (unavailable / N/A)

- firecrawl-hosted — live fetch: unavailable for 72 task(s) (engine unavailable: FIRECRAWL_API_KEY is not set); cases: live-rust-book-control-flow, live-quotes-toscrape-js, live-github-flask-readme, live-crates-io-serde, live-quotes-toscrape-js-delayed, live-iana-http-status-codes, live-nodejs-path, live-rfc9309-txt … (+16 more)
- firecrawl-hosted — fixture fetch: unavailable for 60 task(s) (engine unavailable: FIRECRAWL_API_KEY is not set); cases: fx-tables, fx-pdf-3page, fx-pdf, fx-article-long, fx-js-spa, fx-code, fx-table-financial, fx-404 … (+12 more)
- firecrawl-hosted — fixture crawl: unavailable for 3 task(s) (engine unavailable: FIRECRAWL_API_KEY is not set); cases: fx-crawl-estuary
- firecrawl-hosted — live crawl: unavailable for 3 task(s) (engine unavailable: FIRECRAWL_API_KEY is not set); cases: live-crawl-quotes

### Metrics not applicable

- firecrawl-selfhost — fixture: citation not scored (metric not applicable to this engine or no ok task carried it); shown as n/a, not 0.
- donsetch — fixture: citation not scored (metric not applicable to this engine or no ok task carried it); shown as n/a, not 0.
- firecrawl-selfhost — live: citation not scored (metric not applicable to this engine or no ok task carried it); shown as n/a, not 0.
- donsetch — live: citation not scored (metric not applicable to this engine or no ok task carried it); shown as n/a, not 0.

## How to read this

- Fixtures are synthetic pages served locally: they isolate specific extraction problems (tables, code, boilerplate, JS rendering) with gold answers, but they are not a sample of the web. Live results reflect real sites at run time and can change between runs.
- Short output is not good extraction: fewer characters or tokens can mean missing content. Read chars/tokens together with passage recall, boilerplate exclusion and token F1.
- There is no overall winner. The trade-offs below are derived from this run's numbers only, with margins and sample sizes; engines differ in transport (local MCP stdio, REST, hosted service), so latency includes very different overheads.
- Hosted services cannot run local fixtures; those tasks are N/A and excluded from rates rather than counted as failures.
- Percentiles use the nearest-rank method: sort the latencies of `ok` tasks ascending and take the value at rank ceil(p/100 × n). `first` = repetition 1 (includes any per-URL cold work such as the first request to a host); `warm` = repetitions ≥ 2.

### Trade-offs on fixture tasks (derived from this run only)

- Usable rate: tie between fetchkeep-chromium 100.0% (n=51), fetchkeep-lightpanda 100.0% (n=51), fetchkeep-auto 100.0% (n=51), donsetch 100.0% (n=51).
- Passage recall: tie between fetchkeep-chromium 1.000 (n=51), fetchkeep-lightpanda 1.000 (n=51), fetchkeep-auto 1.000 (n=51), firecrawl-selfhost 1.000 (n=48), donsetch 1.000 (n=51).
- Boilerplate exclusion: tie between fetchkeep-http 0.950 (n=30), fetchkeep-chromium 0.950 (n=30), fetchkeep-lightpanda 0.950 (n=30), fetchkeep-auto 0.950 (n=30).
- Token F1: fetchkeep-auto 0.973 (n=27) vs next-best fetchkeep-http 0.973 (n=27) — margin below 0.05 (5 points), not a meaningful difference.
- Warm p50 latency: donsetch 4 ms (n=34) vs next-best fetchkeep-auto 6 ms (n=34).
- First-request p50 latency: donsetch 4 ms (n=17) vs next-best fetchkeep-http 9 ms (n=17).

Per workload (category) on fixture: usable rate and warm p50 per profile. Leaders are named only with the margin and sample size; small n means the ranking can flip on a re-run.

| category | fetchkeep-http | fetchkeep-chromium | fetchkeep-lightpanda | fetchkeep-auto | firecrawl-selfhost | firecrawl-hosted | donsetch | leaders (usable rate; warm p50) |
|---|---|---|---|---|---|---|---|---|
| article | 100.0% (n=6); warm p50 8 ms (n=4) | 100.0% (n=6); warm p50 1056 ms (n=4) | 100.0% (n=6); warm p50 519 ms (n=4) | 100.0% (n=6); warm p50 5 ms (n=4) | 100.0% (n=6); warm p50 79 ms (n=4) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×6) | 100.0% (n=6); warm p50 4 ms (n=4) | usable: tie between fetchkeep-http 100.0% (n=6), fetchkeep-chromium 100.0% (n=6), fetchkeep-lightpanda 100.0% (n=6), fetchkeep-auto 100.0% (n=6), firecrawl-selfhost 100.0% (n=6), donsetch 100.0% (n=6) — small sample (n=6). warm p50: donsetch 4 ms (n=4) vs next-best fetchkeep-auto 5 ms (n=4) — small sample (n=4). |
| code | 100.0% (n=3); warm p50 8 ms (n=2) | 100.0% (n=3); warm p50 1085 ms (n=2) | 100.0% (n=3); warm p50 518 ms (n=2) | 100.0% (n=3); warm p50 4 ms (n=2) | 100.0% (n=3); warm p50 71 ms (n=2) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×3) | 100.0% (n=3); warm p50 3 ms (n=2) | usable: tie between fetchkeep-http 100.0% (n=3), fetchkeep-chromium 100.0% (n=3), fetchkeep-lightpanda 100.0% (n=3), fetchkeep-auto 100.0% (n=3), firecrawl-selfhost 100.0% (n=3), donsetch 100.0% (n=3) — small sample (n=3). warm p50: donsetch 3 ms (n=2) vs next-best fetchkeep-auto 4 ms (n=2) — small sample (n=2). |
| docs | 100.0% (n=6); warm p50 6 ms (n=4) | 100.0% (n=6); warm p50 1055 ms (n=4) | 100.0% (n=6); warm p50 519 ms (n=4) | 100.0% (n=6); warm p50 5 ms (n=4) | 100.0% (n=6); warm p50 81 ms (n=4) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×6) | 100.0% (n=6); warm p50 3 ms (n=4) | usable: tie between fetchkeep-http 100.0% (n=6), fetchkeep-chromium 100.0% (n=6), fetchkeep-lightpanda 100.0% (n=6), fetchkeep-auto 100.0% (n=6), firecrawl-selfhost 100.0% (n=6), donsetch 100.0% (n=6) — small sample (n=6). warm p50: donsetch 3 ms (n=4) vs next-best fetchkeep-auto 5 ms (n=4) — small sample (n=4). |
| encoding | 100.0% (n=3); warm p50 3 ms (n=2) | 100.0% (n=3); warm p50 1048 ms (n=2) | 100.0% (n=3); warm p50 515 ms (n=2) | 100.0% (n=3); warm p50 4 ms (n=2) | 100.0% (n=3); warm p50 72 ms (n=2) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×3) | 100.0% (n=3); warm p50 3 ms (n=2) | usable: tie between fetchkeep-http 100.0% (n=3), fetchkeep-chromium 100.0% (n=3), fetchkeep-lightpanda 100.0% (n=3), fetchkeep-auto 100.0% (n=3), firecrawl-selfhost 100.0% (n=3), donsetch 100.0% (n=3) — small sample (n=3). warm p50: donsetch 3 ms (n=2) vs next-best fetchkeep-http 3 ms (n=2) — small sample (n=2). |
| failure | n/a (n=0); warm p50 n/a (n=0) | n/a (n=0); warm p50 n/a (n=0) | n/a (n=0); warm p50 n/a (n=0) | n/a (n=0); warm p50 n/a (n=0) | n/a (n=0); warm p50 n/a (n=0) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×9) | n/a (n=0); warm p50 n/a (n=0) | no comparable data |
| js | 33.3% (n=9); warm p50 8 ms (n=6) | 100.0% (n=9); warm p50 1056 ms (n=6) | 100.0% (n=9); warm p50 518 ms (n=6) | 100.0% (n=9); warm p50 1061 ms (n=6) | 66.7% (n=9); warm p50 73 ms (n=4) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×9) | 100.0% (n=9); warm p50 4 ms (n=6) | usable: tie between fetchkeep-chromium 100.0% (n=9), fetchkeep-lightpanda 100.0% (n=9), fetchkeep-auto 100.0% (n=9), donsetch 100.0% (n=9) — small sample (n=9). warm p50: donsetch 4 ms (n=6) vs next-best fetchkeep-http 8 ms (n=6) — small sample (n=4). |
| latency | 100.0% (n=3); warm p50 2509 ms (n=2) | 100.0% (n=3); warm p50 3550 ms (n=2) | 100.0% (n=3); warm p50 3016 ms (n=2) | 100.0% (n=3); warm p50 2503 ms (n=2) | 100.0% (n=3); warm p50 2574 ms (n=2) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×3) | 100.0% (n=3); warm p50 2503 ms (n=2) | usable: tie between fetchkeep-http 100.0% (n=3), fetchkeep-chromium 100.0% (n=3), fetchkeep-lightpanda 100.0% (n=3), fetchkeep-auto 100.0% (n=3), firecrawl-selfhost 100.0% (n=3), donsetch 100.0% (n=3) — small sample (n=3). warm p50: fetchkeep-auto 2503 ms (n=2) vs next-best donsetch 2503 ms (n=2) — within 10% of the runner-up, not a meaningful difference; small sample (n=2). |
| nav-heavy | 100.0% (n=3); warm p50 10 ms (n=2) | 100.0% (n=3); warm p50 1069 ms (n=2) | 100.0% (n=3); warm p50 523 ms (n=2) | 100.0% (n=3); warm p50 10 ms (n=2) | 100.0% (n=3); warm p50 87 ms (n=2) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×3) | 100.0% (n=3); warm p50 3 ms (n=2) | usable: tie between fetchkeep-http 100.0% (n=3), fetchkeep-chromium 100.0% (n=3), fetchkeep-lightpanda 100.0% (n=3), fetchkeep-auto 100.0% (n=3), firecrawl-selfhost 100.0% (n=3), donsetch 100.0% (n=3) — small sample (n=3). warm p50: donsetch 3 ms (n=2) vs next-best fetchkeep-auto 10 ms (n=2) — small sample (n=2). |
| pdf | 100.0% (n=6); warm p50 7 ms (n=4) | 100.0% (n=6); warm p50 49 ms (n=4) | 100.0% (n=6); warm p50 521 ms (n=4) | 100.0% (n=6); warm p50 6 ms (n=4) | 100.0% (n=6); warm p50 21 ms (n=4) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×6) | 100.0% (n=6); warm p50 24 ms (n=4) | usable: tie between fetchkeep-http 100.0% (n=6), fetchkeep-chromium 100.0% (n=6), fetchkeep-lightpanda 100.0% (n=6), fetchkeep-auto 100.0% (n=6), firecrawl-selfhost 100.0% (n=6), donsetch 100.0% (n=6) — small sample (n=6). warm p50: fetchkeep-auto 6 ms (n=4) vs next-best fetchkeep-http 7 ms (n=4) — within 10% of the runner-up, not a meaningful difference; small sample (n=4). |
| plain | 100.0% (n=3); warm p50 2 ms (n=2) | 100.0% (n=3); warm p50 1060 ms (n=2) | 100.0% (n=3); warm p50 522 ms (n=2) | 100.0% (n=3); warm p50 2 ms (n=2) | 100.0% (n=3); warm p50 73 ms (n=2) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×3) | 100.0% (n=3); warm p50 2 ms (n=2) | usable: tie between fetchkeep-http 100.0% (n=3), fetchkeep-chromium 100.0% (n=3), fetchkeep-lightpanda 100.0% (n=3), fetchkeep-auto 100.0% (n=3), firecrawl-selfhost 100.0% (n=3), donsetch 100.0% (n=3) — small sample (n=3). warm p50: fetchkeep-auto 2 ms (n=2) vs next-best donsetch 2 ms (n=2) — within 10% of the runner-up, not a meaningful difference; small sample (n=2). |
| redirect | 100.0% (n=3); warm p50 7 ms (n=2) | 100.0% (n=3); warm p50 1057 ms (n=2) | 100.0% (n=3); warm p50 520 ms (n=2) | 100.0% (n=3); warm p50 6 ms (n=2) | 100.0% (n=3); warm p50 96 ms (n=2) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×3) | 100.0% (n=3); warm p50 4 ms (n=2) | usable: tie between fetchkeep-http 100.0% (n=3), fetchkeep-chromium 100.0% (n=3), fetchkeep-lightpanda 100.0% (n=3), fetchkeep-auto 100.0% (n=3), firecrawl-selfhost 100.0% (n=3), donsetch 100.0% (n=3) — small sample (n=3). warm p50: donsetch 4 ms (n=2) vs next-best fetchkeep-auto 6 ms (n=2) — small sample (n=2). |
| table | 100.0% (n=6); warm p50 6 ms (n=4) | 100.0% (n=6); warm p50 1062 ms (n=4) | 100.0% (n=6); warm p50 525 ms (n=4) | 100.0% (n=6); warm p50 5 ms (n=4) | 100.0% (n=6); warm p50 85 ms (n=4) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×6) | 100.0% (n=6); warm p50 3 ms (n=4) | usable: tie between fetchkeep-http 100.0% (n=6), fetchkeep-chromium 100.0% (n=6), fetchkeep-lightpanda 100.0% (n=6), fetchkeep-auto 100.0% (n=6), firecrawl-selfhost 100.0% (n=6), donsetch 100.0% (n=6) — small sample (n=6). warm p50: donsetch 3 ms (n=4) vs next-best fetchkeep-auto 5 ms (n=4) — small sample (n=4). |

### Trade-offs on live tasks (derived from this run only)

- Usable rate: tie between fetchkeep-chromium 95.8% (n=72), fetchkeep-auto 95.8% (n=72).
- Passage recall: tie between fetchkeep-chromium 0.958 (n=72), fetchkeep-auto 0.958 (n=72).
- Boilerplate exclusion: tie between fetchkeep-http 0.875 (n=48), fetchkeep-chromium 0.875 (n=48), fetchkeep-lightpanda 0.875 (n=48), fetchkeep-auto 0.875 (n=48).
- Warm p50 latency: donsetch 260 ms (n=46) vs next-best fetchkeep-http 382 ms (n=48).
- First-request p50 latency: fetchkeep-auto 393 ms (n=24) vs next-best fetchkeep-http 406 ms (n=24) — within 10% of the runner-up, not a meaningful difference.

Per workload (category) on live: usable rate and warm p50 per profile. Leaders are named only with the margin and sample size; small n means the ranking can flip on a re-run.

| category | fetchkeep-http | fetchkeep-chromium | fetchkeep-lightpanda | fetchkeep-auto | firecrawl-selfhost | firecrawl-hosted | donsetch | leaders (usable rate; warm p50) |
|---|---|---|---|---|---|---|---|---|
| article | 100.0% (n=6); warm p50 408 ms (n=4) | 100.0% (n=6); warm p50 1876 ms (n=4) | 100.0% (n=6); warm p50 1366 ms (n=4) | 100.0% (n=6); warm p50 562 ms (n=4) | 100.0% (n=6); warm p50 809 ms (n=4) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×6) | 100.0% (n=6); warm p50 43 ms (n=4) | usable: tie between fetchkeep-http 100.0% (n=6), fetchkeep-chromium 100.0% (n=6), fetchkeep-lightpanda 100.0% (n=6), fetchkeep-auto 100.0% (n=6), firecrawl-selfhost 100.0% (n=6), donsetch 100.0% (n=6) — small sample (n=6). warm p50: donsetch 43 ms (n=4) vs next-best fetchkeep-http 408 ms (n=4) — small sample (n=4). |
| code | 100.0% (n=3); warm p50 681 ms (n=2) | 100.0% (n=3); warm p50 2977 ms (n=2) | 100.0% (n=3); warm p50 1405 ms (n=2) | 100.0% (n=3); warm p50 266 ms (n=2) | 100.0% (n=3); warm p50 2176 ms (n=2) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×3) | 100.0% (n=3); warm p50 175 ms (n=2) | usable: tie between fetchkeep-http 100.0% (n=3), fetchkeep-chromium 100.0% (n=3), fetchkeep-lightpanda 100.0% (n=3), fetchkeep-auto 100.0% (n=3), firecrawl-selfhost 100.0% (n=3), donsetch 100.0% (n=3) — small sample (n=3). warm p50: donsetch 175 ms (n=2) vs next-best fetchkeep-auto 266 ms (n=2) — small sample (n=2). |
| docs | 100.0% (n=18); warm p50 303 ms (n=12) | 100.0% (n=18); warm p50 2152 ms (n=12) | 100.0% (n=18); warm p50 933 ms (n=12) | 100.0% (n=18); warm p50 296 ms (n=12) | 100.0% (n=18); warm p50 614 ms (n=12) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×18) | 100.0% (n=18); warm p50 167 ms (n=12) | usable: tie between fetchkeep-http 100.0% (n=18), fetchkeep-chromium 100.0% (n=18), fetchkeep-lightpanda 100.0% (n=18), fetchkeep-auto 100.0% (n=18), firecrawl-selfhost 100.0% (n=18), donsetch 100.0% (n=18). warm p50: donsetch 167 ms (n=12) vs next-best fetchkeep-auto 296 ms (n=12). |
| forum | 100.0% (n=3); warm p50 869 ms (n=2) | 100.0% (n=3); warm p50 2836 ms (n=2) | 100.0% (n=3); warm p50 1827 ms (n=2) | 100.0% (n=3); warm p50 1257 ms (n=2) | 100.0% (n=3); warm p50 1460 ms (n=2) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×3) | 100.0% (n=3); warm p50 946 ms (n=2) | usable: tie between fetchkeep-http 100.0% (n=3), fetchkeep-chromium 100.0% (n=3), fetchkeep-lightpanda 100.0% (n=3), fetchkeep-auto 100.0% (n=3), firecrawl-selfhost 100.0% (n=3), donsetch 100.0% (n=3) — small sample (n=3). warm p50: fetchkeep-http 869 ms (n=2) vs next-best donsetch 946 ms (n=2) — within 10% of the runner-up, not a meaningful difference; small sample (n=2). |
| js | 0.0% (n=9); warm p50 380 ms (n=6) | 66.7% (n=9); warm p50 1963 ms (n=6) | 44.4% (n=9); warm p50 1106 ms (n=6) | 66.7% (n=9); warm p50 2299 ms (n=6) | 33.3% (n=9); warm p50 909 ms (n=4) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×9) | 33.3% (n=9); warm p50 470 ms (n=4) | usable: tie between fetchkeep-chromium 66.7% (n=9), fetchkeep-auto 66.7% (n=9) — small sample (n=9). warm p50: fetchkeep-http 380 ms (n=6) vs next-best donsetch 470 ms (n=4) — small sample (n=4). |
| nav-heavy | 100.0% (n=6); warm p50 199 ms (n=4) | 100.0% (n=6); warm p50 1504 ms (n=4) | 100.0% (n=6); warm p50 822 ms (n=4) | 100.0% (n=6); warm p50 216 ms (n=4) | 100.0% (n=6); warm p50 469 ms (n=4) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×6) | 100.0% (n=6); warm p50 46 ms (n=4) | usable: tie between fetchkeep-http 100.0% (n=6), fetchkeep-chromium 100.0% (n=6), fetchkeep-lightpanda 100.0% (n=6), fetchkeep-auto 100.0% (n=6), firecrawl-selfhost 100.0% (n=6), donsetch 100.0% (n=6) — small sample (n=6). warm p50: donsetch 46 ms (n=4) vs next-best fetchkeep-http 199 ms (n=4) — small sample (n=4). |
| news | 100.0% (n=3); warm p50 143 ms (n=2) | 100.0% (n=3); warm p50 1413 ms (n=2) | 100.0% (n=3); warm p50 682 ms (n=2) | 100.0% (n=3); warm p50 120 ms (n=2) | 100.0% (n=3); warm p50 358 ms (n=2) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×3) | 100.0% (n=3); warm p50 26 ms (n=2) | usable: tie between fetchkeep-http 100.0% (n=3), fetchkeep-chromium 100.0% (n=3), fetchkeep-lightpanda 100.0% (n=3), fetchkeep-auto 100.0% (n=3), firecrawl-selfhost 100.0% (n=3), donsetch 100.0% (n=3) — small sample (n=3). warm p50: donsetch 26 ms (n=2) vs next-best fetchkeep-auto 120 ms (n=2) — small sample (n=2). |
| pdf | 100.0% (n=6); warm p50 393 ms (n=4) | 100.0% (n=6); warm p50 737 ms (n=4) | 100.0% (n=6); warm p50 1307 ms (n=4) | 100.0% (n=6); warm p50 493 ms (n=4) | 100.0% (n=6); warm p50 779 ms (n=4) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×6) | 100.0% (n=6); warm p50 260 ms (n=4) | usable: tie between fetchkeep-http 100.0% (n=6), fetchkeep-chromium 100.0% (n=6), fetchkeep-lightpanda 100.0% (n=6), fetchkeep-auto 100.0% (n=6), firecrawl-selfhost 100.0% (n=6), donsetch 100.0% (n=6) — small sample (n=6). warm p50: donsetch 260 ms (n=4) vs next-best fetchkeep-http 393 ms (n=4) — small sample (n=4). |
| plain | 100.0% (n=6); warm p50 125 ms (n=4) | 100.0% (n=6); warm p50 1261 ms (n=4) | 100.0% (n=6); warm p50 728 ms (n=4) | 100.0% (n=6); warm p50 175 ms (n=4) | 100.0% (n=6); warm p50 286 ms (n=4) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×6) | 100.0% (n=6); warm p50 36 ms (n=4) | usable: tie between fetchkeep-http 100.0% (n=6), fetchkeep-chromium 100.0% (n=6), fetchkeep-lightpanda 100.0% (n=6), fetchkeep-auto 100.0% (n=6), firecrawl-selfhost 100.0% (n=6), donsetch 100.0% (n=6) — small sample (n=6). warm p50: donsetch 36 ms (n=4) vs next-best fetchkeep-http 125 ms (n=4) — small sample (n=4). |
| reference | 100.0% (n=3); warm p50 530 ms (n=2) | 100.0% (n=3); warm p50 1791 ms (n=2) | 100.0% (n=3); warm p50 1031 ms (n=2) | 100.0% (n=3); warm p50 549 ms (n=2) | 100.0% (n=3); warm p50 792 ms (n=2) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×3) | 100.0% (n=3); warm p50 170 ms (n=2) | usable: tie between fetchkeep-http 100.0% (n=3), fetchkeep-chromium 100.0% (n=3), fetchkeep-lightpanda 100.0% (n=3), fetchkeep-auto 100.0% (n=3), firecrawl-selfhost 100.0% (n=3), donsetch 100.0% (n=3) — small sample (n=3). warm p50: donsetch 170 ms (n=2) vs next-best fetchkeep-http 530 ms (n=2) — small sample (n=2). |
| table | 100.0% (n=9); warm p50 531 ms (n=6) | 100.0% (n=9); warm p50 2118 ms (n=6) | 100.0% (n=9); warm p50 1381 ms (n=6) | 100.0% (n=9); warm p50 517 ms (n=6) | 100.0% (n=9); warm p50 2055 ms (n=6) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×9) | 100.0% (n=9); warm p50 351 ms (n=6) | usable: tie between fetchkeep-http 100.0% (n=9), fetchkeep-chromium 100.0% (n=9), fetchkeep-lightpanda 100.0% (n=9), fetchkeep-auto 100.0% (n=9), firecrawl-selfhost 100.0% (n=9), donsetch 100.0% (n=9) — small sample (n=9). warm p50: donsetch 351 ms (n=6) vs next-best fetchkeep-auto 517 ms (n=6) — small sample (n=6). |

## Reproduce

Re-run with:

```
npm run bench -- --engines fetchkeep-http,fetchkeep-chromium,fetchkeep-lightpanda,fetchkeep-auto,firecrawl-selfhost,firecrawl-hosted,donsetch --suite full --repetitions 3 --seed 42 --timeout 30000 --cold-start --footprint
```

| dataset | path | sha256 | cases |
|---|---|---|---|
| fixtures | bench/datasets/fixtures.json | 8c7b0a6f99ea2f1fd5551747be2df264f7fbfacc03973227cc484e740f576749 | 21 |
| live | bench/datasets/live.json | d458c8afc2696bd34699711b710ebee36bfbaf2f9557ae1893b31090ae6f7474 | 24 |
| live-crawl | bench/datasets/live-crawl.json | 166f4d2d133883c97d2b24c57650f1f9edd4e72d02611cda8b2e98d5a164ec75 | 1 |
| fixture-files | bench/fixtures/SHA256SUMS | 9d450f2677512812812f7a05020e5e75cd8cd2588895585786a35fb74679de52 | 0 |

Per-case outputs: see `cases.csv` and the per-case inspection section of `report.html`; raw engine output is under `raw/`.
