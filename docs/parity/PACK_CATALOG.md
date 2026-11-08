# Optional-pack catalog and selection — AUG-003

This scoped ABI 1 implementation extends the local stdio host. Full issue #83 remains open: ABI 1 exposes tools only; resources and prompts are explicitly unsupported. The feature performs no model requests, downloads, dependency installation, persistent registration changes or payload execution during catalog operations.

## Owner permission and connection selection

Start the host with an explicit trusted root, --pack-registry ABS_FILE, --allow-exec and exact --allow-pack ID flags. Only registrations successfully validated at startup enter the immutable execution ceiling. The ceiling binds ID, version, manifest path and manifest SHA-256. It is not widened by editing the original allow-list array or by later registration changes.

Each stdio process/connection owns a separate selection mask. All admitted startup packs begin selected, preserving the existing owner opt-in behavior. The client may disable or re-enable only exact entries within that original ceiling. A supplied MCP client name/version is descriptive and is not authenticated identity.

Disabling selection removes the tools from tools/list and causes direct calls to reject at the SDK with an InvalidParams disabled-tool error. Calls that already began recheck selection, cancellation and their absolute deadline after asynchronous process validation, synchronously before the child spawn. A child that has already started continues under the owned-process deadline/cleanup controls; use the existing owned stop operation when cancellation of running work is wanted.

## MCP operations

The three catalog tools exist only when --pack-registry is configured. Default no-registry discovery is unchanged.

| Tool | Request | Result |
|---|---|---|
| mterm_tools_catalog | Empty object | Bounded summary of current snapshot, opaque revision, exact registered identities, admission/selection, effective limits and incompatibilities; no schemas in the all-pack summary |
| mterm_tools_catalog | id, version, manifestSha256, expectedRevision | One exact pack's effective input/output schemas and metadata, or an actionable missing-version/stale-revision error |
| mterm_tools_select | expectedRevision and selections of id, version, manifestSha256, enabled | Atomic connection-local selection update beneath the startup ceiling |
| mterm_tools_refresh | expectedRevision and optional timeoutMs (1–30000; default 3000) | Explicit bounded local validation, then atomic snapshot/selection update |

The revision incorporates a private host-instance nonce, monotonically increasing generation, registrations and selection. It is an optimistic concurrency token, not a signature or a source-code digest. Read the current catalog before selecting; refresh on a reported registry change.

Tool discovery advertises the effective input and output schemas, including the constrained schema compiler's default string length 4096 and array length 64. It also carries namespaced io.github.MulattoTech.MTerm-CLI/pack metadata with exact pack ID/version, manifest SHA-256, source commit, ABI and protocol. Source/license declarations remain self-reported; licenseVerified stays false.

## Refresh and failure behavior

Refresh reads a maximum of 16 registrations and revalidates each exact startup-admitted pack. New IDs, new versions, changed manifest pins and paths are recorded as metadata only with PACK_CEILING; their payloads are not read or executed, and tools are not registered for them. Enabling such entries requires a separately selected host startup after the owner reviews the exact registration.

When a prior entry disappears or is replaced, its tools become deselected. If the original exact registration returns, refresh does not select it automatically: the connection must explicitly re-enable it. Unchanged selected entries remain selected.

Invalid JSON, unsafe paths, altered manifests/payloads or other validation failures for an admitted entry abort refresh and leave the previous snapshot, revision and mask intact. Cancellation or deadline expiry also leaves state unchanged. A final revision check after I/O prevents a refresh from overwriting a concurrent selection or refresh.

These are snapshots. Invocation still rechecks current registry identity, trusted roots, manifest/payload hashes and execution permissions. A preserved old snapshot after failure is not a promise that a later call will succeed. A malformed optional registry cannot disable native MCP tools.

## Bounds and limits

Manifest/registry files retain the existing 64 KiB limits, maximum 16 packs, maximum 16 files and 16 tools per pack, constrained schema structure and per-file hash checks. One pack's effective schemas are limited to 256 KiB; combined admitted schemas are limited to 1 MiB. Exact detail responses are capped at 384 KiB, inside the host's 512 KiB result bound. Summary responses omit schema bodies.

Cancellation and deadlines are cooperative checks around actual filesystem work, including the last check before state publication. They do not provide a kernel I/O interrupt or an OS sandbox. Execution remains as the OS user. Filesystem revalidation does not eliminate all hostile concurrent-file-replacement races; native containment is a separate AUG-005 scope.

The current supported host identifiers remain win32-x64, linux-x64, darwin-arm64 and darwin-x64 on the selected Node 24 runtime. Unsupported manifest platforms/ABI/runtime produce explicit incompatibility codes without child startup. Local Windows development observations do not stand in for the subsequent exact-head hosted matrix or real ChatGPT integration.

## Evidence and continuation

See [development attempts](../validation/2026-11-08-aug003-development.json). The initial 12 cases and added schema-default case failed before implementation. Corrected final fixtures also reproduced 13 failures against the unchanged PR201 runtime, then the combined pack/MCP/process suite passed 46/46 on Windows Node 24.21.0.

The initial development compile error and first focused 44-pass/2-failure run remain retained. The two focused failures were corrected test-harness assumptions: the pinned SDK's notification registration takes a method string, and the race fixture needed enough initial budget to reach real executable validation. No product-source change was needed for those two fixture corrections.

Immutable code review, normal prepack, clean installed-package verification, security/license checks and all four hosted platforms remain required. No AUG acceptance or roadmap stage is awarded by this document.

## Explicit registry mutation outcomes — 2026-11-08

Catalog operations remain nonmutating. The separate install/uninstall CLI commands
still require explicit --apply and never execute a pack merely to change registration.
Their existing success JSON is unchanged.

Once an apply acquires its lock, failures distinguish the primary read/transform/write
phase, confirmed commit state and lock cleanup. A completed registry write followed
by failed lock cleanup returns PACK_REGISTRY_CLEANUP with commit=committed. A no-change
operation reports commit=unchanged. A failed operation retains its primary safe code
and separately describes cleanup failures. File creation that completed its hard link
but could not safely remove its stage reports FILE_WRITE_CLEANUP; its confirmed commit
survives registry error handling. These are failures requiring inspection of the exact
owned state before another apply, not permission to repeat the whole mutation.

The public CLI shows bounded sanitized codes/messages; internal error metadata does
not add a new MCP tool or expose raw paths, stack traces, commands or error bodies.
retained means cleanup was not confirmed, not proof a pathname remains after external
interference. Windows retries are limited to five exact rename/owned-unlink attempts
for EPERM/EBUSY, with fresh ownership/version checks and no destination deletion.
The cooperative lock and pathname checks do not eliminate hostile local races.

See [persistence development evidence](../validation/2026-11-08-aug003-registry-development.json).
The final 41 fixtures produce 6 passes/35 failures against immutable a7c047c and 41/41
against the correction. Exact committed, installed, platform, security/license and
client qualification remain separate; the original 3ca uninstall EPERM cause is unknown.
