# Fetchkeep benchmark report — full — 2026-09-30T19-27-41-full

## Summary of what was run

- Suite: full; run id: 2026-09-30T19-27-41-full
- Started 2026-09-30T19:27:41.717Z, finished 2026-09-30T20:06:04.736Z
- Seed: 42; repetitions per case: 7; per-task timeout: 30000 ms; concurrency: 1
- Tokenizer: gpt-tokenizer (o200k_base, version 4.0.0)
- Fetch tasks: 2156 over 44 cases; crawl tasks: 98
- Profiles: fetchkeep-http, fetchkeep-chromium, fetchkeep-lightpanda, fetchkeep-auto, firecrawl-selfhost, firecrawl-hosted, donsetch
- Fixture server: http://172.31.172.243:40121 (bound to 0.0.0.0)
- Command: `node bench/run.ts --engines fetchkeep,firecrawl,donsetch --suite full --repetitions 7 --cold-start --footprint --out bench/runs/2026-09-30-improvements`
- Note: Tasks run sequentially (concurrency 1) in a seeded random order per repetition; all engines see the same URLs and per-request deadline.
- Note: Repetition 1 is the first pass over each case, not a cold process per case; repetitions ≥2 form the warm cohort. MCP sessions persist across all operations.
- Note: Live websites change: live results are only comparable within one run.
- Note: Legacy heldOut flags identify previously inspected regression cases. Fresh val-* validation is selected only by an explicit suite pattern and must not be used for tuning.

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
| fetchkeepCommit | 35c170126b455eaeb032b6e8d20b9fb83cc3eb75 |
| fetchkeepDirty | true |

## Engines

