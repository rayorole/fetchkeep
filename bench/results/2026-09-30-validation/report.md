# Fetchkeep benchmark report — validation — 2026-09-30T19-24-48-validation

## Summary of what was run

- Suite: validation; run id: 2026-09-30T19-24-48-validation
- Started 2026-09-30T19:24:48.148Z, finished 2026-09-30T19:27:31.063Z
- Seed: 42; repetitions per case: 7; per-task timeout: 30000 ms; concurrency: 1
- Tokenizer: gpt-tokenizer (o200k_base, version 4.0.0)
- Fetch tasks: 392 over 8 cases; crawl tasks: 0
- Profiles: fetchkeep-http, fetchkeep-chromium, fetchkeep-lightpanda, fetchkeep-auto, firecrawl-selfhost, firecrawl-hosted, donsetch
- Fixture server: http://172.31.172.243:45387 (bound to 0.0.0.0)
- Command: `node bench/run.ts --engines fetchkeep,firecrawl,donsetch --suite validation --repetitions 7 --out bench/runs/2026-09-30-validation`
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
| fetchkeep-http | fetchkeep | 0.1.2 | 35c170126b455eaeb032b6e8d20b9fb83cc3eb75 | MCP stdio (web_fetch / web_crawl / web_read), warm server per profile | yes |  | 419 ms |
| fetchkeep-chromium | fetchkeep | 0.1.2 | 35c170126b455eaeb032b6e8d20b9fb83cc3eb75 | MCP stdio (web_fetch / web_crawl / web_read), warm server per profile | yes |  | 427 ms |
| fetchkeep-lightpanda | fetchkeep | 0.1.2 | 35c170126b455eaeb032b6e8d20b9fb83cc3eb75 | MCP stdio (web_fetch / web_crawl / web_read), warm server per profile | yes |  | 619 ms |
| fetchkeep-auto | fetchkeep | 0.1.2 | 35c170126b455eaeb032b6e8d20b9fb83cc3eb75 | MCP stdio (web_fetch / web_crawl / web_read), warm server per profile | yes |  | 465 ms |
| firecrawl-selfhost | firecrawl | apps/api 1.0.0 (self-hosted build) | 7e4a959dca0efbdad2f0a9d82b0fce20afeb9a4d | REST API v2 (http://localhost:3002) | yes |  | 0 ms |
| firecrawl-hosted | firecrawl | hosted API v2 | hosted service (version not exposed) | REST API v2 (https://api.firecrawl.dev) | no | FIRECRAWL_API_KEY is not set | n/a |
| donsetch | donsetch | 4.4.1 | v4.4.1 release binary (npm donsetch@4.4.1) | MCP stdio (web_fetch / web_crawl), warm server | yes |  | 101 ms |

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

Common tasks: 8 of 8 fixture cases were attempted by every profile that ran any fixture task (fetchkeep-http, fetchkeep-chromium, fetchkeep-lightpanda, fetchkeep-auto, firecrawl-selfhost, donsetch). This is the like-for-like comparison.

| profile | tasks | ok / error / unavail. / N/A | success | usable | passage recall | boilerplate excl. | token F1 | first p50 | warm p50 | warm p95 | correct error | cost |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| fetchkeep-http | 56 | 56 / 0 / 0 / 0 | 100.0% (n=56) | 75.0% (n=56) | 0.750 (n=56) | 0.750 (n=28) | 0.782 (n=56) | 8 ms (n=8) | 5 ms (n=48) | 10 ms (n=48) | n/a (n=0) | n/a |
| fetchkeep-chromium | 56 | 56 / 0 / 0 / 0 | 100.0% (n=56) | 87.5% (n=56) | 0.875 (n=56) | 1.000 (n=28) | 0.888 (n=56) | 636 ms (n=8) | 631 ms (n=48) | 2080 ms (n=48) | n/a (n=0) | n/a |
| fetchkeep-lightpanda | 56 | 56 / 0 / 0 / 0 | 100.0% (n=56) | 87.5% (n=56) | 0.875 (n=56) | 1.000 (n=28) | 0.888 (n=56) | 543 ms (n=8) | 531 ms (n=48) | 2022 ms (n=48) | n/a (n=0) | n/a |
| fetchkeep-auto | 56 | 56 / 0 / 0 / 0 | 100.0% (n=56) | 87.5% (n=56) | 0.875 (n=56) | 1.000 (n=28) | 0.888 (n=56) | 9 ms (n=8) | 5 ms (n=48) | 2095 ms (n=48) | n/a (n=0) | n/a |
| firecrawl-selfhost | 56 | 49 / 7 / 0 / 0 | 87.5% (n=56) | 75.0% (n=56) | 0.857 (n=49) | 0.667 (n=21) | 0.879 (n=49) | 213 ms (n=7) | 135 ms (n=42) | 322 ms (n=42) | n/a (n=0) | n/a |
| donsetch | 56 | 49 / 7 / 0 / 0 | 87.5% (n=56) | 75.0% (n=56) | 0.857 (n=49) | 0.667 (n=21) | 0.762 (n=49) | 2 ms (n=7) | 2 ms (n=42) | 9 ms (n=42) | n/a (n=0) | n/a |

All fixture tasks per profile (includes cases only some profiles could run):

| profile | tasks | ok / error / unavail. / N/A | success | usable | passage recall | boilerplate excl. | token F1 | first p50 | warm p50 | warm p95 | correct error | cost |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| fetchkeep-http | 56 | 56 / 0 / 0 / 0 | 100.0% (n=56) | 75.0% (n=56) | 0.750 (n=56) | 0.750 (n=28) | 0.782 (n=56) | 8 ms (n=8) | 5 ms (n=48) | 10 ms (n=48) | n/a (n=0) | n/a |
| fetchkeep-chromium | 56 | 56 / 0 / 0 / 0 | 100.0% (n=56) | 87.5% (n=56) | 0.875 (n=56) | 1.000 (n=28) | 0.888 (n=56) | 636 ms (n=8) | 631 ms (n=48) | 2080 ms (n=48) | n/a (n=0) | n/a |
| fetchkeep-lightpanda | 56 | 56 / 0 / 0 / 0 | 100.0% (n=56) | 87.5% (n=56) | 0.875 (n=56) | 1.000 (n=28) | 0.888 (n=56) | 543 ms (n=8) | 531 ms (n=48) | 2022 ms (n=48) | n/a (n=0) | n/a |
| fetchkeep-auto | 56 | 56 / 0 / 0 / 0 | 100.0% (n=56) | 87.5% (n=56) | 0.875 (n=56) | 1.000 (n=28) | 0.888 (n=56) | 9 ms (n=8) | 5 ms (n=48) | 2095 ms (n=48) | n/a (n=0) | n/a |
| firecrawl-selfhost | 56 | 49 / 7 / 0 / 0 | 87.5% (n=56) | 75.0% (n=56) | 0.857 (n=49) | 0.667 (n=21) | 0.879 (n=49) | 213 ms (n=7) | 135 ms (n=42) | 322 ms (n=42) | n/a (n=0) | n/a |
| firecrawl-hosted | 56 | 0 / 0 / 56 / 0 | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a |
| donsetch | 56 | 49 / 7 / 0 / 0 | 87.5% (n=56) | 75.0% (n=56) | 0.857 (n=49) | 0.667 (n=21) | 0.762 (n=49) | 2 ms (n=7) | 2 ms (n=42) | 9 ms (n=42) | n/a (n=0) | n/a |

### Live websites

No live tasks in this run.

### Regression and fresh validation subsets

Legacy heldOut flags are retained for historical grouping, but those cases have been inspected and are now exposed regression cases, not unseen evidence. Only separately selected val-* cases belong to the fresh validation cohort; benchmark provenance, not a flag alone, establishes whether a run was untuned.

No legacy held-out regression fixture tasks in this run.

fixture — fresh validation (val-* only):

| profile | tasks | ok / error / unavail. / N/A | success | usable | passage recall | boilerplate excl. | token F1 | first p50 | warm p50 | warm p95 | correct error | cost |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| fetchkeep-http | 56 | 56 / 0 / 0 / 0 | 100.0% (n=56) | 75.0% (n=56) | 0.750 (n=56) | 0.750 (n=28) | 0.782 (n=56) | 8 ms (n=8) | 5 ms (n=48) | 10 ms (n=48) | n/a (n=0) | n/a |
| fetchkeep-chromium | 56 | 56 / 0 / 0 / 0 | 100.0% (n=56) | 87.5% (n=56) | 0.875 (n=56) | 1.000 (n=28) | 0.888 (n=56) | 636 ms (n=8) | 631 ms (n=48) | 2080 ms (n=48) | n/a (n=0) | n/a |
| fetchkeep-lightpanda | 56 | 56 / 0 / 0 / 0 | 100.0% (n=56) | 87.5% (n=56) | 0.875 (n=56) | 1.000 (n=28) | 0.888 (n=56) | 543 ms (n=8) | 531 ms (n=48) | 2022 ms (n=48) | n/a (n=0) | n/a |
| fetchkeep-auto | 56 | 56 / 0 / 0 / 0 | 100.0% (n=56) | 87.5% (n=56) | 0.875 (n=56) | 1.000 (n=28) | 0.888 (n=56) | 9 ms (n=8) | 5 ms (n=48) | 2095 ms (n=48) | n/a (n=0) | n/a |
| firecrawl-selfhost | 56 | 49 / 7 / 0 / 0 | 87.5% (n=56) | 75.0% (n=56) | 0.857 (n=49) | 0.667 (n=21) | 0.879 (n=49) | 213 ms (n=7) | 135 ms (n=42) | 322 ms (n=42) | n/a (n=0) | n/a |
| firecrawl-hosted | 56 | 0 / 0 / 56 / 0 | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a |
| donsetch | 56 | 49 / 7 / 0 / 0 | 87.5% (n=56) | 75.0% (n=56) | 0.857 (n=49) | 0.667 (n=21) | 0.762 (n=49) | 2 ms (n=7) | 2 ms (n=42) | 9 ms (n=42) | n/a (n=0) | n/a |

## Uncertainty

95% percentile case-cluster bootstrap intervals use 2000 deterministic resamples (seed 424242). Each resampled case carries all its repetitions; attempts are not independent cases. Point estimates retain the original attempt-weighted metric. Intervals describe this case corpus, not all websites. Fewer than two eligible cases gives CI n/a; a degenerate interval is not proof of certainty. Warm means repetition ≥2. All split/metric estimates are exported in uncertainty.csv and evidence.json.

| profile | dataset | metric | estimate and interval |
|---|---|---|---|
| fetchkeep-http | fixture | usable | 0.75 [95% CI 0.5–1] (8 cases, 56 attempts) |
| fetchkeep-http | fixture | success | 1 [95% CI 1–1] (8 cases, 56 attempts) |
| fetchkeep-http | fixture | warmP50 | 4.6 ms [95% CI 4.1–5.2 ms] (8 cases, 48 attempts) |
| fetchkeep-http | fixture | warmP95 | 10.1 ms [95% CI 7.4–16.6 ms] (8 cases, 48 attempts) |
| fetchkeep-http | fixture | passageRecall | 0.75 [95% CI 0.5–1] (8 cases, 56 attempts) |
| fetchkeep-http | fixture | tokenF1 | 0.782 [95% CI 0.557–1] (8 cases, 56 attempts) |
| fetchkeep-chromium | fixture | usable | 0.875 [95% CI 0.625–1] (8 cases, 56 attempts) |
| fetchkeep-chromium | fixture | success | 1 [95% CI 1–1] (8 cases, 56 attempts) |
| fetchkeep-chromium | fixture | warmP50 | 630.8 ms [95% CI 606.7–710.4 ms] (8 cases, 48 attempts) |
| fetchkeep-chromium | fixture | warmP95 | 2080.1 ms [95% CI 654.5–2110.6 ms] (8 cases, 48 attempts) |
| fetchkeep-chromium | fixture | passageRecall | 0.875 [95% CI 0.625–1] (8 cases, 56 attempts) |
| fetchkeep-chromium | fixture | tokenF1 | 0.888 [95% CI 0.667–1] (8 cases, 56 attempts) |
| fetchkeep-lightpanda | fixture | usable | 0.875 [95% CI 0.625–1] (8 cases, 56 attempts) |
| fetchkeep-lightpanda | fixture | success | 1 [95% CI 1–1] (8 cases, 56 attempts) |
| fetchkeep-lightpanda | fixture | warmP50 | 530.9 ms [95% CI 529.2–553.6 ms] (8 cases, 48 attempts) |
| fetchkeep-lightpanda | fixture | warmP95 | 2022.2 ms [95% CI 545.4–2033.4 ms] (8 cases, 48 attempts) |
| fetchkeep-lightpanda | fixture | passageRecall | 0.875 [95% CI 0.625–1] (8 cases, 56 attempts) |
| fetchkeep-lightpanda | fixture | tokenF1 | 0.888 [95% CI 0.667–1] (8 cases, 56 attempts) |
| fetchkeep-auto | fixture | usable | 0.875 [95% CI 0.625–1] (8 cases, 56 attempts) |
| fetchkeep-auto | fixture | success | 1 [95% CI 1–1] (8 cases, 56 attempts) |
| fetchkeep-auto | fixture | warmP50 | 4.6 ms [95% CI 4.2–10.2 ms] (8 cases, 48 attempts) |
| fetchkeep-auto | fixture | warmP95 | 2094.7 ms [95% CI 7.2–2175.9 ms] (8 cases, 48 attempts) |
| fetchkeep-auto | fixture | passageRecall | 0.875 [95% CI 0.625–1] (8 cases, 56 attempts) |
| fetchkeep-auto | fixture | tokenF1 | 0.888 [95% CI 0.667–1] (8 cases, 56 attempts) |
| firecrawl-selfhost | fixture | usable | 0.75 [95% CI 0.5–1] (8 cases, 56 attempts) |
| firecrawl-selfhost | fixture | success | 0.875 [95% CI 0.625–1] (8 cases, 56 attempts) |
| firecrawl-selfhost | fixture | warmP50 | 134.8 ms [95% CI 111.8–149.7 ms] (7 cases, 42 attempts) |
| firecrawl-selfhost | fixture | warmP95 | 321.8 ms [95% CI 195.1–349.2 ms] (7 cases, 42 attempts) |
| firecrawl-selfhost | fixture | passageRecall | 0.857 [95% CI 0.571–1] (7 cases, 49 attempts) |
| firecrawl-selfhost | fixture | tokenF1 | 0.879 [95% CI 0.636–1] (7 cases, 49 attempts) |
| firecrawl-hosted | fixture | usable | n/a (0 cases, 0 attempts) |
| firecrawl-hosted | fixture | success | n/a (0 cases, 0 attempts) |
| firecrawl-hosted | fixture | warmP50 | n/a (0 cases, 0 attempts) |
| firecrawl-hosted | fixture | warmP95 | n/a (0 cases, 0 attempts) |
| firecrawl-hosted | fixture | passageRecall | n/a (0 cases, 0 attempts) |
| firecrawl-hosted | fixture | tokenF1 | n/a (0 cases, 0 attempts) |
| donsetch | fixture | usable | 0.75 [95% CI 0.5–1] (8 cases, 56 attempts) |
| donsetch | fixture | success | 0.875 [95% CI 0.625–1] (8 cases, 56 attempts) |
| donsetch | fixture | warmP50 | 2.2 ms [95% CI 2.2–2.4 ms] (7 cases, 42 attempts) |
| donsetch | fixture | warmP95 | 9.2 ms [95% CI 4.8–17.2 ms] (7 cases, 42 attempts) |
| donsetch | fixture | passageRecall | 0.857 [95% CI 0.571–1] (7 cases, 49 attempts) |
| donsetch | fixture | tokenF1 | 0.762 [95% CI 0.541–0.894] (7 cases, 49 attempts) |

## Paired latency

Each pair matches the same case AND repetition for exactly two profiles. Latency uses only common-success warm pairs; errored, unavailable and unmatched slots never become latency samples. This survivor cohort can hide failures, so the table alongside reports matched-attempt errors and usable rates, including failures. Paired quality uses non-expected-error slots with scores for both engines. A−B is the median per-pair latency difference; A/B is the median per-pair ratio, not a ratio of marginal medians. Negative differences or ratios below one favor A. The ratio excludes zero B latencies and has its own sample count. Profiles without a match report n/a.

| A | B | dataset | A matched warm p50 | B matched warm p50 | paired A−B | paired A/B |
|---|---|---|---|---|---|---|
| fetchkeep-http | fetchkeep-chromium | fixture | 4.6 ms [95% CI 4.1–5.2 ms] (8 cases, 48 attempts) | 630.8 ms [95% CI 606.7–710.4 ms] (8 cases, 48 attempts) | -626.1 ms [95% CI -1435.4–-601.4 ms] (8 cases, 48 attempts) | 0.006 [95% CI 0.005–0.008] (8 cases, 48 attempts) |
| fetchkeep-http | fetchkeep-lightpanda | fixture | 4.6 ms [95% CI 4.1–5.2 ms] (8 cases, 48 attempts) | 530.9 ms [95% CI 529.2–553.6 ms] (8 cases, 48 attempts) | -526.4 ms [95% CI -1435.6–-523.9 ms] (8 cases, 48 attempts) | 0.008 [95% CI 0.005–0.009] (8 cases, 48 attempts) |
| fetchkeep-http | fetchkeep-auto | fixture | 4.6 ms [95% CI 4.1–5.2 ms] (8 cases, 48 attempts) | 4.6 ms [95% CI 4.2–10.2 ms] (8 cases, 48 attempts) | -0.5 ms [95% CI -1467.3–0.4 ms] (8 cases, 48 attempts) | 0.891 [95% CI 0.005–1.073] (8 cases, 48 attempts) |
| fetchkeep-http | firecrawl-selfhost | fixture | 4.6 ms [95% CI 4.1–5.2 ms] (7 cases, 42 attempts) | 134.8 ms [95% CI 111.8–149.7 ms] (7 cases, 42 attempts) | -130.4 ms [95% CI -148.5–-115.3 ms] (7 cases, 42 attempts) | 0.033 [95% CI 0.031–0.035] (7 cases, 42 attempts) |
| fetchkeep-http | firecrawl-hosted | fixture | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) |
| fetchkeep-http | donsetch | fixture | 4.6 ms [95% CI 4.1–5.2 ms] (7 cases, 42 attempts) | 2.2 ms [95% CI 2.2–2.4 ms] (7 cases, 42 attempts) | 2.1 ms [95% CI 1.7–2.9 ms] (7 cases, 42 attempts) | 2 [95% CI 1.85–2.611] (7 cases, 42 attempts) |
| fetchkeep-chromium | fetchkeep-lightpanda | fixture | 630.8 ms [95% CI 606.7–710.4 ms] (8 cases, 48 attempts) | 530.9 ms [95% CI 529.2–553.6 ms] (8 cases, 48 attempts) | 71.7 ms [95% CI 63.1–89.4 ms] (8 cases, 48 attempts) | 1.134 [95% CI 1.045–1.169] (8 cases, 48 attempts) |
| fetchkeep-chromium | fetchkeep-auto | fixture | 630.8 ms [95% CI 606.7–710.4 ms] (8 cases, 48 attempts) | 4.6 ms [95% CI 4.2–10.2 ms] (8 cases, 48 attempts) | 593.7 ms [95% CI 24.5–609.2 ms] (8 cases, 48 attempts) | 128.804 [95% CI 1.017–146.122] (8 cases, 48 attempts) |
| fetchkeep-chromium | firecrawl-selfhost | fixture | 617.8 ms [95% CI 602.6–653.4 ms] (7 cases, 42 attempts) | 134.8 ms [95% CI 111.8–149.7 ms] (7 cases, 42 attempts) | 488.2 ms [95% CI 474.2–528.7 ms] (7 cases, 42 attempts) | 4.997 [95% CI 4.033–5.682] (7 cases, 42 attempts) |
| fetchkeep-chromium | firecrawl-hosted | fixture | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) |
| fetchkeep-chromium | donsetch | fixture | 617.8 ms [95% CI 602.6–653.4 ms] (7 cases, 42 attempts) | 2.2 ms [95% CI 2.2–2.4 ms] (7 cases, 42 attempts) | 615.6 ms [95% CI 600.6–650.6 ms] (7 cases, 42 attempts) | 280.818 [95% CI 265.625–331.556] (7 cases, 42 attempts) |
| fetchkeep-lightpanda | fetchkeep-auto | fixture | 530.9 ms [95% CI 529.2–553.6 ms] (8 cases, 48 attempts) | 4.6 ms [95% CI 4.2–10.2 ms] (8 cases, 48 attempts) | 522.9 ms [95% CI -30.6–524.1 ms] (8 cases, 48 attempts) | 113.83 [95% CI 0.979–125.5] (8 cases, 48 attempts) |
| fetchkeep-lightpanda | firecrawl-selfhost | fixture | 530.5 ms [95% CI 528.2–537.7 ms] (7 cases, 42 attempts) | 134.8 ms [95% CI 111.8–149.7 ms] (7 cases, 42 attempts) | 410.4 ms [95% CI 376.9–428.7 ms] (7 cases, 42 attempts) | 4.405 [95% CI 3.518–4.844] (7 cases, 42 attempts) |
| fetchkeep-lightpanda | firecrawl-hosted | fixture | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) |
| fetchkeep-lightpanda | donsetch | fixture | 530.5 ms [95% CI 528.2–537.7 ms] (7 cases, 42 attempts) | 2.2 ms [95% CI 2.2–2.4 ms] (7 cases, 42 attempts) | 527.4 ms [95% CI 525.7–532.6 ms] (7 cases, 42 attempts) | 240.727 [95% CI 219.75–294] (7 cases, 42 attempts) |
| fetchkeep-auto | firecrawl-selfhost | fixture | 4.5 ms [95% CI 4–7 ms] (7 cases, 42 attempts) | 134.8 ms [95% CI 111.8–149.7 ms] (7 cases, 42 attempts) | -114.5 ms [95% CI -146.8–-96.1 ms] (7 cases, 42 attempts) | 0.035 [95% CI 0.027–0.053] (7 cases, 42 attempts) |
| fetchkeep-auto | firecrawl-hosted | fixture | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) |
| fetchkeep-auto | donsetch | fixture | 4.5 ms [95% CI 4–7 ms] (7 cases, 42 attempts) | 2.2 ms [95% CI 2.2–2.4 ms] (7 cases, 42 attempts) | 1.8 ms [95% CI 1.2–4.3 ms] (7 cases, 42 attempts) | 1.9 [95% CI 1.519–3.182] (7 cases, 42 attempts) |
| firecrawl-selfhost | firecrawl-hosted | fixture | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) |
| firecrawl-selfhost | donsetch | fixture | 134.8 ms [95% CI 111.8–149.7 ms] (7 cases, 42 attempts) | 2.2 ms [95% CI 2.2–2.4 ms] (7 cases, 42 attempts) | 132.6 ms [95% CI 109.8–147.7 ms] (7 cases, 42 attempts) | 59.5 [95% CI 54.167–65.875] (7 cases, 42 attempts) |
| firecrawl-hosted | donsetch | fixture | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) |

