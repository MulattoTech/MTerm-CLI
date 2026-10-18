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

The last command previews registration. Add `--apply` deliberately to apply a backed-up, ownership-tracked
entry; `remove codex --apply` removes only that exact owned entry. Repeated operations are idempotent.
Actual Codex0.160.1 and a freshly installed package were tested in isolated CODEX_HOME, not your real
configuration. See [registration and limits](docs/CODEX_REGISTRATION.md).

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

Native read/info/list/literal filename search/content search; guarded UTF-8 writes and regular-file
moves; an optional compatibility profile additionally supports nested directory creation and recursive listing; owned captured process start/poll/input/list/stop;
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
Current parity implementation is published in [PR #52](https://github.com/MulattoTech/MTerm-CLI/pull/52)
on `feat/codex-parity-foundation-20261005`, not yet merged. Hosted verification is blocked before steps
by a GitHub account billing/spending-limit gate. Workflow writes now work; no hosted PASS is claimed.

## DesktopCommander-compatible file profile

Add `--compat-desktop-commander` to `mcp --stdio` or `setup codex` to expose implemented aliases:
`read_file`, `read_multiple_files`, `list_directory`, `get_file_info`, plus `write_file`,
`create_directory`, `move_file` and `edit_block` with `--allow-write`. Use absolute file paths.
This is a bounded text/file subset, not full26-tool DesktopCommander parity. Native names remain.
URL, images/office formats, fuzzy edits, directory/cross-device moves and other contracts remain open.

**Parity acceptance remains0/48, NOT PASS.** [Current implementation evidence](docs/validation/2026-10-05-codex-parity-foundation.md)
and [next execution prompt](docs/execution/NEXT_PARITY_PROMPT.md) distinguish tested work from gaps.
The full300-item product maturity bar is not this separate binary parity certification.


## One-command installation, readiness and development

From a checkout, `Install-MTermCLI.ps1` is the top-level PowerShell entry point. It follows the MJobs/DevFleet pattern of one visible command, explicit readiness checks, and recoverable project-local work.

```powershell
# Read-only plan, no Codex registration or model usage
.\Install-MTermCLI.ps1 -Mode Plan -TrustedRoot C:\Tools\Dev\MTerm-CLI -CompatDesktopCommander

# One explicit invocation performs pinned npm ci, build/check and managed Codex registration
.\Install-MTermCLI.ps1 -Mode Install -TrustedRoot C:\Tools\Dev\MTerm-CLI -CompatDesktopCommander -Apply

# Re-run the idempotent verified setup after an interrupted setup
.\Install-MTermCLI.ps1 -Mode Repair -TrustedRoot C:\Tools\Dev\MTerm-CLI -CompatDesktopCommander -Apply

# Read-only local readiness; optional -FullTests runs the existing project gates
.\Install-MTermCLI.ps1 -Mode Verify -TrustedRoot C:\Tools\Dev\MTerm-CLI

# Issue automation: preview by default; only -Execute invokes a model
.\Install-MTermCLI.ps1 -Mode Sprint -IssueNumber 3
```

File writes and process execution remain separately opt-in (`-AllowWrite`, `-AllowExec`). For local Codex, the configured stdio MCP server is started by Codex when needed: a Windows Service or permanent daemon is **not** required. A **remote Cloudflare gateway/device agent** is separate, remains unimplemented and would need explicit authenticated setup.

See [automation docs](docs/automation/README.md) and [readiness evidence](docs/validation/2026-10-18-automated-bootstrap.md).

## Remote MCP and automation (separate from local Codex parity)

- [Sanitized owner HAR evidence](docs/research/DESKTOP_COMMANDER_REMOTE_HAR_2026-10-16.md) — credentials intentionally excluded.
- [WEB-001..012 / epic #53](docs/REMOTE_MCP_ROADMAP.md) — 0/12 accepted, remote Cloudflare gateway NOT IMPLEMENTED.
- [One-command setup and bounded issue workflow](docs/automation/README.md) — preview-first; actual registration/agent calls require explicit flags.

Do not confuse remote Cloudflare/Web readiness with the existing DCP-001..048 local Codex parity gate.
