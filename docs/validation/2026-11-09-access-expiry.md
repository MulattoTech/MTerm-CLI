# Access identity expiry during asynchronous verification — 2026-11-09

Session `MTERM-WEB-20261109T131339Z-resume-a9287b3c`, OpenAI / GPT-6 Astra Pro
(self-reported). Scoped implementation worker `/root/recover_prior_run` owns
`gateway/security.mjs`, `tests/gateway-access-expiry.test.mjs`, and these two unique
validation/provenance files. [Atomic issue54 claim](https://github.com/MulattoTech/MTerm-CLI/issues/54#issuecomment-6741001442),
`coord/mterm/issue-54`, branch `fix/issue-54-access-expiry-20261109`.
Base: `3d32c0e53b0444c2b012b15432928f6feeda053f`. Work uses a separate normal clone.

## Confirmed defect and bounded correction

`verifyAccess` initially checked the Access JWT timestamps before fetching its
certificate, importing its public key, verifying its signature, and hashing the
accepted identity. Each operation can await. A correctly signed, initially valid
identity could therefore be returned after its `exp` boundary. A backwards clock
adjustment could likewise invalidate the original `iat` or `nbf` decision.

The function now uses the same timestamp predicate twice: before certificate
retrieval and immediately after the identity hash resolves. There is no subsequent
await before returning the identity. The predicate preserves the original policy:
finite `exp` and `iat`, `exp > floor(Date.now() / 1000)`, and the existing five-second
`iat`/`nbf` tolerance, including the original optional `nbf` expression. Failures use
the existing `401 invalid_identity` response. Issuer, audience, algorithm, signature,
human allowlist, and staging-only service-principal checks are unchanged.

This authenticates at the return decision inside `verifyAccess`. It does not claim
that a later caller operation or network response completes before expiry, nor add
a global session revocation mechanism or a new JWT policy.

## Regression design and actual RED

All22 cases were created before editing production source. They use generated
RSA2048 keys, actually signed JWTs, actual WebCrypto signature verification, and
actual identity hashing. A controlled clock moves at the completion of certificate
retrieval, signature verification, or identity hashing. The injected certificate
fetcher returns the real fixture public key; a separate global-fetch tripwire rejects
external requests. Fixtures use synthetic identities and leave owner state untouched.

| Cases | Count | Expected behavior |
| --- | ---: | --- |
| Human identity at each of three asynchronous phases | 9 | One millisecond before expiry passes; exact expiry and one millisecond after reject |
| Staging service identity at each asynchronous phase | 3 | Exact expiry rejects |
| Clock rollback across signature or identity hashing | 2 | Recheck existing issued-at and not-before bounds |
| Existing five-second tolerance | 1 | Signed staging service remains accepted |
| Issued-at or not-before six seconds ahead | 2 | Reject before certificate retrieval |
| Already expired identity | 1 | Reject before certificate retrieval |
| Tampered signature | 1 | Actual signature verification returns false |
| Wrong audience, unapproved human, production service identity | 3 | Existing authorization boundaries remain enforced |

The unchanged baseline source produced **11 pass /11 fail**, exit1. All11 failures
were the expected missing-rejection assertions: nine crossed-expiry cases and two
clock-rollback cases. There were no skips, cancellations, todos, or stderr output.
The test file has remained byte-identical since this RED execution.

## Executed commands and results

Node `v24.22.1`, Linux x64. Commands below used the primary Node24 runtime.

```sh
node --test --test-reporter=tap --test-concurrency=1 tests/gateway-access-expiry.test.mjs
npm ci --ignore-scripts --no-audit --no-fund
npm run build:code
node --test --test-reporter=tap --test-concurrency=1 tests/gateway-access-expiry.test.mjs tests/remote-gateway.test.mjs tests/remote-admission.test.mjs
node node_modules/prettier/bin/prettier.cjs --check gateway/security.mjs tests/gateway-access-expiry.test.mjs
node --check gateway/security.mjs
node --check tests/gateway-access-expiry.test.mjs
git diff --check
```

| Evidence | Actual result |
| --- | --- |
| Unmodified baseline, new22 | RED11 pass /11 fail, exit1, empty stderr |
| Initial implementation before Prettier, new22 | GREEN22/22, exit0, empty stderr |
| Final formatted source, new22 plus existing gateway/admission46 | GREEN68/68, exit0, empty stderr;5.116s wall,5035.899ms TAP duration |
| Independent frozen22 execution | 22/22 on final source; direct source/fixture review clear, actual receipt and TAP verified |
| Own dependency install and TypeScript build | Both exit0; npm emitted existing unknown `http-proxy` environment-config warning |
| Focused formatting, both syntax checks, whitespace diff check | Passed |

All executions had zero skipped, cancelled, or todo cases. The final68 case run
bound both changed files, both unchanged existing fixture files, and the compiled
protocol/agent modules with identical before/after hashes. It includes the existing
OAuth, pairing, gateway, grant-expiry, request-ownership, and admission regressions.
The TypeScript build used this clone's own dependency installation. No gateway
artifact, package, platform, deployment, or full repository gate is claimed here.

## Exact byte bindings and formatting reconciliation

| Material | SHA-256 |
| --- | --- |
| Baseline `gateway/security.mjs` | `d0d310b6af0e1b04929e62e621ddf154615a4a2b5b9bedbea8c40852bc53d6d7` |
| Initial GREEN source before Prettier | `b0733beedc1d0ea27a214598bcdac2efc2c28254d57ced6a5653260e3559fbe8` |
| Final formatted `gateway/security.mjs` | `78aa4d7f9f632568d2247d249691b7583dbf73d344bd040d6512104741183b7b` |
| Frozen new22 fixture | `9e24369e1ab38e9eedcc5f77d2b3c5056fa51d9ce77e94d6232d9b6b6259c1cd` |
| Raw original RED TAP | `1249fe84dc1210fb1b46f33809ea4bbd209834e49a89d22ea9fe77ef420ccba7` |
| Raw intermediate GREEN22 TAP | `fdf963baf962ca45d049f2432c1b5091dd8b1778331b4df40febf7b9be37ed13` |
| Raw final focused GREEN68 TAP | `4926f314b1bff122efe0d3a855b647f9ef0b37f681333fd5bb55f6babfde1c5c` |
| Final focused execution receipt | `75ff3857b084ac021c8a7ad9d6046c4405f16f1430043290b4df2c8a491c8758` |
| Independent reviewer execution receipt | `908452faedf8803152a9bb654f4641c391623e6a82e03643f1ad8a482529d77d` |

The `b0733bee` to `78aa4d7f` delta is solely Prettier collapsing the initial
`requireValue` Boolean expression from four lines to one. Reconstructing that line
wrapping from the final bytes reproduced the exact intermediate hash. No test
changed. The intermediate22 result is not represented as execution of final bytes;
the final68 result and independent22 execution bind the final formatted source.

Independent reviewer `/root/policy_and_candidate_review` found no material source
or fixture issue. Its single execution passed22/22 with exit0, empty stderr, and
unchanged source/test hashes. The final check follows the awaited identity hash;
real crypto wrappers and test-scoped mocks preserve the intended boundaries.
The actual receipt and TAP were read and hash-verified in
`artifacts/issue-54-independent-review/peer-policy-wkrmtn21/`; TAP SHA-256
`b00dd6e3d79da79ecb106687bbe0df9c5965876479da136d2957418008a65655`.

Raw logs and JSON receipts remain in this worker's ignored
`artifacts/issue-54-access-expiry/` directory; the committed records above retain
results and hashes. No logs contain real JWTs, private keys, or owner identities.

## Integration ownership and remaining qualification

The root integrator owns shared SECURITY/HANDOFF/roadmap reconciliation and will
serialize this patch after the independently worked issue56 state-lock change.
This worker changes no shared ledger, stage, weight, acceptance field, seed, lock,
or dependency pin. Issue54/WEB001 receives bounded identity-check evidence only;
full remote-client and production acceptance remain open. No new grant, allowance,
Cloudflare resource, live deployment, owner credential, or model-consuming worker
is created. The preview gateway remains separate from the live bridge/plugin.

Before merge, integration still requires shared documentation/protected-ledger
review, the normal reviewed build and gates, exact-head hosted qualification, and
separate merged-main qualification. The local change is not pushed, published, or
merged by this worker.

## Serialized root integration — 2026-11-09 UTC

The root integrator applied both worker commits `88d4b80c6b1a0a36deac607964b461213467d13c`
and `9efe5ada3fb4a9cf28a4acd2623944c947a90c5e` after PR223 at base
`4f9a1aa286c7832497e375009961d583d829e9da`. The production gateway source and frozen
fixture retain exactly the worker/reviewer hashes above. A separate integrated
68-case execution passed **68/68**, exit0, with no skips, cancellations, todos or
stderr, on Node24.22.1 Linuxx64. All six source/fixture/compiled bindings were
unchanged. Raw TAP SHA-256: `b00f8e51048105fcc8c4bdd16c0052949dba65d1e196317b8f0e9c1e61e2159c`; execution receipt:
`6777bde7e023db756ceb50a04fd100341b8254b558f64fcafe28b9c78c113d5d`.

The original RED and integrated GREEN transcripts are committed with trailing
whitespace removed only: [RED](2026-11-09-access-expiry-red.tap) and
[GREEN](2026-11-09-access-expiry-green.tap). Their exact SHA-256 values are
`1249fe84dc1210fb1b46f33809ea4bbd209834e49a89d22ea9fe77ef420ccba7` and
`b00f8e51048105fcc8c4bdd16c0052949dba65d1e196317b8f0e9c1e61e2159c`, respectively. The worker raw logs and
independent review remain distinct evidence, not substituted test executions.

Root appends bounded source evidence to CLI290/299 and WEB001, updates the security
contract, and preserves the complete historical handoff. No stage, acceptance,
weight, estimate, dependency, blocker, seed, pin or historical review field changes.
The normal reviewed build/typecheck/format/parity checks and exact committed-input
gateway artifact are required before publication qualification. Hosted candidate
checks and eventual actual-main checks remain separate. Gateway modules are not
part of the installed CLI package; package tests alone do not qualify this fix.

A separate read-only Cloudflare inventory observed the existing November2 staging
artifact still active; this patch is not deployed. No owner identity, allowance,
service principal, enrollment, deployment or production bridge was changed.

Normal explicit roadmap review/render, reviewed build (roadmap, pinned parity and
TypeScript), typecheck, full source formatting and whitespace checks all passed
with exit0. Source fingerprint:
`e7961ae99730cff948b5b6518409d150eac68b58d626ec960a5b1fd76b81ba84`.
All300 requirements remain at29.36% weighted maturity,0complete,45blocked and
126notStarted; DCP0/48 and WEB0/12 acceptance are unchanged. The npm environment
emitted its existing unknown `http-proxy` configuration warning. This is not a
full local suite or live gateway result.
