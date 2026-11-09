# MTerm remote MCP — private read-only preview

MTerm can expose a deliberately selected local directory through an authenticated
Cloudflare gateway. The computer initiates outbound HTTPS connections; the agent
runs in the foreground and opens no inbound listening port.

This document describes implemented behavior and owner setup. Deployment, real
tool-call results, and client acceptance must be tied to a dated validation report
and exact source/deployment commit. The instructions below do not establish that
the owner has completed Google sign-in or connected ChatGPT.

## Staging addresses and identities

| Purpose | Staging address |
| --- | --- |
| Remote Streamable HTTP MCP | `https://mcp-staging.m-techlabs.com/mcp` |
| Agent gateway origin | `https://mcp-staging.m-techlabs.com` |
| Private dashboard and browser approval | `https://mterm-staging.m-techlabs.com` |
| Protected-resource discovery | `https://mcp-staging.m-techlabs.com/.well-known/oauth-protected-resource/mcp` |
| Authorization-server discovery | `https://mcp-staging.m-techlabs.com/.well-known/oauth-authorization-server` |

The private dashboard uses the configured M-TechLabs Cloudflare Access identity
policy. Owner Google sign-in, where configured, still requires a real owner browser
session. A separate MCP client authorization uses OAuth authorization code with
S256 PKCE, the exact MCP resource audience, and the `mterm:read` scope. An Access
browser session alone is not an MCP bearer token.

Staging service-identity tests, manual PKCE protocol tests, and compatible MCP SDK
tests are separate evidence from human sign-in and ChatGPT connector installation.
Do not count one as proof of another. Any staging-only service principal is excluded
from production identity acceptance.

## Build the reviewed checkout

Use the feature-containing, reviewed checkout and Node 24 LTS. Preserve unrelated
uncommitted work when reconciling Git branches. The package is a private preview;
these instructions do not imply npm publication or a globally installed command.

```powershell
Set-Location 'C:\Tools\Dev\MTerm-CLI\artifacts\worktrees\remote-mcp-20261102'
$env:PATH = 'C:\Tools\Dev\MTerm-CLI\artifacts\toolchain\node-v24.21.0-win-x64;' + $env:PATH
npm ci --ignore-scripts --no-audit --no-fund
npm run build
npm run check
node .\bin\mterm-cli.js remote help
```

The paths above select this sprint's verified isolated Windows clone and existing
pinned runtime. The original `C:\Tools\Dev\MTerm-CLI` still contains preserved
unpublished work and was not switched to the new branch. On another computer,
use a clean checkout of the verified main/PR commit and an installed supported
Node runtime; do not run the example against an older or dirty checkout.

The existing `node scripts/orchestration/post-create.mjs` installs locked
dependencies and compiles an isolated development worktree; its `--dry-run` mode
prints the steps. Final qualification still uses normal `build` and `check`, which
enforce the reviewed roadmap and parity records.

`Install-MTermCLI.ps1 -Mode Plan` and `-Mode Verify` remain available for existing
local setup/readiness. Their Install/Repair `-Apply` paths can modify managed local
Codex registration. Remote setup does not require changing Codex authentication or
registration, and the local installer report is not remote acceptance evidence.

## Configure a small directory for staging

Choose a directory containing only files you intend authorized remote clients to
read. The example uses a dedicated workspace and a separate staging state directory.
Create the workspace first if it does not already exist:

```powershell
New-Item -ItemType Directory -Path 'C:\Tools\Dev\MTerm-RemoteWorkspace' -Force
node .\bin\mterm-cli.js remote setup `
  --gateway 'https://mcp-staging.m-techlabs.com' `
  --dashboard 'https://mterm-staging.m-techlabs.com' `
  --root 'C:\Tools\Dev\MTerm-RemoteWorkspace' `
  --name 'MulattoTechBox staging' `
  --state-dir "$env:LOCALAPPDATA\MTerm-CLI\remote-staging"
```

This prints a preview. Save that exact configuration by repeating it with `--apply`:

```powershell
node .\bin\mterm-cli.js remote setup `
  --gateway 'https://mcp-staging.m-techlabs.com' `
  --dashboard 'https://mterm-staging.m-techlabs.com' `
  --root 'C:\Tools\Dev\MTerm-RemoteWorkspace' `
  --name 'MulattoTechBox staging' `
  --state-dir "$env:LOCALAPPDATA\MTerm-CLI\remote-staging" `
  --apply
