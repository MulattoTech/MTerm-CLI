# MTerm-CLI

[![Reviewed delivery maturity](docs/roadmap/bars/overall.svg)](docs/ROADMAP.md)

A **working Windows local-MCP preview** plus a thin launcher for an existing Codex installation.
It replaces a useful subset of RDC-style local files/process operations for local MCP clients.
It does **not** yet replace the authenticated ChatGPT-Web-to-PC relay, implement the quota/Web
adapters, or deliver the entire requested cross-platform three-component product.

## Use the local candidate

```powershell
cd C:\Tools\Dev\MTerm-CLI
.\Start-MTerm-CLI.ps1 --help
.\Start-MTerm-CLI.ps1 doctor --json --root C:\Tools\Dev\MTerm-CLI
.\Start-MTerm-CLI.ps1 setup codex --root C:\Tools\Dev\MTerm-CLI --allow-write --allow-exec
```

The last command prints a **reviewable registration plan**, including its inverse. It does not
edit real Codex configuration. Its add/get/remove sequence was tested against the actual installed
Codex using an isolated temporary CODEX_HOME. Review the root/privileges before applying it.

Direct command from an installed/link-created package:

```text
mterm-cli mcp --stdio --root <one trusted directory> [--allow-write] [--allow-exec]
mterm-cli                  # existing Codex TUI, no injected model/sandbox/approval flags
mterm-cli -- <Codex args>   # explicit argument passthrough
mterm-cli config show --json
```

MCP is a machine protocol: a plain terminal invocation waits for a client; it is not a chat prompt.
Use an MCP-capable local client. Help/config/status never silently start a browser or daemon.

## Available local tools

Read/info/list/literal filename search/content search; guarded UTF-8 writes, one-level directory
creation, no-overwrite regular-file move; owned captured process start/poll/input/list/stop;
read-only Git status/diff; system info; bounded in-memory audit metadata.

Files are read-only by default. Writes require --allow-write, OS process execution independently
requires --allow-exec. Process execution runs as your OS user: root checks on file tools are **not
an OS sandbox**. No listener is opened. Private credential/metadata paths and links are refused.
See [security limits](docs/SECURITY.md) before granting execution.

## Build and test

Node24 LTS is the tested runtime. The project-local Windows launcher can use the verified Node24
copy recorded in artifacts/node-lts.json; another clean checkout needs an installed supported Node.
There is no automatic installation, update, global PATH edit or login flow.

```text
npm ci --ignore-scripts
npm run build
npm test
npm link                 # deliberate user-level developer installation, not run globally by tests
```

Exact dependency locks and a production shrinkwrap are retained. For ongoing development, source
changes require an explicit roadmap assessment; use build:code during red/green iterations and
normal build/check/package gates for deliverable verification.

## Full scope, not inflated readiness

All **300** numbered requirements remain in [the roadmap](docs/ROADMAP.md), [verbose table](docs/roadmap/FEATURES.md)
and [offline searchable dashboard](docs/roadmap/index.html). The bar is weighted planning maturity,
not release readiness or fraction of lines written. Web/quota/update/platform blockers remain scored.
No GUI completion credit is imported. This repo is separate from [MTerm-GUI](https://github.com/MulattoTech/MTerm-GUI).

Start with AGENTS.md, docs/HANDOFF.md, docs/TODAY_CANDIDATE.md and docs/TESTING.md.
This repository publishes the local MCP candidate on main. Advanced compatibility work is
in open PR #52 and stacked PR #67; they are not merged. See docs/ORCHESTRATION.md for
safe parallel development, docs/GITHUB_ORCHESTRATION_SETUP.md for CI and GitHub configuration.

## AI-orchestrated development

MTerm-CLI uses Orchestrator.inc with Codex workers in isolated worktrees. Start with [orchestration operations](docs/ORCHESTRATION.md) and [GitHub setup](docs/GITHUB_ORCHESTRATION_SETUP.md). Standard worker verification: node scripts/orchestration/verify.mjs --quick. Codex hook/CI portability blockers currently prevent an unattended fleet certification.
