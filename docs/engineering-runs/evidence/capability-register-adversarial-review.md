# Capability register: read-only adversarial review

## Scope

Reviewed the evolving `/workspace/scratch/a92a3aacdca1/MTerm-CLI-Register` worktree based on `d412b7748ad6747f0b7fbc670e6ec252b74ebdf5`. This is a working-tree review, **not final immutable-candidate approval**.

Read the validator, tests, build/check integration, reviewed-source inventory and capability documents. A delegated read-only peer checked mission/baseline/crosswalk/source/issue data. Executed only small in-memory mutations through the exported validator. No repository edits, installs, builds, normal gates or full suites were run by this reviewer.

## Findings and latest disposition

| Finding | Original behavior | Current reviewed state |
|---|---|---|
| Qualified source could be relabeled into another product/repository layer | A CLI source SHA with all five receipts relabeled managed_bridge awarded accepted=1, although that layer belongs to MTechLabs-Access. | Root added explicit evidenceKey, repository and product-layer binding. The independent 18:09:13Z probe now rejects this mutation while a valid synthetic receipt still passes. |
| Qualified partial delivery accepted arbitrary six check names | Substituting an unrelated check name retained qualified-partial credit. | Root added the expected check-name set. Independently rejected by the 18:09:13Z probe. |
| Final acceptance prerequisite | Earlier source only checked graph existence/cycles; the actively edited source gained the prerequisite gate before this review's first probe. | Independently rejects acceptance when a declared final prerequisite remains NOT_ACCEPTED. No unresolved finding. |
| Consumed evidence bytes are not bound into review | Delivery receipt JSON and upstream-research.json are loaded from docs/engineering-runs/evidence, outside review-source's selected roots; the register has no corresponding file digest binding. | Sent to root. A change to an unchecked receipt field or upstream capability definition can leave the reviewed-source fingerprint and generated report unchanged. Bind exact consumed evidence bytes/path in register.json, or include the specific immutable evidence inputs in the fingerprint. Avoid a broad directory rule that introduces generated-review cycles. |
| Delivery kind is not a closed enumeration | Replacing the qualified observation kind with QUALIFIED_ALL_PRODUCTION_DEPLOYED passes validation and is displayed in the report. It does not increase whole acceptance, but produces an unsupported status claim. | Still reproduced at 18:09:13Z. Reject unknown kinds and validate their state-specific fields. |
| Top-level limitations retain earlier present-tense state | Scratch-only/no GitHub changes, PR249 unmerged/unqualified, and profile source absent conflict with subsequently recorded issues, qualified main and profile candidate observations. | Peer sent root exact locations. Mark these explicitly historical/as-of, or replace with current limitations while preserving historical evidence. |

The byte-binding recommendation is a stale-input/coherence control. It is not a request for the validator to authenticate GitHub, cryptographically prove a reviewer's claim or replace behavioral qualification. The existing report's distinction between record coherence and truth is appropriate.

## Independent current-tree probe

Evidence: [capability-register-adversarial-probe.json](sandbox:/workspace/scratch/a92a3aacdca1/capability-register-adversarial-probe.json).

The selected source files were unchanged during the probe. Validator SHA-256 was:

```
0691556737638aff55e26c29d549d26f989632b67620ed295620554bf08d8800
```

| In-memory case | Result |
|---|---|
| Actual unmodified register | Valid; accepted=0, qualifiedPartialRows=19 |
| Valid synthetic full-scope receipts | Valid; accepted=1 in the disposable copy only |
| CLI auth SHA attributed to managed_bridge | Rejected with QUALIFICATION_SCOPE |
| Accepted row with unaccepted final prerequisite | Rejected with QUALIFICATION_SCOPE |
| Required main check replaced by unrelated name | Rejected with SOURCE_BINDING |
| Unknown delivery kind | Accepted; accepted=0 but arbitrary status text remains renderable |

Synthetic mutations never changed register.json or real acceptance records.

## Data and integration review

The document peer's independent checks found:

- Original mission archive is byte-identical to the supplied source; all 488 parsed mission bullet lines match the crosswalk.
- All 272 product-bullet target sets match the requirement backlinks.
- CLI300, DCP48, WEB12 and AUG117 retain their separate baseline hashes and denominators.
- All 56 hashed MTerm source files match their immutable Git blobs; 62 repository/ref/path URL identities agree.
- All 143 tracking issue owners agree with their indexed URLs and linked issue states.
- Actual code-complete, tested, merged, deployed and accepted counts remain zero.

Its detailed record is [capability-register-document-review.md](sandbox:/workspace/scratch/a92a3aacdca1/capability-register-document-review.md). These checks establish the current data's consistency, not freshness of live GitHub/deployment state or truth of future qualification receipts.

Build/check integration is appropriately development-only: normal build, check and prepack call the register check; build:code remains a development bypass already named as such. Adding docs/capabilities to reviewed source includes register, report and summary changes. The remaining evidence dependency gap is listed above.

The architecture artifact is referenced by a bare filename in evidenceSources.architecture.artifact and bridge_upstream.runtimeMatchEvidence; the actual repository path is `docs/engineering-runs/evidence/architecture-audit.json`. Use the explicit path together with a digest when implementing evidence binding.

## Final review boundary

No final approval is issued for this moving tree. Review the immutable candidate delta after root resolves the remaining metadata/input-binding notes and records applicable exact-head gate results. The approval must retain zero real whole-requirement acceptance unless independently established full-scope receipts are intentionally added.