| profile | engine | version | revision | transport | available | reason | ready |
|---|---|---|---|---|---|---|---|
| fetchkeep-http | fetchkeep | 0.1.2 | 35c170126b455eaeb032b6e8d20b9fb83cc3eb75 | MCP stdio (web_fetch / web_crawl / web_read), warm server per profile | yes |  | 372 ms |
| fetchkeep-chromium | fetchkeep | 0.1.2 | 35c170126b455eaeb032b6e8d20b9fb83cc3eb75 | MCP stdio (web_fetch / web_crawl / web_read), warm server per profile | yes |  | 359 ms |
| fetchkeep-lightpanda | fetchkeep | 0.1.2 | 35c170126b455eaeb032b6e8d20b9fb83cc3eb75 | MCP stdio (web_fetch / web_crawl / web_read), warm server per profile | yes |  | 371 ms |
| fetchkeep-auto | fetchkeep | 0.1.2 | 35c170126b455eaeb032b6e8d20b9fb83cc3eb75 | MCP stdio (web_fetch / web_crawl / web_read), warm server per profile | yes |  | 425 ms |
| firecrawl-selfhost | firecrawl | apps/api 1.0.0 (self-hosted build) | 7e4a959dca0efbdad2f0a9d82b0fce20afeb9a4d | REST API v2 (http://localhost:3002) | yes |  | 0 ms |
| firecrawl-hosted | firecrawl | hosted API v2 | hosted service (version not exposed) | REST API v2 (https://api.firecrawl.dev) | no | FIRECRAWL_API_KEY is not set | n/a |
| donsetch | donsetch | 4.4.1 | v4.4.1 release binary (npm donsetch@4.4.1) | MCP stdio (web_fetch / web_crawl), warm server | yes |  | 81 ms |

### Setting differences

- fetchkeep-http: network: only the fixture server address (172.31.172.243/32) is allowed besides public addresses (FETCHKEEP_ALLOW_CIDRS)
- fetchkeep-http: documents are saved to a per-profile store (Fetchkeep default behaviour); no HTTP cache
- fetchkeep-chromium: network: only the fixture server address (172.31.172.243/32) is allowed besides public addresses (FETCHKEEP_ALLOW_CIDRS)
- fetchkeep-chromium: documents are saved to a per-profile store (Fetchkeep default behaviour); no HTTP cache
- fetchkeep-chromium: browser: Playwright Chromium headless shell (installed version recorded by the environment); default bounded readiness policy
- fetchkeep-lightpanda: network: only the fixture server address (172.31.172.243/32) is allowed besides public addresses (FETCHKEEP_ALLOW_CIDRS)
- fetchkeep-lightpanda: documents are saved to a per-profile store (Fetchkeep default behaviour); no HTTP cache
- fetchkeep-lightpanda: browser: Lightpanda (see engine config), spawned by Fetchkeep with telemetry disabled; default bounded readiness policy
- fetchkeep-auto: network: only the fixture server address (172.31.172.243/32) is allowed besides public addresses (FETCHKEEP_ALLOW_CIDRS)
- fetchkeep-auto: documents are saved to a per-profile store (Fetchkeep default behaviour); no HTTP cache
- fetchkeep-auto: browser: Playwright Chromium headless shell (installed version recorded by the environment); default bounded readiness policy
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
| fetchkeep-http | 140 | 119 / 21 / 0 / 0 | 85.0% (n=140) | 88.2% (n=119) | 0.882 (n=119) | 0.950 (n=70) | 0.973 (n=63) | 13 ms (n=17) | 6 ms (n=102) | 2502 ms (n=102) | 100.0% (n=21) | n/a |
| fetchkeep-chromium | 140 | 119 / 21 / 0 / 0 | 85.0% (n=140) | 100.0% (n=119) | 1.000 (n=119) | 0.950 (n=70) | 0.965 (n=63) | 609 ms (n=17) | 583 ms (n=102) | 3064 ms (n=102) | 100.0% (n=21) | n/a |
| fetchkeep-lightpanda | 140 | 119 / 21 / 0 / 0 | 85.0% (n=140) | 100.0% (n=119) | 1.000 (n=119) | 0.950 (n=70) | 0.965 (n=63) | 539 ms (n=17) | 531 ms (n=102) | 3020 ms (n=102) | 100.0% (n=21) | n/a |
| fetchkeep-auto | 140 | 119 / 21 / 0 / 0 | 85.0% (n=140) | 100.0% (n=119) | 1.000 (n=119) | 0.950 (n=70) | 0.973 (n=63) | 13 ms (n=17) | 6 ms (n=102) | 2503 ms (n=102) | 100.0% (n=21) | n/a |
| firecrawl-selfhost | 140 | 113 / 27 / 0 / 0 | 80.7% (n=140) | 95.0% (n=119) | 1.000 (n=113) | 0.836 (n=64) | 0.948 (n=63) | 108 ms (n=16) | 89 ms (n=97) | 2580 ms (n=97) | 100.0% (n=21) | n/a |
| donsetch | 140 | 119 / 21 / 0 / 0 | 85.0% (n=140) | 100.0% (n=119) | 1.000 (n=119) | 0.900 (n=70) | 0.822 (n=63) | 4 ms (n=17) | 4 ms (n=102) | 4234 ms (n=102) | 100.0% (n=21) | n/a |

All fixture tasks per profile (includes cases only some profiles could run):

| profile | tasks | ok / error / unavail. / N/A | success | usable | passage recall | boilerplate excl. | token F1 | first p50 | warm p50 | warm p95 | correct error | cost |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| fetchkeep-http | 140 | 119 / 21 / 0 / 0 | 85.0% (n=140) | 88.2% (n=119) | 0.882 (n=119) | 0.950 (n=70) | 0.973 (n=63) | 13 ms (n=17) | 6 ms (n=102) | 2502 ms (n=102) | 100.0% (n=21) | n/a |
| fetchkeep-chromium | 140 | 119 / 21 / 0 / 0 | 85.0% (n=140) | 100.0% (n=119) | 1.000 (n=119) | 0.950 (n=70) | 0.965 (n=63) | 609 ms (n=17) | 583 ms (n=102) | 3064 ms (n=102) | 100.0% (n=21) | n/a |
| fetchkeep-lightpanda | 140 | 119 / 21 / 0 / 0 | 85.0% (n=140) | 100.0% (n=119) | 1.000 (n=119) | 0.950 (n=70) | 0.965 (n=63) | 539 ms (n=17) | 531 ms (n=102) | 3020 ms (n=102) | 100.0% (n=21) | n/a |
| fetchkeep-auto | 140 | 119 / 21 / 0 / 0 | 85.0% (n=140) | 100.0% (n=119) | 1.000 (n=119) | 0.950 (n=70) | 0.973 (n=63) | 13 ms (n=17) | 6 ms (n=102) | 2503 ms (n=102) | 100.0% (n=21) | n/a |
| firecrawl-selfhost | 140 | 113 / 27 / 0 / 0 | 80.7% (n=140) | 95.0% (n=119) | 1.000 (n=113) | 0.836 (n=64) | 0.948 (n=63) | 108 ms (n=16) | 89 ms (n=97) | 2580 ms (n=97) | 100.0% (n=21) | n/a |
| firecrawl-hosted | 140 | 0 / 0 / 140 / 0 | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a |
| donsetch | 140 | 119 / 21 / 0 / 0 | 85.0% (n=140) | 100.0% (n=119) | 1.000 (n=119) | 0.900 (n=70) | 0.822 (n=63) | 4 ms (n=17) | 4 ms (n=102) | 4234 ms (n=102) | 100.0% (n=21) | n/a |

### Live websites

Common tasks: 24 of 24 live cases were attempted by every profile that ran any live task (fetchkeep-http, fetchkeep-chromium, fetchkeep-lightpanda, fetchkeep-auto, firecrawl-selfhost, donsetch). This is the like-for-like comparison.

| profile | tasks | ok / error / unavail. / N/A | success | usable | passage recall | boilerplate excl. | token F1 | first p50 | warm p50 | warm p95 | correct error | cost |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| fetchkeep-http | 168 | 168 / 0 / 0 / 0 | 100.0% (n=168) | 87.5% (n=168) | 0.875 (n=168) | 0.875 (n=112) | n/a (n=0) | 438 ms (n=24) | 372 ms (n=144) | 1277 ms (n=144) | n/a (n=0) | n/a |
| fetchkeep-chromium | 168 | 168 / 0 / 0 / 0 | 100.0% (n=168) | 95.8% (n=168) | 0.958 (n=168) | 0.875 (n=112) | n/a (n=0) | 1422 ms (n=24) | 1334 ms (n=144) | 2864 ms (n=144) | n/a (n=0) | n/a |
| fetchkeep-lightpanda | 168 | 168 / 0 / 0 / 0 | 100.0% (n=168) | 95.8% (n=168) | 0.958 (n=168) | 0.875 (n=112) | n/a (n=0) | 1187 ms (n=24) | 1214 ms (n=144) | 3021 ms (n=144) | n/a (n=0) | n/a |
| fetchkeep-auto | 168 | 168 / 0 / 0 / 0 | 100.0% (n=168) | 95.8% (n=168) | 0.958 (n=168) | 0.875 (n=112) | n/a (n=0) | 446 ms (n=24) | 426 ms (n=144) | 1963 ms (n=144) | n/a (n=0) | n/a |
| firecrawl-selfhost | 168 | 161 / 7 / 0 / 0 | 95.8% (n=168) | 91.7% (n=168) | 0.957 (n=161) | 0.677 (n=112) | n/a (n=0) | 946 ms (n=23) | 845 ms (n=138) | 7820 ms (n=138) | n/a (n=0) | n/a |
| donsetch | 168 | 161 / 7 / 0 / 0 | 95.8% (n=168) | 91.7% (n=168) | 0.957 (n=161) | 0.800 (n=105) | n/a (n=0) | 414 ms (n=23) | 318 ms (n=138) | 952 ms (n=138) | n/a (n=0) | n/a |

All live tasks per profile (includes cases only some profiles could run):

| profile | tasks | ok / error / unavail. / N/A | success | usable | passage recall | boilerplate excl. | token F1 | first p50 | warm p50 | warm p95 | correct error | cost |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| fetchkeep-http | 168 | 168 / 0 / 0 / 0 | 100.0% (n=168) | 87.5% (n=168) | 0.875 (n=168) | 0.875 (n=112) | n/a (n=0) | 438 ms (n=24) | 372 ms (n=144) | 1277 ms (n=144) | n/a (n=0) | n/a |
| fetchkeep-chromium | 168 | 168 / 0 / 0 / 0 | 100.0% (n=168) | 95.8% (n=168) | 0.958 (n=168) | 0.875 (n=112) | n/a (n=0) | 1422 ms (n=24) | 1334 ms (n=144) | 2864 ms (n=144) | n/a (n=0) | n/a |
| fetchkeep-lightpanda | 168 | 168 / 0 / 0 / 0 | 100.0% (n=168) | 95.8% (n=168) | 0.958 (n=168) | 0.875 (n=112) | n/a (n=0) | 1187 ms (n=24) | 1214 ms (n=144) | 3021 ms (n=144) | n/a (n=0) | n/a |
| fetchkeep-auto | 168 | 168 / 0 / 0 / 0 | 100.0% (n=168) | 95.8% (n=168) | 0.958 (n=168) | 0.875 (n=112) | n/a (n=0) | 446 ms (n=24) | 426 ms (n=144) | 1963 ms (n=144) | n/a (n=0) | n/a |
| firecrawl-selfhost | 168 | 161 / 7 / 0 / 0 | 95.8% (n=168) | 91.7% (n=168) | 0.957 (n=161) | 0.677 (n=112) | n/a (n=0) | 946 ms (n=23) | 845 ms (n=138) | 7820 ms (n=138) | n/a (n=0) | n/a |
| firecrawl-hosted | 168 | 0 / 0 / 168 / 0 | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a |
| donsetch | 168 | 161 / 7 / 0 / 0 | 95.8% (n=168) | 91.7% (n=168) | 0.957 (n=161) | 0.800 (n=105) | n/a (n=0) | 414 ms (n=23) | 318 ms (n=138) | 952 ms (n=138) | n/a (n=0) | n/a |

### Regression and fresh validation subsets

Legacy heldOut flags are retained for historical grouping, but those cases have been inspected and are now exposed regression cases, not unseen evidence. Only separately selected val-* cases belong to the fresh validation cohort; benchmark provenance, not a flag alone, establishes whether a run was untuned.

fixture — legacy held-out (exposed regression):

| profile | tasks | ok / error / unavail. / N/A | success | usable | passage recall | boilerplate excl. | token F1 | first p50 | warm p50 | warm p95 | correct error | cost |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| fetchkeep-http | 42 | 42 / 0 / 0 / 0 | 100.0% (n=42) | 83.3% (n=42) | 0.833 (n=42) | 1.000 (n=21) | 0.982 (n=21) | 8 ms (n=6) | 5 ms (n=36) | 15 ms (n=36) | n/a (n=0) | n/a |
| fetchkeep-chromium | 42 | 42 / 0 / 0 / 0 | 100.0% (n=42) | 100.0% (n=42) | 1.000 (n=42) | 1.000 (n=21) | 0.982 (n=21) | 615 ms (n=6) | 579 ms (n=36) | 668 ms (n=36) | n/a (n=0) | n/a |
| fetchkeep-lightpanda | 42 | 42 / 0 / 0 / 0 | 100.0% (n=42) | 100.0% (n=42) | 1.000 (n=42) | 1.000 (n=21) | 0.982 (n=21) | 539 ms (n=6) | 528 ms (n=36) | 2026 ms (n=36) | n/a (n=0) | n/a |
| fetchkeep-auto | 42 | 42 / 0 / 0 / 0 | 100.0% (n=42) | 100.0% (n=42) | 1.000 (n=42) | 1.000 (n=21) | 0.982 (n=21) | 11 ms (n=6) | 6 ms (n=36) | 656 ms (n=36) | n/a (n=0) | n/a |
| firecrawl-selfhost | 42 | 42 / 0 / 0 / 0 | 100.0% (n=42) | 100.0% (n=42) | 1.000 (n=42) | 0.867 (n=21) | 0.955 (n=21) | 92 ms (n=6) | 89 ms (n=36) | 153 ms (n=36) | n/a (n=0) | n/a |
| firecrawl-hosted | 42 | 0 / 0 / 42 / 0 | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a |
| donsetch | 42 | 42 / 0 / 0 / 0 | 100.0% (n=42) | 100.0% (n=42) | 1.000 (n=42) | 1.000 (n=21) | 0.904 (n=21) | 3 ms (n=6) | 4 ms (n=36) | 4234 ms (n=36) | n/a (n=0) | n/a |

fixture — development regression (excluding validation):

| profile | tasks | ok / error / unavail. / N/A | success | usable | passage recall | boilerplate excl. | token F1 | first p50 | warm p50 | warm p95 | correct error | cost |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| fetchkeep-http | 98 | 77 / 21 / 0 / 0 | 78.6% (n=98) | 90.9% (n=77) | 0.909 (n=77) | 0.929 (n=49) | 0.968 (n=42) | 15 ms (n=11) | 6 ms (n=66) | 2504 ms (n=66) | 100.0% (n=21) | n/a |
| fetchkeep-chromium | 98 | 77 / 21 / 0 / 0 | 78.6% (n=98) | 100.0% (n=77) | 1.000 (n=77) | 0.929 (n=49) | 0.956 (n=42) | 604 ms (n=11) | 584 ms (n=66) | 3071 ms (n=66) | 100.0% (n=21) | n/a |
| fetchkeep-lightpanda | 98 | 77 / 21 / 0 / 0 | 78.6% (n=98) | 100.0% (n=77) | 1.000 (n=77) | 0.929 (n=49) | 0.956 (n=42) | 536 ms (n=11) | 533 ms (n=66) | 3022 ms (n=66) | 100.0% (n=21) | n/a |
| fetchkeep-auto | 98 | 77 / 21 / 0 / 0 | 78.6% (n=98) | 100.0% (n=77) | 1.000 (n=77) | 0.929 (n=49) | 0.968 (n=42) | 13 ms (n=11) | 6 ms (n=66) | 2504 ms (n=66) | 100.0% (n=21) | n/a |
| firecrawl-selfhost | 98 | 71 / 27 / 0 / 0 | 72.4% (n=98) | 92.2% (n=77) | 1.000 (n=71) | 0.821 (n=43) | 0.944 (n=42) | 114 ms (n=10) | 89 ms (n=61) | 2588 ms (n=61) | 100.0% (n=21) | n/a |
| firecrawl-hosted | 98 | 0 / 0 / 98 / 0 | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a |
| donsetch | 98 | 77 / 21 / 0 / 0 | 78.6% (n=98) | 100.0% (n=77) | 1.000 (n=77) | 0.857 (n=49) | 0.781 (n=42) | 4 ms (n=11) | 4 ms (n=66) | 4239 ms (n=66) | 100.0% (n=21) | n/a |

live — legacy held-out (exposed regression):

| profile | tasks | ok / error / unavail. / N/A | success | usable | passage recall | boilerplate excl. | token F1 | first p50 | warm p50 | warm p95 | correct error | cost |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| fetchkeep-http | 42 | 42 / 0 / 0 / 0 | 100.0% (n=42) | 83.3% (n=42) | 0.833 (n=42) | 1.000 (n=28) | n/a (n=0) | 294 ms (n=6) | 347 ms (n=36) | 1298 ms (n=36) | n/a (n=0) | n/a |
| fetchkeep-chromium | 42 | 42 / 0 / 0 / 0 | 100.0% (n=42) | 83.3% (n=42) | 0.833 (n=42) | 1.000 (n=28) | n/a (n=0) | 1149 ms (n=6) | 1078 ms (n=36) | 2284 ms (n=36) | n/a (n=0) | n/a |
| fetchkeep-lightpanda | 42 | 42 / 0 / 0 / 0 | 100.0% (n=42) | 83.3% (n=42) | 0.833 (n=42) | 1.000 (n=28) | n/a (n=0) | 942 ms (n=6) | 1019 ms (n=36) | 2691 ms (n=36) | n/a (n=0) | n/a |
| fetchkeep-auto | 42 | 42 / 0 / 0 / 0 | 100.0% (n=42) | 83.3% (n=42) | 0.833 (n=42) | 1.000 (n=28) | n/a (n=0) | 324 ms (n=6) | 323 ms (n=36) | 1888 ms (n=36) | n/a (n=0) | n/a |
| firecrawl-selfhost | 42 | 42 / 0 / 0 / 0 | 100.0% (n=42) | 83.3% (n=42) | 0.833 (n=42) | 0.625 (n=28) | n/a (n=0) | 689 ms (n=6) | 633 ms (n=36) | 1646 ms (n=36) | n/a (n=0) | n/a |
| firecrawl-hosted | 42 | 0 / 0 / 42 / 0 | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a |
| donsetch | 42 | 35 / 7 / 0 / 0 | 83.3% (n=42) | 83.3% (n=42) | 1.000 (n=35) | 0.667 (n=21) | n/a (n=0) | 412 ms (n=5) | 222 ms (n=30) | 720 ms (n=30) | n/a (n=0) | n/a |

live — development regression (excluding validation):

| profile | tasks | ok / error / unavail. / N/A | success | usable | passage recall | boilerplate excl. | token F1 | first p50 | warm p50 | warm p95 | correct error | cost |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| fetchkeep-http | 126 | 126 / 0 / 0 / 0 | 100.0% (n=126) | 88.9% (n=126) | 0.889 (n=126) | 0.833 (n=84) | n/a (n=0) | 526 ms (n=18) | 399 ms (n=108) | 1277 ms (n=108) | n/a (n=0) | n/a |
| fetchkeep-chromium | 126 | 126 / 0 / 0 / 0 | 100.0% (n=126) | 100.0% (n=126) | 1.000 (n=126) | 0.833 (n=84) | n/a (n=0) | 1482 ms (n=18) | 1449 ms (n=108) | 2864 ms (n=108) | n/a (n=0) | n/a |
| fetchkeep-lightpanda | 126 | 126 / 0 / 0 / 0 | 100.0% (n=126) | 100.0% (n=126) | 1.000 (n=126) | 0.833 (n=84) | n/a (n=0) | 1230 ms (n=18) | 1287 ms (n=108) | 3242 ms (n=108) | n/a (n=0) | n/a |
| fetchkeep-auto | 126 | 126 / 0 / 0 / 0 | 100.0% (n=126) | 100.0% (n=126) | 1.000 (n=126) | 0.833 (n=84) | n/a (n=0) | 446 ms (n=18) | 466 ms (n=108) | 2000 ms (n=108) | n/a (n=0) | n/a |
| firecrawl-selfhost | 126 | 119 / 7 / 0 / 0 | 94.4% (n=126) | 94.4% (n=126) | 1.000 (n=119) | 0.694 (n=84) | n/a (n=0) | 1070 ms (n=17) | 916 ms (n=102) | 7946 ms (n=102) | n/a (n=0) | n/a |
| firecrawl-hosted | 126 | 0 / 0 / 126 / 0 | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a |
| donsetch | 126 | 126 / 0 / 0 / 0 | 100.0% (n=126) | 94.4% (n=126) | 0.944 (n=126) | 0.833 (n=84) | n/a (n=0) | 414 ms (n=18) | 343 ms (n=108) | 952 ms (n=108) | n/a (n=0) | n/a |

## Uncertainty

95% percentile case-cluster bootstrap intervals use 2000 deterministic resamples (seed 424242). Each resampled case carries all its repetitions; attempts are not independent cases. Point estimates retain the original attempt-weighted metric. Intervals describe this case corpus, not all websites. Fewer than two eligible cases gives CI n/a; a degenerate interval is not proof of certainty. Warm means repetition ≥2. All split/metric estimates are exported in uncertainty.csv and evidence.json.

| profile | dataset | metric | estimate and interval |
|---|---|---|---|
| fetchkeep-http | fixture | usable | 0.882 [95% CI 0.706–1] (17 cases, 119 attempts) |
| fetchkeep-http | fixture | success | 0.85 [95% CI 0.7–1] (20 cases, 140 attempts) |
| fetchkeep-http | fixture | warmP50 | 5.9 ms [95% CI 4.7–7.7 ms] (17 cases, 102 attempts) |
| fetchkeep-http | fixture | warmP95 | 2502.3 ms [95% CI 12.5–2505.1 ms] (17 cases, 102 attempts) |
| fetchkeep-http | fixture | passageRecall | 0.882 [95% CI 0.706–1] (17 cases, 119 attempts) |
| fetchkeep-http | fixture | tokenF1 | 0.973 [95% CI 0.941–0.992] (9 cases, 63 attempts) |
| fetchkeep-chromium | fixture | usable | 1 [95% CI 1–1] (17 cases, 119 attempts) |
| fetchkeep-chromium | fixture | success | 0.85 [95% CI 0.7–1] (20 cases, 140 attempts) |
| fetchkeep-chromium | fixture | warmP50 | 583.2 ms [95% CI 575.6–591.8 ms] (17 cases, 102 attempts) |
| fetchkeep-chromium | fixture | warmP95 | 3064 ms [95% CI 619.4–3075.7 ms] (17 cases, 102 attempts) |
| fetchkeep-chromium | fixture | passageRecall | 1 [95% CI 1–1] (17 cases, 119 attempts) |
| fetchkeep-chromium | fixture | tokenF1 | 0.965 [95% CI 0.93–0.991] (9 cases, 63 attempts) |
| fetchkeep-lightpanda | fixture | usable | 1 [95% CI 1–1] (17 cases, 119 attempts) |
| fetchkeep-lightpanda | fixture | success | 0.85 [95% CI 0.7–1] (20 cases, 140 attempts) |
| fetchkeep-lightpanda | fixture | warmP50 | 531.4 ms [95% CI 527.9–536.7 ms] (17 cases, 102 attempts) |
| fetchkeep-lightpanda | fixture | warmP95 | 3019.9 ms [95% CI 543.7–3029 ms] (17 cases, 102 attempts) |
| fetchkeep-lightpanda | fixture | passageRecall | 1 [95% CI 1–1] (17 cases, 119 attempts) |
| fetchkeep-lightpanda | fixture | tokenF1 | 0.965 [95% CI 0.93–0.991] (9 cases, 63 attempts) |
| fetchkeep-auto | fixture | usable | 1 [95% CI 1–1] (17 cases, 119 attempts) |
| fetchkeep-auto | fixture | success | 0.85 [95% CI 0.7–1] (20 cases, 140 attempts) |
| fetchkeep-auto | fixture | warmP50 | 6.2 ms [95% CI 4.7–8.6 ms] (17 cases, 102 attempts) |
| fetchkeep-auto | fixture | warmP95 | 2502.6 ms [95% CI 16.8–2506.6 ms] (17 cases, 102 attempts) |
| fetchkeep-auto | fixture | passageRecall | 1 [95% CI 1–1] (17 cases, 119 attempts) |
| fetchkeep-auto | fixture | tokenF1 | 0.973 [95% CI 0.941–0.992] (9 cases, 63 attempts) |
| firecrawl-selfhost | fixture | usable | 0.95 [95% CI 0.849–1] (17 cases, 119 attempts) |
| firecrawl-selfhost | fixture | success | 0.807 [95% CI 0.621–0.957] (20 cases, 140 attempts) |
| firecrawl-selfhost | fixture | warmP50 | 89.4 ms [95% CI 78.1–96.9 ms] (17 cases, 97 attempts) |
| firecrawl-selfhost | fixture | warmP95 | 2580.1 ms [95% CI 133.4–2604.9 ms] (17 cases, 97 attempts) |
| firecrawl-selfhost | fixture | passageRecall | 1 [95% CI 1–1] (17 cases, 113 attempts) |
| firecrawl-selfhost | fixture | tokenF1 | 0.948 [95% CI 0.917–0.975] (9 cases, 63 attempts) |
| firecrawl-hosted | fixture | usable | n/a (0 cases, 0 attempts) |
| firecrawl-hosted | fixture | success | n/a (0 cases, 0 attempts) |
| firecrawl-hosted | fixture | warmP50 | n/a (0 cases, 0 attempts) |
| firecrawl-hosted | fixture | warmP95 | n/a (0 cases, 0 attempts) |
| firecrawl-hosted | fixture | passageRecall | n/a (0 cases, 0 attempts) |
| firecrawl-hosted | fixture | tokenF1 | n/a (0 cases, 0 attempts) |
| donsetch | fixture | usable | 1 [95% CI 1–1] (17 cases, 119 attempts) |
| donsetch | fixture | success | 0.85 [95% CI 0.7–1] (20 cases, 140 attempts) |
| donsetch | fixture | warmP50 | 3.5 ms [95% CI 3.3–5 ms] (17 cases, 102 attempts) |
| donsetch | fixture | warmP95 | 4234.4 ms [95% CI 25–4251.1 ms] (17 cases, 102 attempts) |
| donsetch | fixture | passageRecall | 1 [95% CI 1–1] (17 cases, 119 attempts) |
| donsetch | fixture | tokenF1 | 0.822 [95% CI 0.646–0.924] (9 cases, 63 attempts) |
| fetchkeep-http | live | usable | 0.875 [95% CI 0.708–1] (24 cases, 168 attempts) |
| fetchkeep-http | live | success | 1 [95% CI 1–1] (24 cases, 168 attempts) |
| fetchkeep-http | live | warmP50 | 371.5 ms [95% CI 262.9–504.4 ms] (24 cases, 144 attempts) |
| fetchkeep-http | live | warmP95 | 1276.6 ms [95% CI 719.4–1328.9 ms] (24 cases, 144 attempts) |
| fetchkeep-http | live | passageRecall | 0.875 [95% CI 0.708–1] (24 cases, 168 attempts) |
| fetchkeep-http | live | tokenF1 | n/a (0 cases, 0 attempts) |
| fetchkeep-chromium | live | usable | 0.958 [95% CI 0.875–1] (24 cases, 168 attempts) |
| fetchkeep-chromium | live | success | 1 [95% CI 1–1] (24 cases, 168 attempts) |
| fetchkeep-chromium | live | warmP50 | 1334.4 ms [95% CI 1141.8–1530.7 ms] (24 cases, 144 attempts) |
| fetchkeep-chromium | live | warmP95 | 2863.6 ms [95% CI 1899.7–3042.9 ms] (24 cases, 144 attempts) |
| fetchkeep-chromium | live | passageRecall | 0.958 [95% CI 0.875–1] (24 cases, 168 attempts) |
| fetchkeep-chromium | live | tokenF1 | n/a (0 cases, 0 attempts) |
| fetchkeep-lightpanda | live | usable | 0.958 [95% CI 0.875–1] (24 cases, 168 attempts) |
| fetchkeep-lightpanda | live | success | 1 [95% CI 1–1] (24 cases, 168 attempts) |
| fetchkeep-lightpanda | live | warmP50 | 1214.2 ms [95% CI 1054.5–1418.6 ms] (24 cases, 144 attempts) |
| fetchkeep-lightpanda | live | warmP95 | 3021.2 ms [95% CI 1885.1–3397.7 ms] (24 cases, 144 attempts) |
| fetchkeep-lightpanda | live | passageRecall | 0.958 [95% CI 0.875–1] (24 cases, 168 attempts) |
| fetchkeep-lightpanda | live | tokenF1 | n/a (0 cases, 0 attempts) |
| fetchkeep-auto | live | usable | 0.958 [95% CI 0.875–1] (24 cases, 168 attempts) |
| fetchkeep-auto | live | success | 1 [95% CI 1–1] (24 cases, 168 attempts) |
| fetchkeep-auto | live | warmP50 | 425.6 ms [95% CI 281.5–672.4 ms] (24 cases, 144 attempts) |
| fetchkeep-auto | live | warmP95 | 1962.6 ms [95% CI 1354–2179.6 ms] (24 cases, 144 attempts) |
| fetchkeep-auto | live | passageRecall | 0.958 [95% CI 0.875–1] (24 cases, 168 attempts) |
| fetchkeep-auto | live | tokenF1 | n/a (0 cases, 0 attempts) |
| firecrawl-selfhost | live | usable | 0.917 [95% CI 0.792–1] (24 cases, 168 attempts) |
| firecrawl-selfhost | live | success | 0.958 [95% CI 0.875–1] (24 cases, 168 attempts) |
| firecrawl-selfhost | live | warmP50 | 844.9 ms [95% CI 620.4–1076.7 ms] (23 cases, 138 attempts) |
| firecrawl-selfhost | live | warmP95 | 7820.3 ms [95% CI 1591.6–12139.9 ms] (23 cases, 138 attempts) |
| firecrawl-selfhost | live | passageRecall | 0.957 [95% CI 0.87–1] (23 cases, 161 attempts) |
| firecrawl-selfhost | live | tokenF1 | n/a (0 cases, 0 attempts) |
| firecrawl-hosted | live | usable | n/a (0 cases, 0 attempts) |
| firecrawl-hosted | live | success | n/a (0 cases, 0 attempts) |
| firecrawl-hosted | live | warmP50 | n/a (0 cases, 0 attempts) |
| firecrawl-hosted | live | warmP95 | n/a (0 cases, 0 attempts) |
| firecrawl-hosted | live | passageRecall | n/a (0 cases, 0 attempts) |
| firecrawl-hosted | live | tokenF1 | n/a (0 cases, 0 attempts) |
| donsetch | live | usable | 0.917 [95% CI 0.792–1] (24 cases, 168 attempts) |
| donsetch | live | success | 0.958 [95% CI 0.875–1] (24 cases, 168 attempts) |
| donsetch | live | warmP50 | 317.6 ms [95% CI 167.2–401.8 ms] (23 cases, 138 attempts) |
| donsetch | live | warmP95 | 951.8 ms [95% CI 688.7–4519.3 ms] (23 cases, 138 attempts) |
| donsetch | live | passageRecall | 0.957 [95% CI 0.87–1] (23 cases, 161 attempts) |
| donsetch | live | tokenF1 | n/a (0 cases, 0 attempts) |

## Paired latency

Each pair matches the same case AND repetition for exactly two profiles. Latency uses only common-success warm pairs; errored, unavailable and unmatched slots never become latency samples. This survivor cohort can hide failures, so the table alongside reports matched-attempt errors and usable rates, including failures. Paired quality uses non-expected-error slots with scores for both engines. A−B is the median per-pair latency difference; A/B is the median per-pair ratio, not a ratio of marginal medians. Negative differences or ratios below one favor A. The ratio excludes zero B latencies and has its own sample count. Profiles without a match report n/a.

| A | B | dataset | A matched warm p50 | B matched warm p50 | paired A−B | paired A/B |
|---|---|---|---|---|---|---|
| fetchkeep-http | fetchkeep-chromium | fixture | 5.9 ms [95% CI 4.7–7.7 ms] (17 cases, 102 attempts) | 583.2 ms [95% CI 575.6–591.8 ms] (17 cases, 102 attempts) | -574.7 ms [95% CI -581.1–-569.4 ms] (17 cases, 102 attempts) | 0.01 [95% CI 0.008–0.014] (17 cases, 102 attempts) |
| fetchkeep-http | fetchkeep-lightpanda | fixture | 5.9 ms [95% CI 4.7–7.7 ms] (17 cases, 102 attempts) | 531.4 ms [95% CI 527.9–536.7 ms] (17 cases, 102 attempts) | -524.4 ms [95% CI -527.4–-521.6 ms] (17 cases, 102 attempts) | 0.009 [95% CI 0.007–0.013] (17 cases, 102 attempts) |
| fetchkeep-http | fetchkeep-auto | fixture | 5.9 ms [95% CI 4.7–7.7 ms] (17 cases, 102 attempts) | 6.2 ms [95% CI 4.7–8.6 ms] (17 cases, 102 attempts) | -0.3 ms [95% CI -0.6–0.2 ms] (17 cases, 102 attempts) | 0.962 [95% CI 0.889–1.027] (17 cases, 102 attempts) |
| fetchkeep-http | firecrawl-selfhost | fixture | 6 ms [95% CI 4.9–7.7 ms] (17 cases, 97 attempts) | 89.4 ms [95% CI 78.1–96.9 ms] (17 cases, 97 attempts) | -82.5 ms [95% CI -85.7–-71.6 ms] (17 cases, 97 attempts) | 0.064 [95% CI 0.057–0.105] (17 cases, 97 attempts) |
| fetchkeep-http | firecrawl-hosted | fixture | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) |
| fetchkeep-http | donsetch | fixture | 5.9 ms [95% CI 4.7–7.7 ms] (17 cases, 102 attempts) | 3.5 ms [95% CI 3.3–5 ms] (17 cases, 102 attempts) | 1.1 ms [95% CI 0.1–2.1 ms] (17 cases, 102 attempts) | 1.314 [95% CI 1–1.563] (17 cases, 102 attempts) |
| fetchkeep-chromium | fetchkeep-lightpanda | fixture | 583.2 ms [95% CI 575.6–591.8 ms] (17 cases, 102 attempts) | 531.4 ms [95% CI 527.9–536.7 ms] (17 cases, 102 attempts) | 50.6 ms [95% CI 45.5–58.1 ms] (17 cases, 102 attempts) | 1.093 [95% CI 1.08–1.109] (17 cases, 102 attempts) |
| fetchkeep-chromium | fetchkeep-auto | fixture | 583.2 ms [95% CI 575.6–591.8 ms] (17 cases, 102 attempts) | 6.2 ms [95% CI 4.7–8.6 ms] (17 cases, 102 attempts) | 572.1 ms [95% CI 557.5–577.4 ms] (17 cases, 102 attempts) | 89.547 [95% CI 8.787–126.362] (17 cases, 102 attempts) |
| fetchkeep-chromium | firecrawl-selfhost | fixture | 584.1 ms [95% CI 575.7–596.8 ms] (17 cases, 97 attempts) | 89.4 ms [95% CI 78.1–96.9 ms] (17 cases, 97 attempts) | 494.5 ms [95% CI 481.4–497.9 ms] (17 cases, 97 attempts) | 6.065 [95% CI 5.032–6.58] (17 cases, 97 attempts) |
| fetchkeep-chromium | firecrawl-hosted | fixture | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) |
| fetchkeep-chromium | donsetch | fixture | 583.2 ms [95% CI 575.6–591.8 ms] (17 cases, 102 attempts) | 3.5 ms [95% CI 3.3–5 ms] (17 cases, 102 attempts) | 574.7 ms [95% CI 569.6–581.4 ms] (17 cases, 102 attempts) | 165.778 [95% CI 88.216–180.941] (17 cases, 102 attempts) |
| fetchkeep-lightpanda | fetchkeep-auto | fixture | 531.4 ms [95% CI 527.9–536.7 ms] (17 cases, 102 attempts) | 6.2 ms [95% CI 4.7–8.6 ms] (17 cases, 102 attempts) | 522.9 ms [95% CI 519.5–526.2 ms] (17 cases, 102 attempts) | 92.241 [95% CI 65.049–127.098] (17 cases, 102 attempts) |
| fetchkeep-lightpanda | firecrawl-selfhost | fixture | 531.9 ms [95% CI 527.9–537.7 ms] (17 cases, 97 attempts) | 89.4 ms [95% CI 78.1–96.9 ms] (17 cases, 97 attempts) | 445.6 ms [95% CI 436.2–452.2 ms] (17 cases, 97 attempts) | 5.924 [95% CI 5.459–6.81] (17 cases, 97 attempts) |
| fetchkeep-lightpanda | firecrawl-hosted | fixture | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) |
| fetchkeep-lightpanda | donsetch | fixture | 531.4 ms [95% CI 527.9–536.7 ms] (17 cases, 102 attempts) | 3.5 ms [95% CI 3.3–5 ms] (17 cases, 102 attempts) | 526.9 ms [95% CI 522.6–530.4 ms] (17 cases, 102 attempts) | 149.857 [95% CI 94.312–161.727] (17 cases, 102 attempts) |
| fetchkeep-auto | firecrawl-selfhost | fixture | 6 ms [95% CI 4.5–7.8 ms] (17 cases, 97 attempts) | 89.4 ms [95% CI 78.1–96.9 ms] (17 cases, 97 attempts) | -78.2 ms [95% CI -85.7–-65.1 ms] (17 cases, 97 attempts) | 0.07 [95% CI 0.052–0.191] (17 cases, 97 attempts) |
| fetchkeep-auto | firecrawl-hosted | fixture | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) |
| fetchkeep-auto | donsetch | fixture | 6.2 ms [95% CI 4.7–8.6 ms] (17 cases, 102 attempts) | 3.5 ms [95% CI 3.3–5 ms] (17 cases, 102 attempts) | 1 ms [95% CI 0.2–1.9 ms] (17 cases, 102 attempts) | 1.286 [95% CI 1–1.581] (17 cases, 102 attempts) |
| firecrawl-selfhost | firecrawl-hosted | fixture | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) |
| firecrawl-selfhost | donsetch | fixture | 89.4 ms [95% CI 78.1–96.9 ms] (17 cases, 97 attempts) | 3.5 ms [95% CI 3.3–5 ms] (17 cases, 97 attempts) | 81.9 ms [95% CI 69.3–88.1 ms] (17 cases, 97 attempts) | 25.184 [95% CI 16.811–27.697] (17 cases, 97 attempts) |
| firecrawl-hosted | donsetch | fixture | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) |
| fetchkeep-http | fetchkeep-chromium | live | 371.5 ms [95% CI 262.9–504.4 ms] (24 cases, 144 attempts) | 1334.4 ms [95% CI 1141.8–1530.7 ms] (24 cases, 144 attempts) | -944.6 ms [95% CI -1064.8–-848.2 ms] (24 cases, 144 attempts) | 0.256 [95% CI 0.218–0.337] (24 cases, 144 attempts) |
| fetchkeep-http | fetchkeep-lightpanda | live | 371.5 ms [95% CI 262.9–504.4 ms] (24 cases, 144 attempts) | 1214.2 ms [95% CI 1054.5–1418.6 ms] (24 cases, 144 attempts) | -774.7 ms [95% CI -894.4–-680.6 ms] (24 cases, 144 attempts) | 0.289 [95% CI 0.239–0.333] (24 cases, 144 attempts) |
| fetchkeep-http | fetchkeep-auto | live | 371.5 ms [95% CI 262.9–504.4 ms] (24 cases, 144 attempts) | 425.6 ms [95% CI 281.5–672.4 ms] (24 cases, 144 attempts) | -4.5 ms [95% CI -30.2–11 ms] (24 cases, 144 attempts) | 0.985 [95% CI 0.908–1.018] (24 cases, 144 attempts) |
| fetchkeep-http | firecrawl-selfhost | live | 378.3 ms [95% CI 262.9–533.4 ms] (23 cases, 138 attempts) | 844.9 ms [95% CI 620.4–1076.7 ms] (23 cases, 138 attempts) | -413.6 ms [95% CI -529.2–-307.9 ms] (23 cases, 138 attempts) | 0.421 [95% CI 0.377–0.577] (23 cases, 138 attempts) |
| fetchkeep-http | firecrawl-hosted | live | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) |
| fetchkeep-http | donsetch | live | 371.5 ms [95% CI 256.8–534 ms] (23 cases, 138 attempts) | 317.6 ms [95% CI 167.2–401.8 ms] (23 cases, 138 attempts) | 126.4 ms [95% CI 75.5–183.3 ms] (23 cases, 138 attempts) | 1.754 [95% CI 1.316–3.169] (23 cases, 138 attempts) |
| fetchkeep-chromium | fetchkeep-lightpanda | live | 1334.4 ms [95% CI 1141.8–1530.7 ms] (24 cases, 144 attempts) | 1214.2 ms [95% CI 1054.5–1418.6 ms] (24 cases, 144 attempts) | 193.9 ms [95% CI 121.1–254.6 ms] (24 cases, 144 attempts) | 1.17 [95% CI 1.111–1.228] (24 cases, 144 attempts) |
| fetchkeep-chromium | fetchkeep-auto | live | 1334.4 ms [95% CI 1141.8–1530.7 ms] (24 cases, 144 attempts) | 425.6 ms [95% CI 281.5–672.4 ms] (24 cases, 144 attempts) | 864 ms [95% CI 768.4–974.7 ms] (24 cases, 144 attempts) | 3.583 [95% CI 2.311–4.369] (24 cases, 144 attempts) |
| fetchkeep-chromium | firecrawl-selfhost | live | 1308.8 ms [95% CI 1105.9–1507.5 ms] (23 cases, 138 attempts) | 844.9 ms [95% CI 620.4–1076.7 ms] (23 cases, 138 attempts) | 497.4 ms [95% CI 413.1–524.2 ms] (23 cases, 138 attempts) | 1.61 [95% CI 1.45–1.784] (23 cases, 138 attempts) |
| fetchkeep-chromium | firecrawl-hosted | live | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) |
| fetchkeep-chromium | donsetch | live | 1308.8 ms [95% CI 1110.4–1547.2 ms] (23 cases, 138 attempts) | 317.6 ms [95% CI 167.2–401.8 ms] (23 cases, 138 attempts) | 1034.6 ms [95% CI 895.5–1159.3 ms] (23 cases, 138 attempts) | 4.63 [95% CI 3.368–11.018] (23 cases, 138 attempts) |
| fetchkeep-lightpanda | fetchkeep-auto | live | 1214.2 ms [95% CI 1054.5–1418.6 ms] (24 cases, 144 attempts) | 425.6 ms [95% CI 281.5–672.4 ms] (24 cases, 144 attempts) | 711.7 ms [95% CI 629.2–892.3 ms] (24 cases, 144 attempts) | 3.364 [95% CI 2.287–4.314] (24 cases, 144 attempts) |
| fetchkeep-lightpanda | firecrawl-selfhost | live | 1214.2 ms [95% CI 1019–1418.9 ms] (23 cases, 138 attempts) | 844.9 ms [95% CI 620.4–1076.7 ms] (23 cases, 138 attempts) | 328.3 ms [95% CI 221.9–402.1 ms] (23 cases, 138 attempts) | 1.384 [95% CI 1.278–1.626] (23 cases, 138 attempts) |
| fetchkeep-lightpanda | firecrawl-hosted | live | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) |
| fetchkeep-lightpanda | donsetch | live | 1214.2 ms [95% CI 1019–1475.7 ms] (23 cases, 138 attempts) | 317.6 ms [95% CI 167.2–401.8 ms] (23 cases, 138 attempts) | 869.3 ms [95% CI 772.2–1054.2 ms] (23 cases, 138 attempts) | 5.689 [95% CI 2.835–11.407] (23 cases, 138 attempts) |
| fetchkeep-auto | firecrawl-selfhost | live | 401.5 ms [95% CI 265.9–604.2 ms] (23 cases, 138 attempts) | 844.9 ms [95% CI 620.4–1076.7 ms] (23 cases, 138 attempts) | -388.8 ms [95% CI -498.7–-239.8 ms] (23 cases, 138 attempts) | 0.458 [95% CI 0.379–0.639] (23 cases, 138 attempts) |
| fetchkeep-auto | firecrawl-hosted | live | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) |
| fetchkeep-auto | donsetch | live | 401.5 ms [95% CI 265.9–621.5 ms] (23 cases, 138 attempts) | 317.6 ms [95% CI 167.2–401.8 ms] (23 cases, 138 attempts) | 133.7 ms [95% CI 93.4–195.9 ms] (23 cases, 138 attempts) | 2.314 [95% CI 1.348–3.525] (23 cases, 138 attempts) |
| firecrawl-selfhost | firecrawl-hosted | live | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) |
| firecrawl-selfhost | donsetch | live | 833.3 ms [95% CI 590.4–1081.8 ms] (22 cases, 132 attempts) | 270.8 ms [95% CI 116.3–382 ms] (22 cases, 132 attempts) | 556.9 ms [95% CI 417.6–672.5 ms] (22 cases, 132 attempts) | 3.899 [95% CI 1.973–9.225] (22 cases, 132 attempts) |
| firecrawl-hosted | donsetch | live | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) |

