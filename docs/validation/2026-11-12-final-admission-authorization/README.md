# Final new-job authorization expiry — November 12, 2026

## Finding and boundary

On original source `6a6a883f3ce1cd86a7405d2c53a1fb08cd1210c2`, `access()` correctly
validated client-token and grant lifetimes before returning. `enqueue` then awaited
rate, device, job-list, RPC-ID digest and active-lease work. A lifetime could expire
during those awaits while the request still created a new job, active lease and
allow-read/queued audit. Token-expired work could subsequently be delivered while
its grant remained valid; an expired grant was rejected later at delivery. Expired
bearer result retrieval was rejected. No result-disclosure bypass was established.

The shared correction retains the already-validated grant expiry in the internal
authorization snapshot. After the last admission await it compares both lifetimes
to the same fresh time used for lease and device checks, before the first job write.
The original token expiry keeps its meaning, and public projections remain explicit.

Existing capacity, duplicate-RPC and offline refusal precedence is preserved.
Otherwise-admissible expiry returns401 invalid_token and the public Bearer challenge,
with no new job/lease/queued-read audit. Rate accounting and expired-row cleanup may
still happen. A decision made while valid may finish persistence after expiry;
previously admitted work retains its existing grant/deadline/cancellation checks.

## Executed verification

- Node syntax checks pass for the runtime and test modules.
- [RED](red.tap):28 new cases on original source;16 fail and12 legitimate/precedence
  controls pass, with no skips/cancellations/TODOs.
- [Focused GREEN](focused-green.tap):28/28 pass on the correction.
- [Nearest integration suites](nearby-green.tap):138/138 pass across remote-gateway,
  remote-device-readiness, remote-admission and remote-occupancy.

The new tests exercise token-first and grant-first expiry, equality/after refusal
and one-millisecond-before controls, actual job-list/digest/lease awaits, public
MCP side effects, independent live-client recovery, refusal precedence and expiry
after the first valid admission write. Actual local OAuth registration, consent,
PKCE, token issuance and device pairing use synthetic identities and serialized
memory storage. External fetch is guarded. The original failing run is retained.

A fresh read-only investigator independently traced the shared boundary before
implementation. A separate fresh reviewer found no surviving bypass or regression:65 independent
boundary cases and84 complete gateway/admission cases passed. The
[independent review](independent-review/REVIEW.md) retains its exact source hashes,
fixtures and executed results. Normal build passed; the complete local check failed as recorded below. Exact
hosted candidate gates, expected-head merge and actual-main qualification remain required. Runtime deployment, real Durable
Object storage, owner browser/device behavior and whole-feature acceptance remain
separate. No production state or credential is changed by these fixtures.

## Final regression identity replay

The initial RED execution preceded formatting. To remove any ambiguity about the
final test bytes, [the unchanged final tests](red-replay-inputs.json) were replayed
against the original6a6a883f runtime in an isolated directory. The
[replay](red-replay-final-tests.tap) again produced16 failures and12 passing controls.
The exact same gateway-test SHA-256 is used by the corrected GREEN and independent
review. The initial RED log remains preserved separately.

## Complete ordinary integration result

Normal build passed after integrating the reviewed accounting candidate. The full
ordinary check completed 1,571 tests: 1,532 passed, 27 failed and 12 existing
Windows-only cases skipped, with no cancellations or TODOs. Every failure is an
unchanged `tests/isolation.test.mjs` Unix-domain-socket fixture with `listen EPERM`.
Roadmap, parity, capability outputs, type checking and formatting passed.
[complete-check.json](complete-check.json) binds the entire 758,988-byte failed
output and its [lossless archive](check.log.gz). This remains a failed local check;
no assertion, workflow or timeout was weakened. Hosted candidate and actual-main
qualification are separate gates.

## Documentation and publication review

The independent [documentation review](documentation-review/REVIEW.md) found no
unsupported behavior or acceptance claims and recomputed the complete failed-check
archive. Its snapshot and producer manifest are retained unchanged. It identified
an ignored nested protocol fixture in the independent evidence bundle; all owned
validation artifacts are explicitly staged, and every validation-manifest member
is checked against the prepared Git tree before publication.

The integration base is the normal accounting merge
`d430ec5e0d7dcefc041df4ab5f80cb32382c5ac3`, whose tree equals the tested accounting
candidate `bbcd446207aa1147bf924d8d397570dc987ac308`. The recorded full-check base
remains the original tested candidate. This metadata update does not alter the
reviewed gateway or regression-test bytes.
