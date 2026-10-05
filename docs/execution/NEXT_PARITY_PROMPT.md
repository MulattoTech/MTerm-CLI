# MTerm-CLI: continue Codex/DesktopCommander parity from the tested PR

## Execute, do not merely redesign

You are the implementation lead in a ChatGPT Web reasoning session with Remote Desktop Commander
and GitHub connected. Continue actual source work, tests, issue evidence, checkpoints and publication.
The goal remains **100% DesktopCommanderMCP feature parity as consumed by Codex, then 100% - PASS**.
Do not label the current partial preview complete. Produce a new continuation prompt when this
session ends, recording exact current hashes, unfinished tasks and the first unverified action.

## Current authority and recovery

- Repository: https://github.com/MulattoTech/MTerm-CLI
- Local working checkout: `C:\Tools\Dev\MTerm-CLI`
- Active implementation branch: `feat/codex-parity-foundation-20261005`
- Open implementation PR: https://github.com/MulattoTech/MTerm-CLI/pull/52
- Tested code anchor: `6431dd71db6775c480086f944a77c0d42d6c3a0e`.
- The branch may have later evidence/review commits. Fetch and verify the actual PR head; do not
  reset to this anchor or overwrite newer work.
- Main baseline: `5c4588be3afe36ee11951a73c84a023656fe6fec`. Main is publication authority only after
  a permitted verified merge. The latest implementation is on PR #52, not necessarily on main.
- Pre-execution recovery: `artifacts/parity-execution-20261005T200426Z/before.bundle` and
  `before-source.zip`. Final additive checkpoints are under `artifacts/checkpoints/`.
- MTerm-GUI and the archived original MTerm repository are separate; do not modify or delete them.
- Never merge `access-check/*` or local recovery-only branches into product history.

The parity target is unchanged: `wonderwhy-er/DesktopCommanderMCP` version `0.2.52`, commit
`c774c3b505de990219637ecdc9a830c8772fae9d`. Upstream main matched this pin in the preceding session.
Epic #2 indexes DCP-001 through DCP-048, issues #3 through #50. All 48 remain open pending their
complete acceptance. This is not evidence that nothing works: partial implementation is documented
separately. Do not close an issue because a similar native MTerm tool exists.

## First actions

Discover the tool schemas actually available now. Do not use obsolete `functions.exec`, imagined
agents, stale namespace assumptions or the analysis container as if it were the Windows workstation.
RDC process calls may return after three seconds: poll or read the retained log and inspect its
real exit code before proceeding. Use Windows/PowerShell syntax on the authorized machine.

Read current `AGENTS.md`, `CONTRIBUTING.md`, `docs/HANDOFF.md`, `docs/STATUS.md`,
`docs/DESKTOP_COMMANDER_CODEX_PARITY.md`, `docs/roadmap/METRICS.md`,
`docs/CODEX_REGISTRATION.md`, `docs/parity/README.md`,
`docs/validation/2026-10-05-codex-parity-foundation.md`, and this prompt.

Verify local Git status/worktrees/running task-owned processes, fetch without pruning, inspect PR
#52, and reconcile its latest tree with the checkout. Preserve dirty work and create a new verified
bundle/source checkpoint. Revalidate local create/read/rename and GitHub capabilities with minimal
isolated probes only when fresh evidence is necessary. Existing product writes are also evidence.

Query every DCP issue and compare the actual issue state with the parity JSON. Keep one closeable
issue per requirement. Do not assume an open issue is implemented or a closed issue is accepted
without reading its evidence. Inspect published branches for unique product work, not blanket merges.

## Important current blocker: hosted CI cannot start

The new `.github/workflows/cli-ci.yml` is installed and triggers. GitHub job annotations report that
recent account payments failed or the spending limit must increase. Jobs fail before steps; no
Windows/Linux/macOS execution result exists. Example run: 37371008610; example check: 111969650545.
The annotations were retained under `artifacts/parity-execution-20261005T200426Z/`.

Do not change billing, payment details, repository visibility, OAuth scopes or branch protection.
Do not repeatedly rerun a known account-blocked workflow. Report the required owner action once.
If the owner has resolved it, inspect a new actual run; do not assume resolution from elapsed time.
Do not merge around a failed required gate or call local Windows tests hosted-platform certification.
Continue safe implementation and local verification while the owner handles that external blocker.

## What already works: preserve it

The preceding local gate passed 64 tests with zero failures/skips on Windows x64, Node24.21.0.
The actual installed Codex was 0.160.1. Recheck those versions before new claims.

