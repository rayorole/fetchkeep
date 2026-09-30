# Session and saved-library workloads

Command: `node bench/workloads.ts --profiles fetchkeep-http,fetchkeep-auto,fetchkeep-chromium,fetchkeep-lightpanda,donsetch --repetitions 7 --operations 4 --out bench/runs/2026-09-30-workloads`

- Separate scenarios, not inputs to the common-fetch ranking. No LLM judge.
- Session-fetch starts a fresh persistent MCP process per profile/repetition; all operations are real web_fetch calls to the same unique per-operation URLs for both engines. Responses use no-store and every operation must produce server-side request evidence.
- The saved-library scenario is Fetchkeep-specific; unsupported DonSeTch library operations are N/A, not failures or zero latency. Persistence remains enabled.
- Operation times measure MCP calls only. Startup is separate; server stop/restart, assertions, and report writes are outside operation totals. Full raw MCP responses and server request logs are retained here.
- Each scenario is one workload case. Repetitions are repeated sessions, not independent cases: case-cluster uncertainty is N/A for this one-case workload, regardless of repetitions.

## Scenario results

| Scenario | Profile | Sessions ok / attempted | N/A / unavailable | Successful operation-total p50 | MCP-ready p50 |
| --- | --- | --- | --- | --- | --- |
| session-fetch | fetchkeep-http | 7 / 7 | 0 / 0 | 320.9 ms (n=7; case-cluster CI N/A) | 446.6 ms (n=7; case-cluster CI N/A) |
| session-fetch | fetchkeep-auto | 7 / 7 | 0 / 0 | 296.7 ms (n=7; case-cluster CI N/A) | 470.9 ms (n=7; case-cluster CI N/A) |
| session-fetch | fetchkeep-chromium | 7 / 7 | 0 / 0 | 3505.1 ms (n=7; case-cluster CI N/A) | 508.4 ms (n=7; case-cluster CI N/A) |
| session-fetch | fetchkeep-lightpanda | 7 / 7 | 0 / 0 | 2648.4 ms (n=7; case-cluster CI N/A) | 457.0 ms (n=7; case-cluster CI N/A) |
| session-fetch | donsetch | 7 / 7 | 0 / 0 | 13.0 ms (n=7; case-cluster CI N/A) | 85.4 ms (n=7; case-cluster CI N/A) |
| saved-library | fetchkeep-http | 7 / 7 | 0 / 0 | 296.2 ms (n=7; case-cluster CI N/A) | 418.6 ms (n=7; case-cluster CI N/A) |
| saved-library | fetchkeep-auto | 7 / 7 | 0 / 0 | 268.3 ms (n=7; case-cluster CI N/A) | 443.6 ms (n=7; case-cluster CI N/A) |
| saved-library | fetchkeep-chromium | 7 / 7 | 0 / 0 | 2298.0 ms (n=7; case-cluster CI N/A) | 466.5 ms (n=7; case-cluster CI N/A) |
| saved-library | fetchkeep-lightpanda | 7 / 7 | 0 / 0 | 1614.9 ms (n=7; case-cluster CI N/A) | 533.8 ms (n=7; case-cluster CI N/A) |
| saved-library | donsetch | 0 / 0 | 7 / 0 | N/A | N/A |

## Every operation

