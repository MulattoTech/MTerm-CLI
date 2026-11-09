# Remote delivery admission — 2026-11-09

Session `MTERM-WEB-20261109T031131Z-e0efd5d4`, OpenAI / GPT-6 Astra Pro
(self-reported), ChatGPT Web. Atomic claim `coord/mterm/issue-149`,
[claim receipt](https://github.com/MulattoTech/MTerm-CLI/issues/149#issuecomment-6732586571),
feature branch `fix/issue-149-poll-capacity-20261109`. One implementation writer,
independent read-only reviewers. Source base is main
`f38c2c4522dc68e25fd220593d6b056068902a58`, tree
`aeb80415cf79295ce17354da245ced1e68cca3ea`; all six PR216 and separate main checks
passed, as recorded in the [main qualification](https://github.com/MulattoTech/MTerm-CLI/issues/61#issuecomment-6732648081).

## Reproduced defect and correction

The gateway correctly limited ordinary admission to four pending requests. However,
cancellation, timeout, or consumption of a completed result could release gateway
admission while the agent still owned four execution/cleanup/result-delivery slots.
A subsequent poll marked a replacement delivered. The agent then skipped it because
its local capacity remained full, and the gateway's no-replay policy did not deliver
it again. Independent triage reproduced this with the actual registry and agent.

The agent now advertises `availableSlots` on each poll: the smaller of its remaining
four-slot execution capacity and remaining 4096-entry replay-tracking capacity,
bounded below by zero. Expired replay entries are pruned before that calculation.
Only the polling loop starts work, so occupied capacity can only shrink while its
poll is in flight. Existing active slots remain owned through adapter execution,
cleanup and result delivery/retries.

The registry validates a present offer as an integer from zero through four, before
changing heartbeat or jobs. It marks only that many queued requests delivered.
Others retain their original arguments and deadlines, without `deliveredAt`.
A zero offer still updates heartbeat and scans for timeout/cancellation markers;
the scan does not exit when delivery capacity is exhausted. No local holding queue,
new backend, changed four-job admission cap, deadline extension or automatic replay
is introduced. Wire version remains 1.

## Compatibility and qualification limits

Omitting `availableSlots` retains the legacy default of four; explicit `null`, a
string, boolean, fraction or out-of-range value is rejected. **The fix requires both
the updated agent and updated gateway.** An old gateway ignores the new offer, and
an old agent continues legacy polling against a new gateway. Those mixed pairs do
not acquire the new delivery guarantee. Future deployment must qualify both sides;
this source change performs no deployment.

The existing delivery policy still does not replay requests after a lost poll
response or agent restart. A request marked delivered before a response is lost can
time out without execution. This slice does not add acknowledgement/redelivery,
fair scheduling, configured priorities, crash recovery, a multi-client scheduler,
or 20–30-client/load/soak acceptance. It also cannot force immediate interruption of
an outstanding OS operation.

## Actual regression evidence

The final unchanged fixture was copied into an isolated `git archive` of the exact
base, whose unchanged TypeScript was compiled with the existing pinned compiler.
The candidate source was not replaced. Local runtime: Node 24.22.1, Linux x64.

| Execution | Observed result |
| --- | --- |
| Final eight cases on archived unchanged base | **2 passed / 6 failed**, zero skips/cancellations; all six failures are causal assertions |
| Corrected eight cases plus existing agent and gateway suites | **26/26 passed**, zero failures/skips/cancellations |
| Independent final eight-case execution | **8/8 passed**, zero failures/skips/cancellations; hashes unchanged before/after |

[RED TAP](2026-11-09-poll-capacity-red.tap) and
[focused GREEN TAP](2026-11-09-poll-capacity-green.tap) preserve the observations.
Committed display removes trailing whitespace only; raw hashes are retained in the
[change record](../ai/changes/2026-11-09-poll-capacity.json).

The eight cases exercise the actual `RemoteAgent`, `GatewayTransport`, gateway HTTP
routing and registry with isolated, serialized in-memory storage. Synthetic
credentials are seeded into that storage; OAuth enrollment and Cloudflare runtime
storage are not being tested. Adapter cleanup and HTTP response completion use
explicit gates. Cases cover:

- Every valid offer from zero to four, with queued fields and deadlines preserved.
- Nine malformed offers rejected without job/heartbeat changes.
- Omitted capacity preserving legacy delivery and no replay.
- Zero-capacity heartbeat, cancellation and timeout processing, including later
  storage rows and expired queued work that never executes when capacity returns.
- Invalid, wrong-device and revoked credential denial.
- Four cancelled requests held in cleanup, with real cancellation signals and
  existing HTTP409 result retries retained.
- Four expired requests held in cleanup, including consumed terminal-job markers
  and no post-deadline result submission.
- Four successful results consumed at the gateway while their actual transport
  responses are still held, covering another admission/settlement race.

Each held scenario leaves replacements queued, releases exactly one slot to start
one request, then releases the remainder and observes both replacements complete
exactly once. Active work never exceeds four. Teardown aborts, releases all gates
and awaits the actual agent even after a failed assertion. Explicit transport
settlement notifications replace iteration-count timing assumptions.

During fixture development, the first HTTP fixture needed the normal gateway
configuration fields. The first corrected-source run then passed 7/8: its timeout
clock advance also expired the device heartbeat and correctly got `device_offline`.
The fixture now performs an actual heartbeat poll before enqueueing replacement
work. The [7/8 development failure](2026-11-09-poll-capacity-fixture-development.tap)
is preserved. No product deadline, authentication check or assertion was weakened.
The final archived-base and green executions above use the corrected final fixture.

## Installed and hosted verification

The package verifier runs these same eight cases outside the checkout against the
actual installed agent. It requires source/installed equality for agent, protocol
and errors modules, records their hashes, and binds all four source gateway modules
plus the checkout protocol imported by them. That source graph is checked again
after execution. Fixture and TAP hashes are retained; failures/skips/cancellations
must all be zero.

The gateway is not included in the CLI package. This is explicitly
**source gateway plus installed agent** integration, with in-memory serialized
storage and controlled scheduling. Reports set installed-gateway, actual Cloudflare
storage, deployed-gateway and production-load qualification to false. The full
exact-head hosted/platform/installed/native gates remain required before merge.

Existing Durable Object APIs, storage layout, deployment configuration and routing
remain unchanged. Current [Cloudflare state/concurrency guidance](https://developers.cloudflare.com/durable-objects/api/state/)
was consulted; no general storage or orchestration redesign is claimed.

## Scope and continuation

CLI-286/288 and WEB-004/009 receive evidence only. All 300 protected requirement
fields, historical evidence, stages, weights, estimates, dependencies, seeds,
pins/locks and AUG/DCP/WEB acceptance remain unchanged. Broad #149, #57 and #62 remain
open. The current staging deployment and historical artifacts are not relabeled.
No owner bridge, private plugin, global runtime, unrelated worktree, production
configuration or model-consuming worker was changed.

Independent source/fixture/verifier reviews are clear. Explicit roadmap review,
render/check, normal build, parity, typecheck, formatting and diff checks passed.
Next: final documentation/protected-field review and a draft PR with all six exact-head checks. Normal
expected-head merge and separate merged-main verification follow under standing
owner authorization. No new human approval gate is introduced.
