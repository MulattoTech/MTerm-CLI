# MTerm MCP security contract and known limits

MTerm has a local stdio tool host and a separately configured, authenticated remote
read-only preview. Neither is an OS sandbox. The remote implementation does not change
local startup defaults, Codex authentication or local write/execute flags.

## Local trust model

The human chooses explicit trusted directories when launching the server (up to sixteen). Stdio inherits the
local client's trust. Default local commands open no TCP listener, enable no remote endpoint,
install no autostart daemon and make no automatic model call. File mutation and process execution
require separate startup flags; clients cannot toggle
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

Local launcher configuration contains paths/settings, not remote bearer credentials or privileges.
Codex launch preserves its own auth/config environment; MTerm does not read auth.json/keyrings or
claim its presence authenticates a browser. Quota integration and managed updates remain outside
this preview. Remote configuration and protected pairing state are separate, as described below. Fixture tests use
new roots, synthetic config and a separate CODEX_HOME. Real-model requests were not used.
Tool responses can intentionally contain file/process output. Treat it as untrusted data. Error
serialization and audit metadata omit raw arguments/error bodies; explicit file output is not a
universal secret scanner. The local audit is a 256-row memory ring, not durable compliance logging.

The Git read adapter disables optional locks, fsmonitor hooks, external diff/textconv, pagers and
prompts; enclosing worktree and metadata must remain within the chosen root. Externally located Git
worktree metadata is currently unsupported. No Git write, fetch, push or network operation is exposed.

## Publication boundary

Earlier publication denials are historical observations, not current access proof. Verify the
current operation and never bypass an active denial with another credential or route. CI results,
deployed artifacts and local checkpoints belong to their exact source/version identities. Earlier
fast-CI passes or matrix failures do not certify a later integration commit. Staging publication
and a successful remote read are separate from production promotion and full parity certification.

## Recovered compatibility preferences and canonical root aliases

The opt-in Desktop Commander profile may expose get_config and, only with the separate
--allow-config-write flag, set_config_value. Mutable preferences cannot expand startup root or
shell ceilings, grant execution/write capabilities, or remove mandatory executable blocks.
Empty allowedDirectories denies all new file work. Each admitted call uses its own bounded
configuration snapshot; active cleanup stays available when new work is denied. Telemetry
preferences do not enable a network transport.


Existing compatibility config and backup replacement use at most five Windows
rename attempts, only for EPERM/EBUSY, with 25/50/100/200 ms backoffs. Every attempt
rechecks safe parents, destination bytes/leaf state, cancellation and the original
staging inode. External changes abort; permission changes and target deletion are
never recovery tactics. Cleanup refuses substituted stages or unsafe parents and
may retain inaccessible owned staging bytes for deliberate local recovery. Initial
no-overwrite file creation remains a hard-link operation. These pathname checks
are cooperative defense, not an OS-wide transaction or handle-anchored sandbox.

Only root spellings explicitly selected at startup are mapped to their fixed canonical roots.
Mapping preserves component validation and runtime narrowing. Nested symlinks/junctions remain
rejected, including overlapping root aliases; retargeting the original alias cannot redirect
the stored canonical authority. These checks do not resolve the local concurrent-writer race
limitations described above.

Existing targets and missing leaves are checked again under their final canonical
identity. Native Windows short filenames therefore cannot conceal a protected
configuration filename or a private path component. Request narrowing applies to
the final target; broader owner-root parents do not receive the narrower request
guard. The actual Windows regression campaign exercised five native 8.3 cases,
including the previously reproduced configuration-file bypass.

## Remote preview: explicit trust boundaries

