# Managed Codex registration

`mterm-cli setup codex --root <absolute-root> [--allow-write] [--allow-exec]` prints a plan.
Add `--apply` to write a backed-up managed stanza. `mterm-cli remove codex [--apply]` previews
or removes only the exact owned stanza, preserving unrelated comments, CRLF and later additions.
`--name NAME` chooses an independent conservative alphanumeric/hyphen/underscore name.

The installed Node entry and runtime paths are absolute; do not remove that installation before
removing its registration. No model, browser login, public port, OS daemon or auth.json copy occurs.
Codex itself generates/parses candidate TOML in a separate temporary home before activation.
Unowned, edited, duplicated or changed-scope entries fail rather than being silently replaced.
The ownership journal and private local backups live under CODEX_HOME/.mterm-registration.
Configuration and journals are bounded; symlink/hardlink targets are refused.

The exclusive .mterm-setup.lock coordinates MTerm writers; stale locks are never stolen. Verify
process ownership before manual stale-lock recovery. Compare-before-rename is not an OS transaction
against hostile writers ignoring the lock. Windows files inherit existing ACLs; chmod is not an
ACL-hardening claim. Neither a parsed registration nor an SDK session proves a real Codex model
called every DesktopCommander-compatible tool; that broader acceptance remains open.

Verification: `node scripts/verify-managed-codex.mjs` uses only synthetic isolated homes and twice
launches the MCP executable parsed from the actual Codex configuration. Test-owned output is retained
under artifacts. `MTERM_VERIFY_BIN` selects a freshly installed artifact for the same verification.
