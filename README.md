# MTerm-CLI

[![Reviewed delivery maturity](docs/roadmap/bars/overall.svg)](docs/ROADMAP.md)

MTerm-CLI provides **Windows local MCP tools**, a thin launcher for an existing Codex
installation, and an **opt-in authenticated remote read-only preview**. The remote preview
has completed a real MCP SDK round trip through the deployed Cloudflare staging gateway
to two dedicated Windows filesystem fixtures.

Owner Google/Access sign-in and ChatGPT Web connector acceptance remain unverified.
Full Desktop Commander parity, remote write/process execution, production rollout,
quota adapters and the complete cross-platform product remain separate delivery gates.

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
Compatibility implementation and reconciliation history are recorded in
[PR #52](https://github.com/MulattoTech/MTerm-CLI/pull/52) and
[PR #67](https://github.com/MulattoTech/MTerm-CLI/pull/67). Check their current GitHub status
and the exact tested source commit when choosing a checkout. Earlier hosted run 39166671238
had canonical-path test failures and executable-mode drift; historical billing or CI outcomes
do not establish the result for a later commit. No full-platform PASS is claimed here.

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

File writes and process execution remain separately opt-in (`-AllowWrite`, `-AllowExec`). For local Codex, the configured stdio MCP server is started by Codex when needed: a Windows Service or permanent daemon is **not** required. The remote Cloudflare gateway and foreground device agent require their own explicit setup and authenticated pairing; local flags cannot activate remote writes or execution.

See [automation docs](docs/automation/README.md) and [readiness evidence](docs/validation/2026-10-18-automated-bootstrap.md).

## Remote MCP: authenticated read-only staging

| Surface | Staging URL |
| --- | --- |
| Streamable HTTP MCP endpoint | [https://mcp-staging.m-techlabs.com/mcp](https://mcp-staging.m-techlabs.com/mcp) |
| Private dashboard, pairing and client consent | [https://mterm-staging.m-techlabs.com](https://mterm-staging.m-techlabs.com) |

Follow the [remote setup, client connection and rollback guide](docs/REMOTE_MCP.md).
The sequence is `remote setup` (preview, then `--apply`), `remote pair`, authenticated
approval, and `remote start`. Choose one narrow trusted directory and keep remote state
outside it. Windows device credentials use current-user DPAPI. The foreground agent
connects outbound over HTTPS and opens no inbound workstation port. No service, scheduled
task or autostart entry is installed. `remote status`, `remote stop` and `remote revoke`
operate on the selected remote state directory.

```powershell
node .\bin\mterm-cli.js remote help
```

The dashboard's Cloudflare Access sign-in is separate from the MCP client's OAuth
authorization-code/S256-PKCE flow. Each MCP request needs a valid `mterm:read` bearer
credential. Call `mterm_list_devices`, then supply the exact authorized `deviceId` on
each filesystem operation.

| Remote tool | Capability |
| --- | --- |
| `mterm_list_devices` | Authorized device inventory and presence |
| `mterm_read_file` | Bounded UTF-8 text reads |
| `mterm_file_info` | File and directory metadata |
| `mterm_list_directory` | Bounded directory entries |
| `mterm_search_files` | Literal filename search |
| `mterm_search_content` | Literal text search |

The gateway and agent independently enforce read-only access. Supported MCP revisions
are **2025-11-25, 2025-06-18 and 2025-03-26**; latest-2026 protocol conformance is not
claimed. Filesystem calls reuse the existing local `FileService`. Existing local command
defaults and Codex authentication are unchanged by remote implementation or setup.

### Observed acceptance and remaining gates

The 2026-11-02 UTC staging run completed **11 live checks**, including real Access service
authentication, OAuth/PKCE, two one-time Windows pairings, DPAPI storage, SDK initialization
and discovery, exact fixture reads, negative authorization checks, and device/grant
revocation. This used the pinned `@modelcontextprotocol/client` 2.3.0 SDK and a dedicated
temporary staging service identity. The runner is
[`scripts/verify-remote-staging.mjs`](scripts/verify-remote-staging.mjs); it records metadata
and fixture hashes without tokens or raw file contents.

That successful run used source
[`305c89c88a10f4c9243096e3d1125bde76f17563`](https://github.com/MulattoTech/MTerm-CLI/commit/305c89c88a10f4c9243096e3d1125bde76f17563),
Worker version `2083411f-68a7-4ec8-9ecc-5c2473ad09b9`, and gateway artifact SHA-256
`f76e37d77c218bc9c2bc9203346ec98d590e5a69b7fef285bcd16792ae32c0f1`.
These identify the tested staging artifact, not an assertion about the latest main commit.

Human Google sign-in, human browser consent/callback, ChatGPT connector installation,
production promotion and full local/remote parity remain unaccepted. Removal of the
temporary Cloudflare service token, its staging Access policy and its Worker identity
binding remains a release-closeout item in this snapshot; test fixture device/grant
revocation is a different cleanup step. See the [security boundary and limits](docs/SECURITY.md)
and [remote acceptance ledger](docs/REMOTE_MCP_ROADMAP.md).

## Remote research and automation

- [Sanitized owner HAR evidence](docs/research/DESKTOP_COMMANDER_REMOTE_HAR_2026-10-16.md) — credentials intentionally excluded.
- [WEB-001..012 / epic #53](docs/REMOTE_MCP_ROADMAP.md) — implemented staging evidence and remaining issue-level acceptance criteria; a live read does not close the entire remote ledger.
- [One-command setup and bounded issue workflow](docs/automation/README.md) — preview-first; actual registration/agent calls require explicit flags.

Do not confuse remote Cloudflare/Web readiness with the existing DCP-001..048 local Codex parity gate.

Use the exact reviewed feature-containing commit and current PR state when selecting a
candidate. See docs/ORCHESTRATION.md for safe parallel development and
docs/GITHUB_ORCHESTRATION_SETUP.md for CI and GitHub configuration.

## AI-orchestrated development

MTerm-CLI uses Orchestrator.inc with Codex workers in isolated worktrees. Start with [orchestration operations](docs/ORCHESTRATION.md) and [GitHub setup](docs/GITHUB_ORCHESTRATION_SETUP.md). Standard worker verification: node scripts/orchestration/verify.mjs --quick. Codex hook/CI portability blockers currently prevent an unattended fleet certification.
