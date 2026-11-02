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
The later native Windows, installed-package, committed-source, fresh-extraction
and hosted qualification below independently completed. No real model call or
user Codex configuration is used.

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
The later native source-package and fresh-package probes each printed all six
passing groups, verified owned exits and fixture cleanup, and captured zero stderr
bytes. Existing configuration network instrumentation is a separate verifier;
it is not a new network-sandbox claim for the listing scenarios.

## Committed-source qualification and delivery state

Implementation `6eed7f0dc9ccfd704b78c39f8d0f31e5eaf3648a`, tree
`e01840a4ab07d80c085e1ebfabf75928b7b90fcf`, is published in
[PR #75](https://github.com/MulattoTech/MTerm-CLI/pull/75). All evidence below is
observed; final documentation-head checks, normal merge/main and final recovery
remain the next delivery gates at this record's preparation.

| Qualification | Observed result |
| --- | --- |
| [Native focused](2026-11-02-directory-contract-focused-windows.json) | Original 16-case RED: 3 passed/13 assertion failures; final GREEN: 18/18, zero skips or cancellations |
| [Native full](2026-11-02-directory-contract-windows.json) | Actual full-orchestration wrapper, normal reviewed build/check, **205/205 tests**, portable package and source-entry native Codex passed |
| Additional native gates | Self-host, normal prepack with 205/205 tests, explicit installed directory proof, and installed-entry native Codex all exited 0 |
| Installed directory contract | Six groups through actual offline npm-exec tarball entry; exact text/envelopes, depth, private/link/root/schema cases, independent npm/server exits and owned fixture cleanup |
| Existing installed configuration | Ten scenarios and 14 rejected writes; two concurrent MCP children and restart; ten intercepted network canaries and zero product attempts within bounded Node API instrumentation |
| Native Codex | Test-owned 0.160.1 parsed synthetic registration; source and installed entries each completed two SDK MCP rounds; actual agent invocation false, model calls zero |
| [Fresh committed extraction](2026-11-02-directory-contract-fresh.json) | Initially no dist/node_modules; locked install, reviewed build, normal prepack with 205/205 tests, actual package and six explicit directory groups passed |
| [Hosted implementation](2026-11-02-directory-contract-hosted.json) | 9/9 checks, all attempt 1, no retries; Windows 205/205, Linux/macOS 193 passed with 12 named Windows-specific skips |

Native focused qualification ran 15:09:42.868–15:09:56.743 UTC. The committed
native helper ran 15:13:03.461–15:15:39.359 UTC, including setup and fresh-source
work. Its actual full wrapper ran 15:13:14.771–15:14:04.726 UTC. Fresh extraction
began 15:14:44.655 UTC and the last fresh installed probe ended 15:15:38.413 UTC.
All times are 2026-11-02. Repeated executions are not added as distinct coverage.

The fresh source archive is 3,624,960 bytes, SHA-256
`4daaeb3d59514ffee59abafae5ec0be823f3509e45503fc9263a3f483205ea55`.
The measured package is 59,017 archive bytes, 229,611 unpacked bytes and
14,176,981 installed production bytes; external Node and Codex remain excluded.
Source identity checks normalize known UTF-8 CRLF text to LF. Log, raw-commit
and archive hashes identify exact bytes.

The original native qualification report is retained unchanged with SHA-256
`cbb6921294a97a065d4264fd7383ab73174fc50814f40bc75964b6d4861436ba`.
The focused native original is
`68b6e21b6526d0f7079d83abc3bd8b8e8f0f286990f22bffbb6574a70509fb4f`.
The final GREEN files remain in the task-owned Windows stash
`4a2cf7cc1f0a15d6ae9ea1d6ee5224c1fbb609ea`. Original primary files and protected
checkouts matched before/after observations. Scratch imported the exact native
`git cat-file` commit bytes after API-only reconstruction omitted the original
timezone; no mismatching object or user state was accepted.

Hosted push jobs used the candidate directly. PR jobs used synthetic merge
`0536b2cba8ab0a7f3ac031fc1a3ae32565683b83`, whose tree was independently verified
identical. The final hosted observation was 15:11:13.075 UTC; the last job ended
15:09:37 UTC. The parent package report prints eight aliases and ten configuration
scenarios but omits the child's new directory summary. The separate native and
fresh probes retain the explicit six-group JSON; hosted success is not relabeled
as an independently printed six-group count.

## Current connection recheck

The [earlier connection receipt](2026-11-02-directory-connection-recheck.json)
remains an immutable record of the subagent's missing originating browser context
and interrupted read-only batch. The later
[primary-session follow-up](2026-11-02-directory-connection-followup.json)
successfully verified the requested Brave connection and authenticated staging
dashboard. At approximately 15:20 UTC it showed one online read-only owner,
zero client authorizations, zero active requests and build
`b90432a1bc138d59305692a9f74f110a475d0881`.

Fresh Cloudflare management reads at 15:17:16.961 UTC confirmed Worker version
`af4fd06e-c4a3-4545-ad22-31d0ae956215` receives 100% of the latest deployment.
The dashboard Access-policy read at 15:17:58.821 UTC confirmed one allow policy
with one email include matching the expected owner. Identity values are omitted
from the receipt. This is fresh management evidence; no deployment or Access
policy was changed.

MTerm plugin search returned no match. Eligible personal-plugin listing completed
with three entries, none named or described as MTerm, and no further cursor.
An initial invalid limit argument was corrected for this read only. Neither
listing proves absence in every scope nor repair of the historical non-retryable
deleted-release error. No MTerm tool is currently exposed in this session.
The denied ChatGPT host and failed plugin creation were not retried or bypassed.

Actual client consent, discovery, selected-device read, outside-root denial and
client lifecycle acceptance remain unperformed. The existing local owner status
at 15:09:56.742 UTC was paired, online, read-only, autostart false, PID 38384,
with zero active requests and a fresh heartbeat; `networkChecked:false` keeps
that observation separate from the later authenticated dashboard.

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
