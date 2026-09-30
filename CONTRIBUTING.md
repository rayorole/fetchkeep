# Contributing to Fetchkeep

Thanks for helping. Fetchkeep is a small, dependency-conscious project; please keep changes focused.

## Workflow

1. Open (or pick) an issue describing the problem and concrete acceptance criteria.
2. Branch from `main` using `<type>/<issue>-<slug>` (for example `feat/5-crawl`).
3. Keep one concern per pull request and reference the issue (`Closes #5`).
4. Run the checks below before pushing. CI runs the same commands on Linux and Windows.

```sh
npm ci
npm run check   # strict TypeScript typecheck
npm test        # deterministic unit, integration and MCP contract tests
```

Browser, live-site and paid benchmark tests are **never** part of `npm test`. Run them explicitly:

```sh
npm run test:browser   # needs playwright-core + chromium headless shell and/or a Lightpanda endpoint
npm run bench -- --suite smoke
```

## Rules

- TypeScript `strict` mode; no `any` escapes without a comment explaining why.
- Pin dependency versions exactly and commit `package-lock.json`. Record new dependencies and their licenses in `THIRD_PARTY_LICENSES.md`.
- Do not copy code from projects with incompatible licenses (for example AGPL-3.0 projects such as Lightpanda or DonSeTch). Describe behavior, write it independently.
- Never commit credentials, cookies, browser profiles, fetched private content, or benchmark runs containing third-party page content outside `bench/fixtures`.
- The core must keep working with no browser, no LLM and no network service other than the target website.
- MCP stdio code must never write to stdout except through the SDK transport; log to stderr.
- Tests must be deterministic and must not reach the public internet.

## Releases

Stable GitHub releases trigger npm publication after version, ancestry, test and clean-install gates.
Pushes to `main` do not publish. See [releasing.md](docs/releasing.md) for the required one-time npm
trusted-publisher setup and release procedure.

## License

By contributing you agree that your contributions are licensed under the Apache License 2.0.
