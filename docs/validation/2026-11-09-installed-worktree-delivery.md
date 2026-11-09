# Issue235 final source delivery

**The narrow ordinary-worktree qualification was delivered and accepted after separate candidate and actual-main audits.** Tracker closure occurred earlier, at merge time; it did not establish acceptance.

## Exact delivery and qualification

- Candidate: `fc9a0f58cde51b7f3143b0ed06e2fa04188d8b83`
- Actual main: `c351b6146ba1d3de4a1712a886dc7300ccdc3d70`
- Shared tree: `c82839e6b51182bcfc3820d65aabe4716c8491c4`
- Candidate audit: 89 checks; SHA256 `2ec43d446e36ef96724f0e142438e4045301a947502795139e454400be8ff504`
- Separate actual-main audit: 92 checks; SHA256 `c09bb685f159146a0456d35f922c88809127af2ca5a210e91c2d9c004c1331f6`

All six jobs passed in each evidence set, on attempt 1. Candidate runs 42698349128/42698348774 and main push runs 42700425677/42700426074 have distinct run/job identities. The audits bind 845 source blobs, 54 compiled files and 881 remote tree entries. Root independently rehashed 81 candidate and 86 main evidence files.

Each full source lane ran **1,263 tests**: Windows passed all 1,263; the other four lanes passed 1,251 with the same 12 existing Windows-only skips. All 525 required titles passed exactly once per full lane. All five normal package lanes established **installed Git24**, retaining the original 18-case fixture and adding six ordinary-worktree cases with exact source/module hashes and all required observations. Four owned native Codex registration/MCP checks used zero model calls.

Fresh native source12, installed12 and protocol31 raw TAP passed separately for candidate and main. The main ZIP is 250,993 bytes; SHA256 `67442b6b84e073f1dfe82f987d5382a15844a8968990e8c69e438a3bdc7d7bbc`.

## Tracker chronology

| Event | Recorded UTC time |
| --- | --- |
| PR236 merged | 2026-11-09 21:13:15 UTC |
| Issue235 marked closed | 2026-11-09 21:13:17 UTC |
| Independent actual-main seal | 2026-11-09 21:22:30 UTC |
| Root final main verification | 2026-11-09 21:23:32 UTC |
| Final narrow acceptance | 2026-11-09 21:24:03 UTC |
| Implementation claim released | 2026-11-09 21:24:04 UTC |
| PR wording corrected | 2026-11-09 21:28:17 UTC |
| Tracker correction comment | 2026-11-09 21:28:18 UTC |

Closing event 35615122126 has `commit_id:null`; **the cause is unproven**. A closing-keyword sequence in the original negative PR sentence is a plausible automatic trigger. The original wording is preserved, and the final PR body exactly matches the recorded correction.

The later state update returned the earlier closure timestamp. The final observed timeline contains one closure and no reopening; no later reclosure is invented. [Acceptance](https://github.com/MulattoTech/MTerm-CLI/issues/235#issuecomment-6751837057) followed main qualification and root verification. [The claim](https://github.com/MulattoTech/MTerm-CLI/issues/235#issuecomment-6750304459) was then released with its original text preserved. [The correction](https://github.com/MulattoTech/MTerm-CLI/issues/235#issuecomment-6751924706) records the discrepancy.

## Preserved evidence and limits

The initial source result remains honest 6/6 GREEN on unchanged production. Independent peer 6/6 and root 32/32 are separate executions. The first root wrapper remains **UNKNOWN/unqualified**. Local installed24 remains **NOT RUN**: two offline setup failures occurred before tests, and no third install followed the missing-metadata preflight. Seven normal root gates and two later documentation checks retain their successful receipts.

Raw installed Git24 TAP is absent from the uploaded native archive. Actual normal-verifier receipts and exact assertions establish the installed results; no unavailable TAP bytes are claimed as independently rehashed. Runtime binary and DEB bytes are also absent, and signature verification was not re-executed. Outer package runtimes remain retained; native owned-container cleanup is separately scoped.

Parser V3 normalizes only CRLF in the parsing view. Raw bytes/BOMs and V1/V2 history remain intact. Before/after manifests and owned child closure do not prove continuous immutability, a whole process tree or an independent OS listener census.

Protected 300-row fields, seed and stages remain unchanged for this delivery: 29.36% maturity; 0 complete, 45 blocked and 126 not started; DCP 0/48 and WEB 0/12. Narrow issue acceptance adds no roadmap stage credit. Fresh reads confirm broader issue66 and provider/connected-cleanup issue232 remain open. No provider, connected Windows, deployment, production bridge or paid/model operation belongs to this delivery; hosted Windows fixtures do not establish owner-workstation cleanup.

## Preservation

The pending-main draft is unchanged, SHA256 `d3da23ed119ee66c52510e2ea272a47e29cb38f43781a94429876fb5395c41b3`. The new JSON preserves its original candidate/source summaries and adds main qualification, root rechecks and a compact final tracker readback.

Root's live workspace has begun issue237. Historical issue235 source is therefore bound to immutable main Git objects and the retained frozen verifier. This assembly rehashed 185 distinct referenced files with no mismatch, without product tests, tracked edits or remote mutations.

Machine-readable record: [2026-11-09-installed-worktree-delivery.json](2026-11-09-installed-worktree-delivery.json)

SHA256: `1a725c1106e335a53cc5d352bbae7461f827d32bd0962acf4f09c708116b630d`
