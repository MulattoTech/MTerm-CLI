# Contributing to MTerm-CLI

MTerm-CLI is developed independently from MTerm-GUI.

Every contribution must:
- identify affected CLI-NNN requirement IDs;
- include tests/evidence appropriate to the claimed stage;
- state actual platform coverage and intentional skips;
- preserve authentication/security boundaries and user state;
- update status, roadmap and handoff when implementation state changes;
- retain upstream licenses and scoped AI/human provenance;
- avoid unrelated GUI changes.

AI-authored commits should record AI-Provider, AI-Model, AI-Change and Tests trailers when known. Use unknown rather than inventing identity.

Comments should explain invariants, ownership, units, lifecycle/security choices and non-obvious failure behavior rather than narrating every line.

## Current local preview / mandatory metric review
Read docs/HANDOFF.md, docs/SECURITY.md and docs/roadmap/METRICS.md before changing source.
Keep the full300-ID seed unchanged; update reviewed stages/evidence or justify no stage change.
Record actual provider/model/UTC/tests plus roadmap_updates, explicitly review, then render/check.
Use build:code for development only; normal build/check/pack must reject stale review.
Do not bypass the current GitHub content-write safety denial by using local Git or another API.
No actual user Codex config/auth is modified by setup; it prints a reversible plan.

## Codex parity execution update (2026-10-05)
Read docs/parity/README.md and the DCP ledger. `setup codex` is preview-only unless `--apply` is explicit; `remove codex --apply` removes only an exact owned stanza. Tests use isolated CODEX_HOME and never real auth. GitHub content writes were freshly verified on an excluded access-check branch; prior denial notes are historical, not current proof. Source fingerprints normalize CRLF to LF for known UTF-8 text; all real source changes still require metric review.
