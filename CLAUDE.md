# Claude contributor entry point

Read AGENTS.md first, then docs/execution/READ_FIRST.md and docs/execution/MASTER_IMPLEMENTATION_PROMPT.md.

Use the actual model/provider identity available to the session or record unknown. Do not invent completion, platform results, credentials, ETAs or upstream compatibility.

## Current local preview / mandatory metric review
Read docs/HANDOFF.md, docs/SECURITY.md and docs/roadmap/METRICS.md before changing source.
Keep the full300-ID seed unchanged; update reviewed stages/evidence or justify no stage change.
Record actual provider/model/UTC/tests plus roadmap_updates, explicitly review, then render/check.
Use build:code for development only; normal build/check/pack must reject stale review.
Verify current GitHub permissions; never bypass an active publication denial.
Setup defaults to a reversible plan; managed --apply requires explicit authorization. Tests must never modify actual user Codex auth/config.

## Codex parity execution update (2026-10-05)
Read docs/parity/README.md and the DCP ledger. `setup codex` is preview-only unless `--apply` is explicit; `remove codex --apply` removes only an exact owned stanza. Tests use isolated CODEX_HOME and never real auth. GitHub content writes were freshly verified on an excluded access-check branch; prior denial notes are historical, not current proof. Source fingerprints normalize CRLF to LF for known UTF-8 text; all real source changes still require metric review.

Current continuation: docs/execution/NEXT_PARITY_PROMPT.md. Reconcile the actual PR52 head before using main; do not discard unmerged verified work or bypass failing or unverified hosted gates.

For orchestrated work, read docs/ORCHESTRATION.md and coordinate via issue ownership, isolated worktrees and exact-HEAD CI. Never self-award parity closure.
