# Windows local-MCP candidate acceptance

Version:0.0.1-preview.1. Scope: one explicitly trusted local root, selected file writes and owned
captured processes for a local MCP client. Not the complete MTerm CLI release or RDC remote relay.

## Demonstrated through real tool calls

Official-client initialize/ping/tools-list; default denial/hidden write and execution tools;
UTF-8 create/read/list/no-overwrite move round trip; versioned updates/conflicts; outside-root/link
and malformed payload denials; captured process start/stdin/output/exit; EOF owner cleanup; bounded
oversized-frame handling. Direct module tests add cursor retention, UTF-8 chunking, limits, timeout,
child tree cleanup while parent is live, private paths and external-diff-disabled Git.

The installed Codex executable was probed without a model request. Registration add/get/remove
was exercised in a new CODEX_HOME, not the real user's configuration. The setup command prints the
reversible plan and leaves final real registration to the human. No new login was initiated.

## Practical limits that still need RDC or another tool

This ChatGPT Web conversation still uses RDC because there is no authenticated Web-to-local MTerm
relay installed. Local MCP clients can consume this server. Screenshot/computer-control/PDF/DOCX/
spreadsheet parsing, network transports, multiple devices, true PTY and reconnectable detached
sessions, all RDC operations, native MCP/Git/provider GUI parity are not supplied by this preview.

Directory moves and recursive destructive operations are deliberately absent. Quota/status/Web
model routing and managed update return clear not-implemented states. macOS/Linux delivery, full
credential refresh safety, complete three-component size budget and release certification remain.

## Readiness label

Use “tested Windows local-MCP preview,” not “complete RDC replacement” or “production v0.1.0.”
Inspect docs/TESTING.md and current validation results before relying on a particular operation.
