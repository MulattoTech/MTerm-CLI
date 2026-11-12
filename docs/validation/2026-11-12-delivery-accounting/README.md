# Delivery accounting validation — November 12, 2026

Base: `6a6a883f3ce1cd86a7405d2c53a1fb08cd1210c2`. This development-only change
binds partial source deliveries to their owning repository and captured candidate/main
workflow identities. It does not change shipped runtime code or service authorization.

## Reproduced failures and corrected scope

- `repository-contract-red.tap`: 11 cases, 8 controls passed and 3 regressions failed
  before repository contracts, links and layer ownership were corrected.
- `identity-binding-red.tap`: 3 selected cases failed before captured raw identity and
  saved-package claim binding were added.
- `package-manifest-red.tap`: the manifest substitution case failed before exact
  file-path/hash/size readback binding was added.
- `reviewer-boundaries-red.tap`: all 7 independent boundary regressions failed before
  duplicate counts, paired omissions, physical identity reuse, API URL contradictions
  and impossible observation chronology were rejected.
- `focused.tap`: the corrected delivery/register suites pass46/46 with no skips,
  cancellations or failures. The ordinary full check will exercise the same suites.

Original failures remain failures and have not been rewritten as passing runs.
The tests use synthetic mutations of retained evidence; no test grants deployment
or product acceptance. Raw source evidence and offline consistency checks do not
constitute cryptographic or live behavioral attestation. Independent review verifies
the actual source, GitHub observations and narrow row mappings.

## Baselines and scope

The register reconciles9 qualified deliveries,40 distinct component-linked rows
and1 separately verified saved plugin package. Whole requirement axes remain0 at
this source checkpoint. The original CLI300 seed, progress rows, frozen weights,
DCP48, WEB12 and AUG117 are byte-identical to base. MTR-METRIC-01's four criteria
clarify its existing issue255 contract; the original generic criterion is retained.

Normal build/check, exact candidate hosted checks, independent immutable-tree review,
expected-head merge and actual-main qualification remain required. Local check
results and remote qualifications are recorded separately as they complete.

## Completed ordinary checks and independent review

Normal `npm run build` passed. The ordinary `npm run check` failed with1,543 tests:
1,504 pass,27 unchanged `tests/isolation.test.mjs` `listen EPERM` failures and12
existing Windows-only skips; no cancellation/TODO. Roadmap, parity, capabilities,
typecheck and formatting passed. [complete-check.json](complete-check.json) binds
the entire756,905-byte output and [lossless archive](check.log.gz); the failing test
file is byte-identical to base. No assertion, gate or timeout was relaxed.

[Independent adversarial review](independent-review.json) approves the frozen code,
with46/46 focused tests and all14 probes rejected. The separate
[criterion review](criterion-review/receipt.json) approves the four existing issue255
criteria and verifies all43 evidence inputs and protected baselines. Its producer
artifact names and hashes are retained. Hosted exact-candidate checks, immutable
tree binding, normal merge and actual-main qualification remain the delivery gates.