| A | B | dataset | matched cases / attempts | A / B errors | A / B unmatched attempts | A usable | B usable | usable A−B |
|---|---|---|---|---|---|---|---|---|
| fetchkeep-http | fetchkeep-chromium | fixture | 8 / 56 | 0 / 0 | 0 / 0 | 0.75 [95% CI 0.5–1] (8 cases, 56 attempts) | 0.875 [95% CI 0.625–1] (8 cases, 56 attempts) | -0.125 [95% CI -0.375–0] (8 cases, 56 attempts) |
| fetchkeep-http | fetchkeep-lightpanda | fixture | 8 / 56 | 0 / 0 | 0 / 0 | 0.75 [95% CI 0.5–1] (8 cases, 56 attempts) | 0.875 [95% CI 0.625–1] (8 cases, 56 attempts) | -0.125 [95% CI -0.375–0] (8 cases, 56 attempts) |
| fetchkeep-http | fetchkeep-auto | fixture | 8 / 56 | 0 / 0 | 0 / 0 | 0.75 [95% CI 0.5–1] (8 cases, 56 attempts) | 0.875 [95% CI 0.625–1] (8 cases, 56 attempts) | -0.125 [95% CI -0.375–0] (8 cases, 56 attempts) |
| fetchkeep-http | firecrawl-selfhost | fixture | 8 / 56 | 0 / 7 | 0 / 0 | 0.75 [95% CI 0.5–1] (8 cases, 56 attempts) | 0.75 [95% CI 0.5–1] (8 cases, 56 attempts) | 0 [95% CI 0–0] (8 cases, 56 attempts) |
| fetchkeep-http | firecrawl-hosted | fixture | 0 / 0 | 0 / 0 | 56 / 0 | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) |
| fetchkeep-http | donsetch | fixture | 8 / 56 | 0 / 7 | 0 / 0 | 0.75 [95% CI 0.5–1] (8 cases, 56 attempts) | 0.75 [95% CI 0.5–1] (8 cases, 56 attempts) | 0 [95% CI 0–0] (8 cases, 56 attempts) |
| fetchkeep-chromium | fetchkeep-lightpanda | fixture | 8 / 56 | 0 / 0 | 0 / 0 | 0.875 [95% CI 0.625–1] (8 cases, 56 attempts) | 0.875 [95% CI 0.625–1] (8 cases, 56 attempts) | 0 [95% CI 0–0] (8 cases, 56 attempts) |
| fetchkeep-chromium | fetchkeep-auto | fixture | 8 / 56 | 0 / 0 | 0 / 0 | 0.875 [95% CI 0.625–1] (8 cases, 56 attempts) | 0.875 [95% CI 0.625–1] (8 cases, 56 attempts) | 0 [95% CI 0–0] (8 cases, 56 attempts) |
| fetchkeep-chromium | firecrawl-selfhost | fixture | 8 / 56 | 0 / 7 | 0 / 0 | 0.875 [95% CI 0.625–1] (8 cases, 56 attempts) | 0.75 [95% CI 0.5–1] (8 cases, 56 attempts) | 0.125 [95% CI 0–0.375] (8 cases, 56 attempts) |
| fetchkeep-chromium | firecrawl-hosted | fixture | 0 / 0 | 0 / 0 | 56 / 0 | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) |
| fetchkeep-chromium | donsetch | fixture | 8 / 56 | 0 / 7 | 0 / 0 | 0.875 [95% CI 0.625–1] (8 cases, 56 attempts) | 0.75 [95% CI 0.5–1] (8 cases, 56 attempts) | 0.125 [95% CI 0–0.375] (8 cases, 56 attempts) |
| fetchkeep-lightpanda | fetchkeep-auto | fixture | 8 / 56 | 0 / 0 | 0 / 0 | 0.875 [95% CI 0.625–1] (8 cases, 56 attempts) | 0.875 [95% CI 0.625–1] (8 cases, 56 attempts) | 0 [95% CI 0–0] (8 cases, 56 attempts) |
| fetchkeep-lightpanda | firecrawl-selfhost | fixture | 8 / 56 | 0 / 7 | 0 / 0 | 0.875 [95% CI 0.625–1] (8 cases, 56 attempts) | 0.75 [95% CI 0.5–1] (8 cases, 56 attempts) | 0.125 [95% CI 0–0.375] (8 cases, 56 attempts) |
| fetchkeep-lightpanda | firecrawl-hosted | fixture | 0 / 0 | 0 / 0 | 56 / 0 | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) |
| fetchkeep-lightpanda | donsetch | fixture | 8 / 56 | 0 / 7 | 0 / 0 | 0.875 [95% CI 0.625–1] (8 cases, 56 attempts) | 0.75 [95% CI 0.5–1] (8 cases, 56 attempts) | 0.125 [95% CI 0–0.375] (8 cases, 56 attempts) |
| fetchkeep-auto | firecrawl-selfhost | fixture | 8 / 56 | 0 / 7 | 0 / 0 | 0.875 [95% CI 0.625–1] (8 cases, 56 attempts) | 0.75 [95% CI 0.5–1] (8 cases, 56 attempts) | 0.125 [95% CI 0–0.375] (8 cases, 56 attempts) |
| fetchkeep-auto | firecrawl-hosted | fixture | 0 / 0 | 0 / 0 | 56 / 0 | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) |
| fetchkeep-auto | donsetch | fixture | 8 / 56 | 0 / 7 | 0 / 0 | 0.875 [95% CI 0.625–1] (8 cases, 56 attempts) | 0.75 [95% CI 0.5–1] (8 cases, 56 attempts) | 0.125 [95% CI 0–0.375] (8 cases, 56 attempts) |
| firecrawl-selfhost | firecrawl-hosted | fixture | 0 / 0 | 0 / 0 | 56 / 0 | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) |
| firecrawl-selfhost | donsetch | fixture | 8 / 56 | 7 / 7 | 0 / 0 | 0.75 [95% CI 0.5–1] (8 cases, 56 attempts) | 0.75 [95% CI 0.5–1] (8 cases, 56 attempts) | 0 [95% CI 0–0] (8 cases, 56 attempts) |
| firecrawl-hosted | donsetch | fixture | 0 / 0 | 0 / 0 | 0 / 56 | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) | n/a (0 cases, 0 attempts) |

