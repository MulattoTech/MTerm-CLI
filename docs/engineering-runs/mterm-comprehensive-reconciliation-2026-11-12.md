# MTerm-CLI engineering run — November 12, 2026

## Authority and ownership

Execution follows the attached comprehensive engineering mission and standing OWNER_AUTHORIZATION. OpenAI / GPT-6 Astra Pro is the integration owner. Independent read-only agents reviewed upstream, repository security, deployment identity and preserved work. No paid model/API lane, production restart, or credential/policy change is authorized by this checkpoint.

## Verified starting state

- CLI main: `cbfd29039fe84cd163a86090c8bcbffaa2b40174`; 185 open issues, two open PRs (#244/#245). Both conflict; #244 newest CI fails stale review before tests.
- #245 head: `1bf3efc`; #244 `33b80d1`. #245 already contains both material safety changes in #244's final commit; original history is preserved through a merge parent.
- Production 53-tool bridge belongs to **MTechLabs-Access**, `integrations/mcp-manager`, not this standalone CLI repository.
- Production Worker 14 modules exactly match Access main `ba4a55b7ed351f7e60928179edaa7449de00be7d`. All 43 non-test manager runtime files match that source; two tests differ, one test is absent. See architecture evidence.
- Installed upstream bridge dependency is 0.3.1. Live registry latest is 0.3.3; alpha is 0.3.2-alpha.3. Stable includes alpha changes and an authentication trust/binding fix. Upstream remote launcher does not support arbitrary custom domains.
- Canonical MTerm-CLI plugin v0.2.2 and Live Connection wrapper already bind the same App. Canonical-only grant behavior remains unverified (#209).
- All connected RDC accounts report MulattoTechBox offline. MTerm execution works. Production runtime and all other workloads remain untouched.

## Preserved workstation state

Legacy C:/Tools/Dev/MTerm-CLI dirty files are 11 recovery copies matching committed source at `0a21d30` after LF normalization. The interrupted PR244 reconciliation tree has 194 staged files (190 exactly main, four modernization integration files) and seven unstaged honesty corrections. Nothing was discarded. See evidence/remote-unpublished-review.json for source identity and recovery details. Existing source clones on H: remain preserved.

## Cycle 1 — reconcile modernization safely

Issue #248; branch `reconcile/modernization-reviewed-20261112`. Base is the starting CLI main; merge parent is #245. Reconcile current-main protections, preserve useful patch/refinement/navigation/journal code, and correct additional independently reproduced regressions.

- Navigation now uses RootPolicy and the request-scoped FileService reader, strict byte/UTF-8/link handling, bounded traversal, and cancellation. Explicit path selection permits a narrowed authorized directory.
- Fleet and model-router state are instance-local; cross-session task-ID adoption is rejected. Fleet remains an in-memory ledger and runs no external agents.
- Unsupported syntax and mismatched overrides cannot return verified syntax. Conservative formatting preserves multiline literals, escaped-newline strings and non-code formats.
- Rollback observes cancellation after snapshot lookup and before guarded mutation.
- The unguarded compiler MCP tool is not exposed. The experimental Win32 Job Object integration is inactive; ProcessService remains the reviewed main implementation. Node24 optional-pack ABI pin is retained.
- Twelve regression cases were reproduced before repair (seven initial boundaries, cancelled rollback, two parser cases and two cleanup-cancellation cases). The final focused group passes 42/42; updated Git/scope/managed-registration inventory checks pass 29/29. The first broad run was interrupted with 1251 passing lines, 19 stale inventory failures now corrected, and 27 Unix-socket EPERM isolation failures. This is not a full-suite pass; hosted qualification is required.
- JavaScript is parsed by exact-pinned Acorn 8.19.0; erasable TypeScript is stripped by Node then parsed for JavaScript grammar and early errors. JSON uses JSON.parse. No compiler process is launched. The complete upstream MIT license remains installed; provenance closure now contains five packages/six dependency edges. Registry audit reported zero known production vulnerabilities, without claiming complete security clearance.

## Candidate review checkpoint

PR #249 first candidate `f3e9615a6e808c855177b252c1f057c7df62737a`, tree `6d3870abf6d4d97bc7d555d6ad4b1fa1607aca9c`, received independent conditional source approval with 82/82 tests and independent Acorn artifact/license checks. Hosted fast CI passed. Platform/package gates correctly rejected the missing Acorn entry in the installed license allowlist and its stale four-package count; both are corrected without weakening any gate. Revised exact-head checks and actual-main qualification remain required.

## Progress discipline

No original CLI stage, weight, DCP/WEB/AUG acceptance or deployment credit is increased by this integration. Heuristic navigation is not LSP, a logical ledger is not a running fleet, and a merged CLI commit is not a bridge deployment. The mission capability register will separately record implementation, tests, merge, deployment and acceptance evidence.

## Exact next action

Finish independent review and full local/package/hosted CI for cycle1, merge with an expected-head check, verify main, then reconcile original PRs. Continue with named remote connection profiles and production/development credential isolation; register all genuine mission gaps against the full existing backlog. Do not make a third blind service-token-create attempt for #232, restart production, or remove the working wrapper.
