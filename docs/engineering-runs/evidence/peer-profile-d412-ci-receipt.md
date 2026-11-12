# Independent candidate CI receipt — PR 256

**All six candidate checks passed.** Candidate `d412b7748ad6747f0b7fbc670e6ec252b74ebdf5`, tree `a41dd2124f4f9106ae86fbd6c42022bf44a9f9c3`.

GitHub executed PR merge-ref `dfbda6e14f94e62d9f6095a848dc185ee6181b0d`; its tree is exactly the reviewed candidate tree, with parents 83a97dae and d412b774. This is candidate qualification; actual main must be checked after merge.

| Check | Job ID | Source pass / total | Source skips | Installed profiles | Result |
|---|---:|---:|---:|---:|---|
| CI / fast | [131379020081](https://github.com/MulattoTech/MTerm-CLI/actions/runs/43274453513/job/131379020081) | 1363 / 1375 | 12 | — | Success |
| Native Linux isolation / Node 24 | [131379215086](https://github.com/MulattoTech/MTerm-CLI/actions/runs/43274453565/job/131379215086) | 12 live source + 12 live installed | 0 live skips required | 24 | Success |
| macos-15 / Node 24 | [131379215921](https://github.com/MulattoTech/MTerm-CLI/actions/runs/43274453565/job/131379215921) | 1363 / 1375 | 12 | 24 | Success |
| macos-15-intel / Node 24 | [131379215748](https://github.com/MulattoTech/MTerm-CLI/actions/runs/43274453565/job/131379215748) | 1363 / 1375 | 12 | 24 | Success |
| ubuntu-24.04 / Node 24 | [131379215585](https://github.com/MulattoTech/MTerm-CLI/actions/runs/43274453565/job/131379215585) | 1363 / 1375 | 12 | 24 | Success |
| windows-2022 / Node 24 | [131379215599](https://github.com/MulattoTech/MTerm-CLI/actions/runs/43274453565/job/131379215599) | 1375 / 1375 | 0 | 24 | Success |

The non-Windows source suites have 12 explicit Windows-only skips. Windows has none. Every completed source suite has zero failures or cancellations. Each package job executes all 24 installed profile cases outside the checkout, and the verifier requires zero failures, cancellations, skips and TODOs.

The native Linux source and installed runs each passed all 12 actual containment scenarios, with cleanup verified for every scenario. Synthetic protocol tests remain separate. Host Node was 24.21.0 and native guest Node 24.22.2. The three installed profile module hashes also match the independent local build.

All four platform jobs passed packed install, isolated npm link/offline execution, managed Codex registration and shutdown, and unchanged-source checks. Managed Codex used version 0.160.1 with zero model calls and no real-user configuration change. The package receipts retain five production packages and six edges; full transitive license clearance and full Desktop Commander parity remain unaccepted.

All six complete decoded logs are preserved (4,964,446 UTF-8 bytes), with hashes and detailed step/test receipts in `peer-profile-d412-ci-receipt.json` and `peer-profile-d412-evidence/`. No deployment, live remote enrollment or production credential operation is claimed.