| A | B | dataset | matched cases / attempts | A / B errors | A / B unmatched attempts | A usable | B usable | usable A−B |
|---|---|---|---|---|---|---|---|---|
| fetchkeep-http | fetchkeep-chromium | fixture | 20 / 140 | 21 / 21 | 0 / 0 | 0.882 [95% CI 0.706–1] (17 cases, 119 attempts) | 1 [95% CI 1–1] (17 cases, 119 attempts) | -0.118 [95% CI -0.294–0] (17 cases, 119 attempts) |
| fetchkeep-http | fetchkeep-lightpanda | fixture | 20 / 140 | 21 / 21 | 0 / 0 | 0.882 [95% CI 0.706–1] (17 cases, 119 attempts) | 1 [95% CI 1–1] (17 cases, 119 attempts) | -0.118 [95% CI -0.294–0] (17 cases, 119 attempts) |
| fetchkeep-http | fetchkeep-auto | fixture | 20 / 140 | 21 / 21 | 0 / 0 | 0.882 [95% CI 0.706–1] (17 cases, 119 attempts) | 1 [95% CI 1–1] (17 cases, 119 attempts) | -0.118 [95% CI -0.294–0] (17 cases, 119 attempts) |
| fetchkeep-http | firecrawl-selfhost | fixture | 20 / 140 | 21 / 27 | 0 / 0 | 0.882 [95% CI 0.706–1] (17 cases, 119 attempts) | 0.95 [95% CI 0.849–1] (17 cases, 119 attempts) | -0.067 [95% CI -0.185–0] (17 cases, 119 attempts) |
| fetchkeep-http | firecrawl-hosted | fixture | 0 / 0 | 0 / 0 | 140 / 0 | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) |
| fetchkeep-http | donsetch | fixture | 20 / 140 | 21 / 21 | 0 / 0 | 0.882 [95% CI 0.706–1] (17 cases, 119 attempts) | 1 [95% CI 1–1] (17 cases, 119 attempts) | -0.118 [95% CI -0.294–0] (17 cases, 119 attempts) |
| fetchkeep-chromium | fetchkeep-lightpanda | fixture | 20 / 140 | 21 / 21 | 0 / 0 | 1 [95% CI 1–1] (17 cases, 119 attempts) | 1 [95% CI 1–1] (17 cases, 119 attempts) | 0 [95% CI 0–0] (17 cases, 119 attempts) |
| fetchkeep-chromium | fetchkeep-auto | fixture | 20 / 140 | 21 / 21 | 0 / 0 | 1 [95% CI 1–1] (17 cases, 119 attempts) | 1 [95% CI 1–1] (17 cases, 119 attempts) | 0 [95% CI 0–0] (17 cases, 119 attempts) |
| fetchkeep-chromium | firecrawl-selfhost | fixture | 20 / 140 | 21 / 27 | 0 / 0 | 1 [95% CI 1–1] (17 cases, 119 attempts) | 0.95 [95% CI 0.849–1] (17 cases, 119 attempts) | 0.05 [95% CI 0–0.151] (17 cases, 119 attempts) |
| fetchkeep-chromium | firecrawl-hosted | fixture | 0 / 0 | 0 / 0 | 140 / 0 | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) |
| fetchkeep-chromium | donsetch | fixture | 20 / 140 | 21 / 21 | 0 / 0 | 1 [95% CI 1–1] (17 cases, 119 attempts) | 1 [95% CI 1–1] (17 cases, 119 attempts) | 0 [95% CI 0–0] (17 cases, 119 attempts) |
| fetchkeep-lightpanda | fetchkeep-auto | fixture | 20 / 140 | 21 / 21 | 0 / 0 | 1 [95% CI 1–1] (17 cases, 119 attempts) | 1 [95% CI 1–1] (17 cases, 119 attempts) | 0 [95% CI 0–0] (17 cases, 119 attempts) |
| fetchkeep-lightpanda | firecrawl-selfhost | fixture | 20 / 140 | 21 / 27 | 0 / 0 | 1 [95% CI 1–1] (17 cases, 119 attempts) | 0.95 [95% CI 0.849–1] (17 cases, 119 attempts) | 0.05 [95% CI 0–0.151] (17 cases, 119 attempts) |
| fetchkeep-lightpanda | firecrawl-hosted | fixture | 0 / 0 | 0 / 0 | 140 / 0 | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) |
| fetchkeep-lightpanda | donsetch | fixture | 20 / 140 | 21 / 21 | 0 / 0 | 1 [95% CI 1–1] (17 cases, 119 attempts) | 1 [95% CI 1–1] (17 cases, 119 attempts) | 0 [95% CI 0–0] (17 cases, 119 attempts) |
| fetchkeep-auto | firecrawl-selfhost | fixture | 20 / 140 | 21 / 27 | 0 / 0 | 1 [95% CI 1–1] (17 cases, 119 attempts) | 0.95 [95% CI 0.849–1] (17 cases, 119 attempts) | 0.05 [95% CI 0–0.151] (17 cases, 119 attempts) |
| fetchkeep-auto | firecrawl-hosted | fixture | 0 / 0 | 0 / 0 | 140 / 0 | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) |
| fetchkeep-auto | donsetch | fixture | 20 / 140 | 21 / 21 | 0 / 0 | 1 [95% CI 1–1] (17 cases, 119 attempts) | 1 [95% CI 1–1] (17 cases, 119 attempts) | 0 [95% CI 0–0] (17 cases, 119 attempts) |
| firecrawl-selfhost | firecrawl-hosted | fixture | 0 / 0 | 0 / 0 | 140 / 0 | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) |
| firecrawl-selfhost | donsetch | fixture | 20 / 140 | 27 / 21 | 0 / 0 | 0.95 [95% CI 0.849–1] (17 cases, 119 attempts) | 1 [95% CI 1–1] (17 cases, 119 attempts) | -0.05 [95% CI -0.151–0] (17 cases, 119 attempts) |
| firecrawl-hosted | donsetch | fixture | 0 / 0 | 0 / 0 | 0 / 140 | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) |
| fetchkeep-http | fetchkeep-chromium | live | 24 / 168 | 0 / 0 | 0 / 0 | 0.875 [95% CI 0.708–1] (24 cases, 168 attempts) | 0.958 [95% CI 0.875–1] (24 cases, 168 attempts) | -0.083 [95% CI -0.208–0] (24 cases, 168 attempts) |
| fetchkeep-http | fetchkeep-lightpanda | live | 24 / 168 | 0 / 0 | 0 / 0 | 0.875 [95% CI 0.708–1] (24 cases, 168 attempts) | 0.958 [95% CI 0.875–1] (24 cases, 168 attempts) | -0.083 [95% CI -0.208–0] (24 cases, 168 attempts) |
| fetchkeep-http | fetchkeep-auto | live | 24 / 168 | 0 / 0 | 0 / 0 | 0.875 [95% CI 0.708–1] (24 cases, 168 attempts) | 0.958 [95% CI 0.875–1] (24 cases, 168 attempts) | -0.083 [95% CI -0.208–0] (24 cases, 168 attempts) |
| fetchkeep-http | firecrawl-selfhost | live | 24 / 168 | 0 / 7 | 0 / 0 | 0.875 [95% CI 0.708–1] (24 cases, 168 attempts) | 0.917 [95% CI 0.792–1] (24 cases, 168 attempts) | -0.042 [95% CI -0.125–0] (24 cases, 168 attempts) |
| fetchkeep-http | firecrawl-hosted | live | 0 / 0 | 0 / 0 | 168 / 0 | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) |
| fetchkeep-http | donsetch | live | 24 / 168 | 0 / 7 | 0 / 0 | 0.875 [95% CI 0.708–1] (24 cases, 168 attempts) | 0.917 [95% CI 0.792–1] (24 cases, 168 attempts) | -0.042 [95% CI -0.125–0] (24 cases, 168 attempts) |
| fetchkeep-chromium | fetchkeep-lightpanda | live | 24 / 168 | 0 / 0 | 0 / 0 | 0.958 [95% CI 0.875–1] (24 cases, 168 attempts) | 0.958 [95% CI 0.875–1] (24 cases, 168 attempts) | 0 [95% CI 0–0] (24 cases, 168 attempts) |
| fetchkeep-chromium | fetchkeep-auto | live | 24 / 168 | 0 / 0 | 0 / 0 | 0.958 [95% CI 0.875–1] (24 cases, 168 attempts) | 0.958 [95% CI 0.875–1] (24 cases, 168 attempts) | 0 [95% CI 0–0] (24 cases, 168 attempts) |
| fetchkeep-chromium | firecrawl-selfhost | live | 24 / 168 | 0 / 7 | 0 / 0 | 0.958 [95% CI 0.875–1] (24 cases, 168 attempts) | 0.917 [95% CI 0.792–1] (24 cases, 168 attempts) | 0.042 [95% CI 0–0.125] (24 cases, 168 attempts) |
| fetchkeep-chromium | firecrawl-hosted | live | 0 / 0 | 0 / 0 | 168 / 0 | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) |
| fetchkeep-chromium | donsetch | live | 24 / 168 | 0 / 7 | 0 / 0 | 0.958 [95% CI 0.875–1] (24 cases, 168 attempts) | 0.917 [95% CI 0.792–1] (24 cases, 168 attempts) | 0.042 [95% CI 0–0.125] (24 cases, 168 attempts) |
| fetchkeep-lightpanda | fetchkeep-auto | live | 24 / 168 | 0 / 0 | 0 / 0 | 0.958 [95% CI 0.875–1] (24 cases, 168 attempts) | 0.958 [95% CI 0.875–1] (24 cases, 168 attempts) | 0 [95% CI 0–0] (24 cases, 168 attempts) |
| fetchkeep-lightpanda | firecrawl-selfhost | live | 24 / 168 | 0 / 7 | 0 / 0 | 0.958 [95% CI 0.875–1] (24 cases, 168 attempts) | 0.917 [95% CI 0.792–1] (24 cases, 168 attempts) | 0.042 [95% CI 0–0.125] (24 cases, 168 attempts) |
| fetchkeep-lightpanda | firecrawl-hosted | live | 0 / 0 | 0 / 0 | 168 / 0 | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) |
| fetchkeep-lightpanda | donsetch | live | 24 / 168 | 0 / 7 | 0 / 0 | 0.958 [95% CI 0.875–1] (24 cases, 168 attempts) | 0.917 [95% CI 0.792–1] (24 cases, 168 attempts) | 0.042 [95% CI 0–0.125] (24 cases, 168 attempts) |
| fetchkeep-auto | firecrawl-selfhost | live | 24 / 168 | 0 / 7 | 0 / 0 | 0.958 [95% CI 0.875–1] (24 cases, 168 attempts) | 0.917 [95% CI 0.792–1] (24 cases, 168 attempts) | 0.042 [95% CI 0–0.125] (24 cases, 168 attempts) |
| fetchkeep-auto | firecrawl-hosted | live | 0 / 0 | 0 / 0 | 168 / 0 | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) |
| fetchkeep-auto | donsetch | live | 24 / 168 | 0 / 7 | 0 / 0 | 0.958 [95% CI 0.875–1] (24 cases, 168 attempts) | 0.917 [95% CI 0.792–1] (24 cases, 168 attempts) | 0.042 [95% CI 0–0.125] (24 cases, 168 attempts) |
| firecrawl-selfhost | firecrawl-hosted | live | 0 / 0 | 0 / 0 | 168 / 0 | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) |
| firecrawl-selfhost | donsetch | live | 24 / 168 | 7 / 7 | 0 / 0 | 0.917 [95% CI 0.792–1] (24 cases, 168 attempts) | 0.917 [95% CI 0.792–1] (24 cases, 168 attempts) | 0 [95% CI 0–0] (24 cases, 168 attempts) |
| firecrawl-hosted | donsetch | live | 0 / 0 | 0 / 0 | 0 / 168 | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) |

