# DCP-019 complete aggregate text budget — 2026-11-02

This bounded change addresses [issue #21](https://github.com/MulattoTech/MTerm-CLI/issues/21)
from main `7e5f8287532765f11f055cb89d0312e1c1b236bd`, tree
`a88361f42b20e0cddd99ac16ce123ebf706a3ae1`. The current audit found no open PR or
newer delivery after PR #76. All 48 DCP issue bodies and 24 DCP comments, plus
all 12 WEB bodies, were read. No new owner rulings were found.

## Implemented contract

The pinned target remains DesktopCommanderMCP 0.2.52 at
`c774c3b505de990219637ecdc9a830c8772fae9d`, with 26 published tools. Its retained
MIT filesystem handler returns one summary text item followed by each successful
file's labeled text content. MTerm preserves that envelope and its existing
per-file safe error behavior through the original FileService path.

Previously, `read_multiple_files` counted only successful content blocks toward
its 262,144-byte aggregate text budget. Success summaries, error summaries and
their joining LF bytes could exceed that bound without an error. The original
adapter now accounts for all returned `content[].text` bytes using UTF-8.
The inclusive ceiling accepts exactly 262,144 text bytes. The next byte causes
the existing whole-call `RESPONSE_LIMIT` error and stops later file reads.
No partial contents are returned as a successful truncated response.

The budget check occurs outside the per-file catch, so overflow cannot be
converted into an ordinary partial-error row. Input order, duplicate paths,
summary-first output, successful-content order, schema limits (1..20 paths,
1..4096 characters per path), safe diagnostics and cooperative cancellation
remain unchanged. The MCP host's separate 524,288-byte serialized-response cap
continues to apply; a text-byte limit is not a wire-byte limit.

The ceiling is MTerm's existing resource restriction, not a claimed upstream
limit. No dependencies, permission flags, schema changes or new filesystem
implementation are added. Owner roots, empty-root denial, private-path/link
restrictions, write/execute separation and no-network telemetry behavior remain.

## RED, GREEN and review

The [development receipt](2026-11-02-aggregate-output-development.json) records
supplementary Linux Node 24.22.1 direct-service tests. Corrected RED reached
14 cases: 7 passed and 7 aggregate-limit assertions failed, exit 1. The unchanged
fixture then passed 14/14, exit 0, with zero skips/cancellations. Original runtime,
fixtures, logs and a 17-file hash manifest remain in the recovery evidence.

The first run also contained one mistaken fixture expectation: a 4096-character
relative path expands beyond the policy input bound and correctly returns
`INVALID_PATH`, rather than `OUTSIDE_ROOT`. That initial fixture and log remain
preserved; correcting this one expectation preceded the final unchanged
RED/GREEN pair. No implementation assertion was weakened.

The [independent review](2026-11-02-aggregate-output-source-review.json) verified
the source, fixtures, development manifest and installed harness, independently
reran 14/14 focused tests, and found no blocking issue. This is source review and
direct-service evidence; native/installed/fresh/hosted gates remain separate.

The real package verifier now contains six aggregate scenario groups in its
read-only restarted MCP process: ordered summary/content with partial errors and
duplicates; schema and batch bounds; exact UTF-8 limit and one-byte overflow;
error-summary/separator accounting in both orders; private/outside/format/link
negative cases with unchanged bytes; and capability separation. Both npm launcher
and actual MCP server exits are checked independently before fixture cleanup.
Existing eight metadata and six directory groups remain intact.

## Qualification status at this preparation

Native original-source RED, focused GREEN, normal build/check, the actual full
orchestration wrapper, self-host, normal prepack, packed MCP, source/installed
synthetic Codex, fresh committed-source extraction and hosted checks must each be
observed. Later additive records supersede pending fields without backdating
this preparation. No real Codex authentication or model calls are authorized.

## Acceptance and next work

DCP remains **0/48**, WEB **0/12**, and the separate 300-item maturity remains
**29.12%**. Only supported implementation observations/evidence are added.
Protected states, stages, weights, acceptance texts, estimates, dependencies,
platform scope and blockers are unchanged. Issue #21 remains open: Office/image
payloads, broader encoding/large-file behavior and applicable actual supported
client evidence are incomplete. This slice supplies no owner ruling for
DCP-009, DCP-010, DCP-022 or DCP-024.

Native Codex parsing and SDK calls through a parsed registered command must not
be described as model-driven invocation. Actual ChatGPT consent/discovery/read
remain unperformed. The nonretryable deleted-release creation and denied-host
navigation are not retried. Existing owner enrollment, approved exposed root,
read-only/no-autostart mode and dirty primary checkout are preserved.

New development uses ordinary isolated clones named `aggregate-qualification-20261102`
on Windows and `MTerm-CLI` in the task scratch workspace. No source under the
running owner agent is changed; no production deployment or policy changes occur.
