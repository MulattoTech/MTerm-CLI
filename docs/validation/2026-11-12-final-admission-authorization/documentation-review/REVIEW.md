# Admission documentation and evidence review

Provider/model: OpenAI / GPT-6 Astra Pro, self-reported. Date: 2026-11-12 UTC.

## Result

No unsupported behavioral or acceptance claim was found in the reviewed new documentation. The security boundary, refusal precedence, public projection, valid-decision persistence, and limits match the frozen runtime change and the producer review artifacts. No runtime or repository tests were re-executed.

One concrete publication risk was identified: the independent evidence manifest includes a nested generated protocol fixture that Git ignores. The implementation owner acknowledged this finding and will explicitly include the owned fixture, then check every manifest entry against the prepared Git tree before publication. No documentation wording or runtime change is requested.

This is a bounded read-only documentation/evidence review, not another security test run, an approval of hosted gates, or deployment acceptance.

## Identity and scope

Worktree: /workspace/scratch/267bdf8cab08/MTerm-CLI-Admission.
Observed HEAD: bbcd446207aa1147bf924d8d397570dc987ac308.
Observed HEAD tree: 62b35e966af7aaf8ea0b85e1db465a182369c640.

Frozen files match exactly:
- gateway/registry.mjs: 93e500ddfbcdd6d1d16e099692fff2252ebabe5fc7987a2127be2ae1a7cc87f7
- tests/remote-gateway.test.mjs: 5e74025e5ada1dae57336a9b93133d022f99335b032784532da8fedc40c21b24

Reviewed new changes in docs/SECURITY.md, docs/REMOTE_MCP.md, the leading docs/HANDOFF.md checkpoint, Cycle11 of the engineering run record, and docs/validation/2026-11-12-final-admission-authorization. The new AI change record and roadmap review were inspected for consistent scope and identity. Historical sections remain historical observations.

The review snapshot and a later complete-check evidence supplement are saved alongside this report as snapshot.json and complete-result-review.json.

## Claims checked

- The runtime retains the validated grant expiry internally, leaves the original token expiry intact, and compares both against the same final checkedAt after all admission awaits.
- Capacity, active-lease conflict, and offline refusal order remain ahead of the new expiry refusal. Denied admission creates no new job, active lease, or queued-read audit; prior rate bookkeeping and expired-row cleanup remain possible.
- Existing public access projection does not expose the internal expiry field. No target, scope, resource, owner/client, capability or grant/epoch authority is broadened.
- The correction applies to new job admission. Work validly admitted may finish persistence after expiry, and bearer expiry does not retroactively cancel previously admitted work.
- Source observations are not described as result-disclosure exploitation, live Workers/crash guarantees, deployed readiness, browser/device acceptance, or complete profile/authorization acceptance.
- CLI-290 is expressly reviewed with no stage change. Every tracked file under docs/roadmap, docs/parity and docs/capabilities matched the integrated HEAD byte-for-byte, except the expected docs/roadmap/review.json update. Its registry, gateway-test and SECURITY.md source hashes match the actual working files.
- The new documentation keeps the admission source delivery's candidate/main qualification pending and retains issue232 HOLD, the dirty owner checkout, working services and connector constraints.

## Producer artifact integrity

All 16 entries in independent-review/evidence-manifest.json exist locally, match their recorded SHA-256 values, and match the original producer files under /workspace/scratch/267bdf8cab08/admission-bypass-review exactly. The saved pre-patch investigation is byte-identical to its producer report. The three original RED/focused-GREEN/nearby-GREEN logs are also byte-identical to their scratch originals.

All five red-replay-inputs.json bindings match the isolated replay inputs, including exact final test SHA-256 and the original runtime identity. Saved result counts match the prose:
- Original RED: 28 total, 16 failed, 12 controls passed.
- Final-test-byte original-runtime replay: 28 total, 16 failed, 12 controls passed.
- Focused GREEN: 28 passed.
- Nearby integration: 138 passed.
- Independent boundary review: 65 passed.
- Independent repository gateway/admission review: 84 passed.
- Each reports zero cancellation, skip and TODO.

The original producer fixture remains a historical path-bound fixture; the copy is unchanged, and the review does not claim it can be run directly from the documentation directory without recreating its recorded source layout.

## Concrete finding: preserve the ignored manifest member

Path:
docs/validation/2026-11-12-final-admission-authorization/independent-review/baseline/dist/remote/protocol.js

Expected SHA-256:
83e0991bca35853a2560ab8fd837c50cdfb479c744ddcbaf7e641764d3f3ac14

At the reviewed snapshot, this file existed and matched both the producer and manifest, but git check-ignore reported it ignored. An ordinary add would omit it while publishing a manifest and fixture that depend on it.

Implementation owner response: explicitly add the owned validation bundle, including this fixture, and verify every manifest path/hash against the prepared Git tree before publication. This is the remaining mechanical publication check for this finding. Do not edit the original producer manifest merely to conceal omission.

## Complete ordinary check: later evidence inspected

While the review was in progress, the owner recorded the actual full-check outcome. I inspected its saved receipt and decompressed the archive without executing any test.

The archive decodes to exactly 758,988 bytes with SHA-256
6df851d33a523e892f6f6b19bfa164040400ee60e7f67d7ab52ffe644e0f9469.

Its compressed byte count and SHA-256 also match complete-check.json. The saved output reports 1,571 tests, 1,532 passed, 27 failed, 12 skipped, and zero cancellation/TODO. All 27 final failure blocks are located in tests/isolation.test.mjs and contain listen EPERM; that test file is byte-identical to the integrated HEAD.

The updated handoff, validation README and appended Cycle11 result faithfully describe a failed local check and retain hosted qualification as a separate gate. No local full-suite or installed-gateway PASS is claimed. Earlier in-progress text in the run record is superseded by the later result entry.

## Limits and next responsibility

The original normal build observation is recorded by the implementation owner; this reviewer did not rerun build or inspect live GitHub jobs. Live job metadata, final candidate/source identity, expected-head merge, actual-main gates and final status updates remain with the owner. The dated source/security claims are supported; remaining work is qualification and the specific prepared-tree evidence-presence check above.

