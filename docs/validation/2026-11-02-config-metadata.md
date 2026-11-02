# DCP-009: bounded `get_config` metadata

This is a partial implementation report for [issue #11](https://github.com/MulattoTech/MTerm-CLI/issues/11).
The candidate starts from verified main `c408e286c437bec1c8c88fbbae29d89a9f8f90c8`
in an independent ordinary clone on `feat/dcp-009-config-metadata-20261102`.
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
intentional-difference review, exact installed/platform evidence for this source,
and actual supported Codex-client acceptance.

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
Native Windows, full workflow, normal package/prepack, exact installed-entry Codex
and hosted execution belong to the integration owner; they remain pending for
this candidate until separately recorded. No paid model call or real user
auth/config access occurred.

Retained scratch logs and SHA-256:

| File under `artifacts/dcp009-validation/` | SHA-256 |
| --- | --- |
| `focused-red.log` | `84de620e91267436c2dc15e83d87a725af129693ecf4d107aa6ddd48d18c0683` |
| `focused-green.log` | `33e11d9ccac8d9d25aeee80e4fa037535aecd79f9708a5d8ddf3e974a0ba95c6` |
| `config-regression.log` | `2cb2bc3e395dafae9f88595c4d7f8dbe1d2c9479841d0b2e8fffb9feb0fba045` |
| `retry-regression.log` | `1f176a545943fa72299951f5e11ab4117fdb5c711be7d727e3f086ec824dabfa` |

## Recovery and next gate

The new clone is `/workspace/scratch/2c8f320f622d/mterm-dcp009-20261102`.
No existing scratch or Windows checkout was edited. Before tests/source changes,
`artifacts/checkpoints/dcp009-start-20261102/` captured:

- `base.bundle`: `53ba810ece63c7c097046f4e142a7973db14f530121b207211debb216b3a7873`
- `base-source.tar`: `c79ab89424407dee2b9c7836cdbf28d7a9b88cc35118438a99896d7b008bbadc`

Next: independently review this exact source, run the focused and complete native
Windows/package gates, then inspect exact-head hosted results before publication
or merge. Actual Codex model invocation, human browser/ChatGPT acceptance and
Cloudflare deployment remain separate operations. This change makes none of them.
