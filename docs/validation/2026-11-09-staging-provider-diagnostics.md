# Issue 232 provider diagnostics — 2026-11-09

**Root-reviewed saved evidence. Provider lifecycle and connected recovery remain unqualified.**

This record consolidates saved evidence for session `MTERM-WEB-20261109T131339Z-resume-a9287b3c`. Root recomputed all28 input-file hashes and sizes before repository integration. This review made no new live query, operator invocation or product test; original evidence is unchanged. The qualified local base is `c69762da7d1dda54f7a74795c08c1f699367c77f`; the separately deployed staging gateway source was `9e2d6633294e22ff63053564bad1ebeda2dd4059` in the recorded observations.

All UTC execution and observation times below are on **2026-11-09**.

## Two distinct rejected creation attempts

| Recorded operation | UTC execution window | Observed outcome | Subsequent operator operations |
| --- | --- | --- | --- |
| Initial lifecycle qualifier | 17:50:19.422–17:50:19.667 | The operator classified a known HTTP 4xx rejection; precise status and error were not retained. No UUID or acknowledged creation. | None: no renewal, rotation or deletion. |
| Separate create-only diagnostic | 18:20:15.969–18:20:16.306 | HTTP 400 from connector status text, numeric Cloudflare code 12121. No UUID or acknowledged creation. | None: no deletion or exact-ID readback. |

Both selected the same fixed account, existing connector/credential/endpoint, original name prefix and explicit `20s` request semantics. The fresh diagnostic nonce was independently recorded after the first rejection and exact-name reconciliation. It reduced the scope to one create and applicable exact-created-ID cleanup; it was explicitly recorded as another creation request. Neither operator retried internally.

- Initial nonce: `17e4190fc92bb6db5f7bda32d4b6ed6a`; name: `mterm-issue232-qualification-17e4190fc92bb6db5f7bda32d4b6ed6a`.
- Diagnostic nonce: `f02f487c355192580739f768cde74665`; name: `mterm-issue232-qualification-f02f487c355192580739f768cde74665`.

Across these two recorded invocations there were **two POST attempts, zero acknowledged creations, zero observed created UUIDs, and zero renewal, rotation, deletion, policy, binding or MTerm operations**. These counts describe the operators, not all activity in the account.

The second result does not establish the exact status or cause of the first result. The first record remains intact. The diagnostic intent also retains its historical pre-invocation held status; its separate attempt guard and result record the later invocation.

## Read-only reconciliation and retained uncertainty

| Exact-name observation | UTC time | Exact matches | Pagination |
| --- | --- | ---: | --- |
| Original name, after first rejection | 17:52:18.820 | 0 | Complete; page 1, total_pages 0, total_count 0 |
| Original name, before diagnostic | 18:19:03.323 | 0 | Complete; page 1, total_pages 0, total_count 0 |
| Fresh diagnostic name, before diagnostic | 18:19:02.534 | 0 | Complete; page 1, total_pages 0, total_count 0 |
| Diagnostic name, after its rejection | 18:20:41.214 | 0 | Complete; page 1, total_pages 0, total_count 0 |

These are point-in-time absence observations. They are not successful deletion receipts, continuous-absence proof or proof that no request reached Cloudflare. No resource was adopted or deleted by name.

Three audit GETs addressed only the first attempt’s 17:50:17–17:50:23 UTC window. Reads at 17:53:51.526 and 17:54:29.206 used the two known URI representations; the final read at 17:58:34.644 used only the time window. Each returned zero rows and no cursor. They recovered no event, HTTP status or rejection reason. A saved static request-shape review found no mismatch between the supported method/path/object-body request interface and the first invocation wrapper, without establishing a cause.

## Staging context observed before the diagnostic

Preflights at 17:48:07.325, 18:09:55.345 and **18:19:01.842 UTC** observed the same active Worker version `88e1a5ff-ac1e-4b9a-a4c2-31ba32d6221e`, nine equal latest/active bindings, no `STAGING_SERVICE_ID`, and the original single owner policy `278aac2d-13d9-424f-845b-dd7c27d43662`. Its canonical configuration hash remained `283e434138db2563ab8edd8cbc6e0a1a723e0d17fd0fa706966ac599e990e49d`; the retained policy and owner allowlist comparisons matched.

A separate three-GET observation at 18:15:14.871 UTC confirmed the expected fixed issuer, audience, origins, staging/enabled flags and deployed build in both latest settings and the sole 100%-active version. The registry namespace/class matched `b66edc2d536e474093e1a18d0e88a24d` / `MTermRegistry`; its observed keys were `class_name`, `name`, `namespace_id`, `type`, with no `script_name` or `environment` routing override.

This grounds the actual configuration response shape and comparisons. It does not qualify token metadata or continuous configuration stability. **18:19:01.842 UTC is the latest saved owner-only configuration observation; no post-diagnostic configuration read is claimed.** The recorded operators did not mutate policy, bindings or MTerm authority. Existing owner authority is outside the diagnostic scope.

