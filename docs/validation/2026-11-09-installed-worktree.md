# Ordinary Git worktrees through SDK/stdio MCP — scoped qualification

Issue [#235](https://github.com/MulattoTech/MTerm-CLI/issues/235), a child of
[AUTO-001/#66](https://github.com/MulattoTech/MTerm-CLI/issues/66).
Session `MTERM-WEB-20261109T131339Z-resume-a9287b3c`; OpenAI / GPT-6 Astra Pro
(self-reported). Implementation owner `/root/worktree_implementation`; independent
peer `/root/provider_evidence`. Qualified production base:
`c69762da7d1dda54f7a74795c08c1f699367c77f`.

## What this change establishes

The new six-case fixture passed on its **first execution against unchanged
production source**. It demonstrates existing read-only Git behavior through real
SDK/stdio MCP in an ordinary clone and an untouched Git-created linked worktree.
No production defect was reproduced and no behavior fix or artificial RED is
claimed.

The existing 18-case boundary suite remains byte-identical. Its rearranged linked
layout and direct-service coverage remain useful; the new fixture supplies the
separate ordinary-layout and successful SDK path. Only the existing installed Git
verification block is extended. Local actual installation was blocked by missing
offline cache metadata **before tests**, so installed qualification is **NOT RUN
locally**. The required hosted installed lanes must establish the combined 24/24.

## Six cases and boundaries

| Case | Requests and expected result |
| --- | --- |
| Ordinary independent clone; its one root | Status, unstaged diff and staged diff succeed with exact expected entries and distinct content. |
| Ordinary linked worktree; worktree and actual repository roots | The same three requests succeed at the default path. |
| Same explicitly authorized linked layout; nested path | The same three requests succeed, preserving distinct staged/unstaged content. |
| Linked worktree root only | All three Git operations return `GIT_OUTSIDE_ROOT`. |
| Linked root plus an unrelated repository root | All three Git operations remain `GIT_OUTSIDE_ROOT`. |
| Correct linked-root pair; ordinary file tools | Reads of the worktree `.git` pointer and parent `.git/config` remain `PRIVATE_PATH`. |

All six hosts additionally assert the complete ten-tool read-only inventory,
exact canonical `ownerRoots` and `effectiveRoots`, disabled write/general-execution
and config-write capabilities, and no network listener. Denials have bounded,
typed envelopes without successful output, private fixture paths or sentinels.

Setup creates a seed commit, an independent local clone using `--no-local` and
`--no-hardlinks`, and an ordinary `git worktree add --detach`. It never relocates
private metadata or rewrites `.git`, `gitdir` or `commondir`. Native top/private/
common identities are observed before the MCP interval. Clone objects have no
alternate-store references or hardlinks. Separate tracked files carry the
index-only and worktree-only sentinels; another file is untracked. Each diff must
include its own marker and exclude the other two.

Every MCP child runs from an owned external cwd with explicit owned home/config/
temporary directories. The fixture uses the selected `MTERM_VERIFY_BIN` when the
installed verifier supplies it; source execution uses the repository entry.
Requests, Git setup commands, protocol buffers and child shutdown are bounded.
The pinned SDK's original child is observed directly. Stdin EOF must yield actual
close code 0 with no signal, kill attempt or stderr. A successful SDK close promise
alone is insufficient, and uncertain child closure retains the fixture.

A complete byte/mode/type manifest of the owned fixture tree surrounds the MCP
observation interval. No setup Git command occurs inside that interval. This
covers fixture content, index, HEAD, refs, config, objects, native pointers and
both shared/private metadata. Successful TAP diagnostics retain the full agreed
manifest, digest, relative native topology and child-close observations. Equality
is a before/after observation, not proof against an adversarial concurrent writer.

## Tests before integration

Final new fixture SHA256:
`8f9cf62a1c6fb601bec9258a44ff26897bf84690fa40cf6e88d92963b6e7d529`.
Original18 fixture SHA256, unchanged:
`a658fe4eb94e1186c83762e9059431867bd1733fb879ec2cf2214c37cf5986a2`.

The peer reviewed the frozen fixture before its first run. A diagnostic-only
revision added complete manifests to retained TAP before any execution; it did
not alter setup or assertions.

| Local action | Actual result |
| --- | --- |
| `npm run build:code` | Exit0; development compile only. |
| New source fixture, Node24.22.1/Linuxx64/Git2.52.0 | **6 passed / 6 total**, zero failures/skips/cancellations/todos, exit0, empty stderr. |
| Exact source/compiled/SDK execution bindings | All 118 unchanged before/after; raw snapshots retained. |
| Six actual MCP child lifecycles | Natural close0, zero signals/kill attempts and empty child stderr. |
| Owned fixture manifests | All six 106-entry manifests unchanged, hashes independently recomputed. |
| Source syntax and targeted formatting | Passed. |
| Local installed suite | **NOT RUN**; both setup attempts failed before the test block. |
| Integrated source 32, normal review/build/typecheck/full-format/parity and hosted jobs | Root integration gates, not claimed by this worker record. |

First source run: `2026-11-09T20:20:44.080128+00:00` through `2026-11-09T20:20:46.386594+00:00`,
2.297s. Raw TAP SHA256:
`ad98fcece3558f9d6c5d150798a336191e5204af4ac75c62b6c3cb86fbb9f29d`.
Execution receipt SHA256:
`621aef7a91b97f8ba1190c033e58b12ab5e98d7978f5098063f7d5ffdedc60c4`.
The independent evidence audit checked the actual streams, all 118 bindings,
complete manifests, topology and close observations. Its receipt SHA256 is
`9ca4182f5638a39af25c265d3c5b3ee605173da74af252554130f8ff3b12d064`.
A separately executed peer source run and final four-path review remain subsequent
qualification at this worker checkpoint.

## Installed verifier wiring and retained setup failures

The existing Git block now runs the untouched 18 cases plus the new six from the
external package-verifier home. It requires exactly 24 tests and 24 passes with
zero fail/skip/cancel/todo, binds the installed Git/executable/shared modules,
and rechecks both fixture hashes. The legacy `fixtureSha256` field is retained;
`ordinaryWorktreeMcp` states the observations asserted by the new fixture.
The source verifier SHA256 is
`70c91d7ecfc4a3d3cbdd32f8237cf8fbe1c50461f036a5a3be7bcc897842e391`.

Local focused qualification was designed to execute the exact reviewed shared
binding and Git blocks after a real tarball pack/install in an owned external
workspace. Both packs succeeded with `--ignore-scripts`; neither constitutes a
normal reviewed prepack/full-verifier PASS. Both offline installs failed before
MCP tests:

| Attempt | Actual prerequisite failure | Retained runtime/evidence |
| --- | --- | --- |
| 1 | `ENOTCACHED` for the exact pinned server tarball URL. Three integrity-verified byte objects lacked the URL-addressed cache record. | `/tmp/mterm-package-verify-dDebJ0`; `artifacts/package-verify-FOCXg5` |
| 2 | The server URL record resolved; `ENOTCACHED` for `https://registry.npmjs.org/zod`. | `/tmp/mterm-package-verify-aigwbI`; `artifacts/package-verify-jRDQ3f` |

Attempt2 carried only verified locked public tarball bytes and existing matching
URL-cache metadata: original observation time, empty request headers, compression
flag and the reviewed nonsecret response fields. No auth/config, arbitrary headers,
new dependency resolution or fresh download was copied or claimed. The initial
recipe and both failed workspaces/streams remain retained.

Read-only preflight at 2026-11-09T20:33:11Z found no existing entries for:

- `make-fetch-happen:request-cache:https://registry.npmjs.org/zod`
- `make-fetch-happen:request-cache:https://registry.npmjs.org/@modelcontextprotocol%2fcore`

No third install was attempted. No registry record for the patched server was
fabricated. The two owned cache paths end in `/cache` under the retained runtimes
above; neither supplies the missing original registry metadata. Preflight receipt
SHA256: `6c33f3e79eb3ba84a70d4fb771cc3156bd857d31ed75f3f3b054d09604c13759`.
All attempt command/stream, tarball, seed and workspace hashes are recorded in the
[change record](../ai/changes/2026-11-09-installed-worktree.json). The required
hosted normal installed lanes are the next actual package qualification.

## Acceptance and limits

CLI-266, CLI-283 and CLI-284 receive bounded evidence only after root review.
All protected stages, weights, acceptance text, estimates, blockers and the 300-ID
seed stay unchanged. No DCP/WEB acceptance is earned and broader #66 stays open.

Malformed/adversarial pointers, configuration consulted during initial native Git
discovery, alternates, partial-clone implicit fetch, full cross-workspace
relationship proof, hostile repository sandboxing and concurrent writers remain
outside this slice. The original filter/include denials and private metadata
protections remain enforced. No root discovery or broader grant is added.

This work changes no production source, dependencies, workflows, self-host
verifier, live Windows/provider state, model lane or production bridge/plugin.
Root must reconcile qualified current main, run its integrated focused and normal
gates, then inspect all six exact candidate jobs and all six actual-main jobs,
including actual installed 24/24, before closing this child scope. Standing owner
authorization covers normal delivery; no repeat owner approval is pending.

## Root integration on qualified main

The four-path worker commit `f37e9c1021bf457cfbe9a65e2a8303856ee7481a` was preserved
and serialized onto separately qualified main3077 as
`b457bdd887a57a1d18933092d487491337e00ceb`. All four worker blobs matched exactly.
The new fixture and verifier remain frozen at8f9cf62a and70c91d7e respectively;
production source and the original18 fixture remain unchanged.

The combined source command ran the new6, original18 and existing Git/MCP8:
**32/32 passed**, zero fail/skip/cancel/todo, actual Node and outer-command exit0,
empty stderr, and120 unchanged source/compiled/SDK bindings. It ran from
20:40:01.580439 through20:40:10.794105UTC,9.197s monotonic duration, on Node24.22.1 /
Git2.52.0 / Linuxx64. Receipt SHA256:
`f5c4645e2de5bc6d3bb87d42a6d73204a0ee7cf81c945f738ec9e7ee6d8c5b54`.

A preceding root wrapper had an unavailable execution-channel session and retained
only its input snapshot, without a raw stream or completion receipt. No known
owned runner/test process remained at the subsequent inspection. That attempt is
**UNKNOWN/unqualified**, not product RED or PASS. The confirmed execution changed
only the ignored wrapper to retain output directly and observe its foreground
result; all test/product inputs remained unchanged. Its interruption receipt is
retained separately in the machine-readable evidence.

[Source evidence](2026-11-09-installed-worktree-source-evidence.json) retains actual
receipts and complete input bindings. [Initial source6 TAP](2026-11-09-installed-worktree-initial-source.tap)
and [root source32 TAP](2026-11-09-installed-worktree-root-source.tap) are byte-identical
to their raw streams. Their SHA256 values are ad98fcec… andf0242c9d… respectively,
with complete values in the evidence record. No installed TAP exists locally.
The `networkListener:false` assertion checks the host's reported capability; no
independent operating-system listener census is claimed.

The shared update also persists [PR234 source delivery](2026-11-09-staging-recovery-delivery.json)
without closing issue232 or claiming its unresolved live provider/connected-cleanup
acceptance. Normal gate outcomes and final independent reviews are appended to
the change record. All six exact candidate and all six separate actual-main jobs,
including actual installed24/24, remain required before this child is closed.
