# Failed main gate and diagnostic repair — 2026-11-08T03:21:49.428Z

PR204 merged normally as649142ea222b67f31f2165910a3a66b80bc7847d after11/11 final checks and independent review; merge tree matches. Main is5/6, not green: mandatory Linux source ISO-LIVE-07 exited nonzero with oomKilled:false, other11 scenarios passed, installed live skipped. The original [failed main receipt](validation/2026-11-08-aug005-main-failure.json) preserves the actual artifact, TAP, receipt and evidence gap. Cause remains unresolved; no containment or cleanup failure is inferred from missing observations.

Owner branch fix/aug-005-live-oom-evidence-20261108 in the same isolated AUG005 clone repairs failure accounting first. Reporter tests went RED4->GREEN4, independent-review multi-cleanup regression RED1->GREEN5. Original memory payload/profile/8s per-job deadline and strict OOM assertion remain. Eight sequential probes all must pass, with a180s test-only envelope; observations and all cleanup errors are retained on failure. No product or dependency change. Four changed live-fixture matrix bindings return to unrun pending exact qualification; previous successful receipts remain immutable history.

Next: independent source review, exact diagnostic source/installed CI, causal correction if indicated, normal qualified follow-up merge and main verification; #93 CLI-157/165 follows. No recurring owner approval or Codex/model request. Preserve original dirty checkout, prior APT failure, native EPERM failure and this main failure. Full acceptance remainsAUG0/117; CLI29.12%/0complete; DCP0/48; WEB0/12.

---

# Current delivery checkpoint — AUG-005 / PR204 — 2026-11-08T03:02:15.612Z

Codee8264f74cd02df465a66a6ed81bf38034a01ad00 passed all11 hosted checks and independently reviewed source/rights/evidence gates. Native attempt1 retained439/440 with one existing private registration EPERM; unchanged focused1/1 and one disclosed full attempt2 passed440/440, installed28isolation/24resource/29pack/18provenance and audit0. Cause of the earlier OS denial is unproven, not declared fixed.

Real Linux source12/12 and actual installed12/12 passed in both push and PR jobs. Fresh signed Docker29.9.3/containerd2.4.2/runc1.5.2 metadata, eight source LICENSE/NOTICE files, pinned Node24.22.2 image and all owned cleanup are recorded in [live qualification](validation/2026-11-08-aug005-live-qualification.json). The first failed APT artifact is unchanged; its invalid signature-success boolean is explicitly superseded. See [full qualification](validation/2026-11-08-aug005-qualification.json), [native attempts](validation/2026-11-08-aug005-native-attempts.json) and [independent review](validation/2026-11-08-aug005-source-review.json).

Next: final immutable metadata review, final11 checks, normal expected-head merge,6 main checks, then refresh dependency order. Owner authorization already covers this work. The original dirty checkout and unrelated Docker workloads remain preserved; no Codex/model requests. Eight scoped observations add no capability acceptance. AUG0/117; CLI29.12% maturity/0complete; DCP0/48; WEB0/12 remain unchanged. Only native Linux x64 with the observed classic image store is live-qualified; other product platforms, crash recovery, hard wall-clock supervision, actual ChatGPT connector use and full image rights remain open.

---

# AUG-005 immutable qualification checkpoint — 2026-11-08T02:49:37.492Z

DraftPR204 at ba47675 passed native440/440 and five native stages including actual installed package/audit0. Ordinary9hosted checks passed. Both mandatory Linux jobs failed before installing a runtime: APT returned0 after a missing-key warning and reused a stale runner index. The old receipt signatureVerifiedByApt:true is invalid; [superseding failure record](validation/2026-11-08-aug005-bootstrap-attempts.json) preserves it and its raw artifact. Fix requires a new empty readable APT scope and independent pinned-key gpgv verification. Version floor, acceptance flags and automated gates stay unchanged. Live containment remains unverified; continue PR204 qualification without an owner approval pause.

---

# Current continuation — AUG-005, 2026-11-08 UTC

PR203 is delivered at d7b7c4fb19867f7c5f9727598442c29c12d43709:9/9 final checks, independent immutable review, matching tree and5/5 main checks. PR199–202 are delivered. Epic81 checkpoint6715286912 supersedes older pending text below.

The sole implementation owner works on #84 in H:\MTechLabs\Dev\MTerm-CLI-AUG005-20261108, branch feat/aug-005-container-isolation-20261108. The primary dirty checkout and unrelated Docker workloads remain preserved. Initial23RED and later regressions/failures are retained; latest focused64/64 includes28isolation cases. The [native Linux isolation contract](parity/ISOLATION.md) and [development receipt](validation/2026-11-08-aug005-development.json) distinguish protocol fixtures from pending real containment.

Next: immutable native/package/audit gates, all platform checks, mandatory source+installed twelve-case Linux live suite, and independent security/rights/evidence review. No full capability acceptance or actual ChatGPT integration is claimed. AUG0/117, CLI29.12% maturity/0complete, DCP0/48 and WEB0/12 remain unchanged. Qualified delivery needs no recurring owner review; no Codex/model request has been made.

---

# AUG-012 exact-code qualification — 2026-11-08 UTC