1. The original scoped `mterm_*` files/search/process/Git/doctor/config/launcher services remain.
2. `setup codex` previews. Explicit `setup codex --apply` now creates an owned backed-up MCP stanza;
   `remove codex --apply` removes only the exact owned block. Same-plan apply/remove are idempotent.
   Unrelated comments, CRLF, other servers and later additions survive. Edited/unowned/linked config
   fails closed. Scope changes require deliberate remove/reconfigure. Tests never touch real auth.
3. Real Codex generates/parses the staged TOML in an isolated home. An official SDK client then
   launches the command parsed by Codex twice and exercises it. The same proof passed from a real
   installed tarball. This does NOT prove a real Codex agent/model invoked every compatibility tool.
4. Optional `--compat-desktop-commander` advertises eight implemented file/text aliases:
   `read_file`, `read_multiple_files`, `list_directory`, `get_file_info`, and, with --allow-write,
   `write_file`, `create_directory`, `move_file`, `edit_block`.
   Four read-only aliases and eight with writes are intentional. Native MTerm names remain; their
   combined count must not be reported as the 26 upstream tools. No stub `write_pdf` is advertised.
5. Text reads match 36 cases from the exact pinned TextFileHandler: LF/CRLF, empty files,
   Unicode/BOM, zero length, positive offsets/EOF and negative tails ignoring length.
6. Text append/rewrite uses explicit replacement intent and version-checked storage, preserving BOM.
   Nested directory creation prevalidates the entire path and is idempotent. Recursive listing is
   bounded. Exact edits verify the expected match count and treat replacement strings literally.
7. A real `npm exec` from the packed tarball exercised all eight aliases over MCP outside the source
   checkout. Isolated-prefix npm link and installed Windows shim also passed.
8. Known text fingerprints normalize CRLF/LF after reproducing the inherited clean-checkout failure.
   Binary bytes and actual source changes remain strict. Do not disable review checks.
9. Read-only MIT upstream snapshots and an explicit drift detector verify the pinned manifest/schema.
   A drift probe reports new upstream commits but never rewrites the approved baseline.

Key modules: `src/codex-registration.ts`, `src/desktop-commander-files.ts`, `src/files.ts`,
`src/policy.ts`, `src/mcp.ts`, `scripts/parity-baseline.mjs`, `scripts/npm-runtime.mjs`,
`scripts/verify-package.mjs`, `scripts/verify-compatibility-installed.mjs`,
`scripts/verify-managed-codex.mjs` and their tests.

## Do not mistake the aliases for finished parity

Read_file is currently bounded UTF-8 text, not URL/image/Excel/PDF/DOCX or huge-file/UTF-16 parity.
Multi-file handling is text-only. Write warnings are not yet dynamic upstream configuration.
List-directory has additional caps and differs in overflow/error behavior. Move-file handles only
same-filesystem regular files without overwrite, not directories/cross-device moves.
Get-file-info lacks full office metadata. Edit-block supports exact matches, not fuzzy diagnostics,
normalized matching or office/XML edits. URL/origin-ui/format-specific requests fail explicitly.

The full `get_config` / `set_config_value` / multi-root / blocked-command / shell / dynamic-limit
configuration model, asynchronous ripgrep sessions, compatible shell/process tools, system process
inventory/termination, history/usage/prompts and format adapters remain real work.

## Next implementation sequence

### A. Requalify and review the existing foundation

Run fresh normal gates and packaged tests. Audit managed configuration failure recovery, ownership,
permissions and concurrent writers. The lock is cooperative; compare-before-rename is not an OS-wide
transaction against writers ignoring it. Windows chmod is not an ACL-hardening proof. Preserve
fail-closed behavior and leave any unresolved contract difference recorded against its issue.

### B. Configuration first: DCP-009 through DCP-016

Inspect exact pinned config manager, handlers, schemas and tests. Implement effective config,
validated persistence, multiple allowed roots, configured shell, blocked commands, file line limits,
telemetry opt-out semantics and cross-process reload. Integrate all affected existing tools rather
than just adding two dictionary-returning RPCs.

A requesting model must not gain authority merely by changing its own config. Separate owner-
configured capability ceilings from runtime preferences. Never turn an empty root list into silent
whole-machine access. Where safety changes observable upstream semantics, record the difference,
request the precise owner ruling when required, and leave the parity issue open rather than fake it.
Do not add upstream telemetry collection or send private history to an upstream vendor for parity.

### C. Complete file and editing contracts

Extend the existing compatibility adapter, not a duplicate filesystem implementation. Add large-file
streamed ranges, formats/images, exact output/error/schema behavior, directory/cross-device moves,
metadata, fuzzy diagnostics and dynamic limits. Compare against the pinned implementation using
controlled fixtures. Document handler/dependency costs; do not import heavyweight PDF/browser code
into help, ordinary text reads or MCP startup. Scope and bound URL fetching and avoid credential
forwarding or unrestricted private-network access through a new read tool.

