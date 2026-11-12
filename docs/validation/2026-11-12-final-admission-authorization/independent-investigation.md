# Admission authorization boundary investigation

## Scope and classification

Read-only pre-patch investigation of MTerm-CLI at HEAD 6a6a883f3ce1cd86a7405d2c53a1fb08cd1210c2 in /workspace/scratch/a92a3aacdca1/MTerm-CLI-Accounting. OpenAI / GPT-6 Astra Pro, self-reported, 2026-11-12 UTC. Parent is the sole implementation owner. No source, repository configuration, live credential, deployment, or remote service was changed.

**Classification: the final admission expiry gap is independently confirmed.** This report does not classify the overall fix as fixed/no_change/blocked: no patch was applied or reviewed. The parent must choose its patch boundary independently.

Read AGENTS.md, docs/OWNER_AUTHORIZATION.md, docs/ORCHESTRATION.md, docs/GITHUB_ORCHESTRATION_SETUP.md, relevant docs/SECURITY.md sections, current/relevant HANDOFF checkpoints, and METRICS.md. Applied the Fix Finding skill's read-only pre-patch investigation step. The skill's referenced artifact-storage resource did not resolve through its exposed cloud resource path; this is explicitly requested temporary repository-work evidence only.

## Facts: entry, validation, and sink

1. The public entry is POST /mcp, routed at gateway/app.mjs:270. bearer() accepts a bounded opaque Authorization bearer string (gateway/security.mjs:36–39). mcp() sends an initial private registry access action before parsing the MCP body (app.mjs:85–115).

2. A caller controls its bearer, JSON-RPC ID, selected deviceId, read-tool name, and bounded tool arguments. The gateway requires a valid JSON-RPC ID, advertised tool, explicit UUID device ID, and argument schema before enqueue (app.mjs:107–115, 159–172). Public callers cannot choose the Durable Object instance: registry() uses the fixed private name mterm-registry-v1 (app.mjs:45–56). Stored token/grant records and expiry values are not public request fields.

3. All five filesystem tools in READ_TOOLS share registry action enqueue: mterm_read_file, mterm_file_info, mterm_list_directory, mterm_search_files, and mterm_search_content (src/remote/protocol.ts:37–70; app.mjs:159–172). Inventory mterm_list_devices follows a separate action and creates no job.

4. Registry.fetch serializes dispatch through blockConcurrencyWhile; alarm() uses that same boundary (gateway/registry.mjs:94–114, 859–875). The repository explicitly describes authorization and job transitions as serialized (docs/SECURITY.md:315–320). Consequently, this finding is a clock-lifetime transition while a request awaits, not a demonstrated concurrent grant-revocation race.

5. enqueue authenticates again through access() (registry.mjs:678–679). access() hashes the bearer, fetches the access token, checks kind, entry expiry, scope, resource, and owner epoch, then reads its grant. Its final check uses one fresh timestamp for token and grant expiry plus grant revocation/owner/client binding (registry.mjs:162–188). It returns a copy of the token with tokenHash. The validated grant expiry is not returned.

6. Subsequent enqueue awaits occur in rate accounting; owned-device lookup and epoch validation; the retained-job scan, including optional expired-row deletion and pagination; RPC-ID hashing; and the active-lease read (registry.mjs:680–695; rows at 116–128; ownedDevice at 204–209). Initial token/grant validity can expire during any of these awaits.

7. The final decision captures checkedAt after active-lease lookup, checks the existing active lease and device poll freshness, constructs a queued job, and begins persistence (registry.mjs:694–717). It never rechecks token/grant expiry. The first admission write is storage.put('job:' + requestId) at line 716. Active-lease persistence follows at 717 and allow-read/queued auditing at 718–725.

8. This sink creates new work after authority has expired. The job captures grantId and epoch, plus the bearer-specific rpcKey, but no access-token expiry (registry.mjs:702–715). Its request deadline is checkedAt + JOB_TIMEOUT_MS (20 seconds), independent of token/grant expiry.

