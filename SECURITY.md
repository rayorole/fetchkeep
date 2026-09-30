# Security Policy

## Reporting a vulnerability

Please report vulnerabilities privately through GitHub Security Advisories
(<https://github.com/rayorole/fetchkeep/security/advisories/new>). Do not open a public issue for
security problems. You should receive an acknowledgement within 7 days.

## Supported versions

Only the latest released minor version receives security fixes.

## Security model (summary)

Fetchkeep fetches untrusted content on behalf of agents. Its defaults are:

- **Network policy:** requests to loopback, private (RFC 1918 / ULA), link-local, CGNAT, multicast,
  unspecified, documentation/benchmark ranges and cloud metadata addresses are refused. The check is
  applied to every redirect hop and to the addresses a hostname actually resolves to; the connection is
  pinned to the checked address to prevent DNS rebinding. Browser backends apply the same policy to
  subrequests. Local access requires an explicit `allowPrivateNetwork` or `allowHosts` configuration.
- **No script execution in-process:** HTML is parsed with scripting disabled. JavaScript only runs in
  an optional, separately installed browser process.
- **Resource limits:** deadlines, redirect limits, and limits on compressed and decompressed response
  sizes, output size and browser concurrency.
- **Untrusted output:** fetched content is returned as data, clearly delimited from tool instructions.
  Agents should still treat it as potentially adversarial (prompt injection).
- **No implicit browser profiles:** browser backends use a fresh, isolated automation context and never
  the user's personal profile or cookies.

See `docs/security.md` for details and known limitations.