## Phase timings

Engine-reported milliseconds on successful warm tasks only. MCP wall latency is measured independently by the runner. Phase medians are not additive and may have different sample cohorts. totalMs includes phases; firstByteMs is nested inside downloadMs. Canonical browser phases are non-overlapping. Aggregated phases include measured attempts only: failed/uninstrumented work, policy checks and transport overhead remain unassigned. No residual is fabricated as a phase. Missing phases, absent historical fields and competitors without phase telemetry are n/a, not zero.

| profile | dataset | phase | warm p50 and interval | observed / eligible attempts |
|---|---|---|---|---|
| fetchkeep-http | fixture | downloadMs: HTTP network and body decoding, including redirects | 1.2 ms [95% CI 1.1–1.3 ms] (8 cases, 48 attempts) | 48 / 48 |
| fetchkeep-http | fixture | firstByteMs: HTTP first byte (nested within downloadMs; not additive) | 1.1 ms [95% CI 0.9–1.2 ms] (8 cases, 48 attempts) | 48 / 48 |
| fetchkeep-http | fixture | launchMs: Browser launch/acquire | n/a (0 cases, 0 attempts) | 0 / 48 |
| fetchkeep-http | fixture | navigateMs: Browser navigation | n/a (0 cases, 0 attempts) | 0 / 48 |
| fetchkeep-http | fixture | readinessMs: Bounded content readiness | n/a (0 cases, 0 attempts) | 0 / 48 |
| fetchkeep-http | fixture | serializeMs: DOM serialization | n/a (0 cases, 0 attempts) | 0 / 48 |
| fetchkeep-http | fixture | extractMs: Content extraction | 1.4 ms [95% CI 1.2–2.1 ms] (8 cases, 48 attempts) | 48 / 48 |
| fetchkeep-http | fixture | renderMs: Browser render total (overlaps browser phases; not additive) | n/a (0 cases, 0 attempts) | 0 / 48 |
| fetchkeep-http | fixture | saveMs: Local persistence | 0.2 ms [95% CI 0.2–0.2 ms] (8 cases, 48 attempts) | 48 / 48 |
| fetchkeep-http | fixture | totalMs: Engine total (includes phases; do not sum with them) | 3.5 ms [95% CI 3–4 ms] (8 cases, 48 attempts) | 48 / 48 |
| fetchkeep-chromium | fixture | downloadMs: HTTP network and body decoding, including redirects | n/a (0 cases, 0 attempts) | 0 / 48 |
| fetchkeep-chromium | fixture | firstByteMs: HTTP first byte (nested within downloadMs; not additive) | n/a (0 cases, 0 attempts) | 0 / 48 |
| fetchkeep-chromium | fixture | launchMs: Browser launch/acquire | 43.6 ms [95% CI 42.2–46.6 ms] (8 cases, 48 attempts) | 48 / 48 |
| fetchkeep-chromium | fixture | navigateMs: Browser navigation | 24.1 ms [95% CI 21.4–25.6 ms] (8 cases, 48 attempts) | 48 / 48 |
| fetchkeep-chromium | fixture | readinessMs: Bounded content readiness | 535.8 ms [95% CI 526.3–555 ms] (8 cases, 48 attempts) | 48 / 48 |
| fetchkeep-chromium | fixture | serializeMs: DOM serialization | 2.5 ms [95% CI 2.4–2.7 ms] (8 cases, 48 attempts) | 48 / 48 |
| fetchkeep-chromium | fixture | extractMs: Content extraction | 1.4 ms [95% CI 1.2–1.7 ms] (8 cases, 48 attempts) | 48 / 48 |
| fetchkeep-chromium | fixture | renderMs: Browser render total (overlaps browser phases; not additive) | 622.3 ms [95% CI 595.5–701.4 ms] (8 cases, 48 attempts) | 48 / 48 |
| fetchkeep-chromium | fixture | saveMs: Local persistence | 0.2 ms [95% CI 0.2–0.2 ms] (8 cases, 48 attempts) | 48 / 48 |
| fetchkeep-chromium | fixture | totalMs: Engine total (includes phases; do not sum with them) | 629 ms [95% CI 604.7–709.3 ms] (8 cases, 48 attempts) | 48 / 48 |
| fetchkeep-lightpanda | fixture | downloadMs: HTTP network and body decoding, including redirects | n/a (0 cases, 0 attempts) | 0 / 48 |
| fetchkeep-lightpanda | fixture | firstByteMs: HTTP first byte (nested within downloadMs; not additive) | n/a (0 cases, 0 attempts) | 0 / 48 |
| fetchkeep-lightpanda | fixture | launchMs: Browser launch/acquire | 12.7 ms [95% CI 12.1–13.2 ms] (8 cases, 48 attempts) | 48 / 48 |
| fetchkeep-lightpanda | fixture | navigateMs: Browser navigation | 2.7 ms [95% CI 2.4–2.8 ms] (8 cases, 48 attempts) | 48 / 48 |
| fetchkeep-lightpanda | fixture | readinessMs: Bounded content readiness | 508.3 ms [95% CI 507.8–512.3 ms] (8 cases, 48 attempts) | 48 / 48 |
| fetchkeep-lightpanda | fixture | serializeMs: DOM serialization | 0.8 ms [95% CI 0.7–0.9 ms] (8 cases, 48 attempts) | 48 / 48 |
| fetchkeep-lightpanda | fixture | extractMs: Content extraction | 1.5 ms [95% CI 1.4–2 ms] (8 cases, 48 attempts) | 48 / 48 |
| fetchkeep-lightpanda | fixture | renderMs: Browser render total (overlaps browser phases; not additive) | 525.1 ms [95% CI 523.7–548.9 ms] (8 cases, 48 attempts) | 48 / 48 |
| fetchkeep-lightpanda | fixture | saveMs: Local persistence | 0.2 ms [95% CI 0.2–0.3 ms] (8 cases, 48 attempts) | 48 / 48 |
| fetchkeep-lightpanda | fixture | totalMs: Engine total (includes phases; do not sum with them) | 529.9 ms [95% CI 528.4–552.7 ms] (8 cases, 48 attempts) | 48 / 48 |
| fetchkeep-auto | fixture | downloadMs: HTTP network and body decoding, including redirects | 1.1 ms [95% CI 1–1.5 ms] (8 cases, 48 attempts) | 48 / 48 |
| fetchkeep-auto | fixture | firstByteMs: HTTP first byte (nested within downloadMs; not additive) | 1 ms [95% CI 0.9–1.3 ms] (8 cases, 48 attempts) | 48 / 48 |
| fetchkeep-auto | fixture | launchMs: Browser launch/acquire | 48.8 ms [95% CI 41.2–51.4 ms] (2 cases, 12 attempts) | 12 / 48 |
| fetchkeep-auto | fixture | navigateMs: Browser navigation | 27.3 ms [95% CI 20.5–28.8 ms] (2 cases, 12 attempts) | 12 / 48 |
| fetchkeep-auto | fixture | readinessMs: Bounded content readiness | 1446 ms [95% CI 1439.9–2001.5 ms] (2 cases, 12 attempts) | 12 / 48 |
| fetchkeep-auto | fixture | serializeMs: DOM serialization | 2.7 ms [95% CI 2.5–2.7 ms] (2 cases, 12 attempts) | 12 / 48 |
| fetchkeep-auto | fixture | extractMs: Content extraction | 1.4 ms [95% CI 1.1–2 ms] (8 cases, 48 attempts) | 48 / 48 |
| fetchkeep-auto | fixture | renderMs: Browser render total (overlaps browser phases; not additive) | 1751.9 ms [95% CI 1499.8–2079.5 ms] (2 cases, 12 attempts) | 12 / 48 |
| fetchkeep-auto | fixture | saveMs: Local persistence | 0.2 ms [95% CI 0.2–0.2 ms] (8 cases, 48 attempts) | 48 / 48 |
| fetchkeep-auto | fixture | totalMs: Engine total (includes phases; do not sum with them) | 3.5 ms [95% CI 3.2–7.1 ms] (8 cases, 48 attempts) | 48 / 48 |
| firecrawl-selfhost | fixture | downloadMs: HTTP network and body decoding, including redirects | n/a (0 cases, 0 attempts) | 0 / 42 |
| firecrawl-selfhost | fixture | firstByteMs: HTTP first byte (nested within downloadMs; not additive) | n/a (0 cases, 0 attempts) | 0 / 42 |
| firecrawl-selfhost | fixture | launchMs: Browser launch/acquire | n/a (0 cases, 0 attempts) | 0 / 42 |
| firecrawl-selfhost | fixture | navigateMs: Browser navigation | n/a (0 cases, 0 attempts) | 0 / 42 |
| firecrawl-selfhost | fixture | readinessMs: Bounded content readiness | n/a (0 cases, 0 attempts) | 0 / 42 |
| firecrawl-selfhost | fixture | serializeMs: DOM serialization | n/a (0 cases, 0 attempts) | 0 / 42 |
| firecrawl-selfhost | fixture | extractMs: Content extraction | n/a (0 cases, 0 attempts) | 0 / 42 |
| firecrawl-selfhost | fixture | renderMs: Browser render total (overlaps browser phases; not additive) | n/a (0 cases, 0 attempts) | 0 / 42 |
| firecrawl-selfhost | fixture | saveMs: Local persistence | n/a (0 cases, 0 attempts) | 0 / 42 |
| firecrawl-selfhost | fixture | totalMs: Engine total (includes phases; do not sum with them) | n/a (0 cases, 0 attempts) | 0 / 42 |
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
| donsetch | fixture | downloadMs: HTTP network and body decoding, including redirects | n/a (0 cases, 0 attempts) | 0 / 42 |
| donsetch | fixture | firstByteMs: HTTP first byte (nested within downloadMs; not additive) | n/a (0 cases, 0 attempts) | 0 / 42 |
| donsetch | fixture | launchMs: Browser launch/acquire | n/a (0 cases, 0 attempts) | 0 / 42 |
| donsetch | fixture | navigateMs: Browser navigation | n/a (0 cases, 0 attempts) | 0 / 42 |
| donsetch | fixture | readinessMs: Bounded content readiness | n/a (0 cases, 0 attempts) | 0 / 42 |
| donsetch | fixture | serializeMs: DOM serialization | n/a (0 cases, 0 attempts) | 0 / 42 |
| donsetch | fixture | extractMs: Content extraction | n/a (0 cases, 0 attempts) | 0 / 42 |
| donsetch | fixture | renderMs: Browser render total (overlaps browser phases; not additive) | n/a (0 cases, 0 attempts) | 0 / 42 |
| donsetch | fixture | saveMs: Local persistence | n/a (0 cases, 0 attempts) | 0 / 42 |
| donsetch | fixture | totalMs: Engine total (includes phases; do not sum with them) | n/a (0 cases, 0 attempts) | 0 / 42 |

