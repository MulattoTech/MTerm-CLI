# Verification commands and evidence — 2026-11-02

## Current DCP-010 contract qualification

The [setter contract report](validation/2026-11-02-config-contract.md) records a
focused native Windows Node 24.21.0 RED/GREEN at an uncommitted candidate based on
`acaf276066c9e0436af2398c0120a38f7c04f5f0`. Before the runtime change, 12 tests
produced 2 passes and 10 success-text assertion failures. After the minimal output
fix, all 12 passed with zero skips or cancellations. The report pins the old and
new source/test/log hashes; a cleanup-only helper repair separates the two test
revisions. Scratch `CONNECTION_CLOSED` occurred during initialization and supplies
no product RED or runtime qualification.

The new cases use real SDK stdio clients to check all six preference outputs,
normalization, owner ceilings, 32 rejected inputs with exact policy/backup byte
preservation, no-op writes, sampled same-key concurrency and the independent
config-write capability. The installed verifier retains its prior scenarios and
adds six-setting success and 14 rejection checks, bringing its expected total to
ten scenarios. Those extended packed-installed scenarios are **pending execution**
at this record's preparation; source review and syntax validation are separate.

```powershell
npm run build:code
node --test --test-reporter=tap --test-concurrency=1 tests/compat-config-set-contract.test.mjs
```

The integration owner must explicitly review/render the affected roadmap before
normal build/check/package gates. Full native qualification, normal prepack,
source/installed native-Codex checks, fresh committed extraction and hosted/final
delivery gates for this change remain pending. No model calls or real Codex
auth/config mutation are part of these checks. Independent static review has no
blocking findings, and all acceptance/stage metrics remain unchanged.

## Completed configuration qualification checkpoints

