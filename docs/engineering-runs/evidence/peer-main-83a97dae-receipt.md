# Actual-main qualification receipt — PR #249

**Verified: all six actual-main jobs completed successfully.** This receipt concerns source and CI qualification, with no production deployment or broad feature acceptance claimed.

- Main commit: `83a97daed6ef92b69e681b6b68f982f5d4266a51`.
- Main tree: `c4d2c52442daf652af4323827cda91b6f32cd538`.
- Merge parents: `cbfd29039fe84cd163a86090c8bcbffaa2b40174` and `09097ee82028ce01e069c6d555e7ab65b8add2e0`.
- Final candidate: `09097ee82028ce01e069c6d555e7ab65b8add2e0`; its tree exactly matches the merge tree.
- Observation: 2026-11-12 17:44:21 UTC. GitHub still identified this SHA as main.
- PR #249 is merged. Follow-up dispositions independently verified at 17:46:56 UTC: PR #244 and draft PR #245 are closed, both unmerged; issue #248 is closed as completed. Their closure times are 17:45:30, 17:45:32 and 17:45:33 UTC, respectively.

## Actual-main runs and test results

Both runs were triggered by the **push to main** and identify the exact merge SHA:

- [CLI fast checks — 43270370795](https://github.com/MulattoTech/MTerm-CLI/actions/runs/43270370795): success.
- [CLI compatibility foundation — 43270370658](https://github.com/MulattoTech/MTerm-CLI/actions/runs/43270370658): success.

| Check | Job | Source test results |
| --- | --- | --- |
| CI / fast | [131364979582](https://github.com/MulattoTech/MTerm-CLI/actions/runs/43270370795/job/131364979582) | 1339 passed / 12 skipped / 0 failed |
| ubuntu-24.04 / Node 24 | [131364980353](https://github.com/MulattoTech/MTerm-CLI/actions/runs/43270370658/job/131364980353) | 1339 passed / 12 skipped / 0 failed |
| windows-2022 / Node 24 | [131364980007](https://github.com/MulattoTech/MTerm-CLI/actions/runs/43270370658/job/131364980007) | 1351 passed / 0 skipped / 0 failed |
| macos-15 / Node 24 | [131364980383](https://github.com/MulattoTech/MTerm-CLI/actions/runs/43270370658/job/131364980383) | 1339 passed / 12 skipped / 0 failed |
| macos-15-intel / Node 24 | [131364980065](https://github.com/MulattoTech/MTerm-CLI/actions/runs/43270370658/job/131364980065) | 1339 passed / 12 skipped / 0 failed |
| Native Linux isolation / Node 24 | [131364979557](https://github.com/MulattoTech/MTerm-CLI/actions/runs/43270370658/job/131364979557) | 12 real source + 12 real installed; all passed and cleaned |

Each ordinary source suite contains 1,351 tests. Windows ran all 1,351 with no skips. The other source lanes each report 12 explicit Windows/PowerShell availability or Windows alias skips; their names are preserved in the JSON receipt. Do not sum repeated platform executions into a count of unique tests. All source suites report zero failures, cancellations and todos.

All GitHub job steps completed successfully, including source/roadmap/parity review, typecheck/formatting where applicable, and the final unchanged-source check. The full decoded logs for all six jobs were retrieved and retained with SHA-256 hashes, totaling 4,930,304 bytes. Source counts are read from those logs, not inferred solely from green check marks.

## Installed-package and registration gates

All four platform jobs and the dedicated native-isolation job passed the packed-install verifier. Receipts confirm the packaged MCP round trip, isolated npm link, offline invocation from the tarball, outside-checkout verification, and no changes to the user's global npm prefix.

The following installed test-group counts are identical across those five jobs. Every listed group reports zero failures, skips and cancellations:

| Installed group | Tests per job | Failed / skipped / cancelled |
| --- | ---: | --- |
| Optional packs | 29 | 0 / 0 / 0 |
| Pack update checks | 42 | 0 / 0 / 0 |
| Registry persistence | 41 | 0 / 0 / 0 |
| Resource budgets | 35 | 0 / 0 / 0 |
| Process stop recovery | 5 | 0 / 0 / 0 |
| Git boundaries | 36 | 0 / 0 / 0 |
| File cancellation | 46 | 0 / 0 / 0 |
| Move cancellation | 18 | 0 / 0 / 0 |
| Run-lock recovery | 16 | 0 / 0 / 0 |
| State-lock recovery | 24 | 0 / 0 / 0 |
| Remote admission | 8 | 0 / 0 / 0 |
| Provenance | 18 | 0 / 0 / 0 |

The installed isolation protocol group has 31 synthetic protocol tests. Its Linux live qualification is separate and described below. Four platform jobs also passed real Codex 0.160.1 registration and shutdown checks using a test-owned prefix, with no login or model calls. The receipts report no changes to real user configuration and no actual Codex agent/model invocation.

The installed provenance gate verifies five runtime packages and six dependency edges, including the exact-pinned Acorn parser. Its success retains `productionRedistributionEligible: false` and `fullTransitiveLicenseClearance: false`; it does not clear the separate pending rights review.

## Native Linux containment and cleanup

Job 131364979557 ran mandatory live verification twice: against reviewed source and against the actual installed package. Each receipt binds to `83a97daed6ef92b69e681b6b68f982f5d4266a51`, reports 12/12 scenarios passed, and confirms cleanup for every scenario. Both executions ran from outside the checkout. The host runtime was Node 24.21.0 and the pinned guest runtime reported Node 24.22.2.

The successful exact-source verifier explicitly requires 12 tests, 12 passes, 0 failures, 0 skips and 0 cancellations before emitting each receipt. Full job logs and structured receipts were independently retrieved; the raw TAP artifacts referenced by their hashes were not independently downloaded. This is live containment evidence for the exercised Linux profile, without awarding complete product acceptance or qualifying Windows native containment.

## Accurate supersession and issue closure

The implementation owner closed **PR #244 and draft PR #245 as superseded by PR #249** after all checks passed. Independent API reads confirm both are closed and `merged: false`; they were not individually merged by GitHub.

- #245's exact head `1bf3efca0b112395c01d46ed52cd4ea6f75c2257` and #244's original foundation `229235dfb20ed8ca998138d54168979f384665fa` are ancestors of main.
- #244's final head `33b80d1ec4c4f9226f8301ea61aba4edc2379685` is not an ancestor. Its two unique changes—critical review findings fail the result, and emergency halt includes checkpointed records—are present, along with the strengthened review assertion.
- Issue #248 is closed as completed for its **scoped integration and boundary controls**, citing this merge and these runs. Parent epic #81 and unimplemented LSP, cloud-model, durable-fleet, transaction and production integration requirements remain separate.

No branch deletion or repository/GitHub mutation was performed by this reviewer. The implementation owner reports that the original branches were retained; this reviewer verified the PR/issue dispositions and ancestry, without a separate branch-retention query. The original histories and evidence remain available.

## Evidence

The machine-readable companion is `peer-main-83a97dae-receipt.json`. Full logs, parsed receipts, job metadata and hashes are retained in `peer-main-83a97dae-evidence/`. The prior immutable source review applies to `f3e9615`; the final candidate's bounded license-verifier correction was independently reviewed by the architecture peer and was also inspected for this receipt. No application source changed in that correction.