## Quality detail

| profile | dataset | passage recall | extraction failure (recall < 0.5) | boilerplate excl. | token precision | token recall | token F1 | headings | tables | code | chars (mean) | tokens (mean) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| fetchkeep-http | fixture | 0.750 (n=56) | 25.0% (n=56) | 0.750 (n=28) | 0.948 (n=56) | 0.768 (n=56) | 0.782 (n=56) | 1.000 (n=42) | 1.000 (n=7) | 0.667 (n=21) | 240 (n=56) | 49 (n=56) |
| fetchkeep-chromium | fixture | 0.875 (n=56) | 12.5% (n=56) | 1.000 (n=28) | 0.998 (n=56) | 0.883 (n=56) | 0.888 (n=56) | 1.000 (n=42) | 1.000 (n=7) | 0.667 (n=21) | 266 (n=56) | 53 (n=56) |
| fetchkeep-lightpanda | fixture | 0.875 (n=56) | 12.5% (n=56) | 1.000 (n=28) | 0.998 (n=56) | 0.883 (n=56) | 0.888 (n=56) | 1.000 (n=42) | 1.000 (n=7) | 0.667 (n=21) | 266 (n=56) | 53 (n=56) |
| fetchkeep-auto | fixture | 0.875 (n=56) | 12.5% (n=56) | 1.000 (n=28) | 0.998 (n=56) | 0.883 (n=56) | 0.888 (n=56) | 1.000 (n=42) | 1.000 (n=7) | 0.667 (n=21) | 266 (n=56) | 53 (n=56) |
| firecrawl-selfhost | fixture | 0.857 (n=49) | 14.3% (n=49) | 0.667 (n=21) | 0.943 (n=49) | 0.869 (n=49) | 0.879 (n=49) | 1.000 (n=35) | 1.000 (n=7) | 1.000 (n=14) | 298 (n=49) | 57 (n=49) |
| firecrawl-hosted | fixture | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) |
| donsetch | fixture | 0.857 (n=49) | 14.3% (n=49) | 0.667 (n=21) | 0.693 (n=49) | 0.864 (n=49) | 0.762 (n=49) | 1.000 (n=35) | 1.000 (n=7) | 1.000 (n=14) | 321 (n=49) | 72 (n=49) |

