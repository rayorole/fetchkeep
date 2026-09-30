# Fetchkeep benchmark report — fetch — 2026-09-30T16-51-06-fetch

## Summary of what was run

- Suite: fetch; run id: 2026-09-30T16-51-06-fetch
- Started 2026-09-30T16:51:06.455Z, finished 2026-09-30T17:03:18.017Z
- Seed: 42; repetitions per case: 3; per-task timeout: 30000 ms; concurrency: 1
- Tokenizer: gpt-tokenizer (o200k_base, version 4.0.0)
- Fetch tasks: 924 over 44 cases; crawl tasks: 0
- Profiles: fetchkeep-http, fetchkeep-chromium, fetchkeep-lightpanda, fetchkeep-auto, firecrawl-selfhost, firecrawl-hosted, donsetch
- Fixture server: http://172.31.172.243:39953 (bound to 0.0.0.0)
- Command: `node bench/run.ts --engines fetchkeep,firecrawl,donsetch --suite fetch --cold-start --footprint`
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
| fetchkeep-http | fetchkeep | 0.0.0 | a244b9aee566fd73516585973d1ed2d8256d90a6 | MCP stdio (web_fetch / web_crawl / web_read), warm server per profile | yes |  | 367 ms |
| fetchkeep-chromium | fetchkeep | 0.0.0 | a244b9aee566fd73516585973d1ed2d8256d90a6 | MCP stdio (web_fetch / web_crawl / web_read), warm server per profile | yes |  | 359 ms |
| fetchkeep-lightpanda | fetchkeep | 0.0.0 | a244b9aee566fd73516585973d1ed2d8256d90a6 | MCP stdio (web_fetch / web_crawl / web_read), warm server per profile | yes |  | 350 ms |
| fetchkeep-auto | fetchkeep | 0.0.0 | a244b9aee566fd73516585973d1ed2d8256d90a6 | MCP stdio (web_fetch / web_crawl / web_read), warm server per profile | yes |  | 388 ms |
| firecrawl-selfhost | firecrawl | apps/api 1.0.0 (self-hosted build) | 7e4a959dca0efbdad2f0a9d82b0fce20afeb9a4d | REST API v2 (http://localhost:3002) | yes |  | 0 ms |
| firecrawl-hosted | firecrawl | hosted API v2 | hosted service (version not exposed) | REST API v2 (https://api.firecrawl.dev) | no | FIRECRAWL_API_KEY is not set | n/a |
| donsetch | donsetch | 4.4.1 | v4.4.1 release binary (npm donsetch@4.4.1) | MCP stdio (web_fetch / web_crawl), warm server | yes |  | 62 ms |

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
| fetchkeep-http | 60 | 51 / 9 / 0 / 0 | 85.0% (n=60) | 88.2% (n=51) | 0.882 (n=51) | 0.950 (n=30) | 0.973 (n=27) | 7 ms (n=17) | 5 ms (n=34) | 2502 ms (n=34) | 100.0% (n=9) | n/a |
| fetchkeep-chromium | 60 | 51 / 9 / 0 / 0 | 85.0% (n=60) | 100.0% (n=51) | 1.000 (n=51) | 0.950 (n=30) | 0.965 (n=27) | 1059 ms (n=17) | 1051 ms (n=34) | 3552 ms (n=34) | 100.0% (n=9) | n/a |
| fetchkeep-lightpanda | 60 | 51 / 9 / 0 / 0 | 85.0% (n=60) | 100.0% (n=51) | 1.000 (n=51) | 0.950 (n=30) | 0.965 (n=27) | 523 ms (n=17) | 520 ms (n=34) | 3021 ms (n=34) | 100.0% (n=9) | n/a |
| fetchkeep-auto | 60 | 51 / 9 / 0 / 0 | 85.0% (n=60) | 100.0% (n=51) | 1.000 (n=51) | 0.950 (n=30) | 0.973 (n=27) | 11 ms (n=17) | 6 ms (n=34) | 2503 ms (n=34) | 100.0% (n=9) | n/a |
| firecrawl-selfhost | 60 | 48 / 12 / 0 / 0 | 80.0% (n=60) | 94.1% (n=51) | 1.000 (n=48) | 0.833 (n=27) | 0.948 (n=27) | 69 ms (n=16) | 73 ms (n=32) | 2559 ms (n=32) | 100.0% (n=9) | n/a |
| donsetch | 60 | 51 / 9 / 0 / 0 | 85.0% (n=60) | 100.0% (n=51) | 1.000 (n=51) | 0.900 (n=30) | 0.822 (n=27) | 3 ms (n=17) | 3 ms (n=34) | 4230 ms (n=34) | 100.0% (n=9) | n/a |

All fixture tasks per profile (includes cases only some profiles could run):

| profile | tasks | ok / error / unavail. / N/A | success | usable | passage recall | boilerplate excl. | token F1 | first p50 | warm p50 | warm p95 | correct error | cost |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| fetchkeep-http | 60 | 51 / 9 / 0 / 0 | 85.0% (n=60) | 88.2% (n=51) | 0.882 (n=51) | 0.950 (n=30) | 0.973 (n=27) | 7 ms (n=17) | 5 ms (n=34) | 2502 ms (n=34) | 100.0% (n=9) | n/a |
| fetchkeep-chromium | 60 | 51 / 9 / 0 / 0 | 85.0% (n=60) | 100.0% (n=51) | 1.000 (n=51) | 0.950 (n=30) | 0.965 (n=27) | 1059 ms (n=17) | 1051 ms (n=34) | 3552 ms (n=34) | 100.0% (n=9) | n/a |
| fetchkeep-lightpanda | 60 | 51 / 9 / 0 / 0 | 85.0% (n=60) | 100.0% (n=51) | 1.000 (n=51) | 0.950 (n=30) | 0.965 (n=27) | 523 ms (n=17) | 520 ms (n=34) | 3021 ms (n=34) | 100.0% (n=9) | n/a |
| fetchkeep-auto | 60 | 51 / 9 / 0 / 0 | 85.0% (n=60) | 100.0% (n=51) | 1.000 (n=51) | 0.950 (n=30) | 0.973 (n=27) | 11 ms (n=17) | 6 ms (n=34) | 2503 ms (n=34) | 100.0% (n=9) | n/a |
| firecrawl-selfhost | 60 | 48 / 12 / 0 / 0 | 80.0% (n=60) | 94.1% (n=51) | 1.000 (n=48) | 0.833 (n=27) | 0.948 (n=27) | 69 ms (n=16) | 73 ms (n=32) | 2559 ms (n=32) | 100.0% (n=9) | n/a |
| firecrawl-hosted | 60 | 0 / 0 / 60 / 0 | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a |
| donsetch | 60 | 51 / 9 / 0 / 0 | 85.0% (n=60) | 100.0% (n=51) | 1.000 (n=51) | 0.900 (n=30) | 0.822 (n=27) | 3 ms (n=17) | 3 ms (n=34) | 4230 ms (n=34) | 100.0% (n=9) | n/a |

### Live websites

Common tasks: 24 of 24 live cases were attempted by every profile that ran any live task (fetchkeep-http, fetchkeep-chromium, fetchkeep-lightpanda, fetchkeep-auto, firecrawl-selfhost, donsetch). This is the like-for-like comparison.

| profile | tasks | ok / error / unavail. / N/A | success | usable | passage recall | boilerplate excl. | token F1 | first p50 | warm p50 | warm p95 | correct error | cost |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| fetchkeep-http | 72 | 72 / 0 / 0 / 0 | 100.0% (n=72) | 87.5% (n=72) | 0.875 (n=72) | 0.875 (n=48) | n/a (n=0) | 359 ms (n=24) | 363 ms (n=48) | 1256 ms (n=48) | n/a (n=0) | n/a |
| fetchkeep-chromium | 72 | 72 / 0 / 0 / 0 | 100.0% (n=72) | 95.8% (n=72) | 0.958 (n=72) | 0.875 (n=48) | n/a (n=0) | 1846 ms (n=24) | 1832 ms (n=48) | 2991 ms (n=48) | n/a (n=0) | n/a |
| fetchkeep-lightpanda | 72 | 72 / 0 / 0 / 0 | 100.0% (n=72) | 94.4% (n=72) | 0.944 (n=72) | 0.875 (n=48) | n/a (n=0) | 1144 ms (n=24) | 1102 ms (n=48) | 1885 ms (n=48) | n/a (n=0) | n/a |
| fetchkeep-auto | 72 | 72 / 0 / 0 / 0 | 100.0% (n=72) | 95.8% (n=72) | 0.958 (n=72) | 0.875 (n=48) | n/a (n=0) | 425 ms (n=24) | 394 ms (n=48) | 2276 ms (n=48) | n/a (n=0) | n/a |
| firecrawl-selfhost | 72 | 69 / 3 / 0 / 0 | 95.8% (n=72) | 91.7% (n=72) | 0.957 (n=69) | 0.660 (n=48) | n/a (n=0) | 763 ms (n=23) | 782 ms (n=46) | 5837 ms (n=46) | n/a (n=0) | n/a |
| donsetch | 72 | 69 / 3 / 0 / 0 | 95.8% (n=72) | 91.7% (n=72) | 0.957 (n=69) | 0.800 (n=45) | n/a (n=0) | 387 ms (n=23) | 207 ms (n=46) | 945 ms (n=46) | n/a (n=0) | n/a |

All live tasks per profile (includes cases only some profiles could run):

| profile | tasks | ok / error / unavail. / N/A | success | usable | passage recall | boilerplate excl. | token F1 | first p50 | warm p50 | warm p95 | correct error | cost |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| fetchkeep-http | 72 | 72 / 0 / 0 / 0 | 100.0% (n=72) | 87.5% (n=72) | 0.875 (n=72) | 0.875 (n=48) | n/a (n=0) | 359 ms (n=24) | 363 ms (n=48) | 1256 ms (n=48) | n/a (n=0) | n/a |
| fetchkeep-chromium | 72 | 72 / 0 / 0 / 0 | 100.0% (n=72) | 95.8% (n=72) | 0.958 (n=72) | 0.875 (n=48) | n/a (n=0) | 1846 ms (n=24) | 1832 ms (n=48) | 2991 ms (n=48) | n/a (n=0) | n/a |
| fetchkeep-lightpanda | 72 | 72 / 0 / 0 / 0 | 100.0% (n=72) | 94.4% (n=72) | 0.944 (n=72) | 0.875 (n=48) | n/a (n=0) | 1144 ms (n=24) | 1102 ms (n=48) | 1885 ms (n=48) | n/a (n=0) | n/a |
| fetchkeep-auto | 72 | 72 / 0 / 0 / 0 | 100.0% (n=72) | 95.8% (n=72) | 0.958 (n=72) | 0.875 (n=48) | n/a (n=0) | 425 ms (n=24) | 394 ms (n=48) | 2276 ms (n=48) | n/a (n=0) | n/a |
| firecrawl-selfhost | 72 | 69 / 3 / 0 / 0 | 95.8% (n=72) | 91.7% (n=72) | 0.957 (n=69) | 0.660 (n=48) | n/a (n=0) | 763 ms (n=23) | 782 ms (n=46) | 5837 ms (n=46) | n/a (n=0) | n/a |
| firecrawl-hosted | 72 | 0 / 0 / 72 / 0 | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a |
| donsetch | 72 | 69 / 3 / 0 / 0 | 95.8% (n=72) | 91.7% (n=72) | 0.957 (n=69) | 0.800 (n=45) | n/a (n=0) | 387 ms (n=23) | 207 ms (n=46) | 945 ms (n=46) | n/a (n=0) | n/a |

### Held-out subset

Held-out cases were excluded from development tuning. Compare with the dev subset: a large gap suggests overfitting to the dev cases.

fixture — held-out:

| profile | tasks | ok / error / unavail. / N/A | success | usable | passage recall | boilerplate excl. | token F1 | first p50 | warm p50 | warm p95 | correct error | cost |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| fetchkeep-http | 18 | 18 / 0 / 0 / 0 | 100.0% (n=18) | 83.3% (n=18) | 0.833 (n=18) | 1.000 (n=9) | 0.982 (n=9) | 5 ms (n=6) | 5 ms (n=12) | 11 ms (n=12) | n/a (n=0) | n/a |
| fetchkeep-chromium | 18 | 18 / 0 / 0 / 0 | 100.0% (n=18) | 100.0% (n=18) | 1.000 (n=18) | 1.000 (n=9) | 0.982 (n=9) | 1058 ms (n=6) | 1050 ms (n=12) | 1103 ms (n=12) | n/a (n=0) | n/a |
| fetchkeep-lightpanda | 18 | 18 / 0 / 0 / 0 | 100.0% (n=18) | 100.0% (n=18) | 1.000 (n=18) | 1.000 (n=9) | 0.982 (n=9) | 520 ms (n=6) | 518 ms (n=12) | 523 ms (n=12) | n/a (n=0) | n/a |
| fetchkeep-auto | 18 | 18 / 0 / 0 / 0 | 100.0% (n=18) | 100.0% (n=18) | 1.000 (n=18) | 1.000 (n=9) | 0.982 (n=9) | 7 ms (n=6) | 5 ms (n=12) | 1069 ms (n=12) | n/a (n=0) | n/a |
| firecrawl-selfhost | 18 | 18 / 0 / 0 / 0 | 100.0% (n=18) | 100.0% (n=18) | 1.000 (n=18) | 0.867 (n=9) | 0.955 (n=9) | 69 ms (n=6) | 67 ms (n=12) | 99 ms (n=12) | n/a (n=0) | n/a |
| firecrawl-hosted | 18 | 0 / 0 / 18 / 0 | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a |
| donsetch | 18 | 18 / 0 / 0 / 0 | 100.0% (n=18) | 100.0% (n=18) | 1.000 (n=18) | 1.000 (n=9) | 0.904 (n=9) | 3 ms (n=6) | 3 ms (n=12) | 4234 ms (n=12) | n/a (n=0) | n/a |

fixture — dev (not held out):

| profile | tasks | ok / error / unavail. / N/A | success | usable | passage recall | boilerplate excl. | token F1 | first p50 | warm p50 | warm p95 | correct error | cost |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| fetchkeep-http | 42 | 33 / 9 / 0 / 0 | 78.6% (n=42) | 90.9% (n=33) | 0.909 (n=33) | 0.929 (n=21) | 0.968 (n=18) | 7 ms (n=11) | 5 ms (n=22) | 2502 ms (n=22) | 100.0% (n=9) | n/a |
| fetchkeep-chromium | 42 | 33 / 9 / 0 / 0 | 78.6% (n=42) | 100.0% (n=33) | 1.000 (n=33) | 0.929 (n=21) | 0.956 (n=18) | 1067 ms (n=11) | 1053 ms (n=22) | 3552 ms (n=22) | 100.0% (n=9) | n/a |
| fetchkeep-lightpanda | 42 | 33 / 9 / 0 / 0 | 78.6% (n=42) | 100.0% (n=33) | 1.000 (n=33) | 0.929 (n=21) | 0.956 (n=18) | 527 ms (n=11) | 521 ms (n=22) | 3021 ms (n=22) | 100.0% (n=9) | n/a |
| fetchkeep-auto | 42 | 33 / 9 / 0 / 0 | 78.6% (n=42) | 100.0% (n=33) | 1.000 (n=33) | 0.929 (n=21) | 0.968 (n=18) | 11 ms (n=11) | 6 ms (n=22) | 2503 ms (n=22) | 100.0% (n=9) | n/a |
| firecrawl-selfhost | 42 | 30 / 12 / 0 / 0 | 71.4% (n=42) | 90.9% (n=33) | 1.000 (n=30) | 0.817 (n=18) | 0.944 (n=18) | 69 ms (n=10) | 74 ms (n=20) | 2559 ms (n=20) | 100.0% (n=9) | n/a |
| firecrawl-hosted | 42 | 0 / 0 / 42 / 0 | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a |
| donsetch | 42 | 33 / 9 / 0 / 0 | 78.6% (n=42) | 100.0% (n=33) | 1.000 (n=33) | 0.857 (n=21) | 0.781 (n=18) | 3 ms (n=11) | 3 ms (n=22) | 2504 ms (n=22) | 100.0% (n=9) | n/a |

live — held-out:

| profile | tasks | ok / error / unavail. / N/A | success | usable | passage recall | boilerplate excl. | token F1 | first p50 | warm p50 | warm p95 | correct error | cost |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| fetchkeep-http | 18 | 18 / 0 / 0 / 0 | 100.0% (n=18) | 83.3% (n=18) | 0.833 (n=18) | 1.000 (n=12) | n/a (n=0) | 286 ms (n=6) | 239 ms (n=12) | 768 ms (n=12) | n/a (n=0) | n/a |
| fetchkeep-chromium | 18 | 18 / 0 / 0 / 0 | 100.0% (n=18) | 83.3% (n=18) | 0.833 (n=18) | 1.000 (n=12) | n/a (n=0) | 1399 ms (n=6) | 1408 ms (n=12) | 1868 ms (n=12) | n/a (n=0) | n/a |
| fetchkeep-lightpanda | 18 | 18 / 0 / 0 / 0 | 100.0% (n=18) | 83.3% (n=18) | 0.833 (n=18) | 1.000 (n=12) | n/a (n=0) | 814 ms (n=6) | 911 ms (n=12) | 1568 ms (n=12) | n/a (n=0) | n/a |
| fetchkeep-auto | 18 | 18 / 0 / 0 / 0 | 100.0% (n=18) | 83.3% (n=18) | 0.833 (n=18) | 1.000 (n=12) | n/a (n=0) | 259 ms (n=6) | 393 ms (n=12) | 2285 ms (n=12) | n/a (n=0) | n/a |
| firecrawl-selfhost | 18 | 18 / 0 / 0 / 0 | 100.0% (n=18) | 83.3% (n=18) | 0.833 (n=18) | 0.625 (n=12) | n/a (n=0) | 528 ms (n=6) | 519 ms (n=12) | 1581 ms (n=12) | n/a (n=0) | n/a |
| firecrawl-hosted | 18 | 0 / 0 / 18 / 0 | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a |
| donsetch | 18 | 15 / 3 / 0 / 0 | 83.3% (n=18) | 83.3% (n=18) | 1.000 (n=15) | 0.667 (n=9) | n/a (n=0) | 352 ms (n=5) | 45 ms (n=10) | 627 ms (n=10) | n/a (n=0) | n/a |

live — dev (not held out):

| profile | tasks | ok / error / unavail. / N/A | success | usable | passage recall | boilerplate excl. | token F1 | first p50 | warm p50 | warm p95 | correct error | cost |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| fetchkeep-http | 54 | 54 / 0 / 0 / 0 | 100.0% (n=54) | 88.9% (n=54) | 0.889 (n=54) | 0.833 (n=36) | n/a (n=0) | 359 ms (n=18) | 378 ms (n=36) | 1293 ms (n=36) | n/a (n=0) | n/a |
| fetchkeep-chromium | 54 | 54 / 0 / 0 / 0 | 100.0% (n=54) | 100.0% (n=54) | 1.000 (n=54) | 0.833 (n=36) | n/a (n=0) | 1989 ms (n=18) | 1978 ms (n=36) | 3093 ms (n=36) | n/a (n=0) | n/a |
| fetchkeep-lightpanda | 54 | 54 / 0 / 0 / 0 | 100.0% (n=54) | 98.1% (n=54) | 0.981 (n=54) | 0.833 (n=36) | n/a (n=0) | 1225 ms (n=18) | 1138 ms (n=36) | 1915 ms (n=36) | n/a (n=0) | n/a |
| fetchkeep-auto | 54 | 54 / 0 / 0 / 0 | 100.0% (n=54) | 100.0% (n=54) | 1.000 (n=54) | 0.833 (n=36) | n/a (n=0) | 432 ms (n=18) | 394 ms (n=36) | 2276 ms (n=36) | n/a (n=0) | n/a |
| firecrawl-selfhost | 54 | 51 / 3 / 0 / 0 | 94.4% (n=54) | 94.4% (n=54) | 1.000 (n=51) | 0.671 (n=36) | n/a (n=0) | 763 ms (n=17) | 791 ms (n=34) | 8427 ms (n=34) | n/a (n=0) | n/a |
| firecrawl-hosted | 54 | 0 / 0 / 54 / 0 | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a |
| donsetch | 54 | 54 / 0 / 0 / 0 | 100.0% (n=54) | 94.4% (n=54) | 0.944 (n=54) | 0.833 (n=36) | n/a (n=0) | 390 ms (n=18) | 217 ms (n=36) | 977 ms (n=36) | n/a (n=0) | n/a |

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
| fetchkeep-chromium | live | 0.958 (n=72) | 4.2% (n=72) | 0.875 (n=48) | n/a (n=0) | n/a (n=0) | n/a (n=0) | 1.000 (n=30) | 1.000 (n=9) | 0.857 (n=21) | 59058 (n=72) | 16469 (n=72) |
| fetchkeep-lightpanda | live | 0.944 (n=72) | 5.6% (n=72) | 0.875 (n=48) | n/a (n=0) | n/a (n=0) | n/a (n=0) | 1.000 (n=30) | 1.000 (n=9) | 0.714 (n=21) | 58738 (n=72) | 16383 (n=72) |
| fetchkeep-auto | live | 0.958 (n=72) | 4.2% (n=72) | 0.875 (n=48) | n/a (n=0) | n/a (n=0) | n/a (n=0) | 1.000 (n=30) | 1.000 (n=9) | 1.000 (n=21) | 57947 (n=72) | 16135 (n=72) |
| firecrawl-selfhost | live | 0.957 (n=69) | 4.3% (n=69) | 0.660 (n=48) | n/a (n=0) | n/a (n=0) | n/a (n=0) | 0.458 (n=30) | 1.000 (n=9) | 0.333 (n=21) | 63324 (n=69) | 17341 (n=69) |
| firecrawl-hosted | live | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) |
| donsetch | live | 0.957 (n=69) | 4.3% (n=69) | 0.800 (n=45) | n/a (n=0) | n/a (n=0) | n/a (n=0) | 0.867 (n=30) | 1.000 (n=9) | 0.857 (n=21) | 37897 (n=69) | 8903 (n=69) |

### Errors, escalation and retries

| profile | dataset | timeout | blocked | error kinds | browser escalation | attempts (mean) |
|---|---|---|---|---|---|---|
| fetchkeep-http | fixture | 0.0% (n=60) | 0.0% (n=60) | http_error×9 | 0.0% (n=51) | 1.00 (n=51) |
| fetchkeep-chromium | fixture | 0.0% (n=60) | 0.0% (n=60) | engine_error×3; http_error×6 | 0.0% (n=51) | 1.18 (n=51) |
| fetchkeep-lightpanda | fixture | 0.0% (n=60) | 0.0% (n=60) | http_error×6; engine_error×3 | 0.0% (n=51) | 1.18 (n=51) |
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
| fetchkeep-http | fixture | 7 ms (n=17) | 2529 ms (n=17) | 5 ms (n=34) | 2502 ms (n=34) |
| fetchkeep-chromium | fixture | 1059 ms (n=17) | 3549 ms (n=17) | 1051 ms (n=34) | 3552 ms (n=34) |
| fetchkeep-lightpanda | fixture | 523 ms (n=17) | 3017 ms (n=17) | 520 ms (n=34) | 3021 ms (n=34) |
| fetchkeep-auto | fixture | 11 ms (n=17) | 2503 ms (n=17) | 6 ms (n=34) | 2503 ms (n=34) |
| firecrawl-selfhost | fixture | 69 ms (n=16) | 2565 ms (n=16) | 73 ms (n=32) | 2559 ms (n=32) |
| firecrawl-hosted | fixture | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) |
| donsetch | fixture | 3 ms (n=17) | 4646 ms (n=17) | 3 ms (n=34) | 4230 ms (n=34) |
| fetchkeep-http | live | 359 ms (n=24) | 1152 ms (n=24) | 363 ms (n=48) | 1256 ms (n=48) |
| fetchkeep-chromium | live | 1846 ms (n=24) | 3128 ms (n=24) | 1832 ms (n=48) | 2991 ms (n=48) |
| fetchkeep-lightpanda | live | 1144 ms (n=24) | 1973 ms (n=24) | 1102 ms (n=48) | 1885 ms (n=48) |
| fetchkeep-auto | live | 425 ms (n=24) | 2332 ms (n=24) | 394 ms (n=48) | 2276 ms (n=48) |
| firecrawl-selfhost | live | 763 ms (n=23) | 2268 ms (n=23) | 782 ms (n=46) | 5837 ms (n=46) |
| firecrawl-hosted | live | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) |
| donsetch | live | 387 ms (n=23) | 1899 ms (n=23) | 207 ms (n=46) | 945 ms (n=46) |

