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

## Earlier candidate observations retained from the register branch

## Cycle 2 — published candidate review

PR #256 first candidate `4742c179cbb94a0e0c5cefdff1df32ba50ebdc66` passed an independent 104-test source review, and Windows Node24 ran all 1,375 source tests without skips. Hosted installed-package verification correctly failed: the profile harness received the executable path instead of the package directory. The narrow correction is `d412b7748ad6747f0b7fbc670e6ec252b74ebdf5`, tree `a41dd2124f4f9106ae86fbd6c42022bf44a9f9c3`; the independent reviewer approved the exact source and delta, conditional on all required checks.

The corrected local installed-profile group passed 24/24. The full local package gate remains failed because 27 isolation cases cannot bind Unix sockets in this workspace (`EPERM`); this is not reported as a full pass. The revised hosted native isolation lane passed source and installed containment plus installed profiles, with other platform gates still pending at this checkpoint. No production enrollment or deployment occurred.

## Cycle 3 — evidence-derived capability register

Issue #255; branch `feat/capability-register-20261112`. The preserved original mission maps to 143 scoped product rows, all 272 feature bullets and all 488 total bullets. Eleven governance groups remain separate. Every product row has a concrete issue owner; six new issues and fourteen existing-issue addenda fill the reviewed gaps. The historical baseline and source evidence remain pinned, and later delivery observations do not silently rewrite them.

The new development validator checks unique IDs, exact mission coverage, issue/catalog/source references, immutable source URLs, dependencies, four separate baseline hashes and the unchanged CLI stage/weight snapshot. Full-requirement claims require source/layer/environment/criteria-bound receipts. Partial source, issue closure and historical tests cannot award complete, tested, merged, deployed or accepted status. Qualified partial deliveries must match saved main check receipts. Its deterministic report and JSON summary are checked by normal build/check/package gates, and the capabilities directory participates in explicit reviewed-source freshness.

Nineteen focused capability tests plus six existing roadmap tests pass. Initial missing-module RED evidence and two additional reproduced binding defects are retained. The report shows 115 rows with partial source observations, 84 with partial original-baseline components and 19 referencing subsequently qualified modernization components; these are overlapping counts. Whole mission acceptance and composite maturity remain unawarded. Independent immutable review and full hosted qualification are still required.

## Historical next action from register preparation

Finish the exact profile candidate's six checks, merge with expected-head protection and verify actual main. Independently review and qualify the separate capability-register candidate. The next upstream work belongs in MTechLabs-Access and requires a new isolated verifier: the old script targets production and cannot be reused as-is. The 0.3.1-to-0.3.3 upgrade spans substantial process/filesystem changes; remote-auth code is inactive in the normal stdio bridge, so no deployed remote-auth vulnerability fix is claimed. Do not make a third blind service-token-create attempt for #232, restart production, or remove the working wrapper.


## Cycle 2 — normal merge observed

PR256 merged at `4fb205088e77731e42da5adaca6bf167f8b75194` with the exact reviewed tree after six successful candidate jobs. Actual-main native containment has passed; the other required main jobs remain pending at this observation. Issue250 is open for the full registry/provider/UI/two-computer scope. A negated closing-keyword sentence briefly triggered automatic closure; the wording was corrected and the issue explicitly reopened. No full-profile acceptance was awarded.

## Historical next action after cycle2 preparation

Publish/review the immutable profile candidate, require all six hosted checks, merge with expected-head protection and verify actual main. Continue with the validated cross-layer capability register, then qualified upstream/package work. Do not make a third blind service-token-create attempt for #232, restart production, or remove the working wrapper.

## Cycle2 — qualified profile merge

PR256 merged at `4fb205088e77731e42da5adaca6bf167f8b75194`, tree
`a41dd2124f4f9106ae86fbd6c42022bf44a9f9c3`, after qualified candidate
`d412b7748ad6747f0b7fbc670e6ec252b74ebdf5`. All six candidate and all six
actual-main jobs passed. Windows source tests passed1,375/1,375; the other
source platforms passed1,363 with12 Windows-only skips. All five package gates
ran24 installed profile tests outside the checkout; native Linux retained12
source and12 installed containment cases. Real Codex registration used isolated
configuration and zero model calls. Issue250 remains open for the broader feature.

