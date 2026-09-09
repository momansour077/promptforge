# Validation record — September 9, 2026

This record distinguishes tests that ran from deployment work still pending.
It describes a local portfolio review, not an independent security certification.

## Tested environment

- macOS arm64; Node 26.5.1; npm 11.17.0.
- PostgreSQL 16.13 and Redis 8.6.2, both disposable and bound to loopback.
- Playwright 1.60.0 with its matching locally cached Chromium browser.
- Vitest / coverage-v8 4.1.11; Prisma 6.19.3.
- Fresh `npm ci --ignore-scripts --no-fund` in both packages; Prisma generation
  was then run explicitly. No existing personal database or browser session used.

## Results and boundaries

| Check | Observed result | What this does not prove |
| --- | --- | --- |
| Backend lint, types, build | Pass | Every runtime edge case |
| Backend Jest tests | 25 passed in 6 suites | Real infrastructure on mocked test paths |
| Frontend lint, types, build | Pass | Compatibility with every browser |
| Frontend Vitest tests | 30 passed in 7 files | Production deployment |
| Deterministic baseline | 12 seeds; zero flagged seeds or metrics | External model response quality |
| Prisma generation and real migrations | Pass on a new PostgreSQL database | Upgrade of an existing production database |
| Real browser workflow | 2 Playwright tests; 4 multiline plus 8 short scenarios passed | Every application feature |
| Real persistence | 1 synthetic user and 12 prompts stored | Production traffic, concurrency, or durability |
| Provider isolation | 0 requests to a fail-closed loopback sentinel | Paid provider integration |
| Dependency audits | 0 reported advisories, both full package inventories | Absence of all security defects |

The browser scoring helper checks expected structural tokens and UI leakage. A
score of 100 in those fixtures is **not** a general accuracy or output-quality
percentage. Test counts are kept separate rather than added into a misleading
single total. The committed prompt baseline was not regenerated to pass this review.

## Reproduce

1. Run the package installation, generation, lint, type, unit-test, build, and
   regression commands in the root README with Node 26.5.1.
2. For a real-browser run, provision **new disposable** PostgreSQL and Redis
   instances. Set the required environment variables in `.env.example` to those
   services. Use synthetic secrets and accounts, not real credentials.
3. Set `HOST=127.0.0.1` and `NODE_ENV=development` for the backend process. Set
   `MISTRAL_BASE_URL` to a controlled loopback endpoint that rejects and counts
   requests. Do not point these deterministic checks at a paid provider.
4. Apply migrations with `npm run prisma:migrate:deploy` inside `apps/backend`.
   Build/start the backend; build the frontend with its matching
   `VITE_API_BASE_URL`, then start Vite preview. Match origins, CORS, and ports.
5. In `apps/frontend`, install Chromium with `npx playwright install chromium`.
   Set `PLAYWRIGHT_BASE_URL` and the optional `PROMPTFORGE_E2E_EMAIL`,
   `PROMPTFORGE_E2E_PASSWORD`, and `PROMPTFORGE_E2E_NAME` to synthetic values.
6. Run `npm run test:e2e` and `npm run test:e2e:enhancement`. The existing suites
   write `/tmp/promptforge-ui-validation.json` and
   `/tmp/promptforge-ui-enhancement.json`. Preserve previous reports before a
   repeat run. `PROMPTFORGE_E2E_SCREENSHOT_DIR` optionally captures screenshots.
7. Check persisted records and the provider request count, then stop the
   disposable services. Run `npm audit --json` in each package again.

The [GitHub workflow](../.github/workflows/ci.yml) provides a concrete Linux CI
setup using PostgreSQL 16 and Redis 7. Its service versions and automatic npm
installation scripts differ from the local review. A passing local run must not
be relabeled as passing hosted CI.

## Known limits and follow-up

- Hosted CI for this candidate: **UNVERIFIED until that exact commit runs**.
- The browser executable was already cached. A fresh download on the target
  hosted runner is not established by these local tests.
- No production deployment, Docker build, TLS/cookie deployment review, load
  test, paid Mistral call, or full penetration test was performed.
- The dependency overrides and remaining deprecated transitive packages require
  maintenance; see [the reviewer guide](REVIEWER_GUIDE.md).
- All displayed screenshots use synthetic data. Private work, email, credentials,
  and the competition source package are outside this public update.
