# MTerm-CLI contributor instructions

This is the standalone CLI repository. The desktop application lives at https://github.com/MulattoTech/MTerm-GUI.

Before modifying source:
1. Read docs/execution/READ_FIRST.md and docs/execution/MASTER_IMPLEMENTATION_PROMPT.md.
2. Inspect current Git/local state and upstream pins; never assume dated prompt observations are current.
3. Select exact CLI-NNN requirements from docs/roadmap/requirements-seed.json and expand acceptance/evidence before awarding progress.
4. Record actual provider/model or unknown, UTC, base SHA, files, decisions, tests, limitations and next unverified action in a dated change record.
5. Write failing tests before behavior changes. No paid/model-consuming tests or browser-login automation without explicit authorization.
6. Preserve Codex safety controls, credentials, browser sessions and user state. Never export tokens/cookies or weaken TLS/approval settings.
7. CLI runtime must not import/install Qt, Electron or MTerm-GUI merely to launch normal Codex/status/config.
8. Keep blocked Web/auth/size/platform requirements visible. Never manufacture completion, ETAs, model lists, quota values or CI success.
9. Update roadmap metrics/evidence and contributor handoff with every source change. Rendering does not award progress automatically.
10. Preserve upstream licenses/notices and original authorship. AI provenance is self-reported metadata, not cryptographic proof.

Use Remote Desktop Commander for the authorized workstation and GitHub connector/local Git only within demonstrated permissions. Never force-push, reset/clean away user work, change OAuth scopes, or delete the legacy repo merely to simplify history.

## Current local preview / mandatory metric review
Read docs/HANDOFF.md, docs/SECURITY.md and docs/roadmap/METRICS.md before changing source.
Keep the full300-ID seed unchanged; update reviewed stages/evidence or justify no stage change.
Record actual provider/model/UTC/tests plus roadmap_updates, explicitly review, then render/check.
Use build:code for development only; normal build/check/pack must reject stale review.
Do not bypass the current GitHub content-write safety denial by using local Git or another API.
No actual user Codex config/auth is modified by setup; it prints a reversible plan.

## Codex parity execution update (2026-10-05)
Read docs/parity/README.md and the DCP ledger. `setup codex` is preview-only unless `--apply` is explicit; `remove codex --apply` removes only an exact owned stanza. Tests use isolated CODEX_HOME and never real auth. GitHub content writes were freshly verified on an excluded access-check branch; prior denial notes are historical, not current proof. Source fingerprints normalize CRLF to LF for known UTF-8 text; all real source changes still require metric review.

Current continuation: docs/execution/NEXT_PARITY_PROMPT.md. Reconcile the actual PR52 head before using main; do not discard unmerged verified work or bypass the account-blocked hosted gate.

## One-command automation entry point (2026-10-18)

The root `Install-MTermCLI.ps1` is the supported PowerShell entry for one-command local setup/repair/readiness and one-issue Codex development. It **delegates** to the existing `scripts/automation/` modules rather than duplicating Codex configuration mutation. Plan, Install, Repair and Sprint are preview-only unless the human adds `-Apply` or `-Execute` for the respective operation. Verify never grants a capability.

Do not classify local setup as Cloudflare remote-agent readiness. The active `WEB-011` issue remains open. When changing automation, run the real PowerShell syntax/preview tests and review CLI-175/291/292/297/300 through `roadmap.mjs` without self-awarding completion. New autonomous sprints start from the current clean committed HEAD unless the owner specifies a different reviewed base, and must record its resolved SHA.