## Crawl

No crawl tasks in this run.

## Resources

Scope matters: a local process tree, a whole Docker stack and a remote service are different things. Numbers are only comparable between profiles with the same scope; remote services cannot be measured and are never compared.

| profile | engine | scope | CPU (run) | peak RSS | idle RSS | samples | note |
|---|---|---|---|---|---|---|---|
| fetchkeep-http | fetchkeep | local process tree (engine process + children) | 23.13 s | 560.4 MB | 98.8 MB | 2456 |  |
| fetchkeep-chromium | fetchkeep | local process tree (engine process + children) | 73.17 s | 1281.2 MB | 99.2 MB | 2454 |  |
| fetchkeep-lightpanda | fetchkeep | local process tree (engine process + children) | 34.33 s | 622.6 MB | 99.4 MB | 2452 |  |
| fetchkeep-auto | fetchkeep | local process tree (engine process + children) | 28.85 s | 1061.9 MB | 99.3 MB | 2449 |  |
| firecrawl-selfhost | firecrawl | whole Docker stack (all containers of the engine) | 190.30 s | 3865.3 MB | 3636.0 MB | 2449 |  |
| donsetch | donsetch | local process tree (engine process + children) | 5.61 s | 3118.1 MB | 15.4 MB | 2448 |  |
| firecrawl-hosted | firecrawl | remote service — not measurable | not measurable | not measurable | not measurable | 0 | engine not started |

