# Normal npm prepack compiles before testing

Session `MTERM-WEB-20261109T031131Z-e0efd5d4`; OpenAI / GPT-6 Astra Pro (self-reported).
Source base: `7abac1f22e03ed4242734bfd1c7966c9b01021e2`, reviewed PR #213. Its normal merge `0c201abec09c4680607e864422e2c4555833607e` has the same tree `4b34dbafc0c457174dd54b1db8440b5119838aa1`; the integration dependency is resolved.
Issue: [DCP-001 #3](https://github.com/MulattoTech/MTerm-CLI/issues/3), related #8.

## Reproduced defect and change

The previous `prepack` script ran `npm run check` before `npm run build:code`. Tests import compiled files. A clean fixture therefore failed on missing output; stale passing output could pass tests before failing new source was compiled and packed. Stale failing output could also block corrected source. The November 7 [historical qualification](2026-11-07-aug013-qualification.json) already retained 120 missing-dist failures; its caller-order workaround did not change the product lifecycle. That receipt is preserved.

`prepack` now runs `npm run build && npm run check`. The existing reviewed build enforces source/parity freshness before compilation. The complete check then tests newly compiled output. Failure still stops packing. No dependency/lock or runtime implementation changes are involved; the package's embedded package.json changes as intended.

## Actual regression evidence

- Final fixture against the unchanged lifecycle: **6 tests, 2 passed / 4 failed**, exit1, no skips/cancellations. This includes a real npm pack that incorrectly succeeded for stale passing output followed by failing source. [RED log](2026-11-09-prepack-order-red.tap).
- Corrected lifecycle plus npm resolver: **8/8 passed**, no skips/cancellations, Node v24.22.1 Linux x64. [GREEN log](2026-11-09-prepack-order-green.tap).
- Independent source/test review found no material issue and separately ran **6/6 lifecycle cases**, no skips/cancellations, with a clean diff check.

Six cases cover clean build/pack/install, stale-pass/new-fail refusal, stale-fail/new-pass recovery, post-build format failure, stale roadmap refusal and parity refusal. Failed cases produce no tarball in either the owned destination or fixture package root. Positive cases verify identical source/build/test SHA-256 and generation, perform real offline npm installation into a separate temporary prefix, compare installed bytes and import the installed module.

Fixture SHA-256: `7832d3e6090bba86e5340c0d4e494fc7e6b9ab7d3c5f0fcfe695b95f0737e3e2`.
Reviewed package.json SHA-256: `a8cbea0bff3999a7b406ff8789123069c7ac40cc8c52e6e8e46479a965e23e57`.

## Scope and limits

These are real npm lifecycle/archive/install tests using exact project prepack/build/check orchestration strings and **deterministic fixture compiler/check leaves**. They do not recursively pack the real repository or claim to test TypeScript itself. Normal actual-project build/check and installed MCP/platform qualification remain mandatory, and the existing package verifier's intentional ignore-scripts packing is not relabeled as normal-prepack execution.

All package, output, install, npm config/cache/prefix directories are temporary and owned. The child environment retains necessary OS execution fields only, explicitly selects the current Node distribution, excludes inherited npm/Node injection settings and uses offline operation. No user npm settings, global installation, registry publication, model call or production deployment occurs.

CLI-178/214/260/262 receive scoped evidence only. All 300 stages, scope, weights, estimates and acceptance text are retained. Full DCP-001/#3 and cross-platform distribution acceptance stay open. No dependency or upstream implementation/license is added. The existing cloud Unix-socket EPERM limitation remains recorded; it does not waive any hosted gate. Committed TAP display trims only trailing whitespace; original raw RED hash is in the change record.