### Errors, escalation and retries

| profile | dataset | timeout | blocked | error kinds | browser escalation | attempts (mean) |
|---|---|---|---|---|---|---|
| fetchkeep-http | fixture | 0.0% (n=56) | 0.0% (n=56) | none | 0.0% (n=56) | 1.00 (n=56) |
| fetchkeep-chromium | fixture | 0.0% (n=56) | 0.0% (n=56) | none | 0.0% (n=56) | 1.00 (n=56) |
| fetchkeep-lightpanda | fixture | 0.0% (n=56) | 0.0% (n=56) | none | 0.0% (n=56) | 1.00 (n=56) |
| fetchkeep-auto | fixture | 0.0% (n=56) | 0.0% (n=56) | none | 25.0% (n=56) | 1.25 (n=56) |
| firecrawl-selfhost | fixture | 0.0% (n=56) | 0.0% (n=56) | http_error×7 | n/a (n=0) | n/a (n=0) |
| firecrawl-hosted | fixture | n/a (n=0) | n/a (n=0) | none | n/a (n=0) | n/a (n=0) |
| donsetch | fixture | 0.0% (n=56) | 0.0% (n=56) | http_error×7 | n/a (n=0) | n/a (n=0) |

## Latency

Percentiles use the nearest-rank method: sort the latencies of `ok` tasks ascending and take the value at rank ceil(p/100 × n). `first` = the first pass over each case (repetition 1), not a new process per case; `warm` = later passes (repetitions ≥ 2). Persistent MCP sessions span the run and browser launch is lazy. Unpaired per-profile latency cohorts can differ; use the paired section for same-case, same-repetition comparisons.

