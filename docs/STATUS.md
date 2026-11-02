# MTerm-CLI current status — 2026-10-05

**DesktopCommander Codex parity:0/48 accepted gaps, NOT PASS.** The pinned authority remains
DesktopCommanderMCP0.2.52 /c774c3b505de990219637ecdc9a830c8772fae9d. Implementation progress is
not the same as accepted full parity. All48 DCP issues are still open.

Current work: branch feat/codex-parity-foundation-20261005, PR #52 (unmerged). Code checkpoint
6431dd71db6775c480086f944a77c0d42d6c3a0e, based on main5c4588be3afe36ee11951a73c84a023656fe6fec.
Fetch current refs before resuming; follow-up evidence/roadmap commits may advance the PR head.

Implemented: existing scoped native MCP file/search/process/Git services; now managed Codex
setup/removal with backups and idempotence,8 optional real DesktopCommander text/file aliases,
upstream differential read tests, snapshot/drift/PASS validation, portable npm resolution and
real offline npm-exec MCP packaged verification. Node24.21.0 Windows x64:64 tests passed, no skips.
Actual Codex0.160.1 parsed isolated configuration and the registered executable passed2 SDK sessions
from a fresh installed package. No Codex model call or real user config/auth mutation occurred.

Hosted workflow writes now work. Jobs are blocked before execution by GitHub billing/spending-limit
annotations; no Windows/Linux/macOS hosted PASS or protected merge is claimed. PR #52 preserves
work without bypassing that gate. GUI and legacy repositories remain unchanged.

Missing: full26 upstream tool contracts, multiple-root/dynamic config, search sessions, process
aliases/PTY/system processes, image/office/PDF behavior, fuzzy editing, full history/prompts,
managed updates, Web/quota extras and cross-platform/release qualification. The optional8 aliases
are a tested subset, not8 fully closed parity issues. See validation/2026-10-05-codex-parity-foundation.md.

## Automated CLI setup update — 2026-10-18

The current PR #67 worktree adds `Install-MTermCLI.ps1` as a single visible Plan/Install/Repair/Verify/Sprint entry point inspired by MJobs' starter and DevFleet's staged setup discipline. All privileged operations remain opt-in and delegated to the existing owner-tracked setup/sprint modules. Root-launcher preview/readiness tests pass locally; inspect the latest verification report for full current gates.

This is local Codex stdio usability work only. The Cloudflare remote gateway, device supervision, user portal and real remote MCP round trip remain WEB-001..012 **0/12 — NOT PASS**. The independent DesktopCommander Codex gate remains **0/48 — NOT PASS** until accepted issue evidence exists.
