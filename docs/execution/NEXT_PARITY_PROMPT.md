# MTerm-CLI: continue verified Codex parity and finish client connection

**Continuation date: 2026-11-02. Execute the work.** Re-read current GitHub, local
state, retained logs and deployed identity before mutation. This is a checkpoint,
not authority to overwrite newer work, repeat owner pairing or rerun every gate.

Repository: <https://github.com/MulattoTech/MTerm-CLI>. The long-term target remains
**100% DesktopCommanderMCP parity as consumed by Codex, then 100% — PASS**. The
300-item maturity ledger, 48 DCP issues and 12 remote WEB issues are independent.

## Current implementation and delivery authority

[PR #73](https://github.com/MulattoTech/MTerm-CLI/pull/73) carries DCP-009 metadata
implementation **`535d99e20b52a30ba9a24b6d2205d8e6687f6ca6`**, based on verified main
`c408e286c437bec1c8c88fbbae29d89a9f8f90c8`. Subsequent closeout documentation leaves
`src/compat-config.ts`, its metadata test and the installed verifier unchanged.
Read PR #73's current state, exact-head checks and final delivery comment before
selecting a new base. Final documentation head, merge/main and final recovery
hashes must come from observed Git/PR state; they are not predicted here.

| Evidence at `535d99e` | Observed result |
| --- | --- |
| Focused development | Meaningful RED: 1 pass / 10 failures; GREEN: 11/11 metadata cases |
| Native Windows | Node 24.21.0 x64; 175/175 tests, zero skips/cancellations |
| Seven native gates | Reviewed build, normal check, self-host, package, source-entry Codex, normal prepack and installed-entry Codex passed |
| Full orchestration coverage | All four component commands ran individually with captured exits; do not infer an unobserved wrapper invocation |
| Installed configuration | Eight scenarios, two concurrent MCP children and a restart; actual child identity/envelope/metadata/order/omissions checked |
| Network and cleanup | Ten positive network canaries intercepted, zero product attempts observed through instrumented Node APIs; independent process exits and owned cleanup passed |
| Native Codex | Test-owned 0.160.1 parsed synthetic registration; SDK exercised the parsed source and installed commands twice each |
| Model invocation | `actualCodexAgentToolInvocation:false`; model calls zero |
| Fresh committed source | No initial dist/node_modules; locked install, reviewed build, normal prepack and installed package passed |
| Fresh archive SHA-256 | `7e2c015a34fb10cafe53b8df713c48824541acaac59cb6e6f5f6446803f4afae` |
| Package accounting | 57,843 archive bytes; 224,214 unpacked package bytes; 14,171,584 installed production bytes, excluding external Node/Codex |

At 12:02:49 UTC, latest implementation hosted checks were **9/9 passed**. PR matrix
[41388159750](https://github.com/MulattoTech/MTerm-CLI/actions/runs/41388159750)
passed Windows 2022 x64, Ubuntu 24.04 x64, macOS 14 ARM64 and macOS 15 Intel; fast
[41388159762](https://github.com/MulattoTech/MTerm-CLI/actions/runs/41388159762) passed.
Push matrix [41388126481](https://github.com/MulattoTech/MTerm-CLI/actions/runs/41388126481)
initially had one failed macOS ARM64 job
[125093389299](https://github.com/MulattoTech/MTerm-CLI/actions/runs/41388126481/job/125093389299):
npm tarball install timed out after 120 seconds, SIGTERM, empty output. Its tests
passed 163 with 12 platform skips and zero failures; the PR's same-platform job
passed. The install-timeout cause is unestablished; preserve that failed attempt
and do not call it a confirmed service outage.

One supported rerun, attempt 2 macOS ARM64
[job 125262922093](https://github.com/MulattoTech/MTerm-CLI/actions/runs/41388126481/job/125262922093),
ran 11:59:54–12:00:47 UTC and passed at unchanged `535d99e`: 163 tests passed,
12 platform skips, no failures, all eight installed configuration scenarios and
native Codex 0.160.1 parsing plus SDK calls. The hosted managed-Codex gate used the
source entry (`installedEntry:false`); the package gate separately exercised the
installed MCP process. Only macOS ARM64 was rerun; the other three push platforms
retain their original successful execution times. No model invocation occurred.
At the separate 12:00 UTC repository check, main remained `c408e286` and PR #73
remained open/draft at `535d99e`. Observe later final-head/merge results directly.

Read these committed records:

- `docs/validation/2026-11-02-config-metadata.md`: exact implementation contract,
  pinned sources, RED/GREEN, intentional differences and qualification.
- `docs/validation/2026-11-02-config-metadata-delivery.json`: source/check/record
  identities, native results, extraction and pending final delivery gates.
- `docs/validation/2026-11-02-config-metadata-windows.json` and
  `docs/validation/2026-11-02-config-metadata-fresh.json`: integration-owner
  observations with retained Windows evidence paths.
- `docs/validation/2026-11-02-config-metadata-hosted-retry.json`: exact initial
  failure, supported successful retry and nine latest checks; SHA-256
  `6dec037731b0ddf389bf64920dd91d0353e356067d3c4615e64762a52c5aa4a2`.
- `docs/validation/2026-11-02-owner-connection.md` and its JSON: real owner pairing
  and exact client-connection blockers.
- `docs/validation/2026-11-02-config-metadata-issue-audit.json`: read-only audit of
  all 48 issues and 21 comments at 04:29:19 UTC, with zero identity/state mismatches.
  Its exact SHA-256 is `1e4bc682a23dd803ccaa8e2778c1c3b3a32026f5022d937fb9533beb33bf9c14`.
  Dated October billing comments remain historical. The repo now refreshes scoped
  DCP-011/014/015 evidence and DCP-020 configured advisory warnings without closure.

The initial native enrichment reader expected TAP prefixes while Node emitted
spec output; the test count was recovered from the unchanged log. An ad-hoc fresh
extraction wrapper also encountered a PowerShell-stdin encoding parse failure
before executing product commands. These were observation-wrapper repairs, not
product source/test changes. Keep genuine product failures separate.

Earlier deliveries are retained: PR #71 repaired bounded Windows config rename
retries; PR #72 qualified shared configuration through installed MCP and synthetic
managed-Codex registration. Their implementation/main checks passed and are
recorded in `2026-11-02-config-delivery.json`. PR #52 is merged and PR #67's source
was incorporated. Do not recreate those implementations from stale prompts.

## What DCP-009 now implements and still does not prove

`get_config` preserves its text/structured envelope and original system aliases.
It adds the five pinned memory strings from one measurement, OS name/flags/path
separator, Node version, actual process PID/architecture/platform/runtime versions,
generic example paths, empty no-provider flags, and the six preference entries in
pinned order. Client metadata selects only bounded name/version; rejected identity
is explicitly omitted. Real installed checks exercise those contracts.

The response explicitly omits `docker`, `pythonInfo`, `isDXT`, `nodeInfo.path`,
`nodeInfo.npmVersion` and `examplePaths.accessible`. No Python subprocess, mount
scan, environment inventory, credential path or vendor experiment/analytics
service was imported. Absence is not a false claim that Python or containers do
not exist. `platformName` has no container suffix. `systemInfo.defaultShell`
reports the owner-approved preference, rather than upstream's static OS hint;
`availableShells` and editability remain limited by owner capabilities.

DCP-009 stays open until its complete published contract and intentional safety
and privacy differences receive the required acceptance review. Do not fabricate
upstream fields to close it. Actual Codex parser/SDK proof establishes registration
and the registered server's behavior; it does not establish model-driven tool use,
all 26 tools or all 48 issues.

## The owner is already paired; the client is not connected

The user explicitly approved `C:\Tools\Dev\MTerm-RemoteWorkspace` and the necessary
continuation. The last observed state at 2026-11-02 04:26:07 UTC was:

| Owner state | Observation |
| --- | --- |
| Root | `C:\Tools\Dev\MTerm-RemoteWorkspace`, containing harmless connection fixture |
| Protected state | `%LOCALAPPDATA%\MTerm-CLI\remote-staging`, outside the exposed root |
| Display name | `MulattoTechBox staging` |
| Pairing and agent | Real owner-authorized pairing; foreground online |
| Lifecycle | Graceful stop and actual exit, dashboard offline, then same-enrollment reconnect passed |
| Permissions | Read-only; autostart false; no remote write/execute |
| Browser identity | Existing authenticated dashboard session; fresh Google login not performed |
| Client acceptance | Zero authorizations; no actual ChatGPT discovery/read |
| Revocation | Real owner enrollment deliberately not revoked |

At **12:00:53.619 UTC**, a later local-status check again observed the same
enrollment paired and online. The foreground agent runs from
`C:\Tools\Dev\MTerm-CLI\artifacts\worktrees\config-qualification-20261102`
at `c408e286c437bec1c8c88fbbae29d89a9f8f90c8`. Preserve that running checkout;
do not update its files beneath the owner agent. The original 04:26 JSON remains
unchanged; the delivery record separately identifies this later observation.

**Do not repeat setup/pairing or start another agent on the assumption that the
old preview is current.** Inspect local state and the task-owned foreground
process first. Existing enrollment is intended to survive a normal stop/restart.
Do not steal locks, expose credentials, revoke the owner device as a synthetic
cleanup, add autostart or promote production.

Connection encountered two explicit blockers:

1. Plugin creation returned backend HTTP 409, `Scoped plugin release was deleted.`,
   marked non-retryable. The postcheck found no created plugin.
2. The browser host restrictions gate did not grant navigation to
   `https://chatgpt.com`. No retry or workaround was attempted.

Preserve the prepared `MTerm-Staging-Plugin-0.1.0.zip`, SHA-256
`1cba80851f09e4c912698dd707a3be82848fafacb9373498263e9181dd14e4e0`.
It targets `https://mcp-staging.m-techlabs.com/mcp` with OAuth dynamic client
registration, S256 PKCE and `mterm:read`. It is a reviewable package, not proof of
plugin installation or consent. Resume only through supported access or the
owner's normal client flow; do not retry a non-retryable creation, substitute a
service identity, export browser state or route around host restrictions.

When the supported client is authorized, observe real tool discovery,
`mterm_list_devices`, one harmless selected-device read, outside-root denial and
authorized lifecycle behavior. Record actual client evidence separately from
historical SDK tests. A paired online dashboard row alone is not a remote file
read or complete WEB acceptance. Fresh Google login, actual client consent,
ChatGPT tool calls and owner revocation remain unperformed.

## Preserved remote deployment

The earlier remote implementation/deployment gates remain complete for their
recorded scope. Do not recreate the relay, temporary Access service identity or
synthetic devices to resume this work.

| Resource | Recorded identity |
| --- | --- |
| MCP endpoint | `https://mcp-staging.m-techlabs.com/mcp` |
| Private dashboard | `https://mterm-staging.m-techlabs.com` |
| Worker | `mterm-gateway-staging` |
| Recorded owner-only Worker version | `af4fd06e-c4a3-4545-ad22-31d0ae956215` |
| Deployed source | `b90432a1bc138d59305692a9f74f110a475d0881` |
| Gateway artifact SHA-256 | `97a0457b78e113c058ae8da3d3a6a54fcd93c2b35d1dd1781316c41001ac10a6` |
| Mode | Enabled staging, read-only, owner-only policy; no production promotion |

The earlier 11/11 live smoke used a temporary service identity, official SDK and
two Windows fixtures. Its grants/devices/agents/policy/token/binding were cleaned.
That historical cleanup predates the real owner enrollment above. This local
metadata work and owner pairing do not change the deployed gateway source.
`docs/REMOTE_MCP.md`, `docs/deployment/MTERM_STAGING.md`, and
`docs/validation/2026-11-02-remote-sprint.md` retain exact management/recovery
procedures. Do not redeploy unchanged bytes for local parity qualification.

## First actions and preservation

Discover the currently available tools and use the authorized workstation for
Windows work. Scratch is not Windows. Remote process creation is not completion:
inspect the retained log and actual exit code. Avoid repeating stalled child
connections or launching duplicate long gates. Never kill unrelated processes.

Read `AGENTS.md`, `CONTRIBUTING.md`, `docs/execution/READ_FIRST.md`,
`docs/execution/MASTER_IMPLEMENTATION_PROMPT.md`, `docs/HANDOFF.md`, `docs/SECURITY.md`,
`docs/TESTING.md`, `docs/ORCHESTRATION.md`, `docs/CODEX_REGISTRATION.md`,
`docs/parity/README.md`, `docs/roadmap/METRICS.md` and both parity ledgers before
changes. Treat current observed code/PR state as authority over old handoff hashes.

- Preserve `C:\Tools\Dev\MTerm-CLI`, including the original eight modified and
  three new files. Do not reset, clean or overwrite the primary checkout.
- This qualification used the ordinary clone
  `C:\Tools\Dev\MTerm-CLI\artifacts\worktrees\config-metadata-20261102`.
  The source worker clone is
  `/workspace/scratch/2c8f320f622d/mterm-dcp009-20261102`.
- Earlier `remote-mcp-20261102`, `config-retry-20261102` and
  `config-qualification-20261102` ordinary clones remain separate. Inspect dirty
  state and task ownership; historical names do not authorize overwriting them.
- Preserve MTerm-GUI, the archived original MTerm, AO worktrees and MJobs processes.
  Do not start a fleet or automatic issue intake before the Codex/AO hook pilot
  is independently verified. Exclude access-check/recovery-only branches from
  product merges.

The DCP-009 source worker's pre-change checkpoint is
`artifacts/checkpoints/dcp009-start-20261102/`: bundle SHA-256
`53ba810ece63c7c097046f4e142a7973db14f530121b207211debb216b3a7873` and source tar
`c79ab89424407dee2b9c7836cdbf28d7a9b88cc35118438a99896d7b008bbadc`.
Its implementation transfer bundle is SHA-256
`119c42f7ba4decc64c605eb154f01aeb773b8c6fd920e0827b761ec87916c61e`.
Use PR #73's final delivery comment for the newer integration-owner checkpoint;
do not invent future bundle or merge hashes. Make additive checkpoints before
substantial changes and retain all older recovery material.

## Next engineering sequence

1. Resolve the exact current PR #73/source/check state and any still-unmerged
   documentation. The implementation's supported retry passed; final documentation
   and merged-main checks still require their own observed results. Preserve the
   original timeout and unmerged changes, and use an ordinary isolated clone for
   the next issue.
2. Re-read all 48 live DCP issues and current evidence. Keep one independently
   closeable issue/owner/branch/PR per gap. Configuration already works through
   installed MCP; do not replace it with new dictionary-returning scaffolding.
3. Reconcile DCP-009's explicit field/privacy differences with the pinned handler
   and acceptance contract. The useful metadata slice is implemented; a repeat
   of its existing tests does not complete missing Python/container fields or
   actual Codex-client acceptance. Add only a concrete remaining gap with a
   meaningful failing fixture, or record the precise required owner ruling.
4. Continue a bounded configuration contract such as DCP-010/#12's exact
   `set_config_value` success/output and normalization/error behavior across the
   six preferences. Read the pinned handler/schema and current implementation
   first, write RED before a behavior change, preserve prior bytes on rejection,
   then prove it through the existing installed harness. Do not broaden coercion
   or echo raw values merely because upstream does so.
5. Preserve the larger dependencies: DCP-012/#14 and DCP-013/#15 need reviewed
   compatible shell execution/blocklist behavior; storing a shell preference is
   not execution. DCP-014/#16 also needs compatible process line-limit semantics.
   DCP-011/#13 and DCP-016/#18 have strong multi-root/reload evidence but still
   require their full contract and applicable actual Codex-client acceptance.
6. Complete file/editing ranges, encodings, formats, directory/cross-device moves
   and diagnostics; then asynchronous search, process/terminal behavior, local
   usage/history/prompts, and complete package/Codex/platform/license/security
   qualification through the existing services.

Owner ceilings remain immutable to model-editable preferences. Empty roots deny
access; mandatory command blocks remain; telemetry gains no network transport.
The pinned single-read schema uses a default length of 1000 while MTerm uses its
live preference. The write threshold is advisory. Keep intentional differences
visible and issues open until the required acceptance decision/evidence exists.
Cooperative locks/path checks are not OS-wide transactions or a native sandbox.

Keep CODEX_HOME synthetic. A real model/API call or authentication experiment
requires explicit authorization for that operation. No tool-discovery claim can
be extrapolated to all26 contracts or all48 requirements.

## Gates and closing the next slice

Use `build:code` for deliberate RED/GREEN only. After explicit source/catalog
review, run normal gates from the chosen ordinary Windows clone with the pinned
local Node/Codex toolchain:

```powershell
$MTermNodeBin = 'C:\Tools\Dev\MTerm-CLI\artifacts\toolchain\node-v24.21.0-win-x64'
$env:PATH = "$MTermNodeBin;$env:PATH"
$env:MTERM_CODEX_TEST_PREFIX = 'artifacts/ci-codex'
$env:MTERM_CODEX_EXPECTED_VERSION = '0.160.1'
node scripts/orchestration/verify.mjs --full
node scripts/verify-self-host.mjs
```

Record actual exits and source identities. Equivalent individually executed
component commands must be identified as such. Do not waive failed checks,
remove prepack, disable freshness or call file-level scratch test wrappers full
acceptance. Verify the packed installed artifact and a fresh committed extraction.
Self-host still requires an ordinary clone while linked Git metadata outside the
root remains unsupported (#66).

Pinned target: DesktopCommanderMCP **0.2.52**, commit
`c774c3b505de990219637ecdc9a830c8772fae9d`, **26 published tools**. All **48 DCP
issues remain open**, **WEB acceptance remains 0/12**, and broad maturity remains
**29.12%**, with all stages/weights unchanged. A complete parity PASS requires
accepted issues, installed/Codex lifecycle, supported platforms and verified
merged source, not a green subset or a paired device.

For each source change, record actual provider/model/UTC/base/paths/tests/limits
and `roadmap_updates`, review/render explicitly, publish coherent tested commits,
and inspect exact-head checks. No force-push, reset/clean, credential export,
protection changes, fabricated tags or paid prompts. Merge normally with expected
head protection after acceptable verification. Before ending, retain a hashed
checkpoint, actual local/remote/PR/main identities and unresolved differences,
update this prompt, and provide its downloadable copy.
