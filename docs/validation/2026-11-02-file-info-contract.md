# DCP-024 bounded file metadata contract — 2026-11-02

This independently reviewable slice addresses [issue #26](https://github.com/MulattoTech/MTerm-CLI/issues/26)
from verified main `71353344bb78bb15135bc76be1c32db4aff14f47`, tree
`27d3fb9bd6512bf23671d6c788176231aacb8c1d`. It does not close the issue.
DCP acceptance remains **0/48**, remote WEB acceptance **0/12**, and separate
300-item maturity **29.12%**. All protected ledger fields remain unchanged.

## Prior delivery and current ownership

[PR #75's observed final receipt](https://github.com/MulattoTech/MTerm-CLI/pull/75#issuecomment-6581508954)
confirms completed directory implementation, final-head checks, expected-head
merge, main checks and additive recovery. PR #74's setter and PR #73's metadata
slices also remain complete. Their immutable preparation notes do not require
repeating completed work. The metadata campaign's historical macOS installation
timeout/retry remains distinct from the subsequent no-retry campaigns.

The [live issue audit](2026-11-02-file-info-issue-audit.json) read all 48 DCP bodies
and 23 comments at 17:07:57–17:08:02 UTC. All issues were open, no assignees were
returned, and the open-PR search returned none. Identity, title, state, URL,
upstream pin, parent epic and comment counts had zero mismatches. This timestamp
does not backdate later comments. One integration owner uses
`feat/dcp-024-file-info-contract-20261102` and new ordinary clones; the original
dirty primary and existing owner-agent checkout remain preserved.

## Pinned contract and changes

The target is DesktopCommanderMCP **0.2.52** at
`c774c3b505de990219637ecdc9a830c8772fae9d`, with 26 published tools. The existing
schema, filesystem response handler and text handler are committed read-only
references under `docs/parity/upstream/`. The additional pinned filesystem
implementation/factory references and their exact identities are recorded in
the [reference receipt](2026-11-02-file-info-references.json).
The [additive reference reconciliation](2026-11-02-file-info-reference-reconciliation.json)
shows that PR #75 retained the same filesystem source with one extra terminal LF:
its copy remains SHA-256 `f3802e7439a44aea69f96757cfe5dd70e5aa739888c1aba0da6b185d66c38a0b`,
while the SHA-256 of the exact pinned Git blob bytes is `d9ccdbffc9a58def48b511df6bc6ee4d52ca23b0beff6a70c99186d04a1a1f30`.
Both identities and the original archive are preserved. No executable source line differs.

The runtime adapter is original; retained upstream MIT notices and licensing
apply to the test/reference inputs. No upstream server, factory, telemetry or
bootstrap code is executed. Focused tests erase types from only the already
inspected filesystem-only text handler, as the existing differential suite does.

| Behavior | Corrected bounded contract |
| --- | --- |
| Metadata envelope | One text item, unchanged ordered stat fields; no new structured success body |
| Dates | The existing three Date values use JSON serialization, yielding the pinned quoted ISO strings |
| Empty supported text | `lineCount: 0`, `lastLine: -1`, `appendPosition: 0`; -1 denotes no last line |
| Other supported text | Pinned LF-based line count, last index and append position, including CRLF, bare CR, BOM and Unicode fixtures |
| Directories | `fileType: text` is the pinned handler discriminator; no line metadata or directory-content read |
| Cancellation | Actual MCP signal is forwarded and checked around asynchronous work; cancellation remains a failure |
| Optional text-read errors | Only known bounded-content errors and explicitly listed operational errors retain the earlier stat snapshot |
| Policy and unexpected failures | Root/private/link/type/policy errors, aborts and unknown errors propagate; they are never converted to metadata success |
| Observed replacement | A symlink or multiply-linked file seen by the post-resolution stat is rejected |

The former broad catch could hide a real policy denial or cancellation during
the optional text read. The corrected adapter keeps using `FileService.read`,
including its independent root, link, byte and UTF-8 checks. It does not read
through a new unguarded path.

Allowed content fallbacks are `ToolError` codes `FILE_TOO_LARGE`, `BINARY_FILE`
and `INVALID_UTF8`. Allowed ordinary filesystem Error codes after a successful
stat are `EACCES`, `EPERM`, `EBUSY`, `EIO`, `ETIMEDOUT`, `EMFILE`, `ENFILE` and
`ENOENT`. Their raw messages are omitted. Every other `ToolError`, AbortError,
changed-path/type errors (`ENOTDIR`, `EISDIR`, `ELOOP`) and unexpected error
propagates. Cancellation is checked at catch entry as well as after the read,
so an allowed read failure cannot conceal an aborted request.

## Intentional bounds and remaining differences

- The existing **262,144-byte** content-read ceiling remains inclusive. The
  pinned text handler can count larger files below its 10 MiB threshold.
- Binary data, invalid UTF-8 and oversized content keep stat fields plus
  `textMetadata: unavailable`, with no asserted file type or line count.
- Existing office/image extensions remain stat-only: no `fileType`, line
  metadata or new `textMetadata` marker. No format parsers or dependencies were
  added. Binary detection and image/spreadsheet/PDF/DOCX metadata remain open.
- UTF-16LE is not added. The LF line-count convention is not a claim of complete
  cross-encoding or every read-range behavior.
- A successful optional fallback reports an **earlier stat snapshot**. Stat and
  content are not a coherent filesystem transaction; disappearance during the
  read does not imply the path still exists when the response completes.
- Cancellation is cooperative between awaits. It cannot interrupt a blocked
  operating-system read, and the late link check does not eliminate every
  hostile parent-rename race or create a handle-anchored sandbox.
- Owner roots, empty-root denial, private names, mandatory command blocks and
  capability ceilings remain. No telemetry/network behavior changes.

Full DCP-024 acceptance still requires its complete published metadata contract,
the required decisions on intentional differences and applicable actual-client
evidence. This slice does not supply owner rulings for DCP-009, DCP-010 or DCP-022.
Their precise existing omitted-field/privacy, effective-output/coercion and
directory-order/cap/error questions remain recorded in the earlier reports.

## Development and independent review

The [development receipt](2026-11-02-file-info-development.json) retains exact
times, source identities, test identity and logs for these supplementary Linux
scratch Node 24.22.1 direct-service runs:

| Stage | Observed result |
| --- | --- |
| RED, 17:12:34.413–17:12:34.733 UTC | 23 tests: 6 passed, 17 assertion failures; no skips/cancellations |
| GREEN, 17:12:59.609–17:12:59.984 UTC | Same test bytes: 23/23 passed, no skips/cancellations |

The original runtime and fixture remain retained under `artifacts/file-info-red`.
Both runs deliberately use `--test-isolation=none`; they are direct-service
evidence, not ordinary isolated-runner or native Windows/full-suite acceptance.
The [independent source review](2026-11-02-file-info-source-review.json) checked
all five implementation/test/verifier files, the original source and logs,
pinned contracts and failure propagation. It found no remaining blocking issue.
Two installed-harness review improvements were applied before qualification:
capture the restarted server PID before discovery assertions, and verify every
current mutation/execution capability is absent alongside capability booleans.

The installed harness adds eight metadata scenario groups: supported text and
exact ordered timestamps; directory metadata; exact byte ceiling; unavailable
binary/encoding/oversize metadata; unsupported-format omissions; real
root/private/link/hardlink/missing denials; schema denial; and a separate
read-only process restart. It retains the existing six directory groups.
The harness requires independent exit observation for both npm launcher and actual
server in each process session. The package report now preserves these child scenario/cleanup summaries.
Direct-service injected cancellation and I/O faults are not relabeled as
installed MCP cancellation/fault evidence.

## Qualification and delivery status at preparation

Native focused/full wrapper, self-host, normal prepack, actual installed artifact,
source/installed synthetic Codex, fresh committed extraction, hosted exact-head
checks, merge/main observation and additive recovery are the next gates at this
initial implementation preparation. Later additive receipts record actual
outcomes without changing earlier timestamps or claiming pending actions passed.
No model call or real Codex authorization experiment is performed.

## Client connection and preservation

The primary session used connected Brave at approximately **17:14:58 UTC** to
observe the authenticated staging dashboard: one online Windows owner, read
enabled, write/execute disabled, zero client authorizations, zero active requests
and build `b90432a1bc138d59305692a9f74f110a475d0881`. This is dashboard evidence,
not client consent/discovery or a selected-device file read.

The existing owner root is already approved. No setup, pairing, second owner,
autostart, remote write/execute or production promotion is needed for this local
slice. The historical nonretryable deleted-plugin-release error and denied
ChatGPT host must not be retried or bypassed. Current read-only plugin/management
observations are recorded separately when complete. The owner's running
`config-qualification-20261102` checkout remains pinned and untouched.

## Observed qualification after the initial preparation

Implementation **`450578f7761a5dabc28fad3feda0c3119f130ecb`**, tree
`152e1490ef91b42697d46af7e829473c0ddf8dc3`, is published in
[PR #76](https://github.com/MulattoTech/MTerm-CLI/pull/76). The initial preparation
section above remains historical. Native and implementation hosted gates below
are complete; final documentation checks, expected-head merge, main checks and
recovery remain subsequent gates at this documentation preparation.

| Proof | Actual result |
| --- | --- |
| Native focused Windows Node 24.21.0 | Original runtime: 6 passed / 17 assertion failures. Same fixture: GREEN 23/23, no skips/cancellations. Completed 17:24:24.206Z. |
| Actual native full wrapper | `node scripts/orchestration/verify.mjs --full`, 17:25:37.284–17:26:37.036Z: reviewed build/check, **228/228**, package and source-entry Codex; exit 0. |
| Separate native gates | Self-host, normal prepack with 228/228, explicit installed metadata and installed-entry Codex all exited 0. |
| Fresh committed extraction | Initially no `dist` or `node_modules`; locked install, reviewed build, normal prepack with 228/228, actual installed package and explicit metadata proof passed. |
| Installed metadata, native and fresh | Eight metadata groups and six directory groups; separate read-only restart; both npm launcher and server PID exits verified; owned fixtures cleaned; zero captured MCP stderr. |
| Package accounting | 59,400 archive bytes; 231,020 unpacked bytes; 14,178,390 installed production bytes, excluding external Node and Codex. |
| Native helper completion | 17:28:36.884Z, exit 0; all thirteen component/administrative steps returned 0. |

The [focused receipt](2026-11-02-file-info-focused-windows.json),
[original native report](2026-11-02-file-info-native.json),
[derived Windows summary](2026-11-02-file-info-windows.json),
[fresh summary](2026-11-02-file-info-fresh.json) and
[independent native review](2026-11-02-file-info-native-review.json) retain exact
commands, identities, UTC, log hashes, scope and cleanup. The reviewer verified
31 raw-log hashes and four nested receipt hashes/values. Fresh TAR identity is
native-helper provenance; it is not a claim that the reviewer redownloaded that
TAR. Its SHA-256 is `c424764bf9670e8a1f700dd8b73535a38dfd8d096a0feac345d2ee4320df59c7`.
Source/fresh normal-prepack tarballs are byte-identical, SHA-256
`112987416d3fb2054834841e5b7b348e18c00b2e43172422957ec373f0d07392`.

Native Codex **0.160.1** parsed synthetic source and installed registration, and
the SDK exercised each parsed command for two rounds. Actual model-driven
Codex-agent invocation remains **false**, with model calls **zero**. The existing
configuration probe separately repeated ten configuration groups, fourteen
rejected writes and ten positive Node-network canaries with zero product attempts;
that instrumentation is not new metadata network instrumentation or an OS sandbox.
Npm notices/lifecycle echoes can appear in gate stderr; zero-stderr statements
above apply specifically to captured MCP children.

### Exact implementation hosted observations

The [nine-log hosted audit](2026-11-02-file-info-hosted.json) independently observed
**9/9 successful checks at 17:29:50.904Z**, all attempt 1. Last job completion was
17:29:41Z and last workflow update 17:29:42Z. No retry occurred.

- [Push matrix 41490998367](https://github.com/MulattoTech/MTerm-CLI/actions/runs/41490998367): four platforms.
- [PR matrix 41491319420](https://github.com/MulattoTech/MTerm-CLI/actions/runs/41491319420): four platforms.
- [Fast 41491319593](https://github.com/MulattoTech/MTerm-CLI/actions/runs/41491319593): successful fast check.

The two Windows jobs each passed 228 tests with no skips. Each Linux/macOS matrix
job and fast Ubuntu passed 216 with twelve named Windows-specific skips, zero
failures/cancellations. Every job passed all 23 new metadata regressions. All
eight matrix executions explicitly retained the eight metadata and six directory
scenario summaries, read-only restart, cleanup and zero MCP stderr. Hosted
Codex used source registration (`installedEntry: false`); the separate package
gate exercised installed MCP. Do not generalize this to actual-agent calls.
The PR synthetic merge `25d45ba6db278488eac5467d6154ce203f918b5e` independently
has the implementation tree and expected base/implementation parents.

The [implementation documentation review](2026-11-02-file-info-implementation-doc-review.json)
verified all 101 source hashes and protected fields. Its two wording clarifications
are applied here: initial harness requirements are distinct from later observed
exits, and the upstream SHA-256 describes bytes rather than a Git object ID.
The actual upstream Git blob ID is `0476a7ca11cd212a88cc30dbe194716ef6cbd073`.
The [observation notes](2026-11-02-file-info-observation-notes.json) preserve two
preexecution launcher failures and an audit-parser correction separately from
product RED/GREEN; no source test or gate was weakened.

### Current connection and preservation

The [connection follow-up](2026-11-02-file-info-connection.json) includes root
Cloudflare GET observations at **17:28:27.828Z**: existing version
`af4fd06e-c4a3-4545-ad22-31d0ae956215` still serves 100%, build remains
`b90432a1bc138d59305692a9f74f110a475d0881`, and the existing single owner-email
Access rule matches the runtime allowlist. No deployment/policy changed.
The earlier stalled subagent read is preserved as unsuccessful history.

Bounded MTerm search and the eligible personal listing found no MTerm entry;
no exposed MTerm tool was found. This does not prove global absence or repair
of the historical nonretryable creation conflict. Actual consent, discovery,
`mterm_list_devices`, selected-device read, outside-root denial and actual-client
lifecycle remain unperformed. No denied-host navigation or creation retry occurred.

Native before/after comparisons preserve eleven original primary files and eight
older checkout HEAD/status records. Owner status at 17:24:25.541Z remained paired,
online, read-only, autostart false, zero active requests, PID 38384 with the same
start identity; this local status had `networkChecked: false`. The foreground
owner checkout remains untouched. Native focused GREEN is additionally retained
in task-owned stash `45b7b65f8a24f88b98d900c17992667e6646c1ca`.
