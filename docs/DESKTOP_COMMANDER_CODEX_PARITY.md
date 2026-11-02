# DesktopCommanderMCP to MTerm-CLI Codex parity ledger

Baseline: wonderwhy-er/DesktopCommanderMCP 0.2.52, commit c774c3b505de990219637ecdc9a830c8772fae9d.

Scope: everything DesktopCommanderMCP exposes to OpenAI Codex through its npm/MCP server and setup lifecycle. Claude-only preview/Ext-App UI, marketplace presentation, and the separate Remote Device / ChatGPT-Web relay are not required for this Codex parity gate.

Current gate: NOT PASS - 0/48 atomic parity-gap issues closed. Existing MTerm functionality may overlap a gap, but an issue stays open until compatibility acceptance proves the full pinned behavior.

## Published DesktopCommander MCP surface

get_config, set_config_value, read_file, read_multiple_files, write_file, write_pdf, create_directory, list_directory, move_file, start_search, get_more_search_results, stop_search, list_searches, get_file_info, edit_block, start_process, read_process_output, interact_with_process, force_terminate, list_sessions, list_processes, kill_process, get_usage_stats, get_recent_tool_calls, give_feedback_to_desktop_commander, get_prompts

## Atomic gaps

| ID | Issue | Gap | State |
|---|---:|---|---|
| DCP-001 | [#3](https://github.com/MulattoTech/MTerm-CLI/issues/3) | NPM-installable package and npx entry point | OPEN |
| DCP-002 | [#4](https://github.com/MulattoTech/MTerm-CLI/issues/4) | Idempotent Codex setup/registration command | OPEN |
| DCP-003 | [#5](https://github.com/MulattoTech/MTerm-CLI/issues/5) | Codex remove/uninstall with backup and rollback | OPEN |
| DCP-004 | [#6](https://github.com/MulattoTech/MTerm-CLI/issues/6) | Codex-managed background MCP lifecycle with no manual foreground server | OPEN |
| DCP-005 | [#7](https://github.com/MulattoTech/MTerm-CLI/issues/7) | Private/GitHub-friendly install and update path | OPEN |
| DCP-006 | [#8](https://github.com/MulattoTech/MTerm-CLI/issues/8) | Cross-platform npm/Codex install validation | OPEN |
| DCP-007 | [#9](https://github.com/MulattoTech/MTerm-CLI/issues/9) | DesktopCommander-compatible MCP tool names and schemas | OPEN |
| DCP-008 | [#10](https://github.com/MulattoTech/MTerm-CLI/issues/10) | Pinned upstream parity baseline and drift detector | OPEN |
| DCP-009 | [#11](https://github.com/MulattoTech/MTerm-CLI/issues/11) | Implement get_config MCP parity | OPEN |
| DCP-010 | [#12](https://github.com/MulattoTech/MTerm-CLI/issues/12) | Implement set_config_value MCP parity | OPEN |
| DCP-011 | [#13](https://github.com/MulattoTech/MTerm-CLI/issues/13) | Support multiple allowedDirectories roots | OPEN |
| DCP-012 | [#14](https://github.com/MulattoTech/MTerm-CLI/issues/14) | Implement configurable blockedCommands enforcement | OPEN |
| DCP-013 | [#15](https://github.com/MulattoTech/MTerm-CLI/issues/15) | Implement defaultShell configuration | OPEN |
| DCP-014 | [#16](https://github.com/MulattoTech/MTerm-CLI/issues/16) | Implement configurable file read/write line limits | OPEN |
| DCP-015 | [#17](https://github.com/MulattoTech/MTerm-CLI/issues/17) | Implement telemetryEnabled configuration semantics | OPEN |
| DCP-016 | [#18](https://github.com/MulattoTech/MTerm-CLI/issues/18) | Dynamic cross-process config reload without server restart | OPEN |
| DCP-017 | [#19](https://github.com/MulattoTech/MTerm-CLI/issues/19) | read_file negative offset / tail semantics | OPEN |
| DCP-018 | [#20](https://github.com/MulattoTech/MTerm-CLI/issues/20) | read_file URL support | OPEN |
| DCP-019 | [#21](https://github.com/MulattoTech/MTerm-CLI/issues/21) | read_multiple_files tool parity | OPEN |
| DCP-020 | [#22](https://github.com/MulattoTech/MTerm-CLI/issues/22) | write_file append mode parity | OPEN |
| DCP-021 | [#23](https://github.com/MulattoTech/MTerm-CLI/issues/23) | create_directory nested-path parity | OPEN |
| DCP-022 | [#24](https://github.com/MulattoTech/MTerm-CLI/issues/24) | Recursive list_directory depth parity | OPEN |
| DCP-023 | [#25](https://github.com/MulattoTech/MTerm-CLI/issues/25) | move_file files/directories and cross-filesystem parity | OPEN |
| DCP-024 | [#26](https://github.com/MulattoTech/MTerm-CLI/issues/26) | get_file_info complete metadata parity | OPEN |
| DCP-025 | [#27](https://github.com/MulattoTech/MTerm-CLI/issues/27) | edit_block surgical text replacement parity | OPEN |
| DCP-026 | [#28](https://github.com/MulattoTech/MTerm-CLI/issues/28) | Native Excel read/write/edit/search parity | OPEN |
| DCP-027 | [#29](https://github.com/MulattoTech/MTerm-CLI/issues/29) | PDF read/create/modify parity | OPEN |
| DCP-028 | [#30](https://github.com/MulattoTech/MTerm-CLI/issues/30) | DOCX read/create/edit/search parity | OPEN |
| DCP-029 | [#31](https://github.com/MulattoTech/MTerm-CLI/issues/31) | Asynchronous start_search session model | OPEN |
| DCP-030 | [#32](https://github.com/MulattoTech/MTerm-CLI/issues/32) | get_more_search_results pagination | OPEN |
| DCP-031 | [#33](https://github.com/MulattoTech/MTerm-CLI/issues/33) | stop_search cancellation | OPEN |
| DCP-032 | [#34](https://github.com/MulattoTech/MTerm-CLI/issues/34) | list_searches session inventory | OPEN |
| DCP-033 | [#35](https://github.com/MulattoTech/MTerm-CLI/issues/35) | Ripgrep search options parity | OPEN |
| DCP-034 | [#36](https://github.com/MulattoTech/MTerm-CLI/issues/36) | start_process shell/default-shell command parity | OPEN |
| DCP-035 | [#37](https://github.com/MulattoTech/MTerm-CLI/issues/37) | start_process timeout/background/readiness detection | OPEN |
| DCP-036 | [#38](https://github.com/MulattoTech/MTerm-CLI/issues/38) | interact_with_process wait-for-prompt semantics | OPEN |
| DCP-037 | [#39](https://github.com/MulattoTech/MTerm-CLI/issues/39) | read_process_output line pagination and tail semantics | OPEN |
| DCP-038 | [#40](https://github.com/MulattoTech/MTerm-CLI/issues/40) | force_terminate parity | OPEN |
| DCP-039 | [#41](https://github.com/MulattoTech/MTerm-CLI/issues/41) | list_sessions metadata and completed-session retention | OPEN |
| DCP-040 | [#42](https://github.com/MulattoTech/MTerm-CLI/issues/42) | System-wide list_processes tool parity | OPEN |
| DCP-041 | [#43](https://github.com/MulattoTech/MTerm-CLI/issues/43) | System-wide kill_process tool parity | OPEN |
| DCP-042 | [#44](https://github.com/MulattoTech/MTerm-CLI/issues/44) | Interactive PTY/REPL fidelity for SSH, databases and dev servers | OPEN |
| DCP-043 | [#45](https://github.com/MulattoTech/MTerm-CLI/issues/45) | Terminal output encoding and null-byte parity | OPEN |
| DCP-044 | [#46](https://github.com/MulattoTech/MTerm-CLI/issues/46) | get_usage_stats tool parity | OPEN |
| DCP-045 | [#47](https://github.com/MulattoTech/MTerm-CLI/issues/47) | Persistent get_recent_tool_calls history parity | OPEN |
| DCP-046 | [#48](https://github.com/MulattoTech/MTerm-CLI/issues/48) | Tool history rotation and trimming | OPEN |
| DCP-047 | [#49](https://github.com/MulattoTech/MTerm-CLI/issues/49) | give_feedback_to_desktop_commander compatibility behavior | OPEN |
| DCP-048 | [#50](https://github.com/MulattoTech/MTerm-CLI/issues/50) | get_prompts / onboarding prompt parity | OPEN |

## 100%-PASS definition

- [ ] all 48 gap issues closed with committed acceptance evidence
- [ ] clean npm/package install outside a development checkout
- [ ] idempotent Codex setup/remove preserving unrelated configuration
- [ ] Codex automatically starts and supervises MTerm as its stdio MCP child
- [ ] full pinned DesktopCommander MCP compatibility suite green
- [ ] supported Windows/macOS/Linux matrix green
- [ ] no unresolved P0/P1 parity issue
- [ ] roadmap/parity baseline, issue state, security/license/package gates green

Creating issues, implementing a subset, or reaching 100% on MTerm's broader weighted roadmap does not satisfy this parity gate. Every gap must close with evidence against the pinned upstream baseline.

## 2026-10-05 tested implementation progress, not accepted closure

PR #52 contains managed Codex registration/removal, pinned baseline/drift checks, portable npm
verification and eight opt-in text/file aliases.64 local tests plus installed npm-exec MCP and
actual Codex-parsed registration passed. All48 issues stay OPEN until their complete acceptance.
Implementation observations are attached to the corresponding DCP rows in the JSON ledger.

Hosted Actions jobs are blocked before steps by the account's payment/spending-limit gate.
No CI bypass, platform PASS or merge is claimed. See [evidence](validation/2026-10-05-codex-parity-foundation.md).
