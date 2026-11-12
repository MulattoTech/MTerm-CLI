# Actual main qualification: MTerm-CLI PR257

**PASS — actual main `f447c0baac3f36470d6fd96360928c6a2a192c4b`**, tree `cbb3b682c4bfdf472bdfbc1ebfce5cd2e71174fc`, matches the independently reviewed candidate. Ordered parents are `4fb205088e77731e42da5adaca6bf167f8b75194` and `b0348d901b27975789d8764397a103204e08aaf0`. PR257 merged at 2026-11-12T20:50:24Z. Main remains exact on the final read.

| Check | Source pass / total | Source skips | Installed profile tests | Result |
| --- | --- | --- | --- | --- |
| CI / fast | 1383 / 1395 | 12 | — | success |
| Native Linux isolation / Node 24 | 12 source + 12 installed live scenarios | 0 live skips | 24 | success |
| macos-15 / Node 24 | 1383 / 1395 | 12 | 24 | success |
| macos-15-intel / Node 24 | 1383 / 1395 | 12 | 24 | success |
| ubuntu-24.04 / Node 24 | 1383 / 1395 | 12 | 24 | success |
| windows-2022 / Node 24 | 1395 / 1395 | 0 | 24 | success |

Both fresh main push runs (43304263686 and 43304263698), attempt 1, passed all six jobs and every step. Windows passed all 1,395 source tests; other source lanes passed 1,383 with the same 12 Windows-only skips. No failures, cancellations or TODOs occurred. Hosts used pinned Node 24.21.0; the native guest version is independently recorded.

All five package lanes passed installed profile, compatibility, policy, recovery, 31 synthetic isolation-protocol and 18 provenance tests outside the checkout. License records cover five runtime packages and six edges; retained license bytes match the reviewed candidate. Full transitive license clearance and full Desktop Commander parity remain false. All four real Codex 0.160.1 registration/configuration/shutdown lanes passed with zero model calls and no real-user config change. Actual Codex-agent tool invocation remains unclaimed.

The native artifact ZIP matches both GitHub metadata and the upload log; raw TAP, source/installed live receipts, cleanup, signed runtime bootstrap and retained notices received separate independent review. Every build executed the capability-register validator, preserving 143 product rows, all 488 mission/272 feature bullets, 11 governance groups and separate CLI300/DCP48/WEB12/AUG117 baselines. The dated register still grants zero whole-requirement completion on all five axes.

Full decoded logs: 5024994 bytes. Receipt SHA256: `6abf0091556faf97745c66932ddad8f8ae7360580ee28fbee3cda2067b0404d7`. No source edits, GitHub mutation, reruns, local runtime execution or production action occurred during verification. Deployment and broader mission acceptance remain separate.
