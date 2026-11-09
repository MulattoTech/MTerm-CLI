# OAuth access-token expiry at authorization settlement — 2026-11-09

Session `MTERM-WEB-20261109T131339Z-resume-a9287b3c`, OpenAI / GPT-6 Astra Pro
(self-reported), ChatGPT Web. Bounded defect [#224](https://github.com/MulattoTech/MTerm-CLI/issues/224)
extends broad capability [#55 / WEB-002](https://github.com/MulattoTech/MTerm-CLI/issues/55).
The root owns the atomic `coord/mterm/issue-224` claim
([receipt](https://github.com/MulattoTech/MTerm-CLI/issues/224#issuecomment-6741408032)).
One delegated implementation writer used the ordinary clone
`/workspace/scratch/a9287b3cfe09/mterm-oauth-expiry`, branch
`fix/issue-224-oauth-expiry-20261109`, at exact reviewed base
`3d32c0e53b0444c2b012b15432928f6feeda053f`.

## Defect and bounded correction

`MTermRegistry.access()` validated a client OAuth access token's expiry before
awaiting its account epoch and grant records. If the token expired during either
read, the final grant check could still succeed and return an authenticated token.
An independent original-source probe reproduced public MCP ping authorization
with a real locally issued fixture token: valid immediately before expiry,
incorrectly HTTP200 after crossing expiry during the grant read, and HTTP401 for
a fresh request entering with the same token already expired. The expected-denial
assertion failed. This establishes stale token authorization, not file-result
disclosure or a deployed exploit.

The correction captures one fresh `checkedAt` after the existing authorization
reads. Both the token and grant must have expiry greater than that same decision
time. The initial token check remains, so an already-expired token still fails
before account/grant reads. The final check retains the existing grant revocation,
owner and client conditions; the prior token kind, resource, scope and epoch rules
also remain. No await follows the final check before returning the authenticated
record, and failures retain HTTP401 `invalid_token`.

This is separate from PR218's agent dispatch/result grant checks and the concurrent
issue54 Cloudflare Access JWT fix. It changes only the OAuth client-token helper;
no refresh policy, token duration, account grant or deployment configuration changes.

## Original-source RED and focused GREEN

All ten additive fixtures were written and formatted before editing registry
source. They reuse the existing actual public gateway fixture, including RSA-signed
Access JWTs, certificate lookup, OAuth registration/consent, PKCE, token issuance,
and serialized in-memory registry storage. The helper shortens only owned fixture
lifetimes, controls the clock, and changes it after the actual selected storage
read settles. Read counters prove the intended token, epoch and grant paths were
visited. Test-context mocks restore the clock and storage wrappers; external fetch
is guarded and asserted unused. No alarm sweep is required.

The 38 existing gateway cases remain unchanged. The ten new cases cover:

| Case | Original source | Corrected source |
| --- | --- | --- |
| Token remains valid 1 ms before expiry after epoch read | HTTP200 | HTTP200 |
| Token reaches exact expiry during epoch read | HTTP200, assertion failure | HTTP401 |
| Token is 1 ms past expiry after epoch read | HTTP200, assertion failure | HTTP401 |
| Grant expires during epoch read while token remains valid | HTTP401 | HTTP401 |
| Token remains valid 1 ms before expiry after grant read | HTTP200 | HTTP200 |
| Token reaches exact expiry during grant read | HTTP200, assertion failure | HTTP401 |
| Token is 1 ms past expiry after grant read | HTTP200, assertion failure | HTTP401 |
| Grant expires during grant read while token remains valid | HTTP401 | HTTP401 |
| Token already expired on entry | HTTP401; zero epoch/grant reads | Same |
| Another independently issued client token remains live | Expired token HTTP401; other client HTTP200 | Same |

Runtime: Node **v24.22.1**, Linux x64. Each listed test execution ran once.

| Execution | Actual result |
| --- | --- |
| Frozen 48-case gateway fixture on unchanged registry | **44 passed / 4 failed**, exit1; all four failures `ERR_ASSERTION`; zero skipped/cancelled/TODO |
| Corrected gateway plus existing admission and agent fixtures | **60/60 passed**, exit0; zero failed/skipped/cancelled/TODO |
| Independent frozen gateway execution | **48/48 passed**, exit0; zero failed/skipped/cancelled/TODO; six bindings unchanged |
| Dependency preparation | `npm ci --ignore-scripts --no-audit --no-fund` passed |
| Development compilation | `npm run build:code` passed before RED; no TypeScript source changed |
| Source checks | `npm run typecheck`, full `npm run format:check`, `npm run parity:check`, and `git diff --check` passed |

Commands:

```sh
node --test --test-reporter=tap --test-concurrency=1 tests/remote-gateway.test.mjs
node --test --test-reporter=tap --test-concurrency=1 tests/remote-gateway.test.mjs tests/remote-admission.test.mjs tests/remote-agent.test.mjs
```

The final unchanged fixture SHA-256 is
`dfbb1bc65c6c33c00b9acccd0d481ba0052e433ec324dd38bc616fa4f77094b1`.
Original registry SHA-256 is
`53706971f99d6f71d1e5a5db6fc87c739a90aca7c05146412820ff8a4285e472`;
corrected registry SHA-256 is
`a849f4a1b7881fd8198e7f97f7b6ad3da5bea7fd4a7492801f3a7f9d774a872d`.
Six inputs stayed unchanged across RED and ten across GREEN. The change record
retains the complete input bindings and UTC execution windows. Both test executions
had empty stderr.

Raw TAP and JSON receipts are retained in the worker's ignored
`artifacts/issue-224-oauth-expiry/` checkpoint. RED TAP SHA-256:
`d964b34191836e8b6115ad06fc6457a7b6694214fc03beedc89b8ca5509f70d4`. GREEN TAP SHA-256:
`bb16b91dc78040f746b303a07bced92ddbbd22f3efc58b8e90580e5a768e486f`. The original new-case RED diagnostics are embedded below
so those failures remain reviewable in this source record; only trailing whitespace
is removed from that excerpt.

## Qualification and limits

Independent source and fixture review by `/root/recover_prior_run` is clear on
the exact registry and fixture hashes above. The reviewer independently executed
the frozen 48-case gateway file once on Node24.22.1 Linux x64: exit0, no failures,
skips, cancellations or TODOs, and empty stderr. All six before/after input hashes
matched, and the implementation writer read the actual receipt/TAP and verified
their hashes. Receipt SHA-256:
`1bbb6c08a8f64373c752f36619acca5e5af815a5064aed733e3f8de1d0951763`; TAP SHA-256:
`6e333d47f1c87dc89f389db51c5c794a67d9a2e528bdd34ed38ab3fa4e2fb763`. Both remain in
`artifacts/issue-224-independent-review/peer-recovery-fjdznzno/`.

The reviewer found no material source/fixture issue: the final timestamp follows
the authorization reads, existing identity rules remain, and no await follows the
final decision. This peer execution binds the original base `security.mjs`
(`d0d310b6af0e1b04929e62e621ddf154615a4a2b5b9bedbea8c40852bc53d6d7`),
so combined issue54/issue224 integration still requires its own final-head gates.

Root integration owns the shared security,
handoff and roadmap evidence, explicit metric review/render/check, normal reviewed
build/check/package qualification, all six exact-candidate hosted/platform/native
gates, expected-head normal integration, and separate actual-main qualification.
No local focused result substitutes for those gates.

CLI-290 and WEB-002 receive evidence only. Broad #55 remains open; no protected
requirement field, stage, weight, dependency, estimate, seed, pin, lock or acceptance
was changed in this delegated slice. The parity check verifies the existing pinned
baseline while reporting 0/48 acceptance, not full parity.

The decision-time check does not promise response arrival before expiry, revoke an
operation already authorized while its token was live, or qualify every downstream
asynchronous operation. The fixture uses local synthetic identities and memory
storage; no live Cloudflare persistence, owner browser, remote data access or
file-result disclosure was exercised. No production account policy/grant, Worker,
private plugin, bridge, service, global runtime or unrelated project changed. No
paid/model CLI/API or new dependency was used.

## Retained original RED diagnostics for the ten new cases

```tap
# Subtest: OAuth expiry: public MCP authorization settles just before token expiry during epoch read
ok 39 - OAuth expiry: public MCP authorization settles just before token expiry during epoch read
  ---
  duration_ms: 78.185871
  type: 'test'
  ...
# Subtest: OAuth expiry: public MCP authorization settles exactly at token expiry during epoch read
not ok 40 - OAuth expiry: public MCP authorization settles exactly at token expiry during epoch read
  ---
  duration_ms: 43.398354
  type: 'test'
  location: '/workspace/scratch/a9287b3cfe09/mterm-oauth-expiry/tests/remote-gateway.test.mjs:1373:5'
  failureType: 'testCodeFailure'
  error: |-
    Expected values to be strictly equal:

    200 !== 401

  code: 'ERR_ASSERTION'
  name: 'AssertionError'
  expected: 401
  actual: 200
  operator: 'strictEqual'
  stack: |-
    TestContext.<anonymous> (file:///workspace/scratch/a9287b3cfe09/mterm-oauth-expiry/tests/remote-gateway.test.mjs:1379:14)
    async Test.run (node:internal/test_runner/test:1409:7)
    async Test.processPendingSubtests (node:internal/test_runner/test:974:7)
  ...
# Subtest: OAuth expiry: public MCP authorization settles after token expiry during epoch read
not ok 41 - OAuth expiry: public MCP authorization settles after token expiry during epoch read
  ---
  duration_ms: 38.897741
  type: 'test'
  location: '/workspace/scratch/a9287b3cfe09/mterm-oauth-expiry/tests/remote-gateway.test.mjs:1373:5'
  failureType: 'testCodeFailure'
  error: |-
    Expected values to be strictly equal:

    200 !== 401

  code: 'ERR_ASSERTION'
  name: 'AssertionError'
  expected: 401
  actual: 200
  operator: 'strictEqual'
  stack: |-
    TestContext.<anonymous> (file:///workspace/scratch/a9287b3cfe09/mterm-oauth-expiry/tests/remote-gateway.test.mjs:1379:14)
    async Test.run (node:internal/test_runner/test:1409:7)
    async Test.processPendingSubtests (node:internal/test_runner/test:974:7)
  ...
# Subtest: OAuth expiry: public MCP authorization still rejects grant expiry during epoch read
ok 42 - OAuth expiry: public MCP authorization still rejects grant expiry during epoch read
  ---
  duration_ms: 47.16657
  type: 'test'
  ...
# Subtest: OAuth expiry: public MCP authorization settles just before token expiry during grant read
ok 43 - OAuth expiry: public MCP authorization settles just before token expiry during grant read
  ---
  duration_ms: 85.311344
  type: 'test'
  ...
# Subtest: OAuth expiry: public MCP authorization settles exactly at token expiry during grant read
not ok 44 - OAuth expiry: public MCP authorization settles exactly at token expiry during grant read
  ---
  duration_ms: 58.81561
  type: 'test'
  location: '/workspace/scratch/a9287b3cfe09/mterm-oauth-expiry/tests/remote-gateway.test.mjs:1373:5'
  failureType: 'testCodeFailure'
  error: |-
    Expected values to be strictly equal:

    200 !== 401

  code: 'ERR_ASSERTION'
  name: 'AssertionError'
  expected: 401
  actual: 200
  operator: 'strictEqual'
  stack: |-
    TestContext.<anonymous> (file:///workspace/scratch/a9287b3cfe09/mterm-oauth-expiry/tests/remote-gateway.test.mjs:1379:14)
    async Test.run (node:internal/test_runner/test:1409:7)
    async Test.processPendingSubtests (node:internal/test_runner/test:974:7)
  ...
# Subtest: OAuth expiry: public MCP authorization settles after token expiry during grant read
not ok 45 - OAuth expiry: public MCP authorization settles after token expiry during grant read
  ---
  duration_ms: 36.063865
  type: 'test'
  location: '/workspace/scratch/a9287b3cfe09/mterm-oauth-expiry/tests/remote-gateway.test.mjs:1373:5'
  failureType: 'testCodeFailure'
  error: |-
    Expected values to be strictly equal:

    200 !== 401

  code: 'ERR_ASSERTION'
  name: 'AssertionError'
  expected: 401
  actual: 200
  operator: 'strictEqual'
  stack: |-
    TestContext.<anonymous> (file:///workspace/scratch/a9287b3cfe09/mterm-oauth-expiry/tests/remote-gateway.test.mjs:1379:14)
    async Test.run (node:internal/test_runner/test:1409:7)
    async Test.processPendingSubtests (node:internal/test_runner/test:974:7)
  ...
# Subtest: OAuth expiry: public MCP authorization still rejects grant expiry during grant read
ok 46 - OAuth expiry: public MCP authorization still rejects grant expiry during grant read
  ---
  duration_ms: 80.716887
  type: 'test'
  ...
# Subtest: OAuth expiry: an already-expired access token rejects before epoch and grant reads
ok 47 - OAuth expiry: an already-expired access token rejects before epoch and grant reads
  ---
  duration_ms: 33.262457
  type: 'test'
  ...
# Subtest: OAuth expiry: another live client token remains authorized after the first token expires
ok 48 - OAuth expiry: another live client token remains authorized after the first token expires
  ---
  duration_ms: 43.482024
  type: 'test'
  ...
1..48
# tests 48
# suites 0
# pass 44
# fail 4
# cancelled 0
# skipped 0
# todo 0
# duration_ms 4458.336486
```

## Root serialized integration — 2026-11-09 UTC

Both worker commits `f73063b42453033e684a80424dec1bf7e78e25ca` and
`71ff50f99b1984ba3068801513785f71cb4332ef` were applied after PR225 at exact
base `0d5a41b47ff40b2df8e50ad76d6cee18d4b0d1b1`. Registry and frozen gateway
fixture retain their worker/reviewer hashes. This integration includes the final
issue54 Access verifier (`78aa4d7f9f632568d2247d249691b7583dbf73d344bd040d6512104741183b7b`).

The combined Access-expiry, gateway, admission and agent suite passed **82/82**,
exit0, empty stderr, zero failures/skips/cancellations/TODOs, Node24.22.1 Linuxx64.
All11 source/fixture/compiled input hashes remained unchanged. Raw integrated TAP:
`eb96158a5b39698178262f42117d691140ac2cc64e2ee62751443cc4b52cde02`; receipt:
`50fb0966fd4858aecd4b0541629957195cf87acd30d39a08a011629a8a9eb2c3`.

Committed transcripts preserve the original RED and combined GREEN with only
trailing whitespace removed: [RED](2026-11-09-oauth-expiry-red.tap), SHA256
`dae55c88bc92ac033a3ed23c947a99890a0a8c1f80e885a1fe3d563258afa475`, and
[GREEN](2026-11-09-oauth-expiry-green.tap), SHA256
`eb96158a5b39698178262f42117d691140ac2cc64e2ee62751443cc4b52cde02`.
The original48-case and final82-case executions remain separate evidence; source
and fixture byte bindings distinguish the worker baseline from combined integration.

Root appends SECURITY, a complete-history-preserving HANDOFF checkpoint, CLI290
notes/evidence and one WEB002 paragraph. No stage, acceptance, weight, estimate,
dependency, blocker, seed, pin, lock or historical review metadata changes. The
normal reviewed local gates passed as recorded below. Independent protected-document
scope/history review is clear; current-status wording was reconciled without source,
fixture or ledger changes. The exact committed-input gateway artifact, candidate
hosted gates and separate actual-main qualification remain pending at this checkpoint. Gateway modules are not part of the installed
CLI package. No live deployment or owner state changed. Narrow issue224 can be
closed after qualified delivery; full issue55/WEB002 remains open.

Normal explicit review/render, reviewed build (roadmap, pinned parity and
TypeScript), typecheck, complete source formatting and whitespace checks all
passed with exit0. Source fingerprint
`8e90c14eb8f45379c658554ca08fd2adae60585f742a1e674e317310277524e8`.
All300 requirements remain at29.36% maturity,0complete45blocked126notStarted;
DCP0/48 and WEB0/12 remain. The existing npm unknown `http-proxy` environment
warning is retained. No full local suite or live gateway result is inferred.
