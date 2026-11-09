# Native file cancellation and remote deadline classification

Session `MTERM-WEB-20261109T031131Z-e0efd5d4`; OpenAI / GPT-6 Astra Pro (self-reported).
Issue: [WEB-009 #62](https://github.com/MulattoTech/MTerm-CLI/issues/62).
Source base: `5880c61fcaaaaa8972f06d1ae5a88d6e2d3cbd70`, the normal PR #214 merge.
The owned feature branch was fast-forwarded from frozen prerequisite head
`0359569b70ddaa587ccab8e85d32cd9bd89a20e4` to the merge with the identical tree
`403eb91a26fcda7806e3dcdbdb734f15ecddcbb4` before implementation.

## Defect and bounded correction

Native `read`, `info` and `list` did not accept cancellation signals, and the MCP and
remote adapters did not pass their owning request signals to those operations.
Search accepted a signal but omitted it from content reads; skip catches and final
traversal boundaries could swallow cancellation and return partial or late success.
Existing remote search deadline cancellation could also report `CANCELLED` instead
of the existing late-success `DEADLINE_EXCEEDED` contract.

The optional signal now reaches native read operations through both dispatch paths.
Checks around awaited work prevent subsequent target I/O and late successful results.
Search preserves cancellation through its path/content skip catches and final EOF.
Acquired directories close even if cancellation arrives before iteration starts;
started iterators finish their cleanup, including every ancestor of nested searches.
File and directory cleanup remains awaited. The native and remote server handlers
retain admission until the underlying operation and cleanup settle; the client may
stop waiting earlier.

An admitted remote cooperative `CANCELLED` result at or after its request deadline
is normalized to `DEADLINE_EXCEEDED`. Before expiry it remains `CANCELLED`. This is a
settlement rule: it also applies when caller cancellation occurred first and cleanup
finished after expiry. Other surfaced errors, including admission failures, retain
their sanitized codes; existing non-cancellation search skip behavior is preserved.
Native search's separate `timeoutMs` truncation semantics,
existing limits and request replay protections remain unchanged.

## Actual regression evidence

The final unchanged fixtures ran against compiled files from a `git archive` of the
exact base, selected through `MTERM_VERIFY_BIN`. This avoids replacing candidate
source or accidentally testing stale candidate output.

| Execution | Observed result |
| --- | --- |
| Final 45 fixtures on unchanged source | **7 passed / 38 failed**, exit 1; zero skips/cancellations |
| Corrected fixtures plus existing files, remote adapter and MCP tests | **65/65 passed**, zero skips/cancellations |
| Independent peer execution of both new fixture files | **45/45 passed**; final SDK observation delta separately **3/3 passed**, zero skips/cancellations |

Local runtime: Node v24.22.1, Linux x64. [RED TAP](2026-11-09-file-cancellation-red.tap)
and [focused GREEN TAP](2026-11-09-file-cancellation-green.tap) retain the results.
Only trailing whitespace is removed from committed TAP display; original raw hashes
are in the [change record](../ai/changes/2026-11-09-file-cancellation.json).

The 45 cases cover:

- Pre-aborted native operations and cancellation after real path resolution.
- Real file open, descriptor metadata, read and close boundaries; final metadata
  checks; no additional reads after cancellation and closed owned descriptors.
- Directory open, yielded entry, empty EOF and iterator cleanup for list and both
  search modes, plus closure of a real file and both ancestor directories in a
  nested content search.
- Final-file read and final-path resolution cancellation, including injected access
  errors that exercise the search skip catches.
- All five remote read tools with caller cancellation and real `AbortSignal.timeout`
  expiry; sanitized unrelated `EACCES` remains `EACCES` after the deadline.
- Four admitted reads held at real open and close boundaries: a fifth returns
  `BUSY` until cleanup settles, all four cancel without further reads, a fresh
  request succeeds, and original request IDs remain replay-rejected.
- Three actual SDK stdio calls: an instrumented host gates the service after real
  path resolution. The client sends cancellation, then awaits ping as a FIFO
  server-processing barrier before releasing the gate. The service receives the
  actual aborted signal, performs zero subsequent target I/O and records a
  `CANCELLED` audit outcome. A default capabilities probe confirms that only the
  probe itself occupies normal admission after settlement.

During fixture development, the first patched run passed 42/45. All SDK signal,
I/O and audit assertions passed, but its final status query selected an execution-only
tool unavailable on a default read-only host. The fixture now uses the default
capabilities probe. The final exact fixtures were rerun on original source; the
RED result above includes this correction. Independent review also identified a
possible audit-observation race after the fixture report was published. Bounded
polling now waits for the actual server audit event; the final archived-base and
focused reruns include that correction, and an independent SDK rerun passed 3/3.
No product assertion was removed.

## Installed qualification and provenance

The package verifier runs both fixtures from outside the checkout against the actual
installed runtime. It compares native file/MCP/policy/error modules and remote
adapter/protocol bytes with the compiled source, retains the TAP log before asserting
success, requires at least 45 cases with zero failures/skips/cancellations, and
records fixture and log SHA-256 values. Exact-head installed/platform/native hosted
results are subsequent gates; this development report does not predict them.

| Reviewed input | SHA-256 |
| --- | --- |
| `src/files.ts` | `26a3050914b4c5c1ee4530428bb0237d0a946de5eab6694a22180c08c88e2353` |
| `src/mcp.ts` | `f514270a2eb5d14c2203af18bb3039754c1cf317fcbddc69e86983aea03e4fd0` |
| `src/remote/adapter.ts` | `7e479d112c83241153dee91a9badd1306c50c344684b5721eb6f7e22de283157` |
| `tests/file-cancellation.test.mjs` | `03513bc3072e04724926221da6f765a3f806b0d9035c3f1d8467ebbd0e3977da` |
| `tests/file-cancellation-mcp.test.mjs` | `2aca4601a8196f1e91d8ee9eff1a310300c0c637d4a98bc2f9ee82a9280a3f0e` |

## Limits and acceptance

Real filesystem operations, handles, SDK transport and deadline timers are used
with explicit test scheduling controls and injected failure cases. Cancellation
cannot guarantee interruption of pending OS work. The fixture host instruments its
own service instance; it is not an unmodified production host or a live gateway test.
Temporary controls stay outside the authorized fixture root. No user data, actual
pairing/OAuth, production bridge/plugin, global runtime or model call is involved.

CLI-268/270/272/273/274/287/288 receive evidence only. All 300 protected stages,
weights, estimates and acceptance fields remain unchanged. WEB-009 remains
unaccepted; historical staging/deployment source identity and all remaining work are
preserved. This slice does not qualify deployed transport cancellation, disconnect or
restart recovery, cross-client fairness, 20–30-client capacity or production load.
Dependencies, pinned licenses and write/mutation behavior are unchanged. The existing
cloud Unix-socket EPERM restriction remains recorded and does not waive hosted gates.
