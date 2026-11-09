# Pairing deadline decisions — 2026-11-09

Issue: [#229](https://github.com/MulattoTech/MTerm-CLI/issues/229), under [#56 / WEB-003](https://github.com/MulattoTech/MTerm-CLI/issues/56). Session: `MTERM-WEB-20261109T131339Z-resume-a9287b3c`. Claim: `coord/mterm/issue-229`, [comment 6742689698](https://github.com/MulattoTech/MTerm-CLI/issues/229#issuecomment-6742689698). Exact base: `fd47dea59e6cfba12995d453392216593a52237b`. Worker branch: `fix/issue-229-pairing-expiry-20261109`. Provider/model: OpenAI / GPT-6 Astra Pro, self-reported.

This record covers a bounded gateway correction and local source regression evidence. It does not qualify deployed Cloudflare behavior, an actual owner session, Windows credential storage, a running device agent, or full remote-client acceptance. The worker owns only `gateway/registry.mjs`, `tests/remote-pairing-expiry.test.mjs`, and the two unique evidence records. The integrator owns shared documentation, reviewed roadmap evidence, publication and combined-revision gates.

## Reproduced defect

The registry originally checked a pairing's deadline before awaited work. Approval could cross expiry during the actual user-code hash, inventory lookup or final epoch read and still persist the owner and epoch. An unapproved poll could cross expiry during the actual device-code hash or rate operation and still return pending. An approved poll could cross expiry during authorization, capacity lookup or credential hashing and still consume the pair and issue credentials.

The retained discovery linked from issue229 used actual gateway code, signed synthetic Access approval and public pairing/agent routes. At exact expiry and one millisecond afterward, approved polling returned HTTP200, consumed the pair, created device/agent/owner-index/success-audit records, and returned a credential usable at the agent-poll route. Already-expired entry correctly returned HTTP410 and created no credential. That distinction established a missed asynchronous decision boundary. It required the genuine fixture device code and prior authenticated approval; it was not an approval or cross-owner bypass.

The first discovery fixture/receipt hashes were `0ed39c769c40fa00b3661395eefacb46c0bf2a8fdfa0ba0ad1625577ac458aa5` / `f8708e0ff7c39590806a9040d173b71e974a497b5761dcccad58db38c9d98751`. The separate 28-scenario approval/pending discovery fixture/receipt hashes were `b3561288e1402cd4ba13939efe6731a66b6fc648a4fa8276b5a97332655e9664` / `4755e3f0904e70f488099b99f4b0d59dd413b47fdd4a5db898de4fbdcd364c7a`. Those artifacts remain unchanged; the committed 60-case fixture below supplies individual regression assertions, including a separate assertion for each after-expiry credential-issuance case.

## Three final checks

| Decision | Fresh deadline check | Late-expiry result and state |
| --- | --- | --- |
| Approval | After the final epoch read, immediately before the pair write | HTTP400 `invalid_pairing`; no persisted owner/epoch change |
| Unapproved poll | Inside the unapproved branch, after rate handling and immediately before pending return | HTTP410 `pairing_expired`; pair retained unchanged |
| Approved claim | After the new credential hash, immediately before consuming the pair | HTTP410 `pairing_expired`; pair retained; no new device credential, device record, agent index, owner index or pairing-success audit |

The original entry checks, displayed/device-code checks, owner epoch, device limit, rate limits, serialized transitions and consume-before-create ordering remain. The pending check is confined to that branch so it does not override the approved path's existing revocation or device-limit errors. Expired denials may retain rate bookkeeping and ordinary expired-index cleanup; they do not require whole-storage equality.

These checks define final admission decisions. There is no intervening await before the relevant write/delete invocation or pending return, but storage completion and response delivery can occur later. A decision admitted while valid is not retroactively denied after persistence starts. No rollback, retry, new replay path, schema, migration, binding, provider, permission or token format is added.

## Frozen fixture and method

The new fixture was written and formatted before any behavior edits. It calls the actual untransformed `createGateway`, `MTermRegistry`, Access verifier, public pairing routes, and agent-poll route. Synthetic Access assertions use actual RSA signatures and verification. Digest barriers await native SHA-256 and return its real result; they do not stub authorization or replace digest output. Each selected barrier must be reached exactly once before the test advances its controlled clock and releases the awaited operation.

Storage is an owned serialized in-memory implementation with cloned records. Native time and digest methods are restored by test-scoped mocks. Global outbound fetch is a tripwire; the injected certificate responder accepts only the fixture issuer's exact certificate URL. No actual owner credential, live request, device agent, OS credential file, browser or external resource is used. The fixture uses native module paths and platform-independent server data; a synthetic device platform field is not evidence of an actual device runtime.

| Cases | Count | Coverage |
| --- | ---: | --- |
| Approval boundaries | 12 | User-code digest, inventory list, inventory epoch and final approval epoch, each at −1 / 0 / +1 ms |
| Pending poll boundaries | 9 | Device-code digest, rate read and rate write, each at −1 / 0 / +1 ms |
| Approved poll boundaries | 21 | Device-code digest, rate read/write, owner epoch, inventory list/epoch and final credential digest, each at −1 / 0 / +1 ms |
| Already-expired entry | 3 | Approval, pending and approved polling keep existing rejection contracts |
| Wrong-code precedence | 3 | Approval and both polling branches retain their existing errors |
| Rate precedence | 3 | Approval and both polling branches retain HTTP429 |
| Capacity and revocation | 3 | Both device-limit errors and revoked-approved-pair error remain |
| Single use and interrupted persistence | 2 | Successful claim cannot replay; credential-store failure still consumes before create and cannot replay |
| Independent live pair and housekeeping | 2 | Another live pair remains usable; rate updates and expired-index cleanup are permitted without new authority |
| Valid decision, later I/O completion | 2 | Approval write and claim consume/create can complete after expiry when the decision was still valid |
| Total | 60 | Individual source-level cases; no skips |

The two later-I/O controls begin their admission decision two milliseconds before expiry, suspend at the write/delete invocation and finish after expiry. This deliberately prevents a false response-time or crash-atomicity promise. The −1 / 0 / +1 matrix measures time at each earlier authorization barrier's completion.

## Actual execution

Original-source RED command:

```text
node --test --test-reporter=tap --test-concurrency=1 tests/remote-pairing-expiry.test.mjs
```

At 2026-11-09T14:43:24.956542Z, the untouched base registry ran all 60 frozen cases: **30 passed, 30 expected assertion failures; exit 1**. Every failure was `ERR_ASSERTION`; there were no import/setup failures, cancellations, skips or todos, and stderr was empty. All seven recorded source/fixture/compiled bindings were unchanged. The 28 missing exact/after deadline denials plus the independent-pair and permitted-housekeeping denial cases failed individually. Positive, already-expired, error-precedence, replay and later-I/O controls passed.

The corrected fixture first passed **60/60**, exit 0. Final focused command:

```text
node --test --test-reporter=tap --test-concurrency=1 tests/remote-pairing-expiry.test.mjs tests/gateway-access-expiry.test.mjs tests/remote-gateway.test.mjs tests/remote-admission.test.mjs
```

At 2026-11-09T14:44:38.014749Z, that command passed **138/138**, exit 0: 60 new pairing cases, 22 Access cases, 48 existing gateway cases and eight admission cases. There were zero failures, cancellations, skips or todos, and empty stderr. All 12 source/fixture/compiled bindings were unchanged. Recorded wall time was 5.643 seconds. These executions used Node v24.22.1 on Linux x64.

| Bound artifact | SHA-256 |
| --- | --- |
| Original registry | `a849f4a1b7881fd8198e7f97f7b6ad3da5bea7fd4a7492801f3a7f9d774a872d` |
| Final registry | `ecfa498867b20d1676cf7e035af23f1accc90be656de7c6c22ebf272dfff6cda` |
| Frozen 60-case fixture | `276f844411cca3c0f0d346ed60c3420960786902a9f30b64d69d1d3ec278b6f8` |
| RED TAP | `c9e7996652854c7302c82b70977f6033fe191b5a798c208fe0e0f466a19e8e47` |
| RED receipt | `f1f7813e9b462fca48c629745deee9394c83163fa0c7f53eebb5ef78ce2a9033` |
| Final focused GREEN TAP | `384faf5365c9fb1fa0a737b71e7e815a03e4e39d1b6255e200f6d8cc092e3495` |
| Final focused GREEN receipt | `496ce1e9792bb278ffeb77559d523fc78c121777e6afd0b89f97b1e9ed649c43` |
| Focused build/syntax/format/diff receipt | `e43d366eeece01442d481b63d20adf338c237f51ce74a500780b0d4cd873e771` |

Raw worker records are in ignored `artifacts/issue-229-pairing-expiry/`: `red.tap`, `red-receipt.json`, `focused-green.tap`, `focused-green-receipt.json`, their empty stderr files, and `focused-checks.json`. These original worker records retain their own commands, outcomes, limitations and hashes; the root-published transcripts are recorded below.

`npm ci --ignore-scripts --no-audit --no-fund` and `npm run build:code` exited 0 using this clone's own dependency tree. Final `build:code`, syntax checks for the changed source and fixture, focused Prettier check and `git diff --check` all exited 0. npm emitted its existing unknown `http-proxy` environment-configuration warning. No dependency or lockfile changed. The worker did not rerun the full local Unix-socket suite; its known local EPERM constraint is distinct from these tests, and hosted qualification remains pending.

## Independent review and integration boundary

Independent reviewer `/root/policy_and_candidate_review` found no material source or fixture issues. One independent execution of the frozen 60-case suite ran at 2026-11-09T14:51:51.131516Z and passed **60/60**, actual exit 0, with zero failures, cancellations, skips or todos and empty stderr, on Node v24.22.1 / Linux x64. All 12 recorded bindings were unchanged before and after the run; the worker separately read the actual receipt and TAP, recomputed both hashes and verified every current binding before recording this result.

The reviewer also checked the original RED registry against exact base `fd47dea59e6cfba12995d453392216593a52237b`, the unchanged fixture, all 30 meaningful `ERR_ASSERTION` failures and the 138-case focused GREEN transcript. Review confirmed the three final guards preserve existing error precedence and consume-before-create behavior; the native-crypto barriers and admitted-before-expiry/later-I/O controls are meaningful. This review does not qualify the combined integration revision, a hosted platform or live Durable Object timing.

The independent receipt is `artifacts/issue-229-independent-review/peer-policy-_ny_3d_o/receipt.json`, SHA-256 `e2532128d7157d72a1d5f77fa031295fd86f15eab4ed4066307a330c5fb80385`. Its `tests.tap` is SHA-256 `9783e4b19e363968b23f28e378d62b792d64fb3c32257ed1248d1fa6d087c367`.

The seed mapping is CLI-290 (separate authenticated network transport review) and CLI-299 (secure Web-relay acceptance), with direct WEB-003 evidence. This worker awards no stage or acceptance credit and changes no protected field or immutable seed. The integrator serializes shared SECURITY/HANDOFF/roadmap records after issue226's qualified integration.

Gateway modules are separate from the installed CLI package and the production owner bridge. No deployment, owner lifecycle/enrollment, credential/grant/policy/binding change, production bridge operation, push, PR, merge, full hosted qualification or paid/model-consuming operation was performed by this worker. Real Durable Object timing, storage faults, crash behavior, supported-client acceptance and later response delivery remain outside this local correction's proof.

## Root integration on qualified main

Root serialized worker commit `59b0bacabad678091c98af8b8aea8375a6184c0c` onto
qualified PR228 main `33f314055a5371d9b2bbcda9b7c8388f79d3cf35`. The registry and
frozen fixture hashes above remained unchanged. The combined pairing, Access,
OAuth/gateway, admission and agent suite passed **142/142**, actual exit0, empty
stderr, zero failures/cancellations/skips/todos, and 13 unchanged input bindings.
The command adds `tests/remote-agent.test.mjs` to the worker's focused command.

Root TAP SHA256 `0c75292812f57e7ee2253b296befb3ebe06e8220732008bdcb161661a7d3a9d9`;
explicit receipt SHA256 `c42e5b95680b5a2d7e5556e2d4692c65f9006399d3bbc8aa12170ae96c63b259`.

Committed [original-source RED](2026-11-09-pairing-expiry-red.tap), SHA256
`616cc13bf108ef78b7a84573961f6ecdcbc9fc2cd73e28559a6b0623f1daeaf4`, and
[combined GREEN](2026-11-09-pairing-expiry-green.tap), SHA256
`0c75292812f57e7ee2253b296befb3ebe06e8220732008bdcb161661a7d3a9d9`, remove only trailing
whitespace. The original raw worker and independent receipts remain retained.

Root appends only CLI290/299 notes/evidence, a dated WEB003 paragraph and the
SECURITY/HANDOFF integration explanation. Historical records and every protected
requirement field remain unchanged. Normal reviewed local gates passed as below.
Independent shared-document review is clear. Committed-input artifact construction,
candidate hosted jobs and separate actual-main qualification remain pending.
No live endpoint or owner-state operation was performed by this integration.

Explicit roadmap review/render, normal build (roadmap/parity/TypeScript), typecheck,
complete source formatting and whitespace checks all passed with exit0. Source
fingerprint `3421ab33b8b63dbfe41c655084ac0537a4802c9b306a1f120092fdc5b9d8eb12` covers178 source entries.
All300 requirements retain29.36% maturity,0complete45blocked126notStarted;
DCP0/48 andWEB0/12 remain unchanged. The existing npm `http-proxy` environment
warning is retained. These gates do not substitute for the full hosted/platform
and installed-package checks or a real deployed smoke.
