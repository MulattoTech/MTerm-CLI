# Explicit native Linux container execution

This is the scoped AUG-005 implementation for issue #84. Source and protocol fixtures
are implemented; live backend and installed-package qualification are separate gates.
No complete AUG acceptance is claimed by this contract.

## Separate authority

The new `--allow-isolated-exec` grant requires one `--isolation-policy JSON`. It does
not enable `--allow-exec`, native process input, host writes, packs, image pulls,
network access, remote execution or a model lane. The immutable owner policy fixes
one local Unix socket and an immutable local Engine image ID. Clients cannot supply an
endpoint, image, entrypoint, environment, Docker context, mount, device or arbitrary
Engine option. The host never reads Docker credentials/configuration or invokes the
Docker CLI to run a job.

Example for an already prepared native Linux host using Docker's classic image
store and the qualification image:

```sh
mterm-cli mcp --stdio --root ./project \
  --allow-isolated-exec \
  --isolation-policy '{"socketPath":"/var/run/docker.sock","imageId":"sha256:280af3207172947339cc2e8c9d2efac585716fd906af49f57d6fdf0dbb829a73"}'
```

The example ID is the configuration digest used by Docker's classic image store.
The containerd image store reports the pinned amd64 manifest digest instead:
`sha256:c0a93797ee78814ae6d32fcca2561fdbbe423149c3f5389aad32d86e9fd85bd4`.
The administrator must select the exact local Engine image ID for that prepared
image. The product requires exact equality and does not substitute either digest.
CI validates both fixed representations of this one manifest against its repository
digest and configuration digest, then passes the observed validated ID explicitly.

The image must already exist. There is no automatic install, pull, daemon startup,
fallback to unsandboxed execution or remote API endpoint. `setup codex` refuses
policy it cannot preserve, including an applied registration; use explicit stdio
arguments. `tools` describes configuration without contacting the backend.

General `mterm_start_process` and optional packs remain **unsandboxed OS-user
execution** under their existing flags. `executionMode: unsandboxed-os-user` and
the legacy `osSandbox: false` describe that native process authority. The separate
`isolation` capability describes the new tool only. File tools keep their existing
trusted-root and compatibility scopes. A container receives no project directory.
Compatibility settings do not replace the independently fixed isolation policy;
malformed compatibility configuration still denies new normal tool calls.

## Supported backend and fail-closed gates

The product factory admits native Linux x64 with a selected Unix socket. Windows,
macOS, ARM, WSL client/daemon kernels and Docker Desktop are unsupported. A generic
internal Engine protocol class also runs against synthetic local sockets in tests;
those tests do not grant another product platform or establish kernel isolation.

Every admission checks the Engine API and pinned image. The first backend contract
requires Engine 29.x at least 29.9.3, API compatibility with pinned wire version
1.45, containerd 2.x at least 2.4.2, runc 1.x at least 1.5.2, Linux amd64, cgroup v2,
supported memory/swap/CPU/PID controls, an available `runc` runtime and builtin
seccomp. Missing or unsupported information denies before create. Actual versions,
commits, kernel and capability observations are reported rather than inferred from
the Docker Desktop application version.

This floor is a conservative qualification policy, not a claim that every older
version is exploitable through this API. Docker administrators, the selected socket,
runtime binaries, image and host kernel remain trusted. Identity rechecks detect
observed daemon replacement; they do not defeat malicious administrators, spoofed
IDs or an undetected replacement and restoration.

