# Owner read-only connection checkpoint

**Observed 2026-11-02 04:26:07 UTC.** The integration owner supplied the
[sanitized observation](2026-11-02-owner-connection.json). This records a real
owner-authorized pairing and foreground agent, separately from the earlier
synthetic SDK/service-principal smoke and local DCP qualification.

## Completed owner actions

The user explicitly approved the prepared directory and necessary continuation.
The selected root is `C:\Tools\Dev\MTerm-RemoteWorkspace`; protected state is
outside it at `%LOCALAPPDATA%\MTerm-CLI\remote-staging`. The paired display name
is `MulattoTechBox staging`, with **read-only permissions and autostart disabled**.

The existing authenticated browser session reached the actual private dashboard.
The owner-authorized device was paired and observed online with its foreground
agent. A graceful stop returned an observed process exit, the dashboard showed
offline, and restarting the same enrollment reconnected. This does not establish
crash recovery, an installed service, network-fault recovery or client tool use.
The last observed state was paired and online; inspect current state before
starting another agent. The owner enrollment was deliberately not revoked.

A separate integration-owner local-status recheck at **12:00:53.619 UTC** again
observed the same enrollment paired and online. Its foreground process runs from
`C:\Tools\Dev\MTerm-CLI\artifacts\worktrees\config-qualification-20261102`
at `c408e286c437bec1c8c88fbbae29d89a9f8f90c8`. Preserve that running checkout and
inspect the owned process before any lifecycle action. This later observation is
recorded in the [delivery record](2026-11-02-config-metadata-delivery.json); the
original 04:26 JSON and its hash remain unchanged.

The gateway remains `https://mcp-staging.m-techlabs.com`, with MCP at `/mcp`, and
the dashboard is `https://mterm-staging.m-techlabs.com`. The deployed source remains
`b90432a1bc138d59305692a9f74f110a475d0881`; this continuation did not redeploy it
or promote production. No device identifier, pairing code or credential is
included in public evidence. Resolve the current identifier through authenticated
inventory when a client is legitimately connected.

## ChatGPT connection remains incomplete

At the checkpoint, active client authorizations were **zero**. There is no actual
ChatGPT consent/callback, tool discovery or selected-device file-read evidence.
Fresh Google login was not performed; existing authenticated dashboard access
does not prove that separate login path.

The plugin creation attempt was blocked by backend **HTTP 409**:
`Scoped plugin release was deleted.` The response was explicitly non-retryable,
and no plugin was created. Separately, the browser host restrictions gate did
not grant access to `https://chatgpt.com`. Neither restriction was retried or
bypassed. These are observed integration blockers; no underlying backend cause
or MTerm runtime failure is inferred.

A reviewable package was prepared:

- Filename: `MTerm-Staging-Plugin-0.1.0.zip`
- SHA-256: `1cba80851f09e4c912698dd707a3be82848fafacb9373498263e9181dd14e4e0`
- MCP endpoint: `https://mcp-staging.m-techlabs.com/mcp`
- Auth: OAuth dynamic client registration, S256 PKCE, `mterm:read`

A prepared archive is not an installed plugin or authorized client. Preserve the
package; resume only when supported plugin/client access is available or the
owner completes the normal client flow. Do not substitute service credentials,
export cookies, repeat the non-retryable call, or route around the browser gate.

## Continuation boundary

First inspect the existing enrollment and task-owned foreground process. Do not
repeat setup/pairing, revoke the live owner device, steal a lock, or start a second
agent simply to resume this checkpoint. Stop/revoke remain distinct controls;
revocation was not part of the completed owner acceptance.

Once the supported client is connected with owner consent, record real tool
discovery, device inventory, one harmless read from the selected root, an
outside-root denial and the authorized lifecycle checks. Keep that evidence
separate from historical SDK tests. **WEB acceptance remains 0/12, NOT PASS.**
Local DCP acceptance remains 0/48, and no model-driven Codex invocation is claimed.
