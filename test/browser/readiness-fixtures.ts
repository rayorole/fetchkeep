import { html, type Handler } from "../support/server.js";

/** Consumer regressions shared by both real-browser suites, not benchmark fixtures. */
export function readinessFixtures(): Record<string, Handler> {
  return {
    "/readiness/delayed": html(`<!doctype html><html><body><main id="app" aria-busy="true">Loading reference...</main>
<script>setTimeout(() => {
  const app = document.getElementById("app");
  app.innerHTML = '<article><h1>Delayed reference</h1><p>This reference becomes available after a delayed client-side update with no network activity.</p><pre><code>const delayedAnswer = 42;</code></pre></article>';
  app.removeAttribute("aria-busy");
}, 1500);</script></body></html>`),
    "/readiness/long-delayed": html(`<!doctype html><html><body>
<header><h1>Observation archive</h1></header><nav>Browse the archive, sign in, read our policy and explore related reports.</nav>
<div id="observations"></div><footer><p>This long footer is navigation and copyright information, not the article the consumer requested.</p></footer>
<script>setTimeout(() => {
  document.getElementById("observations").innerHTML = '<article><h1>Late observations</h1><p>The survey counted seventeen nesting pairs after asynchronous initialization.</p></article>';
}, 10000);</script></body></html>`),
    "/readiness/short-static": html("<!doctype html><html><body><main><p>Closed on Tuesday.</p></main></body></html>"),
    "/readiness/never-ready": html('<!doctype html><html><body><main aria-busy="true">Loading reference...</main><script>setInterval(() => {}, 1000)</script></body></html>'),
    "/readiness/settle": html(`<!doctype html><html><body><main><h1>Reference</h1><p id="version">The initial reference already has enough readable text to pass content readiness, before its unmarked update.</p></main>
<script>setTimeout(() => { document.getElementById("version").textContent = "The explicit settle window includes this updated reference version."; }, 200);</script></body></html>`),
    "/readiness/shadow": html(`<!doctype html><html><body><main><h1>Component reference</h1><p>Examples in nested open shadow roots and assigned slots must preserve their code exactly once.</p>
<code-example><pre slot="sample"><code>const slottedAnswer = 43;</code></pre><p>UNASSIGNED LIGHT DOM</p></code-example></main>
<script>
const outer = document.querySelector("code-example").attachShadow({ mode: "open" });
outer.innerHTML = '<section><slot name="sample"><p>UNUSED FALLBACK</p></slot><nested-code></nested-code><slot name="missing"><pre><code>const fallbackAnswer = 45;</code></pre></slot></section>';
outer.querySelector("nested-code").attachShadow({ mode: "open" }).innerHTML = '<pre><code>const shadowAnswer = 44;</code></pre>';
</script></body></html>`),
    "/readiness/background": html(`<!doctype html><html><body><main><h1>Reference with background activity</h1><p>The useful reference content is already ready even though an unrelated background request remains open.</p></main>
<script>fetch("/readiness/pending").catch(() => {});</script></body></html>`),
    "/readiness/pending": () => { /* intentionally never completes */ },
  };
}
