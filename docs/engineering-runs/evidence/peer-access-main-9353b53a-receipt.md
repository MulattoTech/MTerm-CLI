# Actual main qualification: MTechLabs-Access PR27

**PASS — actual main `9353b53a15cf50b67f4e9d452935e58a0bc9b8f3`**, tree `a78d085222d478f0def630acd198289c458b189f`. The merge has ordered parents `ef8dce0e1863e63958c4421e8506c9bdb5e881e0` and `162e829a5f30282ba86f32dd48cc004b76ad6ebc`, and its tree exactly equals the independently reviewed candidate. PR27 merged at 2026-11-12T20:16:36Z. Main still resolved to this exact commit at the final read.

Fresh push run [43298684034](https://github.com/MulattoTech/MTechLabs-Access/actions/runs/43298684034), attempt 1, completed successfully. Every job checked out actual main, ran Node 24.22.2/npm11.19.1, and completed every step successfully. Tests have zero failures, cancellations or skips.

| Job | Passed / total | Result |
| --- | --- | --- |
| managed-mcp | 115 / 115 | success |
| test | 123 / 123 | success |
| Upstream qualification / windows-latest / Node 24 | 115 / 115 | success |
| managed-mcp-windows | 115 / 115 | success |
| Upstream qualification / ubuntu-latest / Node 24 | 115 / 115 | success |

## Real upstream behavior

All four platform/version lanes (Linux and Windows, each with control 0.3.1 and candidate 0.3.3) passed all ten exact stages: initialization; full 53-tool contract; owned configuration; Unicode file operations; read-only permission denial; content-search completion and three-page 2/2/2 coverage; exact shell blocklist denial; bounded process output and owned tree cleanup; PDF creation/readback; and released admission.

PDFs measured 13,242 bytes per Linux lane and 19,629 bytes per Windows lane. Every lane records gateway exit code 0, upstream exited, and owned process tree exited. The exact source pass predicate also requires no termination signal and no uncertain process cleanup. Raw PDFs/process outputs are not retained; those behavioral claims are bounded by the unchanged harness assertions and reports.

Both downloaded artifact ZIPs independently match GitHub SHA256 metadata and upload logs; all 20 report files are retained. Independent comparison confirms all 53 non-description tool-contract fields identical between 0.3.1 and 0.3.3; only kill_process description differs. Installed entry/manifest/lock digests match the reviewed candidate, including independently reconciled Windows CRLF lock bytes. Native ripgrep hashes match previously verified published binaries.

## Scope

Source qualification only. No deployment, production restart, public remote OAuth, paid model call, Docker/macOS or full mission acceptance occurred. No remote mutation, CI rerun, source edit or local upstream execution was performed during this verification.

Full logs: 165864 bytes. Machine receipt SHA256: `5d9308cc52401a16d500e92a6c8a083c49e1d5fe202e2b3eb9778e3105f504db`.
