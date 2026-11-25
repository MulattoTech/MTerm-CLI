# Local Desktop Commander parity qualification — 2026-11-25

## Scope and references

- Open-source DesktopCommanderMCP 0.3.4, exact commit 9a101b17e44577f0baefa4c7120f087881c5cc56: https://github.com/wonderwhy-er/DesktopCommanderMCP/tree/9a101b17e44577f0baefa4c7120f087881c5cc56. Manifest, schemas, server registration, usage/history handlers and MIT license inspected.
- Remote Desktop Commander documentation, commit 71d6444c59c36f2cba2f13e8f72785383a8528b5: https://github.com/desktop-commander/remote-desktop-commander/tree/71d6444c59c36f2cba2f13e8f72785383a8528b5. Hosted implementation is proprietary, not available in that repository. Independently implement local equivalents rather than copying proprietary internals.
- MTerm-CLI candidate base e05d5f46ced98d0016af9a9c85198b81b1019853. Keep existing 0.2.52 pinned snapshots and 48-gap release ledger unchanged.

The new machine-readable inventory [local-0.3.4.json](local-0.3.4.json) accounts for all 25 current upstream manifest tools and additional documented local requirements. Tests reconcile actual stdio discovery in native, read-only compatibility, and explicitly enabled write/exec/config profiles. Authenticated Live Connection advertised all 25 names plus 28 custom names in this chat, but discovery is not runtime behavioral qualification.

## Actual implementation

Added opt-in get_recent_tool_calls and get_usage_stats to the standalone compatibility profile, both read-only. History supports exact tool name, ISO time and count filters; results are chronological within the latest selected events. Usage aggregates successful/failed calls and elapsed duration by tool in the existing 256-entry process-local ring. No raw arguments, output contents, persistence, vendor telemetry, billing or network calls. Returned raw tool errors now count as TOOL_ERROR rather than success. Existing mterm_audit_list and permission controls remain intact. These are privacy-preserving partial equivalents, not full upstream history retention or lifetime usage parity.

## Measured qualification

- Expected RED: 2/2 new alias tests failed against original built runtime; tools absent.
- GREEN: 4/4 audit and manifest/discovery tests pass on new runtime.
- Seven neighboring suites: 29/29 pass, no failed/skipped/cancelled/todo. Includes old pinned differential text handling, least privilege, config narrowing, process lifecycle, compact navigation and baseline drift checks.
- Current manifest classifications: 12 partial aliases (including two new), 6 native partial equivalents, 6 missing standalone contracts, 1 vendor feedback exclusion. No whole-tool full parity awarded; no DCP closure or stage promotion.
- Remaining primary engineering gaps: actual asynchronous owned search and paging/cancellation; PID/line-based process adapters and prompt detection; system process inventory with scoped termination; document/image formats and safe local previews; local prompts and opt-in durable redacted history. Validate upstream behavior and security differences operation by operation, then actual package/client/platform gates.
- No hosted inference, cloud account changes, OpenHands modification, main merge or deployment. Independent release review and full CI not claimed.

Next: start with DCP-029–033 using existing bounded FileService search, actual cancellable owned sessions, configuration-revocation rechecks and explicit result limits, with differential tests. Do not implement fake asynchronous completion or weaken scope to match upstream defaults.
