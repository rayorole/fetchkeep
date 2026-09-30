# Browser backends

Fetchkeep works without any browser. HTTP fetching, extraction, saving, reading, searching and crawling never
download or start one. Browsers are optional backends for pages that only produce their content with JavaScript.

| Backend | Status | Library (optional peer) | Browser binary |
|---|---|---|---|
| `http` | default | — | — |
| `chromium` | supported | `playwright-core` | Chromium headless shell, or an explicitly selected installed Chrome/Edge |
| `lightpanda` | **experimental** | `puppeteer-core` | separately installed Lightpanda (AGPL-3.0) |

Fetchkeep never installs a browser, never downloads one at runtime and never contacts a remote browser service.

## Modes

| `mode` | Behaviour |
|---|---|
| `auto` (default) | HTTP first. Escalates to an enabled browser only when the HTTP result looks incomplete (see heuristic). |
| `http` | HTTP only. Never escalates. |
| `chromium` / `lightpanda` | That browser only. Errors with `browser_unavailable` if it is not enabled/installed. |
| `browser` | Enabled browsers in preference order (`browser.preferred`, default `chromium`). |

Every attempt is recorded in `backend.attempts` (`backend`, `outcome` = success / insufficient / failed /
unavailable / skipped, `reason`, `errorCode`, `durationMs`). All attempts share one end-to-end deadline
(`timeoutMs`); a browser attempt is skipped if less than one second remains.

If `auto` decides rendering is needed but no browser is enabled or the browser fails, the HTTP result is
returned with `status: "partial"` and a warning that explains why; nothing is silently substituted.

## Escalation heuristic (`src/core/heuristics.ts`)

Computed from the HTTP response only, deterministically:

1. HTTP 403, 429 or 503 → escalate (often a JavaScript challenge or bot wall).
2. An app root (`#root`, `#app`, `#__next`, `#__nuxt`, `[data-reactroot]`, `app-root`, `[ng-version]`, …) with
   < 200 characters of text **and** fewer than 1 000 extracted characters → escalate.
3. A `<noscript>`/body notice such as "enable JavaScript" **and** fewer than 1 500 extracted characters → escalate.
4. Fewer than 200 extracted characters on a page with at least one `<script>` → escalate.
5. Otherwise keep the HTTP result. Non-HTML content (PDF, text, JSON) never escalates.

After a successful render, the rendered result is used unless it contains less text than the HTTP result.
Override per request with `mode`.

## Chromium (Playwright)

Install only the library and the headless shell (≈115 MiB download, no full Chrome, no Firefox/WebKit):

```sh
npm install playwright-core            # next to fetchkeep (global: npm i -g playwright-core)
npx playwright-core install --only-shell chromium
```

Enable it:

```sh
export FETCHKEEP_CHROMIUM=1            # or "browser": { "chromium": { "enabled": true } } in config.json
fetchkeep doctor                       # shows "browser:chromium" availability
```

Use an installed Chrome or Edge instead (explicit only; never picked implicitly):

```sh
export FETCHKEEP_CHROMIUM_CHANNEL=chrome      # or msedge
# or
export FETCHKEEP_CHROMIUM_EXECUTABLE="/path/to/chrome"
```

Isolation, verified by `npm run test:browser` (`test/browser/chromium.browser.test.ts`):

- One browser process is launched lazily and reused; it uses a temporary automation profile created by
  Playwright, never the user's profile, cookies or extensions.
- Every render gets a fresh browser context: cookies and `localStorage` from one request are not visible to the
  next (tested). Service workers are blocked; downloads are refused.
- Every subrequest (document, XHR/fetch, image, script, frame) and WebSocket goes through the network policy
  before it leaves the browser; blocked requests are aborted and counted (tested: a page's request to
  `127.0.0.1` is never received by the server).
- Chromium's OS sandbox stays **on** (`chromiumSandbox: true`). If your environment cannot run it (some
  containers running as root), set `FETCHKEEP_CHROMIUM_SANDBOX=0` explicitly.
- A render that times out or crashes closes the browser; the next request launches a fresh one (tested).
- Resource controls: `browser.maxConcurrency` (default 2) concurrent pages, queued requests honour the deadline,
  `browser.idleMs` (default 60 s) closes an idle browser, `limits.maxBytes` caps the serialized DOM.

Residual risk: Chromium resolves DNS itself after the policy check, so a hostile DNS server could still race a
rebinding answer. For untrusted input, prefer `http` or run Fetchkeep in a network namespace without internal
access. See [security.md](security.md).

## Configuration reference

| Setting | Env | Default |
|---|---|---|
| `browser.preferred` | `FETCHKEEP_BROWSER` | `chromium` |
| `browser.maxConcurrency` | — | `2` |
| `browser.idleMs` | — | `60000` |
| `browser.settleMs` (extra wait after `load`) | — | `500` |
| `browser.chromium.enabled` | `FETCHKEEP_CHROMIUM` | `false` |
| `browser.chromium.channel` | `FETCHKEEP_CHROMIUM_CHANNEL` | Playwright headless shell |
| `browser.chromium.executablePath` | `FETCHKEEP_CHROMIUM_EXECUTABLE` | — |
| `browser.chromium.sandbox` | `FETCHKEEP_CHROMIUM_SANDBOX` | `true` |
