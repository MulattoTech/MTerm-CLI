# Staging smoke source-identity guard — 2026-11-09

Issue: [#226](https://github.com/MulattoTech/MTerm-CLI/issues/226). Worker session: `MTERM-WEB-20261109T131339Z-resume-a9287b3c`. Claim: `coord/mterm/issue-226`, [comment 6741797972](https://github.com/MulattoTech/MTerm-CLI/issues/226#issuecomment-6741797972). Base: `4f9a1aa286c7832497e375009961d583d829e9da`. Branch: `fix/issue-226-staging-build-guard-20261109`.

This is local source-level regression evidence for CLI-299 and WEB-008/WEB-012. It does not establish Windows, DPAPI, real SDK, Cloudflare, owner, OAuth, browser, connector, packaging, or deployment acceptance. The worker changed only the staging verification script, its new fixture, and these two unique evidence records. Shared documentation, roadmap evidence, integration, publication, and hosted gates belong to the integrator.

## Failure and bounded correction

The prior harness accepted a loosely formatted public `/health` build or recorded `unverified`. It never required the intended revision and did not inspect the authenticated registry dashboard's build. A successful smoke run could therefore describe an old or partially adopted deployment.

The harness now requires the explicit, nonsecret `MTERM_STAGING_EXPECTED_SOURCE_COMMIT` environment value. It must be exactly 40 lowercase hexadecimal characters. There is no trimming, abbreviation, uppercase normalization, automatic Git lookup, remote inference, or default. Missing or empty values fail with `EXPECTED_SOURCE_COMMIT_REQUIRED`; other malformed values fail with `EXPECTED_SOURCE_COMMIT_INVALID`. Validation precedes `INPUT_REQUIRED`, the stdin reader, outbound requests, and fixture effects. A sanitized failure receipt may still be written.

The existing Windows invocation remains `node scripts/verify-remote-staging.mjs`, after a build. Before that invocation, the operator must explicitly set the environment value to the already qualified intended source commit. The script still accepts no command-line options. Access credentials remain a single JSON line on stdin; they are not placed in the expected-build variable, command arguments, reports, or plaintext credential files.

The initial public health observation must match the expected commit and still report enabled staging. The authenticated dashboard observation must match the same commit after the existing authenticated `staging-service` and empty device/grant checks. Only after all those checks does `syntheticIdentityVerified` become true. A mismatching registry does not enable `revoke-all` cleanup and cannot reach OAuth registration, grants, pairing, local fixture creation, or agent startup.

After an otherwise successful run, the final identity check occurs after owned remote cleanup, agent termination, state-lock release, SDK closure, and local fixture removal. It re-reads public health and the authenticated dashboard, requires both expected source labels, and revalidates enabled staging and the authenticated service identity. These reads use the existing fixed-origin request function with its 30-second per-request timeout, after the run's lifetime signal has been aborted. They do not retry or wait for version adoption. A failed final read or identity check changes the result to failed before credentials are discarded and before the success receipt can be written. Failed cleanup skips success-only identity probes and remains failed.

The receipt retains `report.build` as the validated initial edge label and adds `buildIdentity.expectedSourceCommit`, `buildIdentity.initial`, and `buildIdentity.final`. A canonical but unexpected source label is recorded in its edge/registry phase before rejection. Missing or malformed remote values are recorded as `null` with a sanitized failure code; arbitrary remote strings and objects are not copied into reports. An unobserved phase member is absent.

These are observations of source labels returned by two responses. They are not independent hashes of deployed bytes, an atomic edge/registry observation, or a guarantee that versions stayed constant throughout the run or after the last response. This guard does not deploy, wait for convergence, change a binding or policy, create credentials, replace owner enrollment, or qualify the separate owner bridge.

## Regression method

`tests/staging-build-identity.test.mjs` evaluates the actual, untransformed harness source using Node VM modules in bounded child processes. Every imported module is explicitly provided. Fetch is a controlled responder with fixed destination, TLS URL, redirect, Access-header, bearer-header, and dashboard POST-origin assertions. Stdin, filesystem, Windows platform, SDK client, DPAPI store, and agents are simulated. Files and generated smoke receipts remain in a virtual filesystem; no staging request, real credential input, owner operation, actual agent, or host fixture is used.

The inherited harness metadata can say `realWindowsReadViaDeployedGatewayAndSdk` inside a simulated receipt. Those virtual receipts are not saved as acceptance artifacts or treated as real-runtime evidence. The test harness tests orchestration, fail-closed decisions, request ordering, sanitization, and cleanup boundaries. Existing real SDK/DPAPI functionality is outside its proof.

The VM's paths and `fileURLToPath` use one consistent virtual POSIX model on every host; actual source reads and child executable paths remain native. Independent pre-freeze review identified the original fixture's host-dependent path model. That fixture was corrected before the final freeze, then the final fixture was rerun against the original source. No source seam, baseline extraction, missing module, or setup failure is counted as RED.

| Cases | Count | Coverage |
| --- | ---: | --- |
| Original matching control | 1 | All 11 original simulated smoke checks and owned cleanup complete |
| Expected input | 10 | Missing, empty, short, long, uppercase, whitespace, final newline, and untrusted input fail before stdin/network/effects |
| Initial remote labels | 16 | Each surface rejects missing, null, object, abbreviated, uppercase, newline, arbitrary text, or different canonical commit |
| Partial adoption | 2 | A matching edge cannot excuse a stale registry; a matching registry cannot excuse a stale edge |
| Final remote observations | 10 | Missing, malformed, or different labels introduced during local cleanup, HTTP failures, and transport failures prevent success without retries |
| Matching final observations | 1 | All four labels and the expected commit are recorded; final requests follow all cleanup and precede the receipt |
| Existing guards | 10 | No argv options, Windows runtime, TLS, SDK version, enabled staging, service authentication, and initially empty devices/grants |
| Final identity | 2 | Matching source label cannot excuse a missing authenticated flag or a human identity |
| Cleanup failures | 2 | Remote and local cleanup failure remain failed and skip success-only probes |
| Total | 54 | Local controlled execution only |

## Actual RED and GREEN

The first RED was recorded before any source edits, on the actual unchanged checkout source. It ran 54 cases with 13 passing and 41 expected failures, exit 1, no cancellation/skips/todos, and empty stderr. Its fixture hash was `7cb5a56408b06ae26be0036d8025c7ae66994076eba1920b2b353e8dfa9d6dcc`; TAP hash was `555cca6668bf30202cf37b7d22212f9487f7d169e49947e3e8bf1bc3f97555a9`. The 13 passing controls included a complete original simulated flow, ten existing guards, and two cleanup failures. The failures exposed ignored expected input, absent initial identity enforcement, and absent final checks, rather than import or fixture setup failures.

After the path portability correction, the final frozen fixture was copied alongside a byte-identical `git show 4f9a1aa286c7832497e375009961d583d829e9da:scripts/verify-remote-staging.mjs` baseline in ignored artifacts. That exact original source and final fixture reproduced 13 passing / 41 expected failing cases. The final fixed source then passed all 54 cases. Both executions bound source and fixture hashes before and after; neither changed during its run.

Exact command in each recorded working directory:

```text
node --test --test-reporter=tap tests/staging-build-identity.test.mjs
```

| Execution | Working directory relative to this clone | Result | UTC start |
| --- | --- | --- | --- |
| Final-fixture RED | `artifacts/issue-226-staging-build-identity/baseline` | 54 total; 13 pass, 41 expected failures; exit 1 | 2026-11-09T14:07:15.117438Z |
| Final-fixture GREEN | Clone root | 54/54 pass; exit 0 | 2026-11-09T14:07:20.264122Z |

Both executions used Node v24.22.1 on Linux x64, with zero cancelled, skipped, or todo cases and empty stderr. RED took 5.133 seconds and GREEN 5.336 seconds. This is not a Windows execution claim.

| Bound item | SHA-256 |
| --- | --- |
| Original harness | `73b2a600f0281c4e35f08814f81b9c743758cf83f645b4e7483cddca252ca54d` |
| Final harness | `208ac5b3296ae8c55986db8e947ec92c7bd678f0c045cf37014b2910ec7c811e` |
| Final fixture | `3edf79c400441917280d79d7363ec659db23bbfc3e52e7ac948f5e98b1993b73` |
| Final-fixture RED TAP | `8f35d924729714b24dff56c86fd3dcb8aaecfd084b543395f9f83dd330130bd5` |
| Final-fixture RED receipt | `7e49cbe686532267814348c8278bb7a0099285323bdda5e120c74977cf43fc5a` |
| Final-fixture GREEN TAP | `c108ebb6a64fcc4242cb822c61a0ec436aefcb99457800b30d28044966e709ad` |
| Final-fixture GREEN receipt | `a8605ba0cb91cd273296d222c8ecb2bb33b5c8f5baa53ba8725dd3ad4fbbc2da` |
| Focused syntax/format/diff receipt | `2c8fd1d1d5bac0f658db0adae90cffa56277b9c65d099d83bce09b1ac58d1c78` |

Raw worker logs are in ignored `artifacts/issue-226-staging-build-identity/`: `red.tap`, `red-receipt.json`, `red-final-fixture.tap`, `red-final-fixture-receipt.json`, `green-final-fixture.tap`, `green-final-fixture-receipt.json`, and `focused-checks.json`. Empty stderr files accompany each recorded regression execution. Committed records preserve the counts, exact commands, limitations, and hash bindings; evidence publication was handed to the integrator; published transcripts are recorded below.

## Other bounded checks and review

`npm ci --ignore-scripts --no-audit --no-fund` and `npm run build:code` both exited 0 using this isolated clone's dependencies. Both emitted the existing npm warning about unknown `http-proxy` environment configuration. No dependency manifest or lockfile changed. `node --check` for each changed executable file, Prettier check for those two files, and `git diff --check` all exited 0.

Independent review by `/root/policy_and_candidate_review` is **CLEAR**, with no remaining material findings. The reviewer ran the frozen 54-case suite once: 54/54 passed, exit 0, no failed/cancelled/skipped/todo cases, and empty stderr on Node v24.22.1 Linux x64. The final source and fixture hashes above were unchanged before and after. The reviewer also verified that the final baseline copy matches the named Git source and that all 41 RED failures were assertion failures. The inspected path portability defect was resolved; actual Windows execution remains a hosted-gate responsibility.

The implementation worker read and hash-verified the independent receipt and TAP at `artifacts/issue-226-independent-review/peer-policy-f7m4okas/`. `receipt.json` SHA-256: `e67ce5c67a0b02deb2836f29e8fd63be35226ac1242b980aaf9d264975ba5aff`. `tests.tap` SHA-256: `f4222951bccf21c171eb00f019774df9c40f4a671d1f4c6006238cd79fb909e9`. Review and this one independent execution remain source-level simulated-harness evidence, with no live or Windows acceptance.

No roadmap stage, score, protected metadata, seed row, owner state, Worker, deployment, binding, policy, grant, credential, or production bridge was changed. No push, PR, merge, deployment, full repository/platform/native package qualification, or paid/model-consuming operation was performed by this worker. The integrator must serialize shared evidence with the other reviewed fixes, run normal and hosted gates on the combined exact revision, and keep any later staging qualification distinct from this local result.

## Root serialized integration — 2026-11-09 UTC

Root applied worker commit `132c1ca209421d8135c2fbfb19a8cb6ae8c0888e` after PR227
at base `fd47dea59e6cfba12995d453392216593a52237b`. Source and final fixture
retain the exact independently reviewed hashes above. A separate integrated
execution passed **54/54**, exit0, empty stderr, no skips/cancellations/TODOs,
Node24.22.1 Linuxx64, with both before/after bindings unchanged. Raw integrated
TAP SHA256 `adf6e49686e0217f121dbdb04097c0e931ff93aa7d692dad4e8456dc057ad649`; receipt
`0bde2bac9b0148cf51b6118bc924992118bb7d48487b92cb6931ea4825378221`.

Committed [final-fixture RED](2026-11-09-staging-build-identity-red.tap), SHA256
`903545106bb9df30dc072ece67b5b66c4ccca39800f7bc78961fe063ff895824`, and
[integrated GREEN](2026-11-09-staging-build-identity-green.tap), SHA256
`adf6e49686e0217f121dbdb04097c0e931ff93aa7d692dad4e8456dc057ad649`, remove only
trailing whitespace. They remain source-level simulated-harness evidence; no
virtual receipt is promoted to real Windows, SDK, DPAPI or live acceptance.

Root appends CLI299 notes/evidence and dated WEB008/012 paragraphs while preserving
all protected fields and history. README, remote operator guide, deployment guide,
SECURITY and HANDOFF document the required nonsecret environment value and source
label limits. The original historical eleven-check live reports remain untouched;
new successful executions additionally require final_staging_build_identity.
The guarded script does not create its own service identity or change a deployment.
Normal reviewed local gates passed as recorded below. Independent shared-document
review is clear; candidate hosted gates and separate actual-main qualification
remain pending at this checkpoint.

Explicit roadmap review/render, normal build (roadmap/parity/TypeScript),
typecheck, complete source formatting and whitespace checks all passed with exit0.
Source fingerprint `07374845b2c1dcc8a944e30be9c54a2a57d2eccb52029021f8e7886f07a2bcdb`.
All300 requirements remain at29.36% maturity,0complete45blocked126notStarted;
DCP0/48 andWEB0/12 remain unchanged. The existing unknown npm `http-proxy`
environment warning is retained. These local gates do not substitute for full
hosted/platform/package/native qualification or a real staging smoke.
