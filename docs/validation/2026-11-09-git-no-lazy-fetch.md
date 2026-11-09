# Read-only Git promisor admission — prepared fixture, 2026-11-09

## Scope and current result

**Phase 1 only. The 12-case fixture has not executed.** No native calibration, SDK
reproduction, installed-package test, behavioral correction or acceptance claim
has occurred in this checkpoint. The only executed preparation is development
compilation of unchanged production plus fixture formatting and syntax validation.

Session `MTERM-WEB-20261109T131339Z-resume-a9287b3c`, OpenAI / GPT-6 Astra Pro,
self-reported. Sole implementation writer `/root/git_fetch_implementation` works
in a normal isolated clone at qualified base
`3077a7fe1927d1ae17aab99570832d6f9e1e3819` on
`fix/issue-237-git-no-lazy-fetch-20261109`.
[Issue237 ownership](https://github.com/MulattoTech/MTerm-CLI/issues/237#issuecomment-6751384480)
is distinct from the historical66 claim. Root owns shared records, the installed
verifier and publication. PR236 is frozen under separate hosted qualification;
this worker has not absorbed that unqualified candidate. Final root integration
will preserve issue235's original24 Git cases after its actual-main gates.

## Frozen intended contract

The selected bounded policy is to refuse every repository declaration of
`extensions.partialclone`, `remote.<name>.promisor` and
`remote.<name>.partialclonefilter` before status/diff, using the existing sanitized
`GIT_UNSAFE_CONFIG` error. Key-only admission deliberately includes complete
repositories and false, empty, duplicate or unused declarations. Dotted remote
subsections and case normalization remain covered. Ordinary remote URL/fetch
configuration remains supported.

Every product Git invocation is intended to request `GIT_NO_LAZY_FETCH=1` as
additional protection where Git supports it. No production change implements
that intention at this checkpoint. This is not a new enforced minimum Git version
or a claim that older executables honor the variable. Configuration admission
still follows three native metadata-discovery calls. Initial discovery behavior,
object alternates, concurrent writers and a general hostile-repository sandbox
remain outside the narrow acceptance.

## Twelve proposed SDK cases

| Group | Cases | Expected behavior after a justified correction |
| --- | ---: | --- |
| Missing HEAD tree / `extensions.partialclone` | 1 | Status refuses without marker invocation |
| Missing index/HEAD blob / `remote.origin.promisor` | 1 | Unstaged diff refuses without marker invocation |
| Missing original HEAD blob, staged replacement present / `remote.origin.partialclonefilter` | 1 | Staged diff refuses without marker invocation |
| Complete repositories, one independent selector family each | 3 | All three Git operations refuse intentionally |
| False or empty promisor declarations on unused remotes; duplicate promisor declaration | 3 | All three Git operations refuse valid declaration syntax |
| Empty filter on an unused dotted remote; duplicate partial-clone filters | 2 | All three Git operations refuse valid declaration syntax |
| Ordinary remote configuration and complete object store | 1 | Exact status and distinct staged/unstaged diffs remain usable |

Each missing-object case first prepares separate native calibration twins. With
lazy fetching enabled, bounded native `cat-file -e` must reach the local helper;
with supported suppression, it must not. Both commands intentionally fail because
the helper supplies no pack data. A failed calibration is INVALID/BLOCKED for the
corresponding SDK observation, not a product PASS or a reproduced product defect.

The fixture uses actual Git-created commits/trees, packs only the referring
objects and adds their `.promisor` sidecar. It verifies the pack inventory and
index relation, deletes exactly one validated owned loose object, then checks
missing-object enumeration without fetching. A complete local donor is copied
through Git's explicit local transport before configuring the marker command;
no external URL, credentials or listener is used. There are no alternate stores,
hardlinks, submodules, template hooks or broad prune/gc operations. Paths contain
spaces, and the command quotes the absolute Node/helper paths for Git's shell,
with Windows separators normalized.

The helper writes one small deterministic marker outside the immutable manifest
scope and exits immediately. It does not read secrets, serve objects, spawn
children or contact a network. Repository, donor, helper and owned-home bytes are
covered by complete bounded before/after type/mode/size/hash manifests. The only
excluded directory is the explicit observer-marker directory. Identical after
manifests are represented by their actual rehashed digest alongside the complete
before manifest; changed after manifests are retained in full.

SDK clients launch the selected source or `MTERM_VERIFY_BIN` entry from an owned
external cwd/home without write or execution flags. They assert the exact ten
readonly tools, annotations, roots and disabled capabilities. The reported
`networkListener:false` is not an independent OS listener census. Each requested
response, marker/object state, actual child close and state manifest is recorded
before policy assertions can abort. A sanitized `GIT_FAILED` after helper
invocation is still a failed no-fetch observation. Complete-promisor baseline
failures establish only the selected compatibility difference unless a real SDK
marker also appears.

Natural stdin EOF/close, exit0/no signal/no termination and empty MCP stderr are
required. Captured-child fallback cleanup cannot turn a failure into PASS, and a
fixture is retained if an owned child close is unobserved. State equality remains
a bounded before/after observation, without a concurrent-writer guarantee.

## Actual preparation and frozen identities

- `npm run build:code`: actual exit0, unchanged production development compile.
- Targeted Prettier write and `node --check`: actual exit0, syntax/format only.
- Preparation receipt SHA256: `e72d4667968d15a722569be3efef4ef185bcfc590b4354557c9a37a6aa1b38d7`.
- Fixture SHA256: `d3b6f84f1bd1154c7e75b4ed1ccd3a54d05f1cb20b216ae9ae16f161b3192e86`.
- Unchanged `src/git.ts` SHA256: `362494082669a53057f7d8ebf2875b5d5b411c30ce315140732049baef9ee99b`.
- Planned execution recipe SHA256: `f20f4f80ad268cef2e23d44a0dad3d2d6c2c1cc0aefd41cabef4d9d6a1b3e206`.

These results do not supply normal reviewed build/check/prepack, full-suite,
installed, cross-platform or hosted acceptance. The original18 boundary fixture
and existing source, dependencies, workflows, roots and permissions are unchanged.
Root will independently review CLI-266/283/284 evidence without changing protected
stages, weights, seed, DCP or WEB acceptance.

## Next unverified action

Independent peer review of the exact frozen fixture and execution recipe comes
before the first unchanged-production execution. Retain the real calibration and
SDK outcomes, then decide whether the recorded mechanism justifies the bounded
production correction. No product execution is authorized by this document itself.

## Primary background

- [Git partial-clone design](https://git-scm.com/docs/partial-clone): promisor selectors and missing-object fetching.
- [Git environment documentation](https://git-scm.com/docs/git): `GIT_NO_LAZY_FETCH` and `--no-lazy-fetch`.
- [Git v2.56.0 partial-clone tests](https://github.com/git/git/blob/v2.56.0/t/t0410-partial-clone.sh): referring-object promisor packs and exact owned missing-object fixtures. The new Node fixture is original project code, using those documented Git construction semantics.

No provider, connected Windows, production bridge, unrelated project, global
runtime or paid/model operation belongs to this slice.


## Subsequent checkpoint: first mixed observation and fixture-only stdin repair

Recorded 2026-11-09T21:23:35.663589+00:00. The preparation section above is retained as its original
phase1 checkpoint. Root subsequently authorized and executed the frozen v1 fixture
once, after independent pre-run review. This section records that later event;
it does not reinterpret the earlier NOT RUN preparation as a test result.

### Actual first unchanged-source observation

At `5b8cf492ff8de9f7ff208d576e378e0112c8c4fd`, with production still equal to
qualified3077, root's actual run began `2026-11-09T21:18:57.572940+00:00` and ended
`2026-11-09T21:19:01.615770+00:00` (4.042716seconds). Node24.22.1,
Git2.52.0, Linuxx86_64. Actual Node exit1: **12 tests,1pass,11fail**, with zero
skips/cancellations/todos, empty stderr,120 unchanged execution bindings and no
wrapper timeout or owned-group signals. All132,171 raw TAP bytes are retained.

This result is **MIXED**, not a blanket product RED:

- Cases1,2,4,11 failed fixture setup on an observed `inputErrors:['EPIPE']` before
  their SDK observation. They supply no product result for those cases.
- Case3 completed both native calibration directions and the actual staged-diff
  SDK request. That request invoked the local marker helper and returned sanitized
  `GIT_FAILED`; its child closed naturally with code0/no signal/no kills/empty
  stderr, the target remained missing, and its covered manifest stayed unchanged.
  The marker is intentionally outside the immutable manifest. This is the narrow
  observed helper-invocation finding.
- Cases5–10 completed actual requests under the old policy, accepting the six
  complete/declaration configurations. These are selected compatibility-policy
  differences, without additional observed SDK helper execution.
- The ordinary positive case12 passed.

There are exactly three retained native-calibration observations (promisor ON,
filter ON and filter OFF), not all six planned observations, and eight retained
actual SDK cases. The native promisor-ON calibration recorded a changed covered
manifest; no general immutability claim is made for that intentional calibration.

Receipt SHA256: `1337c643ae0931ed8dd2b5db5d3dd05ffeb28caf96cbf83d5a5ad3f63f164382`.
Raw TAP SHA256: `6e8231651627e257bfcacca00d980923dbbd6cf9737d3ce70d84d1e3847bac6d`.
Root interpretation SHA256: `8e0664e335b25df887a63349913642491f3710e0b7e2b037a8db74ccd3ed05e6`;
independent evidence review is separate. The raw diagnostic text includes Node24's
TAP escaping layer: reverse its backslash/hash escaping exactly once before JSON
parsing. Raw streams were not rewritten and no parse correction reran the product.

### Causal fixture repair, still unexecuted

Inspection of the actual Node24.22.1 built-in JavaScript shows
`Writable.prototype.end` calls `_write` whenever a chunk is supplied, including
an empty string. Omitting that argument skips the chunk write and performs the
normal EOF/shutdown path. The failed fixture always called `child.stdin.end(input)`
even for no-input commands. The retained stacks locate its EPIPE assertions at
ordinary setup commands (`config`, `ls-files` and `add`), before the relevant SDK
observations.

The only fixture change now calls `child.stdin.end()` when input is empty and
retains `child.stdin.end(input)` for nonempty pack-object input. All stdin-error,
exit, signal, timeout and kill checks remain, as do all12 titles, setup/calibration
preconditions, diagnostics and product assertions. No EPIPE is ignored, retried
or reclassified. No product code changed. No synthetic microprobe was needed or
run; the causal explanation is source inspection, pending revised execution.

Actual static preparation: targeted Prettier, `node --check`, and `git diff --check`
each exited0. Preparation receipt: `fafaccfc6c65e6ef77897f39ab177424d2759dff8c77e9ed359bb24ff1967410`.
Node-source inspection receipt: `a6f649c66ab5b7f1fab17fca25186212ceb57987c9f42c8b09e9239db8940ce0`.
Revised fixture SHA256: `b7bc8d16791c617cab0796b69ccda797c07e32dae72e1f585192fbb505060ebd`.
New planned recipe SHA256: `04623715ddd669d1782218affedb0cbdccdc6435f4a0fa7f1822682b1a19ce2e`.
The original v1 commit, fixture snapshot,120-input manifest and all mixed-result
artifacts remain intact. The next action is independent review of these exact v2
bytes and root's separately owned concrete runner, then root authorization for a
complete revised unchanged-production observation. **No v2 fixture/native
calibration/SDK test or production correction has run at this checkpoint.**


## Subsequent checkpoint: corrected baseline and authorized production correction

Recorded 2026-11-09T21:38:18.263527+00:00. This section follows the preserved first mixed
observation and fixture-only repair. The original v1 failure evidence remains
unchanged. Root and the independent reviewer validated the corrected v2
observation before root authorized this production change.

### Corrected unchanged-source observation: actual RED

Root ran the exact v2 fixture at `9679760f4dec8fd55c8055fb6d2534931092f839`,
with production still byte-identical to qualified3077. The run began
`2026-11-09T21:30:10.469378+00:00` and ended `2026-11-09T21:30:15.351490+00:00`.
Actual Node exit1: **12 tests, 1 pass, 11 failures**, with no skipped, cancelled
or todo cases. All six native ON/OFF calibrations and all twelve actual SDK
cases completed, producing thirty SDK responses. No setup case was invalid.
The 120 execution inputs remained unchanged; stderr was empty, with no wrapper
timeout, termination signal or capture loss.

All three missing-object SDK operations invoked the local marker-only upload-pack
helper and returned sanitized `GIT_FAILED`. Status with the missing HEAD tree and
unstaged diff with the missing index blob each also changed the owned repository
configuration by 32 bytes. The staged-diff case left its covered manifest
unchanged. All three target objects remained missing. The other eight failures
were the frozen declaration-admission policy differences in complete repositories;
they were not additional helper-invocation findings. The ordinary remote control
passed. All twelve actual SDK children closed naturally with code0, no signal,
no kill attempts and empty stderr.

Native calibration ON reached the marker for each selector and failed intentionally
because the helper supplies no object. Calibration OFF reached no marker, failed
without the missing object, and preserved its covered manifest in every case.
The two ON calibration config changes are retained as actual observations; the
immutable-state requirement applies to product requests and OFF calibration.

Corrected v2 receipt SHA256:
`d462fdb1dc09ef6f3e29ad11124f2ae53647ebe2a4d1f03b20dd2b5b90138709`.
Raw TAP SHA256: `43ede74328d9e2995337e68f9ee4e38468b36c39503420abcc259df5b8dfd6e5`.
Root analysis SHA256: `1d54ab1c74523a2f591664678bf3c374f6215f9c28033378c365579b0c5bea4c`.
These are local retained artifacts under
`artifacts/issue-237-observation/corrected-source-v2/`.

### Minimal production change and compatibility policy

`src/git.ts` now sets `GIT_NO_LAZY_FETCH='1'` in the existing shared `run()`
environment, so metadata discovery, key-only admission, status and both diff modes
receive it. The existing bounded, lowercased key admission additionally refuses
`extensions.partialclone` and remote subsection declarations ending in
`.promisor` or `.partialclonefilter`. Matching after the `remote.` prefix retains
the distinct subsection separator and supports dotted remote names. Existing
filter/include rejection, key/output limits, root checks, cancellation, process
arguments and timeouts are preserved.

Admission is intentionally based on declared keys, not parsed values or whether
objects are currently complete. False, empty, duplicate and unused declarations
are unsupported. The error remains fixed, sanitized `GIT_UNSAFE_CONFIG`; it
contains no repository path, key, value or command. Ordinary remote URL/fetch
mapping configuration remains usable.

The v2 fixture is byte-identical throughout correction and validation:
`b7bc8d16791c617cab0796b69ccda797c07e32dae72e1f585192fbb505060ebd`.
No assertion, expected outcome, calibration or test title was edited to obtain
this result. The production source SHA256 is
`21c5cbe79f1a3da7a9be2fecd2a50af2da9d61ca58b0534ecd15b661b79f663c`; compiled `dist/git.js` is
`930e29a3ac9e0642209eb2af2f43f05e87175eb1103a96962f93cc8c02f2d489`.

### Actual source gate: 38/38 PASS

Development `npm run build:code`, targeted source/fixture Prettier checking,
fixture JavaScript syntax checking and `git diff --check` each exited0 before the
focused run. The build retained a 99-byte npm warning about the inherited
`http-proxy` environment configuration; it did not fail compilation. These static
results do not substitute for normal build, roadmap, parity or package gates.

The focused command selected these four unchanged test files:

```text
node --test --test-reporter=tap --test-concurrency=1 tests/git-no-lazy-fetch.test.mjs tests/git-boundaries.test.mjs tests/git.test.mjs tests/mcp.test.mjs
```

The actual resolved Node executable was
`/opt/codex/runtimes/codex-primary-runtime/dependencies/node/bin/node`, version
24.22.1; Git was `/usr/local/bin/git`, version2.52.0; platform Linuxx86_64.
`MTERM_VERIFY_BIN` was unset, so the fixture used the source entry. The driver used
an owned HOME and removed inherited Git/MTerm overrides and `NODE_OPTIONS`.
It did not supply an outer `GIT_NO_LAZY_FETCH` override.

The one execution ran from `2026-11-09T21:35:09.318422+00:00` to
`2026-11-09T21:35:21.431737+00:00` (12.113321 seconds):
**38 tests, 38 passes, zero failures, skips, cancellations or todos; exit0**.
This is the new12 plus the unchanged legacy18 and existing Git/MCP8. The worker's
qualified3077 base does not contain issue235's separate six-case fixture; root
owns its subsequent integration and qualification.

The 204,091 raw TAP bytes and empty stderr are retained. There was no timeout,
owned-group signal, output-limit failure or wrapper exception. All 120 source,
compiled, selected SDK and fixture bindings were identical before and after the
run. Compared with the corrected baseline, only `src/git.ts` and `dist/git.js`
changed; declarations, dependency files, existing fixtures and the existing
package verifier remained byte-identical.

Read-only interpretation reversed Node24's TAP backslash/hash escape layer exactly
once and roundtripped all eighteen diagnostics to their original raw strings.
Every retained manifest digest was verified. The six native calibrations remained
valid. All twelve actual SDK cases recorded no marker, unchanged complete covered
manifests, natural close0, no signal/kill attempt/process error/settlement error and
empty stderr. The three missing objects stayed missing. Across thirty SDK
responses, the eleven unsupported cases produced twenty-seven fixed sanitized
`GIT_UNSAFE_CONFIG` refusals and the ordinary control produced three successful
status/diff responses. These counts describe actual observations, not skipped or
synthetic passes.

Source-gate evidence is retained under
`artifacts/issue-237-implementation/source-green-v1/`:

| Artifact | SHA256 |
| --- | --- |
| `receipt.json` | `6234b34ecf1374ce88f972f0061c2f321c571b205b2beb553467bd8e6afc019e` |
| `focused38/stdout.raw` | `103f9ca014867e1dd72bd06f341255474f9358250e37a695a3343e34e1268123` |
| `source-observation-analysis.json` | `a1678cee7c434163246c07d524bd5d8ed0e95c258c6e8fc44680fa7a7f67bce1` |
| `static-gates.json` | `b35734dd27526f61c18daa62cac1efca92d219250748bd7581e887b8fb3b3082` |
| `before-focused-inputs.json` and `after-focused-inputs.json` | `4cf06bdcbc8bcd92c0a9ba04bf4c7574528bc5c985f9c97e1c8c42e7a864f89d` |

The ignored evidence includes exact before/after input copies, direct raw streams,
actual exit/timeout dispositions, the one-use bounded runner, its recorded hash,
and the read-only analysis script. Original v1 and corrected v2 artifacts remain
separate and intact.

### Limits and next unverified action

This is a focused source result on the observed local Git/Node/platform. No new
minimum Git version is enforced. Older or vendor Git builds may not honor the
suppression variable; the key gate still follows three native metadata-discovery
calls. This evidence does not establish universal old-Git or pre-discovery
protection, a network sandbox, alternate-object-store confinement, concurrent
writer safety or a general hostile-repository guarantee.

No installed-package retry, full/quick suite, hosted platform, candidate merge or
actual-main acceptance is claimed here. Existing local qualification limits are
not waived. Connected Windows, provider/bridge and paid/model lanes were not
used. All source-gate inputs remain frozen for independent review. Root owns the
installed verifier's separate 36-case gate, issue235 integration, shared security
and roadmap records, exact candidate checks, publication and actual-main checks.

CLI-266, CLI-283 and CLI-284 were reviewed as the relevant requirements. No stage,
weight, acceptance, seed, DCP or WEB field changes are awarded by this worker.
The next action is independent review of the exact four-path aggregate and its
source evidence, followed by root's separately qualified integration gates.


## Root integration source qualification — 2026-11-09 UTC

The worker freeze remains preserved at81fa3dfc. Independent peer12/12 and root44/44 are
separate successful executions. Root integrates on qualifiedc351 and includes the original18,
ordinary-worktree6 and existing Git/MCP8 beside the new12. Root's121 execution bindings remained
unchanged; raw TAP and per-case manifest/closure observations are retained in the
[complete source evidence](2026-11-09-git-no-lazy-fetch-source-evidence.json) and its
[readable summary](2026-11-09-git-no-lazy-fetch-source-evidence.md).

The existing normal installed Git gate now requires36 cases and preserves original fixture/module
bindings. Local installed36 was not attempted after the previously documented offline metadata
blockers. Independent shared review, normal root metadata/build gates, exact hosted candidate and
separate actual-main qualification remain separately recorded; this source result supplies none
of those unperformed outcomes. Broader#66 and provider/connected cleanup#232 remain open.
