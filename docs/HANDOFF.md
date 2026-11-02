# MTerm-CLI handoff — 2026-11-02 remote MCP staging

The private read-only remote preview has completed a real Windows-to-Cloudflare
MCP smoke test. **Staging MCP is currently paused (`MCP_ENABLED=false`) while final
qualification and deployment are completed.** Human Google sign-in and a human
ChatGPT connector session remain unverified. This is not a production release or
a complete RDC replacement.

## Current state — 2026-11-02

| Area | Observed result |
| --- | --- |
| Source | PR #52 and stacked PR #67 source, main baseline `335cf59455aa3d382081b46a5d91b41556a61057`, and all eleven recovered unpublished files are integrated on `feat/remote-mcp-readonly-20261102`. Final PR/merge/main status remains pending. |
| Real deployed smoke | **11/11 passed** at source `305c89c88a10f4c9243096e3d1125bde76f17563`, using Windows Node 24.21.0 and official MCP SDK 2.3.0. Two independent DPAPI-protected agents served real fixture-file reads through Cloudflare. |
| Identity and cleanup | The smoke used a temporary Access service principal with S256 PKCE and a consent exchange. Both synthetic devices and grants were revoked, agents stopped, SDK closed, and only created local fixtures removed. Human Google/ChatGPT acceptance and final temporary infrastructure-access cleanup remain separate pending checks. |
| Windows RED | The earlier full run passed 143/144 groups and exposed one real canonical-leaf/Windows 8.3 guard defect. It was not waived. |
| Windows GREEN | The repaired tree passed **33/33 focused tests** and then **149/149 full tests**, with no skips or cancellations; full duration 33,685 ms on Node 24.21.0. Five native 8.3 cases ran. |
| Fix provenance | Canonical-leaf worker fix `28ff573c407a588489abe9545cdaf18a8af7b6b3` is integrated as `bbf1d0e9b75cf153243a4722ad1ab91392445540`; Windows fixture quoting/format is committed as `14971ac`. The Windows-tested bytes match that combination. Codex bounded rename repair is `2cb2f07`. |
| Package gate | **PASS**, 10.57 seconds on the same repaired source: real pack/install, offline exec, isolated npm link, actual MCP read/write and all eight compatibility aliases. Archive 54,173 bytes; unpacked payload 212,719 bytes; production dependencies 14,160,089 bytes. No global install or model call. |
| Remaining gates | Final reviewed HEAD, normal build/check, managed Codex verification, new staged artifact, PR/hosted platform CI, permitted merge/main verification and infrastructure cleanup are pending. |

The current isolated Windows clone is
`C:\Tools\Dev\MTerm-CLI\artifacts\worktrees\remote-mcp-20261102`.
Its full-suite log is `artifacts/full-tests-canonical-green-20261102.log`.
Package evidence is `artifacts/package-gate-canonical-20261102.log` and
`artifacts/package-verify-8SfTVE/result.json`.
Codex 0.160.1 was installed in that clone's `artifacts/ci-codex`; its managed
registration gate is still pending. Do not rerun an active gate without first
checking its retained output and exit status.

Use [REMOTE_MCP.md](REMOTE_MCP.md) for owner commands,
[the live smoke report](validation/2026-11-02-remote-staging-smoke.json) for exact
claims, and [deployment/MTERM_STAGING.md](deployment/MTERM_STAGING.md) for resource
IDs, pause and rollback. The smoke source precedes the final alias repair; it does
not certify an untested later deployment. The MCP endpoint is
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

```text
C:\Tools\Dev\MTerm-CLI\artifacts\checkpoints\remote-sprint-2026-11-02T00-11-45-504Z
all-refs.bundle SHA-256:
0a54c68385246385b569c24f6455e49efb60fe16eb282b5ff967b49034f14cbb
manifest SHA-256:
0a5ab4011bad9b94b8d1d08b41a87d00d4ac18188ccfefca9ed4cd102d619c60
```

Next: collect the remaining existing gate results, finalize exact-head evidence
and roadmap review, deploy only the qualified artifact, confirm staged cleanup,
then publish and inspect the real PR/CI/merge state. Keep MCP paused until the
qualified replacement is ready. Do not infer main changed or human authorization
completed. [execution/NEXT_PARITY_PROMPT.md](execution/NEXT_PARITY_PROMPT.md) is
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
credentials. Final PR/merge and new hosted results remain pending; no full-platform support claim.

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
were integrated as separate commits, with final delivery still pending.

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
and actual Windows 149/149 and package results are recorded above; hosted matrix and
final reviewed-head validation remain pending. See the foundation-portability change record for historical evidence.
