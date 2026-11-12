# Independent admission-lifetime bypass and regression review

## Result

**No confirmed surviving bypass or compatibility regression was found in the supplied two-file candidate.** This is a focused read-only candidate review, not a whole-repository security assessment or a deployment certification. No repository source was edited by this reviewer, and no additional agent was delegated.

Provider/model: OpenAI / GPT-6 Astra Pro, self-reported. Review date: 2026-11-12 UTC.

The reviewed base is `6a6a883f3ce1cd86a7405d2c53a1fb08cd1210c2`. The supplied candidate diff SHA-256 is `04bfdc8a8fbe862dac782564aaa5aedb71767e4348b249f89f7376081c2d461a`. The working-tree diff for `gateway/registry.mjs` and `tests/remote-gateway.test.mjs` matched that artifact before and after execution. Those source/test bytes did not change during review.

## Independently reconstructed invariant and path

The admission decision for a **new** queued remote read must occur while both the authenticating access token and its validated grant remain live. The lifetime condition is strict: each expiry must be greater than the fresh decision timestamp. No job row, RPC active lease, or `allow-read`/`queued` audit may be introduced after a refused decision. An already-valid decision may finish persistence after expiry; this is not a requirement to roll back I/O that began from a valid admission.

`gateway/app.mjs:85-88` performs the initial MCP bearer authorization. Its read-tool dispatch at `gateway/app.mjs:159-172` uses the five exact `READ_TOOLS` names and the explicitly supplied device ID; all file-tool calls reach the single private `enqueue` action. `mterm_list_devices` uses a separate inventory path and creates no queued job. The remote wire contract contains no alternate write/process tool or compatibility alias that bypasses enqueue (`src/remote/protocol.ts`, `dist/remote/protocol.js`).

`gateway/registry.mjs:163-190` validates access token kind, lifetime, resource, scope, owner epoch, grant liveness/revocation, and matching owner/client identity. Enqueue then awaits rate bookkeeping, exact owned-device checks, job traversal, the RPC digest, and the active-lease read (`gateway/registry.mjs:680-697`). The unchanged base could cross either credential expiry in these awaits and still create a queued job.

The candidate retains the **validated grant's** expiry in the internal authorization snapshot and checks both lifetimes at `gateway/registry.mjs:698-704`, after the last awaited admission read. The same fresh timestamp supplies the existing request-lease/presence decisions and the job deadline. There is no further await between the lifetime decision and invocation of the first job write (`gateway/registry.mjs:705-721`). The current token-record schema needs no migration: the new internal field is derived on every successful access authorization, and a stale same-named token property cannot override the grant value.

`fetch()` retains the existing serialized `blockConcurrencyWhile` transition boundary (`gateway/registry.mjs:104-115`). The inspected public entry points do not permit callers to replace the validated snapshot or select another registry instance (`gateway/app.mjs:46-58`). No candidate change weakens device ownership, capability checks, read-only protocol restrictions, or grant/epoch validation.

## Concrete adversarial verification

The independently authored `independent-boundary.test.mjs` constructs synthetic token, grant, device, and job records in an owned in-memory storage implementation. It rejects every attempted external `fetch`. It imports the candidate directly and imports a separate unmodified baseline registry copied from `git show HEAD:gateway/registry.mjs`; unchanged security/protocol dependencies are copied alongside that baseline. No real credentials, profiles, network endpoints, production runtime, or model-consuming CLI were used.

The two baseline controls reproduced the reported path at the final active-lease read:

- Expired token with a still-live grant: enqueue returned 200 and persisted a job, active lease, and queued audit. A subsequent authenticated device poll delivered that job. Result retrieval with the expired bearer returned `401 invalid_token`.
- Expired grant with a still-live token: enqueue still returned 200 and persisted those admission records. The later poll's existing grant check suppressed delivery, and result retrieval returned `401 invalid_token`.

The candidate was then challenged at eight awaited phases: rate read, rate write, owned-device read, the later device-epoch read, job listing, expired-row cleanup deletion, RPC digest, and active-lease lookup. Both token and grant expiry were tested one millisecond before, exactly at, and one millisecond after the boundary. The before-expiry controls admitted and delivered the exact selected job. The equality/after cases returned `401 invalid_token`, created no admission rows or queued audit, and produced no subsequent delivery. Numeric and string JSON-RPC IDs were exercised.

All five public read-tool routes were separately tested with both late token and late grant expiry. Every route preserved the existing HTTP 401 body and Bearer `invalid_token` challenge, with no queue side effects. These tests avoid the false positive of checking HTTP status alone: the baseline can return a later retrieval error despite having already admitted work.

## Compatibility and state behavior

The independent tests also established these controls:

- The public `access` action retains its exact `{ userId, clientId, scope }` projection; the internal grant lifetime does not leak into it (`gateway/registry.mjs:485-488`). The other direct `access()` callers consume explicit fields, not the whole snapshot (`listDevices`, `jobResult`, and `cancel`).
- A stale `grantExpiresAt` field placed in the synthetic token row, together with lifetime fields supplied in private action input, could not override the actual validated grant expiry.
- A decision made just before expiry can still finish job persistence after expiry. The candidate does not add rollback, a second late commit check, or a new post-commit failure branch.
- A refused request releases the existing serialized handler normally; an independent live client/grant can subsequently enqueue and receive its exact job.

The repository-focused tests independently passed in this review. They cover the nearest complete gateway/admission behavior, including the candidate's request-in-progress and device-offline precedence checks, legitimate admission, public error challenge, separate clients, queue capacity, delivery admission, request ownership, and existing OAuth/grant expiry behavior. Earlier checks and errors retain their code/order in source; the new expiry refusal occurs only after the prior final request-lease and presence refusals.

Rate bookkeeping, alarm initialization, and expired-row pruning can precede a refused final decision, as before. The new condition adds no new persistent row, background task, timer, lock, or stored schema. The review did not identify a concrete resource/state regression from those existing pre-admission operations.

## Commands and observed results

Executed with Node `v24.22.1` from `/workspace/scratch/267bdf8cab08/MTerm-CLI-Admission`.

| Gate | Command | Observed result |
| --- | --- | --- |
| Syntax | `node --check gateway/registry.mjs` | Exit 0 |
| Syntax | `node --check tests/remote-gateway.test.mjs` | Exit 0 |
| Fixture syntax | `node --check /workspace/scratch/267bdf8cab08/admission-bypass-review/independent-boundary.test.mjs` | Exit 0 |
| Independent baseline/candidate boundary verification | `node --test --test-concurrency=1 --test-reporter=tap /workspace/scratch/267bdf8cab08/admission-bypass-review/independent-boundary.test.mjs` | Exit 0; 65 pass, 0 fail, 0 skip |
| Nearest complete repository suites | `node --test --test-concurrency=1 --test-reporter=tap tests/remote-gateway.test.mjs tests/remote-admission.test.mjs` | Exit 0; 84 pass, 0 fail, 0 skip |
| Diff integrity | `git diff --check -- gateway/registry.mjs tests/remote-gateway.test.mjs` | Exit 0 |

Full outputs are retained in `independent-boundary.tap`, `repository-focused.tap`, the corresponding command JSON/stderr files, `syntax.json`, and `diff-check.json`. These are results executed by this reviewer, not claims imported from another investigator.

## Exact source identity

| Reviewed file | SHA-256 |
| --- | --- |
| `gateway/registry.mjs` | `93e500ddfbcdd6d1d16e099692fff2252ebabe5fc7987a2127be2ae1a7cc87f7` |
| `tests/remote-gateway.test.mjs` | `5e74025e5ada1dae57336a9b93133d022f99335b032784532da8fedc40c21b24` |
| `gateway/app.mjs` | `61b5c43a8ce7dc6fc61d772fcc16c4a4b7d5cb8f17c70555829fae3ce53e42a1` |
| `gateway/security.mjs` | `78aa4d7f9f632568d2247d249691b7583dbf73d344bd040d6512104741183b7b` |
| `src/remote/protocol.ts` | `43e8c5067e8a2e4878b76f2ec6c0871dca499a02d5cd02cd31ecef57a8a3ed28` |
| `dist/remote/protocol.js` | `83e0991bca35853a2560ab8fd837c50cdfb479c744ddcbaf7e641764d3f3ac14` |
| `tests/remote-admission.test.mjs` | `885e136acf1a618d3fd9465126410df336323305c7ebb37a6ac80544cf3254ff` |

`source-hashes-before.json` and `source-hashes-after.json` also record policy-file hashes, timestamps, base HEAD, and candidate-diff equality. `docs/SECURITY.md` changed during the review while the implementation owner continued documentation work; this review read the earlier relevant security contract, and the supplied candidate source/test diff remained unchanged. That additional documentation edit is not included in this candidate review result.

## Remaining limits

No actual Cloudflare Durable Object, live gateway, deployed agent, external identity provider, full-package build/check, hosted CI, installed-package matrix, or production restart was exercised. The owned storage fixture models the existing serialization contract; it does not qualify real backend timing, crash atomicity, or hostile-load behavior. Those are distinct parent delivery gates and are not claimed by this review.

The reviewed invariant is final **new-job admission** lifetime. Jobs admitted while authorization was valid retain the existing subsequent delivery/result lifecycle. This review does not claim a new result-disclosure bypass, retroactive cancellation at bearer expiry, or a stronger expiry guarantee for unrelated registry actions.

No source change is requested as a result of this review.