| profile | dataset | first p50 | first p95 | warm p50 | warm p95 |
|---|---|---|---|---|---|
| fetchkeep-http | fixture | 8 ms (n=8) | 237 ms (n=8) | 5 ms (n=48) | 10 ms (n=48) |
| fetchkeep-chromium | fixture | 636 ms (n=8) | 2890 ms (n=8) | 631 ms (n=48) | 2080 ms (n=48) |
| fetchkeep-lightpanda | fixture | 543 ms (n=8) | 2042 ms (n=8) | 531 ms (n=48) | 2022 ms (n=48) |
| fetchkeep-auto | fixture | 9 ms (n=8) | 2711 ms (n=8) | 5 ms (n=48) | 2095 ms (n=48) |
| firecrawl-selfhost | fixture | 213 ms (n=7) | 2275 ms (n=7) | 135 ms (n=42) | 322 ms (n=42) |
| firecrawl-hosted | fixture | n/a (n=0) | n/a (n=0) | n/a (n=0) | n/a (n=0) |
| donsetch | fixture | 2 ms (n=7) | 8 ms (n=7) | 2 ms (n=42) | 9 ms (n=42) |

## Crawl

No crawl tasks in this run.

## Resources

Scope matters: a local process tree, a whole Docker stack and a remote service are different things. Numbers are only comparable between profiles with the same scope; remote services cannot be measured and are never compared.

