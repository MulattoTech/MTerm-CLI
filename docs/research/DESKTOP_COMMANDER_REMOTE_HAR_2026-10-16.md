# Desktop Commander remote portal — sanitized HAR feature audit

Captured traffic: `mcp.desktopcommander.app.har`, supplied by the repository owner.
Analyzed 2026-10-16 local / 2026-10-17 UTC. **Do not commit, attach, or republish the raw HAR.**

## Capture scope and confidence

- 251 network entries, four page records, approximately 90 seconds (2026-10-17 01:46–01:47 UTC).
- Page activity: `mcp.desktopcommander.app/`, `/billing`, then a hosted Stripe checkout.
- Approximately 51 requests to the portal/auth/managed-device API hosts; roughly 200 to Stripe, Sentry, PostHog, Google, captcha, fonts and other providers.
- 3 successful WebSocket upgrade handshakes to Supabase Realtime. This capture did **not** include a demonstrated MCP tool call or a remote device-command round trip.
- The portal's compiled frontend bundle is included. UI labels and client paths below are **bundle-supported**, not proof that the interaction was exercised in this HAR.
- The capture includes session cookies, authorization headers, user/session access tokens, a device auth token and payment-session links. **None of their values have been copied into this report.** If the HAR leaves private storage, revoke/reissue affected sessions/device credentials.

## Observed network interfaces (only names and field shapes)

| Observed path | Method/status | What it establishes |
|---|---|---|
| `/api/mcp-info` | GET/200 | Client discovery: MCP server URL, auth/token endpoints, OAuth discovery URL, redirect URL and diagnostics URL |
| `/auth/session` | GET/200 | Authenticated web session state and expiry/consent flag; bearer value omitted |
| `/auth/v1/user` (hosted identity provider) | GET/200 | Identity-backed account state, not anonymous all-access |
| `/rest/v1/mcp_devices` (hosted database API) | GET/200 | Device registry: device name, status, capabilities, last-seen, session metadata; secret value omitted |
| `/realtime/v1/websocket` | GET/101 | Live state transport handshake (3 connections); no verified tool dispatch payload |
| `/auth/billing/usage` | GET/200 | Plan, calls used/included, percentage, reset date, monthly history and device counts |
| `/auth/billing/subscription` | GET/200 | Subscription entitlement/status/cancel/resume indicators |
| `/auth/billing/checkout` | POST/303 | Checkout redirect flow; not a required personal self-hosted MCP capability |

## Features indicated by captured frontend code, NOT network-tested

- Guided **Add device** workflow; installation command `npx @wonderwhy-er/desktop-commander@latest remote`.
- **Verify device** page with a code displayed by the device client.
- Device list with **Online / Connecting / Offline**, last-seen data and live status.
- **Revoke one** and **Revoke all devices** controls; client token revocation is described.
- Connect-to-ChatGPT, connect-to-Claude and generic **any MCP-compatible client** onboarding.
- Remote MCP URL registration with OAuth; token grants described as client-scoped.
- Account usage and plan/billing page, with reset windows and monthly consumption.
- Frontend references to revoke and verification routes are not themselves proof those mutations succeeded during this capture.

## Features the HAR does NOT demonstrate

- No executed filesystem/terminal/process MCP tool call, tool response or device-agent dispatch.
- No verified remote client OAuth authorization-code round trip; `/authorize` and `/token` appear in discovery, not as exercised requests.
- No demonstrated complete device-pairing approval, token revocation or remote reconnect after network failure.
- No demonstrated billing refund/subscription mutation, server-side permissions, or rate limits.
- No full DesktopCommander local 26-tool parity evidence. This is remote portal evidence, separate from DCP-001..048.

## MTerm-CLI gap classification

`MulattoTech/MTerm-CLI` currently has a *local stdio* MCP preview and a pinned 48-item Codex parity ledger. Its published `main` remains `5c4588b`; PR #52 (`1d90046`) carries additional local MCP integration. The current published ledger is **0/48 accepted, NOT PASS**. The distinct remote portal capabilities above are not part of that 48-item local/Codex gate.

Proposed independent WEB requirements: authenticated Streamable HTTP MCP gateway, OAuth/discovery and per-client grants, device pairing and verification, outbound/local agent transport, device registry and live presence, device revoke/rotation, authenticated device dashboard/onboarding, Cloudflare-domain deployment and secure ingress, diagnostics and audit, lifecycle/reconnect, optional usage/entitlement analytics, and acceptance tests for an actual remote tool round trip.

A self-hosted personal gateway **does not require copying** the vendor's Stripe subscription/billing product or PostHog/Sentry telemetry. These are observed site dependencies, not mandatory parity for local development or private Cloudflare hosting.

## Security/deployment rules

- Never republish the raw HAR, tokens, cookies, identity attributes, billing checkout URLs or minified proprietary bundles.
- Use independently implemented protocol/UX behavior; keep third-party source/license attribution.
- Device-to-cloud traffic should be outbound from the workstation, not an open local unauthenticated listener.
- Remote MCP requires authenticated HTTPS, OAuth/Access policy, client/device scopes, revocation, bounded audit and explicit write/exec approvals.
- Avoid copying DesktopCommander's identity backend/project ID/keys; deploy a separate MTechLabs instance and authorization boundary.
- No production Cloudflare deployment or billing changes until target hostname, ownership, identity policy and credentials are explicitly configured and tested.

## Suggested next steps

1. Create a separate WEB epic/issues; keep the 48 DCP Codex parity issues unchanged.
2. Reconcile/preserve current 11 dirty/untracked configuration files before development.
3. Build an owner-approved local one-command installer and offline preflight, then an opt-in Codex work-cycle runner with MJobs/DevFleet-style issue claims, checkpoints, tests and PR handoff.
4. Build the remote gateway and device agent behind an authenticated local test harness. Prove real remote MCP read-only tool invocation before enabling remote writes or processes.
5. Publish a sanitized feature matrix with actual issue IDs and evidence; mark unknowns explicitly.
