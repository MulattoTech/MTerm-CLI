# Verification commands and evidence — 2026-11-02

## Latest observed results

| Gate | Result and scope |
| --- | --- |
| Real deployed remote MCP | **11/11 PASS** at `305c89c88a10f4c9243096e3d1125bde76f17563`: official SDK 2.3.0, deployed Cloudflare gateway, two real Windows DPAPI agents, independent file reads, pairing/auth/permission/revocation checks. |
| First full Windows run | **143/144 PASS, one RED**: a real canonical-leaf/Windows 8.3 access-guard defect was reproduced and repaired. |
| Focused repaired Windows run | **33/33 PASS, no skips**, including five native 8.3 cases. |
| Full repaired Windows run | **149/149 PASS**, zero skips/cancellations, 33,685 ms on Node 24.21.0. Tested bytes correspond to canonical-leaf repair `bbf1d0e` plus test-fixture quoting/format commit `14971ac`. |
| Package gate | **PASS**, 10.57 seconds on the repaired source: real pack/install, offline exec, isolated npm link, actual MCP read/write and eight compatibility aliases. Archive 54,173 bytes; unpacked payload 212,719 bytes; production dependencies 14,160,089 bytes. |
| Remaining local gates | Final reviewed normal build/check and managed Codex verification are pending. Codex 0.160.1 is installed in the isolated test prefix; installation alone is not managed-registration proof. |
| Remaining external gates | Exact final artifact/deployment, new hosted Windows/macOS/Linux results, PR/merge/main verification, infrastructure cleanup and human Google/ChatGPT acceptance are pending. |

The full Windows log is
`C:\Tools\Dev\MTerm-CLI\artifacts\worktrees\remote-mcp-20261102\artifacts\full-tests-canonical-green-20261102.log`.
Package evidence in the same clone is
`artifacts/package-gate-canonical-20261102.log` and
`artifacts/package-verify-8SfTVE/result.json`.
The [sanitized live report](validation/2026-11-02-remote-staging-smoke.json) records
the smoke's exact source, identity, hashes and cleanup. That test used a temporary
Access service principal, manual S256 PKCE and SDK transport, not a human Google
login or ChatGPT connector. Both synthetic devices/grants were revoked and both
agents stopped. Final infrastructure-access cleanup is independently pending.
Staging MCP is currently paused pending final qualification/deployment.

## Select the existing isolated Windows runner

Inspect existing task-owned processes and retained logs before starting a second
gate. Preserve the original dirty `C:\Tools\Dev\MTerm-CLI` checkout. The active
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
suite does not establish a new green hosted matrix. Inspect actual new runs and
preserve failures; never weaken gates, protections or tests to obtain a green label.

Earlier local evidence remains in
[2026-10-04-local-mcp.md](validation/2026-10-04-local-mcp.md) and
[2026-10-05-codex-parity-foundation.md](validation/2026-10-05-codex-parity-foundation.md).
Programmatic input/output fixtures do not certify every terminal emulator,
interactive Codex model behavior or the full DCP/WEB acceptance ledgers.