Measured scopes differ (process-tree, docker-stack): peak RSS bars below are labelled with their scope and are not like-for-like.

## Cold start

| profile | engine | method | p50 | min | max | samples |
|---|---|---|---|---|---|---|
| fetchkeep-http | fetchkeep | CLI one-shot: node dist/src/cli/main.js --json fetch <fixture> (process spawn → result → exit) | 406 ms (n=5) | 394 ms | 429 ms | 429, 406, 394, 395, 415 |
| fetchkeep-chromium | fetchkeep | CLI one-shot: node dist/src/cli/main.js --json fetch <fixture> (process spawn → result → exit) | 1830 ms (n=5) | 1820 ms | 1890 ms | 1890, 1824, 1820, 1867, 1830 |
| fetchkeep-lightpanda | fetchkeep | CLI one-shot: node dist/src/cli/main.js --json fetch <fixture> (process spawn → result → exit) | 1381 ms (n=5) | 1363 ms | 1415 ms | 1386, 1415, 1381, 1364, 1363 |
| fetchkeep-auto | fetchkeep | CLI one-shot: node dist/src/cli/main.js --json fetch <fixture> (process spawn → result → exit) | 422 ms (n=5) | 405 ms | 433 ms | 433, 405, 422, 422, 424 |
| firecrawl-selfhost | firecrawl | docker compose stop → docker compose up -d api → first successful /v2/scrape of a local fixture | 26499 ms (n=3) | 22407 ms | 28394 ms | 22407, 28394, 26499 |
| donsetch | donsetch | CLI one-shot: donsetch fetch <fixture> --json (process spawn → result → exit) | 36 ms (n=5) | 36 ms | 39 ms | 39, 36, 36, 36, 39 |

