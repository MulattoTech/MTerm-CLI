# Windows candidate acceptance — 2026-11-02

Version: `0.0.1-preview.1`. The local MCP preview and private remote read-only
preview have different capability boundaries and evidence. Neither is the complete
MTerm release or a complete RDC replacement.

Use the [final sprint report](validation/2026-11-02-remote-sprint.md) and
[PR #69](https://github.com/MulattoTech/MTerm-CLI/pull/69) for final merge/main,
document-check and checkpoint status. Validated code is
`b90432a1bc138d59305692a9f74f110a475d0881`.

## Current remote staging result

The deployed Cloudflare gateway and two real Windows foreground agents passed
**11/11 final live checks** at source `b90432a1bc138d59305692a9f74f110a475d0881`, using
Node 24.21.0 and official MCP SDK 2.3.0. The SDK initialized, discovered six
read-only tools and read independent fixture files from both devices. Pairing,
wrong-code/device denial, outside-root and mutation denial, device isolation,
device revocation and OAuth grant revocation were exercised. Windows device
credentials used current-user DPAPI.

The run used a temporary Cloudflare Access service principal and a manual S256
PKCE exchange. **Human Google sign-in, browser consent/callback and ChatGPT
connector use remain unverified.** Both synthetic devices and grants were revoked,
both agents stopped, SDK closed, and only test-created local fixtures removed.
The temporary service policy, token and Worker binding were deleted. Access is
owner-only; no persistent owner agent is paired.

Staging MCP is **enabled (`MCP_ENABLED=true`)**, Worker version
`4b726ec9-4389-4ba8-ada3-5758a3889c27`, artifact SHA-256
`97a0457b78e113c058ae8da3d3a6a54fcd93c2b35d1dd1781316c41001ac10a6`.
The earlier full Windows run passed 143/144 and exposed
a real canonical-leaf/Windows 8.3 defect. The integrated repair (`bbf1d0e`, fixture
correction `14971ac`) passed 33/33 focused tests and **149/149 full tests**, with no
skips or cancellations, including five native 8.3 cases. Final full Windows gates
passed in 55.35 seconds; tests took 32,829 ms. Packed install and native Codex
0.160.1 registration/two MCP sessions passed without user config changes or model
calls. Package sizes: 55,636-byte archive, 216,577-byte unpacked payload and
14,163,947-byte installed production footprint. All four PR matrix jobs
(`41372073094`), fast checks (`41372073095`) and push matrix (`41372068412`) passed.
Production was not promoted.

Final smoke finished 2026-11-02 01:24:29 UTC. See
[the final live report](validation/2026-11-02-remote-staging-smoke-final.json),
[owner commands](REMOTE_MCP.md), [deployment recovery](deployment/MTERM_STAGING.md)
and [current handoff](HANDOFF.md).

## Capability boundaries

| Candidate | Implemented scope |
| --- | --- |
| Local stdio MCP | Owner-selected roots, explicitly enabled file writes and owned captured processes, controlled by local authorization flags and tool contracts. |
| Private remote MCP | Device inventory plus file read/info/list/name-search/content-search in an enrolled root. Outbound HTTPS foreground agent, 20-second deadlines, bounded results, protected credential outside the shared root. No remote write, process execution, autostart or inbound listener. |

Remote tools are `mterm_list_devices`, `mterm_read_file`, `mterm_file_info`,
`mterm_list_directory`, `mterm_search_files` and `mterm_search_content`.
The MCP endpoint is <https://mcp-staging.m-techlabs.com/mcp>; owner approval uses
<https://mterm-staging.m-techlabs.com>. Their existence does not establish that a
particular ChatGPT conversation is connected. Normal owner use requires explicit
pairing and a running foreground agent.

## Earlier local behavior demonstrated through real tool calls

Official-client initialize/ping/tools-list; default denial/hidden write and execution tools;
UTF-8 create/read/list/no-overwrite move round trip; versioned updates/conflicts; outside-root/link
and malformed payload denials; captured process start/stdin/output/exit; EOF owner cleanup; bounded
oversized-frame handling. Direct module tests add cursor retention, UTF-8 chunking, limits, timeout,
child tree cleanup while parent is live, private paths and external-diff-disabled Git.

The installed Codex executable was probed without a model request. Registration add/get/remove
was exercised in a new CODEX_HOME, not the real user's configuration. The setup command prints the
reversible plan and leaves final real registration to the human. No new login was initiated.

## Remaining acceptance and practical limits

An authenticated multi-device staging relay now exists and has real SDK evidence;
human ChatGPT use remains unverified. Screenshot/computer control, full PDF/DOCX/
spreadsheet parsing parity, true PTY and reconnectable detached sessions, all RDC
operations and native MCP/Git/provider GUI parity are not supplied by this remote
preview. The read-only relay does not expose the local process or write tools.

Directory moves and recursive destructive operations are deliberately absent. Quota/status/Web
model routing and managed update return clear not-implemented states. Complete platform delivery, full
credential refresh safety, complete three-component size budget and release certification remain.

## Readiness label

Use “Windows local-MCP preview with a tested private read-only staging relay,”
including pending human-client acceptance. Hosted code qualification is green;
final delivery authority is the sprint report/PR. Owner Google/ChatGPT acceptance
remains unverified. Inspect docs/TESTING.md and current
validation results before relying on a particular operation.
