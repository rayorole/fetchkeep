# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [0.1.2] - 2026-09-30

### Changed

- CLI human output now uses Chalk with grouped Commander help, compact retrieval summaries, readable search,
  library, crawl and doctor results, and stacked help for narrow terminals. Color respects TTY/NO_COLOR;
  terminal control sequences are removed from human output. Piped Markdown, JSON and MCP contracts are unchanged.
- Benchmark HTML is a standalone offline reader with results-first comparison, profile/dataset/split filters,
  sortable metrics, searchable fetch/crawl cases, embedded CSV downloads, responsive navigation and print layout.
- Installation guide includes npm upgrades, npx, source installation and Windows/PATH troubleshooting.

### Added

- `full` benchmark suite runs all fetch and crawl cases in one report, three repetitions per profile.
- Regression coverage for terminal escape sequences, no-color behavior, redirected content and citation visibility.

## [0.1.1] - 2026-09-30

### Added

- Stable GitHub release-triggered npm publishing with tag/version and main-ancestry gates, Linux/Windows
  Node 22/24 verification, clean-install smoke checks, OIDC trusted publishing and provenance.
- Maintainer instructions for one-time npm package bootstrap and trusted-publisher configuration.

### Changed

- Installation instructions now use the npm registry following the initial v0.1.0 publication.
- No retrieval behavior changes.

## [0.1.0] - 2026-09-30

First release.

### Added

- HTTP fetching with Undici: manual redirects, one end-to-end deadline, compressed and decompressed size limits,
  charset detection; network policy that blocks private/internal addresses on every hop and resolved address
  (DNS-pinned sockets), with explicit `allowPrivateNetwork` / `allowHosts` / `allowCidrs`.
- Extraction without script execution: linkedom + Readability or a structural extractor, GFM Markdown (tables,
  fenced code with languages, task lists, strikethrough), stable content blocks, text-layer PDFs (PDF.js), plain
  text, Markdown and JSON.
- Local store on `node:sqlite` with FTS5: documents, versions deduplicated by content hash, blocks, raw snapshots
  (all / latest / none), aliases, workspaces, export (JSON Lines), deletion and pruning.
- Citations: `fk:<doc>@<version>#<block>` references, exact-quote lookup, pagination with block-aligned offsets.
- Bounded crawler: same-origin scope, robots.txt (RFC 9309), sitemaps, pacing and crawl-delay, depth/page limits,
  deduplication, cancellation, resumable frontier and explicit stop reasons.
- CLI (`fetch`, `read`, `search`, `crawl`, `crawls`, `list`, `versions`, `export`, `delete`, `prune`, `extract`,
  `doctor`, `mcp`) and an MCP stdio server (`web_fetch`, `web_read`, `web_search`, `web_crawl`, `web_extract`) with a
  shared response envelope and untrusted-content fencing.
- Optional browser backends behind a provider interface: Chromium through Playwright (headless shell or an explicitly
  selected Chrome/Edge, sandbox on, isolated contexts, per-subrequest policy checks) and experimental Lightpanda
  through CDP/puppeteer-core (telemetry disabled). Automatic mode escalates from HTTP only when a deterministic
  heuristic flags the result, records every attempt and returns `partial` when rendering is needed but unavailable.
- Optional SearXNG web search provider and experimental Ollama schema extraction with per-field evidence.
- Engine-neutral benchmark (`bench/`) comparing Fetchkeep profiles with Firecrawl (self-hosted and hosted) and
  DonSeTch on deterministic fixtures and annotated live sites, with CSV, Markdown and HTML reports.

### Verification and known limitations

- Clean tarball install exercised on Windows 11 and Ubuntu 24.04/WSL2 with Node 24: browser-free doctor,
  fetch/save, offline read/search, MCP initialization and tool listing (8/8 checks each).
- Browser integration: Chromium on Windows and Linux; Lightpanda on Linux x86_64. macOS and arm64 untested.
- [Measured benchmark results and backend recommendation](bench/results/README.md): HTTP-first auto with optional
  Chromium; Lightpanda remains experimental. Hosted Firecrawl unavailable without credentials; no paid run.
- Browser DNS rebinding and aggregate subresource-byte limits remain external-isolation concerns ([#28](https://github.com/rayorole/fetchkeep/issues/28)).
- Delayed JavaScript, shadow-DOM code and a held-out citation mismatch remain visible in benchmark results
  ([#29](https://github.com/rayorole/fetchkeep/issues/29)).
- No OCR or authenticated browsing. Ollama extraction is experimental; protocol integration was tested with a
  local fake server, not a real installed model. The npm registry package is not published.

[0.1.0]: https://github.com/rayorole/fetchkeep/releases/tag/v0.1.0
[0.1.1]: https://github.com/rayorole/fetchkeep/releases/tag/v0.1.1
[0.1.2]: https://github.com/rayorole/fetchkeep/releases/tag/v0.1.2