### D. Search and processes

Implement DCP-029..033 as real asynchronous bounded search sessions, pagination/cancellation/history
and reviewed ripgrep option mappings. Implement DCP-034..043 through owned process/session services:
shell selection, background timeout/readiness, input/prompt waits, line/tail output, terminal encodings,
force-terminate versus explicitly authorized system kill, and platform-specific interactive behavior.
Keep PID/run identity, output bounds and cleanup accurate. Do not kill unrelated processes in tests.

### E. Observability, documents and final qualification

Complete every remaining published tool and acceptance case. Distinguish local usage statistics from
Codex account quota. Preserve original licenses and modified-source attribution. Office/PDF helpers
must work through installed tools; library presence is not acceptance. Keep GUI and hosted Web relay
out of the Codex parity gate unless a specific exposed Codex behavior actually requires them.

Use the existing DCP ledger for all 48 items. Dependencies may reorder work, but scope must not vanish.

## Per-issue proof contract

Read the exact pinned handler/schema and relevant tests. Write and observe a failing regression,
implement, run targeted and full tests, then repeat representative cases through the packed installed
MCP server. Add actual supported Codex-client evidence where applicable, in a synthetic CODEX_HOME.
No real model/API calls or authentication experiments without explicit owner authorization.

Record upstream paths, defaults, side effects, errors, output shape, limits and platform behavior.
Use auditable differential fixtures where safe. Never execute the entire upstream server/bootstrap
merely to inspect a handler: it may initialize telemetry, browsers or other side effects. The current
text fixture verifies source hashes and executes only the reviewed filesystem-only handler after
Node type erasure; do not weaken that boundary.

Update the corresponding GitHub issue with the exact implementation commit and evidence. A partial
Windows result may advance a reviewed implementation stage but does not close a full parity issue.
Preserve one independently closeable issue per real gap; add newly discovered gaps explicitly.

## Commands and repeatable gates

```powershell
cd C:\Tools\Dev\MTerm-CLI
# Select the already-verified project-local Node24 only when this path exists.
$env:PATH="$PWD\artifacts\toolchain\node-v24.21.0-win-x64;$env:PATH"
node --version
npm run build
npm run check
node scripts/verify-package.mjs
node scripts/verify-managed-codex.mjs
node scripts/verify-self-host.mjs
npm run parity:probe
```

Use `npm run build:code` only during deliberate RED/GREEN development, not as a final gate bypass.
For actual installed registration proof, set MTERM_VERIFY_BIN to the installed bin reported by the
package verifier, run verify-managed-codex, then clear only that test-owned environment variable.
Run normal `npm pack` including prepack, inspect the payload, and validate a new source extraction
so ignored build output or line endings cannot conceal a clean-checkout defect.

Known installed production footprint was approximately14.07MB excluding external Node/Codex and
unimplemented Web/quota components. Re-measure new artifacts. Never relabel a reuse profile as a
self-contained under50MB bundle or external help-start timing as remote inference speed.

## Governance, publication and stopping safely

Keep two measurements: broad 300-item reviewed product maturity and the independent 48-issue parity
acceptance gate. Preserve IDs, text, baseline weights and exclusions. Stage credit is 0/10/40/65/85/100
with evidence, not inferred from file counts. Blockers remain visible; ETA stays Unscheduled without
an owner/capacity/dependency schedule. Rendering must not silently grant approval or completion.

Every changed source set requires its own truthful AI/human change record, exact model or unknown,
UTC/base/paths/tests/limitations and roadmap_updates. After explicit assessment:

```text
node scripts/roadmap.mjs --review --change YOUR_CHANGE_ID
node scripts/roadmap.mjs --render
npm run build
npm run check
```

Push coherent tested commits normally, inspect PR diffs/checks and use expected-head merge protection
only after acceptable verification. Do not force-push, reset/clean user work, delete source/checkpoints,
weaken protections, bypass failed checks, or manufacture a release tag. Reconcile actual newer main
with current work rather than discarding one side. If hosted gates remain blocked, publish branch/PR
and a precise blocker report; do not claim main changed.

Full PASS requires all48 accepted issues (or an explicitly reviewed expanded scope), all26 published
Codex-facing contracts, clean npm install/exec/remove, actual Codex-managed startup/restart/shutdown,
Windows/macOS/Linux evidence, security/license/package gates and a verified merged main tree. Missing
account-bound/platform evidence stays missing. Weighted maturity or8 aliases is not full parity.

Before this session ends, checkpoint source/history with hashes, report actual local/remote/PR/main
SHAs, tests and unresolved differences, and generate the next execution prompt. Keep that prompt
inside the repo and provide a downloadable copy. Start now with current-state verification and work
through the next testable dependency rather than re-scaffolding the already functioning preview.
