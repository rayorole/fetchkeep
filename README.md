# Fetchkeep

**The web, saved for your agents.**

Fetchkeep is an open-source, local-first web retrieval tool for AI agents. It fetches pages, extracts clean
Markdown, saves every version to a local SQLite store, searches it offline, crawls sites within strict bounds and
returns citations you can re-read later — through a CLI and an MCP server.

- **No browser, LLM or paid service required.** HTTP fetching, extraction, saving, reading, search and crawling
  work out of the box. Browsers (Chromium, experimental Lightpanda) and Ollama are optional add-ons.
- **Stable citations.** Every document version is content-addressed; every block has a reference
  (`fk:d_…@2#b7`) that returns exactly the same text tomorrow, offline.
- **Safe by default.** Private and internal addresses are blocked on every redirect and resolved address, sizes
  and time are bounded, fetched content is fenced as untrusted data.
- **Honest results.** One response envelope for CLI and MCP with status (`success` / `partial` / `error`),
  backend attempts, timings, truncation and actionable errors.

Status: v0.1.2. Apache-2.0.

## Install

Requires **Node.js 22.19 or newer** (22 and 24 tested). Check with `node --version`.
Storage uses Node's built-in `node:sqlite`; no compiler, browser or LLM is required.

```sh
npm install -g fetchkeep
fetchkeep --version
fetchkeep doctor
```

The package is available on [npm](https://www.npmjs.com/package/fetchkeep). Upgrade with
`npm install -g fetchkeep@latest`. To try it without a global installation:

```sh
npx --yes fetchkeep@latest doctor
npx --yes fetchkeep@latest fetch https://example.com
```

If your shell cannot find `fetchkeep`, ensure your npm global executable directory is on `PATH`, reopen the
terminal, or use `npx`. On Windows, PowerShell and Git Bash both work.

For the newest source changes before an npm release:

```sh
git clone https://github.com/rayorole/fetchkeep.git
cd fetchkeep
npm ci
npm run build
npm link
fetchkeep doctor
```

## Quick start

```sh
fetchkeep fetch https://en.wikipedia.org/wiki/Markdown > markdown.md   # Markdown on stdout, metadata on stderr
fetchkeep search "lightweight markup language"                       # offline full-text search
fetchkeep read https://en.wikipedia.org/wiki/Markdown --find "John Gruber"   # exact quote + block reference
fetchkeep read "fk:d_…@1#b4"                                          # re-read a cited block
fetchkeep crawl https://docs.example.org/ --max-pages 30 --max-depth 2
fetchkeep --json fetch https://example.com                           # full JSON envelope
```

Other commands: `list`, `versions`, `export` (JSON Lines), `delete`, `prune`, `crawls`, `extract` (Ollama,
experimental), `doctor`, `mcp`. Exit codes: 0 success, 1 error, 2 usage, 3 partial. Workspaces isolate stores:
`fetchkeep -w research fetch …`.

### Terminal and scripting

Use `fetchkeep --help` or `fetchkeep <command> --help` to explore the commands. Human-readable status and
diagnostics go to stderr; page Markdown goes to stdout, so redirection does not include presentation text.
For scripts and agents use `--json`. MCP stdout is reserved for protocol messages.

Commander handles commands and help; Chalk adds terminal-aware color to status, citations and diagnostics.
Search, saved documents and doctor checks use readable summaries rather than raw JSON. Color is disabled
for redirected streams, `TERM=dumb`, or when `NO_COLOR` is set. No full-screen TUI or extra runtime is needed.

## MCP

```json
{
  "mcpServers": {
    "fetchkeep": { "command": "fetchkeep", "args": ["mcp"] }
  }
}
```

Tools: `web_fetch`, `web_read`, `web_search`, `web_crawl`, `web_extract` (experimental). Each returns the envelope as
`structuredContent` plus a text rendering in which page content sits inside `<untrusted-web-content>` delimiters.
stdout carries only protocol messages; logs go to stderr. See [docs/mcp.md](docs/mcp.md).

## Browser backends (optional)

`auto` (default) fetches over HTTP and escalates to an enabled browser only when the page looks unrendered
(empty SPA root, "enable JavaScript" notices, very little text on a scripted page, or HTTP 403/429/503). Without a
browser it returns the HTTP result as `partial` and says why.

```sh
npm install -g playwright-core
npx playwright-core install --only-shell chromium   # headless shell only
export FETCHKEEP_CHROMIUM=1
```

Lightpanda is supported experimentally through CDP (`FETCHKEEP_LIGHTPANDA_EXECUTABLE` or
`FETCHKEEP_LIGHTPANDA_ENDPOINT`, plus `puppeteer-core`). Details, isolation guarantees and the escalation heuristic:
[docs/browsers.md](docs/browsers.md).

## Benchmark

`bench/` compares Fetchkeep's profiles with Firecrawl (self-hosted and hosted, separately) and DonSeTch on
deterministic local fixtures and an annotated set of live websites. See [bench/README.md](bench/README.md) and the
published results in [bench/results/](bench/results/).

**[Download the latest benchmark HTML](https://github.com/rayorole/fetchkeep/releases/download/v0.1.2/fetchkeep-benchmark-0.1.2.html)** —
open one file to compare results, search cases and export CSV. The v0.1.2 full run contains 966 task records;
hosted Firecrawl is explicitly unavailable, not scored as zero.

```sh
npm run bench -- --engines fetchkeep,firecrawl,donsetch --suite full --cold-start --footprint
npm run bench:report -- --run bench/runs/<run>
```

The full suite runs fetch and crawl cases together. Open `bench/runs/<run>/report.html` directly in your browser:
it is a standalone offline file, not an app that needs a server. Engine setup and report controls are documented
in the [benchmark guide](bench/README.md).

## Documentation

- [Configuration and environment variables](docs/configuration.md)
- [CLI reference](docs/cli.md)
- [MCP server](docs/mcp.md)
- [Browser backends](docs/browsers.md)
- [Security model](docs/security.md)
- [Optional Ollama extraction](docs/ollama.md)
- [Architecture and decisions](docs/architecture.md)
- [Prior-art research](docs/research.md)

## Platform support

| Platform | Core (HTTP, store, search, crawl, MCP) | Chromium backend | Lightpanda backend |
|---|---|---|---|
| Linux x64 | tested (CI: Ubuntu) | tested (Ubuntu 24.04) | tested (experimental) |
| Linux arm64 | untested | untested | untested |
| Windows 10/11 x64 | tested (CI: Windows) | tested (Windows 11) | via WSL2 only |
| macOS | expected to work (untested) | expected to work (untested) | Lightpanda publishes macOS builds (untested) |

## Limitations

- JavaScript rendering needs an optional browser; HTTP mode does not execute scripts by design.
- No OCR: scanned PDFs yield no text. No login flows, forms or page interactions.
- Web search is only available through a SearXNG instance you configure; local search is always available.
- Lightpanda support is experimental and unsandboxed.

## Contributing and security

See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md).

## License

Apache License 2.0 — see [LICENSE](LICENSE) and [NOTICE](NOTICE). Third-party licenses:
[THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md).
