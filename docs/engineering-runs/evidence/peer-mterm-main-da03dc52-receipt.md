# Actual main qualification: MTerm-CLI PR258

**PASS — actual main `da03dc5255976b1524b22796fffadb01e50a5149`**, tree `2ee6ecc09206ca3f8e64edc34635b3820383e00b`, exactly matches the independently reviewed and qualified candidate `01c0fc0dc236fbb09d0400f9119df9147c6580f7`. Ordered parents are `f447c0baac3f36470d6fd96360928c6a2a192c4b` then `01c0fc0dc236fbb09d0400f9119df9147c6580f7`. PR258 merged at 2026-11-12T21:25:04Z; main remained exact at the final API read.

| Check | Job ID | Source pass / total | Source skips | Installed endpoint cases | Result |
| --- | --- | --- | --- | --- | --- |
| CI / fast | 131503470666 | 1464 / 1476 | 12 | — | success |
| Native Linux isolation / Node 24 | 131503476921 | 12 source + 12 installed native | 0 live skips | 81 | success |
| macos-15 / Node 24 | 131503477324 | 1464 / 1476 | 12 | 81 | success |
| macos-15-intel / Node 24 | 131503477166 | 1464 / 1476 | 12 | 81 | success |
| ubuntu-24.04 / Node 24 | 131503477425 | 1464 / 1476 | 12 | 81 | success |
| windows-2022 / Node 24 | 131503477173 | 1476 / 1476 | 0 | 81 | success |

Fresh main push runs [43310056791](https://github.com/MulattoTech/MTerm-CLI/actions/runs/43310056791) and [43310058292](https://github.com/MulattoTech/MTerm-CLI/actions/runs/43310058292) both passed on attempt 1. All six jobs and every step succeeded. Windows passed all 1,476 source cases; the four other source lanes passed 1,464 with the same 12 Windows-only skips as the previously qualified source. There were zero failures, cancellations or TODOs. Hosts used Node 24.21.0; the native guest used Node 24.22.2.

All five package lanes executed 81 installed endpoint cases outside the checkout, using owned loopback TLS with no external endpoint or real credentials. All eight remote module hashes match the separate fresh compilation from the immutable reviewed source. Existing installed profile24, isolation-protocol31, provenance18 and other package case counts were preserved. Configuration, compatibility process shutdown, remote-state fixture cleanup and Windows DPAPI evidence passed. The standalone installed core stayed below 50 MB; bundled Node/Codex/WEB size and full-product size are separate.

All four Codex 0.160.1 host lanes passed registration, configuration, two registered-command SDK rounds, restart persistence, owned shutdown and removal checks, with no real-user configuration changes and zero model calls. No actual Codex agent tool invocation was performed. Five production-package license records, six edges, seven reference files, nine retained notices and 86 SDK artifact pins passed bounded provenance checks; full transitive clearance and redistribution eligibility remain unclaimed.

Fresh native artifact `aug005-linux-43310058292-1` (ID 13984689558, 252007 bytes) has SHA256 `0c142ec97f427d60d7a6d685769bc2a219fd5f7d0f2ad88964e83575529dbd49`, independently matching GitHub metadata and the upload log. All 45 extracted files match ZIP bytes. Raw source and installed TAP each pass 12/12, with all 24 cleanup receipts and 16 OOM probes verified. A separate native-review agent checked the Docker signing key, signed package index, three exact package pins and eight license/notice hashes using a fresh local GPG keyring.

The independent immutable source review binds all 1,033 files, 52 recomputed directory trees and 37 retained evidence records. Its earlier local full source/package gate outcomes remain failed with recorded Unix-socket listen EPERM; fresh hosted candidate and actual-main qualification preserve those records. The dated capability register remains unchanged in scope and awards zero whole-requirement completion.

Full decoded logs retained: 5082845 bytes. JSON receipt SHA256: `f65f4b6320984a752641047d999fcb95b9500416cc011b45395658d9b7d9dcee`. No source edits, GitHub mutation, reruns, local product-runtime execution, external probes, real credential use, model calls or production actions occurred during this qualification. Deployment and broader mission acceptance remain separate.
