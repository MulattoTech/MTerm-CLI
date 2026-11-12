# Exact candidate qualification: MTerm-CLI PR258

**PASS — candidate `01c0fc0dc236fbb09d0400f9119df9147c6580f7`**, tree `2ee6ecc09206ca3f8e64edc34635b3820383e00b`, with single parent/base `f447c0baac3f36470d6fd96360928c6a2a192c4b`. Hosted pull-request jobs checked synthetic merge `1a548822f810bd55099d35ca4bcfff6ebd3de8da`, whose tree is exactly the candidate tree and whose ordered parents are base then candidate. Candidate, base and open PR state remained unchanged at the final API read.

| Check | Job ID | Source pass / total | Source skips | Installed endpoint cases | Result |
| --- | --- | --- | --- | --- | --- |
| CI / fast | 131496611514 | 1464 / 1476 | 12 | — | success |
| Native Linux isolation / Node 24 | 131496611957 | 12 source + 12 installed native | 0 live skips | 81 | success |
| macos-15 / Node 24 | 131496611691 | 1464 / 1476 | 12 | 81 | success |
| macos-15-intel / Node 24 | 131496612183 | 1464 / 1476 | 12 | 81 | success |
| ubuntu-24.04 / Node 24 | 131496612043 | 1464 / 1476 | 12 | 81 | success |
| windows-2022 / Node 24 | 131496611423 | 1476 / 1476 | 0 | 81 | success |

The two canonical pull-request runs, [43308098622](https://github.com/MulattoTech/MTerm-CLI/actions/runs/43308098622) and [43308098646](https://github.com/MulattoTech/MTerm-CLI/actions/runs/43308098646), both passed on attempt 1. Every step succeeded. Duplicate push checks were excluded from the canonical six. Windows passed all 1,476 source cases; the four other source lanes passed 1,464 with the same 12 Windows-only skips as the prior qualified candidate. There were zero failures, cancellations or TODOs. Hosts used Node 24.21.0; the native guest used Node 24.22.2.

All five package lanes executed 81 installed endpoint cases outside the checkout, using owned loopback TLS with no external endpoint or real credentials. All eight remote module hashes match the separate fresh compilation from the immutable reviewed source. Existing installed profile24, isolation-protocol31, provenance18 and other package case counts were preserved. Configuration, compatibility process shutdown, remote-state fixture cleanup and Windows DPAPI evidence passed. The standalone installed core stayed below 50 MB; bundled Node/Codex/WEB size and full-product size are separate.

All four Codex 0.160.1 host lanes passed registration, configuration, two registered-command SDK rounds, restart persistence, owned shutdown and removal checks, with no real-user configuration changes and zero model calls. No actual Codex agent tool invocation was performed. Five production-package license records, six edges, seven reference files, nine retained notices and 86 SDK artifact pins passed bounded provenance checks; full transitive clearance and redistribution eligibility remain unclaimed.

Native artifact `aug005-linux-43308098646-1` (ID 13983309844, 251867 bytes) has SHA256 `21386c25ffcba9692217f0ea6ee8ddc0a74ce66732a3c6513eecaed9db3827fa`, independently matching GitHub metadata and the upload log. All 45 extracted files match ZIP bytes. Raw source and installed TAP each pass 12/12, with all 24 cleanup receipts and 16 OOM probes verified. The Docker signing key, signed package index, three exact package pins and eight license/notice hashes were checked using a fresh local GPG keyring. This agent performed that artifact review; no second native reviewer is claimed for this cycle.

The independent immutable source review binds all 1,033 files, 52 recomputed directory trees and 37 retained evidence records. Its earlier local full source/package gate outcomes remain failed with recorded Unix-socket listen EPERM; this hosted qualification does not rewrite those records. The dated capability register remains unchanged in scope and awards zero whole-requirement completion.

Full decoded logs retained: 5086962 bytes. JSON receipt SHA256: `97d356981e264a4d1905019f1c9409ef2d91a448eeb2947d12556b9c2b824dab`. No source edits, GitHub mutation, reruns, local product-runtime execution, external probes, real credential use, model calls or production actions occurred during this qualification. Actual-main qualification after a future merge remains separate.
