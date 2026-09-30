# Publishing to npm

## Strategy

Pushes to `main` run CI, not publishing. Publish a **stable GitHub release** for a reviewed version to trigger `.github/workflows/publish.yml`. npm versions are immutable; do not publish every commit with the same version or republish an existing version.

The workflow requires a stable `vX.Y.Z` tag matching `package.json`, with its commit reachable from `main`. It runs checks/tests and browser-free tarball installation on Linux/Windows, Node 22/24. Only after all four jobs pass does the `npm` environment job build, smoke-test and publish its tarball to `latest`, with OIDC authentication and provenance. No npm token secret is used. Prereleases are skipped; this workflow does not publish canary/beta packages.

The clean-install smoke accesses npm and example.com. A network outage fails the release rather than publishing an unverified package. Rerun failed jobs after resolving the outage. An already-published version will fail publication instead of being silently skipped.

## Trusted publisher configuration

The owner has published `fetchkeep@0.1.0` and configured npm trusted publishing. Bootstrap is complete:
do not manually republish that version. Future releases use the workflow.

The npm package's Settings → Trusted publishing entry must match:

   | Field | Value |
   |---|---|
   | Organization or user | `rayorole` |
   | Repository | `fetchkeep` |
   | Workflow filename | `publish.yml` (not a path) |
   | Environment name | `npm` |
   | Allowed actions | Enable direct `npm publish` |

The GitHub `npm` environment permits `v*` tags. Optionally require a release reviewer. Keep its name identical
to npm's configuration and protect `main` and release tags against unauthorized changes.

After the first successful OIDC release, disable token-based publishing in npm package settings if no other
publisher needs it. Keep account recovery/2FA configured; do not put login credentials or tokens into GitHub.

Trusted publishing requires GitHub-hosted runners, Node >=22.14 and npm >=11.5.1. The publish job uses Node 24 and checks its npm version. Source: [npm trusted publishing documentation](https://docs.npmjs.com/trusted-publishers/).

## Subsequent releases

1. Branch from `main`; update version and lockfile with `npm version patch --no-git-tag-version` (or minor/major as appropriate). Update CHANGELOG and applicable documentation. Submit and merge a PR after CI passes.
2. Tag the merged commit and push the tag, then publish a GitHub release:

   ```sh
   git switch main
   git pull --ff-only
   git tag -a v0.1.1 -m "Fetchkeep v0.1.1"
   git push origin v0.1.1
   gh release create v0.1.1 --verify-tag --title "Fetchkeep v0.1.1" --notes-file release-notes.md
   ```

   Replace the example version with the exact package version. Creating a draft or pushing the tag alone does not publish npm; publishing the GitHub release does.
3. Approve the `npm` environment deployment if configured. Inspect the Publish npm workflow and registry provenance, then verify `npm view fetchkeep version` and install the exact version in a clean environment.

The v0.1.0 release predates this workflow. OIDC publishing starts with v0.1.1. Do not move existing tags or recreate old releases to trigger CI.
