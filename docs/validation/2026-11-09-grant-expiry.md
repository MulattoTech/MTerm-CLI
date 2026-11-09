# Gateway grant expiry — 2026-11-09

Session `MTERM-WEB-20261109T031131Z-e0efd5d4`, OpenAI / GPT-6 Astra Pro
(self-reported), ChatGPT Web. Atomic `coord/mterm/issue-55`,
[claim receipt](https://github.com/MulattoTech/MTerm-CLI/issues/55#issuecomment-6732784685),
branch `fix/issue-55-grant-expiry-20261109`. One implementation writer and
independent read-only review. Source base is frozen PR217 commit
`5660ae2cd91840e70af2a41e58e8b8d39154c40c`, tree
`79c7cfbef8fd380fe12bf8625ac67a4434edd547`.

PR217 normally merged as `cb383b958c88cedc0dfc446c9b6502e00e730840`, with that
identical tree. All six exact-head and all six separate merged-main checks passed; the
[main receipt](https://github.com/MulattoTech/MTerm-CLI/issues/149#issuecomment-6732940619)
records the independently inspected logs and exact identities.

## Defect and decision boundaries

Ordinary access and refresh handling already rejected expired OAuth grants.
The agent-poll dispatch and agent-result gates checked existence, revocation and
account epoch but omitted grant expiry. An expired grant could remain physically
stored until a later cleanup sweep. During that interval, a queued job could be
delivered and a result could be accepted and retained despite normal client access
returning HTTP401. Independent reproduction used the actual gateway/registry and
minted token records; this defect is independent of PR217's capacity field.

This did **not** prove that an expired client could retrieve the retained result:
ordinary access correctly denied that client. The confirmed gap was authorization
of delivery and result acceptance after grant expiry.

Polling now validates every queued or delivered job's current grant and epoch,
including when offered capacity is zero. Expired, missing, explicitly revoked or
stale-epoch authorization finishes only that job as `revoked`. Existing job cleanup
removes its arguments, sets the cooperative abort marker, frees broker admission
and writes the existing sanitized audit metadata. The common response path returns
that cancellation marker in the same poll. Repeated polls do not repeat the terminal
transition or audit event.

Result submission retains device authentication, job/device ownership, pending-state
and deadline checks before any such mutation. An invalid grant finishes that job as
`revoked` and returns the existing HTTP410 `request_revoked`, before retaining output.
A repeat submission encounters the existing HTTP409 pending-state guard. The device
and unrelated grants remain usable; a success authorized before expiry retains its
existing retention policy.

Grant and epoch storage reads can themselves cross an expiry boundary. Both paths
therefore evaluate a fresh decision time after those awaits and recheck the job
deadline. Existing timeout precedence remains intact. A delivery's recorded time
uses the same checked timestamp. These are checks at the broker's decision
boundaries, not a guarantee that a previously dispatched operation can be instantly
interrupted or that its network response arrives before grant expiry.

## Actual regression evidence

Only the fixture changed before the RED execution; the gateway was still the exact
base source. No TypeScript/runtime module changed, and the fixture imports the
gateway source directly. All final fixture cases were present before the behavior
correction. Local runtime: Node 24.22.1, Linux x64.

| Execution | Observed result |
| --- | --- |
| Final gateway fixture on unchanged source | **26 cases: 16 passed / 10 failed**, all ten failures assertions; zero skips/cancellations |
| Corrected gateway plus existing admission/agent suites | **38/38 passed**, zero failures/skips/cancellations |
| Independent final gateway execution | **26/26 passed**, zero failures/skips/cancellations; hashes unchanged before/after |

[RED TAP](2026-11-09-grant-expiry-red.tap) and
[focused GREEN TAP](2026-11-09-grant-expiry-green.tap) retain actual results.
Only trailing whitespace is removed from committed display; raw hashes are in the
[change record](../ai/changes/2026-11-09-grant-expiry.json).

The gateway fixture retains all fourteen previous tests and adds twelve:

- Legacy, zero-slot and four-slot polls encounter one queued and one previously
  delivered job exactly at grant expiry. Both are revoked and returned as cancelled
  while the expired grant remains physically stored; no alarm sweep runs.
- Exact-expiry, after-expiry and missing-expiry result submissions fail before
  storing their output. Stored arguments are removed, repeat submissions stay
  rejected, and output sentinels are absent from audit and job records.
- A just-before-expiry success remains valid. A separate still-valid client grant
  continues access and result completion after the first grant expires.
- The existing job deadline wins when both time boundaries expire.
- Four scheduling cases cross either grant expiry or job deadline during the actual
  epoch read, independently in poll and result handling. None dispatches or accepts
  a stale-authorized result.

The tests use the existing full local JWT/signature, OAuth registration/consent/PKCE,
token and pairing implementation with synthetic identities and certificate lookup.
Only the fixture-owned grant's expiry is shortened to one second after setup; the
access token, device heartbeat and original twenty-second job deadline remain valid
in grant-boundary tests. Enqueue goes through the actual serialized registry fetch
path, avoiding a pending twenty-second public tool-call request. In-memory storage,
controlled clocks and storage-read scheduling are explicit test mechanisms.

## Qualification scope and continuation

No gateway is shipped in the npm CLI package. Existing installed-agent admission
fixtures still exercise the reviewed source gateway and bind its exact files; they
do not establish installed-gateway or live Cloudflare authorization acceptance.
The full exact-head hosted/platform/package/native gates remain required before
normal merge, with separate merged-main verification afterward.

No actual Cloudflare account, binding, credential, grant, device, Worker deployment,
owner browser session, production bridge, private plugin, global runtime or unrelated
project was modified. No new dependency, provider, orchestration backend or
model-consuming worker was added. This does not replace live two-client/owner-browser
OAuth acceptance, certify Cloudflare storage behavior, change the existing lost-poll
response/replay policy, or establish 20–30-client/load/soak readiness.

CLI-290 and WEB-002/009 receive evidence only. Protected requirement fields, historical
records, stages, weights, estimates, dependencies, seeds, pins and all AUG/DCP/WEB
acceptance remain unchanged. Broad #55 and related #62 remain open. Standing owner
authorization covers ordinary expected-head integration after independent review
and required automated checks; no new manual gate is introduced.

Independent source/fixture and documentation/protected-field reviews are clear.
Explicit roadmap review/render/check, normal build, parity, typecheck, formatting
and diff checks passed. Exact candidate hosted qualification remains next.
