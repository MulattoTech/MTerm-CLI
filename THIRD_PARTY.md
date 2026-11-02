# Third-party inventory

MTerm-owned code is MIT. Dependencies retain their own notices and are not re-licensed by MTerm.

- @modelcontextprotocol/server 2.3.0: Apache-2.0; runtime. Integrity is recorded in the npm lock/shrinkwrap and versions.json.
- @modelcontextprotocol/client 2.3.0: Apache-2.0; development only. Integrity is recorded in the npm lock/shrinkwrap and versions.json.
- zod 4.6.5: MIT; runtime. Integrity is recorded in the npm lock/shrinkwrap and versions.json.
- typescript 7.0.2: Apache-2.0; development only. Integrity is recorded in the npm lock/shrinkwrap and versions.json.
- @types/node 26.6.4: MIT; development only. Integrity is recorded in the npm lock/shrinkwrap and versions.json.
- prettier 3.9.9: MIT; development only. Integrity is recorded in the npm lock/shrinkwrap and versions.json.

The installed Codex is an external prerequisite, not vendored source or a bundled executable.
Its original OpenAI project/license remains separate (the project uses Apache-2.0). The wrapper
uses the official existing executable/npm entry and does not modify it. No Web-launcher or
pi-codex-status code is included yet. Their licenses, exact commits and compatibility must be
re-verified before importing or shipping those components.

Keep production dependency license files in distribution. Python/TypeScript compiler, official
MCP test client and formatting tools are development-only. The installed application does not
require Qt/Electron, a C++ toolchain or Python. System Node remains a declared prerequisite.

## Read-only parity reference snapshots

`docs/parity/upstream/` contains selected MIT DesktopCommanderMCP0.2.52 source at
c774c3b505de990219637ecdc9a830c8772fae9d. Original LICENSE is retained there. Those files
are not attributed to MTerm or bundled in the installed runtime; they are hashed conformance inputs.
They are never executed by the drift detector.
