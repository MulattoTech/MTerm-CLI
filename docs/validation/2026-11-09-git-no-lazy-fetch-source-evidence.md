# Git implicit-fetch source evidence — 2026-11-09

**Source result: root’s integrated 44-case invocation passed once.** The retained history also includes the initial mixed baseline, a corrected valid RED baseline, the worker’s 38-case source gate and a separate independent 12-case run. This record preserves all five captures; it does not replace earlier failures with later passes.

**Qualification at this checkpoint:** local installed36 is **NOT_RUN**; normal root metrics, roadmap, parity and reviewed-build gates remain pending. Candidate/main, older-Git, broader platform, hostile-repository, provider, Windows and deployment qualification is not claimed. Root will append later actual gate receipts separately. Keep parent #66 and broader readiness claims outside this completed source slice.

Recorded `2026-11-09T21:57:29.083354+00:00` by OpenAI / GPT-6 Astra Pro, self-reported, session `MTERM-WEB-20261109T131339Z-resume-a9287b3c`. Evidence assembly performed no product/test/install execution, tracked edit, commit, external call or publication.

[Complete machine-readable source record](2026-11-09-git-no-lazy-fetch-source-evidence.json) contains each original execution receipt, its exact original text, every frozen/before/after input binding, preparation freezes, scripts/recipes, analyses and independent reviews. SHA256: `f0bd78150a4d6b22234a1fce31a710c848ce80df25f305036d517b043264b8ee`. Original artifact paths are provenance; the complete receipts and input maps are embedded for durable review.

## Five distinct execution records

| Observation | Actual result | Raw bytes | Unchanged bindings | Duration |
| --- | --- | ---: | ---: | ---: |
| Initial frozen v1 | 12 tests; 1 pass / 11 fail; exit1; MIXED | 132171 | 120 | 4.042716s |
| Corrected frozen v2 | 12 tests; 1 pass / 11 fail; exit1; VALID_BOUNDED_SOURCE_RED | 221019 | 120 | 4.882114s |
| Worker focused source38 | 38 tests; 38 pass / 0 fail; exit0; SOURCE_38_PASS | 204091 | 120 | 12.113321s |
| Independent peer source12 | 12 tests; 12 pass / 0 fail; exit0; INDEPENDENT_SOURCE_12_PASS | 198357 | 120 | 4.760812s |
| Root integrated source44 | 44 tests; 44 pass / 0 fail; exit0; SOURCE_44_PASS | 279359 | 121 | 13.304593s |

Every invocation retained complete direct raw output and empty stderr, with no wrapper timeout, owned-group signal or capture exception. None skipped, cancelled or marked a case todo. The first two invocations genuinely exited1; their failed cases are not suppressed. All observed runtimes were Linux x86_64, Node24.22.1 and native Git2.52.0.

The worker38 invocation ran correction bytes in the working tree on parent `9679760f4dec8fd55c8055fb6d2534931092f839`; those same bytes were later committed as `81fa3dfc3d5fbf31e78afb5ad095ffa0828764cd`. The independent peer then ran clean81fa. Do not describe worker38 as an invocation that already ran at commit81fa.

| Observation | Start UTC | End UTC | Complete original receipt SHA256 |
| --- | --- | --- | --- |
| Initial frozen v1 | `2026-11-09T21:18:57.572940+00:00` | `2026-11-09T21:19:01.615770+00:00` | `1337c643ae0931ed8dd2b5db5d3dd05ffeb28caf96cbf83d5a5ad3f63f164382` |
| Corrected frozen v2 | `2026-11-09T21:30:10.469378+00:00` | `2026-11-09T21:30:15.351490+00:00` | `d462fdb1dc09ef6f3e29ad11124f2ae53647ebe2a4d1f03b20dd2b5b90138709` |
| Worker focused source38 | `2026-11-09T21:35:09.318422+00:00` | `2026-11-09T21:35:21.431737+00:00` | `6234b34ecf1374ce88f972f0061c2f321c571b205b2beb553467bd8e6afc019e` |
| Independent peer source12 | `2026-11-09T21:44:29.541074+00:00` | `2026-11-09T21:44:34.301886+00:00` | `43287568e2bee5b2d6de49089aa38cab75830c9fc85308cd58641689e999b781` |
| Root integrated source44 | `2026-11-09T21:47:14.441349+00:00` | `2026-11-09T21:47:27.745940+00:00` | `639c974de2855963ac0f0268777fe76d6cde6ae4563b343d30a2c10f1b111138` |

