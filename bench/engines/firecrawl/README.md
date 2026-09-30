# Firecrawl self-hosted for the benchmark

The `firecrawl-selfhost` profile talks to a Firecrawl stack built from the upstream repository at a pinned commit.
Nothing from Firecrawl is vendored here (it is AGPL-3.0); you build it yourself.

```sh
git clone https://github.com/firecrawl/firecrawl ~/firecrawl
cd ~/firecrawl
git checkout 7e4a959dca0efbdad2f0a9d82b0fce20afeb9a4d
docker compose build
docker compose -f docker-compose.yaml -f /path/to/fetchkeep/bench/engines/firecrawl/compose.override.yaml up -d api
curl -s http://localhost:3002/v2/scrape -H 'Content-Type: application/json' -d '{"url":"https://example.com","formats":["markdown"]}'
export FIRECRAWL_CHECKOUT=~/firecrawl      # records the revision and enables --cold-start
```

`up -d api` starts `api`, `playwright-service`, `redis`, `rabbitmq` and `nuq-postgres` — the documented default
(PostgreSQL queue). The experimental FoundationDB services are not started.

`compose.override.yaml` only sets `ALLOW_LOCAL_WEBHOOKS=true` (API and Playwright service) and
`TEST_SUITE_SELF_HOSTED=true` (API) so the stack can reach the benchmark's fixture server on a private address.
This is recorded as a setting difference in every run.

Upstream defaults that remain in effect and matter for interpretation: no Fire-engine (so no stealth/proxy
waterfall), no authentication, `waitFor: 0`, `onlyMainContent: true`.

## Hosted

`firecrawl-hosted` uses `https://api.firecrawl.dev` with `FIRECRAWL_API_KEY`. It is a paid service, so runs require
`--allow-paid --budget-credits N`; the adapter stops issuing requests once the budget is spent and marks the rest as
errors with `budget_exhausted`. It is N/A for local fixtures.
