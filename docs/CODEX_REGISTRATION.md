# Managed Codex registration

`mterm-cli setup codex --root <absolute-root> [--allow-write] [--allow-exec] [--process-budget JSON]` prints a plan.
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

Optional `--compat-desktop-commander` is saved in the generated command and verified by installed
registration tests. It enables the eight implemented text/file aliases and `get_config`;
`set_config_value` additionally requires `--allow-config-write`. These additions do not claim
complete DesktopCommander compatibility or remove native MTerm tools. Changing a saved scope
or profile requires deliberate removal/reconfiguration; a repeated setup never widens it silently.

## Compatibility configuration in a managed registration

Repeated `--root` options select explicit owner roots. `--compat-config <absolute-file>`
selects a dedicated compatibility policy; `--allow-config-write` grants permission to change
its supported preferences. File-write permission alone does not grant that capability.
The options are saved in the owned Codex command and survive an idempotent setup preview/apply.
Use a dedicated policy path and synthetic `CODEX_HOME` for tests; never test against real auth.

Preferences cannot expand the startup root/shell ceilings or enable file-write/process
capabilities. Empty `allowedDirectories` denies new file work. Each newly admitted call reads
a bounded policy snapshot, so another running process sees later changes without a restart.
Already admitted operations retain their own snapshot, and owned cleanup remains available
when malformed policy denies new work. Configuration locking coordinates MTerm writers;
it does not make unrelated filesystem writers transactional.

The revised verifier registers two synthetic roots and an explicit synthetic policy path,
discovers both configuration tools, changes a read default and checks it after restarting the
registered command. Its child exit check independently observes the captured PID's exit;
the SDK clearing its PID field alone is insufficient. The report continues to distinguish
actual Codex TOML parsing plus SDK-invoked registered commands from model-driven tool calls:
`actualCodexAgentToolInvocation` remains `false`.

[Installed configuration evidence](validation/2026-11-02-config-installed-qualification.md)
records a passing standalone Windows package probe and the later passing revised source-entry
and installed-entry managed-Codex gates. Both native runs used test-owned Codex 0.160.1;
actual model-driven invocation remains unverified.

## Process budgets in a managed command

`--process-budget JSON` preserves the same strict per-host policy accepted by explicit stdio
startup. Preview shows one normalized JSON argument; explicit `--apply` saves that argument in
Codex's managed command. Execution still requires `--allow-exec`, and writes still require their
separate grants. Selecting a budget adds no root, shell, network or remote permission.

Omitting this option preserves the existing command and ownership hash. An explicit `{}` selects
and saves the effective defaults, so it differs from omission even when both start with the same
limits. Equivalent object key order produces the same normalized plan. Canonical decimal disk
values stay strings, including values beyond JavaScript's safe integer range. The existing
1,024-byte JSON input limit, duplicate-option refusal and strict supported-field checks remain.

For example, this POSIX-shell preview selects two owned jobs and a 65,536-byte retained-output
ceiling, without granting execution:

```sh
mterm-cli setup codex --root /absolute/root --process-budget '{"maxSessions":2,"maxOutputBytes":65536}'
```

Changing a registered budget produces a different plan. Preview still prints that plan. A repeated
setup with `--apply` refuses the conflict rather than silently replacing or widening the owned entry. Preview the exact owned removal, apply it
when intended, then preview and apply the replacement setup. Unowned, edited and ambiguous
entries retain their existing preservation rules. Removal continues to preserve unrelated
configuration and private backups. Managed isolation-policy and optional-pack registration
remain outside this supported path.

Each registered MCP host enforces its own policy. This does not add shared limits across hosts,
hard CPU/GPU/RAM or disk-write quotas, or complete AUG-012/DCP-002 acceptance. Field definitions
and admission limits are in [Process and drive admission](parity/RESOURCE_BUDGETS.md).

The dedicated [registration regression](../tests/codex-budget-registration.test.mjs) checks
preview, normalized ownership, conflicts, removal and a real SDK host with no execution grant.
Its injected TOML-table cases test ownership bookkeeping; the separate real-Codex verifier
parses the actual saved command with pinned Codex and checks budget propagation through both
existing SDK sessions, owner ceilings, bounded job admission and confirmed release. Reported
raw-observation hashes refer to runner-local files unless those files are separately collected.
Actual results and remaining qualification are recorded in the
[dated change record](validation/2026-11-09-managed-process-budgets.md).
