# GitHub setup for autonomous MTerm-CLI delivery

The [standing owner authorization](OWNER_AUTHORIZATION.md), effective 2026-11-07, covers project maintenance and delivery. Perform supported repository operations through existing authorized access; do not create recurring OWNER ACTION or manual-review pauses.

## Observed baseline — 2026-11-07

- Repository: MulattoTech/MTerm-CLI. PR #199 was open at e1453c57c0f289cd5c63a24ba243a1bd3a4013bd with all five PR checks and four push jobs passing.
- Main was d5fcc2f665b2b4f7d033ffd32b7c22ca9d7a4015. PR #52 is merged; PR #67's work was incorporated through merged PR #69.
- Live GitHub reads reported main unprotected and no rulesets. No enforced reviewer rule needed removal. Recheck live state before publication.
- The 48 DCP and 12 WEB acceptance ledgers remain distinct from the 117 AUG expansion queue. A merge is not acceptance.

## Delivery workflow

1. Reconcile the exact issue, prerequisites, existing assignees/comments/PRs and workstation state. One implementation owner, branch and PR at a time; an independent read-only reviewer is permitted.
2. Develop with ChatGPT Web and connected tools. Paid/model-consuming Codex or AO workers are not authorized by this workflow.
3. Preserve pinned actions, read-only default workflow tokens, the fast check, all applicable platform checks, source/roadmap review and installed-package evidence.
4. Open a draft PR during work. Record scope, base/head, tests, source/license evidence, independent review and the standing owner authorization.
5. Resolve findings and all applicable exact-head gates. Mark the PR ready and merge with expected-head protection without a fresh owner-review request. Never bypass a red/unknown check or an actual permission denial.
6. Confirm the remote merge commit/tree and main checks. Keep branch deletion off until related worktrees are reconciled. Update the issue/epic checkpoint; close an issue only when its full acceptance is evidenced.
7. If maintaining repository-owned rules, preserve PR and automated-check controls. A routine human approval requirement is not part of the owner's selected workflow. Do not modify organization-enforced policy or impersonate a reviewer.
8. Keep security/dependency/license checks and secret protections. Never publish credentials or private logs. Do not weaken the product's per-client/root permission boundaries to automate project administration.

## Optional orchestration

AO is an optional future lane. Its launch-hook state, daemon, quota and isolated ownership must be verified before use. Keep MJobs sessions and settings untouched. Do not start an AO/model worker, fleet or automatic intake merely because the repository permits autonomous delivery.

Git worktree issue #66 remains a technical root-policy concern. Use an ordinary isolated clone for self-host qualification until its secure linked-worktree contract is implemented and accepted. Do not bypass the root guard.

CODEOWNERS records sensitive-file ownership and routing. Independent technical review remains required; the owner's standing delegation supplies the project authorization. All setup/configuration can be carried out by the authorized executor when supported, with no recurring manual owner checklist.
