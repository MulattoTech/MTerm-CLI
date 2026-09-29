# MTerm-CLI status — repository split bootstrap

Date: 2026-09-27.

MTerm-CLI is now a separate repository from MTerm-GUI. The repository contains the reviewed execution prompt, read-first handoff, 300-item acceptance seed, split record and contributor rules.

This bootstrap does **not** claim working Codex/Web/status integration. Product implementation credit remains at 0% until reviewed requirements have real code, tests and evidence.

## Current source authorities
- CLI: https://github.com/MulattoTech/MTerm-CLI
- GUI: https://github.com/MulattoTech/MTerm-GUI
- Legacy migration source: https://github.com/MulattoTech/MTerm

## Next execution
Read docs/execution/READ_FIRST.md, then execute docs/execution/MASTER_IMPLEMENTATION_PROMPT.md with Remote Desktop Commander and GitHub connected.

The first engineering tasks are current-state reconciliation, fresh upstream feasibility/pinning, then credential-free CLI skeleton/status vertical slices. Web integration remains explicitly blocked until its runtime/browser/auth constraints are proven compatible or the owner approves a precise exception.
