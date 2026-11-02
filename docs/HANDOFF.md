# MTerm-CLI handoff — 2026-11-02 remote MCP staging

**The read-only staging service is enabled and its final deployment passed 11/11
live checks.** The [final sprint report](validation/2026-11-02-remote-sprint.md)
and [PR #69](https://github.com/MulattoTech/MTerm-CLI/pull/69) are authoritative for
the final merge/main SHA, document checks and recovery checkpoint. Human Google
sign-in and ChatGPT connector acceptance remain unverified; no persistent owner
agent is paired. Production has not been promoted.

## Current state — 2026-11-02

| Area | Observed result |
| --- | --- |
| Source | Validated code `b90432a1bc138d59305692a9f74f110a475d0881` integrates PR #52/#67 source, verified main and all eleven recovered unpublished files. Consult the final report and PR for later documentation/merge commits. |
| Final deployed smoke | **11/11 PASS** at that code checkpoint, Windows Node 24.21.0 and official MCP SDK 2.3.0. Two real DPAPI agents served independent fixture reads through Cloudflare. Final run ended 2026-11-02 01:24:29 UTC. |
| Identity and cleanup | Temporary Access service-principal proof exercised S256 PKCE and consent exchange. Temporary service policy, token and Worker binding were deleted; owner-only access remains. All fixture agents/devices/grants were cleaned. Human Google/ChatGPT acceptance remains separate. |
| Windows RED | The earlier full run passed 143/144 groups and exposed one real canonical-leaf/Windows 8.3 guard defect. It was not waived. |
| Windows GREEN | Final full workflow **PASS in 55.35 seconds**, including **149/149 tests**, no skips/cancellations, 32,829 ms. Earlier focused qualification passed 33/33 including five native 8.3 cases. |
| Fix provenance | Canonical-leaf worker fix `28ff573c407a588489abe9545cdaf18a8af7b6b3` is integrated as `bbf1d0e9b75cf153243a4722ad1ab91392445540`; Windows fixture quoting/format is committed as `14971ac`. The Windows-tested bytes match that combination. Codex bounded rename repair is `2cb2f07`. |
| Package and Codex | **PASS**: archive 55,636 bytes; unpacked payload 216,577 bytes; installed production footprint 14,163,947 bytes. Actual pack/install/link and eight aliases passed. Native Codex 0.160.1 parsed isolated registration and launched two MCP sessions; no user config or model calls. |
| Hosted CI | All four PR matrix jobs in `41372073094`, fast run `41372073095`, and push matrix `41372068412` **PASS**. Final-document checks and merge status are recorded by the final report/PR. |
| Enabled staging | Worker version `4b726ec9-4389-4ba8-ada3-5758a3889c27`; artifact SHA-256 `97a0457b78e113c058ae8da3d3a6a54fcd93c2b35d1dd1781316c41001ac10a6`; `MCP_ENABLED=true`, owner-only access. |

The current isolated Windows clone is
`C:\Tools\Dev\MTerm-CLI\artifacts\worktrees\remote-mcp-20261102`.
Retained logs and the final exact-source results are indexed in the final sprint
report. Earlier `full-tests-canonical-green-20261102.log` and package logs remain
historical checkpoints. Codex 0.160.1 in `artifacts/ci-codex` passed managed
registration. Do not repeat completed gates or redeploy unchanged code merely to
resume this handoff.

Use [REMOTE_MCP.md](REMOTE_MCP.md) for owner commands,
[the final live report](validation/2026-11-02-remote-staging-smoke-final.json) for exact
claims, and [deployment/MTERM_STAGING.md](deployment/MTERM_STAGING.md) for resource
IDs, pause and rollback. Final run ID:
`2026-11-02T01-23-39-600Z-a0b41954-29c8-4163-b93f-a04a5c64b6a6`.
The earlier `305c89c` smoke remains historical evidence. The MCP endpoint is
<https://mcp-staging.m-techlabs.com/mcp>; private approval uses
<https://mterm-staging.m-techlabs.com>.

Remote tools are `mterm_list_devices`, `mterm_read_file`, `mterm_file_info`,
`mterm_list_directory`, `mterm_search_files` and `mterm_search_content`. The agent
polls outbound HTTPS in the foreground, uses an immutable selected root and
`FileService` with writes disabled, and stores protected credentials outside that
root. No autostart, inbound listener, remote write or process execution is enabled.
Requests expire after at most 20 seconds; reads are capped at 65,536 bytes, results
at 262,144 bytes and frames at 300,000 bytes.

### Preserve the recovery checkpoint

The original `C:\Tools\Dev\MTerm-CLI` checkout remains untouched. Its eight
modified and three new files were recovered through an isolated branch. Do not
reset, clean or use the primary checkout as a disposable verification runner.
The [preservation report](validation/2026-11-02-primary-preservation.json) confirms
the primary eleven files and two other worktrees remained checksum-unchanged.

```text
C:\Tools\Dev\MTerm-CLI\artifacts\checkpoints\remote-sprint-2026-11-02T00-11-45-504Z
all-refs.bundle SHA-256:
0a54c68385246385b569c24f6455e49efb60fe16eb282b5ff967b49034f14cbb
manifest SHA-256:
0a5ab4011bad9b94b8d1d08b41a87d00d4ac18188ccfefca9ed4cd102d619c60
```

Next: consult the final report/PR for delivery and checkpoint status, then help the
owner complete Google sign-in, explicit pairing and ChatGPT consent. Keep state
outside a small selected root and start the agent in the foreground. Continue
unaccepted parity issues without repeating completed deployment work.
[execution/NEXT_PARITY_PROMPT.md](execution/NEXT_PARITY_PROMPT.md) is
the self-contained continuation; [TESTING.md](TESTING.md) lists the gates.

## Historical foundation — 2026-10-05

The following anchors and results describe that earlier checkpoint, not the
current branch or final qualification.

Then-active checkout: C:/Tools/Dev/MTerm-CLI.
Then-active branch: feat/codex-parity-foundation-20261005; PR #52 was open.
Code checkpoint:6431dd71db6775c480086f944a77c0d42d6c3a0e.
Base main:5c4588be3afe36ee11951a73c84a023656fe6fec.
GUI and archived legacy repositories are unchanged. Exclude access-check/* and recovery-only refs.

Read AGENTS.md, STATUS.md, DESKTOP_COMMANDER_CODEX_PARITY.md, CODEX_REGISTRATION.md,
parity/README.md, SECURITY.md, roadmap/METRICS.md, validation/2026-10-05-codex-parity-foundation.md,
and execution/NEXT_PARITY_PROMPT.md. Fetch current refs; never reset to stale main over this branch.

## Proven work

Managed setup codex --apply and remove codex --apply use exact owned stanzas, backups,
conflict checks and actual Codex generation/parsing in temporary homes. Default setup/remove is
preview. No user auth/model call was used. Preserve these controls during later config integration.

Optional --compat-desktop-commander exposes8 real text/file aliases on the existing root-scoped,
versioned FileService. It does not advertise unimplemented tools. Supported text-read output matches
36 fixtures from the pinned inspected TextFileHandler. Other format and safety differences remain
explicit, not silently counted as parity. Real npm-exec packaged MCP exercised all8 aliases.

64 tests passed plus normal build/check/parity, packed-install/link, actual Codex0.160.1 managed
registration and2 SDK sessions using the parsed command. Use supported Node24; this workstation's
known-good runtime is artifacts/toolchain/node-v24.21.0-win-x64. Other checkouts need installed Node.

## Build review contract

Update affected metrics/evidence deliberately, then:
node scripts/roadmap.mjs --review --change YOUR_CHANGE_ID
node scripts/roadmap.mjs --render
npm run build
npm run check
node scripts/verify-package.mjs
node scripts/verify-managed-codex.mjs
npm run parity:probe  # explicit network; never updates the target

Known UTF-8 text hashes normalize CRLF/LF; binaries and real content edits stay strict. Do not
restore the old byte-mismatched review or disable the freshness gate. build:code is for red/green
iterations only, never a substitute for final build/check/prepack. Package lock/shrinkwrap must match.

## Hosted gate correction — inspected 2026-11-02

GitHub content/workflow writes and normal pushes are verified now; earlier safety-denial notes are
historical. Reinspection on 2026-11-02 of run 39166671238 found real canonical-path test failures
on Windows/macOS and bin executable-mode drift on Linux. Do not change billing, protections or
credentials. The final code matrix now passes on all four runners; consult the final
report/PR for merge status. That result does not close full product/platform acceptance.

## Remaining Codex parity work

1. Inspect the latest PR head and issue evidence, preserve checkpoint, rerun local gates.
2. Qualify the recovered configuration contracts DCP-009..016 and multi-root model, completing
   missing acceptance while retaining owner capability ceilings and explicit safety differences.
3. Finish file-format/read/edit/list/move compatibility with exact schemas and installed tests.
4. Add asynchronous ripgrep/search sessions and process compatibility using existing native
   services as a base, not a wholesale rewrite. Preserve cancellation/output bounds and identities.
5. Complete packed Codex lifecycle and required actual-platform validation; close issues only with
   committed accepted evidence. Keep all26 tool contracts and all48 DCP issues visible.

Recovery before this pass: artifacts/parity-execution-20261005T200426Z/before.bundle and
before-source.zip. Earlier interrupted source and checkpoints remain intact. Final checkpoints
are additive under artifacts/checkpoints/. Do not delete user files or the archived legacy source.

## 2026-10-18 HAR and automation continuation

The owner supplied a private `mcp.desktopcommander.app.har` (251 requests, 4 pages). Its sanitized feature audit was already present in PR #67; a second structural review confirmed no additional **observed mandatory** remote feature beyond WEB-001..012. A remote MCP tool invocation was not captured. Do not place the raw HAR, tokens, billing URLs or proprietary frontend bundle in Git.

The current branch adds the root `Install-MTermCLI.ps1` facade:
- `-Mode Plan` (default): harmless setup preview;
- `-Mode Install -Apply` or `-Mode Repair -Apply`: run the existing pinned build/check and owner-tracked Codex setup;
- `-Mode Verify`: read-only local readiness JSON (`-FullTests` optionally runs project checks);
- `-Mode Sprint`: preview one GitHub issue; only `-Execute` invokes Codex.

Direct sprint scripts now default to a pinned current HEAD rather than outdated `origin/main`; execution refuses dirty worktrees. These convenience improvements do NOT certify an authenticated Cloudflare gateway or the full DCP 48-gap gate. Read `docs/validation/2026-10-18-automated-setup.md` and `docs/ai/changes/2026-10-18-automated-setup.json` for test evidence and exact limitations.

At that historical checkpoint, original `C:\Tools\Dev\MTerm-CLI` configuration work (eight modified and three untracked files) remained preserved untouched. Development occurred in the separate `artifacts/worktrees/har-automation-20261016` worktree on PR #67, stacked atop PR #52. That pass did not change live user Codex configuration, login, model prompts, Cloudflare DNS or public endpoints. The 2026-11-02 integration and deployed staging evidence above supersede its remote-readiness and billing-only observations.

The user narrowed the replacement requirement to 100% DesktopCommanderMCP parity for Codex. Baseline is 0.2.52 / c774c3b505de990219637ecdc9a830c8772fae9d. Epic #2 indexes DCP-001 through DCP-048 (#3-#50). Work those issues independently; do not close the epic or claim PASS until all 48 are accepted. Claude-only preview UI and the Remote Device/Web relay are outside this Codex parity gate. Use docs/execution/DESKTOP_COMMANDER_100_PASS_PROMPT.md for the next full execution pass.

## Orchestration preparation (2026-10-21; historical)
The docs/ORCHESTRATION.md and docs/GITHUB_ORCHESTRATION_SETUP.md files define AO project setup, worker ownership, bounded verification and GitHub policy. The primary checkout has unpublished edits and must not be reset. The AO Codex hook pilot remains unverified; do not start automated issue intake or a worker fleet or disturb unrelated MJobs processes. PR #52/#67 source is now integrated on the feature branch, while final main/PR/hosted-gate status must still be verified.

## 2026-11-02 foundation integration

The isolated `fix/remote-foundation-20261102` branch combines PR #67 head
`b093a00755296c64d37f1d430c5dde3dfd992f08` and verified main
`335cf59455aa3d382081b46a5d91b41556a61057` through a normal merge.
Both PR histories, automation modules, and orchestration guidance are retained.
No feature acceptance credit is awarded by reconciliation. The original Windows
checkout and its unpublished changes remain untouched; recovery and CI repairs
were integrated as separate commits. Final delivery and recovery-checkpoint state
are recorded in the final sprint report and PR #69.

### Recovered configuration work

The isolated recovery checkpoint recovered the eleven unpublished source/test files exactly
from the verified Windows backup. It adds owner-bounded compatibility preferences,
multiple roots and per-request config snapshots. The later Windows suite is green;
complete requirement acceptance and hosted qualification remain separate gates.
DCP-009..016 are not closed by recovery alone. Original file attribution is
retained and SHA-256 values are recorded in the recovery change record.

### Portability repair candidate

Focused tests reproduced the startup-root alias failure before the fix and pass afterward.
The repair only maps owner-selected root spellings to fixed canonical roots and retains nested
link/private-component denial. Cwd/npm assertions now compare real filesystem paths; the npm
bin is tracked executable to avoid package/link mode drift. The later canonical-leaf repair
and final Windows, package, managed Codex and hosted matrix results are recorded
above. See the foundation-portability change record for historical evidence and
the final sprint report/PR for delivery status.