The implemented staging endpoints are
[`https://mcp-staging.m-techlabs.com/mcp`](https://mcp-staging.m-techlabs.com/mcp) and
the private dashboard at
[`https://mterm-staging.m-techlabs.com`](https://mterm-staging.m-techlabs.com).
These are staging resources. See [remote setup and rollback](REMOTE_MCP.md) before
configuring a real directory or connecting a client.

| Boundary | Implemented control and authority |
| --- | --- |
| Browser to dashboard/consent | Cloudflare Access policy plus independent Worker verification of RS256 signature, configured issuer, exact audience, application-token type, timestamps and the explicit owner allowlist. The Worker does not trust an unsigned identity header. |
| MCP client to gateway | OAuth authorization code with S256 PKCE, exact registered callback, `mterm:read` scope and exact MCP resource binding. A dashboard Access session is not an MCP bearer credential. |
| Gateway to device registry | A private SQLite Durable Object binding serializes authorization, pairing and job transitions. Public requests do not select a Durable Object instance or supply a trusted user identity. |
| Device to gateway | Outbound HTTPS polling with a distinct opaque paired-device credential. The gateway binds that credential to its exact device and owner. No inbound workstation listener or extra tunnel is created. |
| Device agent to local files | The existing `FileService` runs with `allowWrite: false`, a canonical owner-selected root and fixed limits. Remote requests cannot enable writes, execution or mutable local compatibility settings. |

An OAuth grant permits read access to the signed-in identity's paired device inventory.
Every filesystem operation must select an explicit `deviceId`; the gateway checks its
ownership and tool capability, and the agent independently checks the addressed device,
tool allowlist, request ID and deadline. A user cannot route a call to another user's
device by guessing its ID. Remote tools are limited to `mterm_list_devices`,
`mterm_read_file`, `mterm_file_info`, `mterm_list_directory`, `mterm_search_files` and
`mterm_search_content`. There is no remote write/process activation flag in this preview.

The remote root must be a specific existing local directory, not a whole drive, user
home, credential directory or UNC/device path. Credential state must be outside it.
Filesystem containment and excluded-name rules apply at the device. The local race
limitations above still apply: a hostile process with the same OS-user authority can
race filesystem changes or inspect that user's running processes. No elevation,
container isolation or handle-anchored sandbox is claimed.

### Pairing, credentials and revocation

Pairing uses separate random verification and device codes, authenticated approval,
a five-minute expiry and single-use claim. The claim is consumed before credentials
are created: a storage failure can require explicit re-pairing, but cannot legitimately
replay the claim. Changing a paired root or gateway requires revocation and explicit
configuration rather than silently retargeting the credential.

Windows credentials use current-user DPAPI and bind the gateway, device ID and canonical
root. POSIX credentials use owner-only files/directories; that is not encrypted keyring
storage. Remote commands never read browser cookies or Codex authentication to manufacture
an identity. Pairing credentials must not be copied into a repository or exposed root.

The registry stores opaque OAuth/device credentials and pairing/authorization secrets
as hashes, not raw bearer values. Authorization codes expire after one minute; access
tokens expire after one hour; grants and refresh credentials expire after seven days.
Refresh tokens rotate, and detected reuse revokes their grant. Device credentials remain
valid until revoked; automatic periodic device-token rotation is not implemented.

Device revocation denies further polling and reads. Grant revocation invalidates its
access/refresh tokens and cancels queued or delivered jobs. Revoke-all increments an
owner epoch, invalidating existing credentials, unredeemed authorization codes and
approved-but-unclaimed pairings even if subsequent cleanup is interrupted. Previously
authorized devices do not reconnect automatically after revocation; fresh pairing is
required. `remote stop` stops the owned foreground agent and is distinct from revocation.

Private management writes require the exact dashboard Origin. Consent uses a one-time
identity-bound nonce and displays the registered callback origin. Its CSP permits that
validated callback, while scripts/styles require nonces and framing is refused. OAuth
discovery is intentionally public; filesystem access is not. JWT key retrieval is bound
to the configured Cloudflare Access issuer, bounded, and rejects redirects.

### Data exposure, retention and operational limits

Requested file paths and contents leave the workstation when an authorized client calls
a tool. Cloudflare terminates TLS and the gateway can inspect and temporarily store job
arguments/results in its SQLite Durable Object. This is **not end-to-end encryption**
between the MCP client and workstation. Treat the Cloudflare account, Worker deployment,
authorized clients and chosen local writers as trusted parts of the system.

Tool results are consumed once and their contents removed after retrieval. Finished
job records expire after approximately two minutes, subject to bounded cleanup scheduling.
The audit retains at most 128 metadata events per identity with a seven-day expiry; it
omits file contents, raw tool arguments, prompts, cookies and bearer credentials. This
is operational evidence, not an immutable or compliance-certified audit service. Reading
an intentionally permitted file can still reveal secrets inside that file; filename
exclusions do not provide universal secret-content detection.

| Private staging limit | Current value |
| --- | --- |
| Supported MCP revisions | `2025-11-25`, `2025-06-18`, `2025-03-26` |
| Device wire contract | Version `1` |
| Active devices / OAuth grants per identity | 20 / 32 |
| Concurrent remote jobs per device | 4 |
| Retained jobs in the shared registry | 200 |
| Job deadline | 20 seconds |
| Single-file read / result / agent frame | 65,536 / 262,144 / 300,000 bytes |
| Normal device polling | Every 2 seconds; bounded reconnect backoff and jitter |

Registration, pairing, refresh and tool submission have additional bounded admission/rate
checks. The single shared staging registry and polling design are not a production scale
or hostile-load certification. Latest-2026 MCP conformance, standalone SSE subscription,
resumable response replay and a persistent MCP session are not advertised.

Delivered jobs are never put back into the delivery queue after a reconnect. The agent
rejects duplicate request IDs and can retry result transmission without repeating the
filesystem operation. A lost response can therefore require a new explicit request;
this is not an exactly-once end-to-end delivery guarantee. Cancellation is cooperative,
retains a separate cancellation marker after client result consumption, and observes
deadlines at both gateway and device. An OS file read already in progress may finish
before cancellation is observed; late results are refused. No remote state-changing
filesystem or process operation is enabled.

### What the staging tests establish

The [final live report](validation/2026-11-02-remote-staging-smoke-final.json) passed
**11/11 checks** on Windows, finishing at 2026-11-02 01:24:29 UTC
(2026-11-01 19:24:29 Central). A dedicated Cloudflare Access service identity, the
actual deployed gateway, MCP SDK 2.3.0 and two Windows fixture roots exercised PKCE,
one-time pairing, DPAPI, SDK initialization/discovery, exact filesystem reads,
cross-device and mutation denial, root containment, and device/grant revocation.
All recorded cleanup checks passed: test grants/devices revoked, agents stopped,
SDK closed and only created local fixtures removed.

The tested code was [b90432a1bc138d59305692a9f74f110a475d0881](https://github.com/MulattoTech/MTerm-CLI/commit/b90432a1bc138d59305692a9f74f110a475d0881),
with Windows-built immutable artifact SHA-256
`97a0457b78e113c058ae8da3d3a6a54fcd93c2b35d1dd1781316c41001ac10a6`.
The final smoke used Worker version `f643872f-5fbb-44be-9e3d-a6f8f3f32aab`.
The current owner-only version `af4fd06e-c4a3-4545-ad22-31d0ae956215`, deployment
`5a0ff21c-6341-4e73-b4af-169e98b76db2`, serves that same artifact after removal
of the temporary testing identity binding. The earlier `305c89c` / `2083411f`
smoke is historical evidence, not the current recovery target.

Fourteen gateway groups additionally exercise signed identity, revocation epochs,
expiry cleanup, cancellation and storage-fault behavior with synthetic fixtures.
Full Windows gates, native Codex verification and four-platform CI passed for the
tested code. These results certify their recorded checks, not stronger OS isolation,
production scale or full parity. The [final sprint record](validation/2026-11-02-remote-sprint.md)
is authoritative for final Git merge/checkpoint state and the linked CI evidence.

**Temporary Cloudflare testing identity cleanup is complete.** Its service token
and dedicated Access service-auth policy were deleted, and `STAGING_SERVICE_ID`
is absent from the current Worker's bindings. The original owner allow policy
remains; Workers.dev and preview URLs are disabled. The SQLite registry was preserved.
MCP remains enabled with only read-only tools. No test agent or owner-paired agent
is left running.

Future separately authorized staging tests may temporarily configure an exact
service client ID. The verifier accepts that identity only in an explicitly staging
environment with the expected signed Access service-token claims. Remove the new
binding, policy and token after testing; fixture cleanup alone does not remove those
Cloudflare resources. Do not deploy a testing identity to production.

Service-principal acceptance is distinct from human authorization. Owner Google/Access
sign-in, browser consent/callback and ChatGPT connector use remain unverified. The
owner must pair the intended computer and complete the supported client's consent.
Production promotion, remote write/execute activation and full DCP/WEB acceptance
remain separate gates.
