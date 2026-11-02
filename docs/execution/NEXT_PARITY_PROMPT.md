# MTerm-CLI: finish the remote staging sprint, then continue Codex parity

**Handoff date: 2026-11-02.** These are observed checkpoints, not authority to
overwrite newer work. Re-read current HEAD, retained logs, PRs and deployed state.

## Execute, do not merely redesign

You are the implementation lead with Remote Desktop Commander, GitHub and
Cloudflare available as authorized. Finish the existing read-only remote MCP
sprint: exact-head gates, reviewed evidence, staged artifact, cleanup, PR/CI and
permitted merge verification. Continue from the working implementation; do not
recreate the relay or discard recovered source. The separate long-term target
remains **100% DesktopCommanderMCP parity as consumed by Codex, then 100% - PASS**.
A remote smoke or Windows suite does not establish that broader acceptance.

## Current result and immediate blockers

- Deployed smoke: **11/11 PASS** at source
  `305c89c88a10f4c9243096e3d1125bde76f17563`, with official MCP SDK 2.3.0,
  Windows Node 24.21.0 and two real DPAPI-protected foreground fixture agents.
  The SDK read both independent fixtures through Cloudflare; pairing, permission
  denial, device isolation and device/grant revocation were exercised.
- The identity was a **temporary Cloudflare Access service principal**. Manual
  S256 PKCE/consent exchange and SDK transport passed. Human Google login, human
  browser consent/callback and ChatGPT connector use remain unverified.
- Both synthetic devices/grants were revoked, agents stopped, SDK closed and
  only test-created local fixtures removed. Final temporary service identity,
  Access policy/binding and infrastructure cleanup remain to be verified.
- The first full Windows run was **143/144 PASS with one real RED** in canonical
  leaf/8.3 guard enforcement. Worker repair `28ff573c407a588489abe9545cdaf18a8af7b6b3`
  is integrated as `bbf1d0e9b75cf153243a4722ad1ab91392445540`; Windows fixture
  quoting/format is `14971ac`. The tested Windows bytes match that combination.
- The repair passed **33/33 focused actual Windows tests, no skips**, including
  five native 8.3 cases, then **149/149 full tests, no skips/cancellations**, in
  33,685 ms. Log: `artifacts/full-tests-canonical-green-20261102.log` in the
  isolated clone below. Do not replace this evidence with a hypothetical result.
- Codex journal repair `2cb2f07` retries only Windows EPERM/EBUSY, with bounded
  delays, expected-snapshot comparison on every attempt and owned-temp cleanup.
- The repaired-source **package gate passed** in 10.57 seconds: real pack/install,
  offline exec, isolated npm link, actual MCP read/write and all eight local
  compatibility aliases. Archive 54,173 bytes, unpacked payload 212,719 bytes,
  production dependencies 14,160,089 bytes. Evidence:
  `artifacts/package-gate-canonical-20261102.log` and
  `artifacts/package-verify-8SfTVE/result.json` in the isolated Windows clone.
- **Staging MCP is paused (`MCP_ENABLED=false`)** pending final qualification and
  deployment. Final reviewed HEAD, normal build/check/managed Codex,
  deployed artifact, PR/hosted platform CI, merge/main and cleanup are pending.

Read `docs/validation/2026-11-02-remote-staging-smoke.json` for the sanitized live
report, `docs/REMOTE_MCP.md` for owner setup and `docs/deployment/MTERM_STAGING.md`
for deployment/recovery. The live smoke predates the final alias fix; it is not
evidence that the final artifact has already been deployed or tested.

## Current authority and recovery

- Repository: <https://github.com/MulattoTech/MTerm-CLI>.
- Primary Windows checkout: `C:\Tools\Dev\MTerm-CLI`. Its original eight modified
  and three new files remain preserved; all eleven were recovered into the
  integration branch. Do not reset, clean or overwrite the primary checkout.
- Active integration branch: `feat/remote-mcp-readonly-20261102`.
- Active ordinary Windows clone:
  `C:\Tools\Dev\MTerm-CLI\artifacts\worktrees\remote-mcp-20261102`.
- Existing scratch integration checkout, if still available:
  `/workspace/scratch/bbdecbfeb154/mterm`. It is not the Windows workstation.