| Scenario | Profile | Repetition | Operation | Outcome | Wall ms | Failed checks / reason |
| --- | --- | --- | --- | --- | --- | --- |
| session-fetch | fetchkeep-http | 1 | fetch-1 | ok | 230.2 |  |
| session-fetch | fetchkeep-http | 1 | fetch-2 | ok | 20.5 |  |
| session-fetch | fetchkeep-http | 1 | fetch-3 | ok | 14.8 |  |
| session-fetch | fetchkeep-http | 1 | fetch-4 | ok | 7.7 |  |
| session-fetch | fetchkeep-auto | 1 | fetch-1 | ok | 149.5 |  |
| session-fetch | fetchkeep-auto | 1 | fetch-2 | ok | 7.4 |  |
| session-fetch | fetchkeep-auto | 1 | fetch-3 | ok | 7.1 |  |
| session-fetch | fetchkeep-auto | 1 | fetch-4 | ok | 6.1 |  |
| session-fetch | fetchkeep-chromium | 1 | fetch-1 | ok | 1363.8 |  |
| session-fetch | fetchkeep-chromium | 1 | fetch-2 | ok | 587.8 |  |
| session-fetch | fetchkeep-chromium | 1 | fetch-3 | ok | 610.2 |  |
| session-fetch | fetchkeep-chromium | 1 | fetch-4 | ok | 613.3 |  |
| session-fetch | fetchkeep-lightpanda | 1 | fetch-1 | ok | 953.0 |  |
| session-fetch | fetchkeep-lightpanda | 1 | fetch-2 | ok | 543.3 |  |
| session-fetch | fetchkeep-lightpanda | 1 | fetch-3 | ok | 534.1 |  |
| session-fetch | fetchkeep-lightpanda | 1 | fetch-4 | ok | 538.9 |  |
| session-fetch | donsetch | 1 | fetch-1 | ok | 35.1 |  |
| session-fetch | donsetch | 1 | fetch-2 | ok | 3.5 |  |
| session-fetch | donsetch | 1 | fetch-3 | ok | 2.0 |  |
| session-fetch | donsetch | 1 | fetch-4 | ok | 2.1 |  |
| saved-library | fetchkeep-http | 1 | fetch-and-save | ok | 259.6 |  |
| saved-library | fetchkeep-http | 1 | exact-quote-lookup | ok | 3.6 |  |
| saved-library | fetchkeep-http | 1 | reopen-citation | ok | 2.1 |  |
| saved-library | fetchkeep-http | 1 | offline-local-search | ok | 35.6 |  |
| saved-library | fetchkeep-http | 1 | fetch-new-version | ok | 10.0 |  |
| saved-library | fetchkeep-http | 1 | reopen-old-citation-after-update | ok | 3.2 |  |
| saved-library | fetchkeep-auto | 1 | fetch-and-save | ok | 227.6 |  |
| saved-library | fetchkeep-auto | 1 | exact-quote-lookup | ok | 2.9 |  |
| saved-library | fetchkeep-auto | 1 | reopen-citation | ok | 3.3 |  |
| saved-library | fetchkeep-auto | 1 | offline-local-search | ok | 2.7 |  |
| saved-library | fetchkeep-auto | 1 | fetch-new-version | ok | 12.2 |  |
| saved-library | fetchkeep-auto | 1 | reopen-old-citation-after-update | ok | 12.6 |  |
| saved-library | fetchkeep-chromium | 1 | fetch-and-save | ok | 2093.8 |  |
| saved-library | fetchkeep-chromium | 1 | exact-quote-lookup | ok | 3.3 |  |
| saved-library | fetchkeep-chromium | 1 | reopen-citation | ok | 1.9 |  |
| saved-library | fetchkeep-chromium | 1 | offline-local-search | ok | 2.5 |  |
| saved-library | fetchkeep-chromium | 1 | fetch-new-version | ok | 667.3 |  |
| saved-library | fetchkeep-chromium | 1 | reopen-old-citation-after-update | ok | 1.6 |  |
| saved-library | fetchkeep-lightpanda | 1 | fetch-and-save | ok | 1187.0 |  |
| saved-library | fetchkeep-lightpanda | 1 | exact-quote-lookup | ok | 3.2 |  |
| saved-library | fetchkeep-lightpanda | 1 | reopen-citation | ok | 2.0 |  |
| saved-library | fetchkeep-lightpanda | 1 | offline-local-search | ok | 3.3 |  |
| saved-library | fetchkeep-lightpanda | 1 | fetch-new-version | ok | 538.9 |  |
| saved-library | fetchkeep-lightpanda | 1 | reopen-old-citation-after-update | ok | 1.6 |  |
| saved-library | donsetch | 1 | N/A | na | N/A | DonSeTch adapter exposes fetch/crawl, not versioned saved-document read, exact citation reopen or offline library search |
| session-fetch | donsetch | 2 | fetch-1 | ok | 4.0 |  |
| session-fetch | donsetch | 2 | fetch-2 | ok | 2.1 |  |
| session-fetch | donsetch | 2 | fetch-3 | ok | 2.2 |  |
| session-fetch | donsetch | 2 | fetch-4 | ok | 1.9 |  |
| session-fetch | fetchkeep-lightpanda | 2 | fetch-1 | ok | 1038.4 |  |
| session-fetch | fetchkeep-lightpanda | 2 | fetch-2 | ok | 542.5 |  |
| session-fetch | fetchkeep-lightpanda | 2 | fetch-3 | ok | 538.1 |  |
| session-fetch | fetchkeep-lightpanda | 2 | fetch-4 | ok | 534.3 |  |
| session-fetch | fetchkeep-chromium | 2 | fetch-1 | ok | 1552.4 |  |
| session-fetch | fetchkeep-chromium | 2 | fetch-2 | ok | 651.6 |  |
| session-fetch | fetchkeep-chromium | 2 | fetch-3 | ok | 634.8 |  |
| session-fetch | fetchkeep-chromium | 2 | fetch-4 | ok | 652.1 |  |
| session-fetch | fetchkeep-auto | 2 | fetch-1 | ok | 300.3 |  |
| session-fetch | fetchkeep-auto | 2 | fetch-2 | ok | 18.1 |  |
| session-fetch | fetchkeep-auto | 2 | fetch-3 | ok | 9.3 |  |
| session-fetch | fetchkeep-auto | 2 | fetch-4 | ok | 17.0 |  |
| session-fetch | fetchkeep-http | 2 | fetch-1 | ok | 305.5 |  |
| session-fetch | fetchkeep-http | 2 | fetch-2 | ok | 11.4 |  |
| session-fetch | fetchkeep-http | 2 | fetch-3 | ok | 11.1 |  |
| session-fetch | fetchkeep-http | 2 | fetch-4 | ok | 12.5 |  |
| saved-library | donsetch | 2 | N/A | na | N/A | DonSeTch adapter exposes fetch/crawl, not versioned saved-document read, exact citation reopen or offline library search |
| saved-library | fetchkeep-lightpanda | 2 | fetch-and-save | ok | 1068.6 |  |
| saved-library | fetchkeep-lightpanda | 2 | exact-quote-lookup | ok | 4.6 |  |
| saved-library | fetchkeep-lightpanda | 2 | reopen-citation | ok | 1.5 |  |
| saved-library | fetchkeep-lightpanda | 2 | offline-local-search | ok | 3.3 |  |
| saved-library | fetchkeep-lightpanda | 2 | fetch-new-version | ok | 535.6 |  |
| saved-library | fetchkeep-lightpanda | 2 | reopen-old-citation-after-update | ok | 1.4 |  |
| saved-library | fetchkeep-chromium | 2 | fetch-and-save | ok | 1453.7 |  |
| saved-library | fetchkeep-chromium | 2 | exact-quote-lookup | ok | 3.1 |  |
| saved-library | fetchkeep-chromium | 2 | reopen-citation | ok | 1.8 |  |
| saved-library | fetchkeep-chromium | 2 | offline-local-search | ok | 2.8 |  |
| saved-library | fetchkeep-chromium | 2 | fetch-new-version | ok | 820.5 |  |
| saved-library | fetchkeep-chromium | 2 | reopen-old-citation-after-update | ok | 1.2 |  |
| saved-library | fetchkeep-auto | 2 | fetch-and-save | ok | 230.9 |  |
| saved-library | fetchkeep-auto | 2 | exact-quote-lookup | ok | 3.7 |  |
| saved-library | fetchkeep-auto | 2 | reopen-citation | ok | 2.4 |  |
| saved-library | fetchkeep-auto | 2 | offline-local-search | ok | 3.7 |  |
| saved-library | fetchkeep-auto | 2 | fetch-new-version | ok | 13.2 |  |
| saved-library | fetchkeep-auto | 2 | reopen-old-citation-after-update | ok | 2.2 |  |
| saved-library | fetchkeep-http | 2 | fetch-and-save | ok | 250.6 |  |
| saved-library | fetchkeep-http | 2 | exact-quote-lookup | ok | 3.0 |  |
| saved-library | fetchkeep-http | 2 | reopen-citation | ok | 1.8 |  |
| saved-library | fetchkeep-http | 2 | offline-local-search | ok | 8.1 |  |
| saved-library | fetchkeep-http | 2 | fetch-new-version | ok | 17.1 |  |
| saved-library | fetchkeep-http | 2 | reopen-old-citation-after-update | ok | 2.1 |  |
| session-fetch | fetchkeep-http | 3 | fetch-1 | ok | 246.3 |  |
| session-fetch | fetchkeep-http | 3 | fetch-2 | ok | 13.4 |  |
| session-fetch | fetchkeep-http | 3 | fetch-3 | ok | 7.8 |  |
| session-fetch | fetchkeep-http | 3 | fetch-4 | ok | 14.1 |  |
| session-fetch | fetchkeep-auto | 3 | fetch-1 | ok | 271.4 |  |
| session-fetch | fetchkeep-auto | 3 | fetch-2 | ok | 8.3 |  |
| session-fetch | fetchkeep-auto | 3 | fetch-3 | ok | 20.7 |  |
| session-fetch | fetchkeep-auto | 3 | fetch-4 | ok | 13.6 |  |
| session-fetch | fetchkeep-chromium | 3 | fetch-1 | ok | 1654.8 |  |
| session-fetch | fetchkeep-chromium | 3 | fetch-2 | ok | 631.1 |  |
| session-fetch | fetchkeep-chromium | 3 | fetch-3 | ok | 620.4 |  |
| session-fetch | fetchkeep-chromium | 3 | fetch-4 | ok | 612.0 |  |
| session-fetch | fetchkeep-lightpanda | 3 | fetch-1 | ok | 988.0 |  |
| session-fetch | fetchkeep-lightpanda | 3 | fetch-2 | ok | 541.3 |  |
| session-fetch | fetchkeep-lightpanda | 3 | fetch-3 | ok | 538.6 |  |
| session-fetch | fetchkeep-lightpanda | 3 | fetch-4 | ok | 534.7 |  |
| session-fetch | donsetch | 3 | fetch-1 | ok | 2.9 |  |
| session-fetch | donsetch | 3 | fetch-2 | ok | 1.9 |  |
| session-fetch | donsetch | 3 | fetch-3 | ok | 2.5 |  |
| session-fetch | donsetch | 3 | fetch-4 | ok | 2.2 |  |
| saved-library | fetchkeep-http | 3 | fetch-and-save | ok | 242.6 |  |
| saved-library | fetchkeep-http | 3 | exact-quote-lookup | ok | 4.2 |  |
| saved-library | fetchkeep-http | 3 | reopen-citation | ok | 2.1 |  |
| saved-library | fetchkeep-http | 3 | offline-local-search | ok | 2.5 |  |
| saved-library | fetchkeep-http | 3 | fetch-new-version | ok | 17.5 |  |
| saved-library | fetchkeep-http | 3 | reopen-old-citation-after-update | ok | 2.0 |  |
| saved-library | fetchkeep-auto | 3 | fetch-and-save | ok | 268.4 |  |
| saved-library | fetchkeep-auto | 3 | exact-quote-lookup | ok | 2.7 |  |
| saved-library | fetchkeep-auto | 3 | reopen-citation | ok | 5.2 |  |
| saved-library | fetchkeep-auto | 3 | offline-local-search | ok | 3.0 |  |
| saved-library | fetchkeep-auto | 3 | fetch-new-version | ok | 21.8 |  |
| saved-library | fetchkeep-auto | 3 | reopen-old-citation-after-update | ok | 3.5 |  |
| saved-library | fetchkeep-chromium | 3 | fetch-and-save | ok | 1562.3 |  |
| saved-library | fetchkeep-chromium | 3 | exact-quote-lookup | ok | 3.1 |  |
| saved-library | fetchkeep-chromium | 3 | reopen-citation | ok | 1.7 |  |
| saved-library | fetchkeep-chromium | 3 | offline-local-search | ok | 2.6 |  |
| saved-library | fetchkeep-chromium | 3 | fetch-new-version | ok | 619.5 |  |
| saved-library | fetchkeep-chromium | 3 | reopen-old-citation-after-update | ok | 1.5 |  |
| saved-library | fetchkeep-lightpanda | 3 | fetch-and-save | ok | 1004.4 |  |
| saved-library | fetchkeep-lightpanda | 3 | exact-quote-lookup | ok | 3.4 |  |
| saved-library | fetchkeep-lightpanda | 3 | reopen-citation | ok | 1.6 |  |
| saved-library | fetchkeep-lightpanda | 3 | offline-local-search | ok | 6.5 |  |
| saved-library | fetchkeep-lightpanda | 3 | fetch-new-version | ok | 544.3 |  |
| saved-library | fetchkeep-lightpanda | 3 | reopen-old-citation-after-update | ok | 1.4 |  |
| saved-library | donsetch | 3 | N/A | na | N/A | DonSeTch adapter exposes fetch/crawl, not versioned saved-document read, exact citation reopen or offline library search |
| session-fetch | donsetch | 4 | fetch-1 | ok | 2.8 |  |
| session-fetch | donsetch | 4 | fetch-2 | ok | 2.5 |  |
| session-fetch | donsetch | 4 | fetch-3 | ok | 5.7 |  |
| session-fetch | donsetch | 4 | fetch-4 | ok | 2.0 |  |
| session-fetch | fetchkeep-lightpanda | 4 | fetch-1 | ok | 1024.4 |  |
| session-fetch | fetchkeep-lightpanda | 4 | fetch-2 | ok | 538.5 |  |
| session-fetch | fetchkeep-lightpanda | 4 | fetch-3 | ok | 533.9 |  |
| session-fetch | fetchkeep-lightpanda | 4 | fetch-4 | ok | 533.1 |  |
| session-fetch | fetchkeep-chromium | 4 | fetch-1 | ok | 1618.9 |  |
| session-fetch | fetchkeep-chromium | 4 | fetch-2 | ok | 626.4 |  |
| session-fetch | fetchkeep-chromium | 4 | fetch-3 | ok | 615.7 |  |
| session-fetch | fetchkeep-chromium | 4 | fetch-4 | ok | 644.1 |  |
| session-fetch | fetchkeep-auto | 4 | fetch-1 | ok | 255.6 |  |
| session-fetch | fetchkeep-auto | 4 | fetch-2 | ok | 17.2 |  |
| session-fetch | fetchkeep-auto | 4 | fetch-3 | ok | 7.4 |  |
| session-fetch | fetchkeep-auto | 4 | fetch-4 | ok | 16.6 |  |
| session-fetch | fetchkeep-http | 4 | fetch-1 | ok | 276.7 |  |
| session-fetch | fetchkeep-http | 4 | fetch-2 | ok | 9.5 |  |
| session-fetch | fetchkeep-http | 4 | fetch-3 | ok | 8.2 |  |
| session-fetch | fetchkeep-http | 4 | fetch-4 | ok | 14.8 |  |
| saved-library | donsetch | 4 | N/A | na | N/A | DonSeTch adapter exposes fetch/crawl, not versioned saved-document read, exact citation reopen or offline library search |
| saved-library | fetchkeep-lightpanda | 4 | fetch-and-save | ok | 1001.2 |  |
| saved-library | fetchkeep-lightpanda | 4 | exact-quote-lookup | ok | 3.4 |  |
| saved-library | fetchkeep-lightpanda | 4 | reopen-citation | ok | 1.6 |  |
| saved-library | fetchkeep-lightpanda | 4 | offline-local-search | ok | 3.4 |  |
| saved-library | fetchkeep-lightpanda | 4 | fetch-new-version | ok | 534.0 |  |
| saved-library | fetchkeep-lightpanda | 4 | reopen-old-citation-after-update | ok | 1.4 |  |
| saved-library | fetchkeep-chromium | 4 | fetch-and-save | ok | 1654.2 |  |
| saved-library | fetchkeep-chromium | 4 | exact-quote-lookup | ok | 3.4 |  |
| saved-library | fetchkeep-chromium | 4 | reopen-citation | ok | 2.2 |  |
| saved-library | fetchkeep-chromium | 4 | offline-local-search | ok | 2.7 |  |
| saved-library | fetchkeep-chromium | 4 | fetch-new-version | ok | 633.7 |  |
| saved-library | fetchkeep-chromium | 4 | reopen-old-citation-after-update | ok | 1.8 |  |
| saved-library | fetchkeep-auto | 4 | fetch-and-save | ok | 259.3 |  |
| saved-library | fetchkeep-auto | 4 | exact-quote-lookup | ok | 2.8 |  |
| saved-library | fetchkeep-auto | 4 | reopen-citation | ok | 1.9 |  |
| saved-library | fetchkeep-auto | 4 | offline-local-search | ok | 4.1 |  |
| saved-library | fetchkeep-auto | 4 | fetch-new-version | ok | 16.2 |  |
| saved-library | fetchkeep-auto | 4 | reopen-old-citation-after-update | ok | 1.8 |  |
| saved-library | fetchkeep-http | 4 | fetch-and-save | ok | 270.0 |  |
| saved-library | fetchkeep-http | 4 | exact-quote-lookup | ok | 3.2 |  |
| saved-library | fetchkeep-http | 4 | reopen-citation | ok | 1.6 |  |
| saved-library | fetchkeep-http | 4 | offline-local-search | ok | 8.2 |  |
| saved-library | fetchkeep-http | 4 | fetch-new-version | ok | 11.2 |  |
| saved-library | fetchkeep-http | 4 | reopen-old-citation-after-update | ok | 2.0 |  |
| session-fetch | fetchkeep-http | 5 | fetch-1 | ok | 285.0 |  |
| session-fetch | fetchkeep-http | 5 | fetch-2 | ok | 14.8 |  |
| session-fetch | fetchkeep-http | 5 | fetch-3 | ok | 9.6 |  |
| session-fetch | fetchkeep-http | 5 | fetch-4 | ok | 11.6 |  |
| session-fetch | fetchkeep-auto | 5 | fetch-1 | ok | 223.8 |  |
| session-fetch | fetchkeep-auto | 5 | fetch-2 | ok | 10.7 |  |
| session-fetch | fetchkeep-auto | 5 | fetch-3 | ok | 10.2 |  |
| session-fetch | fetchkeep-auto | 5 | fetch-4 | ok | 13.9 |  |
| session-fetch | fetchkeep-chromium | 5 | fetch-1 | ok | 1371.0 |  |
| session-fetch | fetchkeep-chromium | 5 | fetch-2 | ok | 639.0 |  |
| session-fetch | fetchkeep-chromium | 5 | fetch-3 | ok | 611.9 |  |
| session-fetch | fetchkeep-chromium | 5 | fetch-4 | ok | 633.1 |  |
| session-fetch | fetchkeep-lightpanda | 5 | fetch-1 | ok | 1007.9 |  |
| session-fetch | fetchkeep-lightpanda | 5 | fetch-2 | ok | 554.1 |  |
| session-fetch | fetchkeep-lightpanda | 5 | fetch-3 | ok | 535.3 |  |
| session-fetch | fetchkeep-lightpanda | 5 | fetch-4 | ok | 551.2 |  |
| session-fetch | donsetch | 5 | fetch-1 | ok | 3.3 |  |
| session-fetch | donsetch | 5 | fetch-2 | ok | 1.9 |  |
| session-fetch | donsetch | 5 | fetch-3 | ok | 1.7 |  |
| session-fetch | donsetch | 5 | fetch-4 | ok | 1.6 |  |
| saved-library | fetchkeep-http | 5 | fetch-and-save | ok | 259.4 |  |
| saved-library | fetchkeep-http | 5 | exact-quote-lookup | ok | 3.5 |  |
| saved-library | fetchkeep-http | 5 | reopen-citation | ok | 1.9 |  |
| saved-library | fetchkeep-http | 5 | offline-local-search | ok | 5.0 |  |
| saved-library | fetchkeep-http | 5 | fetch-new-version | ok | 10.7 |  |
| saved-library | fetchkeep-http | 5 | reopen-old-citation-after-update | ok | 2.1 |  |
| saved-library | fetchkeep-auto | 5 | fetch-and-save | ok | 225.3 |  |
| saved-library | fetchkeep-auto | 5 | exact-quote-lookup | ok | 2.6 |  |
| saved-library | fetchkeep-auto | 5 | reopen-citation | ok | 1.8 |  |
| saved-library | fetchkeep-auto | 5 | offline-local-search | ok | 6.0 |  |
| saved-library | fetchkeep-auto | 5 | fetch-new-version | ok | 11.3 |  |
| saved-library | fetchkeep-auto | 5 | reopen-old-citation-after-update | ok | 1.9 |  |
| saved-library | fetchkeep-chromium | 5 | fetch-and-save | ok | 1641.1 |  |
| saved-library | fetchkeep-chromium | 5 | exact-quote-lookup | ok | 5.9 |  |
| saved-library | fetchkeep-chromium | 5 | reopen-citation | ok | 2.6 |  |
| saved-library | fetchkeep-chromium | 5 | offline-local-search | ok | 5.1 |  |
| saved-library | fetchkeep-chromium | 5 | fetch-new-version | ok | 712.7 |  |
| saved-library | fetchkeep-chromium | 5 | reopen-old-citation-after-update | ok | 4.6 |  |
| saved-library | fetchkeep-lightpanda | 5 | fetch-and-save | ok | 1080.1 |  |
| saved-library | fetchkeep-lightpanda | 5 | exact-quote-lookup | ok | 3.5 |  |
| saved-library | fetchkeep-lightpanda | 5 | reopen-citation | ok | 1.7 |  |
| saved-library | fetchkeep-lightpanda | 5 | offline-local-search | ok | 2.6 |  |
| saved-library | fetchkeep-lightpanda | 5 | fetch-new-version | ok | 541.2 |  |
| saved-library | fetchkeep-lightpanda | 5 | reopen-old-citation-after-update | ok | 1.3 |  |
| saved-library | donsetch | 5 | N/A | na | N/A | DonSeTch adapter exposes fetch/crawl, not versioned saved-document read, exact citation reopen or offline library search |
| session-fetch | donsetch | 6 | fetch-1 | ok | 8.4 |  |
| session-fetch | donsetch | 6 | fetch-2 | ok | 1.9 |  |
| session-fetch | donsetch | 6 | fetch-3 | ok | 1.9 |  |
| session-fetch | donsetch | 6 | fetch-4 | ok | 4.2 |  |
| session-fetch | fetchkeep-lightpanda | 6 | fetch-1 | ok | 1181.9 |  |
| session-fetch | fetchkeep-lightpanda | 6 | fetch-2 | ok | 543.7 |  |
| session-fetch | fetchkeep-lightpanda | 6 | fetch-3 | ok | 550.0 |  |
| session-fetch | fetchkeep-lightpanda | 6 | fetch-4 | ok | 535.5 |  |
| session-fetch | fetchkeep-chromium | 6 | fetch-1 | ok | 2448.8 |  |
| session-fetch | fetchkeep-chromium | 6 | fetch-2 | ok | 627.3 |  |
| session-fetch | fetchkeep-chromium | 6 | fetch-3 | ok | 627.0 |  |
| session-fetch | fetchkeep-chromium | 6 | fetch-4 | ok | 670.3 |  |
| session-fetch | fetchkeep-auto | 6 | fetch-1 | ok | 427.0 |  |
| session-fetch | fetchkeep-auto | 6 | fetch-2 | ok | 18.0 |  |
| session-fetch | fetchkeep-auto | 6 | fetch-3 | ok | 10.5 |  |
| session-fetch | fetchkeep-auto | 6 | fetch-4 | ok | 16.6 |  |
| session-fetch | fetchkeep-http | 6 | fetch-1 | ok | 495.8 |  |
| session-fetch | fetchkeep-http | 6 | fetch-2 | ok | 27.3 |  |
| session-fetch | fetchkeep-http | 6 | fetch-3 | ok | 18.3 |  |
| session-fetch | fetchkeep-http | 6 | fetch-4 | ok | 34.6 |  |
| saved-library | donsetch | 6 | N/A | na | N/A | DonSeTch adapter exposes fetch/crawl, not versioned saved-document read, exact citation reopen or offline library search |
| saved-library | fetchkeep-lightpanda | 6 | fetch-and-save | ok | 1950.9 |  |
| saved-library | fetchkeep-lightpanda | 6 | exact-quote-lookup | ok | 18.8 |  |
| saved-library | fetchkeep-lightpanda | 6 | reopen-citation | ok | 1.8 |  |
| saved-library | fetchkeep-lightpanda | 6 | offline-local-search | ok | 3.7 |  |
| saved-library | fetchkeep-lightpanda | 6 | fetch-new-version | ok | 565.7 |  |
| saved-library | fetchkeep-lightpanda | 6 | reopen-old-citation-after-update | ok | 1.9 |  |
| saved-library | fetchkeep-chromium | 6 | fetch-and-save | ok | 1769.3 |  |
| saved-library | fetchkeep-chromium | 6 | exact-quote-lookup | ok | 3.1 |  |
| saved-library | fetchkeep-chromium | 6 | reopen-citation | ok | 1.9 |  |
| saved-library | fetchkeep-chromium | 6 | offline-local-search | ok | 3.9 |  |
| saved-library | fetchkeep-chromium | 6 | fetch-new-version | ok | 659.7 |  |
| saved-library | fetchkeep-chromium | 6 | reopen-old-citation-after-update | ok | 1.9 |  |
| saved-library | fetchkeep-auto | 6 | fetch-and-save | ok | 312.7 |  |
| saved-library | fetchkeep-auto | 6 | exact-quote-lookup | ok | 5.7 |  |
| saved-library | fetchkeep-auto | 6 | reopen-citation | ok | 1.7 |  |
| saved-library | fetchkeep-auto | 6 | offline-local-search | ok | 4.0 |  |
| saved-library | fetchkeep-auto | 6 | fetch-new-version | ok | 18.7 |  |
| saved-library | fetchkeep-auto | 6 | reopen-old-citation-after-update | ok | 1.9 |  |
| saved-library | fetchkeep-http | 6 | fetch-and-save | ok | 278.8 |  |
| saved-library | fetchkeep-http | 6 | exact-quote-lookup | ok | 3.0 |  |
| saved-library | fetchkeep-http | 6 | reopen-citation | ok | 1.4 |  |
| saved-library | fetchkeep-http | 6 | offline-local-search | ok | 4.4 |  |
| saved-library | fetchkeep-http | 6 | fetch-new-version | ok | 10.0 |  |
| saved-library | fetchkeep-http | 6 | reopen-old-citation-after-update | ok | 2.0 |  |
| session-fetch | fetchkeep-http | 7 | fetch-1 | ok | 279.9 |  |
| session-fetch | fetchkeep-http | 7 | fetch-2 | ok | 15.4 |  |
| session-fetch | fetchkeep-http | 7 | fetch-3 | ok | 7.5 |  |
| session-fetch | fetchkeep-http | 7 | fetch-4 | ok | 20.1 |  |
| session-fetch | fetchkeep-auto | 7 | fetch-1 | ok | 255.4 |  |
| session-fetch | fetchkeep-auto | 7 | fetch-2 | ok | 9.2 |  |
| session-fetch | fetchkeep-auto | 7 | fetch-3 | ok | 18.6 |  |
| session-fetch | fetchkeep-auto | 7 | fetch-4 | ok | 7.1 |  |
| session-fetch | fetchkeep-chromium | 7 | fetch-1 | ok | 1776.4 |  |
| session-fetch | fetchkeep-chromium | 7 | fetch-2 | ok | 677.8 |  |
| session-fetch | fetchkeep-chromium | 7 | fetch-3 | ok | 631.2 |  |
| session-fetch | fetchkeep-chromium | 7 | fetch-4 | ok | 636.6 |  |
| session-fetch | fetchkeep-lightpanda | 7 | fetch-1 | ok | 1118.1 |  |
| session-fetch | fetchkeep-lightpanda | 7 | fetch-2 | ok | 551.2 |  |
| session-fetch | fetchkeep-lightpanda | 7 | fetch-3 | ok | 547.6 |  |
| session-fetch | fetchkeep-lightpanda | 7 | fetch-4 | ok | 538.2 |  |
| session-fetch | donsetch | 7 | fetch-1 | ok | 12.0 |  |
| session-fetch | donsetch | 7 | fetch-2 | ok | 2.4 |  |
| session-fetch | donsetch | 7 | fetch-3 | ok | 1.8 |  |
| session-fetch | donsetch | 7 | fetch-4 | ok | 3.7 |  |
| saved-library | fetchkeep-http | 7 | fetch-and-save | ok | 294.2 |  |
| saved-library | fetchkeep-http | 7 | exact-quote-lookup | ok | 2.8 |  |
| saved-library | fetchkeep-http | 7 | reopen-citation | ok | 2.3 |  |
| saved-library | fetchkeep-http | 7 | offline-local-search | ok | 6.9 |  |
| saved-library | fetchkeep-http | 7 | fetch-new-version | ok | 18.9 |  |
| saved-library | fetchkeep-http | 7 | reopen-old-citation-after-update | ok | 3.1 |  |
| saved-library | fetchkeep-auto | 7 | fetch-and-save | ok | 243.6 |  |
| saved-library | fetchkeep-auto | 7 | exact-quote-lookup | ok | 2.3 |  |
| saved-library | fetchkeep-auto | 7 | reopen-citation | ok | 1.6 |  |
| saved-library | fetchkeep-auto | 7 | offline-local-search | ok | 3.6 |  |
| saved-library | fetchkeep-auto | 7 | fetch-new-version | ok | 15.3 |  |
| saved-library | fetchkeep-auto | 7 | reopen-old-citation-after-update | ok | 1.8 |  |
| saved-library | fetchkeep-chromium | 7 | fetch-and-save | ok | 1647.6 |  |
| saved-library | fetchkeep-chromium | 7 | exact-quote-lookup | ok | 3.1 |  |
| saved-library | fetchkeep-chromium | 7 | reopen-citation | ok | 1.8 |  |
| saved-library | fetchkeep-chromium | 7 | offline-local-search | ok | 2.5 |  |
| saved-library | fetchkeep-chromium | 7 | fetch-new-version | ok | 632.0 |  |
| saved-library | fetchkeep-chromium | 7 | reopen-old-citation-after-update | ok | 1.8 |  |
| saved-library | fetchkeep-lightpanda | 7 | fetch-and-save | ok | 982.9 |  |
| saved-library | fetchkeep-lightpanda | 7 | exact-quote-lookup | ok | 3.3 |  |
| saved-library | fetchkeep-lightpanda | 7 | reopen-citation | ok | 1.5 |  |
| saved-library | fetchkeep-lightpanda | 7 | offline-local-search | ok | 2.4 |  |
| saved-library | fetchkeep-lightpanda | 7 | fetch-new-version | ok | 533.8 |  |
| saved-library | fetchkeep-lightpanda | 7 | reopen-old-citation-after-update | ok | 1.1 |  |
| saved-library | donsetch | 7 | N/A | na | N/A | DonSeTch adapter exposes fetch/crawl, not versioned saved-document read, exact citation reopen or offline library search |

Full evidence: [workloads.json](workloads.json). Includes every raw response, normalized operation arguments, request log, identity check and engine configuration. Fetch adapter source defines engine-specific MCP parameter names.
