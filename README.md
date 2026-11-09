# MTerm-CLI

[![Reviewed delivery maturity](docs/roadmap/bars/overall.svg)](docs/ROADMAP.md)

MTerm-CLI provides **Windows local MCP tools**, a thin launcher for an existing Codex
installation, and an **opt-in authenticated remote read-only preview**. The remote preview
has completed a real MCP SDK round trip through the deployed Cloudflare staging gateway
to two dedicated Windows filesystem fixtures.

For this repository's **six-tool staging gateway**, owner Google/Access sign-in
and ChatGPT Web connector acceptance remain unverified.
Full Desktop Commander parity, remote write/process execution, production rollout,
quota adapters and the complete cross-platform product remain separate delivery gates.

For the owner's separate ChatGPT **MTerm-CLI** account plugin, its OAuth/App dependency,
the 53-tool hosted bridge observation, the single-production-plugin policy, and the
development-to-release workflow, see [ChatGPT connector operations](docs/deployment/CHATGPT_CONNECTOR.md).
That hosted bridge is not the six-tool staging gateway implemented by this repository;
neither one's verification awards acceptance to the other.

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
do not establish the result for a later commit. The final candidate results are recorded below.

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

The [final live Windows report](docs/validation/2026-11-02-remote-staging-smoke-final.json)
records **11/11 checks passed**, finishing at **2026-11-02 01:24:29 UTC**
(2026-11-01 19:24:29 Central). It used the pinned MCP client SDK 2.3.0, real Cloudflare
Access service authentication, OAuth/PKCE, two dedicated Windows device pairings,
current-user DPAPI, SDK initialization/discovery, exact fixture reads, negative
access tests and device/grant revocation. All recorded fixture cleanup checks passed.