The immediately preceding metadata slice is complete in
[PR #73's final delivery receipt](https://github.com/MulattoTech/MTerm-CLI/pull/73#issuecomment-6577021102):
implementation `535d99e` passed 175/175 native Windows tests and eight installed
scenarios; final head `6757c1f` passed 9/9 checks, and merged main `acaf276` passed
5/5, with no retries on either final head or main. Its initial implementation
macOS ARM npm-install timeout and one supported successful retry remain recorded
with unknown cause. Those results do not qualify the new DCP-010 candidate.

The earlier configuration proof is recorded in [PR #72](https://github.com/MulattoTech/MTerm-CLI/pull/72)
and the [delivery record](validation/2026-11-02-config-delivery.json), at implementation
`def85d256fe558ef26e0cdf7d0218ce250682150`. The earlier remote release remains
recorded separately by [PR #69](https://github.com/MulattoTech/MTerm-CLI/pull/69)
and its [report](validation/2026-11-02-remote-sprint.md).

## Installed configuration qualification

The [DCP-016 report](validation/2026-11-02-config-installed-qualification.md) records
a passing standalone Windows Node 24.21.0 probe against an actual packed package:
two simultaneous MCP children, one restart, seven scenarios, ten intercepted network
canaries and no observed product transport attempts. Dynamic native/compatible/multi-file
reads, warning and append bytes, concurrent writes, narrowed/empty roots, policy corruption,
owned cleanup and persistence were exercised. All captured child/fixture PIDs had an
independently observed exit. This artifacts-only probe precedes the new integrated gate.

`verify-package.mjs` now invokes `verify-configuration-installed.mjs` automatically.
For a focused rerun against a package verifier's retained installation, provide the exact
installed entry, its owned installation prefix, an existing owned evidence directory and
the expected package version:

```powershell
node scripts/verify-configuration-installed.mjs <absolute-installed-entry> <absolute-install-prefix> <absolute-evidence-directory> 0.0.1-preview.1
node --test --test-concurrency=1 tests/configuration-verifier.test.mjs
```

The verifier refuses source-checkout substitution, drains bounded stderr and uses five-second
MCP deadlines that leave time for cleanup. Its network evidence concerns instrumented Node
APIs, not an OS network sandbox. The separate negative tests verify that source and wrong-package
inputs are rejected before product execution. The revised Windows workflow subsequently
passed **164/164 tests**, the normal package gate and source-entry managed-Codex gate.
Separate normal prepack, self-host and explicit installed-entry Codex also passed.
All nine implementation-head hosted checks and fresh committed archive extraction then
passed. The final documentation head and post-merge main checks are recorded in PR #72.
No parity acceptance or stage credit is inferred from these scoped gates.

## Previous release results

| Gate | Result and scope |
| --- | --- |
| Final deployed remote MCP | **11/11 PASS** at `b90432a1bc138d59305692a9f74f110a475d0881`: official SDK 2.3.0, deployed Cloudflare gateway, two real Windows DPAPI agents, independent file reads, pairing/auth/permission/revocation checks. Finished 2026-11-02 01:24:29 UTC. |
| First full Windows run | **143/144 PASS, one RED**: a real canonical-leaf/Windows 8.3 access-guard defect was reproduced and repaired. |
| Focused repaired Windows run | **33/33 PASS, no skips**, including five native 8.3 cases. |
| Final full Windows run | **149/149 PASS**, zero skips/cancellations, 32,829 ms on Node 24.21.0. Full reviewed build/check/package/managed Codex workflow **PASS in 55.35 seconds**. |
| Final package gate | **PASS**: real pack/install, offline exec, isolated npm link, actual MCP read/write and eight compatibility aliases. Archive 55,636 bytes; unpacked payload 216,577 bytes; installed production footprint 14,163,947 bytes. |
| Managed Codex | **PASS**, native Codex 0.160.1, actual isolated registration/parsing and two MCP sessions. No user config/auth changes or model calls. |
| Hosted CI | All four PR matrix jobs `41372073094`, fast run `41372073095` and push matrix `41372068412` **PASS**. |
| Independent acceptance | Human Google login, browser consent/callback and ChatGPT connector use remain unverified. No production promotion. Final-document checks and merge/checkpoint status are recorded by the final sprint report/PR. |

Earlier repair-stage full Windows evidence is
`C:\Tools\Dev\MTerm-CLI\artifacts\worktrees\remote-mcp-20261102\artifacts\full-tests-canonical-green-20261102.log`.
Earlier package evidence in the same clone is
`artifacts/package-gate-canonical-20261102.log` and
`artifacts/package-verify-8SfTVE/result.json`.
The final sprint report indexes the final Windows gate logs. The
[final live report](validation/2026-11-02-remote-staging-smoke-final.json) records
the smoke's exact source, identity, hashes and cleanup. That test used a temporary
Access service principal, manual S256 PKCE and SDK transport, not a human Google
login or ChatGPT connector. Both synthetic devices/grants were revoked and both
agents stopped. Temporary service policy/token/Worker binding were deleted;
owner-only access remains and no persistent owner agent is paired. Staging MCP
is enabled on Worker `af4fd06e-c4a3-4545-ad22-31d0ae956215`, artifact SHA-256
`97a0457b78e113c058ae8da3d3a6a54fcd93c2b35d1dd1781316c41001ac10a6`.
Final smoke run: `2026-11-02T01-23-39-600Z-a0b41954-29c8-4163-b93f-a04a5c64b6a6`.

## Select the existing isolated Windows runner

The final gates above are completed. Re-run only for changed code, a required new
head check or a concrete remaining risk. Inspect retained evidence before starting
another gate. Preserve the original dirty `C:\Tools\Dev\MTerm-CLI` checkout. The
ordinary clone is separate from it:

```powershell
$MTermVerifyRoot = 'C:\Tools\Dev\MTerm-CLI\artifacts\worktrees\remote-mcp-20261102'
$MTermNodeBin = 'C:\Tools\Dev\MTerm-CLI\artifacts\toolchain\node-v24.21.0-win-x64'
Set-Location $MTermVerifyRoot
$env:PATH = "$MTermNodeBin;$env:PATH"
node --version
git status --short --branch
git rev-parse HEAD
Get-Content .\artifacts\full-tests-canonical-green-20261102.log -Tail 30
```

Use Node 24.21.0 for this qualification; a Node 25 development result is not this
gate. Install dependencies only in an isolated checkout when needed with
`npm ci --ignore-scripts --no-audit --no-fund`; preserve the exact lock/shrinkwrap
and do not substitute global or mismatched packages.

## Focused development checks

Run only checks relevant to a changed risk; do not repeat a completed identical
run merely to increase test counts. These compile current code and exercise the
filesystem, configuration, registration and remote boundaries:

```powershell
npm run build:code
node --test --test-concurrency=1 tests/policy-alias.test.mjs tests/compat-config.test.mjs tests/codex-registration.test.mjs
node --test --test-concurrency=1 tests/remote-adapter.test.mjs tests/remote-agent.test.mjs tests/remote-state.test.mjs tests/remote-gateway.test.mjs
```

Observe actual RED before behavior changes and preserve the evidence. Canonical
root aliases must not expose nested links, protected credential/config files,
unselected roots or a runtime-narrowed path through an 8.3 leaf spelling. The
Codex journal retry tests must retain conflict detection on every retry, bounded
EPERM/EBUSY recovery on Windows only and owned-temporary-file cleanup.

## Final local gates

`build:code` is development-only. After the integration owner updates the truthful
change record and explicitly reviews/renders affected metrics, run:

```powershell
$env:MTERM_CODEX_TEST_PREFIX = 'artifacts/ci-codex'
$env:MTERM_CODEX_EXPECTED_VERSION = '0.160.1'
node scripts/orchestration/verify.mjs --full
```

This executes normal `npm run build`, `npm run check`, package verification and
the managed Codex verifier. The explicit test prefix/version select the verified
native Codex fixture; do not add the npm prefix to PATH and accidentally select
another installation. The isolated verifier support must be present in the
checked-out source. To diagnose a specific failing phase, its direct
commands are:

```powershell
npm run build
npm run check
node scripts/verify-package.mjs
node scripts/verify-managed-codex.mjs
node scripts/verify-self-host.mjs
```

The self-host verifier requires an ordinary clone for its Git-root fixture;
linked-worktree metadata outside the scoped root is a known #66 limitation.
For installed registration proof, set `MTERM_VERIFY_BIN` only to the verified
installed bin reported by the package verifier, then clear that test-owned
variable. Normal `npm pack` must retain prepack checks. A clean source extraction
and matching dependency locks must work without ignored build artifacts.

## Evidence and safety boundaries

Tests use temporary files and deterministic child code. Official MCP clients use
real subprocess stdio or, in the explicit staging smoke, real HTTPS transport.
Managed Codex tests create a dedicated `CODEX_HOME`, parse actual Codex output and
remove only their own registration; they do not change real user auth/config or
make paid/model-consuming calls. Package verification uses owned temporary npm
prefix/home/cache instead of the global installation.

The staging smoke is an explicit external integration test, not part of offline
`npm test`. Follow [REMOTE_MCP.md](REMOTE_MCP.md) and the
[deployment guide](deployment/MTERM_STAGING.md). Do not recover revoked fixture
credentials, export browser cookies or treat a service identity as human consent.
Do not print credentials, raw fixture content or owner allowlist configuration.

Hosted CI has run and exposed real platform defects: run `39166671238` contained
Windows/macOS canonical-path failures and Linux executable-mode drift. The old
billing-only/no-hosted-execution description is historical. A repaired Windows
suite alone does not establish a green hosted matrix; the final four-platform
matrix above supplies that separate evidence. Inspect actual new runs and
preserve failures; never weaken gates, protections or tests to obtain a green label.

Earlier local evidence remains in
[2026-10-04-local-mcp.md](validation/2026-10-04-local-mcp.md) and
[2026-10-05-codex-parity-foundation.md](validation/2026-10-05-codex-parity-foundation.md).
Programmatic input/output fixtures do not certify every terminal emulator,
interactive Codex model behavior or the full DCP/WEB acceptance ledgers.
