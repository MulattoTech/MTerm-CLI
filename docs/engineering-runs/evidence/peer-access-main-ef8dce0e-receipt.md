# Actual main qualification: MTechLabs-Access PR24

**PASS — actual main `ef8dce0e1863e63958c4421e8506c9bdb5e881e0`**, tree `fe52f5d5720c6a34ee6bbec387b1dc098ea8f2d3`. The merge has ordered parents `499255adf0c3988558eb4b1dd04ee95ad3c7da33` and `4bd2b6bc5aeeec17e4b076eec4947081d2363c1d`, and its tree exactly equals the independently reviewed candidate. PR24 merged at 2026-11-12T20:05:30Z. Main still resolved to this exact commit at the final read.

Fresh push run [43296801071](https://github.com/MulattoTech/MTechLabs-Access/actions/runs/43296801071), attempt1, completed successfully. Every job checked out actual main, ran Node24.22.2/npm11.19.1, and completed every step successfully. Tests have zero failures, cancellations or skips.

| Job | Passed / total | Result |
| --- | --- | --- |
| test | 123 / 123 | success |
| Upstream qualification / windows-latest / Node 24 | 101 / 101 | success |
| managed-mcp | 101 / 101 | success |
| Upstream qualification / ubuntu-latest / Node 24 | 101 / 101 | success |

## Real upstream behavior

All four platform/version lanes (Linux and Windows, each with control0.3.1 and candidate0.3.3) passed all ten exact stages: initialization; full53-tool contract; owned configuration; Unicode file operations; read-only permission denial; content-search completion and three-page2/2/2 coverage; exact shell blocklist denial; bounded process output and owned tree cleanup; PDF creation/readback; and released admission.

PDFs measured13,242 bytes per Linux lane and19,629 bytes per Windows lane. Every lane records gateway exit code0, upstream exited, and owned process tree exited. The exact source pass predicate also requires no termination signal and no uncertain process cleanup. Raw PDFs/process outputs are not retained; those behavioral claims are bounded by the unchanged harness assertions and reports.

Both downloaded artifact ZIPs independently match GitHub SHA256 metadata and upload logs; all20 report files are retained. Independent comparison confirms all53 non-description tool-contract fields identical between0.3.1 and0.3.3; only kill_process description differs. Installed entry/manifest/lock digests match the reviewed candidate, including independently reconciled Windows CRLF lock bytes. Native ripgrep hashes match previously verified published binaries.

## Scope

Source qualification only. No deployment, production restart, public remote OAuth, paid model call, Docker/macOS or full mission acceptance occurred. No remote mutation, CI rerun, source edit or local upstream execution was performed during this verification.

Full logs: 134051 bytes. Machine receipt SHA256: `de943aed3b8dfccd7b2c7e49395f3446b81d5f28dc86155a99c5ebb7a1dd153e`.
