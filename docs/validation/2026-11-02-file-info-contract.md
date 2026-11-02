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
while the exact pinned Git blob is `d9ccdbffc9a58def48b511df6bc6ee4d52ca23b0beff6a70c99186d04a1a1f30`.
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
Both npm launcher and actual server exits are independently observed for each
process. The package report now preserves these child scenario/cleanup summaries.
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