[PR #203](https://github.com/MulattoTech/MTerm-CLI/pull/203) code146cbad563def63bb0c8c3c92fc4d82b916108c0 passed native412/412, normal prepack, self-host, real installed24resource+29pack+18provenance, productionaudit0 and9/9 hosted checks. Other hosts passed400 with12existing Windows-only skips; all24 new resource cases passed on every platform. Independent review approved140source entries and verified25evidence/31development pins after finding and reproducing the now-fixed stale disk-observation race.

[Qualification](validation/2026-11-08-aug012-qualification.json), [source review](validation/2026-11-08-aug012-source-review.json), [contract](parity/RESOURCE_BUDGETS.md) and four platform receipts preserve exact versions/hashes and limits. Runtime adds23799MTerm bytes across12changed/new files;997runtime files total. Launcher/all3dependencies are identical to PR202. Windows installed14520712bytes, Linux/macOS14519151bytes. The matrix records60passed scoped scenarios,2280unrun and0accepted capabilities.

Final metadata-head checks/review, normal merge and main verification remain next. Then continue AUG005/#84 with its existing CLI267/276 boundaries. Read-only reconnaissance found Docker Desktop4.98.0/Engine29.9.2 Linux amd64 on the authorized Windows device; no container, daemon, model or isolation workload was started by that probe. Keep hard CPU/GPU/RAM/disk-write, cross-host and actual ChatGPT integration acceptance open until implemented and exercised. No owner manual review is pending. AUG0/117, CLI29.12%/0complete, DCP0/48 and WEB0/12 remain unchanged.

---

# Current continuation — AUG-012, 2026-11-08 UTC

PR202 is delivered at d6eb0fa8a3df8a22abdec587f405e1105f78acb8, with9/9 final checks, independent immutable review, matching merge tree and5/5 main checks. PR199/200/201 are also delivered. Epic81 checkpoint6715286912 supersedes older pending text below.

The sole implementation owner now works on AUG-012/#92 in H:\MTechLabs\Dev\MTerm-CLI-AUG012-20261108, branch feat/aug-012-resource-budgets-20261108. The primary dirty checkout remains preserved. Twenty-three cases failed against merged baseline; independent review added a reproduced stale disk-observation regression. Corrected native focused70/70 includes24 resource cases. See [contract](parity/RESOURCE_BUDGETS.md) and [retained development record](validation/2026-11-08-aug012-development.json).

Full immutable native/installed/security/license/platform qualification and independent source/receipt review remain next. Hard CPU/GPU/RAM/disk-write quotas, cross-host coordination and actual ChatGPT app integration remain unaccepted. AUG0/117, CLI29.12% maturity/0complete, DCP0/48 and WEB0/12 are unchanged. Routine qualified delivery needs no recurring owner review. No Codex/model calls were made.

---

# AUG-003 exact-code qualification — 2026-11-08 UTC

[PR #202](https://github.com/MulattoTech/MTerm-CLI/pull/202) code d42d87e03f456e78262cdaff66e2bf8925606064 passed native388/388, normal prepack, self-host, real installed29pack+18provenance checks, advisoryaudit0 and9/9 hosted checks. Other hosts passed376 with12existing Windows-only skips; all13 new catalog cases passed on every platform. Independent review approved136sourceentries and the actual spawn/selection/schema/refresh boundaries.

[Qualification](validation/2026-11-08-aug003-qualification.json), [source review](validation/2026-11-08-aug003-source-review.json) and four structured platform receipts retain exact versions/hashes and limitations. The launcher and all3dependency packages are byte-identical to PR201. MTerm adds19947package bytes across6files; Windows installed total14496913bytes. Prior development failures remain retained. The matrix now has40passed scoped scenarios,2300unrun and0accepted capabilities.

Final metadata-head checks/review, normal expected-head merge and main verification are next. Continue AUG012/#92 afterward; its existing4-operation limiter can starve owned cleanup under load and needs a bounded recovery path. Resources/prompts, cross-host quotas and actual ChatGPT app integration remain unaccepted. No owner manual review or model usage is required. AUG0/117, CLI29.12%/0complete, DCP0/48 and WEB0/12 remain unchanged.

---

# Current continuation — AUG-003, 2026-11-08 UTC

PR #201 is delivered at519cbff241be2a36bc180f91198e0492ec5ba1cc:9/9 final-head checks, independent receipt/source review, matching merge tree and5/5 main checks. PR199 and200 are already delivered. The historical pending text below is superseded by this checkpoint and epic81 comment6714919745.

The single implementation owner now works on AUG-003/#83 in H:\MTechLabs\Dev\MTerm-CLI-AUG003-20261108, branch feat/aug-003-pack-catalog-20261108. The primary dirty checkout remains preserved. Thirteen new catalog fixtures reproduced RED against PR201; the combined pack/MCP/process suite passes46/46 on Windows Node24.21.0. [Contract](parity/PACK_CATALOG.md) and [retained development attempts](validation/2026-11-08-aug003-development.json) describe the exact scope, two corrected fixture assumptions and the final spawn guard.

Immutable independent code approval, normal prepack/full suite, clean installed tests, advisory/license checks and all-platform hosted checks remain next. Resources/prompts and actual ChatGPT connector integration stay unverified. AUG0/117, CLI29.12%/0complete, DCP0/48 and WEB0/12 remain unchanged. No recurring owner review or paid-model usage is needed.

---

# AUG-013 exact-code qualification — 2026-11-07

[Draft PR #201](https://github.com/MulattoTech/MTerm-CLI/pull/201) code af992a389e418651b59c02b7acb297ca3bcdebf3 passed native 375/375, normal prepack, self-host, installed verification, advisory audit and 9/9 hosted checks. Independent review resolved three real findings and approved all 135 source pins. All 993 runtime files across four packages match PR200; installed core remains 14,476,966 bytes. The first native prepack attempt omitted the initial build and failed on missing dist imports; that original failure is retained.

[Qualification and limits](validation/2026-11-07-aug013-qualification.json) and four platform receipts now bind 20 scoped matrix scenarios. Most other capability observations remain unrun. AUG 0/117, CLI 29.12% maturity and 0/300 complete, DCP 0/48, WEB 0/12 remain unchanged. Final metadata-head receipt review, hosted checks, expected-head merge and main verification are next. No manual owner action or model usage is required. Preserve the isolated clone, primary dirty checkout and all failed/successful receipts.

---

# AUG-013 current continuation — 2026-11-07

PR #200 is merged at89d93c59a9c819314ef569a2250a4606f03ec792; final head9/9 and main5/5 passed, with identical reviewed tree and retained artifact ancestry. PR199 is also delivered. Standing owner authorization covers routine qualified delivery; no manual owner review is pending.

The sole implementation clone H:\MTechLabs\Dev\MTerm-CLI-AUG013-20261107 owns #94 on feat/aug-013-evidence-matrix-20261107. Read [the matrix contract](expansion/MATRIX.md), development receipt and expansion queue. Focused native27/27 passed after real baseline and review-regression failures. Exact committed full/package/hosted and independent qualification remain next. Preserve the primary dirty checkout and completed evidence.

All original metrics remain:152sources,117capabilities,397reciprocal mappings;AUG0/117,CLI29.12% maturity and0/300complete,DCP0/48,WEB0/12. Unknown observations stay unrun. No runtime dependency or model use is added. Next scoped candidates are #83 then #92, subject to refreshed dependencies. Later PR receipts supersede this preparation.

---

# AUG-002 current continuation — 2026-11-07

PR #199 is merged at560b3713bb9aea36578b8b7b576f4beda0775a6d, with9/9 final-head and5/5 main checks. Standing owner authorization removes recurring manual review. Preserve the primary dirty checkout and all unrelated worktrees.

[Draft PR #200](https://github.com/MulattoTech/MTerm-CLI/pull/200) owns AUG-002/#85 in the sole active clone H:\MTechLabs\Dev\MTerm-CLI-AUG002-20261107, branch feat/aug-002-provenance-gate-20261107. Its artifact commit8e6f2336d995b5c1cb5ff044071ed186cce03567 retains the reviewed SDK security rebuild and must remain in main ancestry through a normal merge. The MTerm dependency and both locks now use that immutable URL. Integrated local gates passed: 353/353 native, 18/18 installed provenance/security, 16/16 optional packs, all 86 SDK file pins, schema validation and selected advisory audits. Final independent verdict, exact-head hosted checks and normal merge/main verification are next. Read docs/PROVENANCE.md, vendor/modelcontextprotocol-server/README.md and docs/validation/2026-11-07-aug002-provenance.md.

The original12-advisory bundled audit is preserved. The replacement selected-component audit reports0findings; four fresh Windows builds match exactly. Complete generic admission/embedded-file SPDX acceptance is still pending. AUG0/117, CLI29.12% maturity and0/300complete, DCP0/48 and WEB0/12 remain unchanged. No Codex model lane or manual owner action. Later exact-head PR/main receipts supersede this preparation.

---

# Standing authorization update — 2026-11-07

The owner explicitly approved PR #199 and requested autonomous MTerm-CLI delivery with no recurring manual review. Read [OWNER_AUTHORIZATION.md](OWNER_AUTHORIZATION.md), follow independent review and automated gates, merge qualified work and continue the queue. Do not treat historical pending-human notes below as a current blocker. No Codex model usage is enabled.

# AUG expansion pilot — 2026-11-07

Read [the current expansion checkpoint](expansion/README.md), [pack ABI contract](OPTIONAL_PACKS.md)
and [qualification report](validation/2026-11-07-aug001.md) before resuming. One isolated
ordinary clone owns AUG-001/#82 on `feat/aug-001-tool-pack-boundary-20261107`, from
main `d5fcc2f665b2b4f7d033ffd32b7c22ca9d7a4015`. All 117 issue bodies and 152-source
mappings are reconciled in the machine-readable expansion queue. Original dirty work
is preserved; PR52 merged and PR67 was incorporated through merged PR69.

The optional local pack slice and exact Zod advisory remediation are under qualification.
Only synthetic local fixtures and SDK clients were used; no model requests or actual
user-auth/cloud changes. Owner authorization now covers this execution-policy change and normal merge; see OWNER_AUTHORIZATION.md. Final-head automated qualification remains required. Keep
AUG 0/117, CLI maturity 29.12%, DCP 0/48 and WEB 0/12 separate from test counts.
Latest exact-head PR comments/receipts supersede preparation statuses below.

---

## Windows DPAPI bounds follow-up — 2026-11-02T21:55:56.070535+00:00

PR #79 merged as `458e0bd72b94f34fbc74662a0cfd570bdb42bdcb` with the qualified
UTF-16LE tree. Its actual main Windows run `41529733903`, job `125566510677`,
failed **301/302** at the unchanged DPAPI helper's 10-second timer. All 30 new
UTF-16 cases passed. Preserve that failed attempt; its underlying OS cause is
unknown, and earlier candidate success is not main PASS.

The [bounded DPAPI contract](validation/2026-11-02-windows-dpapi-bounds.md) uses a fixed 30-second
operation timer and five-second cleanup grace, generic secret-free failures and
only the owned child handle. Unconfirmed Protect cleanup retains pairing
`state.lock` for deliberate local inspection; read-only Unprotect has no mutation
lock. CurrentUser, fixed entropy, stdin-only input and 32 KiB output remain.
Original Windows and Linux RED each had 17 tests, four passes and 13 failures;
unchanged supplementary GREEN passed 22/22 including the five existing cases.
Independent source/test review found no blocker. Full committed native, installed,
fresh, hosted, merge/main and recovery gates remain pending at this preparation.

DCP 0/48, WEB 0/12 and maturity 29.12% are unchanged. No real auth/enrollment,
owner, autostart or deployment change is needed. The shrinkwrap follow-up is
postponed until main is healthy. Older dated preparation records follow; later
exact-head receipts supersede their pending statuses without backdating them.

## Current DCP-017 UTF-16LE read candidate — 2026-11-02

The bounded [UTF-16LE read contract](validation/2026-11-02-utf16le-read.md) starts from merged
main `dd3f052e1d270c6ca305e43e14180bb5f7579de6` on
`fix/dcp-017-utf16le-20261102t211227`. Explicit BOM-marked UTF-16LE compatibility
reads preserve strict decoding, root policy, raw/aggregate/serialized limits and
UTF-8-only native/write/edit paths. Native original-source RED was 3 passes and
27 failures; unchanged focused scratch GREEN passed 30 new cases plus 14 retained
batch cases. Separate shared-storage regressions passed 64/64; independent review
found no blocker. Eight installed read groups passed as supplementary scratch proof.

Committed native full/prepack/Codex, fresh extraction, hosted final-head, merge/main
and recovery gates remain pending at this preparation. DCP 0/48, WEB 0/12 and
maturity 29.12% remain unchanged; #19 stays open. PR #78 is already delivered.
Preserve primary dirty files, old worktrees and the existing read-only owner; no
pairing, deployment, real-auth or model call is needed. Historical records follow.

## DCP-025 observed qualification — 2026-11-02T20:13:07.672246+00:00

[PR #78](https://github.com/MulattoTech/MTerm-CLI/pull/78) qualified candidate
`5723f5d0914d2e3c7e165506cf6f11980eb54fc2` (tree `5e3cdba9071d1149ab1ec28e67e3d7edb3335f65`).
Actual Windows full wrapper, self-host, normal prepack, packed MCP and source/installed
Codex registration exited 0. Full and normal-prepack suites each passed **272/272**;
the installed edit contract passed all **six groups**, including refusal/no-write,
read-only restart and owned-process cleanup. Fresh committed extraction, locked
install, reviewed build, normal prepack **272/272**, and installed package also passed.
All **five hosted jobs passed, attempt 1**: Windows 272/272; Ubuntu and both Mac
architectures 260 passed plus 12 explicit Windows-only skips. All 30 new edit cases
passed on every platform. Actions' PR merge tree equals the qualified source tree.

The earlier `d8c232e` run passed all unit tests but failed package verification because
the new verifier parsed SDK schema-error text as JSON. The harness-only correction,
original failures, exact logs and independent reviews are preserved in
[qualification evidence](validation/2026-11-02-edit-line-endings-qualification.json).
Native Codex 0.160.1 parsed synthetic configuration; SDK clients invoked the registered
command. No actual model-driven Codex/ChatGPT tool invocation is claimed.
DCP **0/48**, WEB **0/12**, maturity **29.12%** remain unchanged; #27 stays open.
Final documentation review/build, exact final-head checks, merge/main verification,
preservation and recovery/download delivery remain subsequent gates at this observation.

# Current editing iteration — 2026-11-02

The DCP-025 / issue #27 candidate starts from verified merged main
`99c3c9e7d23d76a3207b903554f552f59cebf236` on
`fix/dcp-025-edit-eol-20261102`. It normalizes exact search/replacement to the
file's first newline, preserves untouched bytes, observes post-read cancellation
and refuses oversized output before allocation. Native original-source RED was
7 passes/23 assertion failures; unchanged final GREEN passed 30/30. Independent
source review resolved its allocation finding. Read the new contract and receipts
before repeating work. Full committed/native/installed/fresh/hosted delivery gates
remain subsequent observations at this preparation.

PR #77 is already delivered (main checks5/5); older pending fields below are
historical. DCP0/48, WEB0/12 and maturity29.12% remain unchanged. Preserve the dirty
primary and running owner clone. No pairing, deployment, model or real-auth call
is needed. Actual client acceptance and full edit/fuzzy/Office/preview semantics
remain separate. Historical records below retain their original timestamps.

[Current contract and qualification](validation/2026-11-02-edit-line-endings.md)

## Preserved prior records

# Aggregate-output qualification observed — PR #77, 2026-11-02

Implementation `c510908017d7937173189d483fd2697645d42748` repairs the complete
UTF-8 text-byte budget for DCP-019 / issue #21. The inclusive 262,144-byte bound
counts summary rows, error rows, LF separators and successful content. Existing
owner authority, safe errors, ordering, duplicates and cancellation remain.

Native Windows original-source RED had 7 passes / 7 assertion failures; the
unchanged fixture passed 14/14 after the repair. The actual full wrapper and
normal native/fresh prepack each passed 242/242 with no skips. Self-host, native
and fresh packed MCP, and source/installed synthetic Codex 0.160.1 passed.
Packed probes passed six aggregate, eight metadata and six directory groups,
including read-only restart, actual process exits and cleanup. The recovered
Windows fresh ZIP matches all 548 source files and Git modes independently.

Implementation hosted checks passed 5/5 on attempt 1. Windows passed 242;
Linux and both macOS architectures passed 230 with 12 named Windows-only skips.
All 14 new regressions passed everywhere. Read the aggregate-output validation,
native/fresh/hosted records and independent reviews before repeating gates.

Final documentation build/checks, normal expected-head merge, main observation,
final preservation and additive recovery remain later gates at this preparation.
The PR delivery receipt and new downloadable continuation will record those
outcomes. Earlier pending notes below retain their original preparation context.
DCP 0/48, WEB 0/12 and maturity 29.12% remain unchanged; issue #21 stays open.
Codex parser/SDK proof is separate from actual model or ChatGPT client use.

## Preserved implementation preparation

# Current aggregate-output iteration — 2026-11-02

The bounded DCP-019 / issue #21 change starts from verified main
`7e5f8287532765f11f055cb89d0312e1c1b236bd` on
`fix/dcp-019-aggregate-output-20261102`. Read the
[contract and qualification record](validation/2026-11-02-aggregate-output.md) before repeating work.
It counts every returned UTF-8 summary/content byte against the existing
262,144-byte budget. Corrected direct-service RED was 7 passes/7 assertion
failures; unchanged GREEN passed 14/14. Independent source review found no
blocker. Native, installed, fresh, hosted and final delivery gates remain
separately observed work at this preparation.

PR #73/#74/#75/#76 are already delivered; their earlier pending fields below
are historical preparation. Preserve the unpublished primary checkout and
running config-qualification owner agent. No pairing, deployment, real auth or
model call is needed. DCP 0/48, WEB 0/12 and maturity 29.12% stay unchanged.

## Preserved earlier record

# File metadata continuation — 2026-11-02

## DCP-024 qualification observed — PR #76, 2026-11-02

Implementation `450578f7761a5dabc28fad3feda0c3119f130ecb` completes the bounded
file-info text/stat and failure-propagation slice. Native original RED23 had
6 passes / 17 assertion failures; unchanged-fixture GREEN passed23/23. Actual
Windows full wrapper passed228/228, followed by self-host, normal prepack,
installed metadata, source/installed synthetic Codex0.160.1 and fresh extraction.
Both explicit installed probes passed eight metadata groups plus six directory
groups, including read-only restart, independent exits and cleanup. Model calls0.

Exact implementation hosted checks passed9/9, all attempt1, independently observed
17:29:50.904Z; all23 new regressions passed. Windows228passes; Linux/macOS216passes
with12named Windows-specific skips. Read `docs/validation/2026-11-02-file-info-contract.md`
and `2026-11-02-file-info-delivery.json` for original receipts and exact scope.

Final documentation build/checks, expected-head normal merge, main observation and
additive recovery are still subsequent gates at this preparation. Later public
and downloadable delivery receipts supply observed completion without backdating
these notes. DCP0/48, WEB0/12 and maturity29.12% remain unchanged; issue26 remains
open. Actual supported-client acceptance and precise owner contract rulings are
separate. Earlier preparation and PR73/74/75 records below retain their timestamps.

The new DCP-024/#26 slice starts from verified merged main
`71353344bb78bb15135bc76be1c32db4aff14f47` on
`feat/dcp-024-file-info-contract-20261102`. Read
[the metadata contract](validation/2026-11-02-file-info-contract.md),
its development receipt and independent source review. Supplementary scratch
RED had 23 tests: 6 passes and 17 assertion failures; unchanged test bytes then passed 23/23.
Native full/installed/fresh/hosted gates and exact-head delivery remain next at
this preparation; later observed receipts supersede pending fields.

PR75's final delivery receipt confirms directory implementation, final/main
checks, merge and recovery are complete. PR74 and PR73 also remain delivered.
Do not repeat those gates, owner setup/pairing or deployment from older notes.
Preserve the dirty primary, protected clones and running config-qualification
owner. No paid/model calls or actual-client acceptance is inferred. DCP 0/48,
WEB 0/12 and maturity 29.12% remain unchanged, with all protected fields intact.

## Preserved earlier record

# MTerm-CLI handoff — qualified directory contract

## Current DCP-022 delivery

Implementation `6eed7f0dc9ccfd704b78c39f8d0f31e5eaf3648a` is in
[PR #75](https://github.com/MulattoTech/MTerm-CLI/pull/75), based on verified main
`7d55c6a2c498a02ce0191ce3f0a1a4a109c042ea`. Read the
[directory report](validation/2026-11-02-directory-contract.md) and exact native,
fresh and hosted receipts before repeating any gate. Native focused RED was
3 passes/13 failures; final GREEN passed 18/18. Full Windows qualification passed
205/205 with no skips, the actual full wrapper, self-host, normal prepack,
source/installed native Codex and six explicit installed directory groups.
Fresh committed-source extraction passed locked install/build/prepack/package
with 205/205 tests and the same six directory groups. All nine implementation
checks passed on attempt 1. No model call occurred.

Final documentation-head review/build/checks, expected-head merge, main checks
and additive recovery remain next at this preparation. Keep the task-owned
Windows GREEN stash `4a2cf7cc1f0a15d6ae9ea1d6ee5224c1fbb609ea` and all original
evidence. Final delivery receipts or the downloadable continuation supersede
these preparation fields once those actions are actually observed.

The [primary-session connection follow-up](validation/2026-11-02-directory-connection-followup.json)
resolved the earlier browser/management observation gap: Brave's authenticated
dashboard showed one online read-only owner, zero client authorizations and build
`b90432a1bc138d59305692a9f74f110a475d0881`. Cloudflare confirmed the historical
Worker version still receives 100% and the dashboard policy remains owner-only.
Actual ChatGPT consent/discovery/read remains unperformed. No denied-host or
non-retryable creation retry occurred; do not pair or approve the root again.

PR #74 is already delivered. Preserve the dirty primary, protected checkouts and
running `config-qualification-20261102` owner agent. DCP acceptance remains 0/48,
WEB 0/12 and maturity 29.12%; all protected catalog fields remain unchanged.
Configuration and listing intentional differences still need precise owner
contract rulings. Source/installed Codex parsing and SDK rounds are not actual
model-driven agent tool invocation.

## Prior configuration handoff — historical preparation

## Current DCP-010 setter contract qualification

Tested implementation `16ea3ff82062c6f3018385b1a59600431e475c36` on
`feat/dcp-010-config-contract-20261102` is carried by draft
[PR #74](https://github.com/MulattoTech/MTerm-CLI/pull/74), based on merged main
`acaf276066c9e0436af2398c0120a38f7c04f5f0`. It adds the missing
` to <effective JSON value>` success segment from the same validated setter
snapshot as the configuration body. Strict normalization, owner ceilings,
storage, safe errors and independent configuration-write authority are unchanged.
The [contract report](validation/2026-11-02-config-contract.md) records all six
preferences and the intentional upstream differences.

Native Windows Node 24.21.0 passed **187/187 tests with no skips or
cancellations**, the actual full-orchestration wrapper, self-host, normal prepack
and installed-entry native Codex. The seven conceptual gates include normal
build/check, real package and source Codex within that observed wrapper.
The real installed verifier passed **ten scenarios**, including six-setting
responses and 14 rejected-write byte checks. Two concurrent MCP children and a
restart completed with independently verified exits and owned fixture cleanup.
Ten network canaries were intercepted and zero product attempts observed within
bounded Node API instrumentation. Source and installed Codex 0.160.1 each parsed
synthetic registration and completed two SDK MCP rounds; model calls were zero
and actual Codex-agent tool invocation remains false.

A separate exact-commit archive/extraction passed locked install, reviewed build,
normal prepack and installed verification, again with 187/187 tests and ten
installed scenarios. See the immutable [native receipt](validation/2026-11-02-config-contract-windows.json)
and [fresh-source receipt](validation/2026-11-02-config-contract-fresh.json).
These committed-source results follow the original focused native **2-pass/10-fail
RED** and **12/12 GREEN**. Their old/new test hashes remain distinct because only
the cleanup helper changed between the two focused runs. Scratch
`CONNECTION_CLOSED` during initialization is an environment observation, not
product RED. The report also preserves the corrected local-evidence-path build
failure and pre-execution import hash comparison; neither is hidden or relabeled.

All nine [hosted implementation checks](validation/2026-11-02-config-contract-hosted.json)
passed at `16ea3ff` without retries, observed 13:09:16.557 UTC; the last completed
at 13:08:30 UTC. Final documentation checks, merge/main and final recovery remain
pending. The integration owner must review this updated evidence,
explicitly review/render the refreshed roadmap and finish exact-head delivery.
All 48 DCP issues remain open, WEB acceptance is 0/12 and broad maturity stays
29.12%; no protected fields or acceptance credit change. The
[additive issue audit](validation/2026-11-02-config-contract-issue-audit.json)
retains its original 48-body/22-comment observation rather than claiming a new
remote audit at receipt time.

The separate [connection recheck](validation/2026-11-02-connection-recheck.json)
records the existing-session dashboard at approximately 12:56:08 UTC: one owner
computer online, read-only, zero client authorizations and zero active requests.
Actual ChatGPT consent, discovery and file reading remain unobserved. Plugin
listing does not prove the earlier creation error is repaired, and no blocked
host retry, new login, consent or pairing was performed. Matching dashboard and
public-health build values do not independently verify a fresh Cloudflare
management version or Access policy.

The DCP-009 owner ruling still required is whether its documented omitted probes
and owner/privacy restrictions are acceptable intentional differences in the
Codex-facing parity contract; otherwise specify the truthful bounded fields
required. The [report](validation/2026-11-02-config-contract.md#earlier-dcp-009-delivery-and-the-remaining-owner-ruling)
lists the exact differences. This is contract acceptance, not permission for
model calls or real user configuration changes; actual supported-client
acceptance remains separate. Independently closeable #12 remains open for its
own complete setter contract, accepted intentional differences and applicable
actual-client evidence. Separate shell/process contracts are not imported into it.

## Completed DCP-009 delivery and existing owner connection

The independent `feat/dcp-009-config-metadata-20261102` implementation is
`535d99e20b52a30ba9a24b6d2205d8e6687f6ca6`, based on verified main
`c408e286c437bec1c8c88fbbae29d89a9f8f90c8`, and is carried by
[PR #73](https://github.com/MulattoTech/MTerm-CLI/pull/73). It adds bounded local
OS/process/memory metadata and pinned preference entry ordering to `get_config`,
without probing Python, mounts, containers or environment metadata. Client
identity selects only bounded name/version fields; owner capability ceilings
remain unchanged. See the [contract and RED/GREEN report](validation/2026-11-02-config-metadata.md).
Direct scratch metadata tests passed 11/11 after an observed 1-pass/10-fail RED;
the native Windows suite subsequently passed **175/175 with zero skips**. Reviewed
build/check, self-host, real package, normal prepack, source and installed native
Codex gates all passed, as did a fresh committed source extraction. The four
full-orchestration component commands were executed individually with actual exit
results. The installed verifier checks eight scenarios on real MCP children.

The [delivery record](validation/2026-11-02-config-metadata-delivery.json) records
9/9 latest implementation hosted checks passing at unchanged `535d99e`. The initial
push macOS ARM64 npm-install timeout remains recorded with cause unestablished;
one supported rerun passed its tests, package and native-Codex gates at 12:00:47 UTC.
Only that failed platform job was rerun. The directly retrieved
[final delivery receipt](https://github.com/MulattoTech/MTerm-CLI/pull/73#issuecomment-6577021102)
supersedes older prepublication notes: final head `6757c1f` passed 9/9 checks
without retries, normal merge produced `acaf276` at 12:17:20 UTC, and merged main
passed 5/5 without retries, rechecked 12:20:35 UTC. The final head and merged tree
are identical. Native Codex parsing plus SDK calls does not establish a
model-driven tool invocation. All DCP issues remain open and broad stages/weights
unchanged.

The owner has approved the prepared `C:\Tools\Dev\MTerm-RemoteWorkspace` root.
Real owner-authorized pairing through an existing authenticated dashboard, online
foreground presence, graceful stop/offline observation and same-enrollment
reconnect are now observed. Read-only/no-autostart remain, and the enrollment was
not revoked. A separate 12:00:53.619 UTC local-status recheck again observed the
same enrollment online from `config-qualification-20261102` at `c408e286`. Preserve
that running checkout and inspect current process/state before any new start or
pairing.

ChatGPT is still disconnected: no client authorization, tool discovery or read.
Plugin creation returned non-retryable HTTP 409 `Scoped plugin release was deleted.`;
the browser host gate denied ChatGPT navigation. These were not bypassed. Fresh
Google login was not performed. Preserve the prepared plugin package and use the
[owner connection report](validation/2026-11-02-owner-connection.md) and
[continuation prompt](execution/NEXT_PARITY_PROMPT.md) for the next supported step.

## Earlier configuration sprint checkpoints (historical)

The preceding continuation included dependency main `932c310914d8af822c5b1611ac85c5e79c2c5097`
(PR #71, after the #69 integration and #70 metadata). See [STATUS.md](STATUS.md), the
[configuration reliability report](validation/2026-11-02-config-retry.md), and the
[current 48-issue audit](validation/2026-11-02-config-issue-audit.json).
All DCP issues remain open; implementation evidence does not close full contracts.

Configuration reliability work uses the isolated ordinary Windows clone
`C:\Tools\Dev\MTerm-CLI\artifacts\worktrees\config-retry-20261102`.
The primary checkout and its eleven modified/new files are preserved. The additive
pre-change checkpoint is `artifacts/checkpoints/config-sprint-start-20261102` under
the primary checkout. The report records bundle/source/manifest hashes.

The private staging Worker retained `af4fd06e-c4a3-4545-ad22-31d0ae956215` and the
unchanged tested `b90432a` artifact. The earlier zero-computer dashboard and
`applied:false`/`paired:false` preview were the starting point for the now-observed
owner pairing above; they are not the current owner state. Client authorizations
still numbered zero at the later owner checkpoint.

## Previous completed remote staging sprint

**The read-only staging service is enabled and its final deployment passed 11/11
live checks.** The [final sprint report](validation/2026-11-02-remote-sprint.md)
and [PR #69](https://github.com/MulattoTech/MTerm-CLI/pull/69) are authoritative for
the final merge/main SHA, document checks and recovery checkpoint. Human Google
sign-in and ChatGPT connector acceptance were unverified at that historical
closeout, and no owner was paired then. The later owner checkpoint above supersedes
only the pairing/lifecycle observation. Production has not been promoted.

## Configuration qualification continuation — 2026-11-02

The separate DCP-016 / #18 qualification change adds installed configuration verification,
package-gate integration and synthetic managed-Codex configuration discovery.
Its [standalone native Windows probe](validation/2026-11-02-config-installed-qualification.md)
passed seven scenarios through two concurrent packed MCP children and a restart.
Ten network canaries were intercepted, no product attempt was observed, every
captured child/fixture process had an independently observed exit, and cleanup
completed. The evidence identifies the actual package/module hashes from the
separate DCP-010 candidate, rather than attributing it to this branch's base SHA.

The revised native Windows workflow subsequently passed **164/164 tests**, the
normal package gate and the source-entry managed-Codex gate. Separate normal
prepack, self-host and explicit installed-entry Codex also passed. Implementation
`def85d256fe558ef26e0cdf7d0218ce250682150` then passed all nine hosted checks and
fresh committed source extraction, including normal prepack and installed package
validation. [PR #72](https://github.com/MulattoTech/MTerm-CLI/pull/72) records final
documentation delivery, exact-head merge/main checks and the recovery manifest.
See the [delivery evidence](validation/2026-11-02-config-delivery.json) and
[continuation prompt](execution/NEXT_PARITY_PROMPT.md). The dedicated ordinary
qualification clone is `C:\Tools\Dev\MTerm-CLI\artifacts\worktrees\config-qualification-20261102`.
The earlier remote release remains separate. No DCP/WEB issue closes; broad
stages and weights remain unchanged.

## Historical remote release checkpoint — 2026-11-02 01:24 UTC

| Area | Observed result |
| --- | --- |
| Source | Validated code `b90432a1bc138d59305692a9f74f110a475d0881` integrates PR #52/#67 source, verified main and all eleven recovered unpublished files. Consult the final report and PR for later documentation/merge commits. |
| Final deployed smoke | **11/11 PASS** at that code checkpoint, Windows Node 24.21.0 and official MCP SDK 2.3.0. Two real DPAPI agents served independent fixture reads through Cloudflare. Final run ended 2026-11-02 01:24:29 UTC. |
| Identity and cleanup | Temporary Access service-principal proof exercised S256 PKCE and consent exchange. Temporary service policy, token and Worker binding were deleted; owner-only access remains. All fixture agents/devices/grants were cleaned. Human Google/ChatGPT acceptance remains separate. |
| Windows RED | The earlier full run passed 143/144 groups and exposed one real canonical-leaf/Windows 8.3 guard defect. It was not waived. |
| Windows GREEN | Final full workflow **PASS in 55.35 seconds**, including **149/149 tests**, no skips/cancellations, 32,829 ms. Earlier focused qualification passed 33/33 including five native 8.3 cases. |
| Fix provenance | Canonical-leaf worker fix `28ff573c407a588489abe9545cdaf18a8af7b6b3` is integrated as `bbf1d0e9b75cf153243a4722ad1ab91392445540`; Windows fixture quoting/format is committed as `14971ac`. The Windows-tested bytes match that combination. Codex bounded rename repair is `2cb2f07`. |
| Package and Codex | **PASS**: archive 55,636 bytes; unpacked payload 216,577 bytes; installed production footprint 14,163,947 bytes. Actual pack/install/link and eight aliases passed. Native Codex 0.160.1 parsed isolated registration and launched two MCP sessions; no user config or model calls. |
| Hosted CI | All four PR matrix jobs in `41372073094`, fast run `41372073095`, and push matrix `41372068412` **PASS**. Final-document checks and merge status are recorded by the final report/PR. |
| Enabled staging | Worker version `af4fd06e-c4a3-4545-ad22-31d0ae956215`; artifact SHA-256 `97a0457b78e113c058ae8da3d3a6a54fcd93c2b35d1dd1781316c41001ac10a6`; `MCP_ENABLED=true`, owner-only access. |

The earlier remote verification clone is
`C:\Tools\Dev\MTerm-CLI\artifacts\worktrees\remote-mcp-20261102`.
Retained logs and the final exact-source results are indexed in the final sprint
report. Earlier `full-tests-canonical-green-20261102.log` and package logs remain
historical checkpoints. Codex 0.160.1 in `artifacts/ci-codex` passed managed
registration. Do not repeat completed gates or redeploy unchanged code merely to
resume this handoff.

Use [REMOTE_MCP.md](REMOTE_MCP.md) for owner commands,
[the final live report](validation/2026-11-02-remote-staging-smoke-final.json) for exact
claims, and [deployment/MTERM_STAGING.md](deployment/MTERM_STAGING.md) for resource
IDs, pause and rollback. Final run ID:
`2026-11-02T01-23-39-600Z-a0b41954-29c8-4163-b93f-a04a5c64b6a6`.
The earlier `305c89c` smoke remains historical evidence. The MCP endpoint is
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
The [preservation report](validation/2026-11-02-primary-preservation.json) confirms
the primary eleven files and two other worktrees remained checksum-unchanged.

```text
C:\Tools\Dev\MTerm-CLI\artifacts\checkpoints\remote-sprint-2026-11-02T00-11-45-504Z
all-refs.bundle SHA-256:
0a54c68385246385b569c24f6455e49efb60fe16eb282b5ff967b49034f14cbb
manifest SHA-256:
0a5ab4011bad9b94b8d1d08b41a87d00d4ac18188ccfefca9ed4cd102d619c60
```

For that historical release, consult its report/PR for delivery and checkpoint
status. Current owner pairing is recorded above; client consent/tool use remains
pending under the documented plugin/browser restrictions. Continue unaccepted
parity issues without repeating completed setup, pairing or deployment work.
[execution/NEXT_PARITY_PROMPT.md](execution/NEXT_PARITY_PROMPT.md) is
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
credentials. The final code matrix now passes on all four runners; consult the final
report/PR for merge status. That result does not close full product/platform acceptance.

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
were integrated as separate commits. Final delivery and recovery-checkpoint state
are recorded in the final sprint report and PR #69.

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
and final Windows, package, managed Codex and hosted matrix results are recorded
above. See the foundation-portability change record for historical evidence and
the final sprint report/PR for delivery status.
