# MTerm-CLI: continue Codex parity and complete owner pairing

**Continuation date: 2026-11-02. Execute the work.** Re-read current source, PRs,
retained logs and deployed state before changing anything. This is a checkpoint,
not authority to overwrite newer work or to rerun every completed gate.

Repository: <https://github.com/MulattoTech/MTerm-CLI>. The independent long-term
acceptance target remains **100% DesktopCommanderMCP parity as consumed by Codex,
then 100% — PASS**. Broad product maturity and remote WEB acceptance are separate.

## Verified delivery and authoritative current state

The configuration implementation is published through [PR #72](https://github.com/MulattoTech/MTerm-CLI/pull/72).
Its tested implementation is `def85d256fe558ef26e0cdf7d0218ce250682150`.
The later delivery documentation does not change the four tested verifier files.
Read that PR's current state and delivery comment for the final documentation
head, merge/main SHA, post-merge checks and final recovery manifest. This avoids
pretending a document can contain the hash of its own future merge commit.
Always resolve the latest main before choosing a work base.

| Item | Verified evidence |
| --- | --- |
| Dependency main | `932c310914d8af822c5b1611ac85c5e79c2c5097` |
| DCP-010 / #12 repair | [PR #71](https://github.com/MulattoTech/MTerm-CLI/pull/71) merged; source `297877435c4b3358ac53414af28edd11504e35ed` |
| DCP-016 / #18 qualification | [PR #72](https://github.com/MulattoTech/MTerm-CLI/pull/72); tested implementation `def85d256fe558ef26e0cdf7d0218ce250682150` |
| Windows gates | 164/164 tests, zero skips; normal package, self-host, normal prepack, source and installed native-Codex checks PASS |
| Implementation hosted gates | All nine checks PASS: PR matrix `41383776637`, fast `41383776656`, push matrix `41383709723` |
| Fresh committed extraction | Clean npm ci, reviewed build, normal prepack and installed package PASS from `def85d2` |
| Fresh source archive SHA-256 | `fa9b8d470afbd6e70f81232841c879a8ac680a9d3e4b0411914c0f12bef78d9e` |
| Delivery and final checkpoint | Resolve the exact final head/main and additive bundle/source/manifest hashes from PR #72's delivery comment and the downloadable continuation's release record |

Read `docs/validation/2026-11-02-config-delivery.json` for the exact implementation
check URLs, timestamps and extraction results. The final documentation revision
must pass its own hosted checks before expected-head merge. A passing prior head
is never substituted for a failed or unverified current head.

The dependency main includes PR #69, metadata PR #70 and the DCP-010 repair in
PR #71. All nine checks on the exact PR #71 head succeeded: PR matrix
`41382703553`, fast run `41382703583` and push matrix `41382566783`. They apply to
that repair and do not certify the newer DCP-016 changes. All five merged-main
checks also passed (matrix `41382914828`, fast `41382914744`). PR #52 is marked merged;
PR #67 was closed as incorporated, and both source heads are ancestors of that
main. The read-only GitHub audit found no unique product commits on the other
published non-access-check branches. Recheck before selecting a new base.

## Newly established evidence

Read `docs/validation/2026-11-02-config-installed-qualification.md` and its
sanitized native JSON. A standalone copy of the new DCP-016 verifier passed on
Windows Node 24.21.0 against an actual packed DCP-010 candidate installation:

- Two concurrent installed MCP children shared synthetic settings across two
  explicit roots; a third process verified restart persistence.
- Dynamic native, compatible and multi-file read limits; write-warning thresholds;
  exact Unicode append/rewrite bytes; and three concurrent distinct-key write
  rounds passed.
- Root narrowing, empty-root denial, owner-ceiling enforcement, invalid-setting
  byte preservation, command blocking, corrupt-policy denial and owned cleanup
  passed.
- Ten positive network canaries were intercepted. No product attempt was observed
  through the instrumented Node network APIs. This is not an OS sandbox or a
  descendant-process network certificate.
- Every captured MCP/fixture PID returned ESRCH during bounded signal-zero polling.
  A cleared SDK PID alone is not exit evidence. Fixture cleanup completed; all
  three stderr counts were zero.
- No real user config/authentication changed, no model call occurred, and
  `actualCodexAgentToolInvocation` remained false.

The original probe copied only the standalone verifier into artifacts. The later
integrated native Windows workflow passed 164/164 tests, normal package verification
and the revised source-entry managed-Codex gate. Separate normal prepack, self-host
and explicit installed-entry Codex then passed; see the report for retained paths.
All nine implementation-head hosted checks and a fresh committed extraction then
passed. The extraction began without dist or node_modules, installed exact locks,
ran the reviewed build and normal prepack, and exercised the installed package.
The tested product module SHA-256 was
`18e20ed25d20124e2530e8a236133d49317fdf9116531df2c4de4fc455225c50`;
use retained package/report identities to reconcile it with the delivered commit.

The DCP-016 source adds `scripts/verify-configuration-installed.mjs`, calls it from
`verify-package.mjs`, extends `verify-managed-codex.mjs` with synthetic configuration
discovery/persistence, and adds negative verifier input tests. It does not change
runtime permissions or implement the separate DCP-010 replacement repair.

## Preserved remote release

The earlier remote implementation and deployment gates are complete. Do not
recreate the relay, temporary service identity or fixture devices to resume work.
The final remote report and PR #69 retain detailed evidence and recovery commands.

| Resource or checkpoint | Recorded identity |
| --- | --- |
| MCP endpoint | `https://mcp-staging.m-techlabs.com/mcp` |
| Private dashboard | `https://mterm-staging.m-techlabs.com` |
| Worker | `mterm-gateway-staging` |
| Current recorded Worker version | `af4fd06e-c4a3-4545-ad22-31d0ae956215` |
| Deployed product source | `b90432a1bc138d59305692a9f74f110a475d0881` |
| Gateway artifact SHA-256 | `97a0457b78e113c058ae8da3d3a6a54fcd93c2b35d1dd1781316c41001ac10a6` |
| Existing state | Enabled staging, owner-only access, read-only tools; no production promotion |

The earlier smoke passed 11/11 using the official SDK, a temporary Access service
principal and two real Windows fixture agents. Temporary grants/devices/agents,
policy/token/binding were removed. Human Google sign-in, browser consent/callback
and ChatGPT connector acceptance remain distinct from that proof. An existing
owner Brave session was reported able to view the dashboard with zero devices
and zero grants during this continuation; that observation does not certify a
fresh Google login or connector consent. No owner pairing was applied at the
worker checkpoint. Reconcile any later owner work before creating new state.

Read `docs/REMOTE_MCP.md`, `docs/deployment/MTERM_STAGING.md` and
`docs/validation/2026-11-02-remote-sprint.md` for exact setup, pause and rollback.
Do not redeploy unchanged gateway bytes for this local verification-only change.

## First actions and source preservation

Discover the available Remote Desktop Commander, GitHub, Cloudflare and Browser
schemas. Scratch is not the authorized Windows workstation. RDC may return while
a process is still running: inspect its owned PID, retained log and actual exit
code before starting another gate. Do not repeat stalled child connections or
kill unrelated tasks.

Read current `AGENTS.md`, `CONTRIBUTING.md`, `docs/execution/READ_FIRST.md`,
`docs/execution/MASTER_IMPLEMENTATION_PROMPT.md`, `docs/HANDOFF.md`, `docs/SECURITY.md`,
`docs/TESTING.md`, `docs/ORCHESTRATION.md`, `docs/CODEX_REGISTRATION.md`,
`docs/parity/README.md`, `docs/roadmap/METRICS.md`, the DCP ledger and the latest
change/validation records. Preserve the primary checkout and existing AO/MJobs
processes. Do not start a fleet or automatic issue intake before the Codex/AO hook
pilot is verified.

- Primary Windows checkout: `C:\Tools\Dev\MTerm-CLI`. Its eight modified and three
  new source files were preserved and recovered in the preceding integration.
  Never reset, clean or overwrite that checkout.
- Existing ordinary verification clones include
  `C:\Tools\Dev\MTerm-CLI\artifacts\worktrees\remote-mcp-20261102` and
  `C:\Tools\Dev\MTerm-CLI\artifacts\worktrees\config-retry-20261102` and
  `C:\Tools\Dev\MTerm-CLI\artifacts\worktrees\config-qualification-20261102`.
  Inspect actual branches, dirty state and task-owned processes; these names do
  not prove they are clean or currently appropriate for a new task.
- The qualification worker clone was
  `/workspace/scratch/2c8f320f622d/mterm-config-qualification`, branch
  `feat/dcp-016-installed-config-20261102`, initial base `059413f`, with dependency
  main `932c310` integrated normally. Review fingerprints apply only to their
  exact source set and must be regenerated after integration or relevant edits.
- Keep MTerm-GUI and the archived original MTerm repository untouched. Never merge
  `access-check/*` or recovery-only refs into product history.

The preceding complete recovery checkpoint is
`C:\Tools\Dev\MTerm-CLI\artifacts\checkpoints\remote-sprint-release-metadata-2026-11-02T02-08-00-863Z`.
Bundle SHA-256:
`07b2800a964dc1e87e23cdd1d5190dd49d74f852dca9f5364ba221965476a5bf`;
manifest SHA-256:
`2c075a95eb8bb8a8c83cda07be1579e3234e216e23a8a6d9b3e2b098532f391c`;
source ZIP SHA-256:
`589aa0bdd10e490c9d44d8fe92d761065458b88bb359fcaf4807c60590d2cab1`.
Create a new additive source/history checkpoint before substantial changes.

## Immediate engineering sequence

1. Reconcile PRs #71/#72, current main, its actual checks and the final checkpoint.
   Preserve every delivered or still-unmerged source change. Completed configuration
   gates above need repetition only for changed source or a concrete remaining risk.
2. Read all 48 live DCP issues and compare them with the ledger. Keep one issue,
   worker, isolated clone and reviewable PR per acceptance gap. Do not close an
   issue for a similarly named native tool or a shared foundation pass.
3. Start the next concrete configuration contract gap with DCP-009 / #11:
   inspect the pinned `get_config` handler/schema and compare response fields,
   types, defaults and available system metadata. Write a meaningful failing
   contract fixture, implement bounded accurate metadata/output, then repeat
   through the packed installed server. Do not invent feature-flag values or
   import vendor analytics to fill missing metadata.
4. Keep the remaining dependencies explicit. DCP-012/#14 and DCP-013/#15 need
   compatible shell execution and a reviewed shell-command blocklist contract;
   storing a shell preference is not execution. DCP-014/#16 also depends on the
   still-missing compatible process read/interact line-limit behavior. DCP-016/#18
   has strong installed reload evidence but still needs its complete contract and
   applicable actual Codex-client acceptance decision.
5. Preserve intentional owner constraints: empty roots deny, preferences cannot
   raise capability ceilings, mandatory command blocks remain, and no upstream
   telemetry is added. The pinned single-read schema supplies length=1000 even
   when the preference changes; MTerm intentionally uses its live default. The
   write threshold is advisory, not a hard failure. Record these differences.

Keep CODEX_HOME synthetic. A real model/API call or auth experiment still requires
explicit owner authorization. Native Codex parsing plus SDK execution does not
prove that a Codex model invoked a tool. Inspect actual new hosted failures without
bypassing freshness, protections, permissions or tests.

Use `build:code` only during deliberate development. Normal gates must run after
review rather than bypassing freshness. From the chosen isolated Windows clone:

```powershell
$MTermNodeBin = 'C:\Tools\Dev\MTerm-CLI\artifacts\toolchain\node-v24.21.0-win-x64'
$env:PATH = "$MTermNodeBin;$env:PATH"
$env:MTERM_CODEX_TEST_PREFIX = 'artifacts/ci-codex'
$env:MTERM_CODEX_EXPECTED_VERSION = '0.160.1'
node scripts/orchestration/verify.mjs --full
node scripts/verify-self-host.mjs
```

Retain logs and actual exit codes. The self-host verifier still requires an
ordinary clone while linked Git metadata outside the root is unsupported (#66).
Normal `npm pack` must retain prepack. Validate a clean source extraction and
matching lock/shrinkwrap; ignored build output is not source reproducibility.

## Owner-only continuation

The existing Brave dashboard session already showed the verified owner identity,
zero devices and zero authorizations. Use that normal session; the human completes
any required login and consent. The prepared preview is:

- Root: `C:\Tools\Dev\MTerm-RemoteWorkspace`, containing only `connection-check.txt`.
- Gateway: `https://mcp-staging.m-techlabs.com`.
- Dashboard: `https://mterm-staging.m-techlabs.com`.
- Protected state: `%LOCALAPPDATA%\MTerm-CLI\remote-staging`, outside the shared root.
- Name: `MulattoTechBox staging`; read-only, autostart false.
- Preview only: applied=false, paired=false; protected owner state was not created.

The attached owner handoff explicitly reserves folder approval, pairing and client
consent for the human. Ask for that concrete root selection before applying the
prepared setup. Start pairing only when the owner is ready for the five-minute
window, then run the agent in its own foreground terminal. Do not substitute a
service identity, export cookies/tokens, enable autostart, remote write/exec or
promote production.

The owner then connects the MCP URL in ChatGPT and completes consent. Observe real
tool discovery, device inventory, one selected-device read, outside-root denial and
stop/revoke behavior. Record browser/client evidence separately from the historical
SDK/service-principal smoke. If human input is unavailable, finish independent
engineering work and present the exact prepared owner action.

## Remaining parity and acceptance rules

Pinned target: `wonderwhy-er/DesktopCommanderMCP` 0.2.52,
`c774c3b505de990219637ecdc9a830c8772fae9d`, 26 published tools.
Epic #2 indexes DCP-001 through DCP-048, issues #3 through #50. At this checkpoint,
all 48 remain open; remote WEB acceptance is 0/12. The 300-item broad maturity is
29.12%, with unchanged stages and baseline weights. None is interchangeable with
complete Codex parity.

After configuration, complete the existing file/editing adapter's ranges, encodings,
formats, directory/cross-device moves, metadata and diagnostics; then asynchronous
search sessions/options; owned process/terminal contracts; local usage/history/
prompts; and full package/Codex/platform/license/security qualification. Use existing
services and audited bounded fixtures. Never execute upstream bootstrap merely to
inspect a handler, add upstream telemetry or send private history to a vendor.

Owner startup ceilings remain distinct from model-editable preferences. An empty
root list must never grant whole-machine access. Where an intentional safety
boundary differs from pinned behavior, record the difference and obtain a precise
owner ruling when required. Keep the affected issue open instead of manufacturing
acceptance. Cooperative filesystem locks are not OS-wide transactions.

For each change: observe meaningful RED where behavior changes, implement, run
focused/full and installed tests, record actual provider/model/UTC/base/paths/tests/
limitations plus `roadmap_updates`, explicitly review/render, then publish coherent
commits and inspect their exact checks. No force-push, reset/clean, source deletion,
release-tag invention, real Codex auth changes or paid model prompts. Merge normally
with expected-head protection after acceptable verification.

Before ending, checkpoint source/history with hashes, record actual local/remote/
PR/main identities and unresolved differences, update this prompt with observed
closeout results, and provide a downloadable copy. Continue through the next
verified dependency instead of rebuilding the already functioning remote preview.