## Phase timings

Engine-reported milliseconds on successful warm tasks only. MCP wall latency is measured independently by the runner. Phase medians are not additive and may have different sample cohorts. totalMs includes phases; firstByteMs is nested inside downloadMs. Canonical browser phases are non-overlapping. Aggregated phases include measured attempts only: failed/uninstrumented work, policy checks and transport overhead remain unassigned. No residual is fabricated as a phase. Missing phases, absent historical fields and competitors without phase telemetry are n/a, not zero.

| profile | dataset | phase | warm p50 and interval | observed / eligible attempts |
|---|---|---|---|---|
| fetchkeep-http | fixture | downloadMs: HTTP network and body decoding, including redirects | 1.2 ms [95% CI 1.1–1.5 ms] (17 cases, 102 attempts) | 102 / 102 |
| fetchkeep-http | fixture | firstByteMs: HTTP first byte (nested within downloadMs; not additive) | 1.1 ms [95% CI 1–1.3 ms] (17 cases, 102 attempts) | 102 / 102 |
| fetchkeep-http | fixture | launchMs: Browser launch/acquire | n/a (0 cases, 0 attempts) | 0 / 102 |
| fetchkeep-http | fixture | navigateMs: Browser navigation | n/a (0 cases, 0 attempts) | 0 / 102 |
| fetchkeep-http | fixture | readinessMs: Bounded content readiness | n/a (0 cases, 0 attempts) | 0 / 102 |
| fetchkeep-http | fixture | serializeMs: DOM serialization | n/a (0 cases, 0 attempts) | 0 / 102 |
| fetchkeep-http | fixture | extractMs: Content extraction | 2.8 ms [95% CI 1.9–3.8 ms] (17 cases, 102 attempts) | 102 / 102 |
| fetchkeep-http | fixture | renderMs: Browser render total (overlaps browser phases; not additive) | n/a (0 cases, 0 attempts) | 0 / 102 |
| fetchkeep-http | fixture | saveMs: Local persistence | 0.2 ms [95% CI 0.2–0.2 ms] (17 cases, 102 attempts) | 102 / 102 |
| fetchkeep-http | fixture | totalMs: Engine total (includes phases; do not sum with them) | 4.8 ms [95% CI 4–6.8 ms] (17 cases, 102 attempts) | 102 / 102 |
| fetchkeep-chromium | fixture | downloadMs: HTTP network and body decoding, including redirects | 1.8 ms [95% CI 1.6–1.8 ms] (3 cases, 18 attempts) | 18 / 102 |
| fetchkeep-chromium | fixture | firstByteMs: HTTP first byte (nested within downloadMs; not additive) | 1.6 ms [95% CI 1.5–1.6 ms] (3 cases, 18 attempts) | 18 / 102 |
| fetchkeep-chromium | fixture | launchMs: Browser launch/acquire | 30.4 ms [95% CI 29.3–31.1 ms] (14 cases, 84 attempts) | 84 / 102 |
| fetchkeep-chromium | fixture | navigateMs: Browser navigation | 17.3 ms [95% CI 15.9–22.8 ms] (14 cases, 84 attempts) | 84 / 102 |
| fetchkeep-chromium | fixture | readinessMs: Bounded content readiness | 523.4 ms [95% CI 521.4–525.5 ms] (14 cases, 84 attempts) | 84 / 102 |
| fetchkeep-chromium | fixture | serializeMs: DOM serialization | 2.3 ms [95% CI 2.3–2.4 ms] (14 cases, 84 attempts) | 84 / 102 |
| fetchkeep-chromium | fixture | extractMs: Content extraction | 3 ms [95% CI 2.5–4.1 ms] (17 cases, 102 attempts) | 102 / 102 |
| fetchkeep-chromium | fixture | renderMs: Browser render total (overlaps browser phases; not additive) | 576.8 ms [95% CI 572.2–586 ms] (14 cases, 84 attempts) | 84 / 102 |
| fetchkeep-chromium | fixture | saveMs: Local persistence | 0.2 ms [95% CI 0.2–0.2 ms] (17 cases, 102 attempts) | 102 / 102 |
| fetchkeep-chromium | fixture | totalMs: Engine total (includes phases; do not sum with them) | 582.5 ms [95% CI 574.2–591.1 ms] (17 cases, 102 attempts) | 102 / 102 |
| fetchkeep-lightpanda | fixture | downloadMs: HTTP network and body decoding, including redirects | 1.9 ms [95% CI 1.7–2 ms] (3 cases, 18 attempts) | 18 / 102 |
| fetchkeep-lightpanda | fixture | firstByteMs: HTTP first byte (nested within downloadMs; not additive) | 1.8 ms [95% CI 1.4–1.8 ms] (3 cases, 18 attempts) | 18 / 102 |
| fetchkeep-lightpanda | fixture | launchMs: Browser launch/acquire | 10.4 ms [95% CI 9.9–10.8 ms] (14 cases, 84 attempts) | 84 / 102 |
| fetchkeep-lightpanda | fixture | navigateMs: Browser navigation | 2.2 ms [95% CI 1.9–2.7 ms] (14 cases, 84 attempts) | 84 / 102 |
| fetchkeep-lightpanda | fixture | readinessMs: Bounded content readiness | 508 ms [95% CI 507.6–508.5 ms] (14 cases, 84 attempts) | 84 / 102 |
| fetchkeep-lightpanda | fixture | serializeMs: DOM serialization | 0.7 ms [95% CI 0.7–0.7 ms] (14 cases, 84 attempts) | 84 / 102 |
| fetchkeep-lightpanda | fixture | extractMs: Content extraction | 2.7 ms [95% CI 2.2–3.2 ms] (17 cases, 102 attempts) | 102 / 102 |
| fetchkeep-lightpanda | fixture | renderMs: Browser render total (overlaps browser phases; not additive) | 522.7 ms [95% CI 521.3–525.6 ms] (14 cases, 84 attempts) | 84 / 102 |
| fetchkeep-lightpanda | fixture | saveMs: Local persistence | 0.2 ms [95% CI 0.2–0.2 ms] (17 cases, 102 attempts) | 102 / 102 |
| fetchkeep-lightpanda | fixture | totalMs: Engine total (includes phases; do not sum with them) | 530.8 ms [95% CI 527.1–535.8 ms] (17 cases, 102 attempts) | 102 / 102 |
| fetchkeep-auto | fixture | downloadMs: HTTP network and body decoding, including redirects | 1.2 ms [95% CI 1.2–1.5 ms] (17 cases, 102 attempts) | 102 / 102 |
| fetchkeep-auto | fixture | firstByteMs: HTTP first byte (nested within downloadMs; not additive) | 1.1 ms [95% CI 1–1.2 ms] (17 cases, 102 attempts) | 102 / 102 |
| fetchkeep-auto | fixture | launchMs: Browser launch/acquire | 37.5 ms [95% CI 35.7–51.6 ms] (2 cases, 12 attempts) | 12 / 102 |
| fetchkeep-auto | fixture | navigateMs: Browser navigation | 20.6 ms [95% CI 17.1–20.6 ms] (2 cases, 12 attempts) | 12 / 102 |
| fetchkeep-auto | fixture | readinessMs: Bounded content readiness | 523.3 ms [95% CI 517.4–523.3 ms] (2 cases, 12 attempts) | 12 / 102 |
| fetchkeep-auto | fixture | serializeMs: DOM serialization | 2.3 ms [95% CI 2.2–2.3 ms] (2 cases, 12 attempts) | 12 / 102 |
| fetchkeep-auto | fixture | extractMs: Content extraction | 2.6 ms [95% CI 1.8–3.5 ms] (17 cases, 102 attempts) | 102 / 102 |
| fetchkeep-auto | fixture | renderMs: Browser render total (overlaps browser phases; not additive) | 593.4 ms [95% CI 592.5–593.4 ms] (2 cases, 12 attempts) | 12 / 102 |
| fetchkeep-auto | fixture | saveMs: Local persistence | 0.2 ms [95% CI 0.2–0.2 ms] (17 cases, 102 attempts) | 102 / 102 |
| fetchkeep-auto | fixture | totalMs: Engine total (includes phases; do not sum with them) | 5.2 ms [95% CI 3.8–7.7 ms] (17 cases, 102 attempts) | 102 / 102 |
| firecrawl-selfhost | fixture | downloadMs: HTTP network and body decoding, including redirects | n/a (0 cases, 0 attempts) | 0 / 97 |
| firecrawl-selfhost | fixture | firstByteMs: HTTP first byte (nested within downloadMs; not additive) | n/a (0 cases, 0 attempts) | 0 / 97 |
| firecrawl-selfhost | fixture | launchMs: Browser launch/acquire | n/a (0 cases, 0 attempts) | 0 / 97 |
| firecrawl-selfhost | fixture | navigateMs: Browser navigation | n/a (0 cases, 0 attempts) | 0 / 97 |
| firecrawl-selfhost | fixture | readinessMs: Bounded content readiness | n/a (0 cases, 0 attempts) | 0 / 97 |
| firecrawl-selfhost | fixture | serializeMs: DOM serialization | n/a (0 cases, 0 attempts) | 0 / 97 |
| firecrawl-selfhost | fixture | extractMs: Content extraction | n/a (0 cases, 0 attempts) | 0 / 97 |
| firecrawl-selfhost | fixture | renderMs: Browser render total (overlaps browser phases; not additive) | n/a (0 cases, 0 attempts) | 0 / 97 |
| firecrawl-selfhost | fixture | saveMs: Local persistence | n/a (0 cases, 0 attempts) | 0 / 97 |
| firecrawl-selfhost | fixture | totalMs: Engine total (includes phases; do not sum with them) | n/a (0 cases, 0 attempts) | 0 / 97 |
| firecrawl-hosted | fixture | downloadMs: HTTP network and body decoding, including redirects | n/a (0 cases, 0 attempts) | 0 / 0 |
| firecrawl-hosted | fixture | firstByteMs: HTTP first byte (nested within downloadMs; not additive) | n/a (0 cases, 0 attempts) | 0 / 0 |
| firecrawl-hosted | fixture | launchMs: Browser launch/acquire | n/a (0 cases, 0 attempts) | 0 / 0 |
| firecrawl-hosted | fixture | navigateMs: Browser navigation | n/a (0 cases, 0 attempts) | 0 / 0 |
| firecrawl-hosted | fixture | readinessMs: Bounded content readiness | n/a (0 cases, 0 attempts) | 0 / 0 |
| firecrawl-hosted | fixture | serializeMs: DOM serialization | n/a (0 cases, 0 attempts) | 0 / 0 |
| firecrawl-hosted | fixture | extractMs: Content extraction | n/a (0 cases, 0 attempts) | 0 / 0 |
| firecrawl-hosted | fixture | renderMs: Browser render total (overlaps browser phases; not additive) | n/a (0 cases, 0 attempts) | 0 / 0 |
| firecrawl-hosted | fixture | saveMs: Local persistence | n/a (0 cases, 0 attempts) | 0 / 0 |
| firecrawl-hosted | fixture | totalMs: Engine total (includes phases; do not sum with them) | n/a (0 cases, 0 attempts) | 0 / 0 |
| donsetch | fixture | downloadMs: HTTP network and body decoding, including redirects | n/a (0 cases, 0 attempts) | 0 / 102 |
| donsetch | fixture | firstByteMs: HTTP first byte (nested within downloadMs; not additive) | n/a (0 cases, 0 attempts) | 0 / 102 |
| donsetch | fixture | launchMs: Browser launch/acquire | n/a (0 cases, 0 attempts) | 0 / 102 |
| donsetch | fixture | navigateMs: Browser navigation | n/a (0 cases, 0 attempts) | 0 / 102 |
| donsetch | fixture | readinessMs: Bounded content readiness | n/a (0 cases, 0 attempts) | 0 / 102 |
| donsetch | fixture | serializeMs: DOM serialization | n/a (0 cases, 0 attempts) | 0 / 102 |
| donsetch | fixture | extractMs: Content extraction | n/a (0 cases, 0 attempts) | 0 / 102 |
| donsetch | fixture | renderMs: Browser render total (overlaps browser phases; not additive) | n/a (0 cases, 0 attempts) | 0 / 102 |
| donsetch | fixture | saveMs: Local persistence | n/a (0 cases, 0 attempts) | 0 / 102 |
| donsetch | fixture | totalMs: Engine total (includes phases; do not sum with them) | n/a (0 cases, 0 attempts) | 0 / 102 |
| fetchkeep-http | live | downloadMs: HTTP network and body decoding, including redirects | 253.3 ms [95% CI 113.2–353.6 ms] (24 cases, 144 attempts) | 144 / 144 |
| fetchkeep-http | live | firstByteMs: HTTP first byte (nested within downloadMs; not additive) | 167.4 ms [95% CI 97.2–342.3 ms] (24 cases, 144 attempts) | 144 / 144 |
| fetchkeep-http | live | launchMs: Browser launch/acquire | n/a (0 cases, 0 attempts) | 0 / 144 |
| fetchkeep-http | live | navigateMs: Browser navigation | n/a (0 cases, 0 attempts) | 0 / 144 |
| fetchkeep-http | live | readinessMs: Bounded content readiness | n/a (0 cases, 0 attempts) | 0 / 144 |
| fetchkeep-http | live | serializeMs: DOM serialization | n/a (0 cases, 0 attempts) | 0 / 144 |
| fetchkeep-http | live | extractMs: Content extraction | 95.1 ms [95% CI 33.3–158.2 ms] (24 cases, 144 attempts) | 144 / 144 |
| fetchkeep-http | live | renderMs: Browser render total (overlaps browser phases; not additive) | n/a (0 cases, 0 attempts) | 0 / 144 |
| fetchkeep-http | live | saveMs: Local persistence | 0.3 ms [95% CI 0.3–0.4 ms] (24 cases, 144 attempts) | 144 / 144 |
| fetchkeep-http | live | totalMs: Engine total (includes phases; do not sum with them) | 370.5 ms [95% CI 262–488.6 ms] (24 cases, 144 attempts) | 144 / 144 |
| fetchkeep-chromium | live | downloadMs: HTTP network and body decoding, including redirects | 275.2 ms [95% CI 254.4–306.1 ms] (3 cases, 18 attempts) | 18 / 144 |
| fetchkeep-chromium | live | firstByteMs: HTTP first byte (nested within downloadMs; not additive) | 235.2 ms [95% CI 84.2–267.6 ms] (3 cases, 18 attempts) | 18 / 144 |
| fetchkeep-chromium | live | launchMs: Browser launch/acquire | 31.6 ms [95% CI 30.2–32.6 ms] (21 cases, 126 attempts) | 126 / 144 |
| fetchkeep-chromium | live | navigateMs: Browser navigation | 595 ms [95% CI 398.7–847.1 ms] (21 cases, 126 attempts) | 126 / 144 |
| fetchkeep-chromium | live | readinessMs: Bounded content readiness | 538 ms [95% CI 530.7–543.9 ms] (21 cases, 126 attempts) | 126 / 144 |
| fetchkeep-chromium | live | serializeMs: DOM serialization | 8.4 ms [95% CI 6–12.5 ms] (21 cases, 126 attempts) | 126 / 144 |
| fetchkeep-chromium | live | extractMs: Content extraction | 114.5 ms [95% CI 46.6–190.5 ms] (24 cases, 144 attempts) | 144 / 144 |
| fetchkeep-chromium | live | renderMs: Browser render total (overlaps browser phases; not additive) | 1287.8 ms [95% CI 976.3–1435.8 ms] (21 cases, 126 attempts) | 126 / 144 |
| fetchkeep-chromium | live | saveMs: Local persistence | 0.3 ms [95% CI 0.3–0.4 ms] (24 cases, 144 attempts) | 144 / 144 |
| fetchkeep-chromium | live | totalMs: Engine total (includes phases; do not sum with them) | 1333.3 ms [95% CI 1140.3–1529.9 ms] (24 cases, 144 attempts) | 144 / 144 |
| fetchkeep-lightpanda | live | downloadMs: HTTP network and body decoding, including redirects | 294.3 ms [95% CI 215.6–320.2 ms] (3 cases, 18 attempts) | 18 / 144 |
| fetchkeep-lightpanda | live | firstByteMs: HTTP first byte (nested within downloadMs; not additive) | 206.8 ms [95% CI 81.8–254.7 ms] (3 cases, 18 attempts) | 18 / 144 |
| fetchkeep-lightpanda | live | launchMs: Browser launch/acquire | 10.8 ms [95% CI 10.3–11.2 ms] (21 cases, 126 attempts) | 126 / 144 |
| fetchkeep-lightpanda | live | navigateMs: Browser navigation | 475 ms [95% CI 189.8–611.6 ms] (21 cases, 126 attempts) | 126 / 144 |
| fetchkeep-lightpanda | live | readinessMs: Bounded content readiness | 538 ms [95% CI 523.7–547.6 ms] (21 cases, 126 attempts) | 126 / 144 |
| fetchkeep-lightpanda | live | serializeMs: DOM serialization | 3.1 ms [95% CI 1.4–7.3 ms] (21 cases, 126 attempts) | 126 / 144 |
| fetchkeep-lightpanda | live | extractMs: Content extraction | 105 ms [95% CI 44.5–142.7 ms] (24 cases, 144 attempts) | 144 / 144 |
| fetchkeep-lightpanda | live | renderMs: Browser render total (overlaps browser phases; not additive) | 1056.4 ms [95% CI 765.5–1226.2 ms] (21 cases, 126 attempts) | 126 / 144 |
| fetchkeep-lightpanda | live | saveMs: Local persistence | 0.3 ms [95% CI 0.3–0.4 ms] (24 cases, 144 attempts) | 144 / 144 |
| fetchkeep-lightpanda | live | totalMs: Engine total (includes phases; do not sum with them) | 1213 ms [95% CI 1053.4–1414.7 ms] (24 cases, 144 attempts) | 144 / 144 |
| fetchkeep-auto | live | downloadMs: HTTP network and body decoding, including redirects | 248.2 ms [95% CI 113.3–354.4 ms] (24 cases, 144 attempts) | 144 / 144 |
| fetchkeep-auto | live | firstByteMs: HTTP first byte (nested within downloadMs; not additive) | 163 ms [95% CI 103–327.5 ms] (24 cases, 144 attempts) | 144 / 144 |
| fetchkeep-auto | live | launchMs: Browser launch/acquire | 56.2 ms [95% CI 42.3–56.2 ms] (3 cases, 18 attempts) | 18 / 144 |
| fetchkeep-auto | live | navigateMs: Browser navigation | 828.2 ms [95% CI 489.2–854.8 ms] (3 cases, 18 attempts) | 18 / 144 |
| fetchkeep-auto | live | readinessMs: Bounded content readiness | 520.2 ms [95% CI 516.4–1095.7 ms] (3 cases, 18 attempts) | 18 / 144 |
| fetchkeep-auto | live | serializeMs: DOM serialization | 3.1 ms [95% CI 2.7–4.4 ms] (3 cases, 18 attempts) | 18 / 144 |
| fetchkeep-auto | live | extractMs: Content extraction | 92.8 ms [95% CI 31.7–153.5 ms] (24 cases, 144 attempts) | 144 / 144 |
| fetchkeep-auto | live | renderMs: Browser render total (overlaps browser phases; not additive) | 1474.1 ms [95% CI 1411.9–1717.2 ms] (3 cases, 18 attempts) | 18 / 144 |
| fetchkeep-auto | live | saveMs: Local persistence | 0.3 ms [95% CI 0.3–0.4 ms] (24 cases, 144 attempts) | 144 / 144 |
| fetchkeep-auto | live | totalMs: Engine total (includes phases; do not sum with them) | 422.1 ms [95% CI 280–663.5 ms] (24 cases, 144 attempts) | 144 / 144 |
| firecrawl-selfhost | live | downloadMs: HTTP network and body decoding, including redirects | n/a (0 cases, 0 attempts) | 0 / 138 |
| firecrawl-selfhost | live | firstByteMs: HTTP first byte (nested within downloadMs; not additive) | n/a (0 cases, 0 attempts) | 0 / 138 |
| firecrawl-selfhost | live | launchMs: Browser launch/acquire | n/a (0 cases, 0 attempts) | 0 / 138 |
| firecrawl-selfhost | live | navigateMs: Browser navigation | n/a (0 cases, 0 attempts) | 0 / 138 |
| firecrawl-selfhost | live | readinessMs: Bounded content readiness | n/a (0 cases, 0 attempts) | 0 / 138 |
| firecrawl-selfhost | live | serializeMs: DOM serialization | n/a (0 cases, 0 attempts) | 0 / 138 |
| firecrawl-selfhost | live | extractMs: Content extraction | n/a (0 cases, 0 attempts) | 0 / 138 |
| firecrawl-selfhost | live | renderMs: Browser render total (overlaps browser phases; not additive) | n/a (0 cases, 0 attempts) | 0 / 138 |
| firecrawl-selfhost | live | saveMs: Local persistence | n/a (0 cases, 0 attempts) | 0 / 138 |
| firecrawl-selfhost | live | totalMs: Engine total (includes phases; do not sum with them) | n/a (0 cases, 0 attempts) | 0 / 138 |
| firecrawl-hosted | live | downloadMs: HTTP network and body decoding, including redirects | n/a (0 cases, 0 attempts) | 0 / 0 |
| firecrawl-hosted | live | firstByteMs: HTTP first byte (nested within downloadMs; not additive) | n/a (0 cases, 0 attempts) | 0 / 0 |
| firecrawl-hosted | live | launchMs: Browser launch/acquire | n/a (0 cases, 0 attempts) | 0 / 0 |
| firecrawl-hosted | live | navigateMs: Browser navigation | n/a (0 cases, 0 attempts) | 0 / 0 |
| firecrawl-hosted | live | readinessMs: Bounded content readiness | n/a (0 cases, 0 attempts) | 0 / 0 |
| firecrawl-hosted | live | serializeMs: DOM serialization | n/a (0 cases, 0 attempts) | 0 / 0 |
| firecrawl-hosted | live | extractMs: Content extraction | n/a (0 cases, 0 attempts) | 0 / 0 |
| firecrawl-hosted | live | renderMs: Browser render total (overlaps browser phases; not additive) | n/a (0 cases, 0 attempts) | 0 / 0 |
| firecrawl-hosted | live | saveMs: Local persistence | n/a (0 cases, 0 attempts) | 0 / 0 |
| firecrawl-hosted | live | totalMs: Engine total (includes phases; do not sum with them) | n/a (0 cases, 0 attempts) | 0 / 0 |
| donsetch | live | downloadMs: HTTP network and body decoding, including redirects | n/a (0 cases, 0 attempts) | 0 / 138 |
| donsetch | live | firstByteMs: HTTP first byte (nested within downloadMs; not additive) | n/a (0 cases, 0 attempts) | 0 / 138 |
| donsetch | live | launchMs: Browser launch/acquire | n/a (0 cases, 0 attempts) | 0 / 138 |
| donsetch | live | navigateMs: Browser navigation | n/a (0 cases, 0 attempts) | 0 / 138 |
| donsetch | live | readinessMs: Bounded content readiness | n/a (0 cases, 0 attempts) | 0 / 138 |
| donsetch | live | serializeMs: DOM serialization | n/a (0 cases, 0 attempts) | 0 / 138 |
| donsetch | live | extractMs: Content extraction | n/a (0 cases, 0 attempts) | 0 / 138 |
| donsetch | live | renderMs: Browser render total (overlaps browser phases; not additive) | n/a (0 cases, 0 attempts) | 0 / 138 |
| donsetch | live | saveMs: Local persistence | n/a (0 cases, 0 attempts) | 0 / 138 |
| donsetch | live | totalMs: Engine total (includes phases; do not sum with them) | n/a (0 cases, 0 attempts) | 0 / 138 |

