# DCP-010 configuration setter contract — 2026-11-02

**Implementation `16ea3ff82062c6f3018385b1a59600431e475c36` passed 187/187 native
Windows tests, all seven conceptual qualification gates, ten actual installed
configuration scenarios and fresh committed-source qualification.** The actual
full-orchestration wrapper ran successfully. The focused setter tests first
established a 2-pass/10-fail RED, then passed 12/12 after the bounded output fix.
[PR #74](https://github.com/MulattoTech/MTerm-CLI/pull/74) is a draft at this
record's preparation. All nine implementation hosted checks also passed without
retries. Final documentation checks, merge/main and final recovery remain
pending. This does not accept or close
[DCP-010 / #12](https://github.com/MulattoTech/MTerm-CLI/issues/12).

The ordinary continuation clone is on `feat/dcp-010-config-contract-20261102`,
based on merged main `acaf276066c9e0436af2398c0120a38f7c04f5f0` (tree
`9a8338bde6207c13005d6b1bb2583201bc609931`). Both focused Windows runs used the
uncommitted isolated candidate based on that commit; the fixed source is
identified by its file hash below. The later full native and fresh-source gates
used committed implementation `16ea3ff`; base `acaf276` itself does not contain
the fix. The original dirty Windows checkout, protected worktrees and the running
owner agent's separate checkout are preserved by the integration owner.

## Exact output change and its boundary

The reference is DesktopCommanderMCP 0.2.52 at immutable commit
`c774c3b505de990219637ecdc9a830c8772fae9d`, specifically
[`src/tools/config.ts`](https://github.com/wonderwhy-er/DesktopCommanderMCP/blob/c774c3b505de990219637ecdc9a830c8772fae9d/src/tools/config.ts)
and the retained [tool schemas](../parity/upstream/src/tools/schemas.ts).
The existing MTerm success prefix omitted ` to <JSON value>`. It now returns one
text content item, with no structured success extension:

```text
Successfully set <key> to <effective value as JSON, indentation 2>

Updated configuration:
<effective configuration as JSON, indentation 2>
```

The prefix and configuration body use the same object returned by the successful
validated setter. There is no additional read that could observe a later
concurrent writer and no echo of the unvalidated request value. The existing
six-preference body and `schemaVersion: 1` remain. For canonical roots and
mandatory command blocks, the effective value intentionally differs from
upstream's `valueToStore` echo and may also differ from the valid spelling stored
in the policy file. This is an explicit safety contract, not a claim of exact
upstream data equality.

Only `src/mcp.ts` changes runtime behavior. `src/compat-config.ts`, storage and
locking, bounds, capabilities, owner ceilings and error handling are unchanged.
Configuration mutation still requires separate `--allow-config-write`; it does
not grant file writing, process execution, shell discovery or network transport.

## Six supported preferences

The shared MCP input schema admits string, number, boolean, string array or null,
then the existing per-key validator applies the stricter contract below. Every
supported preference rejects null. Actual object values are outside the input
schema. Array-key strings beginning with `[` after leading whitespace are parsed
as JSON arrays and validated; other scalar strings are treated as one array item.
There is no generic JSON-object parsing or numeric/boolean-to-array coercion.

| Preference | Existing accepted input and effective success value | Intentional differences and remaining boundary |
| --- | --- | --- |
| `blockedCommands` | A native string array, valid JSON-array string, or scalar command string. At most 128 input items; each is nonempty, at most 4096 characters and contains no ASCII control/DEL character. Effective names are trimmed, reduced to a basename, lowercased and stripped of `.exe`, `.com`, `.cmd`, `.bat` or `.ps1`, then deduplicated together with mandatory owner blocks. The prefix reports this effective list. Empty input retains mandatory blocks. | Broad upstream coercion of numbers, booleans or null is rejected. Valid stored spellings can differ from the effective acknowledgement. Mandatory blocks cannot be removed. Full shell command parsing and downstream blocked-command semantics remain in DCP-012/013/034. |
| `defaultShell` | A nonempty, bounded control-free string matching an immutable startup owner shell choice; comparison is case insensitive on Windows. The accepted owner choice is returned. | Runtime configuration cannot discover or authorize another shell. The harmless fixture shell names are never executed; this does not qualify shell execution semantics. |
| `allowedDirectories` | A native string array, valid JSON-array string, or scalar absolute path; at most 16 bounded control-free items. Existing directories must resolve within owner roots. The acknowledgement reports canonical, deduplicated roots. An empty array reports `[]` and denies filesystem access. | No broad scalar coercion, relative-path permission or owner-root widening. Empty roots deliberately mean deny all, unlike upstream's unrestricted interpretation. Valid stored path spellings may differ from the effective output. Existing link/private-path controls remain. |
| `fileReadLineLimit` | A JSON integer from 1 through 10000, returned as a JSON number. | Numeric strings, fractions, zero, negative values, booleans and null are rejected. Existing live file-read preferences remain; full pinned process/read pagination semantics are outside this output slice. |
| `fileWriteLineLimit` | A JSON integer from 1 through 10000, returned as a JSON number. | The same strict numeric validation applies. This preference controls the existing advisory write warning; it does not become a new hard write cap or grant write capability. |
| `telemetryEnabled` | A boolean or a string whose trimmed, lowercased value is `true` or `false`; output and stored preference are JSON booleans. | Boolean-string normalization agrees with the pinned handler. Other strings, numbers and null are rejected. This is only a stored preference: `telemetryTransport` remains `none`, and `effectiveTelemetryEnabled` remains false. |

The common schema retains its existing size bounds: key length 1–80, string
input at most 32768 characters, and at most 128 string-array entries of at most
4096 characters. Unknown, prototype and capability keys cannot create settings.
The public error shape remains `isError: true`, a safe structured error object,
and an identical JSON text item. Rejected raw values and raw internal errors are
not returned or logged by this handler. The new checks exercise `CONFIG_KEY`,
`CONFIG_SCOPE`, `OUTSIDE_ROOT`, `CONFIG_INVALID` and `INVALID_ARGUMENT` cases.

## Test design and preservation checks

The new [MCP contract test](../../tests/compat-config-set-contract.test.mjs) uses
real official-SDK stdio connections and temporary roots, policy state and
synthetic `CODEX_HOME`. It contains six exact success cases, boolean normalization,
root/command normalization and empty arrays, integer endpoints and idempotent
writes, a 32-case rejection matrix, two rounds of concurrent same-key writes, and
absence of the setter without its independent capability. No test authenticates
a user or invokes a model. Shell fixtures establish preference selection only.

Each rejection is checked against a seeded policy and backup: both files retain
their exact bytes, directory entries are unchanged, the error envelope matches,
and a rejected sentinel is absent from the response. Repeating an already stored
integer also preserves policy and backup bytes. These are scoped validation and
no-op guarantees, not proof that all I/O failures can never change a backup or
that a cooperative lock is an OS-wide transaction. The prior replacement/retry
and unrelated-writer tests remain in place.

The concurrency case samples two real writers twice and checks each successful
response against that request's accepted value. It does not force a particular
interleaving or certify every race. Static review confirms that the new prefix
uses the returned write snapshot, with no second read.

The [installed verifier](../../scripts/verify-configuration-installed.mjs) now
adds the same six-key response contract and 14 rejected-write checks to its
existing actual-package scenarios. It checks both policy and backup bytes,
mandatory blocks, canonical roots, boolean strings, line-limit types and a
selected shell after restart. This extends its scenario count from
eight to ten while retaining two concurrent MCP children, restart, metadata and
network-guard checks. All ten scenarios passed against the real installed
package in both native and fresh-source qualification at `16ea3ff`, with verified
owned-child shutdown and fixture cleanup. The new shell fixtures establish
preference persistence without claiming actual shell execution.

## Observed RED and GREEN

The new assertions were written before the runtime edit. The first independent
review found a test cleanup flaw: an early cleanup exception could skip another
owned child and still remove its fixture. The corrected helper attempts every
client and transport close, independently verifies every captured child's exit,
aggregates cleanup failures and retains state if any exit is unconfirmed. This
repair changes cleanup only; the contract assertions are unchanged.

| Observation | Actual result and attribution |
| --- | --- |
| Scratch development compile, before and after runtime edit | `npm run build:code` passed on Linux x64 Node 24.22.1. This is development compile evidence only. |
| Scratch stdio attempts | The test runner reported a file-level failure; a direct attempt exposed `CONNECTION_CLOSED` during initialization before behavior assertions. Classified as an environment/observation failure, not product RED or a contract result. No further scratch stdio reruns were used. |
| Native RED, 12:43:10–12:43:14 UTC | Windows x64 Node 24.21.0, 12 tests: **2 passed, 10 failed**, zero skips/cancellations. All ten failures reached the success-text assertion. The rejection and capability cases passed. Runtime remained the base bytes; original test cleanup revision identified below. |
| Native GREEN, 12:47:32.574–12:47:36.990 UTC | Windows x64 Node 24.21.0, **12 passed, zero failed/skipped/cancelled**; test duration 3494.2329 ms. Compile exit 0. Fixed runtime and corrected-cleanup test hashes are identified below. |
| Independent source review | No blocking findings in the reviewed runtime, test and installed-verifier bytes. The cleanup finding is resolved. Review was static and does not infer a runtime or publication gate. |
| Normal roadmap-reviewed build/check; complete native/package/prepack/Codex gates | PASS at committed `16ea3ff`, Windows x64 Node 24.21.0. Actual full wrapper, self-host, normal prepack and installed Codex all exited 0; 187/187 tests with zero failures/skips/cancellations. Exact receipt below. |
| Fresh committed extraction and actual installed proof | PASS at exact committed `16ea3ff`: archive/extract, locked install, reviewed build, normal prepack and actual installed package verification. 187/187 tests, no skips; ten installed scenarios. |
| Hosted implementation checks | PASS: all nine checks at `16ea3ff`, no retries, observed 13:09:16.557 UTC. Exact runs and scope below. |
| Final documentation, merge/main and recovery gates | Pending; implementation or historical PR #73 results do not qualify a future documentation or merge head. |

Both focused native runs used:

```powershell
npm run build:code
node --test --test-reporter=tap --test-concurrency=1 tests/compat-config-set-contract.test.mjs
```

Retained native evidence is under the isolated Windows clone
`C:\Tools\Dev\MTerm-CLI\artifacts\worktrees\config-contract-20261102\artifacts\config-contract-red`
and `config-contract-green`. Scratch evidence is retained under
`artifacts/config-contract-dev`. The offline scratch dependency install failed
with `ENOTCACHED`; an independent copy of the earlier cached dependency tree was
used only after all three package/lock/shrinkwrap files matched exactly. No
mutable dependency tree was shared. This is not a fresh locked-install result.

The first normal scratch build failed parity evidence validation because a new
remote PR-comment URL had been placed in an evidence list that accepts committed
local paths. The integration owner corrected only that ledger reference to this
local report, retaining the direct PR citation here; normal build and formatting
then passed. The failed `npm run build` remains a failed gate even though the
surrounding ad-hoc shell ended with a later successful diff check. No checker or
runtime was weakened. Separately, an initial Windows import-wrapper hash check
compared a trailing-newline variant with the bytes actually sent. The exact-byte
comparison was corrected and verified before execution; this was an import
observation, not a product failure.

| Evidence identity | SHA-256 |
| --- | --- |
| Pre-fix `src/mcp.ts` used for native RED | `dad705164d249068696ec303b5d4a4b2e6712625b25f1c74ca142639db708540` |
| Original native RED test | `f824462c68b0f1216232afad767718e0fdeb2ecf748828b4a7a3176f16f12117` |
| Native RED stdout | `434d981b92e8c322b26ede98a50464018a4be6f1c207754b4bc295111b9a63ef` |
| Fixed `src/mcp.ts` | `d585feb3c9b4707c24e266e4d8476e18ce21bc25169ebe08275fa972a34d400b` |
| Corrected-cleanup contract test used for GREEN | `9ca666989736911aacf24b3b4516cb91e8a6548bdbfb0736cd7ae136b353d992` |
| Native GREEN stdout | `a0e04c288dc02fa0be2c53b7ea8e4e16ac2f5787ed2055939c6dc4683ace3c1f` |
| Extended installed verifier | `ff38f93d738b4a6d47347d62fc62c84bedb1228ea0ff488e0aee1bd44232e49b` |
| Unchanged `src/compat-config.ts` | `73d3f109bd4ce67a83e9ba7c5eb55e70eaa45f4cab63d96165a365b4698c9af9` |
| [Independent source review](2026-11-02-config-contract-review.json) | `8bfefad15ac19d4a49a6d1ba70f247b799c2fab7f7cc9665d5d2ac122e215d0c` |

## Committed native and fresh-source qualification

The [native Windows receipt](2026-11-02-config-contract-windows.json) identifies
exact head `16ea3ff82062c6f3018385b1a59600431e475c36`, a clean checkout before
and after qualification, and unchanged source/test/verifier hashes. The complete
native campaign ran from **13:00:35.849 to 13:02:02.058 UTC**. The actual
`node scripts/orchestration/verify.mjs --full` invocation ran from
**13:00:35.945 to 13:01:25.726 UTC** and exited 0. This is observed wrapper
execution; the earlier DCP-009 campaign's individually executed components are a
different historical record.

| Conceptual native gate | Execution and result |
| --- | --- |
| Reviewed normal build | PASS within the actual full wrapper. |
| Normal check | PASS within the wrapper: 187 passed, 0 failed/skipped/cancelled; test duration 31070.6053 ms. |
| Real package verification | PASS within the wrapper: actual pack/install, external launch, offline npm exec, owned-prefix link and ten installed configuration scenarios. |
| Source-entry native Codex | PASS within the wrapper: native Codex 0.160.1 parsed synthetic registration; the SDK completed two registered-command MCP rounds. |
| Self-host | Separate gate exited 0. |
| Normal prepack | Separate gate exited 0, including 187/187 tests with no skips or cancellations. |
| Installed-entry native Codex | Separate gate exited 0; native parser and two SDK MCP rounds passed for the installed entry. |

The installed scenarios exercise six setting responses, 14 rejected-write cases,
policy/backup byte preservation, canonical roots, mandatory blocks, concurrency,
metadata and restart. All captured MCP/fixture exits were verified and owned
fixtures were cleaned. Ten deliberate network canaries were intercepted and
zero product attempts were observed in the instrumented standard Node APIs of
the three MCP children. This does not establish an OS network sandbox or monitor
arbitrary descendants.

The package archive was **57,977 bytes**, unpacked payload **224,683 bytes**, and
installed production footprint **14,172,053 bytes** across 992 files. Node and
Codex remain external prerequisites; these sizes are not full three-component
bundle acceptance. Source and installed Codex checks used synthetic state,
preserved unrelated bytes and verified shutdown. Both report native parsing and
two SDK rounds, **zero model calls**, **no real user configuration changes** and
`actualCodexAgentToolInvocation: false`.

The [fresh-source receipt](2026-11-02-config-contract-fresh.json) records a
separate exact-commit campaign from **13:02:54.753 to 13:03:44.492 UTC**. Archive,
extraction, locked dependency installation, reviewed build, normal prepack and
actual installed package verification all exited 0. The fresh normal prepack
again passed **187/187 tests with zero skips**, and the real installed verifier
passed all ten scenarios with the same package sizes above. This is independent
of the earlier scratch dependency-copy setup. The extraction initially contained
neither `dist` nor `node_modules`; all four extracted source/test/verifier hashes
matched the tested implementation. Source archive SHA-256:
`652bf67178f734be5bc80d7a7a3108e59baf76ae893029652d614e4311e7074c`.

| Qualification receipt | SHA-256 |
| --- | --- |
| Native Windows | `0edc45757735bb1eb4e9aca0bcd76baac58b2ca24f8d4b7569af6e41a8cbdb29` |
| Fresh committed source | `031023ab4df73e7929006a647fbf9ae18a29a8f36061763a7070357ac15f7121` |
| Hosted implementation | `fc7a332db7c03dbacde1580c2aca224c69ed128a55a097cf9b8124d350917717` |

## Hosted implementation checks

The [hosted receipt](2026-11-02-config-contract-hosted.json) records **9/9 checks
passed** at exact implementation `16ea3ff`, observed **13:09:16.557 UTC**. The
last check completed at **13:08:30 UTC**. Each workflow remained on attempt 1;
there were no retries in this campaign.

| Workflow | Scope and result |
| --- | --- |
| [Push matrix 41449904997](https://github.com/MulattoTech/MTerm-CLI/actions/runs/41449904997) | PASS: Windows 2022, Ubuntu 24.04, macOS 14 and macOS 15 Intel on Node 24. |
| [PR matrix 41450112186](https://github.com/MulattoTech/MTerm-CLI/actions/runs/41450112186) | PASS: the same four platform jobs. |
| [PR fast 41450112178](https://github.com/MulattoTech/MTerm-CLI/actions/runs/41450112178) | PASS. |

These are implementation-head results. The retained receipt reports check/run
state; the native and fresh records provide the detailed counts and installed
behavior above. Final documentation-head checks, merge/main checks and additive
recovery remain separate pending actions. PR #73's older timeout/retry history
remains preserved and is not attributed to this no-retry implementation campaign.

## Issue and connection observations

The [additive issue-audit receipt](2026-11-02-config-contract-issue-audit.json)
preserves the original 12:34:25 UTC observation of all 48 live DCP issue bodies
and 22 comments, with zero ledger identity/state/title/URL/pin/epic mismatches.
Its later receipt timestamp is not a new remote audit. No acceptance decision
was made, and the nine named historical records remain byte-identical to the
frozen base.

The separate [connection recheck](2026-11-02-connection-recheck.json) records an
existing-session Brave dashboard observation at approximately 12:56:08 UTC:
one owner computer online, read-only access, zero client authorizations and zero
active requests. Dashboard and public health reported the earlier staging build
`b90432a`; they do not independently verify the Cloudflare management version or
Access policy. Actual ChatGPT consent, discovery and file reading remain
unobserved. Successful personal plugin listing/search does not establish repair
of the earlier non-retryable creation error, and the blocked ChatGPT host was not
retried or bypassed. These are separate connection observations, not setter or
client-acceptance credit.

## Earlier DCP-009 delivery and the remaining owner ruling

The [direct final PR #73 receipt](https://github.com/MulattoTech/MTerm-CLI/pull/73#issuecomment-6577021102),
posted 12:22:35 UTC and read for this continuation, resolves the older
prepublication notes: final PR head `6757c1fbb0df2dc41087640793f589c80a135302`
passed 9/9 checks without retries; normal merge at 12:17:20 UTC produced current
base `acaf276` with the identical tree. Merged main passed 5/5 checks without
retries, last completion 12:19:42 UTC, rechecked 12:20:35 UTC. Historical
implementation `535d99e` remains the source of the 175/175 Windows, eight installed
scenario and fresh-source proof. Its initial macOS ARM npm-install timeout and
one supported successful retry remain recorded with cause unestablished.

**The remaining DCP-009 owner decision is whether the documented omitted probes
and owner/privacy restrictions are acceptable intentional differences within the
Codex-facing parity contract; otherwise, the owner must define which truthful,
bounded fields are required.** Specifically, omitted fields are `docker`,
`pythonInfo`, `isDXT`, `nodeInfo.path`, `nodeInfo.npmVersion` and
`examplePaths.accessible`. Other differences include no container suffix in the
OS name, effective owner-selected shell metadata, owner-bounded available shells
and editability, bounded client name/version, empty feature flags with no
provider, immutable roots/mandatory blocks, empty roots denying access, no
telemetry transport, and malformed policy failing closed.

That is an acceptance-contract ruling. It does not authorize model calls,
credential changes or real user configuration changes, and it does not replace
separate supported-client acceptance. The earlier native Codex 0.160.1 parser
and SDK execution evidence remains distinct from actual model-driven tool use:
model calls were zero and actual Codex-agent tool invocation was false.

## Remaining work and unchanged acceptance

The integration owner must review this final documentation and evidence, explicitly
review/render the refreshed roadmap, and complete pending final-documentation,
merge/main and recovery gates. Native, fresh-source and hosted proof above
qualify implementation `16ea3ff`; they do not predict a later documentation
head or merge. #12 remains open for its own complete
setter contract, accepted intentional differences and applicable actual client
evidence; separate DCP-012/013/014/034 shell/process contracts remain unqualified
by this slice. This source change performs no deployment, pairing, owner enrollment
change, client consent flow or model call.

All 48 DCP issues remain open, accepted **0/48** and `pass: false`. WEB acceptance
remains **0/12**. Broad CLI maturity remains **29.12%**: only relevant evidence,
notes and reviewer metadata are updated; stages, weights, acceptance texts,
dependencies and estimates are unchanged. The pre-change additive checkpoint
`artifacts/checkpoints/dcp010-start-20261102` contains `all-refs.bundle` SHA-256
`ed43eabe3b2345bb6441f8ac29b14e9ef2fa444a1e2418be2dca8d5085c654e7`
and `main-source.tar` SHA-256
`ba0fe3e5a395c1c65f7ba6ce7137430fb104ef6812d138e550093c034f062f9c`.
