# Bounded final runtime observation

Observed by `/root/delivery_evidence` on 2026-11-12 at 23:49–23:52 UTC. This is a self-attributed read-only observation, not a cryptographic signature or full runtime acceptance.

| Surface | Fresh observation | Boundary |
|---|---|---|
| Selected MTerm connection | Metadata call and one read-only process completed successfully | Tools are attributed to both MTerm plugins; canonical-only authorization remains unproved |
| Advertised inventory | 53 unique registry tools: 28 engineering and 25 inherited | Derived from current tool registry; only metadata and the one-shot process were called |
| Installed managed packages | Manager 0.4.0; Desktop Commander 0.3.1; MCP SDK 1.32.2 | Package metadata, not a fresh full source comparison |
| Known admin listener | One listener at 127.0.0.1:19740 | No authenticated admin HTTP request or credential access |
| Production Worker | `a65ed883-30be-4bca-8d5a-697786ffd87a`, 100% | Active deployment identity; no source bytes fetched |
| Staging Worker | `88e1a5ff-ac1e-4b9a-a4c2-31ba32d6221e`, 100% | Source-byte match remains unverified |
| Browser | Root observed originating-context error | No browser activity, OAuth, portal, or client acceptance |

## Preserve the three provenance observations

The freshly read installation record still says source `9373fadc00689dd782143ab5e49664536f460b8b`, completed `2026-11-07T04:47:34.007Z`, and Worker `0d41b13b-9614-4574-8e54-6dd5cf760a10`. These are recorded installation fields. They do not supersede the retained independent non-test manager byte comparison to `ba4a55b7ed351f7e60928179edaa7449de00be7d`, which was not repeated. The active Cloudflare production deployment independently reports the newer `a65ed883` version. No marker, service, or configuration was changed.

`receipt.json` contains exact observations, attribution, request scope and evidence hashes. The captured Cloudflare response is a public-safe projection from the supported connected API: account and author identifiers were omitted before returning the result; deployment/version fields were preserved. Other runtime captures contain only project paths and selected package/installation/listener fields. The copied browser receipt is attributed to `/root`, not presented as my own call.

No deployment, restart, provider operation, OAuth change, authentication probe, secret inspection, model call, or source edit was performed. Newer merged source remains distinct from installed runtime, and the original browser/device/profile acceptance stages remain open.
