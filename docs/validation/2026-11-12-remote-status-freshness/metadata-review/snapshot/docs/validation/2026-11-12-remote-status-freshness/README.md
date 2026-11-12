# Local remote-status freshness correction

The original source treated every runtime age below 45 seconds as recent,
including negative ages. Future-dated local runtime observations could therefore
produce `observedStatus: online`. This is a local observation classification
defect; no network, process-liveness or authorization bypass is established.

The status command now requires a finite age in the interval 0 <= age < 45000ms.
Recent/current, expiry-boundary, stale, missing and invalid observations retain
their expected behavior. Valid saved observations remain visible unchanged,
`networkChecked` stays false, and status does not modify state or contact/operate
on a process. No clock-skew tolerance or liveness guarantee is introduced.

## Executed source checks

- Original exact-test RED: 11 cases, 3 future-date failures and 8 passing controls;
  zero skipped/cancelled/TODO. [Original log](red.tap) is preserved unchanged.
- Corrected [focused tests](focused-green.tap): 11/11 pass.
- Nearby profile/state/state-lock/run-lock integration: [80/80 pass](nearby-green.tap).
- The installed-package profile suite automatically includes all 11 new cases.
  Its minimum required count increases from 24 to 35, while failure, skip,
  cancellation and TODO counts must remain zero. Actual package/hosted outcomes
  remain separate qualification gates.

Fixtures use owned temporary state, a controlled clock and network/process guards.
They verify unchanged state bytes, exact profile selection, sentinel exclusion and
retention of bounded saved observations. Development compilation and the normal gated build passed. A fresh independent
review found no defects in22 additional adversarial cases; its exact files,
[report](independent-review/review.md) and manifest are retained unchanged. No live service or credential changed.

## Complete ordinary local check

The normal full check completed 1,582 tests:1,543 passed,27 unchanged isolation
`listen EPERM` failures,12 existing Windows-only skips and no cancellations/TODOs.
All pre-test roadmap/parity/capability/typecheck/format gates passed. The entire
759,224-byte failed output is preserved in [check.log.gz](check.log.gz), with
raw/archive hashes in [complete-check.json](complete-check.json). All27 final
failure blocks identify the unchanged isolation suite. This is a failed local
check; hosted candidate, installed-package/platform and actual-main qualification
remain separate required gates. No source, assertion or timeout was relaxed.

## Original-source investigation and integration identity

The separate [original-source investigation](independent-investigation/REPORT.md)
reproduced three future-time false observations and eight controls through the
actual public command. PID and run-lock fixtures do not establish freshness or
process liveness; its guards observed no network/process/credential operations.
Its source/compiled identities and original observations are preserved unchanged.

The publication base is normal admission merge
`b2b62156bde7d75b2a36b0af0fd677ef1ad514dd`, whose tree equals tested candidate
`55ac8b1f35f657b079c191292219b0ae576d7164`. The normal fast-forward preserves all
three reviewed source hashes and the original test-base observation. Parent
actual-main checks remain required before this source change merges.
