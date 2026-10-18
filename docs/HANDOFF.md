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
historical. Current Actions jobs fail before steps because the account's payment/spending-limit gate
prevents execution. Do not change billing, org protection or credentials; do not rerun indefinitely.
PR #52 remains unmerged pending valid checks/owner resolution. No macOS/Linux support claim.

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
