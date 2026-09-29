# MTerm-CLI

Standalone command-line sibling of [MTerm-GUI](https://github.com/MulattoTech/MTerm-GUI).

> **Current state:** repository split/bootstrap and executable implementation specification are present. This README does not claim the CLI is feature-complete or released.

## Product goal
MTerm-CLI will preserve the familiar OpenAI Codex terminal experience while adding carefully bounded integration for:
- OpenAI Codex CLI as the actual coding agent/TUI;
- codex-chatgpt-web where its real browser/runtime/auth constraints can satisfy, or receive an explicit exception to, the CLI requirements;
- pi-codex-status for Codex usage/status data with boxed, line and normalized JSON output.

Required command surface: mterm-cli, status, status --line, status --json, update, and config, plus only narrowly necessary help/doctor/setup operations.

## Start here
1. Read AGENTS.md.
2. Read docs/execution/READ_FIRST.md.
3. Execute docs/execution/MASTER_IMPLEMENTATION_PROMPT.md with Remote Desktop Commander and GitHub connected.
4. Expand and review docs/roadmap/requirements-seed.json. Its 300 seeds grant no completion credit by themselves.

Desktop development, the native C++/Qt application, Electron reference and GUI roadmap now live at [MTerm-GUI](https://github.com/MulattoTech/MTerm-GUI). The former [MTerm](https://github.com/MulattoTech/MTerm) repository is migration/history source only. See docs/REPOSITORY_SPLIT.md.

The intended first complete CLI release is 0.1.0, but no tag or release should be created until mandatory integration, platform, footprint, licensing and test gates genuinely pass.
