# MTerm-CLI status — 2026-11-02 UTC

**DesktopCommander Codex acceptance remains 0/48, NOT PASS.** The 300-item
weighted maturity ledger is a separate measurement. Neither passing CI nor a
merged implementation closes a full parity requirement.

## DCP-009 qualification and delivery

[PR #73](https://github.com/MulattoTech/MTerm-CLI/pull/73) carries tested implementation
`535d99e20b52a30ba9a24b6d2205d8e6687f6ca6`, based on verified main `c408e286`.
Native Windows Node 24.21.0 passed **175/175 tests, zero skips**, reviewed build,
normal check, self-host, real package verification, normal prepack, and source/
installed native-Codex registration checks. All four commands comprising the full
orchestration gate ran individually with retained exit results. A fresh committed
source extraction without dist/node_modules also passed locked install, reviewed
build, normal prepack and installed package verification.

The installed configuration proof covers eight scenarios, including bounded
metadata, two concurrent MCP processes and a restart; ten network canaries were
intercepted and zero product network attempts observed within the instrumented
Node APIs. Native Codex 0.160.1 parsed isolated registration; SDK clients called
the registered command. Actual Codex model tool invocation remains unperformed.

At the 12:02:49 UTC observation, implementation hosted checks are **9/9 passed**.
The initial push macOS ARM64 job timed out during npm tarball installation after
its tests passed. One supported rerun of that job passed at unchanged `535d99e`,
including package and native-Codex gates. The initial failed attempt and its
unestablished cause remain recorded. Final documentation/merged-main checks are
separate. Read the [delivery record](validation/2026-11-02-config-metadata-delivery.json)
and PR #73 for the latest exact-head outcome and eventual merge identity.

## Historical configuration sprint baseline

Starting main was verified at `059413ffa4fb3b18c8e15af907744a40e0b874a7`, after
PRs #69 and #70. PR #52 is merged; PR #67 is closed with its source incorporated.
All seven published product branches were ancestors of that main. There was no
additional unique product branch to merge. Access-check branches remain excluded.

The exact main passed fast CI and the four-platform matrix: Windows 2022,
Ubuntu 24.04, macOS 14 ARM64 and macOS 15 Intel. The old billing and canonical-path
failure notes are historical, not current blockers. See the
[baseline CI record](validation/2026-11-02-config-baseline-ci.json) and
[48-issue audit](validation/2026-11-02-config-issue-audit.json).

The configuration continuation delivered the bounded Windows replacement repair
through [PR #71](https://github.com/MulattoTech/MTerm-CLI/pull/71), source `2978774`,
and installed configuration qualification through
[PR #72](https://github.com/MulattoTech/MTerm-CLI/pull/72), implementation `def85d2`.
The latter passed 164/164 native Windows tests, normal package/prepack, self-host,
isolated source/installed Codex registration, all nine implementation hosted
checks and a fresh committed extraction. Its final documentation head and merged
main checks are recorded in PR #72's delivery comment. See the
[reliability report](validation/2026-11-02-config-retry.md),
[qualification report](validation/2026-11-02-config-installed-qualification.md) and
[delivery record](validation/2026-11-02-config-delivery.json).

## Implemented scope and remaining contracts

The DCP-009 implementation adds process/OS/memory metadata and pinned entry ordering
after a focused RED/GREEN campaign. It explicitly omits Python/container and
environment probes and retains owner authority. The [scoped report](validation/2026-11-02-config-metadata.md)
records its native/installed evidence and remaining exact contract differences.
This adds no acceptance credit.

Local native file/search/process/Git services, reversible managed Codex
registration, eight optional text/file compatibility aliases and the recovered
get_config/set_config_value implementation are present. Configuration changes
remain bounded by immutable owner-selected roots, shells and capability flags.
Running MCP instances load a fresh policy snapshot for newly admitted calls.

The full 26-tool contract remains incomplete. Missing or intentionally different
behavior includes complete config metadata/coercion, shell-command execution and
dynamic shell/blocklist contracts, process line pagination/PTY behavior,
asynchronous ripgrep searches, URL/image/office/PDF formats, directory/cross-device
moves, fuzzy edits, history and prompts. Empty roots deny access; runtime settings
cannot elevate owner capabilities; telemetry does not gain a network transport.

## Private remote staging

Staging still serves the previously verified `b90432a` artifact, with read-only
MCP enabled and only the owner Access policy. The completed SDK/service-principal
smoke passed 11/11 and its temporary identities were removed. This sprint makes
no new deployment or production promotion. See
[the remote sprint report](validation/2026-11-02-remote-sprint.md).

The owner approved `C:\Tools\Dev\MTerm-RemoteWorkspace`. Pairing through the
existing authenticated dashboard session, foreground online presence, graceful
stop/offline observation and reconnecting the same enrollment are verified.
Read-only permissions and no-autostart remain. A separate local-status recheck at
12:00:53.619 UTC again observed paired and online state. The foreground process
uses the earlier `config-qualification-20261102` clone at `c408e286`; preserve that
running checkout and inspect current state before starting another agent.

ChatGPT has **not** connected: zero client authorizations, no actual client tool
discovery or file read. Plugin creation returned non-retryable HTTP 409
`Scoped plugin release was deleted.`; the browser host gate also denied ChatGPT
navigation. Neither restriction was bypassed. A prepared plugin archive remains
available for a supported continuation. Fresh Google login was not performed.
The [owner connection report](validation/2026-11-02-owner-connection.md) records
the exact boundary. WEB acceptance remains **0/12**.

The original dirty Windows checkout, existing AO worktrees, MJobs activity,
real Codex configuration and credentials remain outside this sprint's changes.
