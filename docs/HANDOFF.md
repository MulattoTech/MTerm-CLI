# MTerm-CLI handoff — 2026-10-05 parity implementation

Active checkout: C:/Tools/Dev/MTerm-CLI.
Active branch: feat/codex-parity-foundation-20261005. PR #52 is open, not merged.
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

## Blocked hosted gate

GitHub content/workflow writes and normal pushes are verified now; earlier safety-denial notes are
historical. Reinspection on 2026-11-02 of run 39166671238 found real canonical-path test failures
on Windows/macOS and bin executable-mode drift on Linux. Do not change billing, protections or
credentials. PR #52 remains unmerged pending valid checks; no full-platform support claim.

## Next work

1. Inspect the latest PR head and issue evidence, preserve checkpoint, rerun local gates.
2. Implement configuration contracts DCP-009..016 and multi-root model, respecting capability
   ceilings and explicit safety differences rather than letting an agent widen its own authority.
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

Original `C:\Tools\Dev\MTerm-CLI` configuration work (eight modified and three untracked files) remains preserved untouched. Development occurred in the separate `artifacts/worktrees/har-automation-20261016` worktree on PR #67, stacked atop PR #52. GitHub Actions billing/spending qualification may still block hosted checks. No live user Codex configuration, login, model prompt, Cloudflare DNS, or public endpoint was changed.

The user narrowed the replacement requirement to 100% DesktopCommanderMCP parity for Codex. Baseline is 0.2.52 / c774c3b505de990219637ecdc9a830c8772fae9d. Epic #2 indexes DCP-001 through DCP-048 (#3-#50). Work those issues independently; do not close the epic or claim PASS until all 48 are accepted. Claude-only preview UI and the Remote Device/Web relay are outside this Codex parity gate. Use docs/execution/DESKTOP_COMMANDER_100_PASS_PROMPT.md for the next full execution pass.

## Current orchestration preparation (2026-10-21)
The docs/ORCHESTRATION.md and docs/GITHUB_ORCHESTRATION_SETUP.md files define AO project setup, worker ownership, bounded verification and GitHub policy. The primary checkout has unpublished edits and must not be reset. AO Codex hook diagnostics and hosted platform path tests currently fail; do not call autopilot production-ready. PR #52 and stacked PR #67 are open; their source is not in main.

## 2026-11-02 foundation integration

The isolated `fix/remote-foundation-20261102` branch combines PR #67 head
`b093a00755296c64d37f1d430c5dde3dfd992f08` and verified main
`335cf59455aa3d382081b46a5d91b41556a61057` through a normal merge.
Both PR histories, automation modules, and orchestration guidance are retained.
No feature acceptance credit is awarded by reconciliation. The original Windows
checkout and its unpublished changes remain untouched; recovery and CI repair follow
as separate commits.

### Recovered configuration work

The next isolated checkpoint recovers the eleven unpublished source/test files exactly
from the verified Windows backup. It adds owner-bounded compatibility preferences,
multiple roots and per-request config snapshots. Runtime qualification is pending;
DCP-009..016 and all other parity issues remain open. Original file attribution is
retained and SHA-256 values are recorded in the recovery change record.

### Portability repair candidate

Focused tests reproduced the startup-root alias failure before the fix and pass afterward.
The repair only maps owner-selected root spellings to fixed canonical roots and retains nested
link/private-component denial. Cwd/npm assertions now compare real filesystem paths; the npm
bin is tracked executable to avoid package/link mode drift. Full Windows and hosted matrix
validation are pending. See the foundation-portability change record for exact evidence.
