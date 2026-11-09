# Bounded staging recovery helpers — 2026-11-09

## Outcome and qualification boundary

Issue [232](https://github.com/MulattoTech/MTerm-CLI/issues/232) adds a separate
owned-token protocol to the staging handoff helpers. It supports a bounded public
ownership bootstrap, one optional explicit renewal, one rotation of the selected
original token, and a cleanup child that revokes the authenticated staging
principal's MTerm authority. The existing protocol1 probe/create-only smoke and
original smoke harness remain unchanged.

This is local source and deterministic fixture evidence. Actual provider token
expiry, renewal, rotation, connected encrypted cleanup, Windows runtime, hosted
candidate/main gates, and WEB-008/WEB-012 acceptance remain unqualified for this
change. The two real provider creation attempts described below were rejected.
Their rejection does not identify a duration or permission cause. No further
provider operation was performed by this worker.

Prepared by OpenAI / GPT-6 Astra Pro (self-reported), worker
`/root/recovery_implementation`, session
`MTERM-WEB-20261109T131339Z-resume-a9287b3c`. Exact base:
`c69762da7d1dda54f7a74795c08c1f699367c77f`; branch
`feat/issue-232-staging-recovery-20261109`;
[exclusive root claim](https://github.com/MulattoTech/MTerm-CLI/issues/232#issuecomment-6747207135).
The root owns shared ledger/document updates, remote coordination, live work and
publication. The worker owns only the two helpers, new recovery fixture, and
these two unique validation/provenance records.

## Public protocol and fixed scope

| Mode | Protocol/purpose | Fixed child or operation |
| --- | --- | --- |
| `probe` | Existing protocol1, `mterm-staging-handoff` | Fixed public probe; no provider operation |
| `smoke` | Existing protocol1, `mterm-staging-handoff` | Existing create-only sender and unchanged smoke harness |
| `cleanup` | Protocol2, `mterm-staging-owned-handoff` | Fixed receiver `--cleanup-child` |
| `smoke-owned` | Protocol2, `mterm-staging-owned-handoff` | Unchanged smoke harness, selected original token |

Owned modes require Windows, the existing independently selected source/bundle
and deployed commit, and one bounded canonical public environment JSON value
`MTERM_STAGING_OWNED_TOKEN_JSON`. Its exact ordered keys are `ownership`, `renewal`.
Ownership has ordered keys `tokenId`, `tokenName`, `creationRunNonce`,
`originalCreatedAt`, `originalExpiresAt`, `staging`. UUID/nonce spelling is
canonical lowercase, and the name is exactly `mterm-staging-handoff-` plus the
original creation nonce. Original UTC provider timestamps retain provenance;
renewal and rotation need not preserve provider creation/update timestamps.
No observed expiry is calculated from creation plus requested duration.

The fixed context is account `9e18ebcb3c1a920c9ef58a3d61b8d6b6`, gateway
`mterm-gateway-staging`, MCP origin `https://mcp-staging.m-techlabs.com`, dashboard
origin `https://mterm-staging.m-techlabs.com`, issuer
`https://broken-breeze-d0bb.cloudflareaccess.com`, audience
`9533396534dbc90c78bae02791ecdd0fab21f775876ed7164ed3b57bf54e1563`, registry namespace
`b66edc2d536e474093e1a18d0e88a24d`, and registry class `MTermRegistry`. These are
source-fixed context, not caller-selectable stores or tenants. Renewal is exactly
`none` or `30m-if-needed`.

The protocol2 challenge retains the common source/context fields, followed by
`ownership`, `renewal`, `publicKey`. The independently reviewed sender selection
contains the seven existing mode/source fields plus ownership and renewal; merely
copying fields from an untrusted challenge would not establish independent review.
Authenticated encryption binds the complete canonical context plus the sealer's
`providerObservedAt`, observed `tokenExpiresAt`, renewal boolean and `rotated:true`.
Plaintext remains exactly `client_id` and `client_secret`. Public UUID/name/nonce
metadata may appear in reconciliation receipts. Client IDs, secrets, actor IDs,
credential-derived hashes and raw provider/child errors may not.

Both sides use real RSA3072 OAEP/SHA256, AES256-GCM, one canonical frame and the
existing 120-second wall/monotonic delivery bound. The receiver accepts an observed
provider expiry only when its sealer observation is at most 120 seconds old and
at most 5 seconds in the future. It anchors remaining token lifetime to a
monotonic receipt timestamp. Immediately after all crypto/source/spawn awaits and
before the anonymous child pipe is written, both wall and anchored remaining
lifetime must be strictly greater than 455000 ms (450-second child bound plus
5-second close allowance). No await follows that final admission decision.
Wall-clock rollback cannot extend this eligibility.

## Separate sender functions

Each new export is self-contained when copied alone into a WebCrypto-only
Cloudflare execution. It has no sibling-export or Node-global dependency. The
legacy `sealStagingHandoff` function remains byte-identical as a function; its
historical create/delete behavior is not used by either new export.

`bootstrapStagingRecovery(publicCreationNonce, cloudflare, selectedAccountId)`
uses a separate 30-second wall/monotonic decision bound and one POST with only the
derived name and explicit `duration:'30m'`. A successful acknowledgement and valid
exact UUID are captured before later metadata/deadline checks. Returned secrets
are discarded inside that execution. One exact-ID GET must observe matching
ID/name/private Client ID, `enabled:true`, valid UTC creation/expiry and more than
10 minutes but at most 30 minutes plus 5 seconds of remaining lifetime. Only then
is a public ownership ledger returned. A missing optional provider field fails
closed. The helper does not delete, retry, adopt by name, change policy/bindings or
create a receiver. Unknown, partial and late outcomes retain reconciliation data.
The deadline bounds the decision and next operation; it does not cancel an
in-flight provider request.

`sealOwnedStagingHandoff(challenge, cloudflare, selectedAccountId, reviewed)`
validates the full independent public selection and prepares actual RSA/AES
operations before any mutation. It reads the fixed Worker's settings, deployment
history and exact active version. The current rollout is the first deployment;
it must explicitly use percentage strategy with exactly one valid version at
100 percent. Older deployments are history, never fallback candidates. This
selection follows the [official deployment-list contract](https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/deployments/methods/list/).
The version response must identify the requested version. Both latest settings
bindings and active version resources must contain unique fixed issuer, audience,
origins, staging/enabled flags, expected build, registry namespace/class and one
bounded plain-text private service selector. Registry script/environment routing
overrides are rejected. Required absent or ambiguous observations deny mutation.

One exact selected-token GET must match original UUID/name/private Client ID and
observe `enabled:true` and valid expiry. At most one exact-ID PUT containing only
`duration:'30m'` is allowed, only when remaining lifetime is at most 10 minutes
and renewal permission is `30m-if-needed`. It is followed by an exact readback.
More than 10 minutes and at most 30 minutes plus 5 seconds must remain before one
exact-ID `/rotate` POST with `{}`. Its UUID/private Client ID and returned secret
are validated; undocumented rotate expiry metadata is not required. Exact token
GET readback independently observes expiry. The helper rereads latest/current
Worker context and requires the same version, fixed context and private selector.
It rechecks challenge freshness and observed lifetime after sealing awaits.

Receipts distinguish attempted mutations from acknowledged API success, including
returned rejections, lost responses, late successful responses and later identity
failure. All owned failures retain original resource/route metadata. There is no
owned DELETE, replacement create, refresh, re-enable, blind retry or historical
version fallback. These are point-in-time observations, not continuous context
stability or provider attestation; actual pre/post reconciliation remains root work.

## Fixed cleanup child and process lifecycle

The cleanup child reads credential JSON from its anonymous stdin and the expected
deployed commit from the existing nonsecret environment value. It makes no SDK,
pairing, OAuth issuance, agent, file-report or temporary-tree operation. Its only
possible endpoints are the two fixed origins and this successful sequence:

1. Public `GET /health`: HTTP200, enabled staging, expected edge build.
2. Authenticated dashboard `GET /api/dashboard`: HTTP200, authenticated staging
   service identity, expected registry build and valid bounded device/grant arrays.
   Existing nonempty inventory is allowed; records are never returned.
3. Authenticated same-origin `POST /api/revoke-all` with exactly `{}`: HTTP200 and
   typed JSON `revoked === true` are both required for acknowledgement.
4. Public health read with the same final context checks.
5. Authenticated dashboard read with the same final identity/build and empty
   device/grant arrays.

An initial failure stops before mutation. After the POST is attempted, both final
reads are attempted once even if the acknowledgement is lost, rejected or timed
out, or the final health check fails. No POST retry occurs. Final emptiness cannot
upgrade a lost acknowledgement. Initially empty inventory still requires the
POST because it advances the principal epoch. Credentials are sent only to the
fixed dashboard, never public health. Redirects are manual; each request has a
30-second timeout and 1 MiB body limit. Input is bounded and the child has a
180-second wall/monotonic work bound. Timeout is not a claim that a remote server
cancelled its operation.

The parent requires the exact sanitized successful child receipt, source/build
observations, acknowledgement and empty final inventory, followed by stdin finish
and actual natural child close. Its existing 450-second outer bound also covers a
pending stdin write; late output before close still affects the result. Forced or
unconfirmed termination remains failure with cleanup unconfirmed. A direct child
invocation sets `liveAcceptance:false` and cannot certify encrypted parent
admission, full process-tree cleanup or connected acceptance.

## Tests-first lineage and local results

All raw snapshots, input bindings, TAP and stderr are retained in the owned ignored
`artifacts/issue-232-staging-recovery/` directory. The companion
[change record](../ai/changes/2026-11-09-staging-recovery.json) carries exact hashes,
commands, UTC times, outcomes and limitations. New-feature scaffold RED means a
missing new implementation, not proof of a previously working product regression.

| Evidence phase | Tests | Passed | Failed | Meaning |
| --- | ---: | ---: | ---: | --- |
| Original scaffold fixture | 193 | 23 | 170 | Explicit nonfunctional stubs; assertion failures only |
| Independently refined frozen scaffold fixture | 205 | 30 | 175 | Fresh RED before functional implementation; assertion failures only |
| First functional implementation | 205 | 205 | 0 | Frozen fixture unchanged; all 15 bound inputs unchanged |
| Review regression extension | 221 | 217 | 4 | Actual pre-fix assertion failures: history, two strategy gates and cleanup-only marker |
| Final combined recovery / original handoff / build guards | 409 | 409 | 0 | 221 recovery + unchanged134 handoff +54 build guard cases |
| Independent final recovery / original handoff | 355 | 355 | 0 | Peer rerun on the same frozen helper/fixture bytes |

The final combined run and independent peer run had zero skips, cancellations or
todos, empty stderr, exit0 and all15 bound inputs unchanged. Syntax checks for
both helpers and the fixture, Prettier on those same paths, and `git diff --check`
also passed. No normal build/full-suite/hosted acceptance is implied by those
focused checks; root owns the corresponding integration gates.

Final source and evidence hashes:

| Item | SHA256 |
| --- | --- |
| Receiver | `a3662e56818118a88248e3c8c98d34dfa9e47be456fe2e321a7f7f747e6bf390` |
| Sealer | `21a0a00cc6278ad3fd7711d9be3dd58bd7b91d420fdc949c710763eb37f81ecb` |
| Recovery221 fixture | `82e3469cfd6b31acfb5f2954c15f16966d4484870bdac75db8e2dce6a5356b19` |
| Review regression RED receipt | `6b1ed74ac7c787df4aac761ccac42a2819c83bf9f4885fe2b7ff841bd0b0a4f7` |
| Review regression RED TAP | `df7813539e4e0b3b78c15694dbdf6abfeaf86cc8952c5152f6a810a537f7a77d` |
| Combined409 receipt | `3378e283397bd744b20e21016cd2afc58d17ed75529307553b175ab0a3651e59` |
| Combined409 TAP | `8b88aa26439e4e80f313f8510dfc44a349565a1d8b8f9888d7e55c02415edd62` |
| Independent355 receipt | `ae27478a84a52dfae0b41dcfc78b364b7678935d68d58beccbf74a2302f7eba2` |
| Independent355 TAP | `192cf43e7819c6591d428aad067c2343054fe26faf104a81495498f841c15f27` |
| Syntax/format/diff checks | `79cc8dbaba30cd48b5785beecfd85cb83823890781774fb25aa77e2a1fe9fd67` |

The original 193-case fixture hash is
`883ba03eb18dc1cce563fcd951a8393c7d02ee64491b8926ffaf808d258c6e44`.
The refined 205-case fixture hash is
`e6f3fa226bc93277a1ae76ea848f406be9edfc49c6767176e5583b8d795be5f3`.
Independent peer `/root/recovery_review` cleared the refined fixture and fresh
RED before source work. Refinements include a single-export VM with no sibling
functions, all independently selected source fields, explicit attempted versus
acknowledged mutation results, returned provider rejections and a timed-out POST
acknowledgement followed by both final observations.

The actual signed synthetic gateway/registry integration creates and exercises
pre-existing device, OAuth, approved-pair and unredeemed-code authority. Cleanup
must advance only the selected principal epoch; its device and approved-pair
requests then return410, OAuth returns401 and authorization-code exchange returns400.
Unrelated principal records/epoch and all four authority checks remain unchanged
and usable. This exercises actual gateway authentication and registry logic with
synthetic signatures/storage and no external network. It does not establish live
Cloudflare Access or connected Windows behavior.

Independent review then froze a 16-case extension at
`82e3469cfd6b31acfb5f2954c15f16966d4484870bdac75db8e2dce6a5356b19`.
The resulting RED reproduced exactly four assertion failures before fixes: valid
deployment history was rejected, missing or unknown current strategy was admitted,
and cleanup accepted the smoke-only `INPUT_REQUIRED` marker. All added terminal
newline cases already passed as negative controls. Direct Node24 probes confirmed
those inputs were rejected; the suspected validator issue was not reproduced and
no validator behavior was changed. The minimal fixes select current history entry
zero with explicit percentage strategy and restrict the input marker to smoke.

The fixture also exercises real WebCrypto with independent envelope construction,
controlled source/time/process/API faults, exact operation sequences, negative
admission before effects, final release lifetime boundaries, lost/returned
acknowledgements and no credential markers in output/argv/environment. The actual
owned local Linux Node subprocess proves fixed cleanup-child dispatch and natural
`CLEANUP_REQUIRES_WINDOWS` refusal before expected-source/input validation, with
no attempted revoke. The source/input rejection cases use the controlled Windows
adapter; the native subprocess does not establish those Windows gates. No live
credential, model invocation,
Windows action or provider mutation is part of these local executions.

Preserved bytes:

- Original 134-case `tests/staging-handoff.test.mjs`:
  `e1b31bace77b662f5e73a34457aced3c5c4c5961dcbe3d1b26b978b7b0eef55c`.
- Unchanged `scripts/verify-remote-staging.mjs`:
  `208ac5b3296ae8c55986db8e947ec92c7bd678f0c045cf37014b2910ec7c811e`.
- Existing `sealStagingHandoff.toString()`:
  `200f5c2aa79944220181aa6bcdd2abcec1e404e196f04394afebb72c3d4fbe08`.

## Actual provider evidence remains blocked

Two separate 20-second creation attempts were made by the root outside this local
worker's implementation scope. They are retained independently:

| UTC event | Actual outcome | Exact-name reconciliation |
| --- | --- | --- |
| 2026-11-09 17:50:19.422–17:50:19.667 | First qualification POST rejected with known4xx; no acknowledged UUID; precise numeric diagnostic was not retained by that qualifier | Complete exact-name read found zero matches at17:52:18 |
| 2026-11-09 18:20:15.969–18:20:16.306 | Separately reviewed create-only diagnostic returned HTTP400 and numeric code12121; no acknowledged UUID | Complete exact-name read found zero matches at18:20:41.214 |

The second was a separate immutable operation, not a retry hidden in the first
receipt. No token renewal/rotation, policy or binding change, MTerm authority
creation, or connected cleanup was established. The inspected primary documents,
API schemas and Cloudflare-owned SDK/Terraform sources did not establish code12121's
meaning. A duration or permission explanation is therefore not asserted. The
20-second rejection also does not qualify the new bootstrap's explicit30m request.

Durable outcomes:
[first qualification](https://github.com/MulattoTech/MTerm-CLI/issues/232#issuecomment-6747551626),
[separate diagnostic](https://github.com/MulattoTech/MTerm-CLI/issues/232#issuecomment-6747989012).
Second diagnostic execution receipt:
`23621138d87491e4b91762e18874aa95359960b8ca1018891ae2e347da5bbfe2`;
reconciliation receipt:
`2b9201afb6979f791bbd479173b0c6eb45c09005933565b736b3f59ad9fa5e4d`;
primary-source research:
`f4b5d67805571dbe8e2d6375d05497ecb1aea900dde10289f88ecd1a6257d471`.
The separate deployment-history shape receipt retained a selection of four recent
entries, not an asserted complete history;
its exact retained receipt is
`de3c9b01da3c454910c633ff1bcf7d5519fc70880093192436cb9c12f4017d29`.
It grounds response shape, not future token metadata or live recovery. Root-owned
[provider diagnostic records](2026-11-09-staging-provider-diagnostics.md) retain the
full separate live evidence and unresolved cause.

## Limits and next unverified action

Source/bundle checks are reviewed-byte observations, not hostile-host attestation
or an atomic filesystem execution guarantee. Encryption does not authenticate an
untrusted sender by itself and does not promise JavaScript/OS memory erasure.
Provider optional fields are required by this local admission contract, not
promised present by every API response. Observed expiry and Worker context need
actual provider qualification. Expiry or deleting Cloudflare resources does not
revoke pre-existing MTerm authority; the cleanup POST's principal epoch operation
is the relevant revocation and acknowledgement is required.

CLI-290 and CLI-299 receive bounded evidence only. Protected requirement stages,
weights, catalog fields and full acceptance stay unchanged. WEB-008 and WEB-012
are evidence references, not new completion claims. Root must integrate the
reviewed local commit, review/render shared metrics and documentation, run required
exact-candidate and actual-main gates, and retain the provider/connected blockers.
Issue232 cannot close on deterministic code/CI alone. Further token creation is
stopped while the existing provider rejection remains unresolved.


## Root integration and durable evidence

Root serialized worker commit `a03b10dc439e563b00bf56c0a5f55ad83d95881d` onto the
qualified `c69762da7d1dda54f7a74795c08c1f699367c77f` base as
`9bb320ae96e44ccddbcf5cd2f2d4f9b5380de1c4`. All15 recorded helper, fixture,
manifest, gateway and compiled-protocol bindings matched the frozen worker bytes.
The exact serialized run passed **409/409**, exit0, with empty stderr and zero
skips, failures, cancellations or todos. It ran19:48:23.300–19:49:47.031UTC on
Node24.22.1/Linux x64 in83.731seconds. Root receipt SHA256
`b55f7947c3714d6bebe293eaf9ae24b94448e536dbf3ef520dbe8e88c167bd08`;
raw TAP SHA256 `93c8b1410255e0628f475181d256275ccca1f5069f0e504afeab11059ee48286`.

The following durable transcripts normalize only trailing whitespace. Their raw
source receipts/snapshots remain retained and distinct:

- [2026-11-09-staging-recovery-scaffold-red.tap](2026-11-09-staging-recovery-scaffold-red.tap), SHA256 `35979391109ce7ad82732348d8afca2e7de6d072d3a24dc4c35c179ecc666761`; raw SHA256 `5e83c375f9405b9cad2c4073c42426b176623a1a567428e67349cc0a36633b7f`.
- [2026-11-09-staging-recovery-review-red.tap](2026-11-09-staging-recovery-review-red.tap), SHA256 `b2026c40c4acea66c79d7f50c1ccec7a6639e15ea7691bf23991f0f8c1f09c42`; raw SHA256 `df7813539e4e0b3b78c15694dbdf6abfeaf86cc8952c5152f6a810a537f7a77d`.
- [2026-11-09-staging-recovery-green.tap](2026-11-09-staging-recovery-green.tap), SHA256 `93c8b1410255e0628f475181d256275ccca1f5069f0e504afeab11059ee48286`; raw SHA256 `93c8b1410255e0628f475181d256275ccca1f5069f0e504afeab11059ee48286`.

The205-case scaffold is an honest new-feature baseline. The221-case review
regression is a separate pre-fix result on the first functional implementation;
its four failures and already-passing newline controls are not relabeled. The409
GREEN binds the final integrated source and both unchanged legacy suites.

Root also preserves the [completed PR233 delivery](2026-11-09-staging-handoff-delivery.json)
and [exact original public-probe receipt](2026-11-09-staging-handoff-connected-probe.json),
plus the [separate provider diagnostics](2026-11-09-staging-provider-diagnostics.md).
Independent historical/provider document review was CLEAR after correcting the
merge event to17:32:34UTC (main workflow creation was17:32:36UTC). Shared guides
preserve original timestamp strings through explicit PowerShell7.5+ date handling;
this is a guide correction, with no change to frozen helper behavior.

Only CLI290/299 evidence/notes and dated WEB008/012 explanations are appended.
All300 protected requirement fields, seed, historical evidence and DCP/WEB ledger
acceptance remain unchanged. Normal explicit roadmap review/render and reviewed
build/parity/typecheck/format gates, independent shared-catalog review, all six
exact-candidate hosted jobs and six separate actual-main jobs are recorded
separately. The known local Unix-socket full-suite limitation is not rerun or
represented as PASS. No full local or quick-verifier success is claimed. Source
qualification does not close issue232: actual provider lifecycle and connected
cleanup remain unqualified. Further token writes remain held; no completed intent
or guard is reset or repeated.


Normal explicit review/render, reviewed build/parity, typecheck, complete source
formatting and whitespace checks then passed, each with actual exit0. Source
fingerprint `b504ded585eee440d27c1b95dad1042c5e2c3987a452b4008b1553bbdeaef3c0`
covers182 entries; gate receipt SHA256
`b5638c490439054c1a09f9f96b4f5d50f3f00c387c97f7596733d5d9a7c9d078`.
All15 tested bindings remained unchanged after the build. Only the existing npm
`http-proxy` configuration warning appeared. Maturity stays29.36%, with0complete,
45blocked and126notStarted; no protected stage or acceptance change. Independent
shared-catalog review and exact hosted candidate/actual-main gates remain separate.

## Subsequent source delivery — PR234

[The source-delivery record](2026-11-09-staging-recovery-delivery.json) preserves
separate exact-candidate and actual-main qualification. Candidate3cde9c86 and
normally merged actual3077a7fe share tree5164e59b; each passed all six required
jobs with independently inspected logs and native artifacts. The source claim
was released at2026-11-09T20:31:59Z, with its historical text and refs retained.
Issue232 and broad61/65 remain open: actual provider expiry/renewal/rotation,
connected Windows cleanup and temporary-resource reconciliation are unqualified.
The two rejected creation attempts remain the complete history; no new provider,
Windows, policy/binding or deployment operation occurred during source delivery.
Every preceding preparation/execution observation retains its original scope.
