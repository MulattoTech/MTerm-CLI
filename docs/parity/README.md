# Pinned DesktopCommander parity contract

Read-only MIT upstream source snapshots at c774c3b505de990219637ecdc9a830c8772fae9d /0.2.52.
Original copyright and LICENSE retained. These files are research/conformance inputs, not MTerm
runtime and not executed by the drift detector. Manifest26 versus schema27 is intentional: UI-only
track_ui_event is outside the Codex-facing pinned manifest. No marketing/hosted-relay scope is added.

The detector hashes LF-normalized source, validates the tool set and refuses unnoticed local changes.
An explicit online probe checks upstream main; drift reports do not rewrite the approved target.
A hash match establishes source identity, not successful implementation of the26 tools.

## Audited differential text tests
The test harness verifies snapshot hashes and erases only TypeScript types from the inspected
filesystem-only TextFileHandler. It marks the original type-only import explicitly, not runtime
logic. The upstream server/index/telemetry/bootstrap is never executed. The installed product
does not load reference source. Differential cases cover empty files, LF/CRLF, Unicode/BOM,
zero-length reads, offsets beyond EOF, and negative tails ignoring length. This is not full
image/document/UTF-16/large-file parity.
