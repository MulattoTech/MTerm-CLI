# Local MCP security contract and known limits

This is an opt-in local tool host, not a remote relay or OS sandbox.

## Trust model

The human chooses one explicit trusted directory when launching the server. Stdio inherits the
local client's trust. No TCP listener, public endpoint, autostart daemon or automatic model call
exists. File mutation and process execution require separate startup flags; clients cannot toggle
them through a tool request. Disabled tool names are absent from tools/list.

File operations reject lexical/canonical escapes, symlinks/junctions, hardlinks, ambiguous Windows
names, credential directories and .git metadata. UTF-8 and byte/type limits are enforced before
writes. Existing writes require a read SHA-256 version; create requires `missing`. Temp output is
fsynced and atomically replaced; failed checks preserve original bytes. No general delete exists.
No-overwrite move currently supports regular files only via link/unlink. Interrupted movement can
leave both names. Parent directories must already exist except for explicit one-level mkdir.

## Remaining local race risks

Node path checking and replacement are separate OS operations. An adversarial local process able
to rename parent directories/reparse points concurrently may race checks. This is NOT a proven
handle-anchored sandbox. Refuse untrusted hostile roots; native handle-relative defenses remain
required for stronger guarantees. Credential name exclusions are defense in depth, not prevention
of an approved executable reading other files with the user's OS permissions.

Processes require an absolute native executable and structured args, with rooted cwd and a small
OS environment allowlist. An interpreter can still execute code with OS-user powers. Captured jobs
are not a PTY. Windows taskkill /T cleanup is best effort while the owned parent remains alive;
parent-exited/detached descendants and PID/ownership races require future native Job Objects.
Unix process-group code exists but is unvalidated here. Do not claim exact RDC/terminal parity.

Eight live jobs, 32 retained session records, bounded UTF-8 output rings, bounded stdin queues,
timeouts and four in-flight tool handlers limit normal resource growth. Output reports retention
loss explicitly. Input acknowledgment means queued, not consumed by the program. Stdio frames
and response sizes are capped; consumer backpressure closes the connection rather than growing
without bounds. Long-duration hostile-load and OS resource-limit certification remains open.

## Credentials and privacy

MTerm config contains only schemaVersion/trustedRoot/codexExecutable, never tokens or privileges.
Codex launch preserves its own auth/config environment; MTerm does not read auth.json/keyrings or
claim its presence authenticates a browser. Quota/Web/updates are unimplemented. Fixture tests use
new roots, synthetic config and a separate CODEX_HOME. Real-model requests were not used.
Tool responses can intentionally contain file/process output. Treat it as untrusted data. Error
serialization and audit metadata omit raw arguments/error bodies; explicit file output is not a
universal secret scanner. Audit is a 256-row memory ring, not durable compliance logging.

The Git read adapter disables optional locks, fsmonitor hooks, external diff/textconv, pagers and
prompts; enclosing worktree and metadata must remain within the chosen root. Externally located Git
worktree metadata is currently unsupported. No Git write, fetch, push or network operation is exposed.

## Publication boundary

A GitHub content-write probe was denied by platform safety checks. No alternate credential,
RDC push, API path, permission change or other bypass was used. Local development and local Git
checkpoints are separate from remote publication. No hosted CI, release tag or full certification.
