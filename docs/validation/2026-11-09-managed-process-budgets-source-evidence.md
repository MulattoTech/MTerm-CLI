# Managed process-budget source evidence — 2026-11-09

**Source results: the first baseline produced 4 passes and 7 intended capability failures; the worker’s focused run passed 56/56; the independent peer run passed 11/11. Final independent source review is CLEAR.** All three are separate captured observations. The baseline remains intact.

**This record awards source credit only.** Normal reviewed-build and roadmap gates, native pinned Codex parsing, installed-package qualification, hosted candidate/main checks and delivery require their own subsequent records.

## Compact index and exact full evidence

[Source evidence index](2026-11-09-managed-process-budgets-source-evidence.json) is the canonical small JSON summary with execution/review identities and all 83 original document inventory entries. Its SHA256 is `d3155386c469a1f54d2998f8ef0aadcf1b446325c1db9ae04d1f3168740f9461`.

[Complete original source record](2026-11-09-managed-process-budgets-source-evidence-full.json.gz) is deterministic gzip with mtime 0. It decompresses to the exact original **6,711,412 bytes**, SHA256 `ca90ea3e09e7025f6694cb3b22a2edbdb8d27f76d958dd42bfb5cc37378683e0`. Compressed size: 1,598,555 bytes; compressed SHA256 `2934559836d8d89f4fef451303ad95e32020e9cf4d6a80f50df1163579f8d531`. No full-record byte was rewritten or omitted.

After decompression, parse the JSON and resolve each `documentSha256` reference through `documents`. The registry holds 83 exact original UTF-8 documents, including complete parsed values for all 45 JSON records. It includes every freeze/receipt/input-binding map, preparation output and independent review, including the unexecuted runner revisions and the explicit v3 supersession. Original hashes bind the preserved text, not a reformatted representation.

The accompanying support archive preserves 565 unique source/input/document blobs. Its exact original byte index is `inputArchive.contents` in the full record. All three raw TAP archives and this support archive are copied byte-for-byte from v1. The attribution supplement below must accompany the support archive.

## Actual executions

| Observation | Result | Node exit | Inputs | Start UTC | Receipt SHA256 |
| --- | --- | ---: | ---: | --- | --- |
| First valid baseline | 11 tests; 4 pass / 7 fail | 1 | 524 | `2026-11-09T23:17:31.951245+00:00` | `be2f8e6d89809d735d51dec2237f09d332d8798c88717c6467e6d8b9b00d475b` |
| Worker focused source | 56 tests; 56 pass / 0 fail | 0 | 540 | `2026-11-09T23:25:04.022751+00:00` | `4b6eb2cf17687f0747d50728fdd2a7db838bc89b5651b66963f587392e9cbf9b` |
| Independent peer source | 11 tests; 11 pass / 0 fail | 0 | 544 | `2026-11-09T23:36:42.451520+00:00` | `8d7dd62410c0129a5a85b3b46709a85009dcfd87d8a5424d91938c9284f27384` |

All three actual Node captures retain complete raw output, empty stderr, zero skipped/cancelled/todo cases and no capture timeout, truncation, interrupt or requested outer termination. Input copies and full post-run maps match the original freezes.

**Focused-run reporting boundary:** the original worker56 tool response was context-truncated. The saved Node receipt, raw TAP and all 540 input bindings were independently recovered and verified without replay. The final printed driver summary and outer driver exit remain UNKNOWN. The separate peer11 run directly captured both Node exit 0 and driver exit 0; it does not retroactively fill the earlier reporting gap.

## Capability, chronology and review

The fixture was frozen before implementation at b7b97daa, with all 858 original base blobs unchanged. The valid first baseline established the intentional unsupported-capability RED. Case 7 persistence and case 11 SDK were actually NOT_REACHED at that point. Root then authorized implementation. Clean source4076 existed before the focused56 execution; docs-only53b2 was committed afterward and preceded the independent11 run. The new fixture stayed byte-identical throughout.

The planner snapshots the selected policy once and reuses the existing strict parser before the first root-validation await. Omission preserves the old argv/hash; explicit{} serializes defaults. Canonical JSON preserves large decimal disk strings and normalized key order. Changed budgets retain the deliberate-removal conflict. Only the managed budget refusal and one legacy support assertion transitioned; all other 23 resource cases remain intact.

Each passing dedicated fixture records 14 naturally closed CLI children, 23 equal manifest intervals across 38 snapshots, and one actual read-only SDK session. The SDK receives the selected budget from successful CLI preview argv, exposes ten read-only tools, actually rejects start with protocol code -32602, creates no marker and closes normally. Internal injected-table cases establish ownership/journal/backup behavior; actual native Codex TOML acceptance remains separate.

