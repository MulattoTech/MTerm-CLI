# GitHub setup for MTerm-CLI AI orchestration

This is an actionable maintainer checklist. Items marked OWNER ACTION are not asserted enabled in the repository.

## Current observed baseline, October 21 2026

- Repo: [MulattoTech/MTerm-CLI](https://github.com/MulattoTech/MTerm-CLI), public, admin/push rights verified.
- Existing GitHub CLI authentication as MulattoTech has repo, workflow, project and read:org scopes.
- 48 DCP acceptance issues (#3–#50), parity epic #2, remote epic #53 and WEB issues #54–#65 exist.
- PR #52 contains the unmerged compatibility foundation. Stacked PR #67 contains HAR-backed remote requirements and the one-command Codex installer/sprint runner.
- Current main has no active ruleset or branch protection in the observed GitHub API response. Recheck before applying new settings.
- Actions matrix exists, but recent runs failed **during tests** (including Windows short/long aliases and macOS canonical paths). Earlier billing-only failures are historical, not a reliable current diagnosis.

## Fast, safe GitHub setup

1. Fix at least the deterministic CI failures before adding required checks. A test must be green at the exact candidate SHA before it is required.
2. OWNER ACTION: Settings → Rules → Rulesets → New branch ruleset. Match main, require pull request, prohibit force pushes/deletion, require status `CI / fast` after it is green. Require an approval on security-sensitive changes; consider 1 human approval on all code PRs after the pilot. Do not require a workflow job that is skipped for some PRs.
3. Once the full matrix is green, require relevant Windows/Linux/macOS cross-platform checks before claiming all-platform parity. Until then, preserve visible failing checks.
4. OWNER ACTION: Settings → General → Pull Requests: enable auto-merge only if desired **after** all selected exact-head checks/approval rules operate reliably. Do not auto-merge unknown or red PRs. Keep branch deletion off until all user worktrees are reconciled.
5. Use issue labels: `agent-ready` (curated), `agent-active` (claim acknowledged), `needs-review`, `blocked`, `P0`, `P1`, `area:codex`, `area:mcp`, `area:remote`, `area:security`. Agents must not claim work from label alone; check assignees, comments, PRs and dependencies.
6. Use a dedicated GitHub Project with Status (Todo/In progress/Review/Done), Priority, Area, Acceptance (NOT_RUN/PARTIAL/PASS/FAIL), Owner, Dependency and Target PR/SHA. Issue moved to Done is NOT equivalent to accepted parity.
7. Enable dependency graph, Dependabot and CodeQL/secret scanning or push protection as supported. Pin workflow actions to commit hashes, default workflow token to contents:read and limit bot PR concurrency. Never publish PATs or logs.
8. Keep one `CI / fast` workflow for low-cost deterministic checks on each PR. Keep the four-platform verification matrix separately for release portability and acceptance. Avoid duplicating all four jobs on both feature-branch push and PR events.
9. Use the included pull-request template, CODEOWNERS and agent issue form. One issue/worker/PR, independently reviewable acceptance and exact source SHA.
10. Prefer initially **one Codex worker**; expand to two workers and one reviewer only after local AO health, root policy and GitHub checks are observed green end to end.

## Special AO integration cautions

Orchestrator.inc observes GitHub PR/CI itself; no GitHub webhooks or additional OAuth PAT are needed for its normal local workflow.

AO issue intake is OFF by default and requires **both** AO_TRACKER_INTAKE=on in the daemon environment and a per-project assignee-scoped intake filter. It is currently read-only toward the issue tracker. Do not turn on intake just because labels exist. Enable only after the first manual issue-to-PR pilot confirms ownership and avoids duplicate sessions.

`ao project set-config` REPLACES the entire saved project configuration and drops effort. Prefer AO desktop Project Settings to set worker Codex, reviewer Codex, AGENTS.md rules and node scripts/orchestration/post-create.mjs.

## Known workflow repair queue

- Windows: test fixtures must compare canonical filesystem identity rather than raw 8.3 short-path versus long-path strings. Do not weaken production RootPolicy.
- macOS: inspect /var → /private/var aliases and path-security denials with exact test sources. Fix tests/normalization without allowing symlink escapes.
- Linux/macOS package/registration gates: compare real workflow logs. A platform-specific registered CLI shim or Node path should not be asserted identical to Windows.
- The current linked-worktree MCP Git inspector rejects a git common-dir outside its trusted root. Issue AUTO-001/#66 governs this; use ordinary temporary clones for self-host integration until a secure authorization contract is tested.

## OWNER ACTION summary

- Approve the main protection/reviewer policy after `CI / fast` passes.
- Choose whether to enable Codex automatic AO issue intake; initial recommendation: NO.
- Confirm the dedicated project board columns and worker budget.
- Plan an AO maintenance window for the Codex launch-hook warning; do not kill the current MJobs AO daemon to make MTerm pass a check.
- After PR #52 and #67 pass valid required checks, merge in order so AO main-based workers see the current source.

No source config or CI run provides authorization to alter Cloudflare, Microsoft sign-ins, payments, or other user services.