| profile | engine | scope | CPU (run) | peak RSS | idle RSS | samples | note |
|---|---|---|---|---|---|---|---|
| fetchkeep-http | fetchkeep | local process tree (engine process + children) | 1.20 s | 135.0 MB | 94.3 MB | 638 |  |
| fetchkeep-chromium | fetchkeep | local process tree (engine process + children) | 13.08 s | 656.7 MB | 94.6 MB | 636 |  |
| fetchkeep-lightpanda | fetchkeep | local process tree (engine process + children) | 3.40 s | 170.2 MB | 94.2 MB | 633 |  |
| fetchkeep-auto | fetchkeep | local process tree (engine process + children) | 5.33 s | 665.7 MB | 94.5 MB | 630 |  |
| firecrawl-selfhost | firecrawl | whole Docker stack (all containers of the engine) | 62.74 s | 3628.3 MB | 3584.3 MB | 628 |  |
| donsetch | donsetch | local process tree (engine process + children) | 7.18 s | 1536.0 MB | 15.4 MB | 627 |  |
| firecrawl-hosted | firecrawl | remote service — not measurable | not measurable | not measurable | not measurable | 0 | engine not started |

Measured scopes differ (process-tree, docker-stack): peak RSS bars below are labelled with their scope and are not like-for-like.

## Cold start

No cold-start measurements in this run.

## Footprint

No footprint measurements in this run.

## Fetchkeep-specific features

Citation checks verify that a quoted passage can be re-read and cited from Fetchkeep's store. Other engines have no equivalent, so this is not part of the common-task comparison.

| profile | dataset | citation verified |
|---|---|---|
| fetchkeep-http | fixture | 1.000 (n=42) |
| fetchkeep-chromium | fixture | 1.000 (n=49) |
| fetchkeep-lightpanda | fixture | 1.000 (n=49) |
| fetchkeep-auto | fixture | 1.000 (n=49) |

## Unsupported / N/A / unavailable

### Unavailable engines

- firecrawl-hosted (firecrawl): unavailable — FIRECRAWL_API_KEY is not set

### Tasks not run (unavailable / N/A)

- firecrawl-hosted — fixture fetch: unavailable for 56 task(s) (engine unavailable: FIRECRAWL_API_KEY is not set); cases: val-reference-table, val-unicode-protocol, val-inline-evidence, val-seed-library, val-short-notice, val-background-clock, val-delayed-shell, val-nested-shadow

### Metrics not applicable

- firecrawl-selfhost — fixture: citation not scored (metric not applicable to this engine or no ok task carried it); shown as n/a, not 0.
- donsetch — fixture: citation not scored (metric not applicable to this engine or no ok task carried it); shown as n/a, not 0.

## How to read this

- Fixtures are synthetic pages served locally: they isolate specific extraction problems (tables, code, boilerplate, JS rendering) with gold answers, but they are not a sample of the web. Live results reflect real sites at run time and can change between runs.
- Short output is not good extraction: fewer characters or tokens can mean missing content. Read chars/tokens together with passage recall, boilerplate exclusion and token F1.
- There is no overall winner. The trade-offs below are derived from this run's numbers only, with margins and sample sizes; engines differ in transport (local MCP stdio, REST, hosted service), so latency includes very different overheads.
- Hosted services cannot run local fixtures; those tasks are N/A and excluded from rates rather than counted as failures.
- Percentiles use the nearest-rank method: sort the latencies of `ok` tasks ascending and take the value at rank ceil(p/100 × n). `first` = the first pass over each case (repetition 1), not a new process per case; `warm` = later passes (repetitions ≥ 2). Persistent MCP sessions span the run and browser launch is lazy. Unpaired per-profile latency cohorts can differ; use the paired section for same-case, same-repetition comparisons.

### Trade-offs on fixture tasks (derived from this run only)

- Usable rate: tie between fetchkeep-chromium 87.5% (n=56), fetchkeep-lightpanda 87.5% (n=56), fetchkeep-auto 87.5% (n=56).
- Passage recall: tie between fetchkeep-chromium 0.875 (n=56), fetchkeep-lightpanda 0.875 (n=56), fetchkeep-auto 0.875 (n=56).
- Boilerplate exclusion: tie between fetchkeep-chromium 1.000 (n=28), fetchkeep-lightpanda 1.000 (n=28), fetchkeep-auto 1.000 (n=28).
- Token F1: tie between fetchkeep-chromium 0.888 (n=56), fetchkeep-lightpanda 0.888 (n=56), fetchkeep-auto 0.888 (n=56).
- Unpaired warm p50 latency: donsetch 2 ms (n=42) vs next-best fetchkeep-http 5 ms (n=48).
- Unpaired first-pass p50 latency: donsetch 2 ms (n=7) vs next-best fetchkeep-http 8 ms (n=8) — small sample (n=7).

