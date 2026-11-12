# Integrated candidate qualification: MTechLabs-Access PR27

**PASS — exact candidate `162e829a5f30282ba86f32dd48cc004b76ad6ebc`**, tree `a78d085222d478f0def630acd198289c458b189f`. Ordered parents are `0f30a256a56d951595be4abf9791f74f30cb251a` and actual upstream main `ef8dce0e1863e63958c4421e8506c9bdb5e881e0`. The hosted PR merge `9ff1ded63eca0a2caa67f59e4bbd283a952b9252` has the exact candidate tree and parents main plus candidate.

Fresh pull-request run [43297975722](https://github.com/MulattoTech/MTechLabs-Access/actions/runs/43297975722), attempt 1, completed successfully. Every job checked out the exact verified PR merge, ran Node 24.22.2/npm 11.19.1, and completed every step successfully. Tests have zero failures, cancellations or skips.

| Job | Passed / total | Result |
| --- | --- | --- |
| test | 123 / 123 | success |
| Upstream qualification / windows-latest / Node 24 | 115 / 115 | success |
| managed-mcp | 115 / 115 | success |
| Upstream qualification / ubuntu-latest / Node 24 | 115 / 115 | success |
| managed-mcp-windows | 115 / 115 | success |

## Real upstream behavior

All four platform/version lanes (Linux and Windows, each with control 0.3.1 and candidate 0.3.3) passed all ten exact stages: initialization; full 53-tool contract; owned configuration; Unicode file operations; read-only permission denial; content-search completion and three-page 2/2/2 coverage; exact shell blocklist denial; bounded process output and owned tree cleanup; PDF creation/readback; and released admission.

PDFs measured 13,242 bytes per Linux lane and 19,629 bytes per Windows lane. Every lane records gateway exit code 0, upstream exited, and owned process tree exited. The exact source pass predicate also requires no termination signal and no uncertain process cleanup. Raw PDFs/process outputs are not retained; those behavioral claims are bounded by unchanged harness assertions and reports.

Both downloaded artifact ZIPs independently match GitHub SHA256 metadata and upload logs; all 20 report files are retained. Independent comparison confirms all 53 non-description tool-contract fields identical between versions; only kill_process description differs. Installed entry/manifest/lock digests match prior reviewed upstream bytes, including Windows CRLF lock conversion. Native ripgrep hashes match previously verified published binaries.

The jobs.mjs and job-authorization.test.mjs hashes still exactly match the prior independent frozen patch review. Linux and Windows both passed the complete integrated 115-test manager suite. The immutable code review remains a separate gate.

## Scope

Candidate source qualification only. A normal expected-head merge and fresh actual-main qualification are still required. No deployment, production restart, VM provider execution, public remote OAuth, paid model call, Docker/macOS or full mission acceptance occurred. No remote mutation, CI rerun, source edit or local upstream execution was performed during this verification.

Full logs: 171263 bytes. Machine receipt SHA256: `3040ae584a65eddf7893e3c6c4ea85e26bcde5fbe7824218ad0b5c48dbac973d`.