| Final staging identity | Value |
| --- | --- |
| Tested code | [b90432a1bc138d59305692a9f74f110a475d0881](https://github.com/MulattoTech/MTerm-CLI/commit/b90432a1bc138d59305692a9f74f110a475d0881) |
| Immutable Windows-built artifact SHA-256 | `97a0457b78e113c058ae8da3d3a6a54fcd93c2b35d1dd1781316c41001ac10a6` |
| Worker version used by the final live smoke | `f643872f-5fbb-44be-9e3d-a6f8f3f32aab` |
| Current owner-only Worker / safe recovery version | `af4fd06e-c4a3-4545-ad22-31d0ae956215` |
| Current deployment | `5a0ff21c-6341-4e73-b4af-169e98b76db2` |

The current version serves the same tested artifact with the temporary
`STAGING_SERVICE_ID` binding removed. The temporary Cloudflare service token and
its Access service-auth policy were deleted; only the original owner allow policy
remains. MCP is enabled and read-only. Workers.dev and preview URLs are disabled.
No smoke-test agent or actual owner-paired agent remains running.

Full Windows verification, the native Codex probe and the four-platform CI matrix
passed for the tested code. PR #69 evidence includes the
[matrix run](https://github.com/MulattoTech/MTerm-CLI/actions/runs/41372073094),
[fast run](https://github.com/MulattoTech/MTerm-CLI/actions/runs/41372073095), and
[push run](https://github.com/MulattoTech/MTerm-CLI/actions/runs/41372068412).
Use the [final sprint record](docs/validation/2026-11-02-remote-sprint.md) as the
authority for final Git merge status, checkpoints and release verification.

The earlier smoke on source `305c89c`, Worker `2083411f-68a7-4ec8-9ecc-5c2473ad09b9`
and artifact `f76e37d77c218bc9c2bc9203346ec98d590e5a69b7fef285bcd16792ae32c0f1`
is historical evidence. It is superseded by the final identities above.

Human Google/Access sign-in, human browser consent/callback and ChatGPT connector
installation remain unverified. Production promotion, remote writes/process execution
and full local/remote parity remain separate gates. The
[staging runner](scripts/verify-remote-staging.mjs) records metadata and hashes without
credentials or raw file contents. New runs require the nonsecret
`MTERM_STAGING_EXPECTED_SOURCE_COMMIT` from the qualified artifact manifest and
matching edge/registry build labels before fixtures and after owned cleanup;
see the [exact-source smoke instructions](docs/deployment/MTERM_STAGING.md#source-identity-for-a-new-staging-smoke).
These labels do not independently prove deployed bytes or continuous version stability.
Connected process tools retain stdin in history, so credentialed qualification uses
the [fixed encrypted handoff](scripts/staging-handoff.mjs) and separately reviewed
[sealing function](scripts/staging-handoff-seal.mjs). The [November 9 public probe](docs/validation/2026-11-09-staging-handoff-delivery.json)
qualified the observed connected transport/privacy/process slice on its exact
revision. The new [owned-principal recovery helpers](docs/deployment/MTERM_STAGING.md#owned-principal-recovery)
add explicit cleanup and reuse modes, with provider lifecycle and actual connected
cleanup still unqualified. Two [provider creation attempts](docs/validation/2026-11-09-staging-provider-diagnostics.md)
were rejected; neither created an acknowledged resource. The [November 9 code
deployment](docs/validation/2026-11-09-staging-deployment.md) has public and
control-plane proof, while a fresh authenticated Windows smoke remains pending.
See the [security boundary](docs/SECURITY.md),
[deployment and recovery guide](docs/deployment/MTERM_STAGING.md), and
[remote acceptance ledger](docs/REMOTE_MCP_ROADMAP.md).

## Remote research and automation

- [Sanitized owner HAR evidence](docs/research/DESKTOP_COMMANDER_REMOTE_HAR_2026-10-16.md) — credentials intentionally excluded.
- [WEB-001..012 / epic #53](docs/REMOTE_MCP_ROADMAP.md) — implemented staging evidence and remaining issue-level acceptance criteria; a live read does not close the entire remote ledger.
- [One-command setup and bounded issue workflow](docs/automation/README.md) — preview-first; actual registration/agent calls require explicit flags.

Do not confuse remote Cloudflare/Web readiness with the existing DCP-001..048 local Codex parity gate.

Use the exact reviewed feature-containing commit and current PR state when selecting a
candidate. See docs/ORCHESTRATION.md for safe parallel development and
docs/GITHUB_ORCHESTRATION_SETUP.md for CI and GitHub configuration.

## AI-orchestrated development

MTerm-CLI uses Orchestrator.inc with Codex workers in isolated worktrees. Start with [orchestration operations](docs/ORCHESTRATION.md) and [GitHub setup](docs/GITHUB_ORCHESTRATION_SETUP.md). Standard worker verification: node scripts/orchestration/verify.mjs --quick. Passing Codex and CI checks do not by themselves certify unattended fleet operation; follow the documented ownership and isolation controls.

## Optional local pack catalog

When an explicitly approved pack registry is configured, the stdio host exposes bounded exact-version schema discovery, per-connection pack selection and explicit refresh. Selection cannot exceed the host’s startup execution permissions; new versions never become enabled silently. ABI1 remains tools-only. See the [catalog contract and limitations](docs/parity/PACK_CATALOG.md). The launcher and dependency versions are unchanged; qualification evidence is tracked under [AUG-003/#83](https://github.com/MulattoTech/MTerm-CLI/issues/83).

## Process and drive admission

The local stdio host keeps a bounded owned-control lane available under normal-work overload. Optional immutable process budgets narrow job/runtime/output limits and add declared scratch admission and explicit placement within trusted directories. These controls are per host; hard CPU/GPU/RAM/disk-write and cross-host quotas remain unsupported. See the [resource contract](docs/parity/RESOURCE_BUDGETS.md) and [AUG-012/#92](https://github.com/MulattoTech/MTerm-CLI/issues/92). The launcher file and dependency versions are unchanged; full capability acceptance remains open.

## Explicit isolated JavaScript execution

A separately granted native Linux x64 tool runs JavaScript in an owner-selected local Docker image with no host mounts or network, a read-only root, bounded workspace and kernel resource limits. It requires --allow-isolated-exec and an immutable --isolation-policy; native execution and packs retain their existing authority. Unsupported platforms fail closed. See the [isolation contract](docs/parity/ISOLATION.md) for backend floors, ownership and recovery limits, and [AUG-005/#84](https://github.com/MulattoTech/MTerm-CLI/issues/84) for qualification. The product does not install or pull a runtime/image; complete capability acceptance remains open.
