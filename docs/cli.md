# CLI reference

Use `fetchkeep <command> --help` for the complete option list. Global options: `--home <dir>`, `--workspace <name>` (`-w`), `--config <file>`, `--json`, `--allow-private-network`, repeatable `--allow-host <host>`.

Human mode writes content to stdout and metadata to stderr. `--json` writes the shared response envelope. Exit codes: 0 success, 1 error, 2 usage, 3 partial. Do not discard partial results without inspecting their warnings.

| Command | Purpose and principal options |
|---|---|
| `fetch <url>` | Fetch/extract/save. `--mode http\|auto\|chromium\|lightpanda\|browser`, `--timeout <ms>`, `--max-chars <n>`, `--offset <n>`, `--no-save`, `--blocks`. |
| `read <target>` | Offline read by URL, document ID or citation. `--version <n>`, `--offset <n>`, `--max-chars <n>`, `--blocks b3-b7`, `--find <quote>`, `--include-blocks`. |
| `search <query...>` | Offline FTS. `--limit <n>`, `--all-versions`, `--in <target>`. `--web` explicitly uses configured SearXNG. |
| `crawl [url]` | Bounded crawl. `--max-pages <n>`, `--max-depth <n>`, repeatable `--include`/`--exclude` path globs or `/regex/`, `--delay <ms>`, `--concurrency <1-8>`, `--sitemap include\|skip\|only`, `--mode`, `--timeout <ms>` overall, `--page-timeout <ms>`. |
| `crawl --resume <crawlId>` | Continue a saved frontier. Omit the start URL. |
| `crawls` | List recent crawls and their IDs. |
| `list` | List saved documents. |
| `versions <target>` | List a document's saved versions. |
| `export` | Export every stored version as JSON Lines. |
| `delete <targets...>` | Remove documents, including all versions, blocks and snapshots. Destructive. |
| `prune` | Retention: `--keep-versions <n>`, `--older-than 30d` (also hours or ISO dates), `--raw old\|all`. Destructive. |
| `extract <target> --schema <file-or-JSON>` | Experimental Ollama extraction. `--instructions <text>`, `--model <name>`, `--max-chars <n>`. See [evidence semantics](ollama.md). |
| `doctor` | Diagnose store, network policy and optional integrations. |
| `mcp` | Serve MCP over stdio; stdout is protocol-only. |

Crawls default to same-origin and respect robots.txt. `--any-origin` broadens scope; `--no-robots` is for sites you operate. Interrupt a crawl to retain its frontier, then resume by ID. Network allowlists do not imply crawl-scope permission.

```sh
fetchkeep --json fetch https://example.com --mode http
fetchkeep read https://example.com --find "documentation examples"
fetchkeep search domain
fetchkeep crawl https://example.com --max-pages 10 --max-depth 1
fetchkeep crawls
fetchkeep export > saved.jsonl
```

Citation references remain readable while their document version is retained. Deleting or pruning that version removes its local citation target. Output budgets do not delete the full stored document: use the returned `nextOffset` to page through it.