## Initial mixed baseline and corrected real RED

The first frozen v1 run at `5b8cf492ff8de9f7ff208d576e378e0112c8c4fd` completed 12 tests with 1 pass and 11 failures. Cases 1, 2, 4 and 11 failed fixture setup on retained `inputErrors:["EPIPE"]` before their SDK interval. Only case 3 supplied an actual staged-diff SDK helper invocation, returning sanitized `GIT_FAILED`. Cases 5–10 supplied six declaration-policy differences; case 12 was the ordinary positive pass. It retained three native-calibration records, eight actual SDK cases and 22 Git responses. This is a mixed observation, not eleven product failures.

The causal repair only changed no-input native setup from `child.stdin.end('')` to `child.stdin.end()`. Nonempty pack input, stdin-error checks, assertions, titles, native calibration and product preconditions were preserved. Actual Node source inspection and independent exact-byte review are retained. No EPIPE was ignored, no blind retry or skip was added, and the original v1 fixture remains available in its own lossless archive.

Root’s corrected v2 baseline at `9679760f4dec8fd55c8055fb6d2534931092f839` kept production byte-identical to qualified base 3077. All six calibrations and all twelve SDK cases/thirty responses completed with no invalid setup case. All three missing-object SDK operations invoked their local marker-only upload-pack helper and returned `GIT_FAILED`. The status/missing-HEAD-tree and unstaged-diff/missing-index-blob cases each changed owned repository config by 32 bytes. Staged diff left its covered manifest unchanged. The three target objects stayed missing. Eight complete/declaration cases exposed the frozen admission-policy difference; the ordinary positive passed.

All twelve actual corrected-baseline SDK children closed naturally with code 0, no signal, kill attempt or stderr. Native ON calibration reached the helper and intentionally failed because it supplies no object; native OFF reached no marker and preserved its covered manifest. The two native ON config mutations belong to calibration twins and are kept distinct from the two actual SDK config writes.

## Selected correction and compatibility

The shared native Git runner sets `GIT_NO_LAZY_FETCH=1` on every invocation. Its existing bounded, lowercase, key-only configuration admission additionally refuses `extensions.partialclone` and remote subsection declarations ending in `.promisor` or `.partialclonefilter`. The subsection separator is retained; dotted and mixed-case remote names are covered. The key gate deliberately rejects complete repositories and false, empty, duplicate or unused declarations without interpreting values.

Refusal uses fixed sanitized `GIT_UNSAFE_CONFIG`, with no repository path, configuration key/value or command in the response. Original filter/include controls, root confinement, bounded output/arguments, cancellation and native timeout remain. Ordinary remote URL/fetch mapping configuration remains usable for status, unstaged diff and staged diff.

There is no enforced new Git minimum. Older/vendor Git may ignore the environment flag, and the three native metadata-discovery calls still precede key admission. This is not a universal pre-discovery, no-network or hostile-repository sandbox guarantee.

## Passing source observations

Worker38 comprises new 12 + legacy 18 + existing Git/MCP 8. Its older qualified base 3077 base intentionally does not include issue235’s later six ordinary clone/worktree cases. The peer independently ran the exact unchanged 12-case fixture once and audited worker38 from retained evidence. Root then ran new 12 + legacy 18 + ordinary worktree 6 + existing Git/MCP 8 together: 44/44 at clean `8421fdea84df8e0b52bf0269ac4288e9eeef3646`, tree `63c29f76758d43b283b703c066082ff1916a59a9`, on separately qualified `c351b6146ba1d3de4a1712a886dc7300ccdc3d70` ancestry.

Each passing implicit-fetch fixture produced six valid native calibrations, twelve actual SDK cases and thirty Git responses: 27 exact sanitized refusals and 3 ordinary successes. Every actual SDK marker was absent, every covered manifest unchanged and every actual MCP child naturally closed with code 0 without signal, kill attempt, process/settlement error or stderr. All three missing objects stayed missing. Native ON calibration writes remain separately recorded and do not count as product mutations.

The root44 capture contains 24 diagnostics: 6 native, 12 SDK and 6 ordinary-worktree records. Root’s retained analysis checked all assertions, manifest digests and natural child closure; the six ordinary-worktree cases remained unchanged and closed naturally. The full manifests and observed responses survive losslessly in the raw archives. Equal intervals retain the full before array and observed equal after digest; changed intervals additionally retain the full after array. No fixed manifest-entry count is used as an acceptance rule.

