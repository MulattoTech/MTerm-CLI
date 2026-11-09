# Failed remote mutation-lock initialization — 2026-11-09

## Scope and source identity

Issue [#56 / WEB-003](https://github.com/MulattoTech/MTerm-CLI/issues/56), bounded to the local `RemoteStateStore.mutate` initialization phase. Session `MTERM-WEB-20261109T131339Z-resume-a9287b3c`, OpenAI GPT-6 Astra Pro in ChatGPT Web (self-reported). Atomic claim: [6741000659](https://github.com/MulattoTech/MTerm-CLI/issues/56#issuecomment-6741000659). Branch `fix/issue-56-state-lock-init-20261109` is an isolated normal clone from `3d32c0e53b0444c2b012b15432928f6feeda053f`.

The base is normally merged PR #222, tree `2a90ed62f42e08ee670dcb754fc15240baa9357d`. Its six PR gates and six separate actual-main gates passed. [Recovery and main qualification](https://github.com/MulattoTech/MTerm-CLI/issues/8#issuecomment-6741150803) records the original interrupted run, preserved checkout, independent review, actual logs and installed receipt hashes.

## Reproduced failure

An empty or partial `state.lock` write could fail before any configuration or pairing operation started. The old `finally` block closed the handle, then parsed that incomplete lock to compare its nonce. JSON parsing replaced the original I/O error with `REMOTE_STATE`, and the malformed lock remained. A later explicit operation then failed with `REMOTE_STATE_BUSY`. If close also rejected, that cleanup error replaced the initialization error instead.

The initial 21 real-file cases were written and executed before the behavioral change: **5 passed / 16 assertion failures**, exit 1, no skips/cancellations/todo. Review added three cases and strengthened teardown, identity and operation-entry assertions. The final unchanged **24-case** fixture was then executed against a separate normal clone of the exact original base, compiled from its unmodified source: **6 passed / 18 assertion failures**, exit 1, no skips/cancellations/todo. No fixture setup failures were counted as regression evidence.

The baseline compiled `dist/remote/state.js` SHA-256 was `d1f971271863d2a7837d9530311104b789ee41099de7958bba8b4a193b3b2bbf` in both campaigns. The final fixture SHA-256 is `52f01c08cc89a573e77b41986ccabb473273d799e4dd4175c5ca897e15e5f0ed`.

## Behavior and trust boundary

The mutation path now validates and captures its canonical parent before exclusive creation, captures the acquired handle's identity, and treats nonce writing as a separate initialization phase. A failed initialization closes its acquired handle once. Only confirmed closure and known identity permit a single guarded unlink attempt.

Cleanup requires the same canonical parent and regular, non-symbolic, single-link lock, with matching device, inode, mode and owner. Unknown identity, failed close, replaced parent/leaf, redirection, additional links, inspection failures and unlink failures retain the uncertain lock. The original thrown value remains primary, including a falsy rejection. Parseable bytes do not make a rejected write successful. Preexisting locks are never reclaimed, and the operation is not retried automatically.

Only successful initialization enters the existing operation/nonce cleanup path. Existing unconfirmed DPAPI termination deliberately retains admission; that path is unchanged. Ordinary initialized-operation error precedence, transactional credential persistence and the broader pairing lifecycle are not redesigned by this change.

The new cases exercise successful configuration, initialized-operation failure, preexisting malformed locks, exclusive-open failures, empty/partial/complete-then-rejected writes, falsy errors, held closure with a competing operation, missing descriptor identity, close uncertainty, replaced leaves, hard links, replacement parents with the original leaf, post-close parent/leaf links, changed ownership metadata, failed inspection/unlink and direct non-entry into `savePairing`/`clearPairing`. Original config and synthetic credential bytes remain unchanged when initialization fails. Link fixtures use real POSIX symlinks or Windows junctions; selected I/O and metadata failures are deterministic injections, not claims of reproduced native disk faults.

Test teardown restores mocks, observes real handle closure with a bound, and retains the owned fixture if closure is unconfirmed. Only confirmed closed fixtures are removed. Product cleanup itself does not claim a bounded OS I/O completion time.

## Executed validation

On Node 24.22.1 Linux x64, the final new 24 cases plus existing run-lock 16, remote-state 5 and DPAPI 17 cases passed **62/62**, explicit process exit 0, no failures/skips/cancellations/todo. The DPAPI suite uses its existing deterministic subprocess fixtures; this cloud run is not a native Windows DPAPI claim. The final regression file was unchanged between original-base RED and candidate GREEN.

- [Final original-base RED](2026-11-09-state-lock-init-red.tap)
- [Final focused GREEN](2026-11-09-state-lock-init-green.tap)
- [Change record and exact hashes](../ai/changes/2026-11-09-state-lock-init.json)

`scripts/verify-package.mjs` adds the same 24 cases against the actual installed package, from a measured external cwd. It binds seven installed remote/filesystem modules to compiled source before execution and verifies their hashes afterward, together with the frozen fixture hash. It retains output before cleanup and reports a separate `installedStateLockRecovery` result. Existing run-lock, native containment, package, license and Codex parser gates remain intact. Actual installed/platform execution is a separate hosted gate, not inferred from these source tests.

Independent source, fixture and installed-verifier review is clear. A separate peer executed the same frozen 62-case set once: **62/62, exit 0**, empty stderr, no fail/skip/cancel/todo; all 13 measured inputs were unchanged. Receipt SHA-256 `8b398bbd4fcee4e3b1346ebaa4697854c480fa78c2f6c88ea53dc623ed932dd4`; TAP SHA-256 `a204c5ae06065d673ed6d1ecd4f711b1a6f12f8846137928523cad0186a4f813`. This does not replace actual installed/platform qualification.

## Acceptance and limitations

CLI-286/287 and WEB-003 receive evidence only. All original scope, stages, weights, estimates, dependencies, acceptance text, prior evidence and historical review metadata remain. DCP 0/48 and WEB 0/12 are not promoted.

The recorded identity checks and unlink are not an atomic defense against a hostile same-user filesystem writer. Same-inode byte substitution, storage crash durability, interrupted successful-operation recovery and full deployed enrollment acceptance remain outside this slice. No real configuration, credential, OAuth grant, production bridge/plugin, Cloudflare deployment, unrelated project or global runtime is changed.

Before integration: finish reviewed build/format/parity checks, all six hosted gates on the exact candidate, expected-head normal merge and separate actual-main qualification. Standing owner authorization applies; no additional owner approval or model-consuming worker is needed. The known cloud full-suite Unix-socket restriction is not replaced by a new skip or weakened hosted gate.