## Quality detail

| profile | dataset | passage recall | extraction failure (recall < 0.5) | boilerplate excl. | token precision | token recall | token F1 | headings | tables | code | chars (mean) | tokens (mean) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| fetchkeep-http | fixture | 0.882 (n=119) | 11.8% (n=119) | 0.950 (n=70) | 0.951 (n=63) | 0.998 (n=63) | 0.973 (n=63) | 0.778 (n=63) | 0.800 (n=35) | 1.000 (n=21) | 488 (n=119) | 114 (n=119) |
| fetchkeep-chromium | fixture | 1.000 (n=119) | 0.0% (n=119) | 0.950 (n=70) | 0.938 (n=63) | 0.998 (n=63) | 0.965 (n=63) | 1.000 (n=63) | 1.000 (n=35) | 1.000 (n=21) | 518 (n=119) | 121 (n=119) |
| fetchkeep-lightpanda | fixture | 1.000 (n=119) | 0.0% (n=119) | 0.950 (n=70) | 0.938 (n=63) | 0.998 (n=63) | 0.965 (n=63) | 1.000 (n=63) | 1.000 (n=35) | 1.000 (n=21) | 518 (n=119) | 121 (n=119) |
| fetchkeep-auto | fixture | 1.000 (n=119) | 0.0% (n=119) | 0.950 (n=70) | 0.951 (n=63) | 0.998 (n=63) | 0.973 (n=63) | 1.000 (n=63) | 1.000 (n=35) | 1.000 (n=21) | 516 (n=119) | 121 (n=119) |
| firecrawl-selfhost | fixture | 1.000 (n=113) | 0.0% (n=113) | 0.836 (n=64) | 0.904 (n=63) | 1.000 (n=63) | 0.948 (n=63) | 1.000 (n=57) | 1.000 (n=29) | 0.556 (n=21) | 590 (n=113) | 129 (n=113) |
| firecrawl-hosted | fixture | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) |
| donsetch | fixture | 1.000 (n=119) | 0.0% (n=119) | 0.900 (n=70) | 0.752 (n=63) | 0.992 (n=63) | 0.822 (n=63) | 1.000 (n=63) | 1.000 (n=35) | 1.000 (n=21) | 804 (n=119) | 205 (n=119) |
| fetchkeep-http | live | 0.875 (n=168) | 12.5% (n=168) | 0.875 (n=112) | n/a (n=0) | n/a (n=0) | n/a (n=0) | 1.000 (n=70) | 1.000 (n=21) | 1.000 (n=49) | 57786 (n=168) | 16095 (n=168) |
| fetchkeep-chromium | live | 0.958 (n=168) | 4.2% (n=168) | 0.875 (n=112) | n/a (n=0) | n/a (n=0) | n/a (n=0) | 1.000 (n=70) | 1.000 (n=21) | 1.000 (n=49) | 59151 (n=168) | 16502 (n=168) |
| fetchkeep-lightpanda | live | 0.958 (n=168) | 4.2% (n=168) | 0.875 (n=112) | n/a (n=0) | n/a (n=0) | n/a (n=0) | 1.000 (n=70) | 1.000 (n=21) | 0.857 (n=49) | 58940 (n=168) | 16450 (n=168) |
| fetchkeep-auto | live | 0.958 (n=168) | 4.2% (n=168) | 0.875 (n=112) | n/a (n=0) | n/a (n=0) | n/a (n=0) | 1.000 (n=70) | 1.000 (n=21) | 1.000 (n=49) | 57947 (n=168) | 16135 (n=168) |
| firecrawl-selfhost | live | 0.957 (n=161) | 4.3% (n=161) | 0.677 (n=112) | n/a (n=0) | n/a (n=0) | n/a (n=0) | 0.458 (n=70) | 1.000 (n=21) | 0.367 (n=49) | 62732 (n=161) | 17177 (n=161) |
| firecrawl-hosted | live | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) |
| donsetch | live | 0.957 (n=161) | 4.3% (n=161) | 0.800 (n=105) | n/a (n=0) | n/a (n=0) | n/a (n=0) | 0.867 (n=70) | 1.000 (n=21) | 0.857 (n=49) | 37897 (n=161) | 8901 (n=161) |