Cold-start methods differ per engine (see the method column); compare only rows that measure the same thing.

## Footprint

| profile | engine | component | size | bytes | method |
|---|---|---|---|---|---|
| fetchkeep-http | fetchkeep | npm tarball | 120.1 KiB | 122972 | npm pack |
| fetchkeep-http | fetchkeep | node_modules (fetchkeep + runtime deps, no browser) | 96.6 MiB | 101278426 | npm install <tarball> --omit=dev; du -sb node_modules |
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
| fetchkeep-lightpanda | live | 1.000 (n=68) |
| fetchkeep-auto | live | 1.000 (n=69) |

## Unsupported / N/A / unavailable

### Unavailable engines

- firecrawl-hosted (firecrawl): unavailable — FIRECRAWL_API_KEY is not set

### Tasks not run (unavailable / N/A)

- firecrawl-hosted — fixture fetch: unavailable for 60 task(s) (engine unavailable: FIRECRAWL_API_KEY is not set); cases: fx-404, fx-encoding-latin1, fx-js-spa, fx-nav-heavy, fx-500, fx-redirect-loop, fx-slow, fx-article-long … (+12 more)
- firecrawl-hosted — live fetch: unavailable for 72 task(s) (engine unavailable: FIRECRAWL_API_KEY is not set); cases: live-hn-dropbox-thread, live-python-library-index, live-example-com, live-rfc9309-pdf, live-go-effective-go, live-python-json, live-rfc9309-txt, live-quotes-toscrape-js-delayed … (+16 more)

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
- Token F1: fetchkeep-http 0.973 (n=27) vs next-best fetchkeep-auto 0.973 (n=27) — margin below 0.05 (5 points), not a meaningful difference.
- Warm p50 latency: donsetch 3 ms (n=34) vs next-best fetchkeep-http 5 ms (n=34).
- First-request p50 latency: donsetch 3 ms (n=17) vs next-best fetchkeep-http 7 ms (n=17).

