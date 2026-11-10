# Process and drive admission

This is the per-host implementation slice of [AUG-012 / #92](https://github.com/MulattoTech/MTerm-CLI/issues/92), extending the existing CLI-259 and CLI-286 controls. Full AUG-012 acceptance remains open.

The local stdio host limits in-flight work, pending starts, owned parent processes, retained output and requested runtime. An optional immutable disk policy rejects observed or declared overcommit before spawning. It does not enforce child CPU, GPU, RSS or disk-write quotas, and it does not coordinate independent hosts.

## Owner policy

Pass one `--process-budget JSON` option to `mterm-cli mcp --stdio --root PATH`. The JSON must be a strict object of at most 1,024 UTF-8 bytes. Unknown keys, invalid numbers and duplicate options fail. Parsing copies and freezes the policy; MCP calls cannot raise it.

For example, this policy limits this host to two owned jobs and requires measured disk headroom:

```json
{
  "maxSessions": 2,
  "maxPendingStarts": 2,
  "maxOutputBytes": 65536,
  "maxRuntimeMs": 60000,
  "admissionTimeoutMs": 3000,
  "disk": {
    "minFreeBytes": "1073741824",
    "highWaterPercent": 90,
    "maxJobScratchBytes": "268435456"
  }
}
```

Execution still requires `--allow-exec`. Pack execution still requires its exact owner-selected registry and pack grants. Budget configuration adds no root, write, executable, network or remote permission.

| Owner field | Default | Supported values |
| --- | --- | --- |
| `maxSessions` | 8 | Integer 1–8 owned parent jobs |
| `maxPendingStarts` | 4 | Integer 1–8 physically pending start admissions |
| `maxOutputBytes` | 262,144 | Integer 1,024–1,048,576 retained bytes per job |
| `maxRuntimeMs` | 3,600,000 | Integer 100–3,600,000 |
| `admissionTimeoutMs` | 3,000 | Integer 100–30,000 |
| `disk` | Disabled | Optional strict object below |
| `disk.minFreeBytes` | `"0"` | Canonical unsigned decimal string |
| `disk.highWaterPercent` | 95 | Integer 1–100 |
| `disk.maxJobScratchBytes` | `"1073741824"` | Canonical unsigned decimal string |

Byte strings allow 1–30 digits, from `0` through `999999999999999999999999999999`. Leading zeros, signs, exponent notation and whitespace are refused before BigInt conversion. Measured statistics outside the same accounting range fail closed.

The existing `tools` command reports the effective policy. Managed `setup codex --process-budget …`
previews the normalized policy and preserves it as one JSON argument when explicitly applied.
Omitting the option preserves the previous command and ownership hash; explicit `{}` selects
and records the defaults. Reordered keys normalize identically, and decimal disk strings are
preserved exactly. Applying a different budget to an existing registration remains a changed-plan
conflict: deliberate exact owned removal and reconfiguration are required. The existing ownership, backup and unrelated-byte
preservation rules are unchanged; see [Managed Codex registration](../CODEX_REGISTRATION.md).
Budget selection still grants no execution or write capability.

## Per-job requests

`mterm_start_process` retains structured executable/argument execution and adds these optional fields:

| Field | Behavior |
| --- | --- |
| `timeoutMs` | May narrow the owner's runtime ceiling. Omission uses `min(300000, maxRuntimeMs)`. |
| `maxOutputBytes` | May narrow the owner's retained-output ceiling. Omission uses that ceiling. |
| `scratchBytes` | Declared scratch estimate, at most the owner's maximum. Omission under disk policy reserves the owner's maximum estimate. |
| `placement.candidates` | Explicit list of 1–16 existing directories; selects among them after scope and disk checks. |
| `cwd` | Preserved as supplied; omission without placement uses the first trusted root. |

An explicit `cwd` and `placement` together are invalid. Scratch and placement requests are refused when disk admission is disabled. Unknown hard-quota fields such as `cpuPercent` are rejected by the strict schema. Discovery omits owner-dependent defaults; effective defaults are reported in resource status.

Optional packs use the same owned process service, pending limits, scratch estimate and final admission boundary. Their declared runtime maximum is narrowed to the owner ceiling. ABI 1 still has no per-invocation pack scratch field.

## Work admission and cleanup

Four normal tool operations and two owned-control operations can be in flight. The fixed control allowlist is `mterm_stop_process`, `mterm_read_process_output` and `mterm_list_sessions`. Total handler concurrency can therefore reach six. Each lane rejects excess requests immediately with `BUSY`; there is no queued work (`maxQueued: 0`).

Owned control requests do not wait for compatibility configuration or perform disk probes. They remain reachable while normal calls occupy their lane, while pending starts are full, and after malformed compatibility configuration. A control-lane overload is still bounded and returns `BUSY`.

`mterm_list_sessions.resources` reports in-memory limits, effective defaults, current counters, backend version/platform, a host instance identifier, and explicit unsupported-enforcement flags. `mterm_capabilities` reports the same scope and effective limits through the normal lane. A status request counts itself as active until its handler finishes. The instance identifier is descriptive and grants no authority.

The existing bounds remain:

- At most 32 retained sessions.
- At most 512 retained output events per session, within that job's byte cap.
- At most 64 KiB queued stdin per job.
- At most 512 KiB serialized tool response, 2 MiB input frame and 4 MiB pending protocol output before backpressure closure.
- A bounded 256-entry audit ring.

Runtime timeouts request owned termination. Output-byte limits bound captured retention, not total bytes a child generates or its RSS. Active-job counts cover owned parent handles, not every possible detached descendant.

## Disk measurement and placement

The backend is Node.js `fs.statfs(path, { bigint: true })` on the selected Node 24 runtime. Available-to-user bytes are `bavail * bsize`; the code does not substitute privileged free space. Capacity and reservation comparisons use integer arithmetic, and responses serialize bytes as decimal strings.

Each requested candidate must pass the immutable trusted-root ceiling and the effective request scope. Private paths, links, outside roots and non-directories are refused. Canonically duplicate candidates are inspected once. The implementation does not enumerate system drives, create directories, move projects, copy files or delete user data.

For each candidate:

```text
required free = max(minFreeBytes, ceil(totalBytes * (100 - highWaterPercent) / 100))
headroom = availableToUserBytes - required free - this host's active reservations
```

The candidate must cover the new declared scratch estimate. Selection uses the greatest qualifying headroom; ties use canonical path code-point order. A supplied cwd is the only candidate unless placement was explicitly requested.

The high-water calculation conservatively treats space unavailable to the current user as unavailable capacity. `statfs.type` and path spelling are not volume identifiers. All candidates therefore share one conservative reservation pool, subtracted from every observation, even if some directories occupy different volumes.

After filesystem work, admission rechecks cancellation, the one overall deadline, current scope, execution/pack guards, active capacity and reservation capacity. The final debit and spawn contain no intervening await. Concurrent jobs cannot independently spend the same observed reservation headroom within this instance.

An owned job's completion invalidates any still-pending disk observation, including when its reservation returns to zero. The pending start fails with `DISK_OBSERVATION_STALE` and may be explicitly retried; no automatic retry queue is created. This prevents reusing a pre-write observation after another owned job leaves files behind.

The returned budget includes selected-candidate total/available bytes, required free bytes, observation time, candidate count and reservation scope. It does not promise that capacity stays unchanged afterward. A child can exceed its declaration or write elsewhere, and another program can consume disk after observation. These are admission estimates, not hard disk-write quotas.

## Cancellation, failure and recovery

One cooperative admission deadline covers all path, executable and disk validation. Native MCP starts now receive their cancellation signal; packs retain their final cancellation/selection/deadline guard.

`statfs` has no abort-signal option. A cancelled or overdue physical request retains its pending slot until the actual I/O settles. Late results are checked before any spawn or reservation commit. No timeout race creates abandoned, uncounted I/O. A blocked operating-system call can exceed the cooperative deadline in wall time.

Pending admission releases in `finally`. A job's reservation releases exactly once on confirmed process closure, synchronous spawn failure or failure before a successful spawn event. A later child `error` may mean a failed kill and does not release a still-live job. An unconfirmed stop retains ownership/accounting and reports the existing cleanup limitation.

| Failure | Result |
| --- | --- |
| Normal/control lane full | `BUSY` |
| Pending start limit | `START_LIMIT` |
| Owned active/retained capacity | `SESSION_LIMIT` |
| Request above owner ceiling | `BUDGET_EXCEEDED` |
| Scratch/placement without disk policy | `DISK_BUDGET_DISABLED` |
| Insufficient observed headroom | `DISK_HEADROOM` |
| Owned job completed after observation | `DISK_OBSERVATION_STALE` |
| Unsupported disk backend | `DISK_UNSUPPORTED` |
| Disk permission denied | `DISK_PERMISSION_DENIED` |
| Invalid backend statistics | `DISK_INVALID_STATS` |
| Other disk observation failure | `DISK_PROBE_FAILED` |
| Cancelled admission | `CANCELLED` |
| Expired cooperative admission | `ADMISSION_TIMEOUT` |

No failed admission removes user files or terminates unrelated processes. Windows tree cleanup remains best effort while an owned parent is alive; race-free detached-descendant containment needs a native Job Object helper. Unix cleanup uses the owned process group. These controls are not an OS security sandbox.

## Qualification and remaining acceptance

The resource regression suite is `tests/resource-budgets.test.mjs`. Managed policy preservation adds `tests/codex-budget-registration.test.mjs`, with explicit separation between injected ownership-table checks and actual SDK observations. It uses real owned processes, official SDK stdio clients, actual filesystem observations and test-owned directories. Controlled unsupported/permission/invalid-statistics and post-spawn-error injections are labeled separately from actual platform observations. Tests exercise two independent hosts and explicitly verify that they do not share enforcement.

Installed-package verification binds the compiled admission, policy, process, pack, CLI and MCP module bytes and reruns the suite outside the checkout. Exact source, Node version, platform results, retained failures, security/license observations and independent reviews are recorded under `docs/validation/2026-11-08-aug012-*`.

Targeted hosts are Windows x64, Linux x64, macOS ARM64 and macOS x64 with Node 24. Receipt coverage determines what actually passed; an injected unsupported backend does not validate an otherwise untested operating system.

Full AUG-012 remains unaccepted. Outstanding work includes cross-host coordination with authenticated ownership and crash recovery, hard CPU/GPU/RAM and disk-write enforcement, remote workload integration and actual ChatGPT-to-MTerm app acceptance. No new runtime dependency, upstream implementation copying, model request or unsolicited daemon is introduced by this slice.

