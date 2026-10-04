# MTerm-CLI local host architecture

TypeScript compiles to ordinary ESM JavaScript on Node24. Runtime dependencies are the official
MCP server SDK and Zod. Native Codex is an explicitly reused external executable/npm wrapper.
The product has no Qt/Electron dependency, but GUI remains independently native C++/Qt.

- bin/mterm-cli.js: executable boundary and safe top-level diagnostics.
- cli.ts: named commands, lazy adapter loading, argument ownership after `--`.
- codex.ts/executables.ts: validated existing executable resolution and inherited TUI process.
- config.ts: strict small config, bounded reads, locked/versioned atomic writes, no stored grants.
- policy.ts/files.ts: canonical trusted-root checks and bounded file operations.
- processes.ts: typed owned captured jobs, UTF-8 ring buffers, cursor polling, stdin and shutdown.
- git.ts: bounded read-only Git inspection with scope/config guards.
- mcp.ts: official protocol/lifecycle adapter, schemas, least-privilege tool registration and bounds.
- errors.ts: stable safe error conversion and terminal-text helper.
- scripts/roadmap.mjs: development-only reviewed source/catalog fingerprints and local reports.

No duplicated protocol state machine or invented model catalog. The official SDK negotiates MCP
versions and validates requests. Services remain independently unit-testable and MCP integration
uses the official client against a real server subprocess. No schema is assumed from a marketing
feature list. Tool output is data, never new permission or instruction authority.

A future GUI adapter may implement this vocabulary behind its native services; the GUI is not
imported at runtime. Web relay is an independent authenticated transport requirement and remains
unimplemented. No local-stdio result is presented as proof of ChatGPT Web connectivity.
