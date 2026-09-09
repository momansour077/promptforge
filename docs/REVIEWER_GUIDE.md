# Engineering reviewer guide

## Five-minute review path

1. Read the README scope and test instructions.
2. Inspect backend `src/utils/userSerializer.ts`, its unit test, and
   `tests/integration/authController.test.ts`.
3. Inspect `promptBuilder.ts`, its tests, and root `scripts/check-regression.ts`.
4. Inspect frontend `uiAction.ts` and its tests.
5. Read [the dated validation record](VALIDATION_2026-09-09.md), then run the
   checks. Separate mocked tests, real local integration, and hosted evidence.

## Debugging example: user serialization

**Problem:** a serializer spread an ORM user object into its response. A narrow
TypeScript parameter type did not remove additional runtime fields, including
the stored password hash. Profile updates also returned a raw ORM record.

**Reproduction:** adding an assertion that registration lacks
`data.user.passwordHash` fails on the original public-head implementation.
The regression used synthetic test data, not a real credential.

**Correction:** a shared serializer returns an explicit public-field allowlist.
Auth and profile-update controllers use it. Its unit test supplies both a
password hash and a hypothetical future secret and checks neither escapes.
Route assertions cover register, login, refresh, current-user, and profile update,
with positive assertions that expected public fields still appear.

**Boundary:** this verifies response shape on covered paths, not historical
production exposure or a complete penetration test. No deployed-user exposure
investigation was performed.

## Other changes and rationale

- Derive request-body types from Zod schemas. Omit absent optional Prisma update
  fields to preserve existing values rather than overwrite them.
- Wrap async UI interactions with an observable error boundary: forward arguments,
  handle promise rejection, and show a toast for synchronous failures too.
- Preserve API error message, code, and field details while rejecting an Error.
- Adapt synchronous test doubles to promise APIs, preserving rejected throws
  without disabling strict lint rules for entire test files.
- Handle Node 26/Vitest browser-storage interference in the test launcher;
  NODE_OPTIONS reaches worker processes. Storage assertions remain active.
- Refresh compatible dependency resolutions and pin transitive qs to 6.16.0.
- Stop tracking generated TypeScript build-state cache.
- Add Prisma generation and deterministic regression checks to CI; match the
  locally tested Node version. Hosted execution of this candidate is pending.
- Make deployment manual. No deployment was executed.

## What the regression baseline proves

Twelve English/Arabic seeds cover several prompt families. The gate compares
structural fields and output-length changes against a committed baseline.
No thresholds regressed in local checks. The baseline was not regenerated to
make this update pass. This is not evidence that external model answers improved
or that unseen tasks pass.

## Remaining work

1. Run updated GitHub CI. The two previous September 7 runs were cancelled after
   stalling during Playwright installation. Pinning Playwright 1.60.0 addresses
   the upstream-reported install issue. The review also found a separate server
   startup defect: global `NODE_ENV=test` prevents `app.ts` from listening. The
   startup step now uses `development`, and actual local startup plus browser
   tests passed. This is not a substitute for a successful hosted run.
2. Refresh/test container runtimes, cookies/TLS, and packaging. Existing Docker
   production stages copy development dependencies; minimize them in a separate
   deployment-hardening change.
3. Test actual provider behavior separately with an approved budget. Mocks do not
   validate paid API behavior.
4. Maintain scoped dependency overrides. The September 9 audit is a dated
   observation, not a permanent security guarantee. npm still emits deprecation
   warnings for older transitive packages; those need separate maintenance.

## September 9 dependency repair and validation

- **deepmerge-ts:** [GHSA-ggr8-5vv4-36mx](https://github.com/advisories/GHSA-ggr8-5vv4-36mx)
  is resolved in the lockfile with `@prisma/config -> deepmerge-ts 8.0.0`. This
  crosses a transitive major version; it is a deliberate scoped override, not a
  claim of upstream Prisma support. Prisma client generation, real migrations,
  application startup, 25 backend tests, and real persistence passed. Review
  whether the override can be removed when upgrading Prisma.
- **esbuild:** [GHSA-g7r4-m6w7-qqqr](https://github.com/advisories/GHSA-g7r4-m6w7-qqqr)
  is resolved with `tsx -> esbuild 0.28.1`. Type checks, builds, and the tsx-based
  regression command passed. No Windows-specific exploit test was performed.
- **Vitest:** [GHSA-82fw-gwwq-j7x9](https://github.com/advisories/GHSA-82fw-gwwq-j7x9)
  required moving from the old 3.x line to patched 4.1.11. That exposed a real
  TypeScript config error; importing `defineConfig` from `vitest/config` corrected
  it. All 30 frontend tests and the build then passed after a clean install.
- Both `npm audit --json` checks reported zero advisories. This establishes the
  resolved inventory's audit result, not absence of all vulnerabilities.
- Browser checks used actual Chromium, PostgreSQL, and Redis with only synthetic
  data. No model-provider request was made. Test screenshots are captured only
  when the explicit evidence-directory environment variable is set.
- Regression report paths are repository-relative so a published artifact does
  not disclose the reviewer's workstation directory.

Results are dated September 9, 2026. Dependencies and hosted status can change.
This is scoped maintenance, not a security or production-readiness certification.