Per workload (category) on fixture: usable rate and warm p50 per profile. Leaders are named only with the margin and sample size; small n means the ranking can flip on a re-run.

| category | fetchkeep-http | fetchkeep-chromium | fetchkeep-lightpanda | fetchkeep-auto | firecrawl-selfhost | firecrawl-hosted | donsetch | leaders (usable rate; warm p50) |
|---|---|---|---|---|---|---|---|---|
| article | 100.0% (n=6); warm p50 5 ms (n=4) | 100.0% (n=6); warm p50 1060 ms (n=4) | 100.0% (n=6); warm p50 518 ms (n=4) | 100.0% (n=6); warm p50 4 ms (n=4) | 100.0% (n=6); warm p50 74 ms (n=4) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×6) | 100.0% (n=6); warm p50 3 ms (n=4) | usable: tie between fetchkeep-http 100.0% (n=6), fetchkeep-chromium 100.0% (n=6), fetchkeep-lightpanda 100.0% (n=6), fetchkeep-auto 100.0% (n=6), firecrawl-selfhost 100.0% (n=6), donsetch 100.0% (n=6) — small sample (n=6). warm p50: donsetch 3 ms (n=4) vs next-best fetchkeep-auto 4 ms (n=4) — small sample (n=4). |
| code | 100.0% (n=3); warm p50 4 ms (n=2) | 100.0% (n=3); warm p50 1048 ms (n=2) | 100.0% (n=3); warm p50 516 ms (n=2) | 100.0% (n=3); warm p50 4 ms (n=2) | 100.0% (n=3); warm p50 75 ms (n=2) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×3) | 100.0% (n=3); warm p50 3 ms (n=2) | usable: tie between fetchkeep-http 100.0% (n=3), fetchkeep-chromium 100.0% (n=3), fetchkeep-lightpanda 100.0% (n=3), fetchkeep-auto 100.0% (n=3), firecrawl-selfhost 100.0% (n=3), donsetch 100.0% (n=3) — small sample (n=3). warm p50: donsetch 3 ms (n=2) vs next-best fetchkeep-http 4 ms (n=2) — small sample (n=2). |
| docs | 100.0% (n=6); warm p50 5 ms (n=4) | 100.0% (n=6); warm p50 1050 ms (n=4) | 100.0% (n=6); warm p50 518 ms (n=4) | 100.0% (n=6); warm p50 5 ms (n=4) | 100.0% (n=6); warm p50 73 ms (n=4) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×6) | 100.0% (n=6); warm p50 3 ms (n=4) | usable: tie between fetchkeep-http 100.0% (n=6), fetchkeep-chromium 100.0% (n=6), fetchkeep-lightpanda 100.0% (n=6), fetchkeep-auto 100.0% (n=6), firecrawl-selfhost 100.0% (n=6), donsetch 100.0% (n=6) — small sample (n=6). warm p50: donsetch 3 ms (n=4) vs next-best fetchkeep-http 5 ms (n=4) — small sample (n=4). |
| encoding | 100.0% (n=3); warm p50 3 ms (n=2) | 100.0% (n=3); warm p50 1045 ms (n=2) | 100.0% (n=3); warm p50 520 ms (n=2) | 100.0% (n=3); warm p50 3 ms (n=2) | 100.0% (n=3); warm p50 62 ms (n=2) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×3) | 100.0% (n=3); warm p50 2 ms (n=2) | usable: tie between fetchkeep-http 100.0% (n=3), fetchkeep-chromium 100.0% (n=3), fetchkeep-lightpanda 100.0% (n=3), fetchkeep-auto 100.0% (n=3), firecrawl-selfhost 100.0% (n=3), donsetch 100.0% (n=3) — small sample (n=3). warm p50: donsetch 2 ms (n=2) vs next-best fetchkeep-http 3 ms (n=2) — small sample (n=2). |
| failure | n/a (n=0); warm p50 n/a (n=0) | n/a (n=0); warm p50 n/a (n=0) | n/a (n=0); warm p50 n/a (n=0) | n/a (n=0); warm p50 n/a (n=0) | n/a (n=0); warm p50 n/a (n=0) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×9) | n/a (n=0); warm p50 n/a (n=0) | no comparable data |
| js | 33.3% (n=9); warm p50 3 ms (n=6) | 100.0% (n=9); warm p50 1051 ms (n=6) | 100.0% (n=9); warm p50 518 ms (n=6) | 100.0% (n=9); warm p50 1052 ms (n=6) | 66.7% (n=9); warm p50 66 ms (n=4) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×9) | 100.0% (n=9); warm p50 3 ms (n=6) | usable: tie between fetchkeep-chromium 100.0% (n=9), fetchkeep-lightpanda 100.0% (n=9), fetchkeep-auto 100.0% (n=9), donsetch 100.0% (n=9) — small sample (n=9). warm p50: donsetch 3 ms (n=6) vs next-best fetchkeep-http 3 ms (n=6) — small sample (n=4). |
| latency | 100.0% (n=3); warm p50 2502 ms (n=2) | 100.0% (n=3); warm p50 3552 ms (n=2) | 100.0% (n=3); warm p50 3021 ms (n=2) | 100.0% (n=3); warm p50 2503 ms (n=2) | 100.0% (n=3); warm p50 2559 ms (n=2) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×3) | 100.0% (n=3); warm p50 2503 ms (n=2) | usable: tie between fetchkeep-http 100.0% (n=3), fetchkeep-chromium 100.0% (n=3), fetchkeep-lightpanda 100.0% (n=3), fetchkeep-auto 100.0% (n=3), firecrawl-selfhost 100.0% (n=3), donsetch 100.0% (n=3) — small sample (n=3). warm p50: fetchkeep-http 2502 ms (n=2) vs next-best fetchkeep-auto 2503 ms (n=2) — within 10% of the runner-up, not a meaningful difference; small sample (n=2). |
| nav-heavy | 100.0% (n=3); warm p50 10 ms (n=2) | 100.0% (n=3); warm p50 1064 ms (n=2) | 100.0% (n=3); warm p50 524 ms (n=2) | 100.0% (n=3); warm p50 12 ms (n=2) | 100.0% (n=3); warm p50 74 ms (n=2) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×3) | 100.0% (n=3); warm p50 3 ms (n=2) | usable: tie between fetchkeep-http 100.0% (n=3), fetchkeep-chromium 100.0% (n=3), fetchkeep-lightpanda 100.0% (n=3), fetchkeep-auto 100.0% (n=3), firecrawl-selfhost 100.0% (n=3), donsetch 100.0% (n=3) — small sample (n=3). warm p50: donsetch 3 ms (n=2) vs next-best fetchkeep-http 10 ms (n=2) — small sample (n=2). |
| pdf | 100.0% (n=6); warm p50 5 ms (n=4) | 100.0% (n=6); warm p50 42 ms (n=4) | 100.0% (n=6); warm p50 522 ms (n=4) | 100.0% (n=6); warm p50 5 ms (n=4) | 100.0% (n=6); warm p50 15 ms (n=4) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×6) | 100.0% (n=6); warm p50 25 ms (n=4) | usable: tie between fetchkeep-http 100.0% (n=6), fetchkeep-chromium 100.0% (n=6), fetchkeep-lightpanda 100.0% (n=6), fetchkeep-auto 100.0% (n=6), firecrawl-selfhost 100.0% (n=6), donsetch 100.0% (n=6) — small sample (n=6). warm p50: fetchkeep-http 5 ms (n=4) vs next-best fetchkeep-auto 5 ms (n=4) — small sample (n=4). |
| plain | 100.0% (n=3); warm p50 2 ms (n=2) | 100.0% (n=3); warm p50 1049 ms (n=2) | 100.0% (n=3); warm p50 520 ms (n=2) | 100.0% (n=3); warm p50 2 ms (n=2) | 100.0% (n=3); warm p50 62 ms (n=2) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×3) | 100.0% (n=3); warm p50 2 ms (n=2) | usable: tie between fetchkeep-http 100.0% (n=3), fetchkeep-chromium 100.0% (n=3), fetchkeep-lightpanda 100.0% (n=3), fetchkeep-auto 100.0% (n=3), firecrawl-selfhost 100.0% (n=3), donsetch 100.0% (n=3) — small sample (n=3). warm p50: fetchkeep-http 2 ms (n=2) vs next-best donsetch 2 ms (n=2) — within 10% of the runner-up, not a meaningful difference; small sample (n=2). |
| redirect | 100.0% (n=3); warm p50 6 ms (n=2) | 100.0% (n=3); warm p50 1054 ms (n=2) | 100.0% (n=3); warm p50 519 ms (n=2) | 100.0% (n=3); warm p50 6 ms (n=2) | 100.0% (n=3); warm p50 78 ms (n=2) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×3) | 100.0% (n=3); warm p50 3 ms (n=2) | usable: tie between fetchkeep-http 100.0% (n=3), fetchkeep-chromium 100.0% (n=3), fetchkeep-lightpanda 100.0% (n=3), fetchkeep-auto 100.0% (n=3), firecrawl-selfhost 100.0% (n=3), donsetch 100.0% (n=3) — small sample (n=3). warm p50: donsetch 3 ms (n=2) vs next-best fetchkeep-http 6 ms (n=2) — small sample (n=2). |
| table | 100.0% (n=6); warm p50 6 ms (n=4) | 100.0% (n=6); warm p50 1050 ms (n=4) | 100.0% (n=6); warm p50 519 ms (n=4) | 100.0% (n=6); warm p50 5 ms (n=4) | 100.0% (n=6); warm p50 73 ms (n=4) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×6) | 100.0% (n=6); warm p50 3 ms (n=4) | usable: tie between fetchkeep-http 100.0% (n=6), fetchkeep-chromium 100.0% (n=6), fetchkeep-lightpanda 100.0% (n=6), fetchkeep-auto 100.0% (n=6), firecrawl-selfhost 100.0% (n=6), donsetch 100.0% (n=6) — small sample (n=6). warm p50: donsetch 3 ms (n=4) vs next-best fetchkeep-auto 5 ms (n=4) — small sample (n=4). |

