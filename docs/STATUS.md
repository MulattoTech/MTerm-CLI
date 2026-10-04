# Current local candidate status

Working Windows local-MCP preview0.0.1-preview.1; not complete RDC remote relay or a final release.

Implemented: official SDK stdio negotiation/discovery; bounded rooted files/search, hash-guarded
writes, regular-file move/mkdir; owned captured processes/output/stdin/stop; read-only Git; system
info/audit; existing Codex passthrough; strict small config; doctor; reversible setup plan; actual
packed install, isolated-prefix npm link and full300-ID roadmap with review enforcement.

Not implemented/certified: Web model routing, pi quota adapter, managed updater, Web-to-PC
transport, all RDC operations, GUI parity, PTY/reconnect, full Windows Job Objects, hostile path
races, macOS/Linux, hosted CI, production signing or release tags.

Final combined normal build/check passed: strict typecheck, format check, reviewed roadmap freshness,
and43/43 tests with0 failures or skips. Exact log: artifacts/final-check.log. A later revision must rerun it.
Existing Codex0.160.0 add/get/remove was verified in synthetic CODEX_HOME only. MTerm also ran
its own actual repository no-emit typecheck through MCP with exit0. No paid models or user auth changes.

GitHub product content publication is blocked by the current safety denial. GUI remains unchanged.
Read the generated roadmap for reviewed maturity; it is not readiness. Installed local-host runtime
is about14.03MB excluding external Node/Codex and unimplemented Web/quota; full50MB bundle not verified.