Parsing reversed exactly one Node24 TAP backslash/hash layer and verified roundtrips to original escaped strings. No raw TAP byte was rewritten. A reported `networkListener:false` capability is not an operating-system listener census.

## Exact pins and source history

| Pin | SHA256 |
| --- | --- |
| `originalProductionGit` | `362494082669a53057f7d8ebf2875b5d5b411c30ce315140732049baef9ee99b` |
| `workerProductionGit` | `21c5cbe79f1a3da7a9be2fecd2a50af2da9d61ca58b0534ecd15b661b79f663c` |
| `rootProductionGit` | `21c5cbe79f1a3da7a9be2fecd2a50af2da9d61ca58b0534ecd15b661b79f663c` |
| `originalFixture` | `d3b6f84f1bd1154c7e75b4ed1ccd3a54d05f1cb20b216ae9ae16f161b3192e86` |
| `correctedFixture` | `b7bc8d16791c617cab0796b69ccda797c07e32dae72e1f585192fbb505060ebd` |
| `compiledGitBefore` | `a04f629aa7a234f8c56a90dc8d72e34bd2f4ab72a91f56bee227ee64c427f530` |
| `compiledGitAfter` | `930e29a3ac9e0642209eb2af2f43f05e87175eb1103a96962f93cc8c02f2d489` |
| `workerVerifier` | `4d8008d5366b4fb4db3ef3de68931bdf2d2cee39f5347b5b1e967ce2ff933f3b` |
| `qualifiedIntegrationVerifier` | `70c91d7ecfc4a3d3cbdd32f8237cf8fbe1c50461f036a5a3be7bcc897842e391` |
| `integratedVerifier` | `850727b134bd761272c81a4b59eed3d893699d4af89a17b3106ec2e5ea075f87` |

The frozen current fixture stays `b7bc8d16791c617cab0796b69ccda797c07e32dae72e1f585192fbb505060ebd` throughout production correction and all three passing runs. The initial fixture is `d3b6f84f1bd1154c7e75b4ed1ccd3a54d05f1cb20b216ae9ae16f161b3192e86`. No assertion was changed to obtain GREEN.

| Worker checkpoint | Commit | Tree |
| --- | --- | --- |
| Initial fixture frozen before baseline; production unchanged | `5b8cf492ff8de9f7ff208d576e378e0112c8c4fd` | `2510f75a5729e6387a018b98c272ae8cf49f8d9d` |
| Causal empty-stdin fixture repair; production still unchanged | `9679760f4dec8fd55c8055fb6d2534931092f839` | `fbe32fe1fc9010714cdad600915604290cebebf2` |
| Authorized production correction and dated source evidence after actual corrected RED | `81fa3dfc3d5fbf31e78afb5ad095ffa0828764cd` | `5dab03ae76584454b47910f1fc777232fc062392` |

| Root integration checkpoint | Commit | Tree |
| --- | --- | --- |
| Freeze Git promisor admission fixture before baseline execution | `b9884c5eef392f0b5eb6d28e73f795ea1b2e2a7b` | `2c47b1ee81920c1d923972ce269278195f1a175f` |
| Avoid empty stdin writes in frozen Git fixture setup | `320d2f00f8d0c3257572b83a8de4c661c3d938e3` | `9c0ca3014902360fe8943fdf8ae4d8dc56a59849` |
| Reject partial clone declarations during read-only Git inspection | `163070d5ddccb87a6a0a7b52140295b93e232fa9` | `cbd0bab3ec56f718b874c5ec462a962303f56788` |
| Require installed Git36 gate and retain prior qualified delivery history | `8421fdea84df8e0b52bf0269ac4288e9eeef3646` | `63c29f76758d43b283b703c066082ff1916a59a9` |

The worker aggregate changes only `src/git.ts` among 838 original base files; 837 original files remain identical. It adds the fixture and dated validation/AI records. Root’s later integration separately includes the reviewed installed36 verifier and preserves prior qualified issue235 history. All 54 compiled root files matched the worker’s frozen source inputs before root44.

## Complete input bindings and reviews