- PR #52 source `1d900464ba8a36a1121e2ae51ea65c14c3ee41c1`, stacked PR #67 source
  `b093a00755296c64d37f1d430c5dde3dfd992f08`, and main baseline
  `335cf59455aa3d382081b46a5d91b41556a61057` are integrated in the feature history.
  Reinspect [PR #52](https://github.com/MulattoTech/MTerm-CLI/pull/52),
  [PR #67](https://github.com/MulattoTech/MTerm-CLI/pull/67) and any new integration
  PR. Source integration does not establish a permitted merge or changed main.
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

Read the existing Windows log before rerunning tests. These initial commands are
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
The new Windows local result is green, while a new hosted matrix remains pending.
Do not weaken tests or freshness checks, bypass failed required checks, change
billing/visibility/scopes/protections or call local Windows proof hosted-platform
certification. Report a current external blocker only from current evidence.

## Staging resources and immediate completion sequence

| Resource | Public identifier |
| --- | --- |
| Gateway / MCP | `https://mcp-staging.m-techlabs.com` / `/mcp` |
| Private dashboard | `https://mterm-staging.m-techlabs.com` |
| Worker | `mterm-gateway-staging` |
| Cloudflare account / zone | `9e18ebcb3c1a920c9ef58a3d61b8d6b6` / `8bd58c3aba1973a88d32ae09ccca9595` |
| Durable Object | `MTermRegistry`, namespace `b66edc2d536e474093e1a18d0e88a24d`, SQLite migration `v1` |
| Access issuer / app | `https://broken-breeze-d0bb.cloudflareaccess.com` / `598ab343-fa9c-40d7-8308-b1fa24b55d81` |
| Access audience | `9533396534dbc90c78bae02791ecdd0fab21f775876ed7164ed3b57bf54e1563` |
| First smoke-good Worker version | `2083411f-68a7-4ec8-9ecc-5c2473ad09b9` |
| First smoke artifact SHA-256 | `f76e37d77c218bc9c2bc9203346ec98d590e5a69b7fef285bcd16792ae32c0f1` |

1. Collect in-progress final local gate results before launching duplicates. Codex
   0.160.1 is installed in `artifacts/ci-codex`; no real user auth/config or model
   call is needed. Finish normal review/build/check and managed Codex, retaining
   the completed package evidence. Recheck changed gates only where needed.
2. Finalize source/test/provenance/docs together. Record actual tests and unchanged
   limits, perform the required metric review/render and commit coherent source.
   Do not claim final HEAD, PR or merge until they exist and are verified.
3. From the reviewed clean committed tree, compile and run
   `node scripts/build-gateway.mjs <verified-40-character-source-SHA>`. Check its
   six-module manifest and artifact hash. Deploy only that exact artifact through
   authorized Cloudflare access, preserving all bindings and the existing DO.
   The deployment guide gives the initial-versus-update migration distinction.
4. Keep MCP paused until the qualified replacement is ready. Verify the new
   version/source/hash and repeat relevant live checks. Do not reuse revoked test
   credentials. Temporary service-principal proof needs explicitly scoped staging
   access; it never establishes human Google/ChatGPT acceptance.
5. Remove temporary service access and `STAGING_SERVICE_ID`, revoke synthetic
   devices/grants, stop owned agents, and verify cleanup. Preserve the registry,
   owner policy, Google provider and unrelated resources. Normal example metadata
   defaults to `MCP_ENABLED=false` and an empty owner allowlist; add only the
   configured owner value through the authorized deployment path, never Git.
6. Publish the tested branch/PR, inspect required exact-head checks, merge only
   with permitted expected-head protection, then verify remote main and deployed
   provenance. If a gate remains blocked, leave the branch/PR and exact blocker;
   do not report a successful merge or release.
7. The owner completes Google login, pairing and ChatGPT consent when ready.
   Follow `docs/REMOTE_MCP.md`; keep the foreground agent root small and state
   outside it. No remote write/exec, autostart, real Codex config changes or auth
   automation is part of this milestone.

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

Finish the current remote sprint gates above before starting unrelated parity
expansion. Keep WEB acceptance and DCP acceptance separate.

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