### Trade-offs on live tasks (derived from this run only)

- Usable rate: tie between fetchkeep-chromium 95.8% (n=72), fetchkeep-auto 95.8% (n=72).
- Passage recall: tie between fetchkeep-chromium 0.958 (n=72), fetchkeep-auto 0.958 (n=72).
- Boilerplate exclusion: tie between fetchkeep-http 0.875 (n=48), fetchkeep-chromium 0.875 (n=48), fetchkeep-lightpanda 0.875 (n=48), fetchkeep-auto 0.875 (n=48).
- Warm p50 latency: donsetch 207 ms (n=46) vs next-best fetchkeep-http 363 ms (n=48).
- First-request p50 latency: fetchkeep-http 359 ms (n=24) vs next-best donsetch 387 ms (n=23) — within 10% of the runner-up, not a meaningful difference.

Per workload (category) on live: usable rate and warm p50 per profile. Leaders are named only with the margin and sample size; small n means the ranking can flip on a re-run.

| category | fetchkeep-http | fetchkeep-chromium | fetchkeep-lightpanda | fetchkeep-auto | firecrawl-selfhost | firecrawl-hosted | donsetch | leaders (usable rate; warm p50) |
|---|---|---|---|---|---|---|---|---|
| article | 100.0% (n=6); warm p50 430 ms (n=4) | 100.0% (n=6); warm p50 1831 ms (n=4) | 100.0% (n=6); warm p50 1318 ms (n=4) | 100.0% (n=6); warm p50 372 ms (n=4) | 100.0% (n=6); warm p50 791 ms (n=4) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×6) | 100.0% (n=6); warm p50 354 ms (n=4) | usable: tie between fetchkeep-http 100.0% (n=6), fetchkeep-chromium 100.0% (n=6), fetchkeep-lightpanda 100.0% (n=6), fetchkeep-auto 100.0% (n=6), firecrawl-selfhost 100.0% (n=6), donsetch 100.0% (n=6) — small sample (n=6). warm p50: donsetch 354 ms (n=4) vs next-best fetchkeep-auto 372 ms (n=4) — within 10% of the runner-up, not a meaningful difference; small sample (n=4). |
| code | 100.0% (n=3); warm p50 737 ms (n=2) | 100.0% (n=3); warm p50 2703 ms (n=2) | 100.0% (n=3); warm p50 1803 ms (n=2) | 100.0% (n=3); warm p50 256 ms (n=2) | 100.0% (n=3); warm p50 1737 ms (n=2) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×3) | 100.0% (n=3); warm p50 616 ms (n=2) | usable: tie between fetchkeep-http 100.0% (n=3), fetchkeep-chromium 100.0% (n=3), fetchkeep-lightpanda 100.0% (n=3), fetchkeep-auto 100.0% (n=3), firecrawl-selfhost 100.0% (n=3), donsetch 100.0% (n=3) — small sample (n=3). warm p50: fetchkeep-auto 256 ms (n=2) vs next-best donsetch 616 ms (n=2) — small sample (n=2). |
| docs | 100.0% (n=18); warm p50 239 ms (n=12) | 100.0% (n=18); warm p50 2069 ms (n=12) | 100.0% (n=18); warm p50 892 ms (n=12) | 100.0% (n=18); warm p50 254 ms (n=12) | 100.0% (n=18); warm p50 519 ms (n=12) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×18) | 100.0% (n=18); warm p50 45 ms (n=12) | usable: tie between fetchkeep-http 100.0% (n=18), fetchkeep-chromium 100.0% (n=18), fetchkeep-lightpanda 100.0% (n=18), fetchkeep-auto 100.0% (n=18), firecrawl-selfhost 100.0% (n=18), donsetch 100.0% (n=18). warm p50: donsetch 45 ms (n=12) vs next-best fetchkeep-http 239 ms (n=12). |
| forum | 100.0% (n=3); warm p50 1179 ms (n=2) | 100.0% (n=3); warm p50 2521 ms (n=2) | 100.0% (n=3); warm p50 1865 ms (n=2) | 100.0% (n=3); warm p50 1164 ms (n=2) | 100.0% (n=3); warm p50 1405 ms (n=2) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×3) | 100.0% (n=3); warm p50 945 ms (n=2) | usable: tie between fetchkeep-http 100.0% (n=3), fetchkeep-chromium 100.0% (n=3), fetchkeep-lightpanda 100.0% (n=3), fetchkeep-auto 100.0% (n=3), firecrawl-selfhost 100.0% (n=3), donsetch 100.0% (n=3) — small sample (n=3). warm p50: donsetch 945 ms (n=2) vs next-best fetchkeep-auto 1164 ms (n=2) — small sample (n=2). |
| js | 0.0% (n=9); warm p50 363 ms (n=6) | 66.7% (n=9); warm p50 1833 ms (n=6) | 55.6% (n=9); warm p50 1100 ms (n=6) | 66.7% (n=9); warm p50 2245 ms (n=6) | 33.3% (n=9); warm p50 907 ms (n=4) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×9) | 33.3% (n=9); warm p50 468 ms (n=4) | usable: tie between fetchkeep-chromium 66.7% (n=9), fetchkeep-auto 66.7% (n=9) — small sample (n=9). warm p50: fetchkeep-http 363 ms (n=6) vs next-best donsetch 468 ms (n=4) — small sample (n=4). |
| nav-heavy | 100.0% (n=6); warm p50 214 ms (n=4) | 100.0% (n=6); warm p50 1385 ms (n=4) | 100.0% (n=6); warm p50 799 ms (n=4) | 100.0% (n=6); warm p50 197 ms (n=4) | 100.0% (n=6); warm p50 399 ms (n=4) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×6) | 100.0% (n=6); warm p50 33 ms (n=4) | usable: tie between fetchkeep-http 100.0% (n=6), fetchkeep-chromium 100.0% (n=6), fetchkeep-lightpanda 100.0% (n=6), fetchkeep-auto 100.0% (n=6), firecrawl-selfhost 100.0% (n=6), donsetch 100.0% (n=6) — small sample (n=6). warm p50: donsetch 33 ms (n=4) vs next-best fetchkeep-auto 197 ms (n=4) — small sample (n=4). |
| news | 100.0% (n=3); warm p50 112 ms (n=2) | 100.0% (n=3); warm p50 1269 ms (n=2) | 100.0% (n=3); warm p50 645 ms (n=2) | 100.0% (n=3); warm p50 108 ms (n=2) | 100.0% (n=3); warm p50 666 ms (n=2) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×3) | 100.0% (n=3); warm p50 24 ms (n=2) | usable: tie between fetchkeep-http 100.0% (n=3), fetchkeep-chromium 100.0% (n=3), fetchkeep-lightpanda 100.0% (n=3), fetchkeep-auto 100.0% (n=3), firecrawl-selfhost 100.0% (n=3), donsetch 100.0% (n=3) — small sample (n=3). warm p50: donsetch 24 ms (n=2) vs next-best fetchkeep-auto 108 ms (n=2) — small sample (n=2). |
| pdf | 100.0% (n=6); warm p50 480 ms (n=4) | 100.0% (n=6); warm p50 839 ms (n=4) | 100.0% (n=6); warm p50 1262 ms (n=4) | 100.0% (n=6); warm p50 400 ms (n=4) | 100.0% (n=6); warm p50 349 ms (n=4) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×6) | 100.0% (n=6); warm p50 258 ms (n=4) | usable: tie between fetchkeep-http 100.0% (n=6), fetchkeep-chromium 100.0% (n=6), fetchkeep-lightpanda 100.0% (n=6), fetchkeep-auto 100.0% (n=6), firecrawl-selfhost 100.0% (n=6), donsetch 100.0% (n=6) — small sample (n=6). warm p50: donsetch 258 ms (n=4) vs next-best firecrawl-selfhost 349 ms (n=4) — small sample (n=4). |
| plain | 100.0% (n=6); warm p50 131 ms (n=4) | 100.0% (n=6); warm p50 1251 ms (n=4) | 100.0% (n=6); warm p50 689 ms (n=4) | 100.0% (n=6); warm p50 116 ms (n=4) | 100.0% (n=6); warm p50 245 ms (n=4) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×6) | 100.0% (n=6); warm p50 38 ms (n=4) | usable: tie between fetchkeep-http 100.0% (n=6), fetchkeep-chromium 100.0% (n=6), fetchkeep-lightpanda 100.0% (n=6), fetchkeep-auto 100.0% (n=6), firecrawl-selfhost 100.0% (n=6), donsetch 100.0% (n=6) — small sample (n=6). warm p50: donsetch 38 ms (n=4) vs next-best fetchkeep-auto 116 ms (n=4) — small sample (n=4). |
| reference | 100.0% (n=3); warm p50 543 ms (n=2) | 100.0% (n=3); warm p50 1755 ms (n=2) | 100.0% (n=3); warm p50 1048 ms (n=2) | 100.0% (n=3); warm p50 533 ms (n=2) | 100.0% (n=3); warm p50 782 ms (n=2) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×3) | 100.0% (n=3); warm p50 170 ms (n=2) | usable: tie between fetchkeep-http 100.0% (n=3), fetchkeep-chromium 100.0% (n=3), fetchkeep-lightpanda 100.0% (n=3), fetchkeep-auto 100.0% (n=3), firecrawl-selfhost 100.0% (n=3), donsetch 100.0% (n=3) — small sample (n=3). warm p50: donsetch 170 ms (n=2) vs next-best fetchkeep-auto 533 ms (n=2) — small sample (n=2). |
| table | 100.0% (n=9); warm p50 511 ms (n=6) | 100.0% (n=9); warm p50 2048 ms (n=6) | 100.0% (n=9); warm p50 1281 ms (n=6) | 100.0% (n=9); warm p50 541 ms (n=6) | 100.0% (n=9); warm p50 1859 ms (n=6) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×9) | 100.0% (n=9); warm p50 72 ms (n=6) | usable: tie between fetchkeep-http 100.0% (n=9), fetchkeep-chromium 100.0% (n=9), fetchkeep-lightpanda 100.0% (n=9), fetchkeep-auto 100.0% (n=9), firecrawl-selfhost 100.0% (n=9), donsetch 100.0% (n=9) — small sample (n=9). warm p50: donsetch 72 ms (n=6) vs next-best fetchkeep-http 511 ms (n=6) — small sample (n=6). |

## Reproduce

Re-run with:

```
npm run bench -- --engines fetchkeep-http,fetchkeep-chromium,fetchkeep-lightpanda,fetchkeep-auto,firecrawl-selfhost,firecrawl-hosted,donsetch --suite fetch --repetitions 3 --seed 42 --timeout 30000 --cold-start --footprint
```

| dataset | path | sha256 | cases |
|---|---|---|---|
| fixtures | bench/datasets/fixtures.json | 8c7b0a6f99ea2f1fd5551747be2df264f7fbfacc03973227cc484e740f576749 | 21 |
| live | bench/datasets/live.json | d458c8afc2696bd34699711b710ebee36bfbaf2f9557ae1893b31090ae6f7474 | 24 |
| live-crawl | bench/datasets/live-crawl.json | 166f4d2d133883c97d2b24c57650f1f9edd4e72d02611cda8b2e98d5a164ec75 | 1 |
| fixture-files | bench/fixtures/SHA256SUMS | 9d450f2677512812812f7a05020e5e75cd8cd2588895585786a35fb74679de52 | 0 |

Per-case outputs: see `cases.csv` and the per-case inspection section of `report.html`; raw engine output is under `raw/`.
