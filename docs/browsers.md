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
| `chromium` / `lightpanda` | Select that browser; unsupported non-HTML content falls back to HTTP with a recorded attempt. Errors with `browser_unavailable` if it is not enabled/installed. |
| `browser` | Enabled browsers in preference order (`browser.preferred`, default `chromium`). |

Every attempt is recorded in `backend.attempts` (`backend`, `outcome` = success / insufficient / failed /
unavailable / skipped, `reason`, `errorCode`, `durationMs`). All attempts share one end-to-end deadline
(`timeoutMs`); a browser attempt is skipped if less than one second remains.

If `auto` decides rendering is needed but no browser is enabled or the browser fails, the HTTP result is
returned with `status: "partial"` and a warning that explains why; nothing is silently substituted.

Recommendation: HTTP-first auto with optional Chromium. Lightpanda remains experimental; see the
[measured quality, latency and resource comparison](../bench/results/README.md).

## Escalation heuristic (`src/core/heuristics.ts`)

Computed from the HTTP response only, deterministically:

1. HTTP 403, 429 or 503 → escalate (often a JavaScript challenge or bot wall).
2. An app root (`#root`, `#app`, `#__next`, `#__nuxt`, `[data-reactroot]`, `app-root`, `[ng-version]`, …) with
   < 200 characters of text **and** fewer than 1 000 extracted characters → escalate.
3. A `<noscript>`/body notice such as "enable JavaScript" **and** fewer than 1 500 extracted characters → escalate.
4. Fewer than 200 extracted characters on a script-driven page — at least 1 000 characters of inline script, two or
   more external scripts, or an essentially empty body (< 50 characters) with any script → escalate. A single
   analytics tag on a small page does not count.
5. Otherwise keep the HTTP result. Non-HTML content (PDF, text, JSON) never escalates.

After a successful render, the rendered result is used unless it contains less text than the HTTP result.
Override per request with `mode`.

## Chromium (Playwright)

Install only the library and the headless shell (≈115 MiB download, no full Chrome, no Firefox/WebKit):

```sh
npm install playwright-core            # next to fetchkeep (global: npm i -g playwright-core)
npx playwright-core install --only-shell chromium
```

On Linux the headless shell needs a few system libraries (`libnss3`, `libnspr4`, `libasound2`); install them with
`sudo npx playwright-core install-deps chromium-headless-shell` or your package manager.

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

Isolation, verified by `npm run test:browser` (`test/browser/chromium.browser.test.ts`; passing on Windows 11 and on
Ubuntu 24.04/WSL2 with headless shell 153.0.8010.12, playwright-core 1.63.0, sandbox enabled):

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

## Lightpanda (experimental)

[Lightpanda](https://github.com/lightpanda-io/browser) is a headless browser written in Zig with V8. It has no
graphical rendering and implements a subset of browser APIs, so some sites will not work. Fetchkeep talks to it
over CDP with `puppeteer-core`; it does **not** assume Playwright compatibility.

Verified with nightly `1.0.0-nightly.9929+e774f9bba` (`lightpanda-x86_64-linux`, SHA-256
`16ee4443e34d09c522d8c416c6096bcd5a3dffd56706b7a8e2d7d0b1172ecc62`) on Ubuntu 24.04 (WSL2):

| Check (`test/browser/lightpanda.browser.test.ts`) | Result |
|---|---|
| DOM + JavaScript + `fetch()`/XHR rendering, auto escalation | pass |
| Subrequest to a blocked address intercepted (never reaches the server) | pass |
| Cookies / `localStorage` isolated between renders | pass |
| Deadline honoured; next render works | pass — note Lightpanda fires `load` without waiting for images, so the never-loading image fixture does not time out as it does in Chromium |
| Navigation to blocked address refused | pass |
| Telemetry disabled (`LIGHTPANDA_DISABLE_TELEMETRY=true` in the spawned process environment) | verified via `/proc/<pid>/environ` |
| Process stopped on close / idle | verified |

Install (Linux x86_64 / aarch64, macOS; **no native Windows build** — run it in WSL2):

```sh
npm install puppeteer-core
curl -L -o lightpanda https://github.com/lightpanda-io/browser/releases/download/nightly/lightpanda-x86_64-linux
chmod +x lightpanda
export FETCHKEEP_LIGHTPANDA_EXECUTABLE="$PWD/lightpanda"   # Fetchkeep spawns `lightpanda serve` on demand
# or run it yourself and connect:
#   LIGHTPANDA_DISABLE_TELEMETRY=true ./lightpanda serve --host 127.0.0.1 --port 9222
#   export FETCHKEEP_LIGHTPANDA_ENDPOINT=ws://127.0.0.1:9222
```

Windows: WSL2's default NAT networking forwards `localhost` ports from WSL to Windows, so an endpoint started in WSL
is reachable as `ws://127.0.0.1:9222` from Windows, but Lightpanda inside WSL resolves `localhost` to the WSL VM,
not to Windows. Set `"executablePath": "wsl"` with `"executableArgs": ["-d", "Ubuntu", "--", "/home/you/lightpanda"]`
to let Fetchkeep spawn it (it adds `LIGHTPANDA_DISABLE_TELEMETRY` to `WSLENV`). Running Fetchkeep itself inside WSL is
simpler and is what the benchmark does.

Behaviour and safety:

- When Fetchkeep spawns Lightpanda it binds to `127.0.0.1` on a free port, sets `LIGHTPANDA_DISABLE_TELEMETRY=true`
  (Lightpanda otherwise sends usage telemetry to `telemetry.lightpanda.io`), and passes `--block-private-networks`
  when the policy allows no private destination. With `allowHosts`/`allowCidrs`, CDP request interception alone
  enforces the policy (Lightpanda's flag cannot express allow-lists). For a user-supplied endpoint, telemetry and
  flags are the user's responsibility.
- Each render uses its own CDP connection and browser context.
- Lightpanda provides **no process sandbox**. Page JavaScript runs in the Lightpanda process with its network
  access. Only use it for arbitrary sites inside an external sandbox (container, VM, WSL).
- Licensing: Lightpanda is AGPL-3.0-only. Fetchkeep does not bundle, download or redistribute it; see
  [research.md](research.md#licensing-implications) for what that does and does not settle.
- Performance: see the [benchmark report](../bench/results/README.md) for measured results and caveats.

| Setting | Env | Default |
|---|---|---|
| `browser.lightpanda.enabled` | `FETCHKEEP_LIGHTPANDA` (implied by the two below) | `false` |
| `browser.lightpanda.endpoint` | `FETCHKEEP_LIGHTPANDA_ENDPOINT` | — |
| `browser.lightpanda.executablePath` | `FETCHKEEP_LIGHTPANDA_EXECUTABLE` | — |
| `browser.lightpanda.executableArgs` | — | `[]` |

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
