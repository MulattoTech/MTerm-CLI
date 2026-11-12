# Narrow device-readiness design for #58 / #62

**Recommended slice: expose bounded readiness observations on the existing owned-device inventory, and close the reproduced stale-admission gap.** Preserve explicit device selection, status compatibility, current delivery rules and unknown executor health. This is source work toward the issues, not full acceptance.

Reviewed source: local `ddbb14d8c4f066c48ce416ec25cbe5c14167949f`, tree `2ee6ecc09206ca3f8e64edc34635b3820383e00b`, published equivalent `01c0fc0dc236fbb09d0400f9119df9147c6580f7`. Sixteen inspected files are hash-bound in source-manifest.json. Current issue bodies and addenda are retained alongside this design.

## What the current source proves

- [`cleanDevice`](https://github.com/MulattoTech/MTerm-CLI/blob/01c0fc0dc236fbb09d0400f9119df9147c6580f7/gateway/registry.mjs#L32) derives online solely from a poll within15 seconds, reconnecting before45 seconds and otherwise offline. Pairing alone sets lastSeen null.
- The [poll handler](https://github.com/MulattoTech/MTerm-CLI/blob/01c0fc0dc236fbb09d0400f9119df9147c6580f7/gateway/registry.mjs#L545) validates capacity0–4, defaults omitted capacity to4 for legacy delivery, and refreshes lastSeen. The capacity offer is not retained. Zero slots still refresh presence and process cancellation/expiry.
- The actual [agent loop](https://github.com/MulattoTech/MTerm-CLI/blob/01c0fc0dc236fbb09d0400f9119df9147c6580f7/src/remote/agent.ts#L225) holds slots through execution/cleanup/result settlement. Its local online event occurs after valid poll parsing. An inbound request at the gateway cannot prove that return path succeeded.
- The [read adapter](https://github.com/MulattoTech/MTerm-CLI/blob/01c0fc0dc236fbb09d0400f9119df9147c6580f7/src/remote/adapter.ts#L45) is constructed before polling; no independent continuing executor-health attestation exists. A successful result is historical agent-reported evidence, not proof all later calls can run.
- [Routing](https://github.com/MulattoTech/MTerm-CLI/blob/01c0fc0dc236fbb09d0400f9119df9147c6580f7/gateway/app.mjs#L159) already requires an exact deviceId, owner/grant/capability admission and bounded job identity. It has no automatic device fallback.

## Concrete reproduced gap

The [enqueue freshness check](https://github.com/MulattoTech/MTerm-CLI/blob/01c0fc0dc236fbb09d0400f9119df9147c6580f7/gateway/registry.mjs#L635) occurs before asynchronous job-list and active-lease reads. Starting at14,999ms age and advancing one millisecond during either read still produces200/queued while inventory reports reconnecting. The same device at15,000ms on entry correctly produces409/device_offline.

The owned `freshness-regressions.test.mjs` has **actual RED: two failing boundary cases, two passing controls**, with no skips/cancellations. It imports the unchanged frozen registry, uses in-memory storage and controlled time, and makes no network request. The raw TAP is `freshness-red.tap`. `current-observations.mjs` additionally reproduces zero-capacity online presence, legacy default delivery, consumed offers and gateway-online/agent-reconnecting disagreement.

## Proposed contract

Append one explicitly whitelisted `observations` object to the existing device record:

| Observation | Meaning and bound |
| --- | --- |
| Registration | Paired, derived from the existing owned/unrevoked record; never executable readiness. |
| Poll | Server observation time from lastSeen; an authenticated inbound poll was received. It does not prove a persistent connection or successful response delivery. |
| Last capacity offer | Timestamp plus explicit integer0–4; null for legacy omission. It may already have been consumed in that poll reply. Never label it current free capacity. |
| Last accepted result | Null or server timestamp plus success/error outcome after the matching authorized, unexpired, bounded agentResult is accepted. No body, argument, path, request ID or error string. |
| Executor health | Explicitly unknown. Presence, capacity or a prior accepted result cannot upgrade it. |

Attach the capacity observation to the existing authenticated device write. Every valid legacy poll replaces the prior offer with null, avoiding a stale positive report. Malformed/unauthenticated polls must not refresh it. Store the result observation only on successful completion of the existing agentResult acceptance path; a rejected/replayed/expired result must not update it. Result acceptance must not refresh lastSeen or capacity.

Keep `status` and normal15s/45s thresholds for compatibility, explaining it as poll presence. Render the offer and accepted-result timestamps separately from existing registry-admission counts. An agent can offer capacity while completed unconsumed results still fill registry admission. Use existing textContent rendering.

No poll input or wire-version change is needed. The public no-argument MCP list receives the intentional additive output field; [OCC-13](https://github.com/MulattoTech/MTerm-CLI/blob/01c0fc0dc236fbb09d0400f9119df9147c6580f7/tests/remote-occupancy.test.mjs#L1157) should continue asserting an exact whitelist: legacy fields plus observations. Keep registryAdmission absent from MCP inventory and retain all sensitive-field negatives. Strict external shape consumers may need to accept this documented addition.

## Admission correction

Use one age helper. Admit only a valid timestamp with `0 <= now - lastSeen < 15000`, and repeat that check **after all asynchronous job/active reads, immediately before the first admission write**. Keep the existing device_offline result, explicit target, queue capacity, grant/ownership checks and zero-offer queuing semantics. This is a final decision check; it does not promise the device remains reachable until execution or response delivery.

## Focused regression plan

1. Port the two causal freshness RED cases unchanged, keeping both controls and proving no job/active writes on denial. Add exact thresholds and future/invalid timestamp cases.
2. Cover no poll, zero/positive offers, legacy omission after a previous positive offer, malformed offer and an offer consumed in the same response. Preserve cancellation/expiry processing and fallback4 delivery.
3. Cover accepted success/error results and rejected expired, replayed, revoked, mismatched, malformed and oversized results. Only accepted results update the bounded observation.
4. Verify owner filtering, epoch/device revocation, bounded output and secret/result sentinels through actual dashboard/MCP API paths. Extend the exact inventory whitelist deliberately.
5. Exercise the existing dashboard script and occupancy suite: plain text labels, separate admission/presence/result/capacity, no Ready claim. Verify missing or stale explicitly selected device still fails even when another device is fresh.

Implementation can stay in existing gateway registry/dashboard code, focused tests and documentation. The agent/poll protocol need not change. Do not expand this slice into version/update telemetry, labels/groups, executor-health probing, new target defaults, profile tuple routing or a framework. Those remain separate acceptance work under #58/#62 and related owners. No production change or whole-requirement credit is implied.