| Execution | Binding count | Frozen / before / after manifest SHA256 |
| --- | ---: | --- |
| Initial frozen v1 | 120 | `edd38ff3614b2712ef482475ed68308795ef632573914f292dcbe08d75663615` (all three equal) |
| Corrected frozen v2 | 120 | `27f8bab60b3c09c387bd6c15c2ea56f694ea950851e96f0095aec6d04cc07cdc` (all three equal) |
| Worker focused source38 | 120 | `4cf06bdcbc8bcd92c0a9ba04bf4c7574528bc5c985f9c97e1c8c42e7a864f89d` (all three equal) |
| Independent peer source12 | 120 | `4cf06bdcbc8bcd92c0a9ba04bf4c7574528bc5c985f9c97e1c8c42e7a864f89d` (all three equal) |
| Root integrated source44 | 121 | `3413e127548e41807080b2297ff532a3d921e27cb0cd45e04aaac86f3ee93501` (all three equal) |

The JSON embeds every entry of all three maps for every run. Stored snapshot copies were rehashed during assembly. The first four runs bind 120 files; root44 binds 121. The root 121-input set adds the issue235 worktree fixture; its only changed shared binding from the worker's 120-input set is the reviewed package verifier. The original SDK, dependencies and other source/test inputs remain pinned.

| Independent review | JSON SHA256 | Markdown SHA256 |
| --- | --- | --- |
| `baselineV1PreRun` | `04ebe8494667a7c2cd6ae491906f846120af62fbd24318be1221751e9ab54544` | `bf3328445d49b0eee2252ce64732679d7ec33eb4ac9acfb55e5bfed696a06619` |
| `mixedV1Interpretation` | `eb7eb4ce80220e41a61fc29a15c5ed8a2c5df6a24f5303838285d56887d6856c` | `7aaabee95efe86529a146ee737757b5d8e4a9d76f1eb87608803fa6ab42ecc80` |
| `baselineV2PreRun` | `821d50ce0cac3bef57cb897a43176b2fb0bf2426a79329b32191360f99efae8e` | `745dafb73aa200edb82730cfba6042d082081032354e413358ab02b68512b5a1` |
| `correctedV2Interpretation` | `a551f49effab32f0f985c0e40af9ddd07bcf381ee8d5d91eab50cfeeb2b23e5d` | `99739eddce5123aacdcf457b87b5214ec894d135b5af08ad7e8a760961063ee9` |
| `finalSourceAndPeerExecution` | `a5e4eeef0b63952ae4097a31d3a8b5785ab8df9f3339c87daaeb85a79b34c491` | `feba76091c22c6f22c232e202993992d6b3f133fb51be9e8ea01abab912f90a9` |
| `installedVerifierStaticOnly` | `61cd1118b894243e34d0d6be1c533aed5ea06f15fbf1fec5d6b78bb91a986622` | `476dee48b37a29a0f80a42b33599323aac759ecd1b3578d53c0aec13cfe1c9f9` |
| `root44PreRun` | `97115a7aac46e1723f104ebfc249a35fd4e7b772babb9d3c255cbb47f133686e` | `658a3affa20562c32e9b06b4cbb83d50d47bf81a1b2db35c93cda9d05afdc348` |

The root44 pre-run review verified 21 conditions before the one invocation, including clean exact HEAD/tree, all 121 bindings, 54 compiled files, the concrete runner delta, absolute fixture selection, bounded owned process group, direct raw capture and unchanged capture/termination semantics. The final source peer review found no blocking production/evidence issue and authorized root integration; its separate installed-verifier review is static only.

A separate read-only source-sequence audit independently checked 601 copied input bindings across all five runs and the exact transitions: fixture-only from v1 to v2; source/compiled Git only from v2 to worker38; no change from worker38 to peer12; reviewed verifier plus added ordinary-worktree fixture from worker38 to root44. Its JSON SHA256 is `486760edbf6a02f8d45a9b827e95119d520dc3793b4d37de7c513d0e396ef8b6`. The early shared review SHA256 is `1216dfe30a80c37c49c2fb02b0c96a126ab58b387394f991c6decd6f8098a260`. Both are embedded with their original scope; neither is final shared clearance or normal-gate acceptance.

## Development compilation and retained preparation events

Original fixture preparation, the narrow v2 stdin repair preparation, worker build/static results and root development build are retained in the JSON. The worker and root `build:code` executions exited 0. Each retained the same 99-byte npm warning about an unknown `http-proxy` environment configuration. No credential or proxy value is included. Development compilation does not substitute for normal reviewed build or roadmap/parity/package gates.

Root preparation wrote all build/freeze/recipe/input/driver artifacts, then its final console-print expression raised `AttributeError` after a loop variable was shadowed. The retained preparation-readback receipt verifies the completed artifacts and records that neither the build nor product run was repeated. This console-only event is not concealed or recast as an extra invocation.

