# DCP-010 configuration setter contract — 2026-11-02

**The focused native Windows contract tests passed 12/12 after an observed
2-pass/10-fail RED.** This change completes a bounded success-output correction
and adds six-preference contract checks. Normal reviewed build/check, full native
qualification, packed-installed execution of the extended verifier, fresh-source
qualification and hosted/publication gates remain pending at this record's
preparation. It does not accept or close [DCP-010 / #12](https://github.com/MulattoTech/MTerm-CLI/issues/12).

The ordinary continuation clone is on `feat/dcp-010-config-contract-20261102`,
based on merged main `acaf276066c9e0436af2398c0120a38f7c04f5f0` (tree
`9a8338bde6207c13005d6b1bb2583201bc609931`). Both focused Windows runs used the
uncommitted isolated candidate based on that commit; the fixed source is
identified by its file hash below. Base `acaf276` itself does not contain this fix.
The original dirty Windows checkout, protected worktrees and the running owner
agent's separate checkout are preserved by the integration owner.

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
selected shell after restart. This extends its expected scenario count from
eight to ten while retaining two concurrent MCP children, restart, metadata and
network-guard checks. Execution of this extended installed gate is still pending
here; source inspection and syntax checks do not supply installed evidence.

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
| Normal roadmap-reviewed build/check; complete native/package/prepack/Codex gates | Pending integration-owner qualification of this change. |
| Fresh committed extraction and actual installed proof | Pending. No new committed implementation SHA is asserted. |
| Hosted implementation, final documentation, merge/main and recovery gates | Pending; historical PR #73 results do not qualify this new candidate. |

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

The integration owner must review the final documentation and evidence, explicitly
review/render the roadmap, and complete the pending native, packed-installed,
fresh-source and exact-head delivery gates. #12 remains open for its own complete
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
