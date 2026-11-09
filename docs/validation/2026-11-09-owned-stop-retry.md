# Owned process stop recovery — development evidence

Session: MTERM-WEB-20261109T031131Z-e0efd5d4. Base: `fcfd221b7896c1307fd17b5881a1cb2df20d3248`.
Provider/model: OpenAI / GPT-6 Astra Pro (self-reported). Runtime: Node v24.22.1, Linux x64.
Scope: [AUG-050 #131](https://github.com/MulattoTech/MTerm-CLI/issues/131), related DCP stop issue #40.

## Defect and correction

`ProcessService.stop()` retained a rejected termination promise permanently. A later explicit stop could only replay the old failure, even after the child actually closed. Host shutdown could likewise never retry that owned cleanup.

The service now retains only a pending attempt. Its waiters clear that specific attempt after settlement; an older waiter cannot clear a newer attempt. In-flight calls still coalesce. Errors remain visible, and only observed process closure releases capacity. This adds no automatic retries, new execution permission, or process restart.

## Reproduction and verification

The final five-case fixture SHA-256 is `2b1032f375e4eb4a8061e73b85679adbe6f588d4b0cad607492fae47bdf9905a`. The unchanged fixture was run against `src/`, `tsconfig.json` and `package.json` archived from the exact base commit and compiled into an isolated baseline directory: **0 passed / 5 failed**, exit 1. See [2026-11-09-owned-stop-retry-red.tap](2026-11-09-owned-stop-retry-red.tap).

After the source correction, the five new cases plus the existing process and resource-budget suites passed **41/41**, with zero failures, skips or cancellations. See [2026-11-09-owned-stop-retry-green.tap](2026-11-09-owned-stop-retry-green.tap).

The cases exercise explicit retry without early slot release, concurrent callers sharing failure/recovery, unrelated owned-job preservation, late actual closure without another signal, shutdown after a failed stop, and retry after a failed shutdown. The first termination-helper failure is deliberately injected; successful termination and child closure use real fixture processes. This does not claim a reproduced kernel failure or detached-descendant containment.

The installed verifier reruns these same five cases from outside the checkout using byte-bound installed process modules, records the fixture/log hashes, and rejects failures, skips and cancellations. Its result and exact-head hosted platform checks are subsequent qualification observations, not asserted by this development report.

## Review and acceptance

The parent session owns implementation and serialized metadata; an independent agent reviews source/tests. Standing owner authorization covers normal delivery after required gates. Production bridge/runtime/OAuth remain separate. No external code, dependencies, licenses or model-consuming workers were added.

CLI-280, CLI-281, CLI-287 and CLI-288 retain all existing stages, weights, acceptance, estimates and limitations. Broad AUG/DCP/WEB acceptance receives no credit. Next: complete independent review and exact committed qualification, then expected-head merge and main verification.

## Subsequent cloud qualification observation

The normal reviewed build, roadmap/parity checks, TypeScript and formatting passed. The full cloud `npm run check` failed: **554 tests, 515 passed, 27 failed, 12 existing platform skips, zero cancelled**. All 27 failures report `listen EPERM` while binding temporary Unix socket fixtures in `tests/isolation.test.mjs`. This is retained as a failed local run, not relabeled PASS. No test or assertion was weakened. Existing hosted Windows/macOS/Linux/installed/native-isolation gates remain required at the final committed head.

Independent read-only review found no material issue in the three changed code/test files and independently ran the five recovery cases successfully. This peer review is recorded in the change JSON and is not a GitHub platform approval event.
