# Installed configuration qualification — 2026-11-02

The new DCP-016 verifier passed both a standalone probe and the integrated normal
Windows package gate against actual packed MTerm installations. The full native
workflow, normal prepack, self-host check and source/installed managed-Codex gates
also passed. Two concurrent MCP children observed shared configuration changes;
a third child verified persistence after restart. These are scoped installed
results; full configuration and Desktop Commander acceptance remain open.

Primary requirement: [DCP-016 / #18](https://github.com/MulattoTech/MTerm-CLI/issues/18).
The separate DCP-010 / #12 configuration-replacement repair is a product dependency,
not part of this verifier-only source change. All 48 DCP issues remain open.

## Source and evidence identity

The qualification worker started from
`059413ffa4fb3b18c8e15af907744a40e0b874a7`; its final dependency base is main
`932c310914d8af822c5b1611ac85c5e79c2c5097`, which incorporates the separately
reviewed DCP-010 repair. This DCP-016 slice changes only verification,
documentation and evidence. The standalone probe ran a copy of the new verifier
under the integration owner's Windows artifacts directory against a package built
in the separate DCP-010 checkout. It did not run the newly integrated package or
managed-Codex gate. The package hashes below identify the actual product bytes;
this report does not invent a committed source SHA for that preliminary package.

| Item | Observed value |
| --- | --- |
| Platform | Windows / `win32` / x64 |
| Runtime | Node `v24.21.0` |
| Package | `mterm-cli@0.0.1-preview.1` |
| Installed entry SHA-256 | `1376dfb68527a2fef2444be718a0011c53333c90f416eb377a8bde43e5dcc5b0` |
| Installed `compat-config.js` SHA-256 | `18e20ed25d20124e2530e8a236133d49317fdf9116531df2c4de4fc455225c50` |
| Candidate verifier SHA-256 | `d9e1ad6169ee24e5800b8c9e3c7e0d95202eb90d8ea28e304f9c6b2e8038d642` |
| Retained launcher-log modification time | `2026-11-02T03:15:48.208Z` |
| Evidence basis | Native execution and retained output inspected by the integration owner |

The log modification time is not presented as an independently measured start or
completion time. [Sanitized observation](2026-11-02-config-installed-windows.json)
records the supplied result fields and the scope of this evidence.

Retained Windows paths:

```text
C:\Tools\Dev\MTerm-CLI\artifacts\worktrees\config-retry-20261102\artifacts\config-retry-validation\installed-configuration-probe.log
C:\Tools\Dev\MTerm-CLI\artifacts\worktrees\config-retry-20261102\artifacts\package-verify-ktDEkl\configuration-09yct2\result.json
C:\Tools\Dev\MTerm-CLI\artifacts\worktrees\config-retry-20261102\artifacts\package-verify-ktDEkl\install\node_modules\mterm-cli
```

## Observed standalone result

All seven verifier scenarios passed:

1. Two different installed MCP processes discovered the configuration tools and
   independently read both explicit startup roots.
2. A write in one process changed native, compatible and multi-file read defaults
   in the other. Dynamic write warnings changed at the configured threshold, and
   Unicode append/rewrite bytes remained exact.
3. Three rounds of concurrent changes to different keys preserved both updates.
   No owned lock or temporary file remained after successful writes.
4. Root narrowing affected subsequent calls. Empty roots denied new file work.
   Attempts to grant capabilities, select an unapproved shell, widen beyond owner
   roots or store invalid limits failed while preserving previous policy bytes.
5. Both telemetry preference values were exercised without an observed attempt
   through the instrumented Node network APIs.
6. Dynamic command blocking denied a new launch. Deliberately malformed policy
   denied configuration and file work while owned session inspection and stop
   remained usable. Only the fixture driver repaired its synthetic corrupt file.
7. After both original MCP children stopped, a fresh child saw persisted limits,
   roots, command blocks and telemetry preference. Starting it without
   `--allow-config-write` did not inherit configuration mutation authority.

The report records **2 concurrent MCP children, 1 restarted child, 10 intercepted
network canaries, 0 observed product network attempts, zero stderr bytes from
each child, verified shutdown and completed owned-fixture cleanup**. No real user
configuration or authentication was changed, and no model call occurred.

## Evidence safeguards

The verifier requires a regular installed entry at the canonical path beneath
the supplied installation prefix and checks the package name, version and bin
mapping before starting it. Source-entry substitution and a mismatched package
are covered by separate negative verifier tests. Their native Windows run passed
**2/2, zero failures/skips, 483.4784 ms** in the dedicated
`config-qualification-20261102` clone based on `2978774`, with all four transferred
verifier files hash-verified by the integration owner. The retained log is
`artifacts/config-qualification-validation/negative-fixtures.log` in that clone.
This focused result is separate from the full integrated gate recorded below.

The network preload records attempted API names before throwing, including
attempts caught by product code. Its positive canary exercises TCP, TLS, HTTP,
HTTPS, HTTP/2, UDP, callback/promise DNS, fetch and WebSocket entry points. Audits
retain at most 128 attempts per child and do not log destinations or content.
This observes the instrumented Node APIs in the three MCP children. It is not an
OS firewall, a native-addon guarantee or a descendant-process transport monitor.

Initialization, listing and tool requests have five-second deadlines. Stderr is
drained with a bounded retained tail. Cleanup is registered before initialization.
The verifier captures each original process ID and independently observes
`ESRCH` using bounded signal-zero polling after SDK close; a cleared SDK PID alone
does not prove exit. The owned long-running process receives the same independent
exit check. An ambiguous or reused PID fails proof rather than triggering a
numeric-PID termination fallback.

## Integrated gates and remaining acceptance

`scripts/verify-package.mjs` now invokes the installed configuration verifier and
includes its detailed result. `scripts/verify-managed-codex.mjs` now defines two
synthetic roots, an explicit synthetic compatibility-policy path, discovery of
`get_config` / `set_config_value`, a mutation, restart persistence and a configured
read. It still records `actualCodexAgentToolInvocation: false`.

The integration owner subsequently ran the revised normal Windows workflow in
`C:\Tools\Dev\MTerm-CLI\artifacts\worktrees\config-qualification-20261102` on main
`932c310` plus the four hash-verified verifier files. It passed **164/164 tests,
zero skips, 31,150.2471 ms test duration**, the normal package gate and the revised
source-entry managed-Codex gate. Retained package evidence is
`artifacts/package-verify-6R87k5/result.json`; source-entry Codex evidence is
`artifacts/managed-codex-gRHQMc/result.json`. The supplied results report all new
configuration assertions true and no model calls.

The subsequent normal prepack and explicit installed-entry managed-Codex follow-up
also passed. The [sanitized native observation](2026-11-02-config-installed-windows.json)
retains the supplied full package and Codex result objects, observed at
`2026-11-02T03:29:34.871Z`:

| Native gate | Result |
| --- | --- |
| Full Windows workflow | PASS, 57,444 ms; 164/164 tests, zero skips |
| Self-host check | PASS, 1,383 ms |
| Normal prepack | PASS, 37,346 ms |
| Explicit installed-entry Codex | PASS, 2,137 ms; `installedEntry: true` |
| Packed payload | 56,649 archive bytes; 220,182 unpacked bytes; 14,167,552 installed production bytes |
| Package transport/lifecycle | Packed MCP round trip, owned-prefix link and offline npm-exec passed |

The integrated installed verifier again passed all seven scenarios with 10
intercepted canaries, zero product attempts, three verified MCP exits and completed
owned cleanup. Both Codex runs used the test-owned native Codex 0.160.1, parsed
the synthetic two-root registration, discovered both configuration tools, verified
the synthetic policy path, persisted a changed default across two registered
command sessions, exercised its read limit and proved process exit. The explicit
installed result is retained under `artifacts/managed-codex-4MeAZP`. Both report
`actualCodexAgentToolInvocation: false`, zero model calls and no real user changes.

The native run's source fingerprint was
`020a7a45b1e00aab91df26932ff2b4feb7166cacc9ed132940a6c2e7aed749a1`.
Later documentation integration requires its own refreshed fingerprint; it does
not change the four tested verifier files. All nine checks on implementation
`def85d256fe558ef26e0cdf7d0218ce250682150` subsequently passed, as did a fresh
committed source extraction. Exact check URLs and extraction outcomes are retained
in [the delivery record](2026-11-02-config-delivery.json).

Scratch subprocess probes did not supply reliable child-process test evidence;
their file-level wrapper results are not counted. Development compilation and
formatting were used to prepare the candidate. No source-runtime behavior changed
in this DCP-016 slice, so there is no claimed new product RED/GREEN repair here.
The new assertions turn missing installed coverage into an executable gate.

Full DCP-016 acceptance still requires the complete pinned-contract and applicable
actual Codex-client acceptance decision. The installed/native-registration matrix
now passes on Windows, Linux and both macOS architectures; it does not establish
model-driven invocation or silently waive intentional contract differences. Owner-selected ceilings, empty-root denial, no telemetry
transport, per-call snapshots and cooperative-writer limits remain intentional
documented boundaries. This probe does not complete unrelated shell, format,
search, process, history or telemetry contracts.

Broad maturity remains **29.12%**, with **0/48 DCP** and **0/12 WEB** accepted.
No stage, baseline weight, issue state or acceptance decision changes.

## Published implementation, extraction and delivery

[PR #71](https://github.com/MulattoTech/MTerm-CLI/pull/71) delivered DCP-010 source
`297877435c4b3358ac53414af28edd11504e35ed`, merged as
`932c310914d8af822c5b1611ac85c5e79c2c5097`. Its nine branch/PR checks and five
post-merge main checks passed. Those remain dependency evidence.

[PR #72](https://github.com/MulattoTech/MTerm-CLI/pull/72) publishes DCP-016
implementation `def85d256fe558ef26e0cdf7d0218ce250682150` and its delivery documents.
All nine checks passed at that implementation: PR matrix `41383776637`, fast
`41383776656`, push matrix `41383709723`.

A new `git archive` extraction of that commit began with neither dist nor
node_modules. Exact dependency install passed in 4,062 ms; reviewed build in
1,796 ms; normal npm pack including prepack in 36,200 ms; and the installed
package gate, including all configuration scenarios, in 12,134 ms. The source
archive SHA-256 is
`fa9b8d470afbd6e70f81232841c879a8ac680a9d3e4b0411914c0f12bef78d9e`.
Evidence: `artifacts/config-qualification-validation/fresh-source-result.json`.

The final documentation revision requires its own exact-head hosted checks and
expected-head merge. PR #72's delivery comment records the resolved final head,
merge/main checks and additive recovery manifest. A document cannot contain its
own future merge hash; use that external record and re-fetch current main before
continuing. The downloadable prompt carries the final observed release record.

Review/render is refreshed for this documentation change. The four executable
verifier files remain byte-identical to the native, extracted and hosted-tested
implementation. No acceptance count, stage, baseline weight or deployed Worker
changes in delivery closeout.