Final independent source review is `CLEAR_SOURCE_IMPLEMENTATION_AND_INDEPENDENT_SOURCE11`, with no open findings; original JSON SHA256 `2e5f7371617eb639687904111c929abfda523886805a5568a1643955e1763677`. Every original review, its historical status and the v3 hold/supersession are preserved in the full record. Pre-run runner refinements were never executed or relabeled as product failures.

## Exact archive files

| File | Compressed bytes | Compressed SHA256 | Uncompressed SHA256 |
| --- | ---: | --- | --- |
| [2026-11-09-managed-process-budgets-source-evidence-full.json.gz](2026-11-09-managed-process-budgets-source-evidence-full.json.gz) | 1598555 | `2934559836d8d89f4fef451303ad95e32020e9cf4d6a80f50df1163579f8d531` | `ca90ea3e09e7025f6694cb3b22a2edbdb8d27f76d958dd42bfb5cc37378683e0` |
| [2026-11-09-managed-process-budgets-baseline11.tap.gz](2026-11-09-managed-process-budgets-baseline11.tap.gz) | 7856 | `14d88a9d57ea773ef77a495dc11f9b77b621189d7b64edabff295976f81a7430` | `35687c1323ea69801673ffa3f1e2da36e775a9d776309a5581b107168b1e92e8` |
| [2026-11-09-managed-process-budgets-worker56.tap.gz](2026-11-09-managed-process-budgets-worker56.tap.gz) | 12414 | `37de4cfc1944e9cebd6fcc591a57926ba9d0a8937896a70b106744100092fc2f` | `964a4d945efb98febff0bbadf96087848b13cb7035fbb0dc71f04b73967408ff` |
| [2026-11-09-managed-process-budgets-peer11.tap.gz](2026-11-09-managed-process-budgets-peer11.tap.gz) | 9919 | `2e2ddff10c843a500129adc93068b04d67f47fdd4fa0892d71888c1ca83438c9` | `40d0ce7ecb0ac46582c854ce93b4fa333251d577adcb334b60f4f4aa03ca1bb0` |
| [2026-11-09-managed-process-budgets-source-support.tar.gz](2026-11-09-managed-process-budgets-source-support.tar.gz) | 2603488 | `0317043513de57397a4ef7ed054c192bc223a0b7017cf0c4276da0229adc1bed` | `5a2197034d189fdd5720dfc0c6c885fe24fb6fe81c10d68ed371dd31233b1c2d` |
| [2026-11-09-managed-process-budgets-source-attribution.tar.gz](2026-11-09-managed-process-budgets-source-attribution.tar.gz) | 28161 | `e6ef82e1e8fdb4401a54ed6c46ed3acec49c3049d6a9985fd5eaa58a22ac9eef` | `5cf38b7d92b3cfb69c06ad19a5c79f3830e8d3878e56f9b09931f96bf9f5cea2` |

## Archive attribution supplement

[Attribution inventory](2026-11-09-managed-process-budgets-source-attribution.json), SHA256 `7b06653188bfcaa9b31b34b57e20a93b1e4204700f4d16bb9f152f694e5e49ca`, records a recursive local inspection of all **14 actual pinned package directories** and all **15 existing package LICENSE/NOTICE paths**. [Exact attribution files](2026-11-09-managed-process-budgets-source-attribution.tar.gz) retain them under their original relative paths, plus parent LICENSE, THIRD_PARTY.md and the existing pinned SDK embedded-component review.

The full original SDK Apache/MIT/documentation transition, NOTICE-MTERM modification/embedded-component notices and all copyright text are preserved without rewriting. Existing parent notice/review scope is retained; this is not a new generalized license-admission or complete SPDX claim.

Four license paths were outside the original execution-file filter: jose/LICENSE.md and the lowercase licenses for path-key, shebang-command and shebang-regex. They are added solely as archive attribution. The executed input counts remain exactly **524 / 540 / 544**; no receipt, freeze or original test result changes.

The first compact-presentation attempt stopped while summarizing a decoded-diagnostic JSON array as an object. Its actual offline exit1, script and partial outputs are preserved; the selected presentation applies a type guard only to derived inventory metadata. No product/fixture rerun or original evidence change occurred.

Both original development-build warnings remain in the preserved preparation streams. No test, product/build/install command, network call, tracked edit or commit was performed for this compact presentation or attribution supplement. Root owns review/copy and any later qualification. CLI-292/259/286 stage/weight/acceptance and complete AUG/DCP acceptance remain unchanged here.
