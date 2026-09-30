const TRACKING_PARAM = /^(utm_[a-z]+|fbclid|gclid|mc_cid|mc_eid|_hsenc|_hsmi|ref_src)$/i;

/**
 * Canonical form used as document identity and for crawl deduplication: lower-case scheme and host, no default
 * port, no fragment, no tracking parameters, empty path becomes `/`. Query parameter order is preserved because it
 * can be significant.
 */
export function normalizeUrl(input: string | URL): string {
  const url = new URL(typeof input === "string" ? input : input.href);
  url.hash = "";
  if ((url.protocol === "http:" && url.port === "80") || (url.protocol === "https:" && url.port === "443")) url.port = "";
  const kept = [...url.searchParams].filter(([k]) => !TRACKING_PARAM.test(k));
  if (kept.length !== [...url.searchParams].length) {
    url.search = kept.length ? `?${new URLSearchParams(kept).toString()}` : "";
  }
  let href = url.href;
  if (href.endsWith("?")) href = href.slice(0, -1);
  return href;
}
