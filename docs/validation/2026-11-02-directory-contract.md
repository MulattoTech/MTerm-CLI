# DCP-022 bounded directory-listing contract — 2026-11-02

This is a scoped continuation of [issue #24](https://github.com/MulattoTech/MTerm-CLI/issues/24).
It begins at verified merged main `7d55c6a2c498a02ce0191ce3f0a1a4a109c042ea`, tree
`654d299b8bbfa9a041ea21882b115200b62da300`. The 48 DCP contracts, 12 remote WEB
contracts and 300-item maturity catalog remain independent acceptance systems.

## Authority and preserved delivery

The directly retrieved [PR #74 final receipt](https://github.com/MulattoTech/MTerm-CLI/pull/74#issuecomment-6578358474)
confirms the setter-output slice is delivered. Final PR head `b565b95041a9f53be01ae656040d9b29236b0d73`
passed nine checks; merged main passed five checks; neither campaign required a
retry. Their identical tree and the final recovery checkpoint resolve historical
prepublication pending fields. This continuation does not repeat that implementation,
its completed qualification, pairing or deployment.

The [new issue audit](2026-11-02-directory-contract-issue-audit.json), completed
13:41:39 UTC, read all 48 DCP bodies and 23 comments. All were open, with zero
identity/state/title/URL/pin/epic mismatches. It records the actual observation
time; later comments must not be backdated into that audit.

The new ordinary scratch clone and separate ordinary Windows delivery clone are
owned by this task. The original dirty primary checkout, prior delivery clones,
protected AO/HAR worktrees and the existing foreground owner agent are preserved.
The source pre-change bundle is SHA-256
`1446b9ce56da377d4941843d8044cbaf9ef2d2acc190df83f7c5f8e5019021dd`;
source tar is `1c45e448c1b9a68ab3acfc6b5c0dda832cf30b7fdc09107db8936c09d6a52c06`.
Both are retained under `artifacts/checkpoints/directory-contract-start-20261102`.

## Pinned behavior and the selected correction

The target remains DesktopCommanderMCP 0.2.52 at
`c774c3b505de990219637ecdc9a830c8772fae9d`, with 26 published tools.
The reviewed source is the pinned
[filesystem handler](https://github.com/wonderwhy-er/DesktopCommanderMCP/blob/c774c3b505de990219637ecdc9a830c8772fae9d/src/tools/filesystem.ts)
and the committed schema/manifest snapshots under `docs/parity/`. The fetched
filesystem source has SHA-256
`f3802e7439a44aea69f96757cfe5dd70e5aa739888c1aba0da6b185d66c38a0b`.
It is a research input; no upstream bootstrap, telemetry or server is executed.

The previous adapter retained the first entries yielded by `fs.opendir` and only
then sorted them. Truncated membership therefore depended on enumeration order.
It warned before returning the directory contents, did not count omitted entries,
and could discard already collected entries when a traversal limit or nested
filesystem error interrupted enumeration. The response byte count also omitted
the separators inserted by `join('\n')`.

The bounded correction belongs in `src/desktop-commander-files.ts`, using the
existing `FileService` and `RootPolicy`. It retains at most 1,000 top-level or
100 nested entries, counts eligible entries only while bounded enumeration
continues, and chooses a stable lexical prefix before emission. Private names
are excluded before the visible count. Completed enumeration can produce an
exact trailing hidden-item warning; interrupted enumeration must state that the
listing is incomplete and must not invent a total.

Nested open failures and operational read/close failures during an already
opened listing (including the root) retain useful collected entries and produce
safe not-found/denied diagnostics. Root open failures still fail the tool call. Raw OS error messages are never included. Root
authorization, private-path and link checks remain fail-closed; cancellation
must remain cancellation, including during a failed per-entry policy lookup.

## Intentional differences retained for acceptance

| Contract aspect | Pinned upstream | Bounded MTerm contract |
| --- | --- | --- |
| Top-level count | No per-directory cap | Retain at most 1,000 entries |
| Nested count | First 100 returned entries | Stable lexical prefix of at most 100 eligible entries when enumeration completes |
| Enumeration | `readdir` result materialized | Stream with a global 4,000-dirent ceiling and cooperative five-second deadline |
| Hidden-item total | Counts raw directory entries | Counts eligible non-private entries only after observed EOF |
| Incomplete scan | No equivalent global bounded scan | Explicit incomplete warning; no guessed exact total |
| Display separators | Platform `path.join` | Existing `/` display normalization on every platform |
| Root failure | Pinned directory handler can report an operational marker | Root-policy/schema/open failure remains a failure; an interrupted already-open scan can return explicitly incomplete partial results |
| Links/private paths | Pinned validation rules | Existing stricter owner root, link and private-name policy remains |
| Depth/schema | Pinned schema target | Existing integer depth 0–16, default 2, and UI-origin refusal remain |
| Response size | Pinned server behavior | Existing 262,144-byte ceiling, including inserted UTF-8 newline bytes |

The deadline is cooperative between filesystem operations, not an operating-system
timeout capable of interrupting a blocked filesystem syscall. The retained-entry
selection is an original bounded algorithm; upstream diagnostic wording and
behavioral references remain attributed. These intentional differences need an
explicit acceptance decision; implementation evidence alone does not grant one.

## Qualification ledger

The [development receipt](2026-11-02-directory-contract-development.json) records
these separate, actually observed runs. Counts from repeated runs are not added
together as distinct coverage.

| Development stage | Observed result | Scope |
| --- | --- | --- |
| Original direct RED | 16 cases: 3 passed, 13 failed | Original pre-fix runtime; exact overflow/error/budget/cancellation assertions |
| First direct GREEN | 16/16, zero skips/cancellations | Initial correction; original test bytes unchanged |
| Independent-review handle RED | 2/2 failed | Real open directory handles remained readable when closure was required |
| Final direct GREEN | 18/18, zero skips/cancellations | Original 16 cases plus both real-handle cleanup regressions |

These are supplementary Linux scratch Node 24.22.1 direct-service checks using
`--test-isolation=none`. The ordinary isolated scratch runner failed at file level
before assertion output and supplies no product RED or full-suite acceptance.
The original direct RED's exact start/end were not retained; its later recorded
observation time is labeled honestly. Final direct GREEN ran
`2026-11-02T13:59:21.742256+00:00` to `2026-11-02T13:59:22.930747+00:00`.
Native Windows, actual installed-package, committed-source, fresh-extraction and
hosted qualification remain separate gates and are pending at this preparation.
No real model call or user Codex configuration is used.

The [independent static review](2026-11-02-directory-contract-review.json) records
no remaining blocking finding in these exact final bytes:

| File | SHA-256 |
| --- | --- |
| Runtime adapter | `3cd606ebbf5404da939c238d6173721d4656d1ee28fd4982ba259b826ec062de` |
| Final 18-case focused tests | `1a141cc647965d4365e5828ea114c0b8b44585d27bddc2e927714747345c3d49` |
| Installed verifier | `7465e2dfc138d0f5da27596400ac0ede67348821c98afc8c1591f0666b047adc` |

The original 16-case fixture remains retained with SHA-256
`d97078667600b32383fa8fd253efbb3079c367b76befa6df18b83e8a6ffbc7f0`.
The pre-fix runtime is
`6b625cd73bb77d4f947e8c354a4c879d35f7e566cd17928f24e5f838a8680782`.
Review found and resolved the unstarted `fs.Dir` iterator cleanup defect and an
incorrect `get_config` envelope lookup in the new installed harness. Static
review and direct tests are not installed-package or hosted results.

The installed harness now defines six directory scenario groups through the
actual offline npm-exec packed entry: zero/default/one-level depth, exact
visible-only overflow with stable repeat output, private-name omission, link
refusal, root/private/link/missing-path errors and schema bounds. It captures
both npm's PID and the actual MTerm server PID, independently checks their exits,
aggregates cleanup errors and retains owned fixtures if exit cannot be confirmed.
No successful execution is inferred merely because the harness exists. Existing
configuration network instrumentation is a separate verifier and is not a new
network-sandbox claim for the listing scenarios.

## Current connection recheck

The [additive connection receipt](2026-11-02-directory-connection-recheck.json)
records a failed Browser bootstrap: the originating browser context was not
available. No dashboard navigation, client consent, discovery or read occurred.
No currently exposed tool names/descriptions matched MTerm; that bounded catalog
check does not prove absence in every scope. Cloudflare specification lookup
succeeded, but the management-account/plugin-listing batch produced no observed
result before interruption. It supplies neither fresh deployment/Access-policy
verification nor a repaired plugin-creation path. Historical observations stay
historical. No denied host, non-retryable creation, alternate browser identity,
pairing or live deployment mutation was attempted.

## Remaining owner contract decisions

DCP-009 still needs an owner ruling on its documented omitted probes and privacy
restrictions: `docker`, `pythonInfo`, `isDXT`, `nodeInfo.path`,
`nodeInfo.npmVersion`, and `examplePaths.accessible` are intentionally omitted;
shell/editability metadata is owner-bounded, the platform name has no container
suffix, and no vendor analytics/experiment provider is queried. Absence is not a
claim that the underlying component does not exist.

DCP-010 still needs acceptance of effective validated output rather than raw
request echo, strict supported coercions, immutable owner root/shell ceilings,
mandatory command blocks and independent configuration-write authority. These
are precise contract decisions, not authorization for a model call or real
authentication/configuration changes. No owner ruling is inferred in this pass.
Separate shell/process issues are not silently prerequisites for issue #12.

Actual ChatGPT consent/discovery/read and model-driven Codex tool invocation
remain distinct from dashboard presence, parser checks and SDK calls. The
approved owner root remains `C:\Tools\Dev\MTerm-RemoteWorkspace`; existing
enrollment does not require pairing again. A historical non-retryable plugin
creation error or denied browser host must not be retried or bypassed.

All issue states, acceptance texts, stages, weights, estimates and dependencies
remain unchanged. DCP acceptance is 0/48, WEB is 0/12 and broad maturity remains
29.12%. This scoped work does not declare complete parity or production readiness.
