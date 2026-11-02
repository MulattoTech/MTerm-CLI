# Configuration persistence reliability — 2026-11-02 UTC

This is an implementation and failure-recovery slice for DCP-010 / issue #12.
It does not close full set_config_value parity, DCP-016 reload acceptance, or any
of the other 48 DCP requirements. The next installed-configuration qualification
is independently reviewable under issue #18.

## Verified baseline and preserved work

Baseline main: `059413ffa4fb3b18c8e15af907744a40e0b874a7`, tree
`43e5c7fb620652b02da42be49f6e1f8ac45a2a14`. PR #52 was merged, PR #67 closed as
incorporated, and PR #69/#70 delivered the integrated code and evidence. All seven
published product branches were ancestors of this main; access-check branches
were excluded. [Live 48-issue audit](2026-11-02-config-issue-audit.json).

The baseline's exact five hosted checks passed, including Windows, Linux and both
macOS architectures. [Baseline checks](2026-11-02-config-baseline-ci.json). Old
billing and canonical-path failures remain historical evidence. They neither
block this delivered baseline nor certify this sprint's later source.

The original dirty Windows checkout remains at `1d900464ba8a36a1121e2ae51ea65c14c3ee41c1`.
Its eight modified and three new files were copied and hashed before changes.
Work runs in the ordinary clone
`C:\Tools\Dev\MTerm-CLI\artifacts\worktrees\config-retry-20261102`.

Pre-change checkpoint:
`C:\Tools\Dev\MTerm-CLI\artifacts\checkpoints\config-sprint-start-20261102`.

| Artifact | SHA-256 |
| --- | --- |
| all-refs.bundle | d35088ce202f05d9a669cf2681fc31b1040d083c5a27cf81d094de9460d312a3 |
| before.json | ba4d27eb67e52ada17cf96e65e49074bde9fefded1a943730ed6a7f920d92f53 |
| main-source.zip | 40dc78fd18fb29c32af12d1623acbee3b70646e955145fb43dabff8d977bc8da |

## Repair and its boundary

Compatibility config and `.previous` backup replacement previously attempted
one rename. A brief Windows sharing failure therefore rejected an otherwise valid
setting change. The implementation now permits five attempts only for Windows
`EPERM` or `EBUSY`, with 25, 50, 100 and 200 ms waits (375 ms total backoff).

Each attempt revalidates the original expected destination bytes, safe parent
chain, regular single-link destination, cancellation and the owned staging inode.
An external edit is never adopted as the new expected value. Other errors and
other platforms fail immediately. New-file creation remains no-overwrite linking.
No stale lock is stolen and no permissions are widened.

Cleanup verifies the original staging inode and safe parents. A substituted file
is preserved. A stage moved with a retargeted or inaccessible parent may remain
for explicit recovery instead of risking deletion of an unrelated path. The
existing cooperative lock and Node pathname checks are not a handle-anchored OS
transaction against hostile writers.

## RED/GREEN evidence

Linux development with Node 24.22.1 directly invoked the new test file:
13 assertions/subtests, **five passed and eight failed before the repair**;
**13 passed after the repair**. Existing configuration units passed 19 with one
Windows-only skip. Scratch child-process execution was unreliable (a spawned Node
CLI exited zero with no output, and existing MCP cases returned connection closed),
so no scratch subprocess/MCP/full-platform PASS is claimed.

Native Windows Node 24.21.0 reproduced the same eight failing regressions before
the source repair: **38 combined configuration tests, 30 passed / eight failed**.
Its initial repaired run passed 37/38; the remaining test could not inject a parent
rename while Windows held the public setter's lock open. The single fixture now
invokes the exact production replacement method directly, while all other cases
exercise the public setter. Every guard assertion is retained. The final native
Windows run passed **38/38, zero failures/skips/cancellations**, in 6,365 ms.
This is method-boundary race coverage, not proof that a parent retarget can occur
while the full Windows setter holds its open lock.