## Error code research and unsupported conclusions

The recorded primary-source research completed at 18:23:32.596 UTC without finding a definition for `12121`. It inspected six service-token OpenAPI paths, the [official creation reference](https://developers.cloudflare.com/api/resources/zero_trust/subresources/access/subresources/service_tokens/methods/create/), and public searches in Cloudflare’s [API schemas](https://github.com/cloudflare/api-schemas), [Go SDK](https://github.com/cloudflare/cloudflare-go), [TypeScript SDK](https://github.com/cloudflare/cloudflare-typescript) and [Terraform provider](https://github.com/cloudflare/terraform-provider-cloudflare). Each recorded repository search returned zero matches with `incomplete_results:false`.

The inspected schema permits seconds syntax and states no minimum duration or name-length bound. That does not prove the account accepts `20s`. HTTP 400, code 12121, and the false allowlisted topic flags establish neither a duration/name constraint nor a permission denial. Search absence does not define a private backend error code. **The cause and supported concrete request change remain unresolved.** The consolidation did not repeat the research or make another provider request.

## Review and offline evidence

The first v3 operator received independent static clearance before its invocation. The diagnostic received separate source, wrapper and offline review. An initial 18-case fake-provider suite passed; five exact-readback cases were then frozen before a narrow correction. Against unchanged source, the 23-case suite passed 19 and failed 4 with `ERR_ASSERTION`; the exact-ID control passed. The four failures showed false resource-observation claims for missing or wrong readback identity. The corrected frozen suite passed 23/23, and an independent run also passed 23/23 with exit 0, empty stderr and six unchanged bindings.

The diagnostic’s actual receipt/reconciliation audit was independently CLEAR. It checked exact wrapper/function/nonce identities, equality of the saved tool JSON and parsed records, the one-POST trace, complete zero-match reconciliation and preservation of the earlier attempt. This is a saved-evidence audit, not an independent provider-side audit log. Offline fixture results do not establish actual creation or deletion behavior.

| Evidence | SHA256 |
| --- | --- |
| First execution | `d5e9f97c32a03ad31445689cc8ac81044c151b32f92bd0cd1b06a5ccd5ddf5df` |
| First name reconciliation | `d2d3a408535a9c74e86fc4820507b7fa2d8b2fc02aafb95a1516e2bc0b215784` |
| Diagnostic source | `941f020f41eaa2a75a99773f05c617b980b0933b8ea7d979988d7f2160e67ef4` |
| Diagnostic function | `bc3741bcaf0724a896221a66c5e306b28ff38b9c15a8c2e0cc0338d08b65c304` |
| Diagnostic wrapper | `f46db9a54dd32c3aca4fcf71cea123e305098cc7ce74ee5a41a33d973762bb1a` |
| Diagnostic execution | `23621138d87491e4b91762e18874aa95359960b8ca1018891ae2e347da5bbfe2` |
| Diagnostic name reconciliation | `2b9201afb6979f791bbd479173b0c6eb45c09005933565b736b3f59ad9fa5e4d` |
| Independent static/offline review | `b0190e807b6813896d54e2b2a39716f303c6e8a7d33952acb64ca76f292c2fc4` |
| Independent actual-result review | `b13108410f42dd137b65a29ef7e3ddf1603b736b2b8927a7bb74850044ccd487` |
| Primary-source research receipt | `f4b5d67805571dbe8e2d6375d05497ecb1aea900dde10289f88ecd1a6257d471` |

The [companion JSON](2026-11-09-staging-provider-diagnostics.json) contains the full input path/hash manifest and exact source/observation identities. It copies no raw provider body/error/header, Client ID, secret, actor ID or credential-derived digest.

## Acceptance and continuation boundary

Provider creation, deletion, expiry recovery, renewal, rotation, service authentication, MTerm principal cleanup and connected Windows recovery remain **unqualified**. This evidence awards no issue 232, broad issues 61/65 or roadmap completion credit. The recorded [diagnostic outcome](https://github.com/MulattoTech/MTerm-CLI/issues/232#issuecomment-6747989012) leaves those issues open; this evidence consolidation performs no fresh issue-state query.

Further token attempts are held while the rejection cause and a supported next operation remain unresolved. Do not repeat either completed intent or reset its attempt guard. Standing owner authorization remains in force for supported project work; root owns future operational decisions. Guarded local helper development continues with these live limitations visible.

Durable checkpoints: [claim](https://github.com/MulattoTech/MTerm-CLI/issues/232#issuecomment-6747207135), [first intent](https://github.com/MulattoTech/MTerm-CLI/issues/232#issuecomment-6747297435), [first outcome/reconciliation](https://github.com/MulattoTech/MTerm-CLI/issues/232#issuecomment-6747551626), [diagnostic intent](https://github.com/MulattoTech/MTerm-CLI/issues/232#issuecomment-6747907145), [diagnostic outcome](https://github.com/MulattoTech/MTerm-CLI/issues/232#issuecomment-6747989012).
