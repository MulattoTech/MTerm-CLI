# Compatibility preflight read cancellation — issue #243

Base: `e168b4c56e5df63fb5f5f17f228ab22419a84f74` (qualified actual main after PR #264).
Execution: isolated ordinary clone, Linux x64, Node 24.22.3. OpenAI / GPT-6 Astra Pro,
self-reported. The engineering mission and `docs/OWNER_AUTHORIZATION.md` authorize
this bounded implementation and qualified normal delivery.

## Reproduction and correction

The compatibility `get_file_info`, `write_file` and `edit_block` methods accepted
the request's AbortSignal but omitted it from their preparatory native file reads.
The change forwards that existing signal at exactly three call sites. Native I/O,
MCP registration, error handling, write staging, permissions and encodings are unchanged.

The fixture plan was independently reviewed and frozen before the first baseline:
24 direct cases and three actual pinned-SDK stdio cases. The original source failed
all eight feature observations and passed all 19 controls. Each feature observation
recorded a successful real-handle stat, actual cancellation, two subsequent body
reads totaling 25 bytes, awaited close and a closed descriptor confirmed by EBADF.
All owned state manifests stayed unchanged; no actual filesystem mutation occurred.
Omitted-mode write returned `EXPLICIT_MODE_REQUIRED`; the other cases ultimately
returned `CANCELLED`. The SDK audit retained those same original outcomes.

The minimal correction passes all 27 unchanged fixtures. Including the existing
native cancellation, move, metadata, edit, UTF-16 and compatibility tests, the
focused group passes 181/181 with zero failures, skips, cancellations or TODOs.
Each fixed feature case now performs zero body reads after cancellation and returns
`CANCELLED` without entering the native write path. Method-specific pending-stat
EIO precedence, ordinary writes/appends/edits, missing/empty files, write denial and
already-aborted requests retain their prior behavior.

## Evidence integrity and boundaries

- `frozen-plan.json` records exact titles, file hashes and selected source/runtime/ESM SDK bindings.
- `red-original-receipt.json` and `red-original.tap.gz` retain the first original
  run, including every failure and control. An independent reviewer accepted it as
  valid feature RED. The raw log is 161,466 bytes, SHA-256
  `e7670011e81c91d33959b927bec9e98de4430ab284ed5b5b9b8c69863dc769e8`.
- `green-nearby-receipt.json` and `green-nearby.tap.gz` retain the unchanged-fixture
  corrected run, commands, counts and before/after hashes. TAP escapes diagnostic
  backslashes; remove that TAP escaping layer before parsing diagnostic JSON.
- All direct feature observations capture real stat/abort/read/close, the original
  service outcome, write entry, actual mutation attempts and complete owned root,
  home, cwd and config manifests before feature assertions. Access times and
  deliberately changing fixture-control/gate/report files are excluded.
- SDK release waits for a marker from the actual server request signal's abort
  listener. Client-local rejection or ping alone is not evidence. The actual service
  result, audit, subsequent read/health, unchanged state and natural child exit are
  retained. All three observed children exited zero without signals or escalation.
  Unconfirmed child cleanup fails and retains the owned fixture.
- Installed qualification explicitly selects packaged modules without fallback,
  compares their bytes to compiled source before and after, checks fixture hashes,
  requires exactly 27 cases without skips, and retains its full TAP output.

This is cooperative cancellation after successful filesystem awaits. It cannot
interrupt an OS operation already in progress and does not certify client disconnect,
server shutdown, hostile path races, long-term load, provider login or deployed
gateway behavior. No dependency, live bridge, Cloudflare resource, real user
configuration, credential or model-consuming lane is changed. Parent issues #22,
#26 and #27 and full CLI/DCP/WEB acceptance remain separate.

## Local qualification and publication checkpoint

Independent source, fixture and verifier review approved the exact hashes, and a
separate 27/27 replay passed. Its raw stdout was not retained; its truthful reviewer
receipt preserves the observed count, byte length and digest. The original producer
RED/GREEN logs are retained in full. Independent review also approved the actual
outside-checkout installed evidence: 27/27, unchanged source/installed bytes, real
server cancellation and natural child exits. `installed-focus-receipt.json` and
`installed-focus.tap.gz` retain that run; `run-installed-focus.mjs` reproduces it.
The scoped pack/install uses the established `--ignore-scripts` mechanism and is
explicitly **not the full package gate**.

The normal reviewed build, roadmap/parity/capability checks, typecheck and formatting
passed. The complete `verify.mjs --quick` result is **FAIL**: 1,622 tests, 1,583
passed, 27 failed, 12 existing Windows-only skips, zero cancelled/TODO. Every failure
is an `EPERM` Unix-socket listen refusal in unchanged `tests/isolation.test.mjs`;
its exact base/source hash and the full original log are retained in
`ordinary-check-receipt.json` and `ordinary-check.log.gz`. No fixture was skipped,
rewritten or rerun to conceal this environment limitation. The production advisory
audit returned zero known findings; dependencies and licenses remain unchanged.

All six exact-candidate hosted jobs, normal expected-head merge and six distinct
actual-main jobs remain required at this preparation checkpoint. Those jobs include
the full installed-package and native isolation gates. Final delivery receipts and
the next resume action are appended to [issue #243](https://github.com/MulattoTech/MTerm-CLI/issues/243)
after actual qualification; no source test pass implies deployment or full parity.