9. Poll delivery checks grant lifetime and owner epoch after its storage reads, with job timeout precedence (registry.mjs:596–623). It does not require the admitting access token still to be live. Thus a newly admitted job with an expired access token and live grant can be delivered. An expired-grant job is instead terminalized as revoked. This difference is already part of the design.

10. The downstream agent checks wire/device/request identity, bounded deadline, duplicate requests and the tool allowlist; it cannot check client OAuth expiry because the wire frame contains no token/grant lifetime (src/remote/agent.ts:133–157, 198–208, 243–247; src/remote/adapter.ts:53–109). RemoteReadAdapter creates FileService with allowWrite:false and dispatches only bounded read operations (adapter.ts:45–50, 94–109).

11. jobResult re-enters access() before retrieving job state, then enforces owner, client, grant, device, and single-consumption checks (registry.mjs:728–748). A public MCP call can therefore receive HTTP401 from its first result poll even though enqueue already created a job. No expired-bearer result-disclosure bypass was established.

## Independent observations

Node runtime: v24.22.1. The probe imported the actual unchanged registry/app/security modules and used serialized, structured-cloning in-memory storage, synthetic identities and opaque fixture credentials, actual WebCrypto SHA-256, controlled Date.now(), and an external-fetch failure guard. It did not create a local filesystem adapter, read a user file, contact a gateway, or issue model requests.

Twenty-two controlled observations were made:

| Cases | Observation |
| --- | --- |
| Token-only expiry, job-list / RPC-ID digest / active lookup, at expiry−1 ms | 3 legitimate controls: HTTP200, one queued job and one active lease |
| Token-only expiry, same three boundaries, exact expiry / +1 ms | 6 failures of the desired invariant: HTTP200 and new job/lease after expiry |
| Grant-only expiry with live token, same three boundaries, expiry−1 ms | 3 legitimate controls: HTTP200, one queued job and one active lease |
| Grant-only expiry, same three boundaries, exact expiry / +1 ms | 6 failures of the desired invariant: HTTP200 and new job/lease after expiry |
| Valid decision, token or grant reaches expiry only during the first job put | 2 controls: HTTP200; admission began 1,000 ms before expiry |
| Public MCP, token or grant expires during enqueue's active lookup | 2 observations: HTTP401 invalid_token from later result polling, while a queued job and active lease already exist |

For the token-only exact-expiry active-lookup case, a subsequent authenticated agent poll delivered one request; stored status became delivered. The expired bearer received HTTP401 on jobResult. For the corresponding grant-only case, polling delivered zero requests and changed the queued job to revoked; client jobResult remained HTTP401. The protected result was not retrieved in either case.

These are deterministic synthetic execution observations. They establish the admission gap and its bounded dispatch consequence, not deployed exploitability or file-result disclosure.

## Inference: narrowest complete enforcement boundary

The shared admission boundary is the synchronous final decision after the last authorization-relevant admission await, before the first job write: registry.mjs:696–716. A correction must cover every enqueue caller here; adding a public-route-only check would leave private registry dispatch and later storage waits outside that check.

Both token and grant deadlines must survive access()'s return as trusted decision inputs. The existing return contains token.expiresAt but loses grant.expiresAt. Carrying a separate internal authorization-lifetime snapshot from the grant already validated in access() would avoid another storage await while preserving that helper's entry/final validation. A grant-expiry scalar or an explicitly defined effective authorization deadline can serve this purpose; retaining the token's own expiresAt unchanged is the clearest compatibility choice.

The final admission check should compare both authority deadlines to the same fresh checkedAt used for active-lease and device-freshness checks. It must use strict greater-than: equality is already expired. A new await after one of those final checks can recreate the device-freshness issue, so reauthentication through an awaited helper is safe only if the final timestamp and the other final predicates move after its last await as well.

Repository serialization is why the already validated grant/epoch snapshot can be used for this clock-only correction. This does not assert safety for unsupported direct handle() calls that bypass fetch serialization or external out-of-band storage mutation.

No change to agent frames, job schema, token issuance duration, cancellation policy, grant revocation policy, or result consumption is required to close this particular admission gap. Passing token expiry into polling or clamping all job deadlines to bearer expiry would change the existing policy for work admitted while valid.

