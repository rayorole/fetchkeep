# Configuration

Precedence, lowest to highest: built-in defaults → config file → environment variables → CLI flags.

The config file is `$FETCHKEEP_HOME/config.json` (default `~/.fetchkeep/config.json`), or the path given with
`--config` / `FETCHKEEP_CONFIG`. It is validated strictly; unknown keys are errors. Schema: `src/core/config.ts`.

```json
{
  "workspace": "default",
  "timeoutMs": 30000,
  "maxChars": 40000,
  "rawSnapshots": "latest",
  "network": { "allowPrivateNetwork": false, "allowHosts": [], "allowCidrs": [] },
  "limits": { "maxCompressedBytes": 10485760, "maxBytes": 26214400, "maxRedirects": 10 },
  "browser": {
    "preferred": "chromium",
    "maxConcurrency": 2,
    "idleMs": 60000,
    "settleMs": 500,
    "chromium": { "enabled": false, "sandbox": true },
    "lightpanda": { "enabled": false, "executableArgs": [] }
  },
  "crawl": { "maxPages": 50, "maxDepth": 3, "delayMs": 500, "respectRobots": true },
  "search": { "searxng": { "url": "http://127.0.0.1:8888", "timeoutMs": 10000 } },
  "ollama": { "url": "http://127.0.0.1:11434", "model": "qwen3:4b", "timeoutMs": 120000 }
}
```

| Setting | Meaning |
|---|---|
| `workspace` | Isolated store under `$FETCHKEEP_HOME/workspaces/<name>/`. |
| `timeoutMs` | End-to-end deadline per fetch, shared by every backend attempt. |
| `maxChars` | Default output budget; longer content is paginated with `offset`/`nextOffset`. |
| `rawSnapshots` | Keep raw source bytes for `all` versions, only the `latest` (default) or `none`. |
| `network.*` | Exceptions to the private-network block (see [security.md](security.md)). |
| `limits.*` | Network bytes, decoded bytes and redirects per request. |
| `userAgent` | Override the default `Fetchkeep/<version> (+https://github.com/rayorole/fetchkeep)`. |
| `browser.*` | See [browsers.md](browsers.md). |
| `crawl.*` | Defaults for `crawl` / `web_crawl`. |
| `search.searxng` | Optional web search provider (your own SearXNG with the JSON format enabled). |
| `ollama` | Optional schema extraction (see [ollama.md](ollama.md)). |

## Environment variables

| Variable | Effect |
|---|---|
| `FETCHKEEP_HOME` | Data directory (default `~/.fetchkeep`). |
| `FETCHKEEP_CONFIG` | Config file path. |
| `FETCHKEEP_WORKSPACE` | Workspace name. |
| `FETCHKEEP_ALLOW_PRIVATE_NETWORK=1` | Allow all private destinations (trusted local use only). |
| `FETCHKEEP_ALLOW_HOSTS=a.internal,*.corp.example` | Hosts allowed to resolve to private addresses. |
| `FETCHKEEP_ALLOW_CIDRS=10.1.0.0/16` | Private ranges to allow. |
| `FETCHKEEP_CHROMIUM=1` | Enable the Chromium backend. |
| `FETCHKEEP_CHROMIUM_CHANNEL` / `FETCHKEEP_CHROMIUM_EXECUTABLE` | Use an installed Chrome/Edge explicitly. |
| `FETCHKEEP_CHROMIUM_SANDBOX=0` | Disable Chromium's sandbox (only where it cannot run). |
| `FETCHKEEP_LIGHTPANDA_EXECUTABLE` / `FETCHKEEP_LIGHTPANDA_ENDPOINT` | Enable the experimental Lightpanda backend. |
| `FETCHKEEP_BROWSER=chromium\|lightpanda` | Preferred browser for `auto`/`browser` modes. |
| `FETCHKEEP_SEARXNG_URL` | Enable web search through your SearXNG. |
| `FETCHKEEP_OLLAMA_URL`, `FETCHKEEP_OLLAMA_MODEL` | Enable Ollama extraction. |

## Storage layout

```
~/.fetchkeep/
  config.json                      optional
  workspaces/<name>/fetchkeep.sqlite
```

The SQLite file holds documents, versions (normalized Markdown, hashes, fetch time, extractor version, backend),
blocks with an FTS5 index, raw snapshots (gzip, content-addressed) and crawl frontiers. `fetchkeep export` writes
JSON Lines; `fetchkeep prune --keep-versions N | --older-than 30d | --raw old|all` applies retention;
`fetchkeep delete <url|id>` removes a document with all versions and snapshots.
