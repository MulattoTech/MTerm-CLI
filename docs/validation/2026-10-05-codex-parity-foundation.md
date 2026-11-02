# Codex parity execution evidence — 2026-10-05

**Result: NOT PASS for full DesktopCommander parity.** Substantial tested functionality is published
on `feat/codex-parity-foundation-20261005`, PR #52. Code checkpoint:
`6431dd71db6775c480086f944a77c0d42d6c3a0e`. This report may be followed by documentation/review commits;
verify the current PR head before executing or merging. Main baseline remains
`5c4588be3afe36ee11951a73c84a023656fe6fec` while hosted verification is blocked.

## Authority and access

The uploaded execution instruction pins DesktopCommanderMCP0.2.52 at
`c774c3b505de990219637ecdc9a830c8772fae9d`, with26 published Codex-facing tools and48 DCP issues.
The session verified all48 issue IDs, exact main/local identity, RDC create/read/rename/read-back,
and an actual GitHub connector content write/read on excluded access-check/parity-20261005T200426Z.
Normal product pushes and workflow creation now work. Older content-write denial notes are historical.
Neither the GUI repository nor the archived original MTerm repository was modified.

## Implemented registration and distribution

`setup codex` remains preview by default. `--apply` now generates and checks a registration through
real Codex in a temporary home before a backed-up, ownership-recorded change. `remove codex --apply`
removes only the exact owned block. Repeated apply/remove are idempotent. Unrelated comments, CRLF,
other MCP servers and later additions survive. Existing unowned/edited/linked settings fail closed.
Credentials are never copied. Cooperative locking and compare-before-replace do not claim protection
against hostile external writers ignoring the lock; Windows permissions are inherited, not ACL-certified.

The actual installed Codex0.160.1 parsed synthetic configuration, then an official SDK client
launched the parsed executable twice and exercised it. The same sequence passed against the real
installed tarball, including the optional compatibility flag. No real Codex agent/model completion
was requested. This is stronger than a config-text assertion but not full Codex agent acceptance.

The package verification now tests offline `npm exec` from the exact tarball, including actual MCP
calls, outside the developer checkout, as well as an isolated npm link and actual Windows shim.
A development-only resolver supports both adjacent Windows npm and Unix lib/node_modules layouts;
fixture tests prove resolver behavior, not Unix end-to-end support.

## Implemented optional text/file compatibility

`--compat-desktop-commander` exposes only the implemented aliases. Native `mterm_*` tools remain.
Four aliases are read-only; four more require explicit --allow-write. No stub `write_pdf` or process
alias is advertised. A combined total including MTerm-native names must not be counted as26 upstream
tools. Eight aliases are exercised through the real packed `npm exec` MCP process:

| Alias | Implemented now | Remaining compatibility boundary |
|---|---|---|
| read_file | UTF-8 text, offset/length, negative tails, raw readable result | URLs, image/office formats, large-file/encoding behavior and config limits |
| read_multiple_files | Bounded text batches retaining successful entries beside per-file errors | Images/office content and full upstream aggregate semantics |
| write_file | Explicit rewrite/append, guarded saves, BOM preservation, missing-file creation | Format-specific writers, dynamic configured limits and complete upstream output |
| create_directory | Idempotent nested directories and whole-path prevalidation | All-platform/hostile-race qualification; strict private-path policy remains |
| list_directory | Bounded depth traversal, relative prefixes and inaccessible/link handling | Top-level cap differs from upstream; complete error/truncation semantics |
| move_file | Existing safe regular-file, same-filesystem no-overwrite move | Directories, cross-filesystem movement and full error contract |
| get_file_info | Stat timestamps/type/permissions and bounded text line metadata | Excel/PDF/DOCX-specific metadata and platform qualification |
| edit_block | Exact replacement, expected-count refusal, literal replacement strings | Fuzzy diagnostics, normalized matching and office/XML editing |

The read tests compare36 controlled cases against the exact inspected pinned TextFileHandler:
empty files, LF/CRLF, Unicode/BOM, zero length, offsets beyond EOF and tails ignoring length.
The harness verifies reference hashes, changes a type-only import to explicit type syntax, and
uses Node type erasure without modifying behavior. Only the filesystem-only handler is executed
against owned fixtures. Upstream server/bootstrap/telemetry/browser code is not executed.