### Errors, escalation and retries

| profile | dataset | timeout | blocked | error kinds | browser escalation | attempts (mean) |
|---|---|---|---|---|---|---|
| fetchkeep-http | fixture | 0.0% (n=140) | 0.0% (n=140) | http_error×21 | 0.0% (n=119) | 1.00 (n=119) |
| fetchkeep-chromium | fixture | 0.0% (n=140) | 0.0% (n=140) | http_error×14; engine_error×7 | 0.0% (n=119) | 1.18 (n=119) |
| fetchkeep-lightpanda | fixture | 0.0% (n=140) | 0.0% (n=140) | engine_error×7; http_error×14 | 0.0% (n=119) | 1.18 (n=119) |
| fetchkeep-auto | fixture | 0.0% (n=140) | 0.0% (n=140) | http_error×21 | 11.8% (n=119) | 1.12 (n=119) |
| firecrawl-selfhost | fixture | 0.0% (n=140) | 0.0% (n=140) | http_error×27 | n/a (n=0) | n/a (n=0) |
| firecrawl-hosted | fixture | n/a (n=0) | n/a (n=0) | none | n/a (n=0) | n/a (n=0) |
| donsetch | fixture | 0.0% (n=140) | 5.0% (n=140) | http_error×14; blocked×7 | n/a (n=0) | n/a (n=0) |
| fetchkeep-http | live | 0.0% (n=168) | 0.0% (n=168) | none | 0.0% (n=168) | 1.00 (n=168) |
| fetchkeep-chromium | live | 0.0% (n=168) | 0.0% (n=168) | none | 0.0% (n=168) | 1.13 (n=168) |
| fetchkeep-lightpanda | live | 0.0% (n=168) | 0.0% (n=168) | none | 0.0% (n=168) | 1.13 (n=168) |
| fetchkeep-auto | live | 0.0% (n=168) | 0.0% (n=168) | none | 12.5% (n=168) | 1.13 (n=168) |
| firecrawl-selfhost | live | 0.0% (n=168) | 0.0% (n=168) | http_error×7 | n/a (n=0) | n/a (n=0) |
| firecrawl-hosted | live | n/a (n=0) | n/a (n=0) | none | n/a (n=0) | n/a (n=0) |
| donsetch | live | 0.0% (n=168) | 4.2% (n=168) | blocked×7 | n/a (n=0) | n/a (n=0) |

## Latency

Percentiles use the nearest-rank method: sort the latencies of `ok` tasks ascending and take the value at rank ceil(p/100 × n). `first` = the first pass over each case (repetition 1), not a new process per case; `warm` = later passes (repetitions ≥ 2). Persistent MCP sessions span the run and browser launch is lazy. Unpaired per-profile latency cohorts can differ; use the paired section for same-case, same-repetition comparisons.

| profile | dataset | first p50 | first p95 | warm p50 | warm p95 |
|---|---|---|---|---|---|
| fetchkeep-http | fixture | 13 ms (n=17) | 2734 ms (n=17) | 6 ms (n=102) | 2502 ms (n=102) |
| fetchkeep-chromium | fixture | 609 ms (n=17) | 4007 ms (n=17) | 583 ms (n=102) | 3064 ms (n=102) |
| fetchkeep-lightpanda | fixture | 539 ms (n=17) | 3071 ms (n=17) | 531 ms (n=102) | 3020 ms (n=102) |
| fetchkeep-auto | fixture | 13 ms (n=17) | 2505 ms (n=17) | 6 ms (n=102) | 2503 ms (n=102) |
| firecrawl-selfhost | fixture | 108 ms (n=16) | 2637 ms (n=16) | 89 ms (n=97) | 2580 ms (n=97) |
| firecrawl-hosted | fixture | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) |
| donsetch | fixture | 4 ms (n=17) | 4931 ms (n=17) | 4 ms (n=102) | 4234 ms (n=102) |
| fetchkeep-http | live | 438 ms (n=24) | 1698 ms (n=24) | 372 ms (n=144) | 1277 ms (n=144) |
| fetchkeep-chromium | live | 1422 ms (n=24) | 2761 ms (n=24) | 1334 ms (n=144) | 2864 ms (n=144) |
| fetchkeep-lightpanda | live | 1187 ms (n=24) | 3171 ms (n=24) | 1214 ms (n=144) | 3021 ms (n=144) |
| fetchkeep-auto | live | 446 ms (n=24) | 2008 ms (n=24) | 426 ms (n=144) | 1963 ms (n=144) |
| firecrawl-selfhost | live | 946 ms (n=23) | 3569 ms (n=23) | 845 ms (n=138) | 7820 ms (n=138) |
| firecrawl-hosted | live | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) |
| donsetch | live | 414 ms (n=23) | 947 ms (n=23) | 318 ms (n=138) | 952 ms (n=138) |

## Crawl

Coverage = expected pages found / expected pages (mean over tasks that ran). Forbidden = robots-disallowed or out-of-scope pages returned (summed). Duplicate rate = duplicate pages / pages returned. Latency p50 over ok tasks (nearest rank).

