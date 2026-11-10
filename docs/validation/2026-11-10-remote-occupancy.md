# Authenticated device registry occupancy — 2026-11-10

Issue [241](https://github.com/MulattoTech/MTerm-CLI/issues/241) adds a current
admission diagnostic to the authenticated dashboard. It is a bounded child of
#149/AUG-066, linked to #63/WEB-010 and presentation #60/WEB-007. The exact CLI
requirement is CLI-286. Existing WEB-005 identity isolation and WEB-009 relay
semantics remain required. Standing owner authorization covers this work; source
review, actual gates and requirement acceptance remain distinct.

## Current checkpoint

The original-source baseline is **valid new-capability RED**. The minimal implementation
at `926fa216147b1fcbe8dadc941947653780639ab4` then passed the single focused source run:
**152/152 PASS**, with no skipped, cancelled or TODO cases. Root independently verified
the captured source result, and independent post-run review passed200 checks. Normal
integration gates and candidate/actual-main qualification remain separate.

Qualified base is `f16abfa86878c24f1310d5261ad9b6bae3a43f6d`, tree
`62c4e18d26580a15f0f5a65e7e154356bf0831a8`. The fixture-only checkpoint is
`c0abead12c28208d2ff829cea9f770c71dae3223`, tree
`928b5ce7848a762fa383b78c0c9a4f4c082bec2a`. All873 original base blobs were compared
with their working bytes before that first run. The fixture used by the original baseline and focused source runs is exactly
SHA-256 `66e6371a83b993d9c1bd13a2a4a27fa1a9031eeba4fbd1f1cc313c0c945c1596`.

## Behavior and preserved boundaries

Each returned dashboard device gains `registryAdmission` with integer `limit`,
`queued`, `delivered`, `completedAwaitingConsumption`, `occupied` and `remaining`.
The existing four-slot limit now uses one constant shared with the unchanged enqueue comparison.
Counters include only queued, delivered and complete records belonging to the
authenticated owner and the returned device IDs. They aggregate the owner's grants.
Occupied is the sum of the three states and is not clamped; remaining is
`Math.max(0, limit - occupied)`.

Counters and sessions use the same existing `rows('job:', 256)` snapshot. Grouping
adds no storage scan or per-device await. The original sessions owner/status predicate
and five-field projection remain exact, including its treatment of an owned orphan
session in the deliberately injected fault case. Shared `cleanDevice` and public MCP
device inventory remain unchanged.

Cards use existing text nodes to show occupied/limit, remaining device slots and the
three state counts. They explain that delivered work does not prove execution and
that other limits, authorization and device availability still apply. Completed
results continue occupying admission until existing consumption, revocation or
retention handling changes that state. Agent `availableSlots` is not persistent
execution telemetry. The separate global200 retained-record cap still applies.

Existing deadline, expiry, alarm, cancellation, result ownership and replay semantics
are preserved. A deadline by itself does not change a job's status during a read.
Existing `rows()` cleanup may remove expired records, and registry dispatch may
initialize an absent alarm. Its live-row limit does not bound total traversal through
arbitrarily many expired rows.

## Actual first baseline

The frozen fixture ran once from 2026-11-10T01:24:50.237035Z through
01:24:51.408143Z under Node24.22.1. Actual results were14 tests:2 passed and12 failed,
with no skipped, cancelled or TODO cases. Node exited1, the capture driver exited0,
and the outer tool shell exited0; all three observations are separately retained.
Both stderr files are empty. Capture was complete, with no timeout, truncation,
interrupt, signal request or capture failure. All62 original, frozen-copy, run-copy
and after-run input bindings matched.

OCC-03 independently passed the existing full-device refusal, exact single-use result
consumption and replacement admission controls. OCC-13 independently passed public MCP
tool inventory and legacy device-field controls. The twelve feature groups completed
their setup, transitions and observations before failing at the absent
`registryAdmission` field. Root verified these causal assertions against the raw TAP.

Twenty-six typed records preserve292 actual in-process responses and291 matching HTTP
status controls. All14 groups settled their owned requests and restored the original
Date.now function. The four-complete state and empty sessions were actually observed.
OCC-12's actual public refresh settled and produced three DOM cards with24 false
new-text observations. Its later UI assertions were **NOT_REACHED**, because the
missing API-field assertion failed first. OCC-14's six injected storage rows are
labeled fault inputs, not actual admission or evidence of production corruption.

Original local records, now preserved in the durable source appendix:

| Record | SHA-256 |
| --- | --- |
| First execution freeze | `7b892be79307e99596518666af36dfe84040e2bd454d8af5217e1822e55bd58f` |
| Baseline receipt | `3112143079e07ed81e888927737ddaf7b2638fdf4dd55ba32a04113d615dba22` |
| Raw baseline stdout,220986 bytes | `a210d28b7592180a280f06c9ea293081728aebf3c1e7e473bb43d1511fc02b4f` |
| Actual driver exit record | `54d360f3e9b8ec6e4c28c6783b3ada806a44608b8a2ff443708252bb64f9055a` |
| Actual outer tool shell response | `6405ce33e80dd799a668b6d32259492f5860ea6a2a5eaf0bf3bfcc17fd55266e` |
| Decoded26 diagnostic records | `c337b35dfffd24d73b30e8d649a8bd9ca9817f8085d8b525faa626acefe5c4e7` |
| Independent pre-run review | `22e29fcd092ab2807e786292733b55affe09767124b436a97492cba14ba4eb69` |
| Root baseline classification and implementation clearance | `eba30d2dbb4e9c272b88e4e62ecdc98d4d7b5e6f928707445fa4d15a61d16c38` |

Worker files are under `artifacts/issue-241-preparation`,
`artifacts/issue-241-baseline-v1`, `artifacts/issue-241-baseline-driver-v1` and
`artifacts/issue-241-baseline-interpretation-v1`. Root independently retains its
pre-run and baseline review records. The first observation has not been replayed or
replaced. Static formatting/syntax preparation is not product execution.

## Actual focused source result

At01:44:39.790535–01:44:47.117494UTC on2026-11-10, the exact reviewed source freeze
ran once at worker926fa216/tree11e2de91. All152 source-derived definitions passed:
occupancy14, remote-gateway48, remote-admission8, gateway-access-expiry22 and
remote-pairing-expiry60. The actual title multiset matches the frozen definitions.
The new occupancy fixture and every old fixture remained unchanged.

Node, capture driver and outer tool shell each exited0, with their distinct observations
retained immediately. Complete output is241623 bytes of stdout and zero stderr, with
no timeout, truncation, capture fault, interruption or termination request. All75
selected inputs match their immutable copies, run copies and captured after-bindings;
Node identity is unchanged. The twelve feature assertion phases reached PASS and both
independent existing controls passed. All14 groups settled owned requests and restored
the clock. The26 diagnostics retain292 response events and291 matching status controls.
OCC-12's actual script refresh reached its UI assertions and passed all24 new text
matches on three cards, with no unsafe HTML assignment and literal name text.

| Focused record | SHA-256 |
| --- | --- |
| Execution freeze | `e8362f506cc497963e6f6141e820c2c5905ceec379532e8db082551eb80a2d3c` |
| Independent source/pre-run review | `3fe77786b91a3932e084e59ab90e350494ad37160a81706c9775e1dc8c0c89cd` |
| Root one-run clearance | `2ed0af7c99b5af6f13bd00bcec0f610689e64118e4425ff404d6ea64e83b1c44` |
| Actual capture receipt | `24b5678c20d95c9d4e466602987cb873bc37dd20dc1aca562233088c2b825742` |
| Raw stdout | `31744233bece5be706820b661c881f0ade0c0a2e316c2cd63219732bc3846855` |
| Actual outer tool shell result | `dbf17b8db7550cb06d83b87c3f36c69be77609453189d82f3ab822cb2ff6a471` |
| Root source classification | `5687eb3ccadc8fd1320aa2160d3f0e2e37b2d15189a73fe72cd993ac7e862a94` |

The original baseline, all raw captures and their immutable input copies remain
separately retained. Worker926fa216's original validation/AI records describe its
pre-execution checkpoint; root's subsequent integration updates record the actual
focused result. No second baseline or replacement source execution was performed.

## Durable source evidence

The [source index](2026-11-10-remote-occupancy-source-evidence.json),
[readable appendix](2026-11-10-remote-occupancy-source-evidence.md) and
[lossless full archive](2026-11-10-remote-occupancy-source-evidence-full.json.gz)
preserve307 exact original payloads and649 references. The independent bundle review
passed4453 byte/identity/phase checks and resolved the unexecuted v2 summary wording
before the actual v3 assembly. The three prior issue239 delivery files are binding-only.
Baseline missing counters and NOT_REACHED phases remain historical; focused source
counter and UI passes remain explicit. Assembly and bundle review execute no product.

The original captures, immutable62/75 input maps/copies, source/peer/root observations,
preparation findings,12 internal MIT imports and upstream notices are conserved.
Root embeds the independent bundle review in the dated AI record. Runtime executable
identities are bound, while the host OS/shared-library closure is not archived.
Normal build and later hosted outcomes remain separate from this source seal.

## Normal formatting finding and exact phase mapping

The first normal sequence passed explicit roadmap review/render/check, build and
typecheck, then exited1 at formatting. Prettier identified only one property-chain
wrap/indent in the new fixture; the seventh whitespace command was NOT_RUN. Complete
six-command output and the actual driver/outer exit1 remain in the
[format-correction record](2026-11-10-remote-occupancy-format-correction.json).

The reviewed correction changes only22 whitespace bytes. Independent Acorn analysis
confirmed the same8057 syntax nodes/comments after excluding source positions, plus
788 identical literal/template/comment slices and all non-whitespace bytes. Assertions,
control flow, diagnostics and cleanup remain unchanged. No additional local product
run was indicated or performed for that transformation. All54 compiled outputs still
match the pre-build and tested-worker bytes.

The original baseline14/focused152 executions retain fixture SHA-256
`66e6371a83b993d9c1bd13a2a4a27fa1a9031eeba4fbd1f1cc313c0c945c1596`.
Subsequent normal and hosted inputs use formatted fixture
`51612dd8ebfe90d2b2e70d9291da6dd603ce8d50bd066fcecf1b248210d846b0`.
The worker, original captures and three canonical source-evidence files are unchanged.
The corrected normal sequence is recorded below; actual final-fixture hosted results remain next.

## Corrected normal qualification

At02:18:57.583000–02:19:03.804534UTC, source checkpoint
`77c083a6e2603ecc1fc158c82adae60257c446f0` passed all seven reviewed normal commands:
explicit roadmap review, render, check, normal build/parity, typecheck, formatting and
whitespace. Complete14 raw streams and distinct actual driver/outer exit0 are retained
in the dated AI record. The first normal formatting failure is unchanged.

The successful receipt is SHA-256
`60011ac85db6c189026df5c1d5565379a8d53876e2184398f647dadc4d120228`;
root's raw-output/runtime qualification is
`1795df9cd772339d9460ee3c72434a2f80fc10ea06f7b60030ebfc6d54a69a0f`.
All54 compiled files and the two production modules still equal the tested worker.
Of2119 corresponding source/runtime/dependency paths,2118 are byte-identical; the
sole difference is the reviewed fixture format mapping. All186 reviewed source
entries match fingerprint
`eb679d84a8594ade852caf8da05636913b89eba4e2ee7ad52bb6b271c4eb11a5`.
File correspondence does not claim every bound file executed. Known npm environment
warnings remain in the output. No additional local product run was performed.

## Next qualification and limits

Independent post-run audit passed200 checks; the separate immutable diagnostic reader
also cleared the actual26 records without changing its baseline-tested parser. No
additional product run was indicated or performed. Root's normal reviewed build,
catalog/typecheck/format/parity gates subsequently passed as recorded above. TypeScript
and compiled output remain unchanged. Root owns final exact-tree review and publication;
all six candidate jobs and six separate actual-main jobs remain required.

This uses actual gateway/registry code with synthetic signed identities,
OAuth consent/PKCE, pairing and public dashboard/agent/management routes. Internal
enqueue and result-consumption controls are honestly labeled: public MCP tool calls
consume results while polling. Storage is serialized in memory. The served script
runs in a minimal DOM adapter. These fixtures do not establish real Workers storage,
concurrency/recovery, browser/accessibility, native device or installed-gateway
acceptance. Existing package verification separately binds source gateway bytes with
an installed agent and retains `gatewayInstalled: false`.

No full CLI/AUG/WEB/DCP acceptance, protected-stage change, fairness/priority scheduler,
load/soak claim, provider action, connected Windows change, deployment or model request
is included. Issue232's operational HOLD and all protected roadmap values remain
unchanged. The source bundle and corrected normal sequence are clear. The next unverified
actions are final exact-tree review and candidate/actual-main hosted qualification.
