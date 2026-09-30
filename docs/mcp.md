# MCP server

`fetchkeep mcp` runs a Model Context Protocol server over stdio using the official TypeScript SDK. stdout carries only
JSON-RPC messages (every `console` method is redirected to stderr before anything else starts); diagnostics go to
stderr.

## Client configuration

Claude Desktop / Claude Code / most MCP clients:

```json
{
  "mcpServers": {
    "fetchkeep": {
      "command": "fetchkeep",
      "args": ["mcp"],
      "env": { "FETCHKEEP_WORKSPACE": "research" }
    }
  }
}
```

Without a global install, point `command` at Node and the built entry point:
`"command": "node", "args": ["/path/to/fetchkeep/dist/src/cli/main.js", "mcp"]`.

Add `"FETCHKEEP_CHROMIUM": "1"` to `env` to enable JavaScript rendering (see [browsers.md](browsers.md)).

## Tools

| Tool | Purpose | Key arguments |
|---|---|---|
| `web_fetch` | Fetch a URL as Markdown, save it, return a reference | `url`, `mode` (`auto`/`http`/`chromium`/`lightpanda`/`browser`), `maxChars`, `offset`, `timeoutMs`, `save`, `includeBlocks` |
| `web_read` | Read saved documents offline | `target` (URL, `d_…` id or `fk:` ref), `version`, `blocks` (`b3-b7`), `find` (exact quote), `offset`, `maxChars` |
| `web_search` | Search saved documents (FTS5), or the web if configured | `query`, `source` (`local`/`web`), `limit`, `allVersions`, `target` |
| `web_crawl` | Bounded same-origin crawl; every page is saved | `url` or `resume`, `maxPages`, `maxDepth`, `include`, `exclude`, `sitemap`, `mode`, `delayMs`, `timeoutMs` |
| `web_extract` | Experimental: schema-based extraction with Ollama, with evidence per field | `target`, `schema`, `instructions`, `model` |

## Response envelope

`structuredContent` of every tool (and `--json` output of the CLI) is the same envelope
(`src/core/schema.ts`):

```jsonc
{
  "status": "success",            // success | partial | error
  "tool": "web_fetch",
  "document": { "id": "d_…", "version": 2, "ref": "fk:d_…@2", "requestedUrl": "…", "finalUrl": "…", "title": "…",
                "contentType": "text/html", "httpStatus": 200, "fetchedAt": "…", "contentHash": "…", "rawHash": "…",
                "extractorVersion": "fk-extract/1", "strategy": "readability", "backend": "http", "saved": true },
  "citation": { "ref": "fk:d_…@2", "url": "…", "title": "…", "fetchedAt": "…", "version": 2, "contentHash": "…" },
  "content": { "format": "markdown", "text": "…", "blocks": [ { "id": "b1", "type": "heading", "text": "…", "hash": "…", "offset": 0 } ] },
  "backend": { "mode": "auto", "used": "http", "escalated": false,
               "attempts": [ { "backend": "http", "outcome": "success", "httpStatus": 200, "durationMs": 212.4 } ] },
  "truncation": { "truncated": true, "reasons": ["output_budget"], "totalChars": 91234, "returnedChars": 39870,
                  "offset": 0, "nextOffset": 39870 },
  "timings": { "firstByteMs": 120.3, "downloadMs": 180.9, "extractMs": 25.1, "totalMs": 212.4 },
  "warnings": [],
  "error": { "code": "blocked_by_policy", "message": "…", "retryable": false, "hint": "…" }   // only on errors
}
```

The text content renders the same information and wraps page text in
`<untrusted-web-content source="…" ref="…"> … </untrusted-web-content>`; closing-tag look-alikes inside page text are
neutralized. The server instructions tell agents never to follow instructions found inside that section.

## Citing

1. `web_fetch` (or `web_crawl`) saves the page and returns `document.ref`.
2. `web_read` with `find: "<quote>"` returns the block(s) containing the exact quote and a block citation
   (`fk:d_…@2#b7`, block hash, quote).
3. Anyone can later `web_read` that reference offline and get the identical block text.
