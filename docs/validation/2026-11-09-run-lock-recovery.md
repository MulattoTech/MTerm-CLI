# Failed run-lock initialization recovery — 2026-11-09

Session `MTERM-WEB-20261109T031131Z-e0efd5d4`, OpenAI / GPT-6 Astra Pro
(self-reported), ChatGPT Web. Atomic `coord/mterm/issue-57`,
[claim receipt](https://github.com/MulattoTech/MTerm-CLI/issues/57#issuecomment-6733609390),
branch `fix/issue-57-run-lock-recovery-20261109`. One implementation writer;
independent read-only reproduction, design, source, fixture and verifier reviews.

Base is merged PR220 commit `700bc25fbc277ba2f9d996344e91c48a50e94bc0`,
tree `548c1aec0c72821d2fea4196be5f5c43a086857a`, identical to qualified
candidate `b2bcb2627fdc9cdedc6407ffbbebf023017fc325`. All six PR checks and all
six separate merged-main checks passed, with actual logs and installed/native
bindings independently inspected. The [PR qualification](https://github.com/MulattoTech/MTerm-CLI/pull/220#issuecomment-6733595066)
and [final main receipt](https://github.com/MulattoTech/MTerm-CLI/issues/25#issuecomment-6733679302)
retain exact identities, counts and limits. PR211–220 have completed all six PR and
separate main gates.

## Confirmed defect

`RemoteStateStore.acquire()` exclusively created `run.lock`, wrote its instance ID
and PID, then closed the acquired handle in `finally`. An empty or partial write
failure left that newly created lock behind. `remote start` calls `acquire()` before
entering the lifecycle `try/finally` that releases the running agent's lock, so this
failure had no caller cleanup either. Later explicit starts returned `REMOTE_RUNNING`
even though the failed attempt had not started an agent.

Independent triage exercised the actual compiled method with strict in-memory
filesystem stand-ins: a partial write failed with injected `ENOSPC`, the handle
closed once, no unlink occurred, and simulated storage recovery still could not
acquire. This was a control-flow reproduction, not an actual disk-full event. The
regression fixture then reproduced the problem using real owned temporary files.

## Correction and retained behavior

Before exclusive creation, the method captures the canonical parent directory
identity. After creation, it captures the acquired descriptor identity before
writing the payload. Initialization failure is recorded separately from closure,
so a later close error cannot replace the original stat/write exception.

The method attempts close once. Only a failed initialization, known descriptor
identity and fulfilled close permit a cleanup check. The current parent must still
be a non-symlink canonical directory with matching device, inode, mode and owner.
The current leaf must remain a regular, non-symlink, single-link file with the
captured device, inode, mode and owner; the captured descriptor must also have
identified a regular single-link file. Then one unlink may be attempted.

Pre-write size and modification time are intentionally excluded: a legitimate
partial write changes them. Incomplete JSON is not parsed as ownership proof.
The original initialization error is thrown even when cleanup succeeds. A later
explicit acquisition is a distinct operation, not an automatic retry.

| Outcome | Error and retained state |
| --- | --- |
| Exclusive create finds an existing lock | Existing `REMOTE_RUNNING`; preserve that lock |
| Exclusive create fails otherwise | Original open error; no cleanup authority |
| Descriptor identity inspection fails | Original stat error; close is attempted, but unknown identity retains the file |
| Initialization fails, close confirms, identity still matches | Original initialization error; one guarded cleanup attempt |
| Initialization and close both fail | Original initialization error remains primary; retain the lock |
| Initialization succeeds, close fails | Close error; retain the initialized lock |
| Initialization and close succeed | Success; retain the normal run lock for existing owner release |
| Cleanup inspection or unlink fails | Original initialization error; no retry or claim that cleanup succeeded |

The checked fields establish recorded identity at those observations, not byte
identity or atomic conditional deletion. A hostile same-user actor can still race
between the final check and unlink, reuse an inode or change content through the
same inode. This does not provide a filesystem sandbox or crash durability.

Normal `release()`, generic state writes, mutation locking and credential handling
are unchanged. There is no PID-based recovery, stale-lock stealing, search for a
renamed lock, deletion from an alternate location or general retry policy. Retained
locks require explicit inspection under the existing operational guidance.

## Actual regression evidence

The entire16-case fixture was written and formatted before behavior changed.
Baseline source SHA-256 was `ed995c3ba94a49f786eac6c618787baf6a32936507f7b09df0f2b88f03835916`;
compiled state SHA-256 was `27981330f53530327218149e85eb8461da4cfa871dd41cb705c8763e28465f5e`.
Both were unchanged before/after the RED run. Local runtime: Node24.22.1 Linux x64.

| Execution | Actual result |
| --- | --- |
| Final16 cases on unchanged baseline | **9 passed / 7 assertion failures**, zero skips/cancellations/todo |
| Corrected run-lock, existing state and credential-helper suites | **38/38 passed**, zero failures/skips/cancellations/todo |
| Independent frozen run-lock execution | **16/16 passed**, zero failures/skips/cancellations/todo and empty stderr; nine hashes unchanged |

[RED TAP](2026-11-09-run-lock-recovery-red.tap) and
[focused GREEN TAP](2026-11-09-run-lock-recovery-green.tap) retain actual execution,
with trailing whitespace removed only. The [change record](../ai/changes/2026-11-09-run-lock-recovery.json)
records raw hashes, reviewed source identities and the independent receipt.
Linux execution of existing credential-helper fixtures does not qualify actual
Windows DPAPI; that remains covered by its separate Windows gate.

The new fixture uses `RemoteStateStore.open()` on a private owned temporary directory.
It never configures a gateway, pairs a device, reads credentials, invokes DPAPI,
launches a foreground agent or makes a network/model request.

Its16 cases cover successful ownership, duplicate and wrong-owner release refusal,
preexisting malformed locks, empty/partial initialization failures, held-close
admission, failed descriptor inspection, initialization-plus-close failure,
close-only failure, replaced files, extra hardlinks, symlink/junction replacement,
unreadable cleanup identity, unlink failure, redirected/replaced parents and an
initial open failure.

The held-close case pauses before actual descriptor closure, verifies the first
acquisition is unsettled and a competing acquisition is refused, then permits close
and requires cleanup plus successful explicit retry. Close-rejection cases perform
the real close before injecting a rejection; they withhold confirmation without
leaking native descriptors. These are injected failure boundaries, not native
close-failure or actual storage-exhaustion qualification.

Replacement cases rename and retain the original before creating another file,
avoiding recycled-inode ambiguity. A separate parent case preserves the old directory
and moves the same owned lock inode into a newly created directory at the old path,
so only the parent check can prevent deletion. Windows uses directory junctions to
avoid requiring file-symlink privileges. All targets and sentinels are owned fixtures.
Mocks are restored before closing any remaining handles and removing the temporary
parent; held gates are released and their operation awaited in `finally`.

## Installed qualification

The additive `installedRunLockRecovery` block runs the same16 tests from an owned
working directory whose canonical path is verified outside the checkout. The fixture
selects its runtime from the absolute installed `MTERM_VERIFY_BIN`.

Seven compiled bindings cover the complete relative import graph: remote state,
adapter, agent and protocol, plus files, policy and errors. Each installed module
must equal its reviewed compiled source. The fixture hash is captured before running;
all source/installed module and fixture hashes are checked again afterward. External
package dependencies retain the existing lockfile and package verification gates.

The child is bounded to60seconds. Captured output is retained before awaited working-
directory cleanup. Successful qualification requires exit0, at least16 cases and
zero failures/skips/cancellations. The report explicitly withholds full foreground-
agent restart, credential protection, hostile-race, crash-durability and production-
load qualification. Old verifier blocks are byte-for-byte retained after removing
only this new block, attribution comment and report field; independent review
confirmed that comparison.

## Review and remaining qualification

Independent source/fixture/verifier review is clear, including a second source review.
The one independent frozen run passed16/16 with all nine bindings unchanged. Explicit
roadmap review/render/check and normal build, typecheck, formatting and parity gates
passed. Independent documentation/protected-field and retained-evidence reviews are
clear. All six exact-head
hosted/platform/installed/native gates remain required before normal expected-head
merge, followed by separate merged-main qualification.

The known cloud full-suite Unix-socket `listen EPERM` limitation remains recorded;
no local full rerun or additional skip substitutes for hosted qualification.

CLI-286 and CLI-287 receive partial evidence only. WEB-004 appends one evidence
reference, with its full start/status/stop/restart/reconnect criteria still open.
All300 protected CLI fields, all WEB history/metadata, seeds, stages, weights,
estimates, dependencies and AUG/DCP/WEB acceptance remain unchanged. Broad #57
acceptance, crash recovery and real network-fault qualification stay open.

No production bridge, private plugin, owner configuration, credentials, grants,
devices, global runtime, Cloudflare deployment or unrelated project changed. No new
dependency, provider, orchestration backend or model-consuming worker. Standing
owner authorization covers ordinary integration after technical qualification.
