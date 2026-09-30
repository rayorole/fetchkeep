import { html, type Handler } from "./server.js";

/**
 * Pages that only show their content after JavaScript runs, for browser integration tests. Serve them on `localhost`
 * with only `localhost` allow-listed: the app page also requests `/secret` via 127.0.0.1, which the policy must block.
 */
export function jsFixtures(): Record<string, Handler> {
  return {
    "/js/app": html(`<!doctype html><html><head><title>JS app</title></head><body><div id="root"></div>
<noscript>Please enable JavaScript.</noscript>
<script>
fetch("/js/data.json").then(r => r.json()).then(d => {
  const root = document.getElementById("root");
  root.innerHTML = "<main><h1>" + d.title + "</h1><p>" + d.body + "</p><table><tr><th>k</th><th>v</th></tr>" +
    d.rows.map(r => "<tr><td>" + r[0] + "</td><td>" + r[1] + "</td></tr>").join("") + "</table></main>";
  fetch("http://127.0.0.1:" + location.port + "/secret").catch(() => {});
});
</script></body></html>`),
    "/js/data.json": (_q, res) =>
      void res.writeHead(200, { "content-type": "application/json" }).end(
        JSON.stringify({ title: "Rendered heading", body: "This paragraph was inserted by client-side JavaScript after an XHR.", rows: [["alpha", "1"], ["beta", "2"]] }),
      ),
    "/js/state": html(`<!doctype html><html><head><title>State</title></head><body><main><h1>State</h1><p id="out"></p></main>
<script>
const seen = "cookie=" + (document.cookie || "none") + " storage=" + (localStorage.getItem("k") || "none");
document.getElementById("out").textContent = seen + " — isolation probe for browser contexts.";
document.cookie = "k=1; path=/"; localStorage.setItem("k", "1");
</script></body></html>`),
    "/secret": html("<p>internal secret</p>"),
    "/js/slow": (_q, res) => {
      // HTML completes, but a subresource never does, so the `load` event cannot fire.
      res.writeHead(200, { "content-type": "text/html" }).end(`<html><body><p>slow</p><img src="/js/never.png"></body></html>`);
    },
    "/js/never.png": () => {
      /* never respond */
    },
  };
}
