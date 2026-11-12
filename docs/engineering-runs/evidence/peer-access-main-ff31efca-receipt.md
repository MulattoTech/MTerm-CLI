# Actual main qualification: MTechLabs-Access PR28

**PASS — actual main `ff31efca7c94ca4653305c61e9b933ce835cc04f`**, tree `19a4dd1a9e1bed2bfb9b3e1d5954a7e2e0716691`. The merge has ordered parents `9353b53a15cf50b67f4e9d452935e58a0bc9b8f3` and `f422b4d0ce23087168de7e2b1eda5ff73c2811dd`, and its tree exactly equals the independently reviewed candidate. PR28 merged at 2026-11-12T21:24:26Z. Main still resolved to this exact commit at the final read.

Fresh push run [43309952009](https://github.com/MulattoTech/MTechLabs-Access/actions/runs/43309952009), attempt 1, completed successfully. Every job checked out actual main, ran Node 24.22.2/npm11.19.1, and completed every step successfully. Tests have zero failures, cancellations or skips.

| Job | Passed / total | Result |
| --- | --- | --- |
| test | 123 / 123 | success |
| managed-mcp-windows | 115 / 115 | success |
| Upstream qualification / ubuntu-latest / Node 24 | 115 / 115 | success |
| managed-mcp | 115 / 115 | success |
| Upstream qualification / windows-latest / Node 24 | 115 / 115 | success |

## Real upstream behavior

All four platform/version lanes (Linux and Windows, each with control 0.3.1 and candidate 0.3.3) passed all ten exact stages: initialization; full 53-tool contract; owned configuration; Unicode file operations; read-only permission denial; content-search completion and three-page 2/2/2 coverage; exact shell blocklist denial; bounded process output and owned tree cleanup; PDF creation/readback; and released admission.

PDFs measured 13,242 bytes per Linux lane and 19,629 bytes per Windows lane. Every lane records gateway exit code 0, upstream exited, and owned process tree exited. The exact source pass predicate also requires no termination signal and no uncertain process cleanup. Raw PDFs/process outputs are not retained; those behavioral claims are bounded by the unchanged harness assertions and reports.

Both downloaded artifact ZIPs independently match GitHub SHA256 metadata and upload logs; all 20 report files are retained. Independent comparison confirms all 53 non-description tool-contract fields identical between 0.3.1 and 0.3.3; only kill_process description differs. Installed entry/manifest/lock digests match the reviewed candidate, including independently reconciled Windows CRLF lock bytes. Native ripgrep hashes match previously verified published binaries.

## Scope

All eight plugin files remain bound to the separately verified saved 0.2.3 documentation/skill release. OAuth repair, canonical-only authorization, ChatGPT UI behavior, website archive publication and runtime deployment remain unverified.

Source qualification only. No deployment, production restart, public remote OAuth, paid model call, Docker/macOS or full mission acceptance occurred. No remote mutation, CI rerun, source edit or local upstream execution was performed during this verification.

Full logs: 165915 bytes. Machine receipt SHA256: `a6596c51fec5a8ed790a74ea1a77e95b976dd75fcac4396da895033cad094b88`.
