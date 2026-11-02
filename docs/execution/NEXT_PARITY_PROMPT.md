# MTerm-CLI: owner remote setup and remaining Codex parity

**Handoff date: 2026-11-02.** These are observed checkpoints, not authority to
overwrite newer work. Re-read current HEAD, retained logs, PRs and deployed state.

The [final sprint report](../validation/2026-11-02-remote-sprint.md) and
[PR #69](https://github.com/MulattoTech/MTerm-CLI/pull/69) are authoritative for
final merge/main, document checks and the post-merge recovery checkpoint.

## Execute, do not merely redesign

You are the implementation lead with Remote Desktop Commander, GitHub and
Cloudflare available as authorized. The read-only remote staging implementation,
Windows/package/managed Codex gates, hosted matrix, final deployment smoke and
temporary-access cleanup are complete. Continue with owner Google sign-in,
explicit device pairing and ChatGPT consent, then the remaining parity issues.
Do not recreate the relay, repeat completed deployment gates without cause or
discard recovered source. The separate long-term target
remains **100% DesktopCommanderMCP parity as consumed by Codex, then 100% - PASS**.
A remote smoke or Windows suite does not establish that broader acceptance.

## Completed evidence and remaining human acceptance

- Deployed smoke: **11/11 PASS** at source
  `b90432a1bc138d59305692a9f74f110a475d0881`, with official MCP SDK 2.3.0,
  Windows Node 24.21.0 and two real DPAPI-protected foreground fixture agents.
  The SDK read both independent fixtures through Cloudflare; pairing, permission
  denial, device isolation and device/grant revocation were exercised.
- The identity was a **temporary Cloudflare Access service principal**. Manual
  S256 PKCE/consent exchange and SDK transport passed. Human Google login, human
  browser consent/callback and ChatGPT connector use remain unverified.
- Both synthetic devices/grants were revoked, agents stopped, SDK closed and
  only test-created local fixtures removed. Temporary service policy, token and
  Worker binding were deleted. Owner-only access remains; no persistent owner
  agent is paired. Production was not promoted.
- The first full Windows run was **143/144 PASS with one real RED** in canonical
  leaf/8.3 guard enforcement. Worker repair `28ff573c407a588489abe9545cdaf18a8af7b6b3`
  is integrated as `bbf1d0e9b75cf153243a4722ad1ab91392445540`; Windows fixture
  quoting/format is `14971ac`. The tested Windows bytes match that combination.
- The repair passed **33/33 focused actual Windows tests, no skips**, including
  five native 8.3 cases, then **149/149 full tests, no skips/cancellations**, in
  32,829 ms in the final code run. The final full Windows build/check/package/
  managed Codex workflow passed in **55.35 seconds**. Native Codex 0.160.1 parsed
  isolated registration and launched two MCP sessions without user config/auth
  changes or model calls. The final report indexes the retained logs.
- Codex journal repair `2cb2f07` retries only Windows EPERM/EBUSY, with bounded
  delays, expected-snapshot comparison on every attempt and owned-temp cleanup.
- The final-code **package gate passed**: real pack/install,
  offline exec, isolated npm link, actual MCP read/write and all eight local
  compatibility aliases. Archive 55,636 bytes, unpacked payload 216,577 bytes,
  installed production footprint 14,163,947 bytes.
- All four PR matrix jobs in **41372073094 PASS**; fast **41372073095 PASS**;
  push matrix **41372068412 PASS**. Final document/merge status belongs to the
  final sprint report and PR state, not an assumed stale pending/merged label.
- **Staging MCP is enabled (`MCP_ENABLED=true`)** on Worker version
  `af4fd06e-c4a3-4545-ad22-31d0ae956215`, artifact SHA-256
  `97a0457b78e113c058ae8da3d3a6a54fcd93c2b35d1dd1781316c41001ac10a6`.

Read `docs/validation/2026-11-02-remote-staging-smoke-final.json` for the sanitized live
report, `docs/REMOTE_MCP.md` for owner setup and `docs/deployment/MTERM_STAGING.md`
for deployment/recovery. Final run
`2026-11-02T01-23-39-600Z-a0b41954-29c8-4163-b93f-a04a5c64b6a6`
finished 2026-11-02 01:24:29 UTC. The earlier `305c89c` smoke remains historical.

## Current authority and recovery

- Repository: <https://github.com/MulattoTech/MTerm-CLI>.
- Primary Windows checkout: `C:\Tools\Dev\MTerm-CLI`. Its original eight modified
  and three new files remain preserved; all eleven were recovered into the
  integration branch. Do not reset, clean or overwrite the primary checkout.
  `docs/validation/2026-11-02-primary-preservation.json` confirms all eleven files
  and two other worktrees remained checksum-unchanged.
- Active integration branch: `feat/remote-mcp-readonly-20261102`.
- Active ordinary Windows clone:
  `C:\Tools\Dev\MTerm-CLI\artifacts\worktrees\remote-mcp-20261102`.
- Existing scratch integration checkout, if still available:
  `/workspace/scratch/bbdecbfeb154/mterm`. It is not the Windows workstation.
- PR #52 source `1d900464ba8a36a1121e2ae51ea65c14c3ee41c1`, stacked PR #67 source
  `b093a00755296c64d37f1d430c5dde3dfd992f08`, and main baseline
  `335cf59455aa3d382081b46a5d91b41556a61057` are integrated in the feature history.
  Reinspect [PR #52](https://github.com/MulattoTech/MTerm-CLI/pull/52),
  [PR #67](https://github.com/MulattoTech/MTerm-CLI/pull/67) and integration
  [PR #69](https://github.com/MulattoTech/MTerm-CLI/pull/69). Read actual PR state
  and the final report for the delivery SHA before selecting a new work base.
- Additive pre-sprint checkpoint:
  `C:\Tools\Dev\MTerm-CLI\artifacts\checkpoints\remote-sprint-2026-11-02T00-11-45-504Z`.
  `all-refs.bundle` SHA-256:
  `0a54c68385246385b569c24f6455e49efb60fe16eb282b5ff967b49034f14cbb`.
  Recovery manifest SHA-256:
  `0a5ab4011bad9b94b8d1d08b41a87d00d4ac18188ccfefca9ed4cd102d619c60`.
- Earlier recovery under `artifacts/parity-execution-20261005T200426Z/` remains
  useful historical material; do not restore old files over the integrated tree.
- MTerm-GUI and the archived original MTerm repository are separate; do not modify or delete them.
- Never merge `access-check/*` or local recovery-only branches into product history.

The parity target is unchanged: `wonderwhy-er/DesktopCommanderMCP` version `0.2.52`, commit
`c774c3b505de990219637ecdc9a830c8772fae9d`. Upstream main matched this pin in the preceding session.
Epic #2 indexes DCP-001 through DCP-048, issues #3 through #50. All 48 remain open pending their
complete acceptance. This is not evidence that nothing works: partial implementation is documented
separately. Do not close an issue because a similar native MTerm tool exists.

## First actions

Discover the tool schemas actually available now; do not assume old namespace
names or treat the scratch container as the Windows machine. RDC calls may return
before a process finishes: inspect the retained log and actual exit code. Check
existing task-owned processes before launching another long gate. Do not repeat a
stalled child connection or kill unrelated processes. Use Windows/PowerShell on
the authorized machine and keep credentials out of argv, logs and source.

Read current `AGENTS.md`, `CONTRIBUTING.md`, `docs/HANDOFF.md`, `docs/STATUS.md`,
`docs/DESKTOP_COMMANDER_CODEX_PARITY.md`, `docs/roadmap/METRICS.md`,
`docs/CODEX_REGISTRATION.md`, `docs/parity/README.md`,
`docs/validation/2026-10-05-codex-parity-foundation.md`, and this prompt.

Read the final report and existing Windows logs before deciding to rerun tests.
These initial commands are
read-only except the ordinary fetch in the isolated clone:

```powershell
$MTermPrimary = 'C:\Tools\Dev\MTerm-CLI'
$MTermVerifyRoot = "$MTermPrimary\artifacts\worktrees\remote-mcp-20261102"
$MTermNodeBin = "$MTermPrimary\artifacts\toolchain\node-v24.21.0-win-x64"
git -C $MTermPrimary status --short --branch
git -C $MTermPrimary worktree list
Set-Location $MTermVerifyRoot
$env:PATH = "$MTermNodeBin;$env:PATH"
node --version
git status --short --branch
git rev-parse HEAD
Get-Content .\artifacts\full-tests-canonical-green-20261102.log -Tail 30
git fetch origin
git log -8 --oneline
git rev-parse origin/main
Invoke-RestMethod 'https://mcp-staging.m-techlabs.com/health' | Select-Object service, enabled, build
```

Never infer clean state from these historical paths; preserve newer work and
reconcile it. Create additive checkpoints with hashes before substantial source
changes. Verify current GitHub permissions from actual allowed operations; never
bypass a live denial with another token/API. Keep existing AO worktrees and MJobs
processes untouched. Do not start a fleet or automatic issue intake before the
Codex/AO hook pilot is verified.

Query every DCP issue and compare the actual issue state with the parity JSON. Keep one closeable
issue per requirement. Do not assume an open issue is implemented or a closed issue is accepted
without reading its evidence. Inspect published branches for unique product work, not blanket merges.

## Hosted CI: inspect real failures and new exact-head results

The old October billing-only/no-execution description is historical. The
2026-11-02 inspection of run `39166671238` found real canonical-path failures on
Windows/macOS and bin executable-mode drift on Linux. The root-alias and canonical
leaf fixes preserve nested-link/private-file denial; the bin remains executable.
The final Windows result and all four hosted platform jobs are green at `b90432a`.
The first PR matrix found the verifier's npm-alias manifest-name mistake; that
fixture identity check was repaired without weakening product tests. Final PR
matrix `41372073094` and push matrix `41372068412` passed.
Do not weaken tests or freshness checks, bypass failed required checks, change
billing/visibility/scopes/protections or call local Windows proof hosted-platform
certification. Report a current external blocker only from current evidence.

## Staging resources and owner continuation

| Resource | Public identifier |
| --- | --- |
| Gateway / MCP | `https://mcp-staging.m-techlabs.com` / `/mcp` |
| Private dashboard | `https://mterm-staging.m-techlabs.com` |
| Worker | `mterm-gateway-staging` |
| Cloudflare account / zone | `9e18ebcb3c1a920c9ef58a3d61b8d6b6` / `8bd58c3aba1973a88d32ae09ccca9595` |
| Durable Object | `MTermRegistry`, namespace `b66edc2d536e474093e1a18d0e88a24d`, SQLite migration `v1` |
| Access issuer / app | `https://broken-breeze-d0bb.cloudflareaccess.com` / `598ab343-fa9c-40d7-8308-b1fa24b55d81` |
| Access audience | `9533396534dbc90c78bae02791ecdd0fab21f775876ed7164ed3b57bf54e1563` |
| Current Worker version | `af4fd06e-c4a3-4545-ad22-31d0ae956215` |
| Current artifact SHA-256 | `97a0457b78e113c058ae8da3d3a6a54fcd93c2b35d1dd1781316c41001ac10a6` |

1. Read the final report and PR #69 state; select the verified delivered source
   without changing the preserved primary checkout. Do not rerun a completed
   deployment or recreate the removed staging service identity for ordinary use.
2. Help the owner sign in to the private dashboard with the configured Google
   identity. The human completes login and consent. No cookie/token export,
   service-identity substitution or real Codex auth/config changes are needed.
3. Follow `docs/REMOTE_MCP.md`: preview setup with the explicit gateway and
   `--dashboard`, choose a small existing folder, keep protected state outside it,
   apply the reviewed configuration, pair through the displayed code/URL, and
   start the foreground agent. No persistent owner agent exists yet.
4. The owner connects the MCP URL in ChatGPT and completes its consent flow.
   Observe tool discovery, `mterm_list_devices`, a read from the selected device,
   outside-root denial and stop/revoke behavior. Record actual human-client
   evidence separately from the completed SDK/service-principal smoke.
5. Continue independently accepted DCP/WEB requirements from the current ledgers.
   Open one isolated task per real gap and write meaningful RED/GREEN evidence.
   Preserve the read-only remote boundary: no remote write/exec, autostart or
   production promotion is implied by owner pairing.

From the verified built checkout, preview a dedicated owner workspace first
(the folder must already exist). Repeat setup with `--apply` only after the owner
selects that root. Pairing waits for the owner's dashboard approval; run `start`
in its own foreground terminal after successful pairing:

```powershell
node .\bin\mterm-cli.js remote setup --gateway 'https://mcp-staging.m-techlabs.com' --dashboard 'https://mterm-staging.m-techlabs.com' --root 'C:\Tools\Dev\MTerm-RemoteWorkspace' --name 'MulattoTechBox staging' --state-dir "$env:LOCALAPPDATA\MTerm-CLI\remote-staging"
node .\bin\mterm-cli.js remote pair --state-dir "$env:LOCALAPPDATA\MTerm-CLI\remote-staging"
node .\bin\mterm-cli.js remote start --state-dir "$env:LOCALAPPDATA\MTerm-CLI\remote-staging"
```

From another terminal, `remote status --state-dir ... --json` inspects local
state; `remote stop --state-dir ...` requests the owned foreground agent to stop;
`remote revoke --state-dir ...` revokes its device enrollment. The owner guide
contains the complete commands. Never delete stale lock files without diagnosing
the specific owned process and preserving its state.

For immediate pause or rollback, use the complete binding-preserving commands in
`docs/deployment/MTERM_STAGING.md`, supplied only with normal owner-provided
Cloudflare authorization. Settings PATCH uses multipart part `settings`; version
rollback POST uses `strategy: percentage` and a version at 100 percent. An older
version may restore enabled/temporary bindings: keep devices stopped, reapply the
pause and remove test access before restart. Never delete the Durable Object or
invent a token-bearing command. Worker previews/workers.dev remain disabled;
request logging stays off with query redaction enabled.

## What already works: preserve it

The following is historical foundation evidence from 2026-10-05: 64 local tests
passed on Windows Node 24.21.0, with actual Codex 0.160.1. The current 149-test
result above is separate; recheck installed/runtime/package evidence after changes.

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

The recovered `get_config` / `set_config_value` / multi-root foundation is present
but does not by itself satisfy complete configuration parity. Finish the exact
blocked-command/shell/dynamic-limit and persistence contracts. Asynchronous
ripgrep sessions, compatible processes, system process inventory/termination,
history/usage/prompts and format adapters remain separate ledger work.

## Subsequent Codex parity implementation sequence

The deployment gates are complete. Prioritize owner acceptance when available,
and continue remaining parity work without repeating completed setup. Keep WEB
acceptance and DCP acceptance separate.

### A. Requalify and review the existing foundation

Run fresh normal gates and packaged tests. Audit managed configuration failure recovery, ownership,
permissions and concurrent writers. The lock is cooperative; compare-before-rename is not an OS-wide
transaction against writers ignoring it. Windows chmod is not an ACL-hardening proof. Preserve
fail-closed behavior and leave any unresolved contract difference recorded against its issue.

### B. Configuration first: DCP-009 through DCP-016

Inspect the exact pinned config manager, handlers, schemas and tests. Qualify the
recovered effective config and complete missing persistence, multiple-root, shell,
blocked-command and file-line-limit contracts, along with
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
Set-Location 'C:\Tools\Dev\MTerm-CLI\artifacts\worktrees\remote-mcp-20261102'
$MTermNodeBin = 'C:\Tools\Dev\MTerm-CLI\artifacts\toolchain\node-v24.21.0-win-x64'
$env:PATH = "$MTermNodeBin;$env:PATH"
node --version
$env:MTERM_CODEX_TEST_PREFIX = 'artifacts/ci-codex'
$env:MTERM_CODEX_EXPECTED_VERSION = '0.160.1'
node scripts/orchestration/verify.mjs --full
node scripts/verify-self-host.mjs
```

`verify.mjs --full` runs normal build/check, package and managed Codex phases.
The explicit fixture prefix/version require the integrated verifier support and
select the verified native Codex binary; do not add the npm prefix to PATH.
Inspect real exit codes and retained output. `verify-self-host.mjs` has a known
linked-worktree Git-metadata limitation (#66); use the ordinary clone above.
Only run `npm run parity:probe` when an explicit network drift check is needed; it
must not change the pinned target. See `docs/TESTING.md` for targeted regression
commands and the distinction between offline tests and live staging acceptance.

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