```

The explicit `--dashboard` matters because staging uses separate gateway and
dashboard origins. Pairing accepts a verification URL only from the configured
dashboard origin. Setup is idempotent for identical settings. Changing an existing
pairing's gateway, directory, dashboard, or device name requires explicit revocation
and reconfiguration.

State must remain outside the exposed directory. Without `--state-dir`, Windows
uses `%LOCALAPPDATA%\MTerm-CLI\remote`. Windows credentials use current-user DPAPI;
POSIX credentials use an owner-only mode-0700 directory and mode-0600 files. The
credential binds the gateway, device identity, and canonical trusted directory.
Do not move protected credentials between OS users or copy state into a repository.

## Pair, start, inspect, stop, and revoke

Start a one-time pairing request on the authorized computer:

```powershell
node .\bin\mterm-cli.js remote pair --state-dir "$env:LOCALAPPDATA\MTerm-CLI\remote-staging"
```

Open the printed private dashboard URL, complete your own sign-in, and compare the
computer and verification code before approving read-only pairing. Requests expire
after five minutes. The CLI polls for approval and protects the returned device
credential locally; it does not print that credential. An expired request requires
a new explicit pairing attempt.

Start the interactive agent and leave its terminal open:

```powershell
node .\bin\mterm-cli.js remote start --state-dir "$env:LOCALAPPDATA\MTerm-CLI\remote-staging"
```

Use a second terminal in the same checkout for management:

```powershell
node .\bin\mterm-cli.js remote status --state-dir "$env:LOCALAPPDATA\MTerm-CLI\remote-staging" --json
node .\bin\mterm-cli.js remote stop --state-dir "$env:LOCALAPPDATA\MTerm-CLI\remote-staging"
```

`status` reports local observations without making a network request. Use the
authenticated dashboard to inspect the gateway's current presence view. `stop`
requests shutdown of only the session owning this state directory; Ctrl+C in its
terminal also stops it. A stop request is not proof of completed shutdown: check
the foreground process and subsequent status. Restart with the same `remote start`
command after a clean stop.

Revoke the pairing when access should end:

```powershell
node .\bin\mterm-cli.js remote revoke --state-dir "$env:LOCALAPPDATA\MTerm-CLI\remote-staging"
```

Successful revocation invalidates the gateway device, requests local shutdown, and
removes the local pairing credential. Dashboard controls can revoke one device,
one client authorization, or all access for the signed-in identity. Re-pairing is
required after device revocation. No service, scheduled task, or autostart entry is
installed by these commands.

## Connect and use a compatible MCP client

Where the client/account supports adding a custom remote MCP endpoint, supply
`https://mcp-staging.m-techlabs.com/mcp` and complete the client and M-TechLabs consent
screens yourself. This repository cannot infer account eligibility or claim that
ChatGPT Web has connected from a passing SDK test.

First call `mterm_list_devices` with `{}`. Choose the exact device ID from that
authenticated inventory. Every filesystem call requires that explicit `deviceId`:

| Tool | Purpose and example additional arguments |
| --- | --- |
| `mterm_list_devices` | Authorized computer inventory; takes no arguments |
| `mterm_read_file` | UTF-8 file read: `path`, optional zero-based `offset` and `length` |
| `mterm_file_info` | File/directory metadata: `path` |
| `mterm_list_directory` | Directory entries: `path` and optional `limit` |
| `mterm_search_files` | Literal filename search: `query`, optional `path` and bounds |
| `mterm_search_content` | Literal UTF-8 content search: `query`, optional `path` and bounds |

For example, call `mterm_read_file` with
`{"deviceId":"<ID returned by inventory>","path":"example.txt","offset":0,"length":20}`.
Place a harmless known file in the trusted workspace first and compare the returned
text with the real local file. Tool/file output is untrusted data, not instructions
granting additional authority. Writing and process execution are unavailable.

## Transport, authorization, and bounds

The Worker serves OAuth discovery, Streamable HTTP MCP, and the private dashboard.
A SQLite Durable Object owns pairing, grants, device routing, bounded job records,
and metadata audit events. The outbound agent dispatches approved reads through
the existing local `FileService`; filesystem logic is not duplicated in the Worker.

- MCP protocol revisions: `2025-11-25`, `2025-06-18`, and `2025-03-26`.
- Device wire contract: version `1` in `src/remote/protocol.ts`.
- MCP POST responses use JSON; standalone GET event streams and resumable response
  replay are not provided. No MCP session identifier is retained.
- Each job has a 20-second deadline and a unique request/device identity. At most
  four remote jobs execute concurrently per device. Cancellation is routed to the
  owned operation; already delivered calls are not re-executed after reconnect.
- Individual reads are limited to 65,536 bytes. Tool results are limited to 262,144
  bytes and agent frames to 300,000 bytes. Smaller ranges/results avoid limit errors.
