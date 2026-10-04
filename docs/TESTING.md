# Verification commands

Use Node24 LTS. Initial execution used the workstation's Node25 only during development; the
candidate gate is rerun with downloaded official Node24.21.0 on Windows x64.

```text
npm run build:code
npm run typecheck
npm test
node scripts/verify-codex-setup.mjs
node scripts/verify-package.mjs
node scripts/roadmap.mjs --check
```

`build:code` is the explicit development-only compile path. Normal build/check/pack gates require
fresh roadmap review. Update affected IDs and change record before --review; --render never grants
credit. Test phases and real red failures are recorded under ignored artifacts and summarized in
docs/validation/2026-10-04-local-mcp.md.

Tests use temporary files and deterministic child code, not auth or coding model calls. The official
MCP client communicates over actual subprocess stdio. The Codex setup verifier creates a dedicated
CODEX_HOME and removes only its own registration. The package verifier uses owned temporary npm
prefix/home/cache and retains artifacts for evidence; it does not install into the user's global prefix.

No hosted CI, macOS/Linux runner, full interactive Codex model invocation or Web session has been
validated. Tests with synthetic programmatic stdout/input do not certify every terminal emulator.
