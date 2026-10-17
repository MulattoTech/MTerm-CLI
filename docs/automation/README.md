# Automated MTerm-CLI setup and bounded Codex work cycles

The GUI and CLI are separate repositories. The CLI currently provides a local stdio MCP host.
This work automates installing/building, managed Codex registration and single-issue iterations.
It does NOT implement the Cloudflare remote service or promise full DesktopCommander parity.

## 1. One-command setup

From `C:\Tools\Dev\MTerm-CLI` after this branch has been integrated:

```powershell
# Preview scope and commands; NO file/config mutation or model usage.
pwsh -NoProfile -File .\scripts\automation\Setup-MTermCLI.ps1 -TrustedRoot C:\Tools\Dev\MTerm-CLI -CompatDesktopCommander

# Explicitly build, run checks, and install the owner-tracked Codex MCP stanza.
pwsh -NoProfile -File .\scripts\automation\Setup-MTermCLI.ps1 -TrustedRoot C:\Tools\Dev\MTerm-CLI -CompatDesktopCommander -Apply

# Additional tool capabilities require separate explicit authorization.
pwsh -NoProfile -File .\scripts\automation\Setup-MTermCLI.ps1 -TrustedRoot C:\Tools\Dev\MTerm-CLI -AllowWrite -AllowExec -CompatDesktopCommander -Apply
```

The script refuses drive-root access, requires Node >=24 and Codex for apply, checks a pinned npm
lockfile, uses `npm ci --ignore-scripts`, the normal validation/build gates and the existing
managed Codex registration library. Registration is idempotent and refuses editing unowned entries.
`-CodexHome PATH` is supported for an existing temporary testing home; the real home is otherwise
used only when the owner deliberately supplies `-Apply`. No secrets are logged or copied.
After registration Codex auto-launches the stdio server when a capable client needs it; no permanent
Windows Service is needed for the **local** Codex MCP use case.

**Caution:** The current `--compat-desktop-commander` profile supports eight text/file aliases,
not all 26 upstream tools. The 48 DCP issues remain the acceptance authority.

## 2. MJobs/DevFleet-style issue workflow

```powershell
# Read-only; inspect a specific issue:
pwsh -NoProfile -File .\scripts\automation\Start-MTermSprint.ps1 -IssueNumber 3

# Read-only; auto-select the first open, unassigned, unblocked DCP issue:
pwsh -NoProfile -File .\scripts\automation\Start-MTermSprint.ps1

# Explicit model-consuming implementation cycle, ONE issue only:
pwsh -NoProfile -File .\scripts\automation\Start-MTermSprint.ps1 -IssueNumber 3 -Execute
```

The `-Execute` mode requires GitHub CLI auth, Codex CLI and a verifiable issue.
It fetches without pruning, chooses a fresh isolated worktree, checks assignment/blocked state,
records a claim comment, and launches Codex with workspace-write sandbox controls.
An exclusive local worker lock prevents simultaneous runs from this checkout.
It never forcibly cleans worktrees, merges a PR, pushes to main, changes approval settings or
silently declares completion from an exit code. Any active worktree is retained on failure.
Only explicit `-Execute` triggers model usage or an issue claim; preview is read-only.

Issue priorities follow the pinned Codex parity work order; missing labels and assignment conflicts
are surfaced, not silently overridden. GitHub comments are coordination signals, not distributed
atomic locks; users should not run multiple autonomous workers against the same issue.

## 3. Review, tracking and handoff

The canonical local acceptance gate is DCP-001..048, tracked in
`docs/DESKTOP_COMMANDER_CODEX_PARITY.md`. New remote/web features are separately tracked as
WEB-001..WEB-012 under GitHub epic #53 and `docs/REMOTE_MCP_ROADMAP.md`.

Each implementation run must:
1. read AGENTS.md and the specific issue, claim ownership, and preserve unfinished work;
2. implement the smallest accepted testable slice and record actual tests;
3. run `npm run check`, installed-package verification and isolated Codex integration as appropriate;
4. update the corresponding evidence and reviewed roadmap (no self-awarded 100%);
5. publish a reviewable branch/PR after gates, never force-push or bypass blocked hosted checks;
6. produce a durable handoff with exact SHA, dirty status, blockers and next action.

### Validation scope

PowerShell scripts can be syntax checked on Windows without network or credentials.
Tests exercise preview behavior and rejected broad-root scope without `-Apply` or `-Execute`.
The opt-in actual Codex registration should be tested with a disposable `CODEX_HOME`, never a
live user account during CI. Running the model is a separate explicit decision.

## 4. Linked Git worktree compatibility remains open

MTerm's current MCP Git inspector rejects linked worktrees whose .git metadata lives outside
the selected trusted root (GIT_OUTSIDE_ROOT). **Do not disable that protection or rewrite a
worktree's .git pointer just to make a test pass.** This is tracked in GitHub issue #66.
For self-host validation, use an isolated normal clone with its own .git directory. A future
solution must independently authorize the common Git directory and test malicious redirects.

## 5. Remote web portal

The HAR reveals device pairing, presence, OAuth discovery, revocation, onboarding and usage,
not successful remote tool execution. See the sanitized HAR audit. A Cloudflare Workers/Access
gateway and outbound device agent remain a separate opt-in implementation, not enabled by
the local setup script. Never commit the raw HAR, cookies, session/device tokens or Stripe links.
