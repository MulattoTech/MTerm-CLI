# Gateway request ownership — 2026-11-09

Session `MTERM-WEB-20261109T031131Z-e0efd5d4`, OpenAI / GPT-6 Astra Pro
(self-reported), ChatGPT Web. Atomic `coord/mterm/issue-65`,
[claim receipt](https://github.com/MulattoTech/MTerm-CLI/issues/65#issuecomment-6733115075),
branch `fix/issue-65-request-ownership-20261109`. Sole implementation writer;
independent read-only reproduction and design review.

Base is merged PR218 commit `b20c020537c5b8fb8d654ea6e39a429fb81cacb8`,
tree `cf0c2a22732728f670108ec00b0d69482ef09ad6`, identical to reviewed candidate
`2bd7fa595542c00960e378c34c904fd9d643957a`. All six PR218 checks passed;
[qualification](https://github.com/MulattoTech/MTerm-CLI/pull/218#issuecomment-6733105333)
and [committed artifact receipt](https://github.com/MulattoTech/MTerm-CLI/pull/218#issuecomment-6733032249)
are durable. All six separate PR218 merged-main checks passed, with actual logs and
installed/native bindings independently inspected. The [final main receipt](https://github.com/MulattoTech/MTerm-CLI/issues/55#issuecomment-6733220125)
records the exact identities and qualification.

## Confirmed defect

A JSON-RPC ID identifies the active request under one bearer credential. The
registry also assigns a unique internal request ID to each admitted job. Its active
lookup expires one second after the original job deadline, allowing the client to
reuse the JSON-RPC ID while an older HTTP handler or terminal result still exists.

The old `jobResult` transition unconditionally removed that lookup. Consuming an
old timeout, cancellation or completed result could therefore remove the newer
request's index: duplicate admission stopped returning HTTP409, and a public
cancellation notification no longer reached the replacement. A second consumption
incorrectly synthesized `REMOTE_CONSUMED` and again removed the current lookup.

Separately, both the HTTP abort and timeout callbacks sent only the bearer and
JSON-RPC ID. An old handler's delayed cleanup could cancel a newer request that
reused that ID. Independent reproduction observed both callback failures before any
old-result consumption, isolating them from the index-deletion defect.

This is a same-credential request-lifetime failure, not evidence of cross-user data
access. Different bearer and numeric/string-ID isolation remain tested controls.
No raw HAR, real credential or owner workspace data was used.

## Behavior correction

After existing access, job-ownership and device checks, a consumed job now returns
the existing HTTP409 `result_already_consumed` before any mutation. First authorized
consumption still returns the old terminal result even when its active lookup is
absent or belongs to a newer request. It removes the lookup only when the stored
internal request ID still matches the job being consumed.

The HTTP handler captures its internal request ID immediately after admission and
includes it as `expectedRequestId` in its private cancellation callback. That same
callback handles both abort and deadline cleanup. The registry authenticates first,
validates any present expected ID as a UUID, and makes a mismatching or missing
lookup a no-op. It never selects another job directly from that supplied ID.
Malformed present values cannot silently fall back to unbound cancellation.

Public `notifications/cancelled` continues to select the current request under the
authenticated bearer and JSON-RPC ID. A matching private cancellation still cancels
its own current job. The public wire protocol, active lease duration, request
deadlines, capacity limits and no-replay policy are unchanged.

The existing serialized registry fetch keeps comparison and deletion in one
excluded transition. This is not a new distributed transaction or storage-failure
recovery guarantee. Already-dispatched device work retains cooperative cancellation
and its existing deadlines; no immediate OS interruption is claimed.

## Actual regression evidence

All twelve new cases were written and formatted before either behavior source file
changed. The final fixture imports actual gateway/registry source directly; no
TypeScript rebuild supplies the behavior under test. Node24.22.1, Linux x64.

| Execution | Observed result |
| --- | --- |
| Final gateway fixture on unchanged source | **38 cases: 29 passed / 9 assertion failures**, zero skips/cancellations |
| Corrected gateway, admission and agent suites | **50/50 passed**, zero failures/skips/cancellations |
| Independent frozen gateway execution | **38/38 passed**, zero failures/skips/cancellations; hashes unchanged before/after |

[RED TAP](2026-11-09-request-ownership-red.tap) and
[focused GREEN TAP](2026-11-09-request-ownership-green.tap) retain actual execution.
Only trailing whitespace is removed from committed display. The raw hashes and
reviewed source hashes are in the [change record](../ai/changes/2026-11-09-request-ownership.json).

The original 26 gateway cases remain. Twelve additions cover:

- First consumption of an old timeout, cancellation or complete result after ID
  reuse preserves the replacement index, duplicate HTTP409 guard and one delivery.
- Public cancellation still reaches a replacement after old-result consumption.
- Repeated consumption returns HTTP409 with old/new job and index bytes unchanged.
- Actual old HTTP abort and deadline callbacks leave replacement work runnable.
- Seven malformed expected-ID values fail without job/index mutation.
- Stale private IDs require authentication, cannot select another job and cannot
  use a missing active index to bypass normal lookup.
- Public cancellation preserves bearer/client and numeric/string-ID separation.
- Matching private cancellation still cancels its own job.
- An absent active index still permits the first authorized terminal consumption.

Fixtures use actual local JWT/signature, OAuth consent/PKCE/token and pairing code
with synthetic identities/certificates and serialized in-memory storage. Controlled
time advances past an actual job deadline; a real zero-capacity poll processes its
timeout and refreshes device presence before replacement admission.

HTTP tests wrap the private binding outside registry serialization. The abort case
holds the old result lookup; the deadline case holds an actual `{pending:true}`
response and uses the handler's real 500 ms polling delay. Explicit observation
gates establish when cancellation settles. Both cases observe the replacement
before old-result consumption, release gates in `finally`, and await the old HTTP
handler with bounded test-only observation timers. These timers do not change
production cleanup or admission behavior.

## Qualification and limits

Independent final source/fixture review is clear and its one frozen execution passed
38/38. Explicit roadmap review/render/check and normal build/typecheck/format/parity
gates passed. Documentation, protected-field and raw-log normalization reviews are
clear. All six
exact-head hosted/platform/installed-package/native gates are required before normal
expected-head merge, with separate merged-main verification afterward.

The gateway is not shipped in the npm CLI package. Existing installed admission
fixtures bind an installed agent to the source gateway; they do not establish an
installed or deployed gateway. No CLI compiled module, dependency, pin or lockfile
changes in this slice.

No actual Cloudflare storage/network fault, owner browser/client session, live
credential, device, grant, Worker deployment, bridge, private plugin or global
runtime was modified or qualified. No new provider, orchestration backend or
model-consuming worker was introduced. General HTTP retry/replay, persistence
failure recovery, fairness, load/soak and 20–30-client acceptance remain open.

CLI-288 and WEB-009/012 receive evidence only. All protected fields, historical
records, seeds, weights, stages, estimates, dependencies and AUG/DCP/WEB acceptance
remain unchanged. Broad #65 and related #62/#54 remain open. Standing owner
authorization covers ordinary integration after technical qualification without
another manual gate.
