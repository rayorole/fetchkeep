## Optional integrations (not installed by default)

| Component | How it is used | License | Notes |
|---|---|---|---|
| `playwright-core` | Optional peer dependency for the Chromium backend, loaded with `import()` only when configured. | Apache-2.0 | Install separately: `npm i playwright-core`. |
| Chromium headless shell / Chrome / Edge | Separately installed browser binary started by Playwright. | BSD-3-Clause and others (Chromium); proprietary (Chrome, Edge) | Fetchkeep never downloads a browser. Install with `npx playwright-core install --only-shell chromium`. |
| `puppeteer-core` | Optional peer dependency for the experimental Lightpanda backend. | Apache-2.0 | Install separately: `npm i puppeteer-core`. |
| Lightpanda browser | Separately installed executable or CDP endpoint. | AGPL-3.0-only | Not bundled, downloaded or redistributed by Fetchkeep. See `docs/research.md#licensing-implications`. |
| Ollama | Optional local HTTP service for schema extraction. | MIT (Ollama); model licenses vary | User-installed and user-configured. |
| SearXNG | Optional user-configured web search endpoint. | AGPL-3.0-or-later | Accessed over HTTP only; not bundled. |

## Benchmark-only tools (never part of the npm package)

| Component | Use | License |
|---|---|---|
| Firecrawl (self-hosted via Docker Compose, or hosted API) | Benchmark subject, reached over HTTP. | AGPL-3.0-only (repository) |
| DonSeTch (`donsetch` binary) | Benchmark subject, invoked as a CLI. | AGPL-3.0-only |
| `gpt-tokenizer` (devDependency) | Fixed `o200k_base` tokenizer for token counts. | MIT |
