# Engineering reviewer guide

## Five-minute review path

1. Read the README scope and test instructions.
2. Inspect backend `src/utils/userSerializer.ts`, its unit test, and
   `tests/integration/authController.test.ts`.
3. Inspect `promptBuilder.ts`, its tests, and root `scripts/check-regression.ts`.
4. Inspect frontend `uiAction.ts` and its tests.
5. Run the checks. Separate mocked behavior from deployment evidence.

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
- Handle Node 26/Vitest 3 browser-storage interference in the test launcher;
  NODE_OPTIONS reaches worker processes. Storage assertions remain active.
- Refresh compatible dependency resolutions and pin transitive qs to 6.16.0.
- Stop tracking generated TypeScript build-state cache.
- Add Prisma generation and deterministic regression checks to CI; match the
  locally tested Node version. Hosted execution is pending.
- Make deployment manual. No deployment was executed.

## What the regression baseline proves

Twelve English/Arabic seeds cover several prompt families. The gate compares
structural fields and output-length changes against a committed baseline.
No thresholds regressed in local checks. The baseline was not regenerated to
make this update pass. This is not evidence that external model answers improved
or that unseen tasks pass.

## Remaining work

1. **Dependency advisory:** [GHSA-ggr8-5vv4-36mx](https://github.com/advisories/GHSA-ggr8-5vv4-36mx)
   affects deepmerge-ts below 8 through Prisma configuration. npm counts the
   dependency and two parents as three high package entries, not three proven
   independent application exploits. Upgrade/test the chain separately; no
   forced major upgrade or deployed exploitability assessment was performed.
2. **Low build-tool advisory:** [GHSA-g7r4-m6w7-qqqr](https://github.com/advisories/GHSA-g7r4-m6w7-qqqr)
   concerns Windows esbuild development-server file reads. It remains an audit
   finding even though these tests ran on macOS.
3. Run updated GitHub CI. The last observed older workflow was cancelled because
   a hosted runner was not acquired. Local checks cannot resolve account/runner
   allocation. A workflow file is not evidence of a passing hosted run.
4. Validate real isolated PostgreSQL/Redis, migrations, and browser E2E. Do not
   use production accounts/data.
5. Refresh/test container runtimes, cookies/TLS, and packaging. Existing Docker
   production stages copy development dependencies; minimize them in a separate
   deployment-hardening change.
6. Test actual provider behavior separately with an approved budget. Mocks do not
   validate paid API behavior.

Results are dated September 5, 2026. Dependencies and hosted status can change.
This is scoped maintenance, not a security or production-readiness certification.