| case | profile | tasks | outcomes | coverage | pages returned (mean) | forbidden returned | duplicate rate | latency p50 | stop reason(s) | missing pages |
|---|---|---|---|---|---|---|---|---|---|---|
| live-crawl-quotes | fetchkeep-http | 7 | ok 7 / error 0 | 0.667 (n=7) | 15.000 (n=7) | 0 | 0.000 (n=7) | 7615 ms (n=7) | page_limit | https://quotes.toscrape.com/page/2/ |
| live-crawl-quotes | fetchkeep-chromium | 7 | ok 7 / error 0 | 0.667 (n=7) | 15.000 (n=7) | 0 | 0.000 (n=7) | 12234 ms (n=7) | page_limit | https://quotes.toscrape.com/page/2/ |
| live-crawl-quotes | fetchkeep-lightpanda | 7 | ok 7 / error 0 | 0.667 (n=7) | 15.000 (n=7) | 0 | 0.000 (n=7) | 9083 ms (n=7) | page_limit | https://quotes.toscrape.com/page/2/ |
| live-crawl-quotes | fetchkeep-auto | 7 | ok 7 / error 0 | 0.667 (n=7) | 15.000 (n=7) | 0 | 0.000 (n=7) | 7637 ms (n=7) | page_limit | https://quotes.toscrape.com/page/2/ |
| live-crawl-quotes | firecrawl-selfhost | 7 | ok 7 / error 0 | 0.667 (n=7) | 15.000 (n=7) | 0 | 0.000 (n=7) | 17360 ms (n=7) | completed | https://quotes.toscrape.com/page/2/ |
| live-crawl-quotes | firecrawl-hosted | 7 | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×7) | n/a | n/a | n/a | n/a | n/a | n/a |  |
| live-crawl-quotes | donsetch | 7 | ok 7 / error 0 | 0.619 (n=7) | 13.714 (n=7) | 0 | 0.000 (n=7) | 6016 ms (n=7) | MaxPages | https://quotes.toscrape.com/login, https://quotes.toscrape.com/page/2/ |
| fx-crawl-estuary | fetchkeep-http | 7 | ok 7 / error 0 | 1.000 (n=7) | 13.000 (n=7) | 0 | 0.000 (n=7) | 6520 ms (n=7) | depth_limit |  |
| fx-crawl-estuary | fetchkeep-chromium | 7 | ok 7 / error 0 | 1.000 (n=7) | 13.000 (n=7) | 0 | 0.000 (n=7) | 7098 ms (n=7) | depth_limit |  |
| fx-crawl-estuary | fetchkeep-lightpanda | 7 | ok 7 / error 0 | 1.000 (n=7) | 13.000 (n=7) | 0 | 0.000 (n=7) | 7041 ms (n=7) | depth_limit |  |
| fx-crawl-estuary | fetchkeep-auto | 7 | ok 7 / error 0 | 1.000 (n=7) | 13.000 (n=7) | 0 | 0.000 (n=7) | 6521 ms (n=7) | depth_limit |  |
| fx-crawl-estuary | firecrawl-selfhost | 7 | ok 7 / error 0 | 1.000 (n=7) | 14.714 (n=7) | 5 | 0.068 (n=7) | 10752 ms (n=7) | completed |  |
| fx-crawl-estuary | firecrawl-hosted | 7 | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×7) | n/a | n/a | n/a | n/a | n/a | n/a |  |
| fx-crawl-estuary | donsetch | 7 | ok 7 / error 0 | 0.846 (n=7) | 12.000 (n=7) | 7 | 0.000 (n=7) | 4176 ms (n=7) | FrontierEmpty | /crawl/plants/samphire-copy.html, /crawl/hidden/lighthouse.html, /crawl/plants/samphire.html |

## Resources

Scope matters: a local process tree, a whole Docker stack and a remote service are different things. Numbers are only comparable between profiles with the same scope; remote services cannot be measured and are never compared.

| profile | engine | scope | CPU (run) | peak RSS | idle RSS | samples | note |
|---|---|---|---|---|---|---|---|
| fetchkeep-http | fetchkeep | local process tree (engine process + children) | 57.13 s | 527.7 MB | 94.3 MB | 8621 |  |
| fetchkeep-chromium | fetchkeep | local process tree (engine process + children) | 268.88 s | 1169.5 MB | 94.0 MB | 8619 |  |
| fetchkeep-lightpanda | fetchkeep | local process tree (engine process + children) | 112.40 s | 608.6 MB | 94.7 MB | 8616 |  |
| fetchkeep-auto | fetchkeep | local process tree (engine process + children) | 85.64 s | 1187.1 MB | 94.1 MB | 8614 |  |
| firecrawl-selfhost | firecrawl | whole Docker stack (all containers of the engine) | 886.40 s | 4074.8 MB | 3565.9 MB | 8594 |  |
| donsetch | donsetch | local process tree (engine process + children) | 18.19 s | 3075.8 MB | 15.5 MB | 8612 |  |
| firecrawl-hosted | firecrawl | remote service — not measurable | not measurable | not measurable | not measurable | 0 | engine not started |

Measured scopes differ (process-tree, docker-stack): peak RSS bars below are labelled with their scope and are not like-for-like.

## Cold start

| profile | engine | method | p50 | min | max | samples |
|---|---|---|---|---|---|---|
| fetchkeep-http | fetchkeep | CLI one-shot: node dist/src/cli/main.js --json fetch <fixture> (process spawn → result → exit) | 427 ms (n=5) | 416 ms | 658 ms | 658, 427, 501, 418, 416 |
| fetchkeep-chromium | fetchkeep | CLI one-shot: node dist/src/cli/main.js --json fetch <fixture> (process spawn → result → exit) | 1400 ms (n=5) | 1348 ms | 1645 ms | 1621, 1645, 1400, 1351, 1348 |
| fetchkeep-lightpanda | fetchkeep | CLI one-shot: node dist/src/cli/main.js --json fetch <fixture> (process spawn → result → exit) | 1361 ms (n=5) | 1343 ms | 1451 ms | 1451, 1361, 1361, 1343, 1356 |
| fetchkeep-auto | fetchkeep | CLI one-shot: node dist/src/cli/main.js --json fetch <fixture> (process spawn → result → exit) | 382 ms (n=5) | 373 ms | 409 ms | 398, 382, 373, 409, 378 |
| firecrawl-selfhost | firecrawl | docker compose stop → docker compose up -d api → first successful /v2/scrape of a local fixture | 27083 ms (n=3) | 25613 ms | 43894 ms | 43894, 25613, 27083 |
| donsetch | donsetch | CLI one-shot: donsetch fetch <fixture> --json (process spawn → result → exit) | 43 ms (n=5) | 41 ms | 64 ms | 64, 43, 41, 43, 43 |

Cold-start methods differ per engine (see the method column); compare only rows that measure the same thing.

## Footprint

| profile | engine | component | size | bytes | method |
|---|---|---|---|---|---|
| fetchkeep-http | fetchkeep | npm tarball | 131.9 KiB | 135023 | npm pack |
| fetchkeep-http | fetchkeep | node_modules (fetchkeep + runtime deps, no browser) | 96.7 MiB | 101383870 | npm install <tarball> --omit=dev; du -sb node_modules |
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
| fetchkeep-http | fixture | 1.000 (n=105) |
| fetchkeep-chromium | fixture | 1.000 (n=119) |
| fetchkeep-lightpanda | fixture | 1.000 (n=119) |
| fetchkeep-auto | fixture | 1.000 (n=119) |
| fetchkeep-http | live | 1.000 (n=147) |
| fetchkeep-chromium | live | 1.000 (n=161) |
| fetchkeep-lightpanda | live | 1.000 (n=161) |
| fetchkeep-auto | live | 1.000 (n=161) |

## Unsupported / N/A / unavailable

### Unavailable engines

- firecrawl-hosted (firecrawl): unavailable — FIRECRAWL_API_KEY is not set

### Tasks not run (unavailable / N/A)

- firecrawl-hosted — live fetch: unavailable for 168 task(s) (engine unavailable: FIRECRAWL_API_KEY is not set); cases: live-rust-book-control-flow, live-quotes-toscrape-js, live-github-flask-readme, live-crates-io-serde, live-quotes-toscrape-js-delayed, live-iana-http-status-codes, live-nodejs-path, live-rfc9309-txt … (+16 more)
- firecrawl-hosted — fixture fetch: unavailable for 140 task(s) (engine unavailable: FIRECRAWL_API_KEY is not set); cases: fx-tables, fx-pdf-3page, fx-pdf, fx-article-long, fx-js-spa, fx-code, fx-table-financial, fx-404 … (+12 more)
- firecrawl-hosted — fixture crawl: unavailable for 7 task(s) (engine unavailable: FIRECRAWL_API_KEY is not set); cases: fx-crawl-estuary
- firecrawl-hosted — live crawl: unavailable for 7 task(s) (engine unavailable: FIRECRAWL_API_KEY is not set); cases: live-crawl-quotes

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
- Percentiles use the nearest-rank method: sort the latencies of `ok` tasks ascending and take the value at rank ceil(p/100 × n). `first` = the first pass over each case (repetition 1), not a new process per case; `warm` = later passes (repetitions ≥ 2). Persistent MCP sessions span the run and browser launch is lazy. Unpaired per-profile latency cohorts can differ; use the paired section for same-case, same-repetition comparisons.

### Trade-offs on fixture tasks (derived from this run only)

- Usable rate: tie between fetchkeep-chromium 100.0% (n=119), fetchkeep-lightpanda 100.0% (n=119), fetchkeep-auto 100.0% (n=119), donsetch 100.0% (n=119).
- Passage recall: tie between fetchkeep-chromium 1.000 (n=119), fetchkeep-lightpanda 1.000 (n=119), fetchkeep-auto 1.000 (n=119), firecrawl-selfhost 1.000 (n=113), donsetch 1.000 (n=119).
- Boilerplate exclusion: tie between fetchkeep-http 0.950 (n=70), fetchkeep-chromium 0.950 (n=70), fetchkeep-lightpanda 0.950 (n=70), fetchkeep-auto 0.950 (n=70).
- Token F1: fetchkeep-auto 0.973 (n=63) vs next-best fetchkeep-http 0.973 (n=63) — descriptive margin below 0.05; not a significance test.
- Unpaired warm p50 latency: donsetch 4 ms (n=102) vs next-best fetchkeep-http 6 ms (n=102).
- Unpaired first-pass p50 latency: donsetch 4 ms (n=17) vs next-best fetchkeep-http 13 ms (n=17).

Per workload (category) on fixture: usable rate and unpaired warm p50 per profile. These are descriptive leaders, not significance claims: success cohorts can differ and repeated attempts are not independent cases. Consult the case-cluster intervals and paired comparison before drawing a speed conclusion.

| category | fetchkeep-http | fetchkeep-chromium | fetchkeep-lightpanda | fetchkeep-auto | firecrawl-selfhost | firecrawl-hosted | donsetch | leaders (usable rate; warm p50) |
|---|---|---|---|---|---|---|---|---|
| article | 100.0% (n=14); warm p50 6 ms (n=12) | 100.0% (n=14); warm p50 584 ms (n=12) | 100.0% (n=14); warm p50 526 ms (n=12) | 100.0% (n=14); warm p50 6 ms (n=12) | 100.0% (n=14); warm p50 88 ms (n=12) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×14) | 100.0% (n=14); warm p50 4 ms (n=12) | usable: tie between fetchkeep-http 100.0% (n=14), fetchkeep-chromium 100.0% (n=14), fetchkeep-lightpanda 100.0% (n=14), fetchkeep-auto 100.0% (n=14), firecrawl-selfhost 100.0% (n=14), donsetch 100.0% (n=14). unpaired warm p50: donsetch 4 ms (n=12) vs next-best fetchkeep-http 6 ms (n=12). |
| code | 100.0% (n=7); warm p50 4 ms (n=6) | 100.0% (n=7); warm p50 585 ms (n=6) | 100.0% (n=7); warm p50 527 ms (n=6) | 100.0% (n=7); warm p50 4 ms (n=6) | 100.0% (n=7); warm p50 84 ms (n=6) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×7) | 100.0% (n=7); warm p50 3 ms (n=6) | usable: tie between fetchkeep-http 100.0% (n=7), fetchkeep-chromium 100.0% (n=7), fetchkeep-lightpanda 100.0% (n=7), fetchkeep-auto 100.0% (n=7), firecrawl-selfhost 100.0% (n=7), donsetch 100.0% (n=7) — small sample (n=7). unpaired warm p50: donsetch 3 ms (n=6) vs next-best fetchkeep-auto 4 ms (n=6) — small sample (n=6). |
| docs | 100.0% (n=14); warm p50 5 ms (n=12) | 100.0% (n=14); warm p50 589 ms (n=12) | 100.0% (n=14); warm p50 531 ms (n=12) | 100.0% (n=14); warm p50 6 ms (n=12) | 100.0% (n=14); warm p50 92 ms (n=12) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×14) | 100.0% (n=14); warm p50 3 ms (n=12) | usable: tie between fetchkeep-http 100.0% (n=14), fetchkeep-chromium 100.0% (n=14), fetchkeep-lightpanda 100.0% (n=14), fetchkeep-auto 100.0% (n=14), firecrawl-selfhost 100.0% (n=14), donsetch 100.0% (n=14). unpaired warm p50: donsetch 3 ms (n=12) vs next-best fetchkeep-http 5 ms (n=12). |
| encoding | 100.0% (n=7); warm p50 4 ms (n=6) | 100.0% (n=7); warm p50 584 ms (n=6) | 100.0% (n=7); warm p50 522 ms (n=6) | 100.0% (n=7); warm p50 3 ms (n=6) | 100.0% (n=7); warm p50 89 ms (n=6) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×7) | 100.0% (n=7); warm p50 3 ms (n=6) | usable: tie between fetchkeep-http 100.0% (n=7), fetchkeep-chromium 100.0% (n=7), fetchkeep-lightpanda 100.0% (n=7), fetchkeep-auto 100.0% (n=7), firecrawl-selfhost 100.0% (n=7), donsetch 100.0% (n=7) — small sample (n=7). unpaired warm p50: donsetch 3 ms (n=6) vs next-best fetchkeep-auto 3 ms (n=6) — descriptive margin within 10% of the runner-up; not a significance test; small sample (n=6). |
| failure | n/a (n=0); warm p50 n/a (n=0) | n/a (n=0); warm p50 n/a (n=0) | n/a (n=0); warm p50 n/a (n=0) | n/a (n=0); warm p50 n/a (n=0) | n/a (n=0); warm p50 n/a (n=0) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×21) | n/a (n=0); warm p50 n/a (n=0) | no comparable data |
| js | 33.3% (n=21); warm p50 3 ms (n=18) | 100.0% (n=21); warm p50 576 ms (n=18) | 100.0% (n=21); warm p50 527 ms (n=18) | 100.0% (n=21); warm p50 593 ms (n=18) | 71.4% (n=21); warm p50 96 ms (n=13) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×21) | 100.0% (n=21); warm p50 4 ms (n=18) | usable: tie between fetchkeep-chromium 100.0% (n=21), fetchkeep-lightpanda 100.0% (n=21), fetchkeep-auto 100.0% (n=21), donsetch 100.0% (n=21). unpaired warm p50: fetchkeep-http 3 ms (n=18) vs next-best donsetch 4 ms (n=18) — descriptive margin within 10% of the runner-up; not a significance test. |
| latency | 100.0% (n=7); warm p50 2504 ms (n=6) | 100.0% (n=7); warm p50 3071 ms (n=6) | 100.0% (n=7); warm p50 3022 ms (n=6) | 100.0% (n=7); warm p50 2504 ms (n=6) | 100.0% (n=7); warm p50 2588 ms (n=6) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×7) | 100.0% (n=7); warm p50 2504 ms (n=6) | usable: tie between fetchkeep-http 100.0% (n=7), fetchkeep-chromium 100.0% (n=7), fetchkeep-lightpanda 100.0% (n=7), fetchkeep-auto 100.0% (n=7), firecrawl-selfhost 100.0% (n=7), donsetch 100.0% (n=7) — small sample (n=7). unpaired warm p50: tie between fetchkeep-http 2504 ms (n=6), fetchkeep-auto 2504 ms (n=6), donsetch 2504 ms (n=6) — small sample (n=6). |
| nav-heavy | 100.0% (n=7); warm p50 8 ms (n=6) | 100.0% (n=7); warm p50 583 ms (n=6) | 100.0% (n=7); warm p50 534 ms (n=6) | 100.0% (n=7); warm p50 8 ms (n=6) | 100.0% (n=7); warm p50 86 ms (n=6) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×7) | 100.0% (n=7); warm p50 3 ms (n=6) | usable: tie between fetchkeep-http 100.0% (n=7), fetchkeep-chromium 100.0% (n=7), fetchkeep-lightpanda 100.0% (n=7), fetchkeep-auto 100.0% (n=7), firecrawl-selfhost 100.0% (n=7), donsetch 100.0% (n=7) — small sample (n=7). unpaired warm p50: donsetch 3 ms (n=6) vs next-best fetchkeep-http 8 ms (n=6) — small sample (n=6). |
| pdf | 100.0% (n=14); warm p50 8 ms (n=12) | 100.0% (n=14); warm p50 50 ms (n=12) | 100.0% (n=14); warm p50 2023 ms (n=12) | 100.0% (n=14); warm p50 7 ms (n=12) | 100.0% (n=14); warm p50 25 ms (n=12) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×14) | 100.0% (n=14); warm p50 29 ms (n=12) | usable: tie between fetchkeep-http 100.0% (n=14), fetchkeep-chromium 100.0% (n=14), fetchkeep-lightpanda 100.0% (n=14), fetchkeep-auto 100.0% (n=14), firecrawl-selfhost 100.0% (n=14), donsetch 100.0% (n=14). unpaired warm p50: fetchkeep-auto 7 ms (n=12) vs next-best fetchkeep-http 8 ms (n=12). |
| plain | 100.0% (n=7); warm p50 2 ms (n=6) | 100.0% (n=7); warm p50 579 ms (n=6) | 100.0% (n=7); warm p50 529 ms (n=6) | 100.0% (n=7); warm p50 2 ms (n=6) | 100.0% (n=7); warm p50 82 ms (n=6) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×7) | 100.0% (n=7); warm p50 2 ms (n=6) | usable: tie between fetchkeep-http 100.0% (n=7), fetchkeep-chromium 100.0% (n=7), fetchkeep-lightpanda 100.0% (n=7), fetchkeep-auto 100.0% (n=7), firecrawl-selfhost 100.0% (n=7), donsetch 100.0% (n=7) — small sample (n=7). unpaired warm p50: donsetch 2 ms (n=6) vs next-best fetchkeep-http 2 ms (n=6) — small sample (n=6). |
| redirect | 100.0% (n=7); warm p50 8 ms (n=6) | 100.0% (n=7); warm p50 592 ms (n=6) | 100.0% (n=7); warm p50 534 ms (n=6) | 100.0% (n=7); warm p50 9 ms (n=6) | 100.0% (n=7); warm p50 91 ms (n=6) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×7) | 100.0% (n=7); warm p50 4 ms (n=6) | usable: tie between fetchkeep-http 100.0% (n=7), fetchkeep-chromium 100.0% (n=7), fetchkeep-lightpanda 100.0% (n=7), fetchkeep-auto 100.0% (n=7), firecrawl-selfhost 100.0% (n=7), donsetch 100.0% (n=7) — small sample (n=7). unpaired warm p50: donsetch 4 ms (n=6) vs next-best fetchkeep-http 8 ms (n=6) — small sample (n=6). |
| table | 100.0% (n=14); warm p50 5 ms (n=12) | 100.0% (n=14); warm p50 583 ms (n=12) | 100.0% (n=14); warm p50 528 ms (n=12) | 100.0% (n=14); warm p50 6 ms (n=12) | 100.0% (n=14); warm p50 96 ms (n=12) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×14) | 100.0% (n=14); warm p50 4 ms (n=12) | usable: tie between fetchkeep-http 100.0% (n=14), fetchkeep-chromium 100.0% (n=14), fetchkeep-lightpanda 100.0% (n=14), fetchkeep-auto 100.0% (n=14), firecrawl-selfhost 100.0% (n=14), donsetch 100.0% (n=14). unpaired warm p50: donsetch 4 ms (n=12) vs next-best fetchkeep-http 5 ms (n=12). |

