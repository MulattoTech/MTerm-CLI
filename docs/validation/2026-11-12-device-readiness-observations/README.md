# Device observations and admission freshness — November 12, 2026

This is a scoped source delivery under issues 58/62, based on endpoint main
`da03dc5255976b1524b22796fffadb01e50a5149` and tree
`2ee6ecc09206ca3f8e64edc34635b3820383e00b`. It separates historical gateway
observations from current executor health and corrects a reproduced admission
decision that could use stale presence after asynchronous reads.

## Contract and correction

The existing device projection gains only `observations`: one projection time,
authenticated poll receipt time, a bounded timestamped capacity offer, an accepted
result time/outcome, and `executorHealth: unknown`. The last two values are not
proof of current health. The capacity offer precedes allocation and may have been
consumed in the same reply. Legacy omission clears the earlier offer to unknown
while retaining four-request delivery. A result never refreshes poll presence or
capacity. Old rows remain readable, and every projection uses a strict whitelist.

The final enqueue check now requires a valid poll age from zero to less than
15,000 milliseconds after all asynchronous admission reads, before writing a job.
A stale explicit target fails without choosing another computer. Dashboard
projection occurs after all of its storage reads. Ordinary presence thresholds,
wire version 1, permissions, queue limits and cancellation behavior remain.

## Actual tests

| Run | Result |
| --- | --- |
| Independent unchanged-source observations | Seven executed observations, including a real agent rejecting a controlled poll response while gateway presence remains online. |
| Independent and ported freshness RED | Four tests: two expected failures and two passing controls. Each failure crosses 14,999 to 15,000 ms during an actual asynchronous job-list or active-lease read. |
| Observation RED before behavior change | 37 tests: 28 failures and nine passing controls. |
| Dashboard/whitelist RED | Two selected tests, both failed; no skipped cases counted as passing. |
| Corrected focused source | 54/54: forty readiness cases and all fourteen existing occupancy groups. Zero failures, cancellations, skips or TODOs. |
| Independent frozen source review | APPROVE; six related suites 118/118, original freshness regressions 4/4, five independent boundary cases 5/5. The four regressions overlap product tests. |
| Ordinary build | PASS, including roadmap, parity, capability, TypeScript and runtime-asset gates. |
| Complete ordinary check | FAIL: 1,516 tests; 1,477 pass, 27 Unix-socket `listen EPERM` failures, 12 existing Windows-only skips, no cancellations/TODOs. The earlier roadmap test passes. |
| Optional quick wrapper | FAIL: unchanged six-minute subprocess timeout before suite completion. Partial socket and roadmap failures retained; no complete count inferred. |
| Capability evidence-hash guard | Correctly failed `BASELINE_CHANGED`; explicit evidence-only reconciliation preserves the entire preceding metric object. |

The source tests cover never-polled and old records; explicit 0/1/4-slot and legacy
offers; offers consumed in the same reply; accepted success/error outcomes;
malformed, oversized, expired, mismatched, revoked and replayed result denials;
owner filtering and revocation; reconstruction using retained synthetic storage;
private sentinels; invalid/future timestamps; all presence boundaries; final
dashboard/admission clock reads; and explicit stale-target denial alongside a
fresh alternative. The actual served script runs in the existing minimal DOM
adapter with safe text-node assertions and exact admission/observation labels.

Raw TAP is preserved losslessly as base64 JSON with original length and SHA256.
The original independent harness imports its frozen historical source; it is
retained as evidence, not advertised as an executable installed test at this path.
Product tests use the current relative gateway imports.

## Review and limits

One writer owns implementation. The independent reviewer froze all four runtime/test
files and a 1,034-file snapshot before examining correctness. Receipt
`ca3209bd33a8bc99cd11fc447239947dacd2104bd6ec64557891bf04a939ef86`
approves that source and records the original regressions and additional persistence
boundaries. Root verified the four source hashes remain identical after local gates.
Immutable candidate binding, hosted qualification and actual-main qualification
remain separate required stages; none is inferred from focused tests.

The complete ordinary check retains all 27 actual socket failures. The optional
wrapper also had a roadmap failure that passed both alone and in the later complete
check. Those later passes do not establish its original cause. The wrapper timeout
and all underlying assertions remain unchanged. See `local-normal-check.json` and
the lossless full-log wrappers; no local complete-suite pass is claimed.

These tests use controlled clocks, serialized in-memory storage, synthetic
identities and a DOM adapter. They do not establish real Workers storage/recovery,
browser/accessibility, live two-device behavior, deployed throughput or complete
issue acceptance. The reconstruction check verifies use of persisted records in
the fixture, not Cloudflare crash durability. A failed observation write after
result completion may leave older/absent metadata; no new atomicity guarantee is
claimed. No agent version/update telemetry, executor health probe or new handshake
is added. Current Cloudflare references and their relevance are recorded separately.

All 300 original progress objects were compared. Only notes/evidence/reviewer
change on six selected rows. Acceptance texts, stages, weights, estimates, blockers,
platform credit and top-level progress metadata remain unchanged. CLI300, DCP48,
WEB12 and AUG117 denominators remain independent. No completion credit is awarded.

The independent local diagnostic confirms the wrapper timeout and leaves the
partial roadmap failure unattributed. The prepublication delivery review verifies
all original 300 rows, the evidence-only six-row delta, complete metric history,
lossless logs and producer-matched receipts. Both exact reports are retained here;
final immutable-candidate binding remains separate from these preparation reviews.
