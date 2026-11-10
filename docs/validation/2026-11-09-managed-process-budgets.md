# Managed Codex process budgets — source evidence, 2026-11-09

**The focused source invocation passed 56/56 tests at committed source `4076ecd986f4d1397cb64c9598c8b1bdd5ef4921`.** The unchanged, independently reviewed eleven-case fixture first produced a valid new-capability RED baseline: four controls passed and seven selected-budget cases failed on the previously intentional unsupported behavior. Production implementation followed that baseline and root authorization. No assertion in the new fixture changed to obtain the passing result.

This record covers issue [#239](https://github.com/MulattoTech/MTerm-CLI/issues/239), CLI-292, CLI-259 and CLI-286. It records local source evidence only. Independent final review, the separate peer source11 invocation, normal reviewed build/roadmap gates, installed-package qualification, actual pinned Codex parsing, hosted candidate/main checks and delivery remain separate work. This source result awards no new roadmap stage, complete AUG-012 acceptance or complete DCP-002 acceptance.

Provider/model: OpenAI / GPT-6 Astra Pro, self-reported metadata. Author: `/root/managed_budget_implementation`; session `MTERM-WEB-20261109T131339Z-resume-a9287b3c`. Qualified base: `9c05ed3fd92ee87dcc789a81a8c605e62fe7f141`, tree `78f28c5f4b69ec9e1b2514c3e732fb175e51bca7`. The isolated worker clone was prepared at `2026-11-09T22:53:26.173145+00:00`. No new dependency installation occurred in this worker.

## Selected behavior

`planCodexRegistration` reads `options.processBudget` once. When selected, the existing `parseProcessBudget` validates, copies and freezes the policy, including its nested disk policy, before the first `RootPolicy.create` await. The planner appends one `--process-budget` argument and one canonical JSON string after the existing legacy arguments. Undefined/omitted selection adds no argument and preserves the legacy plan representation and ownership hash. Explicit `{}` remains a selected policy and serializes the normalized defaults.

The CLI removes only its former managed process-budget refusal. Isolation and optional-pack managed registration refusals remain. The policy does not grant execution, writes, configuration writes, shell access, additional roots or remote access. No new parser, global setting or blanket freeze of the legacy registration-plan API is introduced.

Canonical key order makes equivalent selections idempotent. A changed budget changes the existing ownership hash, so the existing registration conflict rule requires deliberate removal before reconfiguration. Existing exact-owned removal, unrelated configuration, synthetic auth, original backup and pre-removal backup checks remain effective.

The only legacy test transition is the combined tools/setup case in `tests/resource-budgets.test.mjs`: its existing effective-budget assertion stays, while its setup expectation changes from intentional refusal to preserving exactly one normalized budget argument. Every byte outside that test is unchanged; the other 23 resource cases are preserved.

## Frozen chronology and actual executions

| Checkpoint | Commit / tree | Observation |
| --- | --- | --- |
| Qualified production base | `9c05ed3fd92ee87dcc789a81a8c605e62fe7f141` / `78f28c5f4b69ec9e1b2514c3e732fb175e51bca7` | Parent separately qualified the actual main revision. |
| Fixture-only freeze | `b7b97daa639fec0c32f1fc97048a97a63abaa082` / `e574188b58821642ef1e76c89af7ab3867ee817e` | All 858 original base blobs unchanged; only the new fixture added. |
| First baseline | Same fixture-only commit | Root ran eleven cases once after independent pre-run clearance. Actual 4 pass / 7 fail, Node exit 1. |
| Production checkpoint | `4076ecd986f4d1397cb64c9598c8b1bdd5ef4921` / `16f117bbd7a791b2bdb693c966ed12cc61df1515` | Two production files and the single legacy assertion changed after authorization. Source preparation occurred before this commit. |
| Focused source run | Same clean production checkpoint | One actual invocation: 56 pass / 0 fail, Node exit 0. All frozen inputs unchanged. |
| Dated records | Added after the source run | These two validation/AI records were not present in the tested source commit. Their later documentation checkpoint must not be described as the earlier tested commit. |

Root implementation clearance is retained at `artifacts/issue-239-worker-source/root-implementation-clearance.json`, SHA256 `15a8f1d2836406688b5c2a4bc0b7412a7c7724f6ff9255a403a62893f6ebd6d0`, observed `2026-11-09T23:22:15.086724+00:00`.

| Execution | Start UTC | End UTC | Actual result | Raw stdout |
| --- | --- | --- | --- | --- |
| First baseline | `2026-11-09T23:17:31.951245+00:00` | `2026-11-09T23:17:33.924258+00:00` | 11 tests, 4 pass, 7 fail; Node exit 1 | 85,314 bytes |
| Focused source | `2026-11-09T23:25:04.022751+00:00` | `2026-11-09T23:25:12.561604+00:00` | 56 tests, 56 pass, 0 fail; Node exit 0 | 114,715 bytes |

Neither invocation skipped, cancelled or marked any case todo. Both retained empty stderr, complete raw output, no capture truncation, no timeout, no requested outer termination and no captured interrupt/error. Baseline and source receipts record observed child exit separately from a successful signal request.

**Reporting boundary:** the original focused-run tool response was lost to context truncation. Its sealed `receipt.json`, `stdout.raw`, `stderr.raw` and frozen input copies were recovered without replaying the command. The retained receipt records actual Node exit 0 and observed closure; the raw TAP and complete input bindings independently agree. The final printed driver summary and outer driver exit were not separately preserved or re-observed. This record does not infer either. No fallback or pending completion receipt was present during recovery. The source result is based on retained Node/capture evidence, not an invented outer process result.

The focused command selected `tests/codex-budget-registration.test.mjs`, `tests/resource-budgets.test.mjs`, `tests/codex-registration.test.mjs` and `tests/cli.test.mjs` with `--test --test-concurrency=1 --test-reporter=tap`. Actual composition was new 11 + resource 24 + existing registration 11 + CLI 10 = 56. The recorded Node was `v24.22.1`, Linux x64, executable SHA256 `61ab14cd750fc24d5db53490ec5fc40f756e4b6e136b78cf7004265471d9bd1d`.

## Eleven-case interpretation

| Case | First baseline | Passing source observation |
| --- | --- | --- |
| Omitted budget | Control PASS | Independent literal legacy plan, argv/property-order hash and read-only CLI preview match. |
| Explicit empty object | Feature RED: planner omits it; CLI refuses it | One canonical default budget argument, distinct from omission; preview preserves owned bytes. |
| Selected normalized policy | Feature RED: selected limits absent | Exact normalized JSON and decimal strings `9007199254740993` / `9007199254740995` survive preview and argv parsing. |
| Existing input/policy refusals | Control PASS | Nine malformed, duplicate, oversized, unknown, out-of-range, array, noncanonical decimal, isolation and pack vectors retain expected error/exit families and unchanged manifests. |
| Validation before root call | Feature RED: three invalid inputs reach root hook | All three reject `INVALID_ARGUMENT` with zero root calls; the hook is restored. |
| Copy before awaited root validation | Feature RED: budget omitted | A controlled await allows mutations of the original nested object and option replacement; returned argv still contains the original normalized snapshot. Barrier settles and hook is restored. |
| Normalized repeat registration | Feature RED at literal-plan assertion | Reordered policies produce identical plans/hashes; first injected apply changes owned config, repeat reports unchanged and preserves the entire manifest. |
| Changed-budget conflict | Feature RED: two unsupported selections collapse to one plan/hash | Different selected policies produce different hashes; second apply rejects `CONFIG_CONFLICT` without changing owned bytes. |
| Ownership controls | Control PASS | Independent literal budget plan preserves unowned, edited and ambiguous entries; exact expected conflict/no-op outcomes remain. |
| Exact owned removal | Control PASS | Read-only CLI removal preview; exact removal preserves unrelated/synthetic auth bytes and both backup expectations; repeat is unchanged. |
| Budget without execution | Feature RED at refused CLI preview | Actual successful CLI preview argv starts a real SDK stdio host with the selected budget and no execution grant. |

The baseline is an unsupported-capability observation, not a newly discovered unsafe rewrite. In baseline case 7, persistence was actually **NOT_REACHED**; in case 11, the SDK phase was actually **NOT_REACHED**. No persistence or SDK observation is backfilled into that earlier run. Independent baseline interpretation classified every case and found no fixture-invalid observation.

The passing dedicated fixture records 13 typed diagnostics, versus the baseline's 11: normalized persistence and SDK observations are now reached. Parsing reverses exactly one Node TAP backslash/hash escape layer and verifies exact roundtrips; raw bytes remain unchanged.

Within the dedicated fixture, all 14 CLI children close naturally: five exit 0, four exit 1 and five exit 2, each with no signal, error, timeout, kill attempt or truncation. The complete manifests provide 23 equal comparison intervals across 38 snapshots. This adds normalized repeat and SDK intervals to the baseline's 21 equal comparisons. These counts describe the dedicated fixture only; they are not a census of all children in the other 45 tests.

The actual SDK session performs three calls: two successful `mterm_capabilities` calls and one rejected `mterm_start_process`. Both capabilities responses report `{maxSessions:1,maxPendingStarts:4,maxOutputBytes:4096,maxRuntimeMs:1200,admissionTimeoutMs:3000}`, unchanged owner/effective roots, disabled execution/write/config-write and zero pending starts, active jobs and retained sessions. Discovery exposes exactly ten read-only tools. Start returns protocol code `-32602`, `Tool mterm_start_process not found`; the owned marker stays absent. The actual SDK child closes with code 0, signal null, no stderr, errors, kill attempts or cleanup failures, and the owned manifest is unchanged.

Cases using internal `generateTable` injection prove existing ownership/journal/backup bookkeeping. They do not prove that real Codex accepts the generated TOML. The actual SDK case proves the preview-derived runtime selection and absence of an execution grant; it does not consume a Codex model or substitute for the parent's separately owned pinned Codex 0.160.1 verifier.

## Exact evidence pins

All paths beginning `artifacts/` below are retained ignored files under the worker clone unless explicitly identified as root review artifacts. They are original evidence locations, not claims that ignored files ship in the package. The parent owns durable shared evidence assembly and later integration records.

| Evidence | SHA256 |
| --- | --- |
| Frozen new fixture, unchanged from first baseline through source PASS | `369d2dc5e4da6e7180eb49375f80f86c2f8060695050c63050172c6810063799` |
| Baseline `artifacts/issue-239-baseline-v1/receipt.json` | `be2f8e6d89809d735d51dec2237f09d332d8798c88717c6467e6d8b9b00d475b` |
| Baseline `stdout.raw` | `35687c1323ea69801673ffa3f1e2da36e775a9d776309a5581b107168b1e92e8` |
| Source `artifacts/issue-239-source-v1/receipt.json` | `4b6eb2cf17687f0747d50728fdd2a7db838bc89b5651b66963f587392e9cbf9b` |
| Source `stdout.raw` | `964a4d945efb98febff0bbadf96087848b13cb7035fbb0dc71f04b73967408ff` |
| Both empty stderr files | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Source `decoded-diagnostics.json` | `68500b551e859e88ee0408fa5f16c64386e7ec5a342218bb3257bba10ad2964a` |
| Source offline `interpretation.json` | `ef57562a792841eb92a2aa81961aaf662e0911a13598d346e390b74d6ac16700` |
| Source `artifacts/issue-239-worker-source/freeze.json` | `2ba5b24122c28e5ab825d6831b5475f620bcbd2bb57e7aab38e34f70037023d3` |
| Source preparation receipt | `7bb5e69ffdaf7f33acd7cf366e207a75fc3548d1ac13366a140c071637bfac09` |
| Source execution recipe | `2fddbac77a79cd27d8b88a6c7b32f154ad488e773546cbe90d2a88ab2404c954` |
| `src/cli.ts` implementation | `62afad36fc45fc60fe2ec1e00f7807c0e4920b4b452bf3f915c106b4047d1be7` |
| `src/codex-registration.ts` implementation | `e19b41728f8f079c58a25409d29415c231df2623857e7771c5408df9de861caf` |
| Revised single legacy test file | `d47efde36170995400bb4c5d9b2259042a852d9ada24032a7e3dad12bace5cd5` |

The baseline freeze covers 524 inputs; the focused source freeze covers 540, including the CLI test and actual source preparation inputs. Both include all 27 source modules, all 54 emitted JavaScript/declaration files and the declared runtime file closure of fourteen installed dependency packages. This is a deliberate input over-approximation, not runtime execution tracing. Every selected input matches its frozen copy, run copy and post-run binding; Node is pinned separately. The new fixture additionally reports 29 selected package bindings, hash `8ce60acf13edadfbaab079b170c5fb928c055bd8756f85dfe3f1c4c02553832e`, for entry/package/all 27 JavaScript modules.

Only six previous input bindings changed for implementation: the two source files, the one legacy test file, `dist/cli.js`, `dist/codex-registration.js` and `dist/codex-registration.d.ts`. All 855 other original base blobs remain identical. The new fixture selects the actual `MTERM_VERIFY_BIN` package when supplied and imports its production modules without falling back to checkout modules; this invocation selected the checkout source entry, so it is not installed-package proof.

## Preparation and independent review history

Unchanged-source `build:code`, targeted formatting and syntax checks preceded the first fixture freeze. Before implementation's focused run, captured targeted formatting, `npm run build:code`, targeted format check, the revised legacy fixture's syntax check and `git diff --check` all exited 0. Build stderr retained the existing 99-byte npm `http-proxy` warning. These are development preparation checks, not normal reviewed build or full qualification claims.

Pre-run static review identified one concrete capture-runner problem, `R239-PRE-1`: post-spawn setup/capture/flush or interrupts could bypass bounded owned-child cleanup and receipt writing. Only ignored runner artifacts changed. Version 3 repaired ordinary exception handling; a remaining asynchronous SIGINT interval was identified before execution. Version 4 installs a non-raising interrupt latch before spawn and preserves bounded owned TERM/KILL/reap, original failure evidence, partial raw output and best-effort invalid/unknown records. The original handler is restored only after observed exit or explicit cleanup uncertainty. No version 2/3 fixture execution or simulated probe occurred.

| Preserved preparation selection | Runner SHA256 | Freeze SHA256 | Disposition |
| --- | --- | --- | --- |
| v2 | `c6c46c7f8a364d23467b23b55e47c767dc4e09ff35a28d9c92cb657e3513340a` | `bab5c67570ea8654724394146882a56355b6abfab51faf744a4231ffa14d0507` | Static finding; unexecuted. |
| v3 | `938c5574dbbdcaab1bef3cd1984fa2e74cb8c1fdc708e761f10143ecabd9a0b9` | `5195654f4a68a00b8f9fe14e9fc4fd36a563e3b0373e5d44d1a0dddb45255315` | Remaining SIGINT interval; unexecuted and superseded. |
| v4 | `ce46c57961283b191f9c78d809e0890fbf03496c355885e6065b7379d5166f9a` | `cd18709fa54ea6d11bb4fee3879564a40454063968f01a829f6f5a7641bd1c46` | Independently cleared; unchanged runner used for both actual invocations. |

Earlier snapshots, recipes, preparation outputs and reviews remain byte-identical, including the original unexecuted fixture snapshot and the earlier count-description correction. These are preparation history, not fabricated product failures. Abrupt host SIGKILL, noninterruptible operating-system I/O, detached descendants, PID reuse and a global process/listener census remain outside the runner's guarantee.

Independent peer `/root/git_fetch_scope_review` retained these root artifacts:

| Review | Root artifact under `artifacts/issue-239-peer-review/` | SHA256 |
| --- | --- | --- |
| Initial runner static finding | `pre-run-review-v2.json` | `1e0386d3be5bde05baebede7d82b6027e26e793ff06810faac6135895ba4d431` |
| Final pre-run CLEAR | `pre-run-review-v4.json` | `200a22eaf7603d76c3071b07321a3eaa10db24b72cb09c1a55987c0d04cd0c1c` |
| Valid baseline interpretation | `baseline-v1-interpretation.json` | `697cf1a62785b01c4c0666562d5a7e85b1d9027a637ccc3b0d3c2ac07fcb5f22` |
| Retained source56 evidence inspection | `source56-independent-review.json` | `7ba5ad413d4013251f795655cd03194f068d1a73a3f123e044fb789e016643f3` |

The last review independently matched all 540 current/captured/post-run bindings, all 13 typed diagnostic roundtrips, actual source counts, CLI closure and real SDK observations. It preserves the unobserved outer-summary boundary. It is evidence inspection, not the pending final six-path review or the separate peer source11 execution.

## Scope and next unverified action

The worker aggregate owns exactly two production files, the new fixture, one legacy test transition and these two dated records. The parent owns shared managed-Codex/package verification, user guidance, handoff, protected catalog evidence updates, reviewed-build metadata and publication. CLI-292 and CLI-286 retain their current validated stages; CLI-259 retains implementation. Weights, acceptance, order, seed, estimates, blockers, DCP and expansion acceptance are unchanged here.

There is no local installed retry, actual native Codex invocation, model request, provider/Cloudflare/deployment change, connected Windows operation, permission increase or global runtime change in this worker phase. The source fixture's SDK no-execution result and injected ownership results do not prove universal process isolation, hard CPU/GPU/RAM/disk-write enforcement or cross-host quotas.

Next: freeze the documentation-only six-path checkpoint, obtain independent final review and the separately authorized source11 observation, then let the parent integrate the independently reviewed shared verifier and run the exact normal/installed/hosted qualification sequence. Any later result must be appended with its own actual commit, input bindings and capture; this record does not pre-award it.