The reviewed normal Windows workflow passed with **162/162 tests, zero failures
or skips** (48,211 ms for tests; 76,205 ms for the full workflow). This ran normal
build/check, the installed package verifier and isolated native Codex registration.
`verify-self-host.mjs` also passed (1,341 ms). A separate normal `npm pack` including
its prepack gate passed (30,908 ms); no build/review gate was bypassed.

The packaged archive was 56,649 bytes, unpacked package 220,182 bytes, and installed
production tree 14,167,552 bytes / 992 files. Real installed MCP round trips,
test-owned npm link and offline npm exec passed from outside the checkout. Node
and Codex remain external prerequisites; this does not establish a complete
three-component bundle below 50 MB.

Native Codex 0.160.1 parsed the isolated managed configuration and the registered
command completed two SDK MCP sessions, shutdown and exact owned-stanza removal.
This was repeated against the actual installed package with `MTERM_VERIFY_BIN`:
**PASS**, `installedEntry=true`, 1,851 ms, evidence
`artifacts/managed-codex-eE1ArH/result.json`. The source-entry result is retained at
`artifacts/managed-codex-HcBPVZ/result.json`; package evidence is at
`artifacts/package-verify-ktDEkl/result.json`. These are native registration/parser
and SDK transport checks; `actualCodexAgentToolInvocation=false` and `modelCalls=0`.

The separately reviewed DCP-016 verifier candidate also passed its standalone
probe against that installed package. Its implementation and complete qualification
belong to issue #18, not to this runtime-repair PR. Hosted checks for this PR must
be inspected at its exact published head before merge.

Retained logs are under `artifacts/config-retry-validation` in the isolated
Windows clone; Linux RED/GREEN logs are under `artifacts/config-retry-*.log` in the
scratch development checkout. No real user Codex configuration/authentication or
model request is part of these tests.

## Configuration contract differences remain explicit

The pin remains DesktopCommanderMCP 0.2.52 at
`c774c3b505de990219637ecdc9a830c8772fae9d`. The existing recovered implementation
supports all six preferences with immutable owner capability ceilings. It already
reloads a bounded policy snapshot for each admitted call and supports multiple
roots; this repair improves persistence reliability.

Full parity still needs complete get_config system/feature metadata and exact
outputs/coercions, compatible shell execution and blocklist behavior, process
line pagination and other published contracts. Deliberate safety differences
remain: empty roots deny access, runtime settings cannot grant broader roots or
capabilities, mandatory executable blocks cannot be removed, and telemetry has no
network transport. Upstream's single-read schema defaults length to 1000 even when
the configured default changes; MTerm uses the live preference. These differences
must receive explicit acceptance decisions, not silent parity credit.

## Owner dashboard and remote boundary

The existing Brave session opened the actual private dashboard successfully. It
showed zero paired computers, zero client authorizations, read-only access enabled,
and writing/execution disabled. This is existing-session dashboard evidence, not a
fresh Google login or actual ChatGPT MCP consent/tool invocation.

Cloudflare confirmed unchanged deployment `5a0ff21c-6341-4e73-b4af-169e98b76db2`,
version `af4fd06e-c4a3-4545-ad22-31d0ae956215`, `MCP_ENABLED=true`, and only the owner
allow policy. No temporary service identity was recreated. No deployment change
or production promotion was performed.

The prepared owner preview root is `C:\Tools\Dev\MTerm-RemoteWorkspace`, containing
only a harmless `connection-check.txt`. Preview reports applied=false, paired=false,
read-only and autostart=false; no protected owner state exists. Applying that scope,
pairing, foreground start and ChatGPT consent await the owner's explicit selection
and interaction as required by the handoff.

## Acceptance and delivery

All 48 DCP issues remain open. Broad maturity weights, IDs and stages remain
unchanged; stale CI-blocker notes were corrected separately from acceptance.
The change record names exact tests, limitations and affected requirements.
The PR/issue evidence identifies the published implementation SHA and its own
hosted checks; the passing starting main is not reused as proof for this repair.
