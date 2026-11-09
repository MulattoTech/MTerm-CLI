# Staging encrypted handoff — 2026-11-09

Issue [#231](https://github.com/MulattoTech/MTerm-CLI/issues/231), under [#61 / WEB-008](https://github.com/MulattoTech/MTerm-CLI/issues/61) and [#65 / WEB-012](https://github.com/MulattoTech/MTerm-CLI/issues/65). Session `MTERM-WEB-20261109T131339Z-resume-a9287b3c`; exact worker base `33f314055a5371d9b2bbcda9b7c8388f79d3cf35`. Branch `feat/issue-231-staging-handoff-20261109`. Claim `coord/mterm/issue-231`, [comment 6743531910](https://github.com/MulattoTech/MTerm-CLI/issues/231#issuecomment-6743531910). OpenAI / GPT-6 Astra Pro, self-reported.

The worker owns only the two companion scripts, their test fixture and these two unique evidence records. Root owns shared documentation, roadmap review, publication, integration onto qualified `9e2d6633294e22ff63053564bad1ebeda2dd4059`, hosted gates and actual connected interoperability. No acceptance stage is awarded here.

## Existing observation and bounded result

Root demonstrated that a nonsecret JSON marker supplied through MTerm process interaction appeared verbatim in tool history. The owned Windows diagnostic receiver also stayed alive after `readline.close()` and `stdin.pause()`; root reconciled and removed only its exact diagnostic processes and hash-matching script. [Readiness record](https://github.com/MulattoTech/MTerm-CLI/issues/61#issuecomment-6743114324). No actual credential was created or used. Our new-feature scaffold baseline is separate from those observations.

The new receiver publishes only an ephemeral public challenge. Its selected Cloudflare sealing function encrypts either the fixed public probe pair or a later explicitly authorized dedicated token response before returning. Only ciphertext crosses the outer process-input channel. The receiver decrypts in memory and supplies the fixed child's existing credential JSON through a private anonymous pipe. It accepts one attempt and starts at most one fixed child. No listener, service, general command/URL/path surface or new dependency is added.

The supported **probe** uses real receiver cryptography and the same child-pipe lifecycle, admits only a fixed public fixture pair, and performs no API/network/resource operation. Its fixed self child emits only `mterm-staging-handoff-probe-child` evidence. Running that child directly cannot supply a parent encryption/source/lifecycle receipt. Public fixture literals already in reviewed source are distinct from plaintext credential material in transport arguments, history, results or files.

The **smoke** mode invokes only `scripts/verify-remote-staging.mjs`, with no arguments. That existing script remains byte-identical at SHA256 `208ac5b3296ae8c55986db8e947ec92c7bd678f0c045cf37014b2910ec7c811e`. Its fixed endpoints, source-build checks, dedicated initially-empty service identity, TLS checks and owned cleanup remain unchanged. The production owner bridge is separate.

## Fixed protocol and source selection

The receiver requires four explicit, nonsecret environment values:

| Input                                  | Required value                                                    |
| -------------------------------------- | ----------------------------------------------------------------- |
| `MTERM_STAGING_HANDOFF_MODE`           | Exactly `probe` or `smoke`; no default smoke mode                 |
| `MTERM_STAGING_LOCAL_SOURCE_COMMIT`    | Reviewed local full lowercase 40-hex Git commit                   |
| `MTERM_STAGING_HANDOFF_BUNDLE_SHA256`  | Independently selected raw local bundle SHA256                    |
| `MTERM_STAGING_EXPECTED_SOURCE_COMMIT` | Separately selected full lowercase 40-hex deployed gateway source |

After the exact local commit has been qualified, built and checked out, `node scripts/staging-handoff.mjs --describe-source` reports its actual public source/bundle identities. The operator must compare them with the reviewed selection; echoing a challenge into expected fields is not independent verification. Local and deployed commits may coincide, but remain separate fields with different meanings.

Source inspection uses fixed Git `rev-parse` and `ls-tree` object reads, avoiding diff drivers, clean filters, hooks and dependency execution. Bound source bytes must match committed blobs. The raw SHA256 bundle covers the fixed receiver/sealer/harness, package and lock manifests, TypeScript configuration, and regular files under `src`, `dist` and `node_modules` (excluding the executable-link directory `node_modules/.bin`). Files/bytes/depth are bounded; symlinks, path escapes and special files are rejected. The helper and harness hashes are separately exposed. Git attributes force LF for these scripts; no hash normalization is hidden here.

The source selection is checked before challenge publication, after cryptographic work, before the fixed child spawn and again after asynchronous spawn/source work immediately before plaintext pipe release. The same trusted `process.execPath` runs the child with `shell:false` and an explicit process-local environment. Declared Node preload/inspection/TLS hooks are refused before key generation; parent credentials and arbitrary environment entries are not inherited. Global runtime configuration remains unchanged. The bundle does not authenticate the Node executable or OS, and these checks do not make filesystem execution atomic or undo code already injected into a compromised launcher.

The cryptographic profile is fixed:

- One RSA3072 recipient key with exponent65537, RSA-OAEP and SHA256. The private key is nonextractable and never exported.
- A fresh 32-byte AES key, AES256-GCM, 12-byte IV and 128-bit tag. RSA wraps only the AES key.
- Exact outer keys `protected`, `encryptedKey`, `iv`, `ciphertext`, in that order. The GCM tag is appended to the ciphertext by WebCrypto.
- Canonical base64url and canonical protected JSON; exact field order and values; no duplicate, extra, unprotected, compression or algorithm-negotiation fields. AAD is the exact UTF8 encoding of the base64url `protected` string.
- Protected protocol/purpose, mode, run nonce, recipient fingerprint, expiry, fixed account/origins, local commit/bundle/helper/sealer/harness, separate expected deployed commit, and exact token name/duration/ID/creation/calculated expiry. Probe token ID/timestamps are null.

The receiver consumes its instance before the first await. Malformed/failed attempts are not reusable. Same-chunk extra frames fail; the closed input rejects later chunks, and a second invocation cannot create another key or child. A 120-second monotonic deadline cannot be extended by wall-clock rollback. Fresh checks follow awaited work and precede admission; no expiry check retroactively cancels an operation already admitted to the fixed child.

## Sealing template and resource ownership

`sealStagingHandoff(challenge, cloudflare, selectedAccountId, reviewed)` is self-contained and uses WebCrypto, TextEncoder and base64 primitives. It has no Node import or secret configuration argument. A later authorized connected execution must embed the reviewed function unchanged and supply the independently reviewed exact `mode`, local commit/bundle, receiver/sealer/harness hashes and deployed commit in `reviewed`. The authenticated receiver-challenge channel is the trust prerequisite; encryption alone does not authenticate a sender or attest a host.

The function validates the key, fingerprint, selected context and actual RSA/AES operations before any token creation. Probe calls no API, including when the supplied API adapter would throw. Smoke has only these API operations:

| Operation       | Fixed scope                                                                                                                 |
| --------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Create          | POST to the fixed account's `access/service_tokens`, unique `mterm-staging-handoff-<nonce>` name, explicit `duration:"30m"` |
| Failure cleanup | DELETE only the syntactically valid exact resource UUID returned by this invocation's successful creation response          |

Cloudflare's [service-token API](https://developers.cloudflare.com/api/resources/zero_trust/subresources/access/subresources/service_tokens/methods/create/) permits explicit duration values and otherwise defaults to 8760h. The template never relies on that default. It captures a returned UUID before validating the remaining token response or checking a post-create deadline. Sealing/response/late-expiry failures attempt deletion of only that ID and report a sanitized confirmation state. Delete rejection, mismatch or exception remains `delete-unconfirmed`; creation interruption or an untrustworthy ID remains `creation-outcome-unknown`. No provider error text, token Client ID/Secret, credential digest or account credential is returned.

`tokenExpiresAt` is explicitly calculated from the reported `created_at` plus the requested 30m. It is not an independent readback of provider expiry. Interrupted execution, lost ciphertext or failed delivery requires exact public ID/name reconciliation before a new creation attempt; there is no blind retry, broad deletion, policy edit, binding update or grant operation in this template.

The 120-second challenge does not solve control-plane policy/binding preparation or propagation. Root is tracking interrupted dedicated-principal recovery separately in [#232](https://github.com/MulattoTech/MTerm-CLI/issues/232). The current smoke refuses a previously nonempty principal before authorizing cleanup. Neither limitation is bypassed by this helper.

## Child lifecycle and output

Ciphertext input is bounded before parsing, decoded fields have fixed limits, and stdin is destroyed after one frame rather than merely pausing a readline reader. Child stdout/stderr are bounded and filtered; only fixed protocol fields, enums, counts and a validated report basename can affect the public result. Unknown output, failed writes, invalid summaries, premature exit, stderr or overflow cannot become success. Both Client IDs and Secrets are excluded from returned fields and the child environment.

Success requires the complete pipe write/end, the fixed child's final success receipt and actual natural `close`, after stdio closure. The receiver retains the existing smoke's 240-second abort and gives the child a 450-second outer budget plus bounded termination observation. The smoke's sequential network, agent, SDK, lock and filesystem cleanup can still exceed a budget; 450 seconds is a fail-safe, not a cleanup guarantee. As documented by [Node's child-process API](https://nodejs.org/docs/latest-v24.x/api/child_process.html), Windows signals terminate abruptly. No claim is made that `kill()` runs the smoke's finally block or proves absence. Any hard termination or unconfirmed closure is failed/cleanup-unconfirmed and requires exact owned-process and dedicated-principal reconciliation.

Mutable plaintext buffers are cleared where practical, key references are dropped and credential fields are blanked after the pipe completes. JavaScript strings, cryptographic runtime memory and OS buffers do not offer a guaranteed erasure claim. The scope is excluding plaintext from the observed transport/data channels, not promising visibility into every upstream internal log.

## Tests-first lineage and actual local execution

All five retained scaffold snapshots predate behavior implementation. Both production scaffolds explicitly returned `HANDOFF_NOT_IMPLEMENTED`; no missing import is counted as an existing bug. Eighteen initial, or 24 final, generic negative controls could already pass against a rejecting scaffold. These runs establish missing new contracts, not a reproduction of the prior live transport-history defect.

| Fixture revision   | Cases / pass / expected assertions | Reason for next revision                                                                                                    |
| ------------------ | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `ca8a5cc6…`        | 114 / 18 / 96                      | Recognize the virtual filesystem root as a directory                                                                        |
| `55f380d7…`        | 114 / 18 / 96                      | Independent review requested precise deadline/header/key-size/closure/privacy/cleanup assertions                            |
| `0469e67c…`        | 130 / 24 / 106                     | Replace diff-success adapter with immutable Git blob records                                                                |
| `03816b56…`        | 130 / 24 / 106                     | Dirty-source case must select matching modified bundle while retaining original committed IDs; narrow native evidence title |
| `b0acd37e…` frozen | 130 / 24 / 106                     | Final fixture accepted before implementation                                                                                |

The final scaffold command was:

```text
node --test --test-reporter=tap --test-concurrency=1 tests/staging-handoff.test.mjs
```

It ran 130 individual cases, 24 passes and 106 `ERR_ASSERTION` failures, exit 1, with no cancellation/skip/todo and empty stderr. All four source/fixture bindings were unchanged. Independent fixture review was CLEAR before implementation. The frozen fixture is divided into 87 receiver cases, 38 sealer cases and five actual owned local process cases.

The first implementation passed six positive crypto/native controls, then the original **130/130**, exit 0, in 38.026 seconds. Its first focused command was:

```text
node --test --test-reporter=tap --test-concurrency=1 tests/staging-handoff.test.mjs tests/staging-build-identity.test.mjs
```

That first run passed **184/184**, exit 0, in 41.812 seconds: all 130 new cases plus 54 existing staging-build cases. No failures, cancellations, skips or todos; empty stderr. All 11 recorded source/fixture/manifest/compiled bindings were unchanged. The first independent execution also passed the original 130 cases, but its source review identified the pending-write fault below. These receipts remain immutable and describe the first implementation, not the corrected final source.

The independent envelopes exercise real RSA/AES and native digest operations. Controlled VM cases simulate only filesystem/Git/time/API/child behavior; sealer cases have no Buffer/process/Node imports. Cases include full authenticated-header mismatches, tampering, native 16-byte AES key rejection under the declared A256GCM profile, deadlines after awaits, rollback, source drift, replay/concurrent/duplicate input, exact API failure cleanup, private-output suppression and separated child exit/close with late output. Native cases use owned temporary Git fixtures and actual Node pipes, observing natural receiver close plus fixed-child receipts. They do not independently inventory an OS process tree; a fixture is retained if exceptional closure is unconfirmed.

The unchanged 54-case staging-build suite uses simulated Windows/SDK/DPAPI/network dependencies. Its passing virtual success fields do not become real staging acceptance.

### Incremental pending-write regression

Independent review found that the child timeout could settle the close promise while the receiver remained blocked on a stdin write that never emitted `finish`, `error` or `close`. A failed kill without confirmed child closure therefore defeated the outer budget. This is a defect in the first new-feature implementation, separate from the earlier scaffold proof.

One additional case was frozen before the correction, retaining the original 130-case fixture and all its receipts. It uses an actual native Writable which accepts the fixed public probe line but withholds its final callback; its controlled child returns false from kill and never closes. Only the child deadline and termination-observation timers are compressed. An independent bounded fixture observer records whether the receiver returned before fixture-only pipe destruction releases the retained old source. The original receiver fails exactly that settlement assertion; setup, native crypto, source admission, pipe write and final barrier all complete.

```text
node --test --test-reporter=tap --test-concurrency=1 --test-name-pattern='outer deadline settles a pending native stdin final' tests/staging-handoff.test.mjs
```

The incremental RED ran one case with one `ERR_ASSERTION`, exit 1, against original receiver `f3e3c1db…` and the new 131-case fixture `5bbb1a38…`. The correction races the write promise against the existing bounded close outcome and refuses success if the full write did not finish. Existing cleanup destroys only owned pipes and unreferences only the unconfirmed owned child. The same case then passed, exit 0, with `CHILD_TIMEOUT`, `child.closed:false` and `cleanup:"unconfirmed"`; it does not assert that an unconfirmed child has stopped. This incremental regression is not relabeled as an initial scaffold baseline.

The final focused command above passed **185/185**, exit 0, in 44.896 seconds: the final 131 cases (88 receiver, 38 sealer and five native local process cases) plus 54 unchanged staging-build cases. No failures, cancellations, skips or todos; empty stderr. All 11 recorded source/fixture/manifest/compiled bindings stayed unchanged. Runtime: Node v24.22.1, Linux x64. Own locked dependency installation and final `build:code`, both script and fixture syntax checks, focused Prettier and whitespace checks completed. The only npm warning was the existing unknown `http-proxy` configuration. No dependency or lockfile changed. No full local suite, ordinary reviewed build, installed-package or hosted gate is claimed by this worker.

## Exact artifacts

| Artifact                                 | SHA256                                                             |
| ---------------------------------------- | ------------------------------------------------------------------ |
| First implementation receiver (retained) | `f3e3c1dbb301b2dddf48f5f1874a4303beafc84d50b6d790f88e5536dbb64fc9` |
| Corrected final receiver                 | `dda60e56ad10181b0dfce92ab107731a274d91c8c8d5de4876f66163983d3277` |
| Self-contained sealer                    | `a29d4594b2aa544e9152944972ac25212dec0e910aeddbf3cb1be1501782e418` |
| Original frozen 130-case fixture         | `b0acd37e1902adcafb556feaa554fbdcb38787cd061a90098637f76e88407cde` |
| Final frozen scaffold TAP                | `0db3d95e0a2655d90ca85638cf472f657e64161f85f18398fe9b222ba2537dea` |
| Final frozen scaffold receipt            | `102087d5085b9e1f3593fdc97a72eb095dd638b0673145e1b96616972c1518fe` |
| First 130-case GREEN TAP                 | `e8d47329f8c8c2c8b555034501e187d66ace144125f3729ab663ae449a0d99b2` |
| First 130-case GREEN receipt             | `07764eab0bf0aed9996793fa1a44bc30a42b17836a9b0be342ef2caa7891572b` |
| First 184-case GREEN TAP                 | `f35d3e4aee7322cca660179770603167b7d05de2f36cd10ed4478bde3d88665b` |
| First 184-case GREEN receipt             | `99d2943465c061b987eaf5a8048909565aafb20b9f68b6efaf2f0e70594d9823` |
| First bounded checks receipt             | `bb2ee6dc08d8938d03bc48d77178b08958edefc0eb3d56d5d2a59f4d1b7dfa6d` |
| Final 131-case fixture                   | `5bbb1a38693bcd8ca400a85aa7992bb5ea5570c4bdd623daec4325be0e6c3286` |
| First independent 130-case TAP           | `7e66b3242f91d01829c5ec7700168f88c02d304f30d4192c744633a867f8d762` |
| First independent 130-case receipt       | `157be85a0e7a8e651977642a2dda0827089d3a5ad043813d48ae7f45acf338fe` |
| Incremental one-case RED TAP             | `bcbfcbb4ca8dc5483bd70e4198125fba8a294b885a7a488b9da9fc67e9c158e3` |
| Incremental one-case RED receipt         | `1d356d5861ead8265150c59a58376e71ad5031cad587997e8dbd4cbc51614da6` |
| Incremental one-case GREEN TAP           | `dee768c78cc6b4951e9f55a41e14f6e7a4da04784bdefd5332afbe242b6aa313` |
| Incremental one-case GREEN receipt       | `d35aa31939d9d249defff15c1910cd8e9a91a346720156fd209a18483e9ed4b8` |
| Final 185-case GREEN TAP                 | `ac5a61ddb6efafd4a91c8e2b18d776724de4b6581ab2eb5078c2c99c225837e7` |
| Final 185-case GREEN receipt             | `4256d30a7ac5189329a694f362043816a123872e4250a853d4e05b2112c329eb` |
| Final bounded checks receipt             | `bb2ee6dc08d8938d03bc48d77178b08958edefc0eb3d56d5d2a59f4d1b7dfa6d` |
| Final independent 131-case TAP           | `0ce82b4189054fd6ba372aa50d09a3040aec91790c13ed8a5a6fa01fd8e5709e` |
| Final independent 131-case receipt       | `95befe75ac445e3169a864dc9bb5c02f985342cc9970ecfe5166582ab455734d` |

Raw snapshots, worker TAPs, empty stderr files and receipts remain in ignored `artifacts/issue-231-staging-handoff/`. The two independent executions are retained under `artifacts/issue-231-independent-review/peer-policy-4yam45pk/` and `peer-policy-final-ckb06ch4/`. The dated machine-readable change record retains every scaffold hash and the final bindings. Root owns durable transcript publication.

## Independent review and remaining gates

Independent source and fixture review is **CLEAR** with no remaining material findings. The reviewer first passed the original 130 cases and identified the write-wait defect, then verified its incremental RED/GREEN evidence and the minimal correction. One final independent execution passed **131/131**, exit 0, in 35.094 seconds, with no failures, cancellations, skips or todos, empty stderr and all 11 recorded bindings unchanged. The worker read the actual final TAP and receipt and recomputed their hashes before recording them. Root must then integrate shared evidence, perform combined-revision and all six hosted candidate gates, and qualify the separate actual-main checks. CLI-290/299 and WEB-008/012 receive bounded evidence only; protected metrics and the immutable seed remain unchanged.

Before any real token, root must prove the exact reviewed sealing function through the connected Cloudflare executor and actual Windows receiver: nonsecret synthetic delivery, marker absence from observed data-channel tool inputs/history/results/owned files, successful anonymous-pipe transfer, and independently observed natural owned process-tree/launcher exit. Local and hosted source tests cannot replace that gate. Real deployment, Google/owner login, service-principal policy/binding preparation, DPAPI/SDK smoke, ChatGPT connector acceptance and interrupted-principal recovery remain separate. No live Cloudflare/token, Windows/owner, deployment, production-bridge, grant/policy/binding or paid/model-consuming operation was performed by this worker.

## Root integration on qualified main

Root applied the independently reviewed worker commit
`d9465820fca38a76c7ac9ef071c1038e64decaf0` onto qualified main
`9e2d6633294e22ff63053564bad1ebeda2dd4059`. The two scripts, final131 fixture,
unchanged harness and all11 recorded bindings remained byte-identical. The
combined helper/build-identity command passed **185/185**, explicit exit0, empty
stderr and no failures/cancellations/skips/todos, at 16:21:05–16:21:47 UTC on
Node v24.22.1/Linux x64. Root receipt SHA256
`0c18366885124b034d101052120ebfba19236635b503bb24ff140cddace0970a`; raw TAP SHA256
`9c3655c73a050479377cb1c2cb50c1e7f7b817fb3becec6d45799df8ad4a3e9e`.

Durable transcripts remove only trailing whitespace; the original worker and
independent records retain their hashes and original scopes:

- [2026-11-09-staging-handoff-scaffold-red.tap](2026-11-09-staging-handoff-scaffold-red.tap), SHA256 `749284cd9e94ff8fa762967258a3aa31a2072526eacf5b0539d63722c90cc507`; raw SHA256 `0db3d95e0a2655d90ca85638cf472f657e64161f85f18398fe9b222ba2537dea`.
- [2026-11-09-staging-handoff-pipe-red.tap](2026-11-09-staging-handoff-pipe-red.tap), SHA256 `f0e6242e02ee2b8845e51ca84595635744fa583505e66afd8a7712c1c6c67969`; raw SHA256 `bcbfcbb4ca8dc5483bd70e4198125fba8a294b885a7a488b9da9fc67e9c158e3`.
- [2026-11-09-staging-handoff-green.tap](2026-11-09-staging-handoff-green.tap), SHA256 `9c3655c73a050479377cb1c2cb50c1e7f7b817fb3becec6d45799df8ad4a3e9e`; raw SHA256 `9c3655c73a050479377cb1c2cb50c1e7f7b817fb3becec6d45799df8ad4a3e9e`.

The scaffold transcript is a new-feature baseline, not an existing-transport
regression. The one-case pipe transcript is the independently found defect on the
first actual implementation. The combined GREEN is the serialized final source.
No test identity or historical result has been rewritten to collapse that lineage.

Root appends only CLI290/299 evidence/notes and dated WEB008/012 explanations.
Every protected catalog field, seed, historical reviewer/time and acceptance
remains unchanged. Shared guides document logged-transport privacy, the distinct
local/deployed source selection and recovery prerequisite. The separately
[qualified code-only deployment](2026-11-09-staging-deployment.md) is observed at
9e2d663; it is not a new authenticated Windows smoke or evidence that this helper
has already run through the actual connected Cloudflare/Windows path.

Normal explicit review/render, reviewed build/parity, typecheck, full source
formatting and whitespace checks passed with exit0. Fingerprint
`649a07d80dc088bc1091bab7abedc679e20b13539dffc4a83add67a8a7d122a8` covers181 source entries.
The existing npm http-proxy warning is retained. Gate receipt SHA256
`53c529e271d095c9dc8c0d649e4b396f796b081e83bd3ef44439acb477040073`.
The known local Unix-socket EPERM suite was not repeated; no full local or quick
verifier PASS is claimed. Independent shared-document/protected-catalog review is
CLEAR, including all300 protected fields,510 historical/seed/ledger/pin/lock/vendor
files, actual gate hashes and exact transcript normalization. All six exact
candidate hosted checks, actual connected nonsecret probe, ordinary expected-head
merge and six distinct actual-main checks remain separate. Real token/smoke
execution also depends on issue232's interrupted-principal recovery. All300 CLI
rows retain29.36% maturity,0complete45blocked126notStarted; DCP0/48 andWEB0/12.
No stage or protected-field change.

## Native-path follow-up after blocked candidate

The original worker and root-integration records above describe the pre-hosted source. Candidate [PR #233](https://github.com/MulattoTech/MTerm-CLI/pull/233) at `e5f15ebccdf908498f123d45b20a45a276925d33` was blocked by actual platform failures; it was not retried or merged. The tested synthetic merge `c2fc56b8374dad49f59e5d2f9ecd80ed004a46d0` has the same tree `6d900980250a093547abb15a4730f01cd62ff977`. The [blocked-candidate checkpoint](https://github.com/MulattoTech/MTerm-CLI/pull/233#issuecomment-6745656691) preserves that result.

| Hosted lane | Actual full-suite outcome | Observed helper failure |
| --- | --- | --- |
| Windows | 1,033 total; 1,029 pass; four fail; no skips | Four native cases fail `SOURCE_UNSAFE` during `--describe-source`; the bare fixed child passes |
| macOS Intel | 1,033 total; 1,016 pass; five fail; 12 existing platform skips | All five native cases see exit 0 with empty stdout, then fail JSON parsing |
| macOS ARM | Same counts as Intel | Same empty-output shape |

Fast, Ubuntu and native Linux lanes passed, but they do not qualify the failed platform lanes. The immutable hosted-review receipt is SHA256 `73b058d961d7bea2cdd19ab4a295806000980ca73dc8fb629659cafdf079c2d0`. The Windows failing safety predicate is not exposed by its log. A canonical Windows checkout passed root's separate descriptor diagnostic; this narrows the investigation without proving the temporary-fixture cause.

Work resumed on `fix/issue-231-native-paths-20261109` from the exact published candidate. The original `d9465820fca38a76c7ac9ef071c1038e64decaf0` branch/history, scaffold snapshots, 130/131/185 results, pending-write regression and root integration evidence are preserved. The source correction changes only the bottom CLI entry selection: retain the lexical `samePath` fast path, otherwise compare both real file paths; failed resolution leaves an unrelated import inert. Every preceding receiver byte, including source admission, cryptography and bounded lifecycle, remains unchanged. The sealer and fixed smoke are unchanged.

The native test factory resolves only its newly owned temporary root before populating it. This prepares a canonical path for the existing strict source checks; it does not relax `lstat`, symlink/realpath, hard-link, committed-blob or bundle checks. Its Windows benefit remains a prospective fixture correction until the revised hosted run passes.

Three actual native regressions were frozen before the entry change. An owned directory symlink (junction on Windows) invokes the descriptor and bare fixed child; both must return their exact nonempty output with exit 0 and empty stderr. A distinct importing wrapper emits only its own marker. Cleanup removes the alias itself before its owned parent. On unchanged published receiver `dda60e56…`, the two alias cases reached exit 0 with empty stdout and failed the explicit output assertions, while the importing control passed. This reproduces the macOS failure shape with actual Node/filesystem behavior on Linux; it is not a simulated-path assertion or a claim of native macOS execution.

```text
node --test --test-reporter=tap --test-concurrency=1 --test-name-pattern='handoff native path' tests/staging-handoff.test.mjs
```

The exact frozen fixture `e1b31bac…` produced three RED cases: one pass and two `ERR_ASSERTION` failures, exit 1, no skip/cancel/todo and empty stderr. All six bindings were unchanged. After the narrow source correction the same three cases passed, exit 0. The final focused command passed **188/188**, exit 0, in 43.547 seconds: 134 handoff cases, including eight native local process/alias cases, plus the unchanged 54 build-identity cases. All 11 recorded inputs stayed unchanged; there were no failures, skips, cancellations or todos and stderr was empty. Final `build:code`, both script/fixture syntax checks, focused formatting and whitespace checks passed; the existing npm `http-proxy` warning remains recorded.

| Native follow-up artifact | SHA256 |
| --- | --- |
| Corrected receiver | `291cf6d467f1602b88373fc6dcfab5108e9f5e22e1aba6fe8c88229069d4f844` |
| Frozen 134-case fixture | `e1b31bace77b662f5e73a34457aced3c5c4c5961dcbe3d1b26b978b7b0eef55c` |
| Three-case RED TAP | `c0feb04fbd688f56edcbba0c34cee7a4f086cd9cbb94a8028d50390edbad2ed8` |
| Three-case RED receipt | `d8dd4f470245f3c4e9673fee55e5a742ea0e6fee82039d083cfeaa523ccba39c` |
| Three-case GREEN TAP | `f6f3587435e51c5d1c2d85628f00479c98dabfbe65a64d220588ead0c3c01db9` |
| Three-case GREEN receipt | `951710d8a191ec36035880f201301848160096e6d548290bd908468866be8fdc` |
| Focused 188-case TAP | `5385f0f28caaacab4863e029c543705378d2def0f17a6e310a64011c985d31bb` |
| Focused 188-case receipt | `14e2d30756e4cb2542fdb924270a204906b36169a1a3c81b1726f6075df5e092` |
| Independent 134-case TAP | `cb9aa4102efc5ccf66d4f11f890237ac7f76122fd9de85787f7045b535f22dd9` |
| Independent 134-case receipt | `efbe55a1acf52e04fc5b84e25239e949eb09ebd2a25916e9b77282f5f28fbb12` |

The original published files, exact hosted failure basis, native RED/GREEN and bounded checks are retained under `artifacts/issue-231-native-paths/`; prior evidence was not overwritten. Independent frozen regression and final source/fixture review is **CLEAR**, with no remaining material findings. Exactly one final independent execution passed **134/134**, exit 0, in 36.498 seconds, with empty stderr, no failures/skips/cancellations/todos and all 11 bindings unchanged. The worker read the actual peer receipt/TAP and recomputed both hashes. Revised exact-candidate Windows/macOS and all other required hosted gates, actual-main qualification, connected Cloudflare-to-Windows public probe, privacy and owned-process observation remain pending. No real credential, token, policy, binding, owner operation or connected Windows receiver launch was performed by this worker.

The final independent receipt and TAP are retained in `artifacts/issue-231-independent-review/peer-native-paths-seaheogh/`. The local correction is ready for root integration and a new published candidate; the earlier failed candidate remains a historical failure.

## Root native-path integration

Root serialized reviewed worker commit
`6ca7b9e649b52720bdc8a3256f52bda2adcdbb04` onto the original published
`e5f15ebccdf908498f123d45b20a45a276925d33` candidate. The receiver/frozen134 fixture
and unchanged sealer/harness hashes above remained intact. The combined helper and
staging-build suite passed **188/188**, actual exit0, empty stderr, no skips,
cancellations or todos and11 unchanged bindings. It ran at16:53:19–16:54:00UTC on
Node v24.22.1/Linux x64. Receipt SHA256
`3e9b12ccd1d4778a1d2ea33b6580e5ed5e6897517ffda04c64121adbb80ec224`; raw TAP SHA256
`a98b3a083f904c2074337206116afc87834af2930d26c0e93c824cdecda3ebfd`.

- [2026-11-09-staging-handoff-native-red.tap](2026-11-09-staging-handoff-native-red.tap), SHA256 `c0feb04fbd688f56edcbba0c34cee7a4f086cd9cbb94a8028d50390edbad2ed8`; original raw SHA256 `c0feb04fbd688f56edcbba0c34cee7a4f086cd9cbb94a8028d50390edbad2ed8`.
- [2026-11-09-staging-handoff-native-green.tap](2026-11-09-staging-handoff-native-green.tap), SHA256 `a98b3a083f904c2074337206116afc87834af2930d26c0e93c824cdecda3ebfd`; original raw SHA256 `a98b3a083f904c2074337206116afc87834af2930d26c0e93c824cdecda3ebfd`.

Only trailing whitespace was normalized. The original published transcripts and
failed hosted logs remain unchanged. Root appends CLI290/299 notes and these two
evidence references, a current HANDOFF checkpoint and dated WEB008/012 explanation;
protected catalog fields and acceptance remain unchanged. Normal explicit review/render,
reviewed build/parity, typecheck, full source formatting and whitespace checks
passed with exit0. Fingerprint `cfb11e6206641bf0b6857faa64431fe1aa27f5a8bfc79e28a90eff158d5dfc0e`
covers181 entries; gate receipt SHA256 `19c7a95e0472d35a2e0ab5dfbda8c34b82c5e9c765825133430399dc83be96bc`.
The existing npm http-proxy warning remains, and the known local Unix-socket
full-suite limitation was not rerun or labeled PASS. Independent shared-document
and protected-catalog review is CLEAR: all 300 rows, 816 other tracked blobs,
historical records and actual receipt/transcript hashes were verified. Replacement
exact candidate hosted checks, the actual connected public probe and ordinary
merge/separate main gates remain pending. No unchanged workflow retry
or real credential; all300 protected rows/acceptance and historical results remain.


## Completed delivery and connected public probe

This section supersedes the pending-delivery statements above without rewriting
their historical observations. [PR #233](https://github.com/MulattoTech/MTerm-CLI/pull/233)
was delivered from replacement head `50be8591ef9c492b4148eaa8e429dac6977787cf` and
merged normally at `c69762da7d1dda54f7a74795c08c1f699367c77f`, tree
`70af939ceddcef7c6c51e827cb25af10ed469704`, at 17:32:34 UTC. The first blocked
candidate remains a recorded failure. The [delivery receipt](2026-11-09-staging-handoff-delivery.json)
identifies all six replacement-candidate jobs and six separate actual-main jobs.
Every required job and step succeeded. Each full-source lane passed all134 helper
cases: Windows passed1036/1036; fast, Ubuntu and both macOS architectures passed1024
with the same12 existing Windows-specific skips. Installed/native Codex0.160.1
fixtures performed zero model requests; native source/installed isolation and
actual owned cleanup evidence remain separately audited.

The actual connected Cloudflare-to-Windows **public probe** ran against the
qualified50be source with portable Node24.21.0 and independently calculated bundle
`6713bb0045c4ce874b054fddab5a9dac4744dd40c1ddb0bbc79f862e83a621f4`.
The [unaltered probe receipt](2026-11-09-staging-handoff-connected-probe.json), SHA256
`77f79e9f83f586b886f915dc5756d710010e53e536592148b74c12df30bf0fa1`, records actual
RSA3072/OAEP-SHA256 and AES256-GCM sealing, exact one-frame delivery and an anonymous
child pipe. The launcher naturally exited0 after46.22seconds; the receiver recorded
natural child close, no requested termination, and success. An independent Windows
observer verified the launcher-to-receiver identity and final absence of all three
recorded PIDs. The short-lived child-parent edge was not independently observed
while live. All owned diagnostic processes were subsequently observed absent.

Observed privacy evidence comprises18 captured files totaling54,079bytes and nine
exact owned history entries. Only the exact reviewed function source was excluded
from the scan; runtime matches were not filtered. No public payload marker occurred
in the captured runtime data. The independent saved-evidence review passed54
consistency assertions; these are artifact checks, not54 additional product tests.
This probe used no real credential, made zero Cloudflare API requests and no staging
gateway request, and supplied no authenticated or principal-recovery acceptance.
The scope does not include global logs, upstream internals, memory erasure or host
attestation.

The [final actual-main checkpoint](https://github.com/MulattoTech/MTerm-CLI/issues/231#issuecomment-6747183079)
records narrow issue231 closed at17:45:11UTC and the claim released; its historical
coordination branch remains. Main audit SHA256
`f1ad1d26464a2124aa8c10b8947ce7b1e2e5f4688a834da4d4932c2d02a3a381`
binds the actual main commit, both parents, equal candidate tree, six successful
jobs and retained native artifact. CLI290/299 receive bounded evidence only;
all300 protected rows,29.36% maturity, DCP0/48 and WEB0/12 remain unchanged.

Issue232 is now separately claimed for owned-principal recovery. Its
[provider diagnostics](2026-11-09-staging-provider-diagnostics.md) record two rejected
creation attempts and no successful token lifecycle or credentialed cleanup. The
recovery source and a fresh live staging smoke remain separate qualification work;
closing narrow231 did not close issue232 or broad61/65.
