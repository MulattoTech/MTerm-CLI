# DCP-009: bounded `get_config` metadata

This is a partial implementation report for [issue #11](https://github.com/MulattoTech/MTerm-CLI/issues/11).
The tested implementation is `535d99e20b52a30ba9a24b6d2205d8e6687f6ca6`, based on
verified main `c408e286c437bec1c8c88fbbae29d89a9f8f90c8` in an independent ordinary
clone on `feat/dcp-009-config-metadata-20261102`, carried by
[PR #73](https://github.com/MulattoTech/MTerm-CLI/pull/73). The later documentation
closeout leaves the runtime, test and verifier bytes unchanged. See the
[delivery record](2026-11-02-config-metadata-delivery.json) for exact qualification
identities; future final-head and merge outcomes belong to PR #73.
All 48 DCP issues remain open. No broad roadmap stage, weight, acceptance text,
dependency or estimate changes.

## Pinned comparison

The comparison target is DesktopCommanderMCP 0.2.52 at
`c774c3b505de990219637ecdc9a830c8772fae9d`. These files were read as source;
the upstream server, telemetry, feature-flag initialization and Python detector
were never executed.

| Source at the immutable pin | Observed contract | SHA-256 of retained source |
| --- | --- | --- |
| [src/tools/config.ts](https://github.com/wonderwhy-er/DesktopCommanderMCP/blob/c774c3b505de990219637ecdc9a830c8772fae9d/src/tools/config.ts) | Text prefix, structured envelope, memory formatting, flags | `540d963760e5e4766bf78ca60545a3e3df80638ffd25d282cf0ecba7b0184e7c` |
| [src/config-field-definitions.ts](https://github.com/wonderwhy-er/DesktopCommanderMCP/blob/c774c3b505de990219637ecdc9a830c8772fae9d/src/config-field-definitions.ts) | Six preference keys, ordering and value types | `d705dd5bd35fa2bee7129918dc4c44714db4f1cfd3b989e8bf9d3d68b7f2c843` |
| [src/utils/system-info.ts](https://github.com/wonderwhy-er/DesktopCommanderMCP/blob/c774c3b505de990219637ecdc9a830c8772fae9d/src/utils/system-info.ts) | OS, Node/process and example-path fields; probe side effects | `96bb6ac508c1300620170a3d07c3235c0de3b251744a8991d5b8bac2c0dd7335` |

The checked-in pinned `src/tools/schemas.ts` snapshot already matches the optional
`origin: 'ui' | 'llm'` input. The new assertions are manually extracted contract
fixtures, not execution of the complete upstream handler or a full differential
parity certificate. The readonly source copies are retained under
`artifacts/dcp009-validation/upstream/`; the approved upstream pin and detector
remain unchanged.

## Implemented response

`CompatibilityConfig.describe()` keeps its existing text/structured envelope and
legacy `platform`, `architecture`, `nodeVersion` and `release` fields. It adds:

- `systemInfo.memory`: `rss`, `heapTotal`, `heapUsed`, `external`, and
  `arrayBuffers`, all measured once per call. The formatting follows the pinned
  `(bytes / 1024 / 1024).toFixed(2) + ' MB'` expression. The historical suffix says
  MB although the divisor is binary MiB. Text and structured results share that
  single measurement.
- OS name, path separator and Windows/macOS/Linux booleans; Node version without
  the leading `v`; actual process PID, architecture, platform and a copied
  component-version map. Generic example paths use the literal `username`, not
  the machine's user directory.
- `featureFlags: {}` with `mterm.featureFlagsSource: 'none'`. MTerm has no
  experiment provider; this is not a claim to have fetched vendor experiments.
- Six entries in pinned order: `blockedCommands`, `allowedDirectories`,
  `defaultShell`, `telemetryEnabled`, `fileReadLineLimit`, `fileWriteLineLimit`.
  Types remain array, array, string, boolean, number, number. Editability remains
  tied to the separate owner `--allow-config-write` capability.

The public SDK can provide client metadata beyond the declared name/version
parameter type. The previous implementation echoed all of it. The new focused
regression demonstrates that behavior with a synthetic sentinel. `currentClient`
now includes only the exact name and version when both are nonempty strings of
at most 256 UTF-16 code units without ASCII control characters. Other fields are
omitted. Invalid or oversized identity returns `null` with
`mterm.clientInfoStatus: 'omitted-invalid'`; an absent identity is `unavailable`,
and valid identity is `available`. No raw rejected value is logged or copied to
an error. This does not certify that arbitrary client-selected names contain no
secrets; the values remain untrusted client identifiers.

The ordinary fixture response must be smaller than 16 KiB. The installed check
requires system metadata below 8 KiB and the complete response within the existing
524,288-byte MCP limit. Runtime policy file/input limits and the MCP response cap
remain enforced by the existing implementation; the fixture size assertions are
not new general-purpose runtime limits.

## Explicit differences and omitted information

The response lists omitted upstream system fields in `mterm.omittedSystemInfo`:
`docker`, `pythonInfo`, `isDXT`, `nodeInfo.path`, `nodeInfo.npmVersion`, and
`examplePaths.accessible`. No subprocess runs to find Python. No mount, container,
Kubernetes service-account, host-name, user-directory, runtime-installation-path,
environment-variable or process-argument inventory is added. Omission must not
be interpreted as Python unavailable or a container absent.
`platformName` reports the OS name without upstream's optional container suffix.

`systemInfo.defaultShell` deliberately reports the effective owner-approved
preference. Upstream reports a static OS hint (`powershell.exe`, `zsh`, or `bash`)
independently of its preference. `uiHints.availableShells` stays within the owner
shell ceiling and is not an operating-system availability probe. The returned
`mterm.shellCommandTools: false` is unchanged; this metadata does not implement
shell command execution or close DCP-013/DCP-034.

Other existing differences remain: owner roots and mandatory executable blocks
cannot be widened by a model, empty roots deny access, telemetry defaults off and
has no transport, malformed policy fails closed, and disabled config writes stay
disabled. No history, onboarding state, client ID, vendor flag value or telemetry
success is fabricated. The issue remains open pending complete pinned-field and
intentional-difference review and actual supported Codex-client acceptance. The
qualified installed behavior below covers this implemented slice.

## Observed tests

Scratch runtime: Linux x64, Node `v24.22.1`. Dependencies were independently
installed from the exact lock with scripts disabled. A missing offline cache
required the authorized public dependency download; no global package changed.

| Command | Observed result |
| --- | --- |
| Baseline `npm run build:code`, then `node tests/compat-config-metadata.test.mjs` before runtime edits | RED: 11 tests, 1 passed, 10 failed, no skips; missing metadata and actual client-extra reflection |
| Revised `npm run build:code`, then the same direct metadata suite | GREEN: 11/11, no skips or cancellations |
| `node tests/compat-config.test.mjs` | 19 passed, 1 native-Windows-only skip, no failures |
| `node tests/compat-config-retry.test.mjs` | 13/13, no skips or failures |
| Typecheck, complete repository formatting, installed verifier syntax and diff checks | Passed; this is not installed execution evidence |
| Explicit roadmap review/render/check, normal `npm run build`, pinned baseline check and base-to-candidate catalog invariants | Passed; all 300 stages/weights/acceptance fields and all 48 open issue states preserved; maturity 29.12% |

The four platform subcases override only the process platform during formatting.
They establish deterministic mappings, not native Windows/macOS/FreeBSD support.
Probe guards exercise their own negative canaries before checking that metadata
formatting calls none of the instrumented APIs. Their scope is the selected
filesystem, OS, child-process, console and fetch APIs in that unit fixture, not
an OS sandbox or universal network interception.

`scripts/verify-configuration-installed.mjs` now requires the full text/structured
agreement, all five memory fields, the original captured MCP child PID and current
Node/platform identity, field ordering/types, truthful omissions, and removal of
a synthetic client title. This runs in each existing installed config inspection,
including the restarted child, alongside the existing network canaries. Its new
eighth step and result metadata are assertions, not prewritten product responses.
The integration owner then exercised these assertions in the actual Windows
package and fresh-extraction runs recorded below. No paid model call or real
Codex auth/config access occurred. Separately authorized remote owner pairing is
recorded in the [owner connection report](2026-11-02-owner-connection.md).

Retained scratch logs and SHA-256:

| File under `artifacts/dcp009-validation/` | SHA-256 |
| --- | --- |
| `focused-red.log` | `84de620e91267436c2dc15e83d87a725af129693ecf4d107aa6ddd48d18c0683` |
| `focused-green.log` | `33e11d9ccac8d9d25aeee80e4fa037535aecd79f9708a5d8ddf3e974a0ba95c6` |
| `config-regression.log` | `2cb2bc3e395dafae9f88595c4d7f8dbe1d2c9479841d0b2e8fffb9feb0fba045` |
| `retry-regression.log` | `1f176a545943fa72299951f5e11ab4117fdb5c711be7d727e3f086ec824dabfa` |

## Actual Windows and installed qualification

The [native observation](2026-11-02-config-metadata-windows.json) identifies
implementation `535d99e`, Windows x64 and Node `v24.21.0`. It started at
2026-11-02 04:22:27 UTC and finished at 04:24:00 UTC. Build output did not exist
before the reviewed build. **175/175 tests passed, with zero failures, skips or
cancellations**, in 30,670.3631 ms.

| Native gate | Exit | Duration |
| --- | ---: | ---: |
| Reviewed build | 0 | 2,217 ms |
| Normal check, including the complete suite | 0 | 34,266 ms |
| Self-host | 0 | 1,204 ms |
| Actual package/install/link/offline exec verification | 0 | 15,498 ms |
| Native Codex registration using the source entry | 0 | 2,625 ms |
| Normal prepack | 0 | 35,752 ms |
| Native Codex registration using the installed entry | 0 | 1,953 ms |

These include all four commands that compose `verify.mjs --full`, run individually
with retained exit results: reviewed build, normal check, package verification and
managed Codex verification. No success of an unobserved wrapper invocation is
inferred. The test summary came from the unchanged Node spec-reporter log; the
initial enrichment reader expected TAP prefixes. The retained check log SHA-256 is
`d934d0b88876fc396b3001f54ddf6e7aef84cf737e913a5c99904ccf090a60ab`.

The installed proof passed **eight scenarios** with two concurrent MCP children
and a third restarted child. Its metadata PID matches the captured child, text
matches structured output, all five memory strings and six entry types/order are
checked, client extras are excluded, and omitted probes remain explicit. Ten
network canaries were intercepted; no product attempt was observed through the
instrumented Node APIs. All three stderr captures contained zero bytes. Captured
MCP/fixture processes returned ESRCH after bounded exit checks, and owned fixture
cleanup completed. This is not an OS sandbox or an arbitrary-descendant network
monitor.

Native Codex **0.160.1** parsed synthetic registration in both source-entry and
installed-entry runs. Each verifier then used SDK clients to launch/call the
registered command twice, preserving unrelated config bytes on removal. No real
Codex auth/config was touched, and `actualCodexAgentToolInvocation` remains false.

The package measured **57,843 archive bytes**, **224,214 unpacked package bytes**
and **14,171,584 installed production bytes** across 992 files. System Node and
native Codex remain external prerequisites; this is not a self-contained
three-component under-50-MB certification. The installed config module SHA-256 is
`f6f412a83d13a1aab24398f1d54ca1c301e093c6de1511f2097e0d43b720cc32`.

## Fresh committed source and hosted status

The [fresh-extraction observation](2026-11-02-config-metadata-fresh.json) starts
without `dist` or `node_modules`. From committed `535d99e`, exact `npm ci`, reviewed
build, normal prepack and actual installed package verification all passed in
3,802 / 1,641 / 35,001 / 10,560 ms respectively. Source archive SHA-256:
`7e2c015a34fb10cafe53b8df713c48824541acaac59cb6e6f5f6446803f4afae`.
The initial ad-hoc enrichment wrapper encountered a PowerShell-stdin encoding
parse failure before any product command or file mutation ran; replacing its
information-symbol regex with ASCII allowed the recorded commands to execute.
No product source, test or verifier was changed to obtain the pass.

At the 12:02:49 UTC observation, **9/9 latest implementation hosted checks passed**
at unchanged `535d99e`.
PR matrix [41388159750](https://github.com/MulattoTech/MTerm-CLI/actions/runs/41388159750)
passed all four platforms and fast check
[41388159762](https://github.com/MulattoTech/MTerm-CLI/actions/runs/41388159762) passed.
Push matrix [41388126481](https://github.com/MulattoTech/MTerm-CLI/actions/runs/41388126481)
initially passed three platforms; its macOS ARM64 job
[125093389299](https://github.com/MulattoTech/MTerm-CLI/actions/runs/41388126481/job/125093389299)
timed out after 120 seconds during npm tarball installation, with SIGTERM and
empty captured output. That job's tests passed 163 with 12 platform skips and no
failures; the same platform passed in the PR matrix. The underlying install-timeout
cause is unestablished and the failed attempt remains part of the record.

The integration owner requested one supported rerun of the failed job. Attempt 2,
[job 125262922093](https://github.com/MulattoTech/MTerm-CLI/actions/runs/41388126481/job/125262922093),
ran from 11:59:54 to 12:00:47 UTC and passed: 175 tests, 163 passed, 12 platform
skips and no failures, all eight installed configuration scenarios, and native
Codex 0.160.1 parsing with SDK-launched registered-command calls. The package gate
used the installed MCP entry; the separate hosted managed-Codex gate used the
source entry (`installedEntry:false`). No model-driven tool invocation occurred.
Only macOS ARM64 was newly executed; the other three successful push-platform
jobs retain their original execution times in attempt 2.

The [exact retry report](2026-11-02-config-metadata-hosted-retry.json), including
both decoded-log hashes and the latest nine check identities, has SHA-256
`6dec037731b0ddf389bf64920dd91d0353e356067d3c4615e64762a52c5aa4a2`.
The successful rerun does not establish why the original installation stalled.
These implementation observations cannot stand in for final documentation/main
checks, which remain a separate delivery gate in PR #73.

## Current issue audit and scoped evidence corrections

The [read-only issue audit](2026-11-02-config-metadata-issue-audit.json) inspected
all **48 issue bodies and 21 existing comments** at 04:29:19 UTC against the
immutable `535d99e` ledger. It found zero ID/title/URL/state/upstream/epic mismatches;
all 48 issues were open and unassigned. The retained audit is an unchanged dated
snapshot, SHA-256
`1e4bc682a23dd803ccaa8e2778c1c3b3a32026f5022d937fb9533beb33bf9c14`.

This closeout refreshes four evidence observations without accepting an issue:

| Ledger row | Qualified observation | Still open |
| --- | --- | --- |
| DCP-011 / #13 | PR #72 and the current native installed run exercise two roots, cross-process narrowing, empty denial, owner ceiling and restart | Complete root/alias/private-path/platform contract and applicable Codex-client acceptance |
| DCP-014 / #16 | Live native/compatible/multi-file read defaults and advisory write warnings with exact Unicode bytes | Pinned single-read default/output differences, formats and compatible process line-limit semantics |
| DCP-015 / #17 | Preference persistence/reload with true/false values and no observed transport in instrumented Node APIs | Full semantic/privacy acceptance; no vendor opt-out event or OS-wide network certification |
| DCP-020 / #22 | Live configured advisory warnings with exact text append/rewrite bytes | Office behavior and complete format/size/error/output compatibility |

The former DCP-020 statement that configured warnings were missing is superseded
by the installed evidence. Fifteen issue threads still contain dated October
billing/spending-gate comments. Those historical comments were not edited en
masse and are not a current diagnosis; subsequent actual platform runs and the
specific install timeout above are the relevant observations. All release-level
checks for complete 26-tool/48-issue acceptance remain separate.

## Recovery and next gate

The new clone is `/workspace/scratch/2c8f320f622d/mterm-dcp009-20261102`.
The implementation worker edited no pre-existing scratch or Windows checkout;
the integration owner used the dedicated ordinary Windows clone
`C:\Tools\Dev\MTerm-CLI\artifacts\worktrees\config-metadata-20261102`.
Before tests/source changes,
`artifacts/checkpoints/dcp009-start-20261102/` captured:

- `base.bundle`: `53ba810ece63c7c097046f4e142a7973db14f530121b207211debb216b3a7873`
- `base-source.tar`: `c79ab89424407dee2b9c7836cdbf28d7a9b88cc35118438a99896d7b008bbadc`

Next: qualify the final documentation head and record expected-head merge/main
and recovery identities
through PR #73. Do not repeat completed unchanged-source gates without a concrete
reason. Actual Codex model invocation and ChatGPT consent/tool use remain
unperformed. The owner-authorized dashboard pairing is separate evidence and
caused no gateway redeployment or product acceptance closure.