## Equivalent lifetimes, representations, and compatibility

- Token-first and grant-first expiry are both real shapes. mint() gives access tokens now()+one hour while refresh tokens use grant.expiresAt (registry.mjs:211–239). An access token minted near the end of a grant can outlive the grant. Checking only token.expiresAt is incomplete.
- Equality and later times are invalid; expiry−1 ms remains valid. Both-expired is also invalid. The check should not require a minimum remaining execution window.
- Absence of an expiry is already refused by access()'s positive greater-than predicates; do not introduce a default that turns missing deadline state into unlimited authority.
- Current expiry writers create numeric millisecond values. access() uses JavaScript greater-than rather than explicit type validation; numeric strings or other corrupt local record forms are not exposed through a public expiry parser. Any new stricter representation rule should be identified as an additional compatibility decision, not claimed necessary to fix this timing gap.
- Any new snapshot property must be derived from the actual fetched grant, not taken from caller input or a pre-existing similarly named token field. Avoid using a truthy fallback that substitutes the token deadline when the grant deadline is missing or false.
- The RPC lease is bearer-hash-specific and hashes JSON.stringify(rpcId), preserving numeric 7 versus string '7'. Changing the access return must retain tokenHash and the existing owner/client/grant/epoch fields (registry.mjs:188, 694, 754).
- Expiry during job persistence after a valid final decision remains permitted. This is an authorization/admission decision guarantee, not response delivery before expiry, transactional rollback, or a hard real-time guarantee. docs/SECURITY.md:332–349 explicitly distinguishes decision-time validity from later I/O completion.
- Readiness continues to require the exact selected owned device, capabilities, a nonnegative valid poll age below 15 seconds, bounded registry occupancy, and no current matching RPC lease.

### Direct access() consumers

| Consumer | Fields/behavior to preserve | Public exposure |
| --- | --- | --- |
| access action, registry.mjs:483–486 | userId, clientId, scope | Explicit projection only |
| listDevices, 672–676 | userId | Whitelisted device projection |
| enqueue, 678–726 | expiry, user/client/grant/epoch, tokenHash | requestId and deadline |
| jobResult, 728–748 | owner/client/grant binding | Authorized single-use result |
| cancel, 750–760 | userId, tokenHash | cancelled:true |

No other product caller of this access helper was found by repository-wide source search. Adding internal lifetime metadata need not expose it publicly because these returns use explicit projections. This is source inspection, not a claim that all future consumers are constrained.

### Error and side-effect contract

Existing rejection order in enqueue is: access invalid_token; rate_limited; tool_disabled; device ID/ownership/revocation; tool_unavailable; initial device_offline; device_busy; request_in_progress; final device_offline. A check inserted after existing admissibility rejections can retain their established precedence for requests that become expired later. Already-expired entry tokens must retain early HTTP401 before rate/device work. Simultaneous new expiry versus existing failures should have an explicit regression expectation rather than accidental reordering.

Fresh final expiry should keep HTTP401 invalid_token, matching access(). app.mjs:193–199 deliberately rethrows 401 instead of converting it to a successful HTTP200 tool-error result; app.mjs:344–352 attaches the Bearer challenge. The registry's errorResponse is sanitized (security.mjs:47–51).

“No admission writes” should assert no new job, active lease, or allow-read/queued audit event, without forbidding existing rate bookkeeping, getAlarm/setAlarm initialization, or rows() cleanup of expired records (registry.mjs:107, 116–138). Failure must not revoke an otherwise live grant or an unrelated valid client.

## Existing test evidence and focused validation

Executed successfully against unchanged source:

    node --test --test-concurrency=1 --test-name-pattern='OAuth expiry|grant expiry|enqueue rejects|control: a device' tests/remote-gateway.test.mjs tests/remote-device-readiness.test.mjs

Result: exit 0; 26 tests, 26 pass, 0 fail/skipped/cancelled/TODO. These passing tests do not cover the missing final admission authorization check.

Relevant test contracts:

