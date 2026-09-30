# Security model

Fetchkeep retrieves untrusted content for agents. This document describes what is enforced, where, and the known
gaps.

## Network policy (SSRF protection)

Default: only globally routable unicast addresses may be contacted. Blocked ranges include loopback, RFC 1918
private, CGNAT (`100.64.0.0/10`), link-local (incl. cloud metadata `169.254.169.254`), unique-local IPv6, multicast,
broadcast, unspecified, reserved, documentation/benchmarking ranges, 6to4/Teredo/NAT64 and IPv4-mapped IPv6 forms
of all of these (classification by `ipaddr.js`).

Where it is enforced:

| Stage | Mechanism |
|---|---|
| URL validation | Only `http:`/`https:`; no embedded credentials; IP-literal hosts are classified immediately. |
| DNS resolution | Undici's connector uses `NetworkPolicy.lookup`. It resolves *all* addresses, refuses the request if **any** is blocked, and hands only checked addresses to the socket, so the connection cannot be re-pointed between check and connect (no DNS-rebinding window). |
| Redirects | Redirects are followed manually; each hop goes through URL validation and the same lookup. |
| Browser subrequests | Chromium: Playwright request routing checks every request (documents, XHR/fetch, images, scripts, frames) and WebSocket; Lightpanda: CDP `Fetch` interception plus `--block-private-networks`. See the caveat below. |
| Crawling | Every discovered URL goes through the same fetch path. |

Opt-outs (explicit, never implicit):

- `network.allowPrivateNetwork: true` / `FETCHKEEP_ALLOW_PRIVATE_NETWORK=1` — trusted local use only.
- `network.allowHosts: ["intranet.example", "*.corp.example"]` — hosts that may resolve to private addresses.
- `network.allowCidrs: ["10.20.0.0/16"]` — address ranges to permit.

Browser caveat: browsers resolve DNS themselves. The interception hook resolves the hostname and blocks internal
answers, but the browser performs its own lookup afterwards, so a hostile DNS server with a very short TTL could
still answer differently (a rebinding race). Use the HTTP backend, or run browsers in a network namespace/container
without access to internal networks, when fetching arbitrary URLs from untrusted input.

## Resource limits

| Limit | Default | Config |
|---|---|---|
| End-to-end deadline per request (all backends/attempts) | 30 s | `timeoutMs` / `--timeout` |
| Redirects | 10 | `limits.maxRedirects` |
| Bytes read from the network | 10 MiB | `limits.maxCompressedBytes` |
| Bytes after decompression (bomb protection) | 25 MiB | `limits.maxBytes` |
| Returned characters per call | 40 000 | `maxChars` / `--max-chars` |
| Browser concurrency / idle shutdown | 2 pages / 60 s | `browser.maxConcurrency`, `browser.idleMs` |

Exceeding a size limit truncates HTML/text (reported as `partial` with a truncation reason) and fails PDFs with
`response_too_large`.

## Script execution

The core parses HTML with `linkedom`, which has no script engine and loads no subresources. PDF.js runs with fonts
disabled and without PDF scripting. JavaScript only runs inside an optional, separately installed browser process,
in a fresh browser context per request with service workers and downloads disabled. Chromium runs with its sandbox
enabled (`chromiumSandbox: true`); if your environment cannot support it (e.g. some containers running as root), set
`browser.chromium.sandbox: false` explicitly and understand the risk. Lightpanda provides no process sandbox: isolate
it externally (container, VM or WSL) before using it on arbitrary sites.

## Untrusted output

Fetched text can contain prompt-injection attempts. MCP responses place page content inside clearly delimited
`<untrusted-web-content>` sections and never mix it with tool instructions. Agents should still treat it as data.

## Local data

Stores live under `~/.fetchkeep/workspaces/<name>/` (override with `FETCHKEEP_HOME`). They can contain copies of
fetched pages; protect them like browser caches. `fetchkeep delete` and `fetchkeep prune` remove content;
`rawSnapshots: "none"` disables raw source retention. Fetchkeep never reads browser profiles or cookies.
