# MTerm-CLI remote MCP / MTechLabs roadmap (independent of Codex DCP parity)

**Evidence:** owner-supplied 2026-10-17 UTC Desktop Commander portal HAR. See [sanitized audit](research/DESKTOP_COMMANDER_REMOTE_HAR_2026-10-16.md). The raw HAR contains bearer/cookie/device and billing tokens: never commit it.

**Remote Web parity status:** **0 / 12 accepted — NOT PASS**. All requirements are new and unimplemented; this is independent of the 48 local Codex/DesktopCommander parity issues and the 300-item broad product maturity score.

![Remote MCP acceptance: 0 of 12](roadmap/bars/remote-web.svg)

| ID | Issue | Scope | Status | Priority |
|---|---|---|---|---|
| WEB-001 | [#54](https://github.com/MulattoTech/MTerm-CLI/issues/54) | Authenticated Streamable HTTP and OAuth discovery | Not started | P0 |
| WEB-002 | [#55](https://github.com/MulattoTech/MTerm-CLI/issues/55) | Per-client OAuth scopes/grants/revocation | Not started | P0 |
| WEB-003 | [#56](https://github.com/MulattoTech/MTerm-CLI/issues/56) | One-time device pairing and verification | Not started | P0 |
| WEB-004 | [#57](https://github.com/MulattoTech/MTerm-CLI/issues/57) | Outbound local device agent and reconnect/heartbeat | Not started | P0 |
| WEB-005 | [#58](https://github.com/MulattoTech/MTerm-CLI/issues/58) | Device registry, presence, capabilities, last seen | Not started | P1 |
| WEB-006 | [#59](https://github.com/MulattoTech/MTerm-CLI/issues/59) | Device revocation and credential rotation | Not started | P0 |
| WEB-007 | [#60](https://github.com/MulattoTech/MTerm-CLI/issues/60) | Private dashboard and client onboarding | Not started | P1 |
| WEB-008 | [#61](https://github.com/MulattoTech/MTerm-CLI/issues/61) | Cloudflare MTechLabs deployment and secure ingress | Not started | P0 |
| WEB-009 | [#62](https://github.com/MulattoTech/MTerm-CLI/issues/62) | Authorized relay/tool dispatch; verified remote call | Not started | P0 |
| WEB-010 | [#63](https://github.com/MulattoTech/MTerm-CLI/issues/63) | Diagnostics, privacy-safe audit and optional usage | Not started | P1 |
| WEB-011 | [#64](https://github.com/MulattoTech/MTerm-CLI/issues/64) | One-command remote-agent setup/supervision/update | Not started | P1 |
| WEB-012 | [#65](https://github.com/MulattoTech/MTerm-CLI/issues/65) | HAR-safe fixtures and full remote security acceptance | Not started | P0 |

## Explicit non-goals and uncertainties

- This is not a claim that the HAR captured a successful remote MCP tool call, completed device pairing or token revocation; it did not.
- A private MTechLabs deployment need not replicate Desktop Commander's Stripe payments/subscriptions or third-party analytics.
- Cloudflare DNS hostname, Access identity provider and deployment credentials require deliberate owner configuration. No public endpoint is enabled by this document.
- The remotely hosted page must not grant unrestricted Windows filesystem or process access. All tools need device/client/root capability scoping and audit.
- Updating a progress bar is not feature acceptance: close a WEB issue only with commit-level tests and true end-to-end evidence, then update this table/acceptance count. GitHub issues are the canonical work queue.

## Development automation

Use [Automation setup](automation/README.md) when available for one-command local preflight/build/Codex registration and a bounded issue-work cycle using the same claim/worktree/test/PR discipline as the MJobs/DevFleet repositories. Keep model calls opt-in, preserve dirty work, never silently auto-merge or declare 100% based on an exit code.