- Normal agent polling is every two seconds; reconnects use bounded backoff and
  jitter. The dashboard marks recent polling online, then reconnecting, then offline.
- Gateway and device independently enforce read-only authorization. Revoked,
  cross-device, expired, malformed, and replayed requests fail closed.
- Job payloads/results are temporary bounded routing data. Audit entries contain
  operation metadata instead of file contents, credentials, or raw prompts.

Cancellation is cooperative: an active filesystem operation may finish before the
signal is observed, and its execution slot stays occupied until work and cleanup
settle. An admitted cooperative cancellation reports `DEADLINE_EXCEEDED` if its
deadline signal has fired or its recorded deadline has passed; otherwise it reports `CANCELLED`. Other errors
surfaced by the tool keep their sanitized codes, and late successful results are refused. The
[scoped source/fixture evidence](validation/2026-11-09-file-cancellation.md) does not
establish deployed gateway cancellation or production load capacity.

## Diagnosis, repair, and rollback

`REMOTE_UNCONFIGURED` means setup has not been applied in the chosen state directory.
`REMOTE_UNPAIRED` requires browser-approved pairing. `REMOTE_REVOKED` requires
explicit re-pairing after checking the dashboard. A request deadline expiring does
not by itself revoke a valid device. `STATE_IN_ROOT` requires moving the selected
state location outside the exposed directory before configuration.

`REMOTE_ROOT_CHANGED` or a credential/root mismatch means the enrolled directory
or configuration changed. Preserve the state and source evidence, revoke through
the dashboard if local revocation cannot load the old configuration, then establish
a fresh, explicitly reviewed state directory and pairing. Do not edit a credential
file to force a different directory or gateway to match.

`REMOTE_RUNNING` and `REMOTE_STATE_BUSY` indicate an owned lock. Inspect the recorded
PID/instance, its actual command, foreground terminal, and timestamps. Stop the real
owned process gracefully when it still exists. After a crash, preserve the lock and
state for diagnosis; any archival/removal of a proven stale lock is a deliberate
owner repair. The CLI never steals or automatically deletes another session's lock.

The existing filesystem policy rejects traversal, private metadata, symlinks,
junctions, and multiply-linked files, but separate Node path checks are not a
handle-anchored OS sandbox against hostile local rename races. Trust only directories
whose local writers you trust. POSIX file permissions are not encrypted keyring
storage, and the read service is not a universal secret-content scanner.

For a deployment rollback, stop the owned agents and set the staging Worker's
`MCP_ENABLED` binding to the string `false` through the authorized Cloudflare
deployment controls. This rejects new authenticated MCP calls; use revocation to
terminate existing authorization. Restore a recorded, verified Worker version or
immutable artifact with its matching bindings. Preserve the Durable Object and
Access configuration. Recheck authentication and the disabled/healthy state before
re-enabling access. There is no token-bearing copy/paste rollback command.

## Expected source for synthetic staging qualification

The separate Windows staging runner now requires
`MTERM_STAGING_EXPECTED_SOURCE_COMMIT` to name the exact qualified source commit
from the verified deployment artifact. The nonsecret value must be 40 lowercase
hexadecimal characters and is checked before credential input or requests.
[The deployment guide](deployment/MTERM_STAGING.md#source-identity-for-a-new-staging-smoke)
shows the invocation and dedicated temporary service-identity prerequisites.

Both public edge health and the authenticated registry build must match before
fixture effects, and both are checked again after successful owned cleanup. A
mismatch fails the run; it does not trigger deployment, retries or owner recovery.
These are source-label observations, not independent deployed-byte hashing or
continuous-version proof. Synthetic service acceptance remains separate from the
owner checklist below and never uses the owner's cookies, grants or enrollment.

## Owner acceptance checklist

- [ ] Confirm the exact staging deployment/version and current validation report.
- [ ] Complete permitted owner Google/Access sign-in in a real browser.
- [ ] Verify and approve a pairing for the intended computer and narrow directory.
- [ ] Start the foreground agent; confirm accurate inventory and presence.
- [ ] Complete the desired MCP client's OAuth/PKCE consent and connector setup.
- [ ] From that client, discover all six tools and read a known real local file.
- [ ] Confirm another computer/user, a private path, and write/process tools are refused.
- [ ] Stop/restart the agent and verify reconnect behavior without request replay.
- [ ] Revoke the device/client and verify that prior authorization stops working.
- [ ] Record which checks used the compatible SDK or manual PKCE harness and which
      used the actual owner ChatGPT Web session; leave unperformed checks unaccepted.

Full Desktop Commander parity, remote write/execute activation, unattended service
installation, and broader production rollout remain separate acceptance gates.