- tests/remote-gateway.test.mjs:1311–1422: real synthetic OAuth fixture, observed token/epoch/grant reads, exact/before/after token expiry, grant expiry, already-expired fast failure, independent client.
- tests/remote-device-readiness.test.mjs:128–173: clock crosses job-list or active lookup, no admission rows on refusal, valid/initially stale controls.
- tests/remote-gateway.test.mjs:300–447: queued/delivered grant expiry at legacy/zero/four poll capacities; result refusal; unrelated live grant; deadline precedence; post-read checks.
- tests/remote-gateway.test.mjs:581–636: full public gateway relay and single result retention.
- tests/remote-gateway.test.mjs:1024–1308: reused RPC lease ownership, typed IDs, bearer isolation and delayed cleanup.
- tests/remote-admission.test.mjs: capacity delivery and retained execution slots.
- tests/remote-occupancy.test.mjs: capacity counters, unconsumed completion occupancy and owner filtering.

Recommended pre-change regression cases: token-only and grant-only exact/+1 expiry during job scan and final active lookup, plus one RPC-hash crossing; expiry−1 controls through the same path; no job/lease/queued audit on refused admission; valid decision followed by expiry during first persistence; public /mcp side-effect assertions and Bearer401 behavior; existing expiry+stale/lease conflict precedence. Include missing expiry refusal if the chosen snapshot representation adds a new unsafe-default possibility.

Recommended ordered commands after the parent's candidate:

    node --check gateway/registry.mjs
    node --test --test-concurrency=1 <new-final-admission-regression-file>
    node --test --test-concurrency=1 tests/remote-gateway.test.mjs tests/remote-device-readiness.test.mjs tests/remote-admission.test.mjs tests/remote-occupancy.test.mjs
    node --test --test-concurrency=1 tests/remote-pairing-expiry.test.mjs tests/gateway-access-expiry.test.mjs
    node scripts/orchestration/verify.mjs --quick

The last command runs normal reviewed build and full acceptance checks (scripts/orchestration/verify.mjs:34–54); source/roadmap evidence must be updated by the integration owner first. Hosted/platform/installed-package and exact-source artifact gates remain the parent's delivery responsibility. No broader tests or live qualification were run by this investigator.

## Unresolved questions and limits

- The parent must select the actual snapshot/check implementation and decide explicit simultaneous-failure precedence while preserving existing behavior.
- Public deployment/runtime identity and real Durable Object timing were not inspected. No live-owner credential or device was used.
- This report does not establish result-disclosure bypass, cross-owner access, mutable remote capability, concurrent revocation bypass, or crash atomicity.
- This investigation is scoped to new-job admission. Other access() consumers retain their documented decision/return semantics; this is not a broad audit of every later await.
- No source edit was made. git diff --name-only for all inspected source/test paths was empty after the probe, and HEAD remained 6a6a883f3ce1cd86a7405d2c53a1fb08cd1210c2.

## Source bindings after execution

| File | SHA-256 |
| --- | --- |
| gateway/registry.mjs | 9ffc114472f2a5f1394c90ee9b83033938f1bccf8c2a34ebd6db29d841f45caa |
| gateway/app.mjs | 61b5c43a8ce7dc6fc61d772fcc16c4a4b7d5cb8f17c70555829fae3ce53e42a1 |
| gateway/security.mjs | 78aa4d7f9f632568d2247d249691b7583dbf73d344bd040d6512104741183b7b |
| src/remote/protocol.ts | 43e8c5067e8a2e4878b76f2ec6c0871dca499a02d5cd02cd31ecef57a8a3ed28 |
| src/remote/agent.ts | 96ecac93e03f84cd931b71f27e0932120f475f10f6d5e7e61579eb8a93c0e8db |
| src/remote/adapter.ts | 6f0732d714b099c418eafd81703224f2e28ceb981be69658dfb5c9dfb49606fc |
| tests/remote-gateway.test.mjs | dfbb1bc65c6c33c00b9acccd0d481ba0052e433ec324dd38bc616fa4f77094b1 |
| tests/remote-device-readiness.test.mjs | ac836425b5fdf7cf2263caa80d06afaa33712b8fa8b931731ee92bcc9a31b742 |