### Trade-offs on live tasks (derived from this run only)

- Usable rate: tie between fetchkeep-chromium 95.8% (n=168), fetchkeep-lightpanda 95.8% (n=168), fetchkeep-auto 95.8% (n=168).
- Passage recall: tie between fetchkeep-chromium 0.958 (n=168), fetchkeep-lightpanda 0.958 (n=168), fetchkeep-auto 0.958 (n=168).
- Boilerplate exclusion: tie between fetchkeep-http 0.875 (n=112), fetchkeep-chromium 0.875 (n=112), fetchkeep-lightpanda 0.875 (n=112), fetchkeep-auto 0.875 (n=112).
- Unpaired warm p50 latency: donsetch 318 ms (n=138) vs next-best fetchkeep-http 372 ms (n=144).
- Unpaired first-pass p50 latency: donsetch 414 ms (n=23) vs next-best fetchkeep-http 438 ms (n=24) — descriptive margin within 10% of the runner-up; not a significance test.

Per workload (category) on live: usable rate and unpaired warm p50 per profile. These are descriptive leaders, not significance claims: success cohorts can differ and repeated attempts are not independent cases. Consult the case-cluster intervals and paired comparison before drawing a speed conclusion.

| category | fetchkeep-http | fetchkeep-chromium | fetchkeep-lightpanda | fetchkeep-auto | firecrawl-selfhost | firecrawl-hosted | donsetch | leaders (usable rate; warm p50) |
|---|---|---|---|---|---|---|---|---|
| article | 100.0% (n=14); warm p50 504 ms (n=12) | 100.0% (n=14); warm p50 1486 ms (n=12) | 100.0% (n=14); warm p50 1374 ms (n=12) | 100.0% (n=14); warm p50 643 ms (n=12) | 100.0% (n=14); warm p50 987 ms (n=12) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×14) | 100.0% (n=14); warm p50 359 ms (n=12) | usable: tie between fetchkeep-http 100.0% (n=14), fetchkeep-chromium 100.0% (n=14), fetchkeep-lightpanda 100.0% (n=14), fetchkeep-auto 100.0% (n=14), firecrawl-selfhost 100.0% (n=14), donsetch 100.0% (n=14). unpaired warm p50: donsetch 359 ms (n=12) vs next-best fetchkeep-http 504 ms (n=12). |
| code | 100.0% (n=7); warm p50 719 ms (n=6) | 100.0% (n=7); warm p50 2419 ms (n=6) | 100.0% (n=7); warm p50 3242 ms (n=6) | 100.0% (n=7); warm p50 641 ms (n=6) | 100.0% (n=7); warm p50 2185 ms (n=6) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×7) | 100.0% (n=7); warm p50 568 ms (n=6) | usable: tie between fetchkeep-http 100.0% (n=7), fetchkeep-chromium 100.0% (n=7), fetchkeep-lightpanda 100.0% (n=7), fetchkeep-auto 100.0% (n=7), firecrawl-selfhost 100.0% (n=7), donsetch 100.0% (n=7) — small sample (n=7). unpaired warm p50: donsetch 568 ms (n=6) vs next-best fetchkeep-auto 641 ms (n=6) — small sample (n=6). |
| docs | 100.0% (n=42); warm p50 255 ms (n=36) | 100.0% (n=42); warm p50 1189 ms (n=36) | 100.0% (n=42); warm p50 1019 ms (n=36) | 100.0% (n=42); warm p50 248 ms (n=36) | 100.0% (n=42); warm p50 678 ms (n=36) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×42) | 100.0% (n=42); warm p50 153 ms (n=36) | usable: tie between fetchkeep-http 100.0% (n=42), fetchkeep-chromium 100.0% (n=42), fetchkeep-lightpanda 100.0% (n=42), fetchkeep-auto 100.0% (n=42), firecrawl-selfhost 100.0% (n=42), donsetch 100.0% (n=42). unpaired warm p50: donsetch 153 ms (n=36) vs next-best fetchkeep-auto 248 ms (n=36). |
| forum | 100.0% (n=7); warm p50 1277 ms (n=6) | 100.0% (n=7); warm p50 2159 ms (n=6) | 100.0% (n=7); warm p50 1921 ms (n=6) | 100.0% (n=7); warm p50 1172 ms (n=6) | 100.0% (n=7); warm p50 1676 ms (n=6) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×7) | 100.0% (n=7); warm p50 942 ms (n=6) | usable: tie between fetchkeep-http 100.0% (n=7), fetchkeep-chromium 100.0% (n=7), fetchkeep-lightpanda 100.0% (n=7), fetchkeep-auto 100.0% (n=7), firecrawl-selfhost 100.0% (n=7), donsetch 100.0% (n=7) — small sample (n=7). unpaired warm p50: donsetch 942 ms (n=6) vs next-best fetchkeep-auto 1172 ms (n=6) — small sample (n=6). |
| js | 0.0% (n=21); warm p50 363 ms (n=18) | 66.7% (n=21); warm p50 1489 ms (n=18) | 66.7% (n=21); warm p50 1151 ms (n=18) | 66.7% (n=21); warm p50 1843 ms (n=18) | 33.3% (n=21); warm p50 998 ms (n=12) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×21) | 33.3% (n=21); warm p50 500 ms (n=12) | usable: tie between fetchkeep-chromium 66.7% (n=21), fetchkeep-lightpanda 66.7% (n=21), fetchkeep-auto 66.7% (n=21). unpaired warm p50: fetchkeep-http 363 ms (n=18) vs next-best donsetch 500 ms (n=12). |
| nav-heavy | 100.0% (n=14); warm p50 275 ms (n=12) | 100.0% (n=14); warm p50 1272 ms (n=12) | 100.0% (n=14); warm p50 892 ms (n=12) | 100.0% (n=14); warm p50 221 ms (n=12) | 100.0% (n=14); warm p50 551 ms (n=12) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×14) | 100.0% (n=14); warm p50 44 ms (n=12) | usable: tie between fetchkeep-http 100.0% (n=14), fetchkeep-chromium 100.0% (n=14), fetchkeep-lightpanda 100.0% (n=14), fetchkeep-auto 100.0% (n=14), firecrawl-selfhost 100.0% (n=14), donsetch 100.0% (n=14). unpaired warm p50: donsetch 44 ms (n=12) vs next-best fetchkeep-auto 221 ms (n=12). |
| news | 100.0% (n=7); warm p50 117 ms (n=6) | 100.0% (n=7); warm p50 988 ms (n=6) | 100.0% (n=7); warm p50 690 ms (n=6) | 100.0% (n=7); warm p50 116 ms (n=6) | 100.0% (n=7); warm p50 347 ms (n=6) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×7) | 100.0% (n=7); warm p50 25 ms (n=6) | usable: tie between fetchkeep-http 100.0% (n=7), fetchkeep-chromium 100.0% (n=7), fetchkeep-lightpanda 100.0% (n=7), fetchkeep-auto 100.0% (n=7), firecrawl-selfhost 100.0% (n=7), donsetch 100.0% (n=7) — small sample (n=7). unpaired warm p50: donsetch 25 ms (n=6) vs next-best fetchkeep-auto 116 ms (n=6) — small sample (n=6). |
| pdf | 100.0% (n=14); warm p50 456 ms (n=12) | 100.0% (n=14); warm p50 847 ms (n=12) | 100.0% (n=14); warm p50 2747 ms (n=12) | 100.0% (n=14); warm p50 442 ms (n=12) | 100.0% (n=14); warm p50 443 ms (n=12) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×14) | 100.0% (n=14); warm p50 277 ms (n=12) | usable: tie between fetchkeep-http 100.0% (n=14), fetchkeep-chromium 100.0% (n=14), fetchkeep-lightpanda 100.0% (n=14), fetchkeep-auto 100.0% (n=14), firecrawl-selfhost 100.0% (n=14), donsetch 100.0% (n=14). unpaired warm p50: donsetch 277 ms (n=12) vs next-best fetchkeep-auto 442 ms (n=12). |
| plain | 100.0% (n=14); warm p50 126 ms (n=12) | 100.0% (n=14); warm p50 810 ms (n=12) | 100.0% (n=14); warm p50 790 ms (n=12) | 100.0% (n=14); warm p50 123 ms (n=12) | 100.0% (n=14); warm p50 296 ms (n=12) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×14) | 100.0% (n=14); warm p50 185 ms (n=12) | usable: tie between fetchkeep-http 100.0% (n=14), fetchkeep-chromium 100.0% (n=14), fetchkeep-lightpanda 100.0% (n=14), fetchkeep-auto 100.0% (n=14), firecrawl-selfhost 100.0% (n=14), donsetch 100.0% (n=14). unpaired warm p50: fetchkeep-auto 123 ms (n=12) vs next-best fetchkeep-http 126 ms (n=12) — descriptive margin within 10% of the runner-up; not a significance test. |
| reference | 100.0% (n=7); warm p50 540 ms (n=6) | 100.0% (n=7); warm p50 1311 ms (n=6) | 100.0% (n=7); warm p50 1066 ms (n=6) | 100.0% (n=7); warm p50 539 ms (n=6) | 100.0% (n=7); warm p50 807 ms (n=6) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×7) | 100.0% (n=7); warm p50 768 ms (n=6) | usable: tie between fetchkeep-http 100.0% (n=7), fetchkeep-chromium 100.0% (n=7), fetchkeep-lightpanda 100.0% (n=7), fetchkeep-auto 100.0% (n=7), firecrawl-selfhost 100.0% (n=7), donsetch 100.0% (n=7) — small sample (n=7). unpaired warm p50: fetchkeep-auto 539 ms (n=6) vs next-best fetchkeep-http 540 ms (n=6) — descriptive margin within 10% of the runner-up; not a significance test; small sample (n=6). |
| table | 100.0% (n=21); warm p50 537 ms (n=18) | 100.0% (n=21); warm p50 1505 ms (n=18) | 100.0% (n=21); warm p50 1371 ms (n=18) | 100.0% (n=21); warm p50 476 ms (n=18) | 100.0% (n=21); warm p50 2093 ms (n=18) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×21) | 100.0% (n=21); warm p50 378 ms (n=18) | usable: tie between fetchkeep-http 100.0% (n=21), fetchkeep-chromium 100.0% (n=21), fetchkeep-lightpanda 100.0% (n=21), fetchkeep-auto 100.0% (n=21), firecrawl-selfhost 100.0% (n=21), donsetch 100.0% (n=21). unpaired warm p50: donsetch 378 ms (n=18) vs next-best fetchkeep-auto 476 ms (n=18). |

## Reproduce

Re-run with:

```
npm run bench -- --engines fetchkeep-http,fetchkeep-chromium,fetchkeep-lightpanda,fetchkeep-auto,firecrawl-selfhost,firecrawl-hosted,donsetch --suite full --repetitions 7 --seed 42 --timeout 30000 --cold-start --footprint
```

| dataset | path | sha256 | cases |
|---|---|---|---|
| fixtures | bench/datasets/fixtures.json | 8c7b0a6f99ea2f1fd5551747be2df264f7fbfacc03973227cc484e740f576749 | 21 |
| live | bench/datasets/live.json | d458c8afc2696bd34699711b710ebee36bfbaf2f9557ae1893b31090ae6f7474 | 24 |
| live-crawl | bench/datasets/live-crawl.json | 166f4d2d133883c97d2b24c57650f1f9edd4e72d02611cda8b2e98d5a164ec75 | 1 |
| validation | bench/datasets/validation.json | caa8737e5306aeb6bcc3c0c4fe8fd55f1b2f58dc64c8061f13ca252fe980eb22 | 8 |
| fixture-files | bench/fixtures/SHA256SUMS | e01dee584a5d110dded06d10b68e2c8d2ebbdbd00a638fcff7f238c5d9362479 | 0 |

Per-case outputs: see `cases.csv` and the per-case inspection section of `report.html`; raw engine output is under `raw/`.
