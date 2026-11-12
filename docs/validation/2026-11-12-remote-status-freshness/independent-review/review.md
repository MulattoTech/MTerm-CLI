# Independent review: remote status freshness

**Verdict: APPROVED for the exact frozen three-file source patch. No actionable defect found.**

Reviewer: OpenAI / GPT-6 Astra Pro, independent read-only peer (self-reported).
Review date: 2026-11-12 UTC. Runtime: Linux, Node v24.22.1.
Baseline: `55ac8b1f35f657b079c191292219b0ae576d7164`.
Working checkout: `/workspace/scratch/267bdf8cab08/MTerm-CLI-Status`.

The review performed no repository edits, publication, external requests, owner-process operations,
service changes, credential use, or model CLI/API calls. All added verification files and fixtures
were confined to the explicitly assigned review directory. Fixtures were removed after each test.

## Exact approved source

| File | SHA-256 |
| --- | --- |
| `src/remote/cli.ts` | `05759f21585edb8ebcb6ffa9360be564fd7ea12efed96ad53606ad625bc0da22` |
| `tests/remote-profiles.test.mjs` | `3049c398bac8621ae293860ca54aac281e535887ffa64906036bae60ae241618` |
| `scripts/verify-package.mjs` | `be06f50633a444fd604c4dba1fb1bef46bcfbc0e46f99f5d15949a0932e11886` |

The before/after source hashes match. The exact source diff against the baseline also matches
before/after; its SHA-256 is `0c0366f3898a6040aeba7a2c63cdf1e5b1e06b2d8de55f4cfff7f6ebfeea06e1`.
The three loaded compiled modules (`cli.js`, `state.js`, `profiles.js`) remained byte-identical
throughout the independent run. Supporting `state.ts` and `profiles.ts` are unchanged from the
baseline. The source diff passes `git diff --check`.

`before-source-hashes.json`, `after-source-hashes.json`, `before-runtime-hashes.json`,
`frozen-source.patch`, `baseline/`, and `source/` preserve these identities and relevant bytes.

## Behavior and compatibility assessment

The change computes one observation age after awaiting `store.status()`, then requires a finite
age in `[0, 45000)` milliseconds. Previously any negative age also passed the upper-bound check,
so a future timestamp could be reported as its recorded runtime state. The new lower bound removes
that false freshness while retaining the existing exact 45-second expiry boundary.

| Input/condition | Reviewed result |
| --- | --- |
| Current timestamp, one millisecond old, or 44,999 milliseconds old | Retains the recorded runtime state |
| Exactly 45,000 milliseconds old or older | `offline-or-not-observed` |
| Future timestamp, including one millisecond ahead | `offline-or-not-observed` |
| Missing timestamp, invalid timestamp, or missing runtime record | `offline-or-not-observed` |
| Malformed runtime JSON file | Retains the existing `REMOTE_STATE` refusal; no fabricated status |
| Timestamp/state already accepted by the public runtime whitelist | The bounded raw observation remains in `runtime`; freshness classification is separate |
| Synthetic PID and request-count observations | Remain observations; no process or liveness inspection occurs |

Timestamp parsing and the public runtime whitelist remain unchanged. Valid equivalent timezone
representations keep their exact original text. Missing/nonstring/empty/overlong timestamps cannot
produce freshness through coercion or through a recent `startedAt`. The other existing recorded
states (`connecting`, `reconnecting`, `revoked`, `stopped`) remain intact when their observation
is fresh. Nonfinite observer-clock adversarial inputs cannot claim freshness.

The status branch remains after normal state-directory admission and public scope checks. It adds
no state mutation, credential operation, network operation, process action, or fallback selection.
Malformed JSON, cross-environment selection, and missing-profile refusal remain effective and
preserve all compared owned state bytes. A valid but old/future observation remains visible in the
bounded `runtime` object, with `networkChecked: false` retained in the response.

This remains a local wall-clock observation. A recent recorded state does not establish current
process liveness, network connectivity, executor health, credential validity, or readiness.

## Evidence assessed

| Evidence | Source | Tests | Pass | Fail | Cancelled / skipped / TODO |
| --- | --- | ---: | ---: | ---: | --- |
| Original future-time RED | Producer log, inspected | 11 | 8 | 3 | 0 / 0 / 0 |
| Corrected focused regressions | Producer log, inspected | 11 | 11 | 0 | 0 / 0 / 0 |
| Nearby integration checks | Producer log, inspected | 80 | 80 | 0 | 0 / 0 / 0 |
| Additional adversarial/compatibility controls | Independently executed | 22 | 22 | 0 | 0 / 0 / 0 |

The RED log's three failures are exactly the one-millisecond, one-minute, and one-day future
timestamp cases. Its eight controls pass. The independent test command completed with exit code 0
at 2026-11-12T23:25:41.801789+00:00; the complete TAP log, exact command, environment override,
test-file digest, and log digest are retained in `adversarial-status.tap` and
`adversarial-execution.json`.

The 22 independent cases cover equivalent/future explicit timezones, both JavaScript date extrema,
numeric/object/array/empty/overlong timestamps, the four other recorded states, stale observation
time versus recent startup time, array runtime shape, three nonfinite observer clocks, expiry after
awaited status reads, malformed JSON, cross-environment refusal, and missing-profile noncreation.

All independent cases use the public `remoteMain` path and actual owned state files. The harness
blocks fetch, HTTP/HTTPS requests, common socket entry points, child-process entry points,
`process.kill`, the credential method, and direct store-style opens of the synthetic credential
file. Their counters remain zero. Synthetic private sentinels do not appear in returned status;
all compared state filenames and bytes remain unchanged. No real credentials were supplied.

## Installed-package path review

The existing profile test file imports the CLI, state store, and profile helpers through
`MTERM_PROFILE_VERIFY_ROOT`; its actual CLI subprocess also uses that root. The package verifier
sets that override to `installedPackageRoot`, uses an owned cwd outside the checkout, runs the
profile test file serially, and rejects failed/cancelled/skipped/TODO cases. Raising its minimum
from 24 to 35 matches the 11 added top-level freshness cases and prevents the prior 24-case result
from satisfying this gate. The existing remote module snapshot/binding mechanism remains intact.

This is a static review of the installed qualification path. The independent peer did not run the
package verifier or claim an installed-package PASS. Producer package/platform and exact-head
delivery evidence must establish those separate outcomes.

## Limits and handoff

This approval attaches only to the three file hashes and their baseline diff above. Final
documentation, provenance, roadmap metadata, and any later integration snapshot are excluded until
the root provides them for separate review. Equal source bytes retain this source verdict; changed
source bytes require review of the change.

The ordinary full suite was not rerun by this peer. No Windows/macOS qualification, hosted CI,
installed-package execution, deployment, live enrollment, production runtime behavior, whole
feature acceptance, or roadmap stage increase is asserted. The producer's separate normal build
and ongoing ordinary check are not substituted for independent execution here.

Repository instructions relevant to this review were read: the root `AGENTS.md`, standing owner
authorization, orchestration/setup guidance, current handoff and metrics contract, and the security
sections governing named state, scope, credentials, and runtime observations.

## Reproduction and receipt files

`commands.md` documents the independent command. `inspection-commands.json` records exact final
read-only Git/runtime commands and their outputs. `results.json` is the machine-readable verdict
and test accounting. `artifact-manifest.json` binds the saved review files. Producer logs are
retained byte-for-byte, with their SHA-256 values in `results.json`.
