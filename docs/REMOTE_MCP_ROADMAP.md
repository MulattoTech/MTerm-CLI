# MTerm-CLI remote MCP roadmap

**Acceptance: 0 / 12 — NOT PASS.** The deployed read-only gateway has now passed a real Cloudflare-to-Windows smoke with the supported MCP SDK: two devices paired with Windows DPAPI protection, returned exact expected file data, enforced negative authorization/root/mutation checks and respected revocation. This is a tested remote slice; none of the twelve WEB issues has met its full acceptance contract. The ledger remains independent of the 48-item local Codex/Desktop Commander parity gate and the 300-item broad product maturity score.

![Remote MCP acceptance: 0 of 12](roadmap/bars/remote-web.svg)

Reviewed on **2026-11-02 UTC** against [`14971ac54c6b4b99a27f20c8be82d97137f11bc2`](https://github.com/MulattoTech/MTerm-CLI/commit/14971ac54c6b4b99a27f20c8be82d97137f11bc2), following the initial `08973d2` integration checkpoint. The deployed Worker source is separately pinned below. The live [epic #53](https://github.com/MulattoTech/MTerm-CLI/issues/53) and issues #54–65 were read for their acceptance criteria; all twelve remain open and unassigned. The integration PR is **pending**. The machine-readable companion is [remote-web-progress.json](roadmap/remote-web-progress.json).

## Observed staging and verification boundary

| Surface | Observation |
| --- | --- |
| Worker | `mterm-gateway-staging` is deployed to restricted staging. |
| Remote MCP | [https://mcp-staging.m-techlabs.com/mcp](https://mcp-staging.m-techlabs.com/mcp); anonymous MCP returned **401**. |
| OAuth discovery | Both metadata endpoints on [https://mcp-staging.m-techlabs.com](https://mcp-staging.m-techlabs.com) returned **200**. |
| Private dashboard | [https://mterm-staging.m-techlabs.com](https://mterm-staging.m-techlabs.com); anonymous requests returned Access **302**, while the temporary Access service identity authenticated successfully. |
| Gateway fixture tests | **14/14 groups passed**, with real signature checks, synthetic identities and in-memory Durable Object storage. |
| Windows local tests | Pinned TypeScript compile **PASS** on **Node 24.21.0**; **33/33 focused** and **149/149 full tests passed**, with **no skips or cancellations**. Full duration **33,685 ms**; five native Windows 8.3 cases ran. Package/managed-Codex and exact CI gates remain separate. |
| Live SDK/Windows smoke | **11/11 checks passed** in the [sanitized run report](validation/2026-11-02-remote-staging-smoke.json); SDK **2.3.0** used StreamableHTTPClientTransport without fallback and discovered **six read-only tools**. |
| Actual tool use | SDK inventory found two Windows devices. Both real FileService reads matched the expected SHA-256 values; raw file contents are absent from the report. |
| Denial and revocation | Wrong pairing/device codes, pairing replay, wrong PKCE/resource, OAuth code replay, cross-device credentials, mutation and root escape were denied. Revoking one device stopped it while the other remained usable; OAuth revocation caused MCP **401**. |
| Cleanup | Synthetic devices/grants revoked, agents stopped, SDK closed, and only created local fixtures removed. |
| Human clients | Owner Google/Access login, human consent/browser callback and ChatGPT connector acceptance are **explicitly unverified**. |

The Windows suite used source `14971ac54c6b4b99a27f20c8be82d97137f11bc2`, including canonical-target fix `bbf1d0e9b75cf153243a4722ad1ab91392445540` and the native 8.3 fixture correction. The integration owner verified identical Windows/root source bytes. The five real 8.3 cases include private policy-file protection, private filenames and missing leaves with canonical parents. Full issue acceptance remains **0/12**.

The live run is `2026-11-02T00-56-44-313Z-8cdbd4f8-8e08-4517-97f1-9683573132be`, from `2026-11-02T00:56:44.314Z` to `2026-11-02T00:57:05.458Z`. It used a genuine temporary Cloudflare Access **service principal** and a manual S256 PKCE/consent exchange. It did not visit a human browser callback or connect ChatGPT. Those distinctions are explicit booleans in the report.

### Deployment identity

- **Worker version:** `2083411f-68a7-4ec8-9ecc-5c2473ad09b9`.
- **Deployed source:** [`305c89c88a10f4c9243096e3d1125bde76f17563`](https://github.com/MulattoTech/MTerm-CLI/commit/305c89c88a10f4c9243096e3d1125bde76f17563); it matches the live report's build field.
- **Immutable artifact SHA-256:** `f76e37d77c218bc9c2bc9203346ec98d590e5a69b7fef285bcd16792ae32c0f1`.
- **Evidence scope:** the integration owner supplied the Cloudflare version/artifact stamp; the smoke report records the deployed build and actual runtime results. Complete reproducible infrastructure/binding configuration, dry-run and rollback validation remain WEB-008 work.

## Requirement status and remaining effort

Stages describe implementation evidence and do not award acceptance or a completion percentage. “Live smoke passed” denotes only the recorded service-identity/SDK scope. Remaining hours are engineering judgment for implementation, integration and validation, excluding waits for human identity/client access, CI and owner decisions. Shared tests overlap across rows, so these ranges must not be summed as a project schedule. **Every ETA is Unscheduled.** Dependencies name needed deliverables, not a requirement that other issues be closed first.

| Requirement / issue | Scope | Current stage | Remaining engineering hours | ETA |
| --- | --- | --- | --- | --- |
| [WEB-001 / #54](https://github.com/MulattoTech/MTerm-CLI/issues/54) | Authenticated Streamable HTTP and standards discovery | Implemented; live smoke passed | 2–6 | Unscheduled |
| [WEB-002 / #55](https://github.com/MulattoTech/MTerm-CLI/issues/55) | Per-client OAuth grants, scopes and revocation | Implemented; live smoke passed | 5–13 | Unscheduled |
| [WEB-003 / #56](https://github.com/MulattoTech/MTerm-CLI/issues/56) | One-time device pairing and verification | Implemented; live smoke passed | 5–10 | Unscheduled |
| [WEB-004 / #57](https://github.com/MulattoTech/MTerm-CLI/issues/57) | Outbound agent, reconnect, heartbeat and shutdown | Implemented; live smoke passed | 5–14 | Unscheduled |
| [WEB-005 / #58](https://github.com/MulattoTech/MTerm-CLI/issues/58) | Device inventory, presence, capabilities and last seen | Implemented; live smoke passed | 4–10 | Unscheduled |
| [WEB-006 / #59](https://github.com/MulattoTech/MTerm-CLI/issues/59) | Device/client revocation, rotation and local logout | Partially implemented | 9–23 | Unscheduled |
| [WEB-007 / #60](https://github.com/MulattoTech/MTerm-CLI/issues/60) | Private dashboard and client onboarding | Implemented preview | 9–20 | Unscheduled |
| [WEB-008 / #61](https://github.com/MulattoTech/MTerm-CLI/issues/61) | Cloudflare deployment and secure environment ingress | Staging deployed | 8–16 | Unscheduled |
| [WEB-009 / #62](https://github.com/MulattoTech/MTerm-CLI/issues/62) | Authorized relay and verified remote read | Implemented; live smoke passed | 8–16 | Unscheduled |
| [WEB-010 / #63](https://github.com/MulattoTech/MTerm-CLI/issues/63) | Authenticated diagnostics and privacy-safe audit | Partially implemented | 8–18 | Unscheduled |
| [WEB-011 / #64](https://github.com/MulattoTech/MTerm-CLI/issues/64) | Remote setup, supervision and safe updates | Partially implemented | 20–50 | Unscheduled |
| [WEB-012 / #65](https://github.com/MulattoTech/MTerm-CLI/issues/65) | Threat model, sanitized fixtures and full acceptance | Partially implemented | 18–44 | Unscheduled |

## Recorded evidence

- **HAR-AUDIT — sanitized research:** 251-request HAR structural audit; no original vendor remote call, completed pairing or revocation proof. No raw HAR credentials/assets included. Sources: [docs/research/DESKTOP_COMMANDER_REMOTE_HAR_2026-10-16.md](research/DESKTOP_COMMANDER_REMOTE_HAR_2026-10-16.md).
- **GATEWAY-SOURCE — implementation:** Own read-only gateway, signed Access identity verification, OAuth, pairing, bounded registry and private dashboard. Sources: [gateway/app.mjs](../gateway/app.mjs), [gateway/security.mjs](../gateway/security.mjs), [gateway/registry.mjs](../gateway/registry.mjs), [gateway/dashboard.mjs](../gateway/dashboard.mjs), [scripts/build-gateway.mjs](../scripts/build-gateway.mjs), [docs/ai/changes/2026-11-02-remote-gateway.json](ai/changes/2026-11-02-remote-gateway.json).
- **GATEWAY-TESTS — fixture tests:** 14/14 gateway test groups passed on Linux Node24.22.1, including independent security review rerun. **Limit:** Real cryptographic signatures; synthetic identities and in-memory Durable Object fixture. Not live OAuth or Cloudflare/Windows end-to-end proof. Sources: [tests/remote-gateway.test.mjs](../tests/remote-gateway.test.mjs), [docs/ai/changes/2026-11-02-remote-gateway.json](ai/changes/2026-11-02-remote-gateway.json).
- **AGENT-SOURCE — implementation:** Opt-in foreground agent, FileService read adapter, root/device-bound credential storage and six management commands; later fixes are listed per requirement. Sources: [src/remote/protocol.ts](../src/remote/protocol.ts), [src/remote/adapter.ts](../src/remote/adapter.ts), [src/remote/agent.ts](../src/remote/agent.ts), [src/remote/state.ts](../src/remote/state.ts), [src/remote/cli.ts](../src/remote/cli.ts), [src/cli.ts](../src/cli.ts), [docs/ai/changes/2026-11-02-remote-agent.json](ai/changes/2026-11-02-remote-agent.json).
- **WINDOWS-FOCUSED — actual Windows local tests:** Integration owner reports pinned TypeScript compile PASS on Windows Node 24.21.0 and 13 remote test groups PASS, including actual Windows DPAPI. **Limit:** This historical focused checkpoint is supplemented by WINDOWS-FINAL. Package/managed-Codex and exact published CI gates remain pending; earlier provenance retains its earlier 34/35 checkpoint. Sources: [tests/remote-agent.test.mjs](../tests/remote-agent.test.mjs), [tests/remote-adapter.test.mjs](../tests/remote-adapter.test.mjs), [tests/remote-state.test.mjs](../tests/remote-state.test.mjs), [docs/ai/changes/2026-11-02-remote-agent.json](ai/changes/2026-11-02-remote-agent.json).
- **STAGING-HTTP — live deployment boundary:** Deployed Worker mterm-gateway-staging on two HTTPS hosts; live report confirms both discovery endpoints HTTP200, anonymous MCP HTTP401 and anonymous private dashboard HTTP302. **Limit:** These HTTP boundary observations are supplemented by LIVE-SMOKE. They still do not establish human Google/Access sign-in or ChatGPT acceptance. Sources: [https://mcp-staging.m-techlabs.com/.well-known/oauth-protected-resource/mcp](https://mcp-staging.m-techlabs.com/.well-known/oauth-protected-resource/mcp), [https://mcp-staging.m-techlabs.com/.well-known/oauth-authorization-server](https://mcp-staging.m-techlabs.com/.well-known/oauth-authorization-server), [https://mcp-staging.m-techlabs.com/mcp](https://mcp-staging.m-techlabs.com/mcp), [https://mterm-staging.m-techlabs.com](https://mterm-staging.m-techlabs.com), [docs/validation/2026-11-02-remote-staging-smoke.json](validation/2026-11-02-remote-staging-smoke.json).
- **OWNER-GUIDE — current integration documentation:** Owner setup/rollback instructions and a secret-safe staging smoke harness were committed after the initial 08973d2 review base. A harness is not a passing test result. Sources: [docs/REMOTE_MCP.md](REMOTE_MCP.md), [scripts/verify-remote-staging.mjs](../scripts/verify-remote-staging.mjs).
- **LIVE-SMOKE — live Cloudflare / real Windows / supported SDK:** 11/11 checks passed using a genuine temporary Cloudflare Access service principal, manual S256 PKCE and @modelcontextprotocol/client 2.3.0 StreamableHTTPClientTransport without fallback. Two Windows Node 24.21.0 devices paired with current-user DPAPI; SDK initialize, all six tools, inventory and two real FileService reads matched exact expected SHA-256 values. Wrong pair/device codes, pairing replay, wrong PKCE/resource, authorization-code replay, cross-device credentials, mutation and outside-root access were denied. Revoking one device stopped it while the second remained usable; OAuth revocation caused subsequent MCP HTTP401. Synthetic devices/grants were revoked, agents stopped, SDK closed and only created local fixtures removed. **Limit:** Uses one synthetic owner identity and a manual HTTP consent exchange. Human Google login/consent, browser callback and ChatGPT are false in the report. Full two-client/two-user isolation, refresh/expiry, network faults/soak, installed lifecycle and all-platform gates are not certified by this smoke. Sources: [docs/validation/2026-11-02-remote-staging-smoke.json](validation/2026-11-02-remote-staging-smoke.json), [scripts/verify-remote-staging.mjs](../scripts/verify-remote-staging.mjs).

- **WINDOWS-FINAL — actual Windows full deterministic suite:** **33/33 focused and 149/149 full tests passed** on Node 24.21.0, with five native 8.3 cases, no skips/cancellations and 33,685 ms full duration. Source 14971ac includes canonical-target security fix bbf1d0e; Windows/root bytes were verified identical. Sources: [handoff](HANDOFF.md), [Today Candidate](TODAY_CANDIDATE.md), [policy alias tests](../tests/policy-alias.test.mjs), [config tests](../tests/compat-config.test.mjs). **Remaining:** reviewed build/check, package/isolated-link, pinned managed Codex 0.160.1 and exact published CI.

## Requirement details

### WEB-001 — Authenticated Streamable HTTP and standards discovery

**Issue:** [#54](https://github.com/MulattoTech/MTerm-CLI/issues/54) · **Priority:** P0 · **Stage:** Implemented; live smoke passed · **Accepted:** no · **ETA:** Unscheduled.

**Acceptance contract:** Implement a separate MTechLabs HTTPS /mcp endpoint with valid MCP initialize/tools/list, protected resource metadata, OAuth authorization-server discovery and client interoperability. Require authentication before any tool dispatch; do not expose a public unauthenticated listener. Prove a client can discover but not invoke tools without authorization.

**Current evidence:** Public discovery and bearer-gated MCP are deployed. The real SDK 2.3.0 initialized over Streamable HTTP without fallback and discovered all six read-only tools; discovery returned 200 and anonymous MCP returned 401. Evidence records: `GATEWAY-SOURCE`, `GATEWAY-TESTS`, `STAGING-HTTP`, `LIVE-SMOKE`.

**New live evidence:** Supported SDK initialized and listed all six tools against the deployed endpoint with live authentication and anonymous dispatch denial.

**Remaining work, dependencies and blockers:**

- Complete the supported-client/protocol matrix and live error handling for JSON POST, unsupported GET/SSE, Origin, content negotiation and protocol revisions; retain the actual negotiated SDK behavior. **Effort:** 2–6 engineering hours. **Depends on:** Recorded SDK 2.3.0 smoke; WEB-012 protocol regression matrix. **Blocker:** One SDK smoke is not full standards/client interoperability certification; human clients remain unverified.

**Implementing commits:** [3d207b3](https://github.com/MulattoTech/MTerm-CLI/commit/3d207b367b23a6e7c3a2dbcd8921450503222cca), [a3a05cf](https://github.com/MulattoTech/MTerm-CLI/commit/a3a05cf5c4dd0fe2d04ec4ae91917905b9692295), [ad3a370](https://github.com/MulattoTech/MTerm-CLI/commit/ad3a370a2be5065b7b225b5d81efa3d3e682d50a), [305c89c](https://github.com/MulattoTech/MTerm-CLI/commit/305c89c88a10f4c9243096e3d1125bde76f17563). **Integration PR:** pending; no acceptance or issue closure is implied.

### WEB-002 — Per-client OAuth grants, scopes and revocation

**Issue:** [#55](https://github.com/MulattoTech/MTerm-CLI/issues/55) · **Priority:** P0 · **Stage:** Implemented; live smoke passed · **Accepted:** no · **ETA:** Unscheduled.

**Acceptance contract:** Implement standards-compatible authorization/token lifecycle for each client, scoped permission grants, expiry/refresh/revocation and audit. Protect CSRF/PKCE and validate token audience. Prove two clients cannot reuse/expand each other's grants and revoking one takes effect immediately.

**Current evidence:** OAuth S256 PKCE, exact resource binding, expiring grants, refresh rotation and replay/revocation are implemented. Live manual service-identity authorization rejected wrong PKCE/resource and code replay; grant revocation caused subsequent SDK MCP HTTP401. Evidence records: `GATEWAY-SOURCE`, `GATEWAY-TESTS`, `LIVE-SMOKE`.

**New live evidence:** Real service-identity manual PKCE exchange, wrong PKCE/resource and authorization-code replay denial, followed by OAuth grant revocation and MCP HTTP 401.

**Remaining work, dependencies and blockers:**

- Complete live two-client grant isolation, refresh rotation/replay, expiry, exact callback and CSRF negatives; prove one client cannot expand or exchange another client's grant. **Effort:** 3–7 engineering hours. **Depends on:** Recorded live OAuth smoke; Two separately registered synthetic clients. **Blocker:** The smoke used one service identity/client lifecycle; live two-client isolation and refresh/expiry coverage remain pending.
- Complete and record owner browser consent and the desired client's authorization lifecycle independently of the service-principal harness. **Effort:** 2–6 engineering hours. **Depends on:** WEB-007 owner dashboard access; Owner Google/Access session and eligible client account. **Blocker:** Human Google sign-in, consent/callback and ChatGPT connector authorization are explicitly unverified.

**Implementing commits:** [3d207b3](https://github.com/MulattoTech/MTerm-CLI/commit/3d207b367b23a6e7c3a2dbcd8921450503222cca), [ad3a370](https://github.com/MulattoTech/MTerm-CLI/commit/ad3a370a2be5065b7b225b5d81efa3d3e682d50a), [305c89c](https://github.com/MulattoTech/MTerm-CLI/commit/305c89c88a10f4c9243096e3d1125bde76f17563). **Integration PR:** pending; no acceptance or issue closure is implied.

### WEB-003 — One-time device pairing and verification

**Issue:** [#56](https://github.com/MulattoTech/MTerm-CLI/issues/56) · **Priority:** P0 · **Stage:** Implemented; live smoke passed · **Accepted:** no · **ETA:** Unscheduled.

**Acceptance contract:** Implement a one-time expiration-bound pairing code, local agent initiation and authenticated dashboard approval requiring displayed code match. Prove mismatch/expired/replayed code is refused and secrets never appear in logs or Git.

**Current evidence:** Five-minute, single-use pairing and protected state are implemented. Two real Windows devices completed staging pairing and DPAPI round trips; wrong displayed codes, wrong device codes and consumed pairing replay were rejected. Evidence records: `GATEWAY-SOURCE`, `GATEWAY-TESTS`, `AGENT-SOURCE`, `WINDOWS-FOCUSED`, `LIVE-SMOKE`.

**New live evidence:** Two real Windows enrollments, wrong-pair-code HTTP 400, wrong-device-code HTTP 403 and consumed-pairing HTTP 410 with current-user DPAPI persistence.

**Remaining work, dependencies and blockers:**

- Exercise live expiration, interrupted approval/credential persistence and restart failure paths, proving no extra usable enrollment can emerge from a failed operation. **Effort:** 3–6 engineering hours. **Depends on:** Recorded two-device staging pairing; WEB-004 lifecycle fault tests. **Blocker:** Consumed replay and code mismatches passed; expiry/crash/persistence-failure coverage in the real runtime remains pending.
- Finish the owner-visible browser code-match flow and sanitized pairing log/state privacy review. **Effort:** 2–4 engineering hours. **Depends on:** WEB-007 human dashboard session; WEB-012 secret-sentinel review. **Blocker:** The smoke used authenticated service-identity API approval; human approval and complete deployed log/state inspection are unverified.

**Implementing commits:** [3d207b3](https://github.com/MulattoTech/MTerm-CLI/commit/3d207b367b23a6e7c3a2dbcd8921450503222cca), [9ed607f](https://github.com/MulattoTech/MTerm-CLI/commit/9ed607f37c30db48e96bf9fda36ce168705ff992), [1730302](https://github.com/MulattoTech/MTerm-CLI/commit/17303028e4f84c41d994f03512f7f45436dae9c5), [e3b6154](https://github.com/MulattoTech/MTerm-CLI/commit/e3b61548e760a16f0902f672adb16b5eaac6827e). **Integration PR:** pending; no acceptance or issue closure is implied.

### WEB-004 — Outbound agent, reconnect, heartbeat and shutdown

**Issue:** [#57](https://github.com/MulattoTech/MTerm-CLI/issues/57) · **Priority:** P0 · **Stage:** Implemented; live smoke passed · **Accepted:** no · **ETA:** Unscheduled.

**Acceptance contract:** Build a local opt-in device agent with authenticated outbound connectivity, bounded backoff, heartbeat, offline behavior and clean termination. Never open an inbound workstation port by default. Ensure reconnect does not replay state-changing tool calls.

**Current evidence:** Foreground outbound polling carried actual Windows FileService results through Cloudflare. Both agents reached online state; device A stopped on revocation and device B stopped during owned cleanup. Backoff, cancellation and no-redelivery also have local transport tests. Evidence records: `AGENT-SOURCE`, `WINDOWS-FOCUSED`, `LIVE-SMOKE`.

**New live evidence:** Two real outbound Windows agents reached online, completed requests and stopped with recorded revoked/stopped reasons; all fixture agents were cleaned up.

**Remaining work, dependencies and blockers:**

- Interrupt real connectivity and test heartbeat/offline/reconnect, in-flight cancellation and no duplicate operation after restart or delayed result delivery. **Effort:** 3–8 engineering hours. **Depends on:** Recorded live agent/read path; WEB-009 network fault scenarios. **Blocker:** The successful smoke did not inject network loss, backoff exhaustion or restart during a delivered request.
- Verify packaged start/status/stop/restart, stale-lock recovery instructions and absence of an inbound workstation listener. **Effort:** 2–6 engineering hours. **Depends on:** Final package/managed-Codex and exact CI gates; WEB-011 on-demand lifecycle. **Blocker:** Final installed lifecycle rerun is pending; crash recovery deliberately does not steal state locks.

**Implementing commits:** [a3a05cf](https://github.com/MulattoTech/MTerm-CLI/commit/a3a05cf5c4dd0fe2d04ec4ae91917905b9692295), [9ed607f](https://github.com/MulattoTech/MTerm-CLI/commit/9ed607f37c30db48e96bf9fda36ce168705ff992), [a4eb9c3](https://github.com/MulattoTech/MTerm-CLI/commit/a4eb9c36a9c78a4c14b21501e5593543bae7949e), [1730302](https://github.com/MulattoTech/MTerm-CLI/commit/17303028e4f84c41d994f03512f7f45436dae9c5), [9cc4690](https://github.com/MulattoTech/MTerm-CLI/commit/9cc46909ad038dc1fc3ab26c236bdf3129c6788f). **Integration PR:** pending; no acceptance or issue closure is implied.

### WEB-005 — Device inventory, presence, capabilities and last seen

**Issue:** [#58](https://github.com/MulattoTech/MTerm-CLI/issues/58) · **Priority:** P1 · **Stage:** Implemented; live smoke passed · **Accepted:** no · **ETA:** Unscheduled.

**Acceptance contract:** Authenticated portal lists only user-owned devices, including online/connecting/offline states, last seen and supported tool capabilities. Presence changes reflect authenticated heartbeats; stale devices become offline. No device auth tokens are returned to ordinary UI.

**Current evidence:** Owner-scoped inventory, capabilities and heartbeat-derived presence are implemented. The live SDK listed exactly two paired Windows devices, routed independent reads, and observed that revoking one did not disable the other. Evidence records: `GATEWAY-SOURCE`, `GATEWAY-TESTS`, `AGENT-SOURCE`, `LIVE-SMOKE`.

**New live evidence:** Live inventory returned the two fixture devices; both reached online and selected-device operations stayed distinct.

**Remaining work, dependencies and blockers:**

- Complete two-owner inventory isolation and time-based online/reconnecting/offline transitions through real disconnect/reconnect and revocation. **Effort:** 2–6 engineering hours. **Depends on:** Recorded two-device inventory; WEB-004 connectivity fault tests; Second synthetic owner identity. **Blocker:** The smoke used one owner with two devices; cross-owner inventory and stale-heartbeat transitions are not yet live-tested.
- Inspect authenticated dashboard/API privacy, escaped device names/capabilities and empty/error states without credential exposure. **Effort:** 2–4 engineering hours. **Depends on:** WEB-007 authenticated browser view; WEB-012 privacy review. **Blocker:** API presence is proven narrowly; full browser/privacy and presentation acceptance remains pending.

**Implementing commits:** [3d207b3](https://github.com/MulattoTech/MTerm-CLI/commit/3d207b367b23a6e7c3a2dbcd8921450503222cca), [a3a05cf](https://github.com/MulattoTech/MTerm-CLI/commit/a3a05cf5c4dd0fe2d04ec4ae91917905b9692295), [9ed607f](https://github.com/MulattoTech/MTerm-CLI/commit/9ed607f37c30db48e96bf9fda36ce168705ff992). **Integration PR:** pending; no acceptance or issue closure is implied.

### WEB-006 — Device/client revocation, rotation and local logout

**Issue:** [#59](https://github.com/MulattoTech/MTerm-CLI/issues/59) · **Priority:** P0 · **Stage:** Partially implemented · **Accepted:** no · **ETA:** Unscheduled.

**Acceptance contract:** Support owner-confirmed revoke-one/revoke-all with immediate relay denial, credential invalidation/rotation, local agent logout, audit entries and stale-session rejection. Test that previously authorized sessions cannot resume after revocation.

**Current evidence:** Live revoke-one invalidated the selected device with HTTP410, stopped its agent and denied further reads while the second device remained usable. OAuth grant revocation caused MCP HTTP 401 and cleanup revoked all synthetic state. Revoke-all epochs are fixture-tested; device replacement currently uses revoke/re-pair. Evidence records: `GATEWAY-SOURCE`, `GATEWAY-TESTS`, `AGENT-SOURCE`, `WINDOWS-FOCUSED`, `LIVE-SMOKE`.

**New live evidence:** Live revoke-one, selected-agent shutdown, second-device continuity, OAuth revoke/MCP HTTP 401 and synthetic cleanup succeeded.

**Remaining work, dependencies and blockers:**

- Test live revoke-all with unclaimed pairings/codes and in-flight work, plus old-credential restart and local logout failure paths. **Effort:** 3–7 engineering hours. **Depends on:** Recorded device/grant revocation smoke; WEB-002 multi-client lifecycle; WEB-004 restart tests. **Blocker:** Single-device and grant revocation passed; comprehensive revoke-all/stale-restart behavior remains pending.
- Define and implement/test device credential replacement/rotation for issue #59, or obtain explicit issue acceptance of revoke-and-re-pair, including failure and rollback. **Effort:** 6–16 engineering hours. **Depends on:** Owner security decision on device credential lifecycle; Existing protected credential store. **Blocker:** No separately verified device-token rotation workflow exists; OAuth refresh rotation does not close that gap.

**Implementing commits:** [3d207b3](https://github.com/MulattoTech/MTerm-CLI/commit/3d207b367b23a6e7c3a2dbcd8921450503222cca), [9ed607f](https://github.com/MulattoTech/MTerm-CLI/commit/9ed607f37c30db48e96bf9fda36ce168705ff992), [1730302](https://github.com/MulattoTech/MTerm-CLI/commit/17303028e4f84c41d994f03512f7f45436dae9c5), [9cc4690](https://github.com/MulattoTech/MTerm-CLI/commit/9cc46909ad038dc1fc3ab26c236bdf3129c6788f). **Integration PR:** pending; no acceptance or issue closure is implied.

### WEB-007 — Private dashboard and client onboarding

**Issue:** [#60](https://github.com/MulattoTech/MTerm-CLI/issues/60) · **Priority:** P1 · **Stage:** Implemented preview · **Accepted:** no · **ETA:** Unscheduled.

**Acceptance contract:** Provide a private web dashboard with accessible onboarding, device verification, status, revocation, scoped connection/approval view, copyable MCP URL and client-specific setup steps. It must identify unavailable capabilities rather than fake success.

**Current evidence:** Dashboard and consent UI code covers pairing, presence, read-only permissions, grants, cancellation, audit and revoke controls. Live Access service authentication and management API approval work; unauthenticated browsers redirect to Access. No human UI or connector session was exercised. Evidence records: `GATEWAY-SOURCE`, `GATEWAY-TESTS`, `STAGING-HTTP`, `OWNER-GUIDE`, `LIVE-SMOKE`.

**New live evidence:** Real staging Access service identity reached authenticated management APIs; anonymous dashboard requests redirected HTTP 302.

**Remaining work, dependencies and blockers:**

- Complete owner Google/Access sign-in, device verification and the desired client's consent/connector setup; record each actual client's result independently. **Effort:** 3–8 engineering hours. **Depends on:** Owner-approved identity/account availability; WEB-002 authorization; WEB-003 pairing. **Blocker:** A 302 Access redirect does not prove Google sign-in; human sign-in and ChatGPT connection are unverified.
- Exercise keyboard/screen-reader and narrow-screen onboarding, errors, disabled capabilities, confirmation controls, and tested client-specific instructions. **Effort:** 6–12 engineering hours. **Depends on:** Authenticated browser session; WEB-005 live inventory; WEB-006 revoke behavior. **Blocker:** No browser accessibility/visual acceptance or completed client-specific onboarding has been recorded.

**Implementing commits:** [3d207b3](https://github.com/MulattoTech/MTerm-CLI/commit/3d207b367b23a6e7c3a2dbcd8921450503222cca), [ad3a370](https://github.com/MulattoTech/MTerm-CLI/commit/ad3a370a2be5065b7b225b5d81efa3d3e682d50a), [305c89c](https://github.com/MulattoTech/MTerm-CLI/commit/305c89c88a10f4c9243096e3d1125bde76f17563). **Integration PR:** pending; no acceptance or issue closure is implied.

### WEB-008 — Cloudflare deployment and secure environment ingress

**Issue:** [#61](https://github.com/MulattoTech/MTerm-CLI/issues/61) · **Priority:** P0 · **Stage:** Staging deployed · **Accepted:** no · **ETA:** Unscheduled.

**Acceptance contract:** Use a user-approved MTechLabs hostname. Configure TLS, Cloudflare Access/OAuth provider, protected resource discovery, dev/staging separation and secrets via deployment secret store. Produce reproducible IaC and dry-run tests. No account/DNS/billing changes without explicit configuration/approval.

**Current evidence:** Worker mterm-gateway-staging is deployed on separate HTTPS MCP/dashboard hosts. Recorded version 2083411f-68a7-4ec8-9ecc-5c2473ad09b9 uses build 305c89c and immutable artifact digest f76e37d77c218bc9c2bc9203346ec98d590e5a69b7fef285bcd16792ae32c0f1. The real SDK/Windows smoke passed 11/11. Evidence records: `GATEWAY-SOURCE`, `STAGING-HTTP`, `OWNER-GUIDE`, `LIVE-SMOKE`.

**New live evidence:** Recorded Worker version/artifact/source identity and live discovery/authenticated Windows SDK smoke.

**Remaining work, dependencies and blockers:**

- Attach reproducible nonsecret Durable Object migration/bindings, Access policy and environment configuration to the versioned deployment record. **Effort:** 2–4 engineering hours. **Depends on:** Recorded Worker/artifact/source stamp; Integration owner's Cloudflare configuration. **Blocker:** Runtime/version evidence is recorded; complete reproducible infrastructure/binding configuration is still incomplete.
- Prove dry-run environment isolation, secret-store handling, the MCP disable switch and recorded-version rollback using the deployment controls. **Effort:** 6–12 engineering hours. **Depends on:** Reproducible deployment configuration; Recorded immutable artifact. **Blocker:** The successful deployment/smoke does not certify dry-run, rollback or the complete secrets/configuration lifecycle.

**Implementing commits:** [3d207b3](https://github.com/MulattoTech/MTerm-CLI/commit/3d207b367b23a6e7c3a2dbcd8921450503222cca), [ad3a370](https://github.com/MulattoTech/MTerm-CLI/commit/ad3a370a2be5065b7b225b5d81efa3d3e682d50a), [305c89c](https://github.com/MulattoTech/MTerm-CLI/commit/305c89c88a10f4c9243096e3d1125bde76f17563). **Integration PR:** pending; no acceptance or issue closure is implied.

### WEB-009 — Authorized relay and verified remote read

**Issue:** [#62](https://github.com/MulattoTech/MTerm-CLI/issues/62) · **Priority:** P0 · **Stage:** Implemented; live smoke passed · **Accepted:** no · **ETA:** Unscheduled.

**Acceptance contract:** Create a protocol-correct authenticated broker routing only to the selected verified device and authorized tool scope; enforce run IDs, request IDs, deadlines, cancellation, output limits, idempotency and no replay of mutations. Prove read-only tool invocation end-to-end with synthetic credentials before enabling write/process tools.

**Current evidence:** A real MCP SDK 2.3.0 session initialized six read-only tools, listed two Windows devices and read two actual FileService markers through the deployed gateway; returned SHA-256 values exactly matched both originals. Cross-device credentials, mutation and outside-root access were denied; revoke-one and grant revocation took effect. Evidence records: `GATEWAY-SOURCE`, `GATEWAY-TESTS`, `AGENT-SOURCE`, `WINDOWS-FOCUSED`, `OWNER-GUIDE`, `LIVE-SMOKE`.

**New live evidence:** Actual HTTPS→gateway→two Windows agents→FileService→SDK reads matched exact hashes without storing raw file contents; specified denial and revocation checks passed.

**Remaining work, dependencies and blockers:**

- Exercise the remaining metadata/list/search read tools and their schema/result bounds through the actual deployed SDK path. **Effort:** 2–4 engineering hours. **Depends on:** Recorded read_file/inventory round trip; Known harmless Windows fixtures. **Blocker:** The live smoke proved read_file and inventory; all other tool methods and boundary cases need live coverage.
- Complete cross-owner/private-path isolation, concurrent/oversized output, deadlines, cancellation and disconnect/restart tests without redelivery. **Effort:** 6–12 engineering hours. **Depends on:** Recorded live relay; WEB-004 connectivity faults; WEB-012 full negative matrix. **Blocker:** Mutation, cross-device credentials and root escape passed; broader isolation and network fault/soak coverage remain pending.

**Implementing commits:** [3d207b3](https://github.com/MulattoTech/MTerm-CLI/commit/3d207b367b23a6e7c3a2dbcd8921450503222cca), [a3a05cf](https://github.com/MulattoTech/MTerm-CLI/commit/a3a05cf5c4dd0fe2d04ec4ae91917905b9692295), [9ed607f](https://github.com/MulattoTech/MTerm-CLI/commit/9ed607f37c30db48e96bf9fda36ce168705ff992), [a4eb9c3](https://github.com/MulattoTech/MTerm-CLI/commit/a4eb9c36a9c78a4c14b21501e5593543bae7949e), [ad3a370](https://github.com/MulattoTech/MTerm-CLI/commit/ad3a370a2be5065b7b225b5d81efa3d3e682d50a), [305c89c](https://github.com/MulattoTech/MTerm-CLI/commit/305c89c88a10f4c9243096e3d1125bde76f17563). **Integration PR:** pending; no acceptance or issue closure is implied.

### WEB-010 — Authenticated diagnostics and privacy-safe audit

**Issue:** [#63](https://github.com/MulattoTech/MTerm-CLI/issues/63) · **Priority:** P1 · **Stage:** Partially implemented · **Accepted:** no · **ETA:** Unscheduled.

**Acceptance contract:** Implement authenticated health diagnostics, service/device tool errors, bounded redacted request audit, and optional per-user usage/limit/reset reporting. No raw prompts/files or billing identifiers in telemetry. Distinguish quota measurement from payment processing; payments are not part of private gateway parity.

**Current evidence:** Minimal public health, authenticated dashboard metadata, safe tool errors, offline local status and bounded metadata-only audit exist. The live smoke returned bounded authorization/device/root-policy errors without raw file content in its evidence report. Full deployed diagnostics/audit review remains incomplete. Evidence records: `GATEWAY-SOURCE`, `GATEWAY-TESTS`, `AGENT-SOURCE`, `OWNER-GUIDE`, `LIVE-SMOKE`.

**New live evidence:** The sanitized live report captured safe statuses, result hashes and cleanup without raw file bodies; no claim of full telemetry/audit retention verification.

**Remaining work, dependencies and blockers:**

- Complete/verify authenticated service-device diagnostics that expose actionable current health and failure causes without returning credentials, request arguments or file bodies. **Effort:** 4–10 engineering hours. **Depends on:** Recorded live agent/tool errors; WEB-007 authenticated browser dashboard; Authenticated diagnostic contract. **Blocker:** The public health response and current dashboard are only partial evidence for issue #63's authenticated diagnostic acceptance.
- Use sentinel secrets and real Durable Object storage to verify audit redaction, ownership isolation, retention/deletion and bounded error reporting; document optional usage reporting as excluded scope unless separately requested. **Effort:** 4–8 engineering hours. **Depends on:** WEB-008 real runtime; WEB-012 privacy/retention tests. **Blocker:** No complete deployed audit/redaction/retention report is attached; optional quota history must not be fabricated.

**Implementing commits:** [3d207b3](https://github.com/MulattoTech/MTerm-CLI/commit/3d207b367b23a6e7c3a2dbcd8921450503222cca), [9ed607f](https://github.com/MulattoTech/MTerm-CLI/commit/9ed607f37c30db48e96bf9fda36ce168705ff992), [9cc4690](https://github.com/MulattoTech/MTerm-CLI/commit/9cc46909ad038dc1fc3ab26c236bdf3129c6788f). **Integration PR:** pending; no acceptance or issue closure is implied.

### WEB-011 — Remote setup, supervision and safe updates

**Issue:** [#64](https://github.com/MulattoTech/MTerm-CLI/issues/64) · **Priority:** P1 · **Stage:** Partially implemented · **Accepted:** no · **ETA:** Unscheduled.

**Acceptance contract:** Provide a reversible interactive installation/configuration flow for MTerm-CLI remote mode, with protected local credential store, service/task option, on-demand start/stop/restart, authenticated pairing and explicit rollback. No auto-start/service creation or privilege escalation without owner opt-in.

**Current evidence:** Preview/apply setup and pair/start/status/stop/revoke commands, ownership locks and protected state are implemented. Two Windows DPAPI agents paired, ran real SDK reads and stopped in the live harness. Service/task supervision and safe update/rollback remain unimplemented. Evidence records: `AGENT-SOURCE`, `WINDOWS-FOCUSED`, `OWNER-GUIDE`, `LIVE-SMOKE`.

**New live evidence:** Actual paired foreground agents and protected credentials worked; fixture teardown stopped owned agents and revoked synthetic state.

**Remaining work, dependencies and blockers:**

- Finish a reversible interactive setup/repair flow and package update/rollback procedure tied to immutable verified artifacts, preserving enrolled roots and credentials. **Effort:** 8–16 engineering hours. **Depends on:** Installed/package validation; WEB-003 working pairing; Existing local setup automation. **Blocker:** Foreground commands do not yet constitute the issue's complete one-command installation and safe update experience.
- Implement an explicitly opted-in service/task option with same-user credential access, bounded restart behavior, on-demand controls and safe removal; preserve preview mode and avoid implicit elevation. **Effort:** 8–24 engineering hours. **Depends on:** Owner-selected supervision mode; Windows protected credential identity; WEB-004 lifecycle tests. **Blocker:** No service, scheduled task or autostart mechanism is implemented; no background readiness claim is justified.
- Verify clean install, upgrade failure, rollback, restart, uninstall and crash recovery on isolated Windows state; record the effect on running requests and local credentials. **Effort:** 4–10 engineering hours. **Depends on:** Reversible installer/update implementation; Opt-in supervision option; WEB-006 revocation. **Blocker:** Installed lifecycle certification and update failure evidence are absent.

**Implementing commits:** [9ed607f](https://github.com/MulattoTech/MTerm-CLI/commit/9ed607f37c30db48e96bf9fda36ce168705ff992), [1730302](https://github.com/MulattoTech/MTerm-CLI/commit/17303028e4f84c41d994f03512f7f45436dae9c5), [9cc4690](https://github.com/MulattoTech/MTerm-CLI/commit/9cc46909ad038dc1fc3ab26c236bdf3129c6788f), [acd1c0b](https://github.com/MulattoTech/MTerm-CLI/commit/acd1c0b08a0b040b295994062f0d3251dc62c174). **Integration PR:** pending; no acceptance or issue closure is implied.

### WEB-012 — Threat model, sanitized fixtures and full acceptance

**Issue:** [#65](https://github.com/MulattoTech/MTerm-CLI/issues/65) · **Priority:** P0 · **Stage:** Partially implemented · **Accepted:** no · **ETA:** Unscheduled.

**Acceptance contract:** Never publish raw HAR. Create sanitized structural fixtures and regression tests for unauthenticated clients, expired/replayed pairing, revoked devices, cross-user leakage, malformed SSE/HTTP, device disconnect, rate limits, read-only round trip and gated exec. Test real supported clients separately; do not declare Cloudflare production PASS from static UI capture.

**Current evidence:** Sanitized HAR analysis, independent gateway review and 14 gateway fixture groups are recorded. The live 11-check smoke adds signed Access service authentication, PKCE negatives, pairing/replay/DPAPI, actual SDK/Windows reads, root/mutation/device denials and revocation. Human-client, broader fault and full platform acceptance remain incomplete. Evidence records: `HAR-AUDIT`, `GATEWAY-TESTS`, `WINDOWS-FOCUSED`, `OWNER-GUIDE`, `LIVE-SMOKE`.

**New live evidence:** Recorded 11/11 live service-identity checks with exact deployment/build and SDK/runtime identities; all synthetic credentials/devices/processes cleaned up.

**Remaining work, dependencies and blockers:**

- Record a complete remote threat model and trace sanitized structural fixtures to actual issue acceptance, including trust boundaries, credential lifetime, local rename-race limits and storage failure behavior. **Effort:** 6–12 engineering hours. **Depends on:** Gateway/agent design and source; Existing HAR-safe research; WEB-006 credential lifecycle decision. **Blocker:** The local-only security document does not yet describe the complete deployed remote boundary; raw HAR must remain excluded.
- Complete deployed negative and fault tests for rate limits, malformed HTTP/unsupported SSE, disconnect/restart, persistence cleanup, cross-user leakage and credential redaction; preserve disabled write/exec. **Effort:** 8–20 engineering hours. **Depends on:** WEB-008 reproducible staging; WEB-009 live relay; WEB-010 diagnostics/audit. **Blocker:** The in-memory storage fixture does not certify Cloudflare persistence, rate/load behavior or the actual network transport.
- Finish the supported-client matrix, reviewed final build/check, package/isolated-link, pinned managed Codex and exact published CI gates; distinguish completed Windows/SDK evidence from owner Google/ChatGPT sessions before acceptance. **Effort:** 4–12 engineering hours. **Depends on:** Remaining WEB-001..011 deliverables; Owner-supported client/account access; Published integration PR. **Blocker:** SDK smoke and Windows 149/149 full tests passed; reviewed build/check, package/managed-Codex, exact published CI and human sign-in/client gates remain pending.

**Implementing commits:** [3d207b3](https://github.com/MulattoTech/MTerm-CLI/commit/3d207b367b23a6e7c3a2dbcd8921450503222cca), [a3a05cf](https://github.com/MulattoTech/MTerm-CLI/commit/a3a05cf5c4dd0fe2d04ec4ae91917905b9692295), [9ed607f](https://github.com/MulattoTech/MTerm-CLI/commit/9ed607f37c30db48e96bf9fda36ce168705ff992), [08973d2](https://github.com/MulattoTech/MTerm-CLI/commit/08973d21a75d79fb699bfb2a6dbd3d070cbb53b8), [ad3a370](https://github.com/MulattoTech/MTerm-CLI/commit/ad3a370a2be5065b7b225b5d81efa3d3e682d50a), [305c89c](https://github.com/MulattoTech/MTerm-CLI/commit/305c89c88a10f4c9243096e3d1125bde76f17563). **Integration PR:** pending; no acceptance or issue closure is implied.

## Evidence slots: completed scope and pending follow-ups

The slot identifiers are retained for continuity. A passed scoped entry does not close its WEB issue. New results must include exact commands, source/deployment identities and sanitized references; unperformed human/fault/platform checks remain unverified.

| Slot | Status | Recorded result or required evidence |
| --- | --- | --- |
| `PENDING-LIVE-OAUTH` | Passed for recorded service-identity scope | Live manual S256 exchange, wrong PKCE/resource/code replay denial and OAuth revoke 401 passed using one temporary Access service identity. Two-client refresh/expiry and human consent remain open. [Report](validation/2026-11-02-remote-staging-smoke.json). |
| `PENDING-LIVE-PAIR` | Passed for recorded service-identity scope | Two Windows devices paired; wrong pair/device codes and pairing replay rejected; real DPAPI round trips passed. Live expiry/crash and human approval remain open. [Report](validation/2026-11-02-remote-staging-smoke.json). |
| `PENDING-SDK-READ` | Passed | SDK 2.3.0 StreamableHTTPClientTransport initialized without fallback, discovered six tools, listed two devices and returned exact SHA-256-matched Windows FileService reads. [Report](validation/2026-11-02-remote-staging-smoke.json). |
| `PENDING-LIVE-FAULTS` | Partially passed | Cross-device credentials, mutation, root escape and device/grant revocation passed. Disconnect/reconnect, cancel, cross-owner, rate/size/soak remain pending. [Report](validation/2026-11-02-remote-staging-smoke.json). |
| `PENDING-HUMAN-GOOGLE` | Explicitly unverified | Owner-performed Google/Access sign-in and dashboard/consent interaction. Access redirect or service credentials are not proof. |
| `PENDING-HUMAN-CHATGPT` | Explicitly unverified | Owner's supported ChatGPT connector registration, consent and real tool call. SDK evidence is recorded separately. |
| `PENDING-DEPLOYMENT-STAMP` | Stamp recorded; follow-ups pending | Worker version, source SHA and artifact digest recorded; reproducible bindings/configuration, dry-run and rollback evidence still pending. [Report](validation/2026-11-02-remote-staging-smoke.json). |
| `PENDING-FINAL-GATES` | Windows full suite passed; other gates pending | Windows 33/33 focused and 149/149 full tests passed, with five native 8.3 cases and no skips. Final reviewed build/check, package/isolated-link, pinned managed Codex 0.160.1, integration PR and exact supported-platform CI remain pending. [Evidence](HANDOFF.md). |

## Scope and acceptance discipline

- Remote tools remain read-only. Gateway and agent independently enforce that boundary; writes and process execution stay disabled.
- The agent runs in the foreground and opens no inbound workstation port. Service/task supervision, unattended startup and safe updates/rollback remain unfinished WEB-011 work.
- Windows pairing credentials use current-user DPAPI. POSIX owner-only files are not encrypted keyring storage. Node filesystem checks do not constitute a handle-anchored sandbox against a hostile local writer.
- The smoke used one temporary owner identity and two devices. It does not replace two-owner/two-client isolation, refresh/expiry, disconnect/reconnect, concurrent/oversized output, long-duration soak or complete installed-platform testing.
- Commercial subscriptions, Stripe and third-party analytics are optional for private hosting. No payment processing or invented quota history is included in this acceptance count.
- The [sanitized HAR audit](research/DESKTOP_COMMANDER_REMOTE_HAR_2026-10-16.md) remains structural research and contains no original vendor remote-read/pairing/revocation proof. Never commit raw HAR credentials, checkout URLs or proprietary frontend assets.
- Follow [remote setup and rollback guidance](REMOTE_MCP.md) for the implemented preview. Existing [local automation](automation/README.md) does not certify remote supervision or human-client acceptance.
- Keep this document and the JSON companion consistent. Close a WEB issue only after its exact criteria have committed, reviewable evidence and the supported-client/platform gates have been evaluated. This update closes no issue and preserves **0/12 accepted**.
