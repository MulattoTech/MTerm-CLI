# Capability register document and crosswalk review

Read-only review of the evolving `MTerm-CLI-Register` worktree on 2026-11-12. This is a document/data review, not approval of an immutable commit. The sampled `docs/capabilities/register.json` SHA-256 was `824c2eb2e21c0dff61756bb78313f70a9d7586a49d73c03151da165afdca6209`.

## Finding requiring correction

At `docs/capabilities/register.json` lines 26256, 26258 and 26261, three limitations describe an earlier scratch-only state without consistently identifying that state as historical:

- The scratch-only/no GitHub changes statement conflicts with the recorded six created issues and fourteen verified existing-issue addenda.
- The statement that PR #249 is published but unmerged and its qualification is unestablished conflicts with the later qualified delivery observation for main `83a97daed6ef92b69e681b6b68f982f5d4266a51`.
- The statement that the separate #250 profile implementation is not incorporated as source evidence conflicts with references to the two immutable PR #256 profile candidates.

The narrow fix is to label these statements with their historical observation time, or replace them with current limitations that explain the subsequent delivery observations. Preserve the historical candidate observations; do not change whole-requirement acceptance. This finding was sent directly to the implementation owner.

## Evidence reference observation

`evidenceSources.architecture.artifact` is the bare filename `architecture-audit.json`, while the checked-in artifact resides under `docs/engineering-runs/evidence/architecture-audit.json`. The `bridge_upstream.runtimeMatchEvidence` text repeats the bare filename. Explicit repository-relative paths and byte hashes would make these source observations directly reproducible. Parent architecture review owns the broader validation and fingerprint-binding finding; this note does not duplicate that review.

## Checks with no blocker found

- The archived mission is byte-identical to the original uploaded document and matches its declared SHA-256 and 1,061-line count.
- An independent bullet-line scan finds 488 bullet lines. Crosswalk lines match exactly, without missing or extra lines.
- All 272 product crosswalk target sets match the requirement rows that cite those bullets. The remaining 216 bullets have run-obligation/discovery classification.
- All four baseline catalog files match their declared hashes: CLI 300, DCP 48, WEB 12 and AUG 117. These denominators remain separate.
- All 56 source files carrying hashes in MTerm-CLI evidence groups match their pinned Git blobs exactly.
- All 62 declared source-file URL identities checked against their repository, immutable ref and path agree.
- All 143 acceptance-owner issues resolve consistently through the issue index, linked issue records, URL and recorded state.
- Current whole-requirement code-complete, tested, merged, deployed and accepted flags are all zero. No current row awards false whole-requirement acceptance. The generated report explicitly distinguishes partial observations and qualified partial delivery from whole acceptance.
- One mission prose citation removes Markdown bold delimiters, without changing its text or meaning; no correction needed.

## Limits

This review checked frozen source identity and current data consistency. It did not query live GitHub again, authenticate external evidence claims, run package/build/test gates, inspect every feature's behavior, or approve evolving validator code. Parent architecture review separately covers validator acceptance, layer/repository bindings, required CI-check names, dependency enforcement and inclusion of evidence bytes in the reviewed-source fingerprint. No repository files, dependencies, production settings or runtime processes were changed by this review.