## Cycle3 — qualified capability register and recovered merge

[PR257](https://github.com/MulattoTech/MTerm-CLI/pull/257) contains143 product
rows covering all272 feature bullets and488 mission bullets,11 governance
groups and explicit issue owners. Its validator separates implementation, tests,
merge, deployment and whole acceptance. Candidate
`b0348d901b27975789d8764397a103204e08aaf0`, tree
`cbb3b682c4bfdf472bdfbc1ebfce5cd2e71174fc`, passed independent review and
all six hosted jobs. Windows passed1,395/1,395; other source platforms passed
1,383 with12 Windows-only skips. An initial package-fixture omission was repaired
and its failed evidence preserved.

The18:40UTC normal merge timed out; the18:42UTC follow-up returned405,
“Merge already in progress.” At20:42:13UTC, independent API and Git reads still
show the PR open/unmerged, the head unchanged, and main at `4fb2050`.
All six canonical checks remain successful. No further retry, ref mutation or
CI rerun has been made. The backend operation state is not exposed by those
reads. [The observation](evidence/peer-mterm257-observation-20261112T204213Z.json)
preserves the exact identities and check URLs. Issue255 remains open; no
actual-main register qualification or completed-feature credit is claimed.

At20:50:24UTC, one controlled recovery through the normal merge API succeeded
after fresh PR/head/base/check and synthetic-tree verification. The actual merge
is `f447c0baac3f36470d6fd96360928c6a2a192c4b`, with the reviewed tree
`cbb3b682c4bfdf472bdfbc1ebfce5cd2e71174fc` and ordered parents `4fb2050`
and `b0348d90`. Root independently read PR/main/Git commit after the response;
the [recovery receipt](evidence/pr257-merge-recovery-20261112.json) preserves those
observations. No ref manipulation, head change, protection bypass or close/reopen
was used. All six actual-main jobs are running in43304263686/43304263698;
issue255 remains open pending that qualification. The earlier observations above
remain historical evidence, not the current merge state.

Actual-main qualification subsequently completed: all six jobs passed in both
runs above, attempt1. Windows passed1,395/1,395; other source lanes passed1,383
with12 Windows-only skips. All five package lanes passed24 installed profiles,
31 synthetic isolation protocol and18 provenance tests; four Codex0.160.1
registration/shutdown lanes passed with zero model calls. Native source and
installed suites each passed12/12. The [independent receipt](evidence/peer-mterm-main-f447c0ba-receipt.json)
binds5,024,994 full-log bytes, the45-file native ZIP, all24 cleanup records,
16 OOM observations, the signed index and eight retained LICENSE/NOTICE files.
Hosts used Node24.21.0 and the native guest24.22.2. Issue255 is completed for
the scoped register/validator source delivery; all broader acceptance remains separate.

## Cycles4–6 — qualified managed-bridge source deliveries

These changes belong to the separate Access repository. Each retained its own
independent review, regression evidence and exact candidate/actual-main checks.

| Source slice | Pull request | Actual merged commit | Actual-main evidence |
| --- | --- | --- | --- |
| Accurate readable descriptions for28 engineering tools | [Access25](https://github.com/MulattoTech/MTechLabs-Access/pull/25) | `499255adf0c3988558eb4b1dd04ee95ad3c7da33` | [Both jobs passed](evidence/peer-access-main-499255ad-receipt.json): root123/123, manager79/79. |
| Desktop Commander0.3.3 pin and real two-version qualification | [Access24](https://github.com/MulattoTech/MTechLabs-Access/pull/24) | `ef8dce0e1863e63958c4421e8506c9bdb5e881e0` | [All four jobs passed](evidence/peer-access-main-ef8dce0e-receipt.json): root123/123, manager/guards101/101; four real version/platform lanes each passed all ten stages. |
| Current job capabilities before resume and new provider dispatch | [Access27](https://github.com/MulattoTech/MTechLabs-Access/pull/27) | `9353b53a15cf50b67f4e9d452935e58a0bc9b8f3` | [All five jobs passed](evidence/peer-access-main-9353b53a-receipt.json): root123/123, Linux/Windows manager and platform guards115/115; all four real lanes still passed all ten stages. |

Description formatting preserves all28 tool names/order/input schemas,
19 read-only annotations and dispatch. Provider-grounded descriptions state
actual permission and execution limits. Metadata tests include actual `tools/list`,
paused discovery and contract identity. CLI246 remains open for actual ChatGPT
desktop/narrow rendering, registered skill metadata, staging and deployment.

The upstream pin retains SDK1.32.2. All new dependency identities and licenses
were reviewed; normal launch remains stdio. Real hosted stages cover53-tool
discovery, configuration/file I/O, manager read-only denial, complete search
pagination, shell blocking, bounded process output and owned tree termination,
PDF generation/readback, admission release and natural EOF shutdown. Linux PDFs
were13,242 bytes; Windows PDFs19,629 bytes. Shortening the owned temporary path
resolved Linux PDF launch failure without relaxing assertions. The original raw
fatal error was not captured, so that intervention does not prove a specific
unrecorded historical cause. Failed runs remain in Access's qualification evidence.
CLI10 remains open for broader parity, deployment and acceptance. No deployed
remote-authentication vulnerability-remediation claim is made.

The job fix reproduced13 failures and one passing control before repair, then
passed14/14 focused cases. It rechecks current `jobs` plus kind-specific
capabilities before resume and immediately before each new dispatch after async
preflight. Denied resume retains prior evidence/count, and conditional state/count
updates prevent concurrent requeues. It does not retroactively terminate active
work or claim an anonymous remote-code execution finding. Access26 is closed
after actual-main qualification; umbrella16 remains open. Final integrated tree
`a78d085222d478f0def630acd198289c458b189f` preserves both the full Windows
manager job and full upstream matrix. [Candidate evidence](evidence/peer-access27-162e829a-receipt.json)
and actual-main run43298684034 both qualify all five jobs.

## Cycle7 — public custom endpoint inspector

Issue251; branch `feat/public-endpoint-inspector-20261112`, based on actual CLI
main `4fb2050`. The explicit-URL command operates before profile/state/credential
selection. Offline syntax preview is separate from opt-in public HTTPS discovery.
Default MCP2026 `server/discover` and explicit legacy2025 initialization share
conservative raw-URL admission, bounded A/AAAA validation and a single pinned
TLS destination. No automatic protocol-mode fallback, redirects, provider
credentials, tool execution, model call, routing grant or profile mutation occurs.

The private agent explicitly retains TLS/hostname checks under an ambient
certificate-disable flag and disables inherited proxy settings. Bounds cover
DNS/work/cleanup time, headers/body, exact SSE wire-event bytes, accepted JSON
depth and collection sizes. Only a matching valid legacy initialization adopts
a session; observed malformed headers retain cleanup uncertainty and never
authorize a DELETE. Self-reported metadata cannot reflect a known session value.

Initial CLI behavior, missing modules, strict modern schema/parser, scoped IPv6,
session reflection, malformed-session reporting and CRLF accounting all had
actual RED evidence before their corrections. The last peer regression run had
6 passing controls and14 failing counts; corrected focused qualification passes
81/81, including real owned TLS certificate and hostname rejection. Early61/61
did not detect the three independent findings and is not presented as final
approval. [The retained evidence](../validation/2026-11-12-public-endpoint-inspector/README.md)
distinguishes research inputs, initial review, regression failures and corrected tests.

## Current next action and preserved boundaries

Finish immutable endpoint review, normal local and installed-package gates,
integrate the newly merged register, publish the exact endpoint candidate, require
all six hosted checks, merge normally with expected-head protection, and verify
actual main. PR257 actual-main qualification is complete. Continue dependency-ready cohesive implementation while session
limits permit; do not stop at this checkpoint alone.

Production remains the previously verified Access `ba4a55b7` manager0.4.0,
Desktop Commander0.3.1/SDK1.32.2 baseline unless a later independently observed
deployment establishes otherwise. No production restart/deployment, Cloudflare
policy change, credential export, model/API consumption, force push, dirty
Windows work deletion or unrelated workload change occurred in these cycles.
Canonical-only plugin authorization and safe wrapper removal remain unverified.

All CLI300/DCP48/WEB12/AUG117 IDs, original acceptance text and weights remain.
CLI maturity remains29.36%,0/300 complete. No source delivery grants complete
mission acceptance. Authenticated provider credentials252, profile portal253,
explicit target routing62 and real two-computer acceptance65/53 remain open.