## Verification results

| Gate | Observed result |
|---|---|
| Initial clean-checkout build | Failed before edits: three CRLF review hashes differed from Git LF checkout |
| Fingerprint fix | Known UTF-8 text normalizes CRLF/LF; real text edits and binary byte changes still invalidate review |
| Normal build/check | PASS: strict typecheck, formatting, roadmap and pinned-source checks |
| Full local tests | 64/64 passed; zero failures/skips |
| Differential read cases | All36 passed within one of the64 tests, not36 extra independent test cases |
| Fresh package and isolated link | PASS |
| Offline npm exec MCP | PASS; eight real compatibility aliases exercised |
| Actual Codex parsed registration | PASS; managed apply/idempotence/remove and two SDK sessions |
| Upstream main probe | Matches pinned c774c3b; no target rewrite |
| Actual Codex agent tool invocation | NOT RUN; requires distinct authorized acceptance |
| Hosted Windows/Linux/macOS | BLOCKED before steps by GitHub account billing/spending gate |

Runtime: Windows x64, Node24.21.0; actual installed Codex0.160.1. No model calls, real user Codex
home changes, public listeners, ACL/OAuth/billing changes, GUI modifications or user-source deletion.

Measured package:31,664 compressed bytes;121,203 unpacked package bytes;14,068,573 bytes including
installed production dependencies. Node and Codex are external prerequisites, and Web/quota are not
bundled. This is not a self-contained full-three-component under50MB claim. Five external help starts
had a median31.49ms in this fixture; this is not inference speed, sustained load or a Codex comparison.

## Hosted verification blocker

The workflow is installed at `.github/workflows/cli-ci.yml`, with contents-read permissions,
commit-pinned actions, Node24.21.0 and test-owned Codex0.160.1. It declares Windows x64, Linux x64,
macOS arm64 and macOS Intel and asserts the actual runner platform/architecture.

Run37371008610 and the associated jobs failed before steps. The check annotation states:
"The job was not started because recent account payments have failed or your spending limit needs to be increased."
See https://github.com/MulattoTech/MTerm-CLI/actions/runs/37371008610 and
https://api.github.com/repos/MulattoTech/MTerm-CLI/check-runs/111969650545/annotations.
This is an account-level execution block, not a passing job or evidence of a code regression.
Billing settings and checks were not bypassed. PR #52 remains unmerged until acceptable verification.

## Reproducible evidence paths

- artifacts/parity-execution-20261005T200426Z/baseline-review-mismatch.json
- artifacts/parity-execution-20261005T200426Z/foundation-red.log and foundation-green.log
- artifacts/parity-execution-20261005T200426Z/baseline-red.log and baseline-green.log
- artifacts/parity-execution-20261005T200426Z/npm-resolver-red.log
- artifacts/parity-execution-20261005T200426Z/files-compat-red.log and files-compat-differential.log
- artifacts/parity-execution-20261005T200426Z/compat-check-all.log
- artifacts/package-verify-lg6yec/result.json
- artifacts/managed-codex-TuWvBK/result.json
- artifacts/parity-execution-20261005T200426Z/ci-annotations-111969650545.json

Pre-change recovery: artifacts/parity-execution-20261005T200426Z/before.bundle and before-source.zip.
Logs are private local execution evidence; source-based tests and this summarized report are in Git.

## Full parity verdict

All48 DCP issues remain open, each with implementation observations where work advanced. No complete
contract was closed merely for partial aliases or Windows-only tests. The full gate remains0/48,
NOT PASS. Scope includes configuration, search sessions/ripgrep, shell/process compatibility,
images/Excel/PDF/DOCX, history/prompts, lifecycle, packaging and actual platform certification.
Continue from docs/execution/NEXT_PARITY_PROMPT.md, not from the older main-only handoff.

## Final verification hardening

Adding partial evidence exposed a false-closure condition in the new parity validator. It now
requires explicit acceptanceReview (reviewer, tested/upstream commits, time, matching report and
allCriteriaSatisfied), separate from implementation evidence. Synthetic positive/negative tests
exercise that distinction; no actual issue was closed. The inherited self-host verifier also
hardcoded an obsolete branch name; it now compares the MCP result against independently queried
current Git status rather than weakening the check or making the working tree mimic old history.
