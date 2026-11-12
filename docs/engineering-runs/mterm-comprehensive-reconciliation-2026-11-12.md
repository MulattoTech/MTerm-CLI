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

## Cycle 1 — qualified merge and reconciliation

Final candidate `09097ee82028ce01e069c6d555e7ab65b8add2e0` passed independent delta review and all six hosted jobs. PR #249 merged normally at `83a97daed6ef92b69e681b6b68f982f5d4266a51`, retaining tree `c4d2c52442daf652af4323827cda91b6f32cd538`. All six checks also passed on that actual-main commit: Windows, Linux, macOS ARM, macOS Intel, native Linux isolation and fast CI. Windows source tests passed 1,351/1,351 with no skips; Linux/macOS had 1,339 passes and the 12 existing Windows-only skips. Native containment passed 12/12 scenarios from source and 12/12 from the installed package. All gates used zero model calls.

PRs #244/#245 are closed as superseded with history preserved. #245 is an ancestor; the final original #244 head is not, but its unique fixes were preserved and reviewed. Issue #248 is closed for the scoped integration. See `evidence/modernization-main-qualification.json` for exact check URLs. This does not accept the complete modernization roadmap.

## Cycle 2 — local named remote gateway state

Issue #250; branch `feat/remote-profiles-20261112`, based on the qualified main above. This is a useful local slice of the larger connection-profile requirement, which remains open.

- Every existing lifecycle command accepts an explicit named profile or explicit state directory, plus a pinned production/development environment. Production default remains in its existing location. Preview creates no state; generated next commands preserve literal argv and the selected environment.
- Named/development configuration and protected v2 credentials bind to the canonical state directory and environment. Copying public metadata, copying protected bytes, or editing public scope cannot adopt another profile's credential. Existing unbound production state remains compatible.
- Managed directory identities, lexical link checks, Windows case/canonical alias classification and POSIX owner/mode checks prevent scope downgrades and accidental parent replacement. Existing safe readable namespace parents remain usable; credential leaves/collections stay private.
- Root/state overlap is rejected before setup mutation. Stop/revoke select one profile without changing another profile's credentials or locks. Owned stop still works if the exposed workspace disappears.
- `remote profiles` bounds both records and inspected entries, reads public local metadata only, makes no network call and does not decrypt credentials. Invalid metadata reports unknown pairing state; no arbitrary runtime properties are returned.
- The initial suite reproduced eight failures; later regressions reproduced parent replacement, workspace-loss stop, incorrect inventory certainty, a valid-name inventory collision, legacy namespace compatibility and a native Windows uppercase collection scope bypass. Repairs are covered by 104 passing focused tests, including 24 profile cases. The package verifier requires the same profile cases against installed modules from outside the checkout.

The Windows case fixture used the host's Node27 alpha and only temporary compiled modules; it is native reproduction evidence, not the required Node24 qualification. Hosted platform/package gates and independent immutable final review remain pending at this prepublication checkpoint. Local tests used synthetic credentials and mocked gateway responses; no real enrollment or production mutation occurred.

The existing HTTPS-origin `/api/pair/*` and `/api/agent/*` protocol is unchanged. Arbitrary custom MCP paths, provider auth lifecycles, web Profiles UI, production-manager compatibility and real two-computer/two-profile acceptance remain open under #250–253/#62/#65. The full capability register is tracked under #255.

## Cycle 2 — published candidate review

PR #256 first candidate `4742c179cbb94a0e0c5cefdff1df32ba50ebdc66` passed an independent 104-test source review, and Windows Node24 ran all 1,375 source tests without skips. Hosted installed-package verification correctly failed: the profile harness received the executable path instead of the package directory. The narrow correction is `d412b7748ad6747f0b7fbc670e6ec252b74ebdf5`, tree `a41dd2124f4f9106ae86fbd6c42022bf44a9f9c3`; the independent reviewer approved the exact source and delta, conditional on all required checks.

The corrected local installed-profile group passed 24/24. The full local package gate remains failed because 27 isolation cases cannot bind Unix sockets in this workspace (`EPERM`); this is not reported as a full pass. The revised hosted native isolation lane passed source and installed containment plus installed profiles, with other platform gates still pending at this checkpoint. No production enrollment or deployment occurred.

## Cycle 3 — evidence-derived capability register

Issue #255; branch `feat/capability-register-20261112`. The preserved original mission maps to 143 scoped product rows, all 272 feature bullets and all 488 total bullets. Eleven governance groups remain separate. Every product row has a concrete issue owner; six new issues and fourteen existing-issue addenda fill the reviewed gaps. The historical baseline and source evidence remain pinned, and later delivery observations do not silently rewrite them.

The new development validator checks unique IDs, exact mission coverage, issue/catalog/source references, immutable source URLs, dependencies, four separate baseline hashes and the unchanged CLI stage/weight snapshot. Full-requirement claims require source/layer/environment/criteria-bound receipts. Partial source, issue closure and historical tests cannot award complete, tested, merged, deployed or accepted status. Qualified partial deliveries must match saved main check receipts. Its deterministic report and JSON summary are checked by normal build/check/package gates, and the capabilities directory participates in explicit reviewed-source freshness.

Nineteen focused capability tests plus six existing roadmap tests pass. Initial missing-module RED evidence and two additional reproduced binding defects are retained. The report shows 115 rows with partial source observations, 84 with partial original-baseline components and 19 referencing subsequently qualified modernization components; these are overlapping counts. Whole mission acceptance and composite maturity remain unawarded. Independent immutable review and full hosted qualification are still required.

## Exact next action

Finish the exact profile candidate's six checks, merge with expected-head protection and verify actual main. Independently review and qualify the separate capability-register candidate. The next upstream work belongs in MTechLabs-Access and requires a new isolated verifier: the old script targets production and cannot be reused as-is. The 0.3.1-to-0.3.3 upgrade spans substantial process/filesystem changes; remote-auth code is inactive in the normal stdio bridge, so no deployed remote-auth vulnerability fix is claimed. Do not make a third blind service-token-create attempt for #232, restart production, or remove the working wrapper.


## Cycle 2 — normal merge observed

PR256 merged at `4fb205088e77731e42da5adaca6bf167f8b75194` with the exact reviewed tree after six successful candidate jobs. Actual-main native containment has passed; the other required main jobs remain pending at this observation. Issue250 is open for the full registry/provider/UI/two-computer scope. A negated closing-keyword sentence briefly triggered automatic closure; the wording was corrected and the issue explicitly reopened. No full-profile acceptance was awarded.