## Lossless archives

Every gzip member has mtime 0 and was decompressed and compared byte-for-byte with its original input. The two baseline archives already present under `docs/validation` were copied into this draft without recompression or any modification to the tracked originals. The raw hashes below bind original Node output, including failures and escape sequences.

| Archive | Raw bytes / SHA256 | Gzip bytes / SHA256 |
| --- | --- | --- |
| [2026-11-09-git-no-lazy-fetch-initial-mixed.tap.gz](2026-11-09-git-no-lazy-fetch-initial-mixed.tap.gz) | 132171 / `6e8231651627e257bfcacca00d980923dbbd6cf9737d3ce70d84d1e3847bac6d` | 8947 / `45a249813d919e83328aefa77b60165233f5a41d82702ff52e73f44ae88e41f2` |
| [2026-11-09-git-no-lazy-fetch-corrected-baseline.tap.gz](2026-11-09-git-no-lazy-fetch-corrected-baseline.tap.gz) | 221019 / `43ede74328d9e2995337e68f9ee4e38468b36c39503420abcc259df5b8dfd6e5` | 13764 / `262bcb437b262fa47f9c00a0b536c4e4c03849ccb5a57b6ad33dd846203f20cb` |
| [2026-11-09-git-no-lazy-fetch-worker-source.tap.gz](2026-11-09-git-no-lazy-fetch-worker-source.tap.gz) | 204091 / `103f9ca014867e1dd72bd06f341255474f9358250e37a695a3343e34e1268123` | 13679 / `67f0fd9315b293dec104676ef43f073766cc23ace5600b9b27b86381fe7b9287` |
| [2026-11-09-git-no-lazy-fetch-peer-source.tap.gz](2026-11-09-git-no-lazy-fetch-peer-source.tap.gz) | 198357 / `0a894fee0a75c7560909691c1bd28d830f73c5199ddd08c0afed5dfa59abb057` | 12338 / `ff0d770072e5beeb3d88890e71f0d2f99a9d3953c6b11edfa27d92a22a9dda72` |
| [2026-11-09-git-no-lazy-fetch-root-source.tap.gz](2026-11-09-git-no-lazy-fetch-root-source.tap.gz) | 279359 / `39f19af7ae693ec5d3f86f5990d752eca81dbc9337032dc26ea90deeb788daa7` | 19623 / `988f35fe8bc0b48a9587290d7ab4f2947a2de78b33d07877e502eed029154487` |
| [2026-11-09-git-no-lazy-fetch-initial-fixture.mjs.gz](2026-11-09-git-no-lazy-fetch-initial-fixture.mjs.gz) | 26229 / `d3b6f84f1bd1154c7e75b4ed1ccd3a54d05f1cb20b216ae9ae16f161b3192e86` | 8008 / `d45488f494b7c1d8be2bab7ce5d79d8d538ee694945bcadc5fb1c976e799b5c2` |

The initial fixture archive retains its original MIT/SPDX and AI attribution header. Its bytes equal the fixture in commit 5b8. The corrected fixture remains tracked in the repository, bound to its v2 hash and preserved commit history.

## Unqualified work and parent scope

Local installed36 remains **NOT_RUN**. No new install was attempted after the prior issue235 local metadata-cache blockers. The historical preflight found missing original `zod` registry metadata and missing canonical core metadata, and did not start a third install. That historical local prerequisite record is retained as context; its then-pending hosted status must not be mistaken for current issue235 status or for an issue237 installed result.

The reviewed verifier now expects legacy 18 + ordinary worktree 6 + implicit-fetch 12 = 36, with its existing 90-second deadline and 1 MiB bound. Static review of that code is not installed execution. Root normal metrics/roadmap/parity/reviewed-build gates were pending when this source record was assembled; later results require their own actual receipts.

No full-local/quick, candidate/actual-main, older/vendor-Git, Windows/macOS, provider/bridge or deployment acceptance is awarded here. No alternate-object-store, concurrent-writer, general hostile-repository or universal network-containment claim is supported. Parent #66 and broader readiness remain outside this slice. CLI-266/283/284 relevance is recorded without changing protected stages, weights, acceptance or seed/DCP/WEB fields.

All required receipts, captures, bindings and supplied review artifacts were located and verified. The remaining gaps are qualification work explicitly listed above, not substituted results. Root owns final copying, shared AI/Handoff/catalog review, normal gates, candidate publication and separate actual-main qualification.