Per workload (category) on fixture: usable rate and unpaired warm p50 per profile. These are descriptive leaders, not significance claims: success cohorts can differ and repeated attempts are not independent cases. Consult the case-cluster intervals and paired comparison before drawing a speed conclusion.

| category | fetchkeep-http | fetchkeep-chromium | fetchkeep-lightpanda | fetchkeep-auto | firecrawl-selfhost | firecrawl-hosted | donsetch | leaders (usable rate; warm p50) |
|---|---|---|---|---|---|---|---|---|
| article | 100.0% (n=7); warm p50 4 ms (n=6) | 100.0% (n=7); warm p50 606 ms (n=6) | 100.0% (n=7); warm p50 528 ms (n=6) | 100.0% (n=7); warm p50 4 ms (n=6) | 100.0% (n=7); warm p50 110 ms (n=6) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×7) | 100.0% (n=7); warm p50 2 ms (n=6) | usable: tie between fetchkeep-http 100.0% (n=7), fetchkeep-chromium 100.0% (n=7), fetchkeep-lightpanda 100.0% (n=7), fetchkeep-auto 100.0% (n=7), firecrawl-selfhost 100.0% (n=7), donsetch 100.0% (n=7) — small sample (n=7). unpaired warm p50: donsetch 2 ms (n=6) vs next-best fetchkeep-auto 4 ms (n=6) — small sample (n=6). |
| citations | 100.0% (n=7); warm p50 4 ms (n=6) | 100.0% (n=7); warm p50 618 ms (n=6) | 100.0% (n=7); warm p50 528 ms (n=6) | 100.0% (n=7); warm p50 4 ms (n=6) | 100.0% (n=7); warm p50 112 ms (n=6) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×7) | 100.0% (n=7); warm p50 2 ms (n=6) | usable: tie between fetchkeep-http 100.0% (n=7), fetchkeep-chromium 100.0% (n=7), fetchkeep-lightpanda 100.0% (n=7), fetchkeep-auto 100.0% (n=7), firecrawl-selfhost 100.0% (n=7), donsetch 100.0% (n=7) — small sample (n=7). unpaired warm p50: donsetch 2 ms (n=6) vs next-best fetchkeep-http 4 ms (n=6) — small sample (n=6). |
| docs | 100.0% (n=7); warm p50 5 ms (n=6) | 100.0% (n=7); warm p50 599 ms (n=6) | 100.0% (n=7); warm p50 530 ms (n=6) | 100.0% (n=7); warm p50 5 ms (n=6) | 100.0% (n=7); warm p50 156 ms (n=6) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×7) | 100.0% (n=7); warm p50 2 ms (n=6) | usable: tie between fetchkeep-http 100.0% (n=7), fetchkeep-chromium 100.0% (n=7), fetchkeep-lightpanda 100.0% (n=7), fetchkeep-auto 100.0% (n=7), firecrawl-selfhost 100.0% (n=7), donsetch 100.0% (n=7) — small sample (n=7). unpaired warm p50: donsetch 2 ms (n=6) vs next-best fetchkeep-auto 5 ms (n=6) — small sample (n=6). |
| javascript | 33.3% (n=21); warm p50 5 ms (n=18) | 66.7% (n=21); warm p50 1498 ms (n=18) | 66.7% (n=21); warm p50 1442 ms (n=18) | 66.7% (n=21); warm p50 1509 ms (n=18) | 33.3% (n=21); warm p50 130 ms (n=12) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×21) | 33.3% (n=21); warm p50 2 ms (n=12) | usable: tie between fetchkeep-chromium 66.7% (n=21), fetchkeep-lightpanda 66.7% (n=21), fetchkeep-auto 66.7% (n=21). unpaired warm p50: donsetch 2 ms (n=12) vs next-best fetchkeep-http 5 ms (n=18). |
| short-content | 100.0% (n=7); warm p50 5 ms (n=6) | 100.0% (n=7); warm p50 597 ms (n=6) | 100.0% (n=7); warm p50 529 ms (n=6) | 100.0% (n=7); warm p50 4 ms (n=6) | 100.0% (n=7); warm p50 143 ms (n=6) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×7) | 100.0% (n=7); warm p50 2 ms (n=6) | usable: tie between fetchkeep-http 100.0% (n=7), fetchkeep-chromium 100.0% (n=7), fetchkeep-lightpanda 100.0% (n=7), fetchkeep-auto 100.0% (n=7), firecrawl-selfhost 100.0% (n=7), donsetch 100.0% (n=7) — small sample (n=7). unpaired warm p50: donsetch 2 ms (n=6) vs next-best fetchkeep-auto 4 ms (n=6) — small sample (n=6). |
| unicode | 100.0% (n=7); warm p50 4 ms (n=6) | 100.0% (n=7); warm p50 603 ms (n=6) | 100.0% (n=7); warm p50 528 ms (n=6) | 100.0% (n=7); warm p50 4 ms (n=6) | 100.0% (n=7); warm p50 143 ms (n=6) | unavailable: engine unavailable: FIRECRAWL_API_KEY is not set (×7) | 100.0% (n=7); warm p50 2 ms (n=6) | usable: tie between fetchkeep-http 100.0% (n=7), fetchkeep-chromium 100.0% (n=7), fetchkeep-lightpanda 100.0% (n=7), fetchkeep-auto 100.0% (n=7), firecrawl-selfhost 100.0% (n=7), donsetch 100.0% (n=7) — small sample (n=7). unpaired warm p50: donsetch 2 ms (n=6) vs next-best fetchkeep-auto 4 ms (n=6) — small sample (n=6). |

## Reproduce

Re-run with:

```
npm run bench -- --engines fetchkeep-http,fetchkeep-chromium,fetchkeep-lightpanda,fetchkeep-auto,firecrawl-selfhost,firecrawl-hosted,donsetch --suite validation --repetitions 7 --seed 42 --timeout 30000
```

| dataset | path | sha256 | cases |
|---|---|---|---|
| fixtures | bench/datasets/fixtures.json | 8c7b0a6f99ea2f1fd5551747be2df264f7fbfacc03973227cc484e740f576749 | 21 |
| live | bench/datasets/live.json | d458c8afc2696bd34699711b710ebee36bfbaf2f9557ae1893b31090ae6f7474 | 24 |
| live-crawl | bench/datasets/live-crawl.json | 166f4d2d133883c97d2b24c57650f1f9edd4e72d02611cda8b2e98d5a164ec75 | 1 |
| validation | bench/datasets/validation.json | caa8737e5306aeb6bcc3c0c4fe8fd55f1b2f58dc64c8061f13ca252fe980eb22 | 8 |
| fixture-files | bench/fixtures/SHA256SUMS | e01dee584a5d110dded06d10b68e2c8d2ebbdbd00a638fcff7f238c5d9362479 | 0 |

Per-case outputs: see `cases.csv` and the per-case inspection section of `report.html`; raw engine output is under `raw/`.
