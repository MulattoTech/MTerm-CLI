# Execution prompt - DesktopCommander Codex parity to 100% / PASS

You are working in MulattoTech/MTerm-CLI, local checkout C:\Tools\Dev\MTerm-CLI, with Remote Desktop Commander and GitHub connected.

Your objective is not to summarize the project. Execute the work until MTerm-CLI reaches genuine 100% Codex-facing feature parity with DesktopCommanderMCP and the parity gate is PASS.

## Binding parity baseline

Use wonderwhy-er/DesktopCommanderMCP 0.2.52, commit c774c3b505de990219637ecdc9a830c8772fae9d, as the frozen comparison baseline unless the owner explicitly approves moving it. The upstream published MCP manifest exposes 26 tools. Read the exact upstream source and tests for each capability before implementing it.

Authoritative parity state:
- docs/DESKTOP_COMMANDER_CODEX_PARITY.md
- docs/roadmap/desktop-commander-parity.json
- GitHub epic #2 and child issues #3 through #50

## Scope

Reach parity with what DesktopCommanderMCP provides to OpenAI Codex:
- npm/npx-compatible package/install/update path;
- setup/remove and Codex MCP configuration;
- automatic Codex-managed stdio MCP lifecycle with no manual foreground server after setup;
- all published MCP tools with compatible names, schemas and results;
- filesystem, editing, search, config, terminal, process, session, usage, history and helper semantics;
- Excel, PDF and DOCX support exposed through those tools;
- relevant safety/configuration behavior;
- Windows, macOS and Linux package/Codex lifecycle validation.

Do not expand this parity gate to Claude-only Ext-App/file-preview UI or the separate DesktopCommander Remote Device/Web relay.

## Hard rules

1. Fetch and reconcile current main, then read AGENTS.md, HANDOFF, STATUS, ROADMAP, the parity ledger, and every open DCP issue.
2. Preserve user data, credentials, branches, checkpoints and unrelated Codex configuration. Never force-push/reset/clean as a shortcut.
3. Use TDD: compatibility test first, observe RED, implement, observe GREEN.
4. Prefer compatibility aliases/adapters over weakening MTerm's stricter safety internals.
5. Close each DCP issue independently only after its acceptance evidence is committed and the compatibility test passes.
6. Keep GitHub issues, parity JSON and roadmap synchronized after each bounded batch.
7. Do not award progress because code exists. Record actual evidence and remaining limitations.
8. Do not submit paid model prompts merely to test plumbing unless explicitly authorized. Prefer Codex help/config/MCP startup/non-model probes and synthetic CODEX_HOME.
9. Package/runtime tests must run from outside the source checkout.
10. Never claim cross-platform PASS from Windows-only results.

## Execution order

Gate 1 - Distribution/lifecycle: DCP-001 through DCP-008.
Gate 2 - Configuration/safety: DCP-009 through DCP-016.
Gate 3 - Files/editing/formats: DCP-017 through DCP-028.
Gate 4 - Search: DCP-029 through DCP-033.
Gate 5 - Process/terminal: DCP-034 through DCP-043.
Gate 6 - Observability/helpers: DCP-044 through DCP-048.
Gate 7 - Certification: clean package install, Codex setup/remove, automatic stdio lifecycle, full compatibility suite, supported OS matrix, package/license/security/roadmap gates.

## PASS criteria

Output PASS - DesktopCommander Codex parity complete only when:
- DCP-001 through DCP-048 are closed with committed evidence;
- epic #2 checklist is fully checked;
- all 26 pinned upstream MCP tools have compatible tested behavior;
- npm/package installation and Codex setup/remove work from clean environments;
- Codex automatically launches the installed MCP server after setup;
- supported OS matrix is green;
- roadmap/parity JSON exactly matches issue/evidence state;
- no required check, P0/P1 issue, security/license/package gate is unresolved.

Otherwise output BLOCKED with exact open DCP IDs and continue implementing every independent safe item before stopping.
