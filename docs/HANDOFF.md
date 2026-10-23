# MTerm-CLI current handoff — local MCP implementation

Active checkout: C:/Tools/Dev/MTerm-CLI.
Local branch: feat/local-mcp-candidate-20261004; baseline d0b7c77.
GUI sibling: C:/Tools/Dev/MTerm-GUI at b5c4df5, unchanged in this pass.

Read AGENTS.md, STATUS.md, TODAY_CANDIDATE.md, SECURITY.md, ARCHITECTURE.md,
roadmap/METRICS.md and validation/2026-10-04-local-mcp.md first. The uploaded execution prompt is
scope, not permission to replace newer work. Newer two-repository/local-MCP priorities override
stale monorepo paragraphs in historical prompts. All300 original IDs remain in the seed/catalog.

## Recovery

Interrupted untracked JavaScript is preserved verbatim under:
artifacts/checkpoints/resume-20261004T001338Z/interrupted-files/
Its source ZIP, hashes and verified all-refs bundle are adjacent. Do not restore it over the
working implementation. Core-green and final checkpoints live under artifacts/checkpoints/.
Original GUI/legacy/user source was not deleted. Only test-owned temporary fixtures are disposable.

## Working local preview

Compiled TypeScript ESM on Node24 uses the official MCP SDK. Default read-only rooted files;
separate --allow-write and --allow-exec flags; strict schemas/UTF8/hash conflicts; bounded literal
search, captured processes, UTF8 cursor rings, stdin queues, best-effort tree stop; Git read-only;
system information and metadata-only in-memory audit. No network listener or daemon.
Offline help/config/doctor and unchanged existing Codex launch. Setup prints its reversible plan;
registration was tested only in synthetic CODEX_HOME. No real login, auth read or user config change.

Start-MTerm-CLI.ps1 uses the verified Node24 recorded in artifacts/node-lts.json when available;
a fresh clone needs its own supported Node. No automatic build/dependency/browser installation.
Status/quota, Web routes/relay, managed updater and true terminal/PTY remain unimplemented.

## Verify before delivery

Use Node24.21.0 for current Windows evidence. build:code is the development-only compiler path.
Normal build/check/prepack require explicit reviewed fingerprints:
node scripts/roadmap.mjs --review --change CHANGE_ID
node scripts/roadmap.mjs --render
npm run build
npm run check
node scripts/verify-codex-setup.mjs
node scripts/verify-package.mjs
node scripts/verify-self-host.mjs

Update affected requirement stages/evidence or justify unchanged stages before review. Rendering
never awards credit. Package lock and npm-shrinkwrap must match. SDK callback cancellation is
ctx.mcpReq.signal; do not replace negotiation with a hand-written echoed-version implementation.

## Publication blocked

GitHub reads/branch creation passed, but content-write was denied by platform safety checks.
Do not bypass via local Git push, another API, credentials, scopes or protection edits.
Local commits and bundles preserve work; they are NOT remote publication. No tag/merge/hosted CI.
The access-check branch is permission evidence, not product work.

## Next bounded engineering tasks

1. Native Windows Job Objects for stronger pre-execution/detached descendant containment.
2. Handle-anchored file operations if hostile concurrent local writers are in scope. Current
   root/link/hash checks are defense in depth, not OS sandbox enforcement.
3. Fresh source/pin/credential-refresh tests for pi-codex-status, retaining actual quota labels.
4. Supported authenticated Web-to-local relay. Stdio does not replace RDC reach in ChatGPT Web.
5. Transactional verified-pin updates, complete platform/PTY/soak matrix, distribution signing
   and complete three-upstream size accounting. Keep missing features visible, not fake ready.
6. Continue source-project provenance and full300-ID metrics without importing GUI progress.

Do not delete the archived legacy repository or local recovery checkpoints for cleanup.

## Codex/DesktopCommander parity is now the release gate

The user narrowed the replacement requirement to 100% DesktopCommanderMCP parity for Codex. Baseline is 0.2.52 / c774c3b505de990219637ecdc9a830c8772fae9d. Epic #2 indexes DCP-001 through DCP-048 (#3-#50). Work those issues independently; do not close the epic or claim PASS until all 48 are accepted. Claude-only preview UI and the Remote Device/Web relay are outside this Codex parity gate. Use docs/execution/DESKTOP_COMMANDER_100_PASS_PROMPT.md for the next full execution pass.

## Current orchestration preparation (2026-10-21)
The docs/ORCHESTRATION.md and docs/GITHUB_ORCHESTRATION_SETUP.md files define AO project setup, worker ownership, bounded verification and GitHub policy. The primary checkout has unpublished edits and must not be reset. AO Codex hook diagnostics and hosted platform path tests currently fail; do not call autopilot production-ready. PR #52 and stacked PR #67 are open; their source is not in main.
