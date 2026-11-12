# Readiness quick-check diagnostic

**Verdict: the wrapper timeout is confirmed; the historical roadmap subtest failure remains unattributed.** No source or assertion changes and no test executions were performed for this diagnostic.

| Retained run | Observed result | Roadmap case |
| --- | --- | --- |
| Optional quick wrapper | Six-minute `spawnSync` `ETIMEDOUT`; incomplete output, 28 failure markers, no suite summary | Failed at 7,088.775721 ms; no exception or assertion diagnostic retained |
| Isolated roadmap investigation | 1 passed; zero failures/skips/cancellations | Passed at 1,108.306316 ms |
| Completed direct normal check | 1,516 tests: 1,477 passed, 27 failed, 12 skipped, zero cancellations/TODOs | Passed at 630.781459 ms |

All 27 direct-check failure sections originate in `tests/isolation.test.mjs` and report `listen EPERM` for an owned temporary `engine.sock`. Their test names exactly match the quick wrapper’s 27 isolation failure markers. The roadmap case is its one additional retained failed marker. Both local complete-gate outcomes remain failed; later passing observations do not rewrite the earlier result.

## What the source proves

The wrapper sets `npm run check` to `6 * 60_000` ms and passes that budget to `spawnSync`; its recorded `ETIMEDOUT` matches this mechanism. The roadmap test has no explicit timeout and spawns no subprocess. Its successful path performs 18 separate review/render/check operations.

Each matrix inspection has its own default 3,000 ms cooperative deadline, checked around asynchronous filesystem operations. Expiry throws `MatrixError` with code `DEADLINE` and message `Evidence inspection deadline reached`. Roadmap review/render/check calls this inspector before checking stale review state, so that error could reject an expected-success operation or fail a `/stale/i` expectation. Fingerprint traversal itself has no elapsed-time deadline on this call path.

The retained quick log contains no assertion message, exception code, stack, or final failure section for this case. Its 7.09-second aggregate duration spans multiple independently budgeted operations and cannot identify which failed. Deadline expiry, filesystem/identity errors, ledger validation, generated-output comparison, and fixture setup/cleanup remain possible mechanisms. **Neither deadline expiry nor system load is established as the historical cause.** A separate source-only reviewer reached the same conclusion.

All six inspected roadmap/test/wrapper/package files are byte-identical to qualified main `da03dc5255976b1524b22796fffadb01e50a5149` and local HEAD `1de652e05405968f012d17119ade1e2c73b06ba5`. Exact source snapshots and all three original logs are retained beside the JSON receipt. No root-owned execution session was read, signaled, or otherwise controlled.

Upcoming hosted qualification is prepared for six fresh jobs, 1,516 Windows source passes / 1,504 plus the existing 12 skips elsewhere, and five package lanes retaining endpoint81/profile24/isolation31/provenance18. No candidate qualification is claimed before root supplies the exact remote identity.

JSON receipt SHA256: `62d81b3abcde8ccc4cf432c134d27517d3cd74035d29b2518fd117f745630808`.
