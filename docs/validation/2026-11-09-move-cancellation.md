# Regular-file move cancellation — 2026-11-09

Session `MTERM-WEB-20261109T031131Z-e0efd5d4`, OpenAI / GPT-6 Astra Pro
(self-reported), ChatGPT Web. Atomic `coord/mterm/issue-25`,
[claim receipt](https://github.com/MulattoTech/MTerm-CLI/issues/25#issuecomment-6733335338),
branch `fix/issue-25-move-cancellation-20261109`. One source writer;
independent read-only reproduction, source, fixture and package reviews.

Base is merged PR219 commit `43f7c7152a6115a95e9c45e5ea582068f62ad33c`,
tree `a6d92f453a474c2263092428d1430ed0bf570cad`, identical to qualified
candidate `74ca7c0fc303e251ec51d481d3603ed5f205c7c8`. All six PR checks and all
six separate merged-main checks passed, with actual hosted logs and installed/native
bindings independently inspected. The [PR qualification](https://github.com/MulattoTech/MTerm-CLI/pull/219#issuecomment-6733322296),
[committed artifact receipt](https://github.com/MulattoTech/MTerm-CLI/pull/219#issuecomment-6733305458)
and [final main receipt](https://github.com/MulattoTech/MTerm-CLI/issues/65#issuecomment-6733436065)
retain their exact identities and scope. Earlier PR211–218 are also fully qualified
on their separate PR and main commits.

## Confirmed defect and correction

`FileService.move` checked cancellation before entering its asynchronous preflight.
It then awaited source resolution, destination resolution and source metadata,
and could begin link/unlink after the owning signal was cancelled during any of
those awaits. Both native `mterm_move` and compatible `move_file` already forwarded
the correct signal; the service did not observe it again before mutation.

An independent reproduction observed both mutation calls occurring after the owning
signal was already aborted, following real destination resolution. The new regression
fixtures use
actual owned source/destination files and reproduce physical movement on the
unchanged baseline, including two real stdio SDK requests.

The correction adds the existing cancellation check immediately after each of the
three successful preflight awaits. A cancellation observed there returns `CANCELLED`
before the first link attempt. A rejected await still propagates its existing error.
The mutation queue's initial cancellation check remains responsible for a request
cancelled while waiting behind another mutation.

Once the first link operation starts, the existing completion path remains intact.
A cancellation after successful linking does not prevent source unlink or report a
cancelled completed move. A real link error remains primary; an unlink error remains
primary and can leave both names pointing to the same bytes. There is no rollback,
retry, destination overwrite, directory support or cross-device copy/delete fallback.
This is a cooperative boundary before mutation, not interruption of pending OS work
or a stronger guarantee against hostile filesystem races.

## Actual regression evidence

Both new fixtures were written and formatted before behavior changed. Baseline
`src/files.ts` SHA-256 was `26a3050914b4c5c1ee4530428bb0237d0a946de5eab6694a22180c08c88e2353`;
compiled `dist/files.js` was `334d03920a8bc66a1002fafa5bf690ebd81e0ef76755993a2d2c96b71ec22fc8`.
Both remained unchanged through the complete RED execution. Node24.22.1, Linux x64.

| Execution | Observed result |
| --- | --- |
| Final18 cases on unchanged baseline | **10 passed / 8 assertion failures**, zero skips/cancellations |
| Corrected move, native/compatible file and write-retry suites | **61/61 passed**, zero failures/skips/cancellations |
| Independent frozen direct/SDK execution | **18/18 passed**, zero failures/skips/cancellations/todo, empty stderr; eight hashes unchanged |

[RED TAP](2026-11-09-move-cancellation-red.tap) and
[focused GREEN TAP](2026-11-09-move-cancellation-green.tap) retain actual execution.
Only trailing whitespace is removed from committed display. Raw log hashes, source
hashes and the independent receipt fingerprint are in the
[change record](../ai/changes/2026-11-09-move-cancellation.json).

The16 direct cases cover both native and compatible calls at all three successful
preflight boundaries; post-link cancellation with successful completion; destination
collision with both original files retained; and post-link cancellation plus an
injected unlink error preserving the exact error object and both names. Additional
controls cover already-aborted calls, cancellation while queued behind a real held
move, a first-link cross-device error, write-disabled compatibility and root denial.

All normal filesystem work uses owned temporary files. The final metadata gate is
armed only after destination resolution, so it does not accidentally target metadata
checks inside root policy. Mutation wrappers call actual filesystem operations except
for explicitly labelled fault injections. Mocks are restored before owned cleanup.

The two SDK cases launch actual stdio hosts for `mterm_move` and `move_file`, with
runtime modules selected through `MTERM_VERIFY_BIN` when installed qualification
runs. An explicit compatibility configuration and gate/report files stay outside the
exposed tool root, in the owned fixture parent. After the real destination resolver
settles, the fixture holds its return, sends cancellation and crosses the SDK's FIFO
ping barrier before release. It then checks the actual aborted service signal,
atomic server report with zero link/unlink calls, unchanged source/destination state,
`CANCELLED` audit settlement and only the final capabilities probe's own admission slot.
Client rejection alone cannot satisfy these assertions.

Cleanup releases the held gate first and attempts client close, transport close and
owned removal through nested `finally` blocks. The fixture awaits those calls but
does not independently assert server PID exit; no new process-exit qualification is
claimed. Test observation waits are bounded and do not alter production deadlines.

## Installed package qualification

The additive `installedMoveCancellation` block runs the same18 fixtures against the
freshly packed and installed runtime. Its12 module bindings cover the nine existing
pack-boundary modules plus `desktop-commander-files.js`, `compat-config.js` and
`config.js`. It records both fixture hashes and rechecks compiled source, installed
module and fixture hashes after execution.

The child working directory is an owned `os.tmpdir()` directory whose canonical
relationship to the checkout is checked before execution; cleanup is awaited.
The captured TAP is saved before that cleanup, so an unexpected cleanup rejection
cannot discard the completed fixture output. Independent review identified and
resolved the original opposite ordering. Exit status, a minimum of18 cases and zero
failures/skips/cancellations are required. Existing package checks are retained.

Only this new block and the already verified admission block establish a working
directory literally outside the checkout. Older verifier sections using a checkout-local
`home` are not retroactively qualified by the new flag. The new report distinguishes
real temporary-file and instrumented SDK evidence from directory/cross-device parity,
OS interruption, post-link rollback, independently observed stdio process exit or
production load; it does not claim those properties.

## Review, qualification and limits

Independent source/fixture/verifier review is clear; the one independent frozen
execution passed18/18 with unchanged hashes. Explicit roadmap review/render/check,
normal build, typecheck, formatting and parity checks passed. Documentation,
protected-field and retained evidence reviews are clear.
All six exact-head hosted/platform/installed/native gates remain mandatory before
normal expected-head merge, followed by separate merged-main verification.

The known local full-suite Unix-socket `listen EPERM` environment limitation is
retained; the full suite is not rerun locally to manufacture a result or weakened
through new skips. Hosted platform gates provide the required broader qualification.

CLI-271 and CLI-288 receive partial evidence only. DCP-023 keeps its existing open
state and historical metadata, appending only the new implementation observation and
evidence. All protected fields, historical records, seeds, weights, stages, estimates,
dependencies and AUG/DCP/WEB acceptance remain unchanged. Directory moves and full
cross-filesystem parity remain open under #25.

No live bridge, plugin, owner configuration, credential, grant, device, global runtime,
Cloudflare deployment or unrelated project changes. No new dependency/provider,
orchestration backend, model-consuming worker or production-load claim. Standing
owner authorization covers ordinary integration after technical qualification.
