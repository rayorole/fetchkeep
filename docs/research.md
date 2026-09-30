# Prior-art research

Inspected on 2026-09-30 from fresh clones. Findings are labelled:

- **VERIFIED** — read in source code or configuration at the recorded commit.
- **README-CLAIM** — stated in documentation only; not established from source.
- **MEASURED** — observed by running the tool (see the benchmark report for numbers).

No code from these projects is copied into Fetchkeep. All three are AGPL-3.0 (see
[Licensing](#licensing-implications)); Fetchkeep reimplements the relevant ideas independently.

| Project | Inspected revision | Language | License (SPDX) |
|---|---|---|---|
| DonSeTch | `77b21fa33e3bac7496b5aed3028fe22be6ffa460` (crate/npm 4.4.1, CHANGELOG 2026-09-29) | Rust 2024 (toolchain 1.98) | `AGPL-3.0-only` (Cargo.toml, npm/package.json, LICENSE) |
| Firecrawl | `7e4a959dca0efbdad2f0a9d82b0fce20afeb9a4d` (apps/api 1.0.0, `@mendable/firecrawl-js` 4.42.0) | TypeScript + Rust + Go services | root `AGPL-3.0-only`; `apps/api` manifest says `ISC`, JS SDK `MIT` |
| Lightpanda | `5d4bc20ae27d6a694534cb3e1866782aed549b7b` (`build.zig.zon` version `1.0.0-dev`, nightly releases) | Zig + V8 | `AGPL-3.0-only` (LICENSING.md) |

## DonSeTch

**What it is (VERIFIED):** a single Rust binary exposing `fetch`, `search`, `crawl`, `screenshot` and an MCP server
(`donsetch mcp`, stdio by default, optional streamable HTTP behind the `http` feature). One spec table
(`src/spec.rs`) generates both the CLI flags and the MCP tool schemas, so CLI and MCP stay equivalent — a design
Fetchkeep adopts (one core service, thin adapters).

Useful capabilities (VERIFIED):
- `--json` envelope `{ok, content, meta}` with error kinds `permanent|transient|walled` mapped to exit codes 1/2/3
  (`src/cli/tool.rs`). Actionable error classification is worth copying conceptually.
- Tiered fetch: custom HTTP/TLS first, escalation to a real Chromium over raw CDP (`src/ghost/mod.rs`), controlled by
  `--tier auto|1|2`.
- SSRF guard blocks private/loopback/link-local/CGNAT/multicast/documentation ranges on literal **and** resolved
  addresses, with an opt-out `DONSETCH_ALLOW_PRIVATE_EGRESS` (`src/fetch/guards.rs`). Browser requests are
  guarded via CDP too.
- Crawl: robots.txt (`Allow`, `Disallow`, `Crawl-delay` capped at 60 s), sitemap discovery including indexes,
  a pacing governor (200 ms baseline, backs off on 429/503), resume tokens, same-*host* (not same-origin) scope
  (`src/crawl/*`). Page cap 1..200, depth 0..8.
- Bench scripts in `bench/` compare search against Exa/Tavily and time fetches of a handful of live URLs.

Shortcomings / caveats:
- VERIFIED: fetch JSON has no dedicated `final_url` / `markdown` field; everything is in `content` + loosely
  typed `meta`. Consumers must parse text.
- VERIFIED: search is keyless by scraping public SERPs (Google, Bing, DDG, Brave…). This is fragile and has
  terms-of-service implications; Fetchkeep keeps web search explicit and provider-configured instead.
- VERIFIED: no persistent, versioned local corpus with citations; `--since-last` diffing exists but there is no
  full-text search over saved pages.
- VERIFIED: install downloads a platform binary from GitHub Releases (`npm/install.js`, SHA-256 checked); source
  builds require Go, CMake, Clang, NASM and download PDFium/ONNX at build time.
- VERIFIED: `bench/headtohead.py` writes to a developer-specific absolute path and requires paid keys; its
  published numbers are not independent measurements.
- README-CLAIM: "10+ search engines", stealth success rates — not verified here.

## Firecrawl

**What it is (VERIFIED):** an Express API (`apps/api`) with v1 and v2 REST routes, queue workers (NuQ on
PostgreSQL by default, Redis, RabbitMQ), a separate Playwright microservice and optional external services
(Fire-engine, FirePDF, search providers).

API contract used by the benchmark (VERIFIED, `apps/api/src/controllers/v2/types.ts`):
- `POST /v2/scrape` `{url, formats:["markdown"], onlyMainContent (default true), timeout, waitFor, …}` →
  `{success, data:{markdown, metadata:{title?, sourceURL, url, statusCode, contentType, …}}}`; failures
  `{success:false, code?, error}`.
- `POST /v2/crawl` `{url, limit, maxDiscoveryDepth, sitemap: skip|include|only, allowExternalLinks,
  ignoreRobotsTxt, delay, scrapeOptions}` → `{success, id}`; `GET /v2/crawl/{id}` →
  `{status: scraping|completed|cancelled|failed, completed, total, creditsUsed, next, data[]}`. v2 has no
  `maxDepth` (v1 does).
- Auth: `Authorization: Bearer <key>`. Base scrape cost 1 credit, surcharges for JSON/PDF pages/etc.
  (`apps/api/src/lib/scrape-billing.ts`). Rate-limit windows in `services/rate-limiter.ts`.

Self-hosting (VERIFIED, `docker-compose.yaml`, `SELF_HOST.md`): services `api` (port 3002), `playwright-service`,
`redis`, `rabbitmq`, `nuq-postgres` (+ optional FoundationDB). Authentication off by default. **Fire-engine is not
included**, so the self-host engine waterfall is Playwright → fetch → pdf → document. Search needs an externally
configured SearXNG. Private destinations are blocked unless `ALLOW_LOCAL_WEBHOOKS=true`
(`engines/utils/safeFetch.ts`, `apps/playwright-service-ts/api.ts`).

Shortcomings / caveats:
- VERIFIED: heavy local footprint (5+ containers incl. PostgreSQL, RabbitMQ, Redis, Chromium) even for a single
  scrape; no persistence volumes for queues by default.
- VERIFIED: hosted and self-hosted differ materially (Fire-engine, proxies, FirePDF). They must be benchmarked as
  separate profiles.
- VERIFIED: no local, offline corpus/search of previously scraped pages from the client side; results are
  returned, not kept with versions/citations.
- README-CLAIM: "covers 96% of the web", advanced anti-bot handling — depends on hosted-only components.

## Lightpanda

**What it is (VERIFIED):** a headless browser written in Zig with V8, libcurl networking and html5ever parsing.
Modes: `serve` (CDP over WebSocket, default `127.0.0.1:9222`), `fetch` (`--dump html|markdown|…`), `mcp`.

Relevant interface facts (VERIFIED, `src/Config.zig`, `src/server/cdp/**`):
- CDP domains dispatched: Browser, Target, Page, Runtime, DOM, Network, Fetch, Input, Emulation, Storage, …
  Presence of a domain does not imply every Chrome method is implemented.
- `Fetch.enable` + `Fetch.requestPaused` interception works at the request stage; response-stage interception is
  logged as not implemented. Also has CLI `--block-private-networks`, `--block-cidrs`, `--block-urls`.
- Timeouts are network-level: `--http-timeout`, `--http-connect-timeout`, `--http-session-timeout`
  (serve); there is no page-level `--timeout` flag in `serve`.
- Telemetry is **on by default** and POSTs to `https://telemetry.lightpanda.io/v2` with a persistent install id;
  disabled when the environment variable `LIGHTPANDA_DISABLE_TELEMETRY` is present
  (`src/telemetry/telemetry.zig`). Fetchkeep always sets it when spawning Lightpanda.
- README-CLAIM: no native Windows build; run under WSL2 and connect to the forwarded port. Releases are nightly
  builds for Linux x86_64/aarch64 (glibc) and macOS.
- README-CLAIM: Puppeteer works via `browserWSEndpoint`; Playwright "may" work. Fetchkeep uses `puppeteer-core`
  and does not assume Playwright compatibility.
- No process sandbox is provided or claimed; JavaScript from pages runs in the Lightpanda process with its
  network access. Treat it as needing external isolation for arbitrary sites.
- README-CLAIM: faster and lighter than Chrome. Fetchkeep does not repeat this claim; see the benchmark.

## Licensing implications

- Fetchkeep is Apache-2.0 and contains no code from DonSeTch, Firecrawl or Lightpanda.
- **Lightpanda (AGPL-3.0-only):** Fetchkeep does not bundle, download or redistribute Lightpanda. Users install
  it separately and point Fetchkeep at an executable or CDP endpoint. Communicating with a separately installed
  program over CDP is a common arm's-length arrangement, but we do **not** assume that a process boundary settles
  every obligation: anyone who *distributes* Lightpanda alongside Fetchkeep (e.g. in a container image) must comply
  with AGPL-3.0 for Lightpanda (source offer, license text), and anyone offering a *modified* Lightpanda to users over
  a network must provide the corresponding source (AGPL §13). The Fetchkeep adapter is optional and disabled unless
  configured.
- **DonSeTch and Firecrawl (AGPL-3.0):** used only as external benchmark subjects, installed by the person running
  the benchmark (npm global binary / Docker Compose / hosted API). The benchmark adapters invoke their public
  CLI/HTTP interfaces and do not incorporate their code.
- The Firecrawl JS SDK is MIT, but the benchmark calls the REST API directly with Undici to avoid a dependency.
