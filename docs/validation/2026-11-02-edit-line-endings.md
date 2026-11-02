# DCP-025 exact editing across line endings — 2026-11-02

This bounded change addresses [issue #27](https://github.com/MulattoTech/MTerm-CLI/issues/27)
from verified main `99c3c9e7d23d76a3207b903554f552f59cebf236`, tree
`4873caa7b342bf3521eb7a8b6fa85d0299fa9c47`. PR #77 is already merged and its
five main jobs passed. Its final [delivery receipt](https://github.com/MulattoTech/MTerm-CLI/pull/77#issuecomment-6586522412)
supersedes earlier pending preparation. The live audit read all 48 DCP bodies,
25 comments and all 12 WEB bodies; no open PR or new owner contract ruling existed.

## Implemented contract

DesktopCommanderMCP 0.2.52 at `c774c3b505de990219637ecdc9a830c8772fae9d`
normalizes search and replacement strings to the file's first encountered CRLF,
LF or CR delimiter. A file without a delimiter uses the native default: CRLF
on Windows, LF elsewhere. The [pinned source record](2026-11-02-edit-line-endings-references.json)
identifies exact reference bytes and MIT licensing; the 26-tool baseline is unchanged.

The original production `DesktopCommanderFiles.editBlock` now applies that rule
consistently to occurrence counting and replacement. Previously LF multiline
requests could not match Windows CRLF files, and multiline insertions could
introduce mixed endings. Only request strings are normalized. Untouched file
regions, BOM, Unicode, indentation, tabs, spaces and literal dollar strings remain
unchanged. Mixed files use their first delimiter, not the most common one; a
minority-style block can consequently fail to match. Exact count mismatch refuses
the entire edit. Empty replacement deletes the matched text; empty search is refused.

Cancellation is checked again immediately after the asynchronous read, before
matching or write admission. The existing shared FileService still enforces
approved roots, private/link restrictions, separate write authority, strict UTF-8,
version conflicts, atomic replacement and exact byte limits. No dependency, tool
schema, capability, owner setting or remote behavior changes.

Independent review exposed a related allocation gap: a repeated replacement
could exceed V8's string ceiling before the shared byte check. The adapter now
checks resulting UTF-16 length before constructing the string. That is a safe
lower bound on UTF-8 size, so it bounds allocation without a potentially incorrect
byte-delta calculation across surrogate boundaries. FileService retains the exact
UTF-8 check. The 262,144-byte compatibility ceiling remains inclusive.

## Test-first and independent review

Original supplementary Linux direct-service RED: 29 cases, 7 passed and 22
assertions failed. Independent review identified the allocation gap; a thirtieth regression was
added before repair. The EOL implementation passed 29/30 before that repair. The original fixture/logs
are preserved separately. Final native Windows original-source RED: 30 cases,
7 passed and 23 assertions failed, exit 1. The exact same final fixture then passed
30/30, exit 0, with no skips or cancellations. See [development evidence](2026-11-02-edit-line-endings-development.json),
[native RED](2026-11-02-edit-line-endings-native-red.json) and
[native GREEN](2026-11-02-edit-line-endings-native-green.json).

The [initial source review](2026-11-02-edit-line-endings-source-review.json)
retains the allocation finding; its [supplement](2026-11-02-edit-line-endings-source-review-supplement.json)
closes that finding after independent 30/30 and bounded failure reproduction.
An ordinary scratch test-runner failure before individual cases is infrastructure
evidence, not product RED. Windows uses the normal isolated test runner.

The real packed MCP harness now checks six edit groups: write-enabled discovery;
CRLF/LF/CR/native-default/mixed/BOM/Unicode/literal byte fidelity; normalized exact
counts, mismatch and invalid schema without writes; exact and excessive UTF-8
limits after expansion; private/outside-root refusal; read-only restart omission.
Existing owned launcher/server exit verification and fixture cleanup remain.
Native full wrapper, normal prepack, installed probes, fresh extraction and hosted
checks are subsequent qualification gates at this preparation. Later additive
receipts record their actual outcomes; source review alone does not prove them.

## Intentional differences and acceptance

This slice preserves MTerm's non-overlapping count/replacement semantics. Pinned
upstream counts overlapping occurrences but replaces non-overlapping matches;
that separate contract decision is not silently copied. Compact success text,
safe structured count errors, restricted roots, strict UTF-8, byte ceilings and
capability separation remain. Fuzzy diagnostics, success previews, Office edits,
complete schema/format behavior and actual model-driven Codex/ChatGPT evidence
remain incomplete. No complete DCP-025 acceptance is claimed; issue #27 stays open.

DCP remains **0/48**, WEB **0/12**, and broad maturity **29.12%**. Only supported
observations, evidence and review metadata change; all protected stages, weights,
acceptance text, estimates, dependencies, platform scope and blockers remain.
No owner ruling is invented for DCP-009/010/022/024.

The primary Windows checkout, previous clones and running owner agent remain
preserved. Work uses ordinary isolated clone `parity-iteration-20261102-1952`.
The owner-approved root remains `C:\Tools\Dev\MTerm-RemoteWorkspace`; pairing,
read-only mode and no-autostart stay unchanged. No paid model/auth experiment,
deployment or security-policy change is needed. Actual-client connection remains
separate from SDK/package and dashboard observations.

## Initial installed-verifier correction

The first committed native full wrapper at `d8c232e306372a78ec3b264bd2608f6733a9dc2f`
passed all 272 tests, then failed in the new installed edit schema probe. The MCP
SDK rejects an empty `old_string` before the adapter runs and returns its standard
text validation response. The verifier incorrectly attempted JSON decoding.
The correction asserts the SDK error prefix, affected field, bounded response and
unchanged target bytes. Runtime policy and all domain error-code checks remain
unchanged. The original failed receipt and log hashes are preserved in
[the attempt record](2026-11-02-edit-line-endings-initial-package-attempt.json);
a new committed candidate and additive qualification outputs are required.