The current Windows workstation was inspected without starting a container: Docker
Desktop4.98.0 / Engine29.9.2 / WSL2.7.14.0. Docker's documented
[CVE-2026-112917 fix](https://docs.docker.com/desktop/release-notes/#4980)
requires WSL3.0.3 or later. This implementation denies that platform; it does not
upgrade or restart the owner's unrelated runtime/workloads. Linux qualification
uses a separate disposable GitHub-hosted runner.

## Fixed container profile

Each job executes only `/usr/local/bin/node --input-type=module -e CODE`. JavaScript
and its child programs run inside the same container. Code is at most65,536UTF-8
bytes without NUL; requests can only narrow runtime and output limits.

| Boundary | Profile |
| --- | --- |
| Identity | UID/GID65534, no additional groups, fixed entrypoint, disabled healthcheck |
| Filesystem | Read-only image root, no host binds/volumes/socket, one `/work` tmpfs, bounded shared memory |
| Privileges | Drop all capabilities, no-new-privileges, builtin seccomp, nonprivileged `runc` |
| Namespaces | Private PID/cgroup namespace, isolated IPC, `network=none` and no published ports/links |
| Environment | Remove every inspected inherited key; fixed PATH, HOME and TMPDIR; Docker supplies a nonsecret hostname |
| Lifecycle | No restart, no autoremove shortcut, init enabled, inspected ownership/profile before start |
| Output | Non-TTY attached stdout/stderr; logging driver `none`; no daemon output log |
| Descriptor limit | Exactly one `nofile` soft/hard128 entry |

Images declaring volumes are rejected. Creation warnings, altered identity,
unexpected environment, privilege/runtime changes and mismatched effective limits
deny before start. Attachment precedes start; an already observed EOF or parser
failure refuses start. A subsequent clean stream completion is combined with the
owned container's confirmed exited state and matching exit code. Invalid/truncated
frames, excessive output or transport failure trigger independent cleanup.

`network=none` leaves loopback inside the container. It is not a claim about every
possible kernel communication mechanism. The read-only root still includes normal
Docker-generated kernel/config mounts; it is not a promise that every path is
unwritable. The guest may write its bounded tmpfs and permitted device interfaces.

## Owner bounds

| JSON field | Default | Allowed range |
| --- | ---: | ---: |
| `maxJobs` | 2 | 1–2, further narrowed by the host process ceiling |
| `cpuMillis` | 500 | 50–1,000; CFS quota per1,000milliseconds of one CPU |
| `memoryMiB` | 128 | 64–256 |
| `pidsLimit` | 32 | 8–64 |
| `tmpfsMiB` | 16 | 1–64 and no more than half the memory ceiling |
| `maxRuntimeMs` | 30,000 | 100–30,000 |
| `maxOutputBytes` | 65,536 | 1,024–131,072 |

Memory plus swap equals the memory limit, denying extra container swap. Tmpfs
consumes the memory budget; there is no claim of secret-erasure or globally
nonpersistent memory. CPU quota, memory, PIDs and workspace are container limits;
GPU limits and cross-host coordination are not supplied. Image storage, daemon
metadata and host journal storage are outside a per-job tmpfs quota.

The process-budget runtime/output ceilings also narrow isolated jobs. An isolated
job takes a shared active-job lease before asynchronous admission. Native final
spawn checks include those leases, so a second hidden job pool cannot overbook the
owner's active-job ceiling. Uncertain cleanup keeps its charge. Four normal and
two owned-control handler slots remain; no queue is created. Stop/status use the
bounded control lane even when new compatibility-config work is denied.

Output parsing uses8-byte incremental headers, checks frame sizes before retaining
payload, limits4096frames/8192decoded pieces and caps escaped output at262,144bytes.
Engine JSON/request bodies are bounded at524,288bytes. Status retains at most16job
records without code or output. The host's existing response/frame bounds apply.

## Ownership, cancellation and uncertainty

Before create, a private0700temporary directory and exclusive0600journal record
bind the host instance, job, random container name, nonce, original daemon ID,
socket and image. Full confirmed writes and fsync precede create; native Linux also
syncs the parent directory. Journals are bounded at8KiB and contain no submitted
code or captured output. Source code is passed through the local Engine API as a
bounded container argument; trusted daemon administrators can inspect it until
removal. This is not a universal secret scanner.

Cancellation/deadline failures do not cancel cleanup. Cleanup uses its own10second
controller, validates original daemon and exact container ownership, removes only
that owned container with force, observes404, then rechecks the original daemon
identity before deleting the owned journal and releasing shared capacity. It never
prunes images, volumes, unrelated containers or another live host's jobs.

An uncertain create keeps the same name. One immediate404 after an unacknowledged
create cannot prove that creation will not finish later. Removal denial, changed
ownership, a replacement daemon or unavailable cleanup produces
`ISOLATION_CLEANUP_UNCONFIRMED`, a quarantined status and retained journal/lease.
`mterm_stop_isolated` can retry reconciliation for that host-owned job ID. A client
cannot nominate a Docker container ID or a job belonging to another host.

The runtime deadline is host-supervised and cooperative; it includes preparation.
Cleanup can extend response time. Broker crash or daemon loss may leave a container
running under its kernel resource limits. Automatic journal recovery after broker
restart and an independent hard wall-clock supervisor remain unimplemented. Never
interpret request cancellation or socket closure as proof of process termination.

## Verification and rights boundaries

`tests/isolation.test.mjs` covers policy/authority, real local IPC protocol handling,
negative synthetic Engine responses, actual native shared capacity, write-ahead
journal failures, cancellation and owned cleanup. Synthetic protocol observations
are labeled and do not establish real containment.

`tests/isolation-live.mjs` is separately mandatory in the Linux isolation CI lane,
with no skips. It probes actual filesystem/symlink/shell/child containment, network
denial, cgroup/seccomp state, tmpfs/memory/PID/CPU enforcement, output/timeouts,
permission denial, MCP grants/cancellation and independent owned-container absence.
`verify-isolation-live.mjs` reruns it outside the checkout and binds11compiled
modules; `verify-package.mjs` requires the same live suite for the actual installed
package when `MTERM_ISOLATION_REQUIRE_LIVE=1`.

The disposable CI bootstrap verifies the official signing key, signed repository
index, exact package hashes and installed versions/binary hashes before preparing
the fixed image manifest/configuration pair. It records source LICENSE/NOTICE
files and source/build references. Those checks are not a full image/dependency
license clearance or a claim that every system vulnerability has been excluded.
No external runtime/image is bundled into MTerm's npm package; dependency pins,
launcher and production package closure remain separate verified boundaries.

Engine, CLI, containerd and runc source are Apache-2.0 at their recorded pins. Node
Docker build scripts are MIT; that does not license all Node, Yarn and Debian image
contents. The source alternatives listed in #84 were not copied or vendored.
Full third-party redistribution admission, actual ChatGPT connector invocation,
other platforms, general executable/pack isolation and complete AUG-005 acceptance
remain open until their own evidence passes.

Primary protocol references: [EngineAPI1.45](https://docs.docker.com/reference/api/engine/version/v1.45/),
[resource controls](https://docs.docker.com/engine/containers/resource_constraints/),
[none network](https://docs.docker.com/engine/network/drivers/none/),
[seccomp](https://docs.docker.com/engine/security/seccomp/),
[Engine29 security releases](https://docs.docker.com/engine/release-notes/29/).
