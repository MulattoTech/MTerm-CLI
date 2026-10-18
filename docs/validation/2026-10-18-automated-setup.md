# MTerm-CLI automated setup continuation — 2026-10-18

## Scope and source

The owner supplied `mcp.desktopcommander.app.har`, a ~19 MB private HAR covering four page records and 251 network entries over approximately 90 seconds on 2026-10-17 UTC. We inspected **only sanitized structural evidence**. The raw capture contains cookies, bearer/device tokens, identity fields and checkout URLs; it is intentionally excluded from this repository.

PR #67 already included the source-supported features and the remote epic WEB-001..012 (#53–65), plus a linked-Git-worktree issue #66. This follow-up finds no newly *observed and mandatory* remote MCP tool behavior beyond those issues. Observed traffic: OAuth/MCP endpoint discovery, web session, managed device registry, Supabase Realtime handshakes, usage/subscription reads, and checkout. The HAR did not contain a remote MCP tool request/response or completed pairing/revocation round trip. Billing/analytics for a commercial SaaS are optional for a personal MTechLabs gateway.

## Automation parity focus

MJobs uses a root launcher that builds and waits for readiness; DevFleet uses an explicit staged bootstrap/repair flow. MTerm-CLI already had preview-first `Setup-MTermCLI.ps1` and opt-in `Start-MTermSprint.ps1`. This change adds a **single root `Install-MTermCLI.ps1`** to route Plan, Install, Repair, Verify and Sprint without duplicating their authority logic.

- `Plan`, `Install` and `Repair` are **preview-only** unless `-Apply` is given.
- `Verify` is read-only for user auth/config and reports local readiness separately from Cloudflare/Web relay readiness; `-FullTests` deliberately runs the regular project gate.
- `Sprint` is read-only unless `-Execute` is given, then delegates to the single-issue isolated Codex flow. A model call is never inferred from a preview.
- Sprint defaults to the checked-out committed `HEAD`, records the resolved SHA and rejects dirty checkout execution. This avoids branching new work from an older published `main` that lacks unmerged required code.
- This is **not a Windows Service installer**. Codex itself launches a configured local stdio MCP child. Future Cloudflare device-agent background supervision is separately tracked by WEB-011.

## Evidence

- Isolated pre-change recovery: `artifacts/checkpoints/automation-before-20261018T094938Z`, verified Git bundle plus source ZIP.
- Root PowerShell syntax parsed; real Plan and Verify commands returned bounded plans/local readiness with no user Codex configuration mutation.
- Nine root + existing automation tests now passed with no skips.
- Targeted sprint-default test failed against stale `origin/main`, then passed after pinned-HEAD behavior was implemented.
- Windows Node 24.21.0: normal roadmap-reviewed build PASS and full npm check **73/73 PASS**, zero failures/skips.
- Installed package verifier PASS; separately, Codex managed registration/removal verifier PASS in synthetic CODEX_HOME (two registered stdio rounds; no live Codex model calls or user configuration changes).
- Source publishing and PR head are recorded through the Git commit/PR, not inferred from these local tests.

## Known boundaries

MTerm still has only eight local DesktopCommander file aliases on PR #52, not all 26 Codex MCP tools. DCP-001..048 and WEB-001..012 remain open pending complete acceptance. PR #67 is stacked on PR #52; no unverified merge should bypass hosted tests. No live Cloudflare deployment, automated authenticated browser capture, model run, billing change or user-device registration occurred in this work.
