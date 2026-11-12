# Original-source local remote-status timestamp investigation

## Conclusion

**A small freshness correction is warranted.** On exact PR262 candidate
`55ac8b1f35f657b079c191292219b0ae576d7164`, the actual exported `remoteMain`
status path reports `observedStatus: "online"` for future timestamps one
millisecond, one day and one year ahead of the observing clock. Eight recent,
stale and malformed controls behave as expected. This reproduces a false
freshness classification in local diagnostic output; it is not evidence of an
authorization bypass, real gateway health or an operating agent.

The narrow correction is to require a finite age in the interval
`0 <= age < 45000`, computed from one observation time. It should preserve
the raw timestamp as diagnostic evidence and keep `networkChecked:false`.
No PID probing, lock recovery, process signalling, credential loading or network
operation is needed to correct this arithmetic boundary.

Root has separately implemented this condition and reported independent patch
review and correction tests. This investigation exercises **only the unchanged
original source** and makes no additional claim about the corrected source.
No additional investigation or test expansion followed the bounded run.

## Exact source and path

The snapshot is extracted using `git archive` from candidate55ac, tree
`4e5f026abb4fb1f5ae2abab637c8f98d7dbe4d59`. Its relevant `cli.ts`, `state.ts`,
`profiles.ts` and `agent.ts` bytes are unchanged from accounting main
`d430ec5e0d7dcefc041df4ab5f80cb32382c5ac3`. All48 archived files and their
SHA-256 values appear in `source-identity.json`; no repository file was edited.
TypeScript was compiled only into the owned scratch snapshot. The probe imports
that compiled public CLI entry point, not a copied version of the age expression.

The relevant production path is:

1. `remoteMain` admits the selected state directory and opens
   `RemoteStateStore` using the explicit development environment.
2. `RemoteStateStore.status()` (`src/remote/state.ts`, lines499–509) reads
   validated configuration and `running.json`, then calls `publicRemoteRuntime`.
3. `publicRemoteRuntime` (`src/remote/profiles.ts`, lines256–270) permits known
   states and finite parseable timestamp strings; it does not compare them to
   the observer's clock. PID is projected only if a nonnegative safe integer.
4. `remoteMain` (`src/remote/cli.ts`, lines393–408) computes
   `Date.now() - Date.parse(runtime.at) < 45000`, then emits the recorded state
   as `observedStatus` when that expression is true. Negative ages pass.

## PID and lock controls

Neither `status()` nor its CLI projection reads `run.lock`, checks whether a PID
exists, or confirms the process identity. The explicit lock controls therefore
do not repair the timestamp classification:

- Future by1ms: no run lock; runtime PID is the owned fixture's PID.
- Future by1day: matching synthetic runtime/lock instance and synthetic PID.
- Future by1year: mismatched runtime/lock instance and PID.

All three return `online`. The synthetic PID is merely a fixture number; no
assertion of its existence or absence is made. `process.kill` and all child-process
entry points are guarded to throw, and none was called. File-open observations
confirm that only configuration/runtime files are opened during status; no
run-lock or credential file is opened. Fixture bytes are unchanged after every
status call.

The absence of a lock check is an existing diagnostic contract, not an additional
defect established by this task. Even a valid recent timestamp is an observation,
not positive proof of current executor liveness. The response already says
`networkChecked:false`; the correction should not introduce a stronger claim.

## Executed observations

The fake observation time is `2026-11-12T23:00:00.000Z`. All cases run the actual
`remoteMain(['status', '--state-dir', ownedDirectory, '--environment',
'development', '--json'])`, exit0, and report `networkChecked:false`.

| Case | Age in milliseconds | Original observedStatus | Narrow freshness expectation |
| --- | ---: | --- | --- |
|Future1ms, no lock|−1|online|offline-or-not-observed|
|Future1day, matching synthetic lock|−86400000|online|offline-or-not-observed|
|Future1year, mismatched synthetic lock|−31536000000|online|offline-or-not-observed|
|Current timestamp|0|online|online|
|Recent just below cutoff|44999|online|online|
|Exact cutoff|45000|offline-or-not-observed|offline-or-not-observed|
|Stale just after cutoff|45001|offline-or-not-observed|offline-or-not-observed|
|Missing timestamp|Not parseable|offline-or-not-observed|offline-or-not-observed|
|Malformed timestamp string|Not parseable|offline-or-not-observed|offline-or-not-observed|
|Numeric timestamp|Rejected by public projection|offline-or-not-observed|offline-or-not-observed|
|Null timestamp|Rejected by public projection|offline-or-not-observed|offline-or-not-observed|

`observations.json` retains every exact input, timestamp, lock, output, file
identity before/after, actual file open and summary. `probe.mjs` exits successfully
when it observes these original-source results; its exit0 does **not** mean the
original source meets the proposed corrected contract. The three mismatches and
eight passing controls are explicit in the saved data.

## Existing coverage and realistic interpretation

Read-only inspection of `tests/remote-profiles.test.mjs` found runtime-field
projection, configured profile/environment selection and an actual CLI status
invocation, but no `observedStatus` future-time boundary assertion. The separate
gateway observation tests already reason about future timestamps; they do not
exercise this local CLI calculation.

Actual agent events obtain `at` from `new Date().toISOString()` in
`src/remote/agent.ts`, and start writes those events to `running.json`. A wall-clock
rollback after an event can therefore make a previously recorded timestamp
future relative to status. This is an inference from the source, not a clock
change performed on any real machine. If no new event replaces that snapshot,
the current one-sided comparison can continue accepting it until the observer
catches up and the45-second interval elapses.

## Scope and preserved boundaries

- Executed11 bounded observations:3 reproduced future-time mismatches and8
  controls; no additional suites, correction testing or external probing.
- Zero network/DNS attempts, child processes, PID probes, credential reads,
  run-lock reads and status mutations. Guarded entry points remain uncalled.
- All configuration/runtime/lock data is synthetic and owned under this
  investigation directory; no real credentials were created or read.
- No owner-machine process, service, plugin, remote connection, model CLI,
  repository or GitHub state was changed.
- No deployment, real-agent health, Windows-native behavior, browser behavior,
  or whole-feature acceptance is established by these local fixtures.

Root's subsequent correction and independent approval are outside this saved
original-source result. This bounded investigation is complete.
