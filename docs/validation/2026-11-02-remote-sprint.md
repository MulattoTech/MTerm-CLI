# MTerm remote staging sprint — verified result, 2026-11-02

The authenticated read-only remote slice passed a real MCP SDK call through the deployed Cloudflare gateway to two Windows fixture agents. The final product-source candidate also passed the full local workflow and the four-platform hosted matrix. This report preserves the distinction between a verified staging slice, owner browser/client acceptance, and complete parity.

## Publication and preserved work

Repository: [MulattoTech/MTerm-CLI](https://github.com/MulattoTech/MTerm-CLI). Integration branch: `feat/remote-mcp-readonly-20261102`. [PR #69](https://github.com/MulattoTech/MTerm-CLI/pull/69) is the authoritative publication record; its final merge SHA and post-merge checks are recorded there rather than guessed from the tested candidate.

- Verified main baseline: `335cf59455aa3d382081b46a5d91b41556a61057`.
- Preserved PR #52 head: `1d900464ba8a36a1121e2ae51ea65c14c3ee41c1`.
- Preserved PR #67 head: `b093a00755296c64d37f1d430c5dde3dfd992f08`.
- Reconciliation merge: `2c6131a`; exact eleven-file unpublished recovery: `0a21d30`.
- **Tested and deployed product source: `b90432a1bc138d59305692a9f74f110a475d0881`.** Later evidence/roadmap documentation commits do not rebuild the deployed modules.
- The separate access-check branch is excluded from integration.

The primary checkout remains at its original head with the same eight modified and three untracked source files. All eleven SHA-256 values still match the initial checkpoint. The two existing valid worktrees retain their original heads/status. [Preservation report](2026-11-02-primary-preservation.json). No reset, clean, force push, user Codex authentication change, automatic OS service installation, or competing AO fleet was used.

## Implemented behavior

The opt-in `remote setup/pair/start/status/stop/revoke` workflow pairs a selected local root and runs an outbound foreground HTTPS agent. Windows credentials use current-user DPAPI and remain outside the shared root; the enrolled root/device/gateway identity is immutable without deliberate reconfiguration. The device adapter reuses the local FileService and independently enforces the tool allowlist, device ID, deadlines and result bounds.

The Worker supplies a separate OAuth authorization-code/S256 PKCE flow for MCP, exact-owner Access identity verification for dashboard/consent, resource/scope-bound opaque credentials, rotation/replay rejection, device/grant revocation, cancellation, request deadlines, bounded registry/audit retention and a SQLite Durable Object. The dashboard renders inventory/presence/capabilities, pairing, grants, active requests, cancellation, audit metadata and revocation.

The six remote tools are device inventory, file reading, metadata, directory listing, filename search and content search. **Remote writes and process execution are unavailable.** There is no inbound workstation listener, unattended service, remote GUI dependency, or production-hostname promotion.

Real validation repaired a native Windows short-name bypass of the canonical configuration guard. Final canonical existing targets and missing leaves now receive private-path and request-scope checks. Five native 8.3 regressions ran on Windows. Other concrete repairs include canonical startup/config identity, safe bounded Windows Codex journal replacement, executable package mode, actual Cloudflare JWT audience representation, Workers-supported JWKS redirect handling, and pinned native Codex selection through its official npm platform aliases.

## Local and hosted validation

The final Windows command was:

```powershell
$env:MTERM_CODEX_TEST_PREFIX = 'artifacts/ci-codex'
$env:MTERM_CODEX_EXPECTED_VERSION = '0.160.1'
node scripts/orchestration/verify.mjs --full
git diff --exit-code
```

It passed on Node 24.21.0 in the isolated ordinary clone. The workflow ran reviewed build/roadmap/parity checks, TypeScript, pinned formatting, **149/149 tests with no skips**, real package verification and actual native Codex 0.160.1 registration. Full workflow runtime was 55.35 seconds; unit-test duration was 32,829 ms. The earlier focused policy/config gate passed 33/33, including the five native short-name cases.

The package proof exercised a real packed install, offline npm exec, isolated npm link, installed MCP write/read, and eight supported compatibility aliases. The final package was 55,636 bytes compressed and 216,577 bytes unpacked; installed production dependencies occupied 14,163,947 bytes. These exclude the separately installed Node and Codex runtimes and are not proof of the complete three-component size target.

Codex itself parsed the isolated registration; setup was idempotent, two configured MCP sessions worked, shutdown succeeded, and removal preserved unrelated bytes and backups. No paid/model call or real user configuration change occurred. This is not an actual Codex agent model-driven tool invocation.

| Hosted platform | Deterministic tests | Complete candidate workflow |
| --- | --- | --- |
| Windows 2022 / x64 / Node 24.21.0 | 149 passed, 0 skipped, 0 failed | PASS, including package and pinned native Codex |
| Ubuntu 24.04 / x64 / Node 24.21.0 | 137 passed, 12 platform skips, 0 failed | PASS, including package and pinned native Codex |
| macOS 14 / ARM64 / Node 24.21.0 | 137 passed, 12 platform skips, 0 failed | PASS, including package and pinned native Codex |
| macOS 15 Intel / x64 / Node 24.21.0 | 137 passed, 12 platform skips, 0 failed | PASS, including package and pinned native Codex |

[Exact job/log evidence](2026-11-02-code-ci.json) records each required step, native Codex version and source-unchanged result. Platform skips are reported as skips, not passes.

[PR matrix 41372073094](https://github.com/MulattoTech/MTerm-CLI/actions/runs/41372073094), [fast check 41372073095](https://github.com/MulattoTech/MTerm-CLI/actions/runs/41372073095), and [push matrix 41372068412](https://github.com/MulattoTech/MTerm-CLI/actions/runs/41372068412) all passed at the stated product source. Final evidence-only PR commits and the merge commit have their own runs linked from PR #69. Earlier 061ab6f matrices exposed a verifier manifest-name assumption; it was repaired before these passes, not skipped.

## Live deployment, smoke and cleanup

| Item | Observed identity |
| --- | --- |
| MCP | https://mcp-staging.m-techlabs.com/mcp |
| Private dashboard | https://mterm-staging.m-techlabs.com |
| Worker | `mterm-gateway-staging` |
| Artifact SHA-256 | `97a0457b78e113c058ae8da3d3a6a54fcd93c2b35d1dd1781316c41001ac10a6` |
| Smoke-tested Worker version | `f643872f-5fbb-44be-9e3d-a6f8f3f32aab` |
| Current owner-only Worker version | `af4fd06e-c4a3-4545-ad22-31d0ae956215` |
| Current deployment | `5a0ff21c-6341-4e73-b4af-169e98b76db2` |
| Registry namespace | `b66edc2d536e474093e1a18d0e88a24d`, preserved SQLite `MTermRegistry` |
| Product state | Staging, MCP enabled, read-only, owner Access policy only |
| Workers.dev / preview URLs | Both disabled |

The six immutable modules were built from the reviewed Windows TypeScript output, hashed, transferred and individually reverified before upload. The post-smoke settings change removed the temporary staging identity binding. A later [real pause/restore drill](2026-11-02-rollback-drill.json) restored the recorded owner-only version, then reuploaded these exact immutable modules to reconcile Cloudflare's post-rollback settings constraint. The final version above retains the same artifact, owner-only bindings and registry.

The [final live report](2026-11-02-remote-staging-smoke-final.json) records **11/11 passed**. The official MCP client 2.3.0 initialized Streamable HTTP without fallback, discovered six tools, selected two actual paired Windows agents and received independent exact SHA-256-matched file results. Actual Access JWT service authentication, S256 code exchange, wrong PKCE/resource/code replay denial, pairing/DPAPI/invalid-code/replay rejection, cross-device credential denial, root escape and mutation denial, one-device revocation with the other still usable, and OAuth grant revocation all passed.

Both fixture devices and grants were revoked, both agents stopped, the SDK closed, and only test-created local fixture folders removed. The temporary Access policy and service token were deleted, and the Worker test-identity binding was removed. The [post-cleanup boundary report](2026-11-02-staging-boundary-final.json) confirms health/discovery HTTP 200, anonymous MCP 401, dashboard 302 and deleted-service-identity 302. Only the original exact-owner allow policy remains.

No owner folder remains paired from these tests. The owner must choose a directory and complete normal pairing before using it from a client.

## Dashboard verification and acceptance limits

[Desktop](remote-dashboard-desktop.png) and [mobile](remote-dashboard-mobile.png) screenshots were inspected from the actual production renderer with synthetic data and no network calls. Exact viewport measurements were 1280×900 and 390×844; the mobile document width was 390 with no horizontal overflow. [Visual report](2026-11-02-dashboard-visual.json). This fixture validates layout, not a human browser authentication session or every click interaction.

The live identity was a temporary Access service principal. **Owner Google login, human consent/callback, ChatGPT Web connector installation/tool use and Claude connector use remain unverified.** The report explicitly records those false booleans. No claim is made that the current ChatGPT conversation has the new MTerm connector installed.

## Progress and remaining work

- Overall frozen-weight delivery maturity: **29.12% across 300 requirements**, zero complete; only CLI-201 advances to integrated from deployed discovery/MCP evidence.
- Full local DCP acceptance: **0/48 — NOT PASS**.
- Full remote WEB acceptance: **0/12 — NOT PASS**.

Remaining work includes the owner/client consent flow, broader client/protocol interoperability, live two-owner isolation, credential refresh/expiry and network-fault/soak scenarios, complete installed lifecycle and supervised startup, native handle-anchored filesystem/process containment, true terminal/session parity, the unimplemented document/desktop tools, production promotion, and eventual separately approved remote mutation capabilities. Each WEB requirement retains evidence, blockers, dependencies, remaining engineering-hour ranges and an unscheduled ETA in [the remote ledger](../REMOTE_MCP_ROADMAP.md).

## Recovery and continuation

Initial checkpoint:

```text
C:\Tools\Dev\MTerm-CLI\artifacts\checkpoints\remote-sprint-2026-11-02T00-11-45-504Z
all-refs.bundle SHA-256:
0a54c68385246385b569c24f6455e49efb60fe16eb282b5ff967b49034f14cbb
manifest SHA-256:
0a5ab4011bad9b94b8d1d08b41a87d00d4ac18188ccfefca9ed4cd102d619c60
```

The final additive source/artifact/checks checkpoint and verified merge SHA are recorded in the PR release closeout. The original checkpoint and dirty primary checkout remain preserved.

[Deployment recovery commands](../deployment/MTERM_STAGING.md) show how to pause `MCP_ENABLED` while preserving every binding and how to deploy a recorded version. Prefer the final owner-only version above; do not recreate/delete the registry or restore a temporary service identity. The controlled pause/recorded-version restore drill passed; the guide documents the observed settings-API code10214 and the exact-artifact reupload recovery. The first earlier good smoke remains separately recorded for history.

Continue with [NEXT_PARITY_PROMPT.md](../execution/NEXT_PARITY_PROMPT.md). Read current GitHub/main/deployment state first, retain the completed proof, and advance one bounded remaining acceptance item at a time.
