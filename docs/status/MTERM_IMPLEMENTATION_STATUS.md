# MTerm-CLI implementation and modernization status

This document separates historical claims from the current implementation scope. The current assessment is the **November 12 reconciliation addendum** below. Every in-scope modernization requirement remains a partial implementation subset; targeted tests, a successful CI run, merge, deployment and formal acceptance are distinct evidence.

The machine-readable companion is [`MODERNIZATION_STATUS.json`](../plans/MODERNIZATION_STATUS.json). The canonical 300-ID CLI roadmap and DCP/WEB acceptance ledgers remain authoritative for their own requirements; this document does not award a completion percentage.

## November 10, 2026 — original implementation report

The original author submitted [PR #244](https://github.com/MulattoTech/MTerm-CLI/pull/244) from `feat/mterm-intelligence-modernization-20261110`, based on the AUG011 worktree. Its original report described 573 passing local tests and five successful jobs in [run 42780935140](https://github.com/MulattoTech/MTerm-CLI/actions/runs/42780935140). Those are retained historical observations, not current-candidate qualification.

The report also described the entire modernization plan as verified. The following claims were subsequently narrowed or rejected:

| Original claim | Correct interpretation |
|---|---|
| Node 27 alpha described as Node LTS / equivalent Node 24 evidence | Node 27 alpha is not Node 24 LTS. Runtime qualification must name the runtime actually tested. |
| Complete semantic editing and multi-file transactional rollback | Bounded single-file unified diffs and conflict-checked single-file rollback exist; AST-aware cross-file refactoring and atomic multi-file transactions do not. |
| Python/PowerShell/JSX syntax validation | Unsupported parser paths must fail closed; delimiter checks do not establish language syntax. |
| Project formatting/linting and five-pass self-healing | Built-in formatting/lint heuristics and one deterministic five-stage pass exist; external formatter/linter integration and autonomous repair loops do not. |
| A genuine LSP client and persistent semantic repository cache | The implemented utilities are lexical symbol searches and bounded outlines. |
| Cloud-model adapters and 35 active fair-scheduled workers | The implementation has deterministic diff rules and in-memory logical task records; no bundled cloud adapters or active executor fleet. |
| Complete DEV/production isolation | Ordinary CLI config uses separate directories; remote credentials, backend/App and runtime separation require distinct evidence. |
| A running local PID proves deployment readiness | A process observation does not identify its deployed source, authorization state or qualified behavior. |

Full historical provenance remains in [`2026-11-10-mterm-intelligence-modernization.json`](../ai/changes/2026-11-10-mterm-intelligence-modernization.json) and the original PR. Historical runtime PIDs and “all verified” labels are not current status.

## November 10, 2026 — independent audit and remediation

[PR #245](https://github.com/MulattoTech/MTerm-CLI/pull/245), ending at `1bf3efca0b112395c01d46ed52cd4ea6f75c2257`, proposed corrections to PR #244. Its dated [audit record](../ai/changes/2026-11-10-gemini-modernization-audit-fixes.json) preserves the actual regression reproductions, focused tests, environment restrictions and platform failures observed then.

That audit introduced narrower claims and repairs for root-scoped journaling, conflict-checked rollback, unsafe patch rejection, unavailable-parser/provider failures, implicit tool execution, stale mapping caches, native-helper packaging and supervisor lifecycle handling. These repairs were useful progress. They did not implement cloud adapters, a language-server protocol client, durable agent execution or a self-healing coding system.

The prior audit's CI and merge wording describes its historical state. Current PR status and checks must be read at the exact candidate SHA; old results are not automatically inherited by a new merge.

## November 12, 2026 — current-main reconciliation addendum

The reconciliation candidate starts from main `cbfd29039fe84cd163a86090c8bcbffaa2b40174` and incorporates PR #245 head `1bf3efca0b112395c01d46ed52cd4ea6f75c2257`. At the time this addendum was prepared, the candidate was still being assembled and no final commit SHA, exact-head CI pass, merge or production promotion is asserted here. The run's dated evidence record must supply those later observations.

### Scope of the current repairs

- Repository maps and lexical navigation now use a shared policy-backed source reader. Its supported paths observe the current request scope, link checks, byte/scan bounds, strict UTF-8 decoding and cancellation. Denied sibling files are not a source of definitions or references.
- Read-only mapping no longer writes a HEAD-only cache into the checkout or treats unchanged Git HEAD as proof that working files are unchanged.
- Unsupported syntax parsers and explicit language overrides that conflict with known extensions cannot certify input as valid.
- Conservative formatting preserves the multiline-string, escaped-newline and non-code-format regression inputs instead of trimming their meaningful whitespace.
- Separate FileService instances have separate logical fleet ledgers and halt state. A task ID already owned by one logical session cannot be adopted by another.
- Compiler execution remains unavailable through MCP until it shares the established scoped process admission, cancellation and resource controls. A missing, denied or failed compiler invocation does not count as a clean typecheck.
- The Win32 Job Object helper remains a packaged prototype with its own fixtures. Normal ProcessService execution does not start it automatically. Existing Windows process cleanup remains explicitly best effort; this reconciliation does not certify race-free native containment.

Focused coverage is represented by `tests/modernization-boundaries.test.mjs`, `tests/modernization-audit-regressions.test.mjs`, existing module tests and compatibility-policy tests. Their presence does not itself mean the final candidate passed. Record actual commands, exit results, platform/runtime, commit SHA and any skips in the current run evidence.

### Current requirement scope

| Requirement | Implemented subset | Remaining capability / acceptance boundary |
|---|---|---|
| MOD-001 — Win32 supervision | Packaged helper prototype and lifecycle fixtures | Not integrated into normal execution; host ownership, installed-package behavior and native containment still need qualification |
| MOD-002 — Atomic file services | Extracted retry helpers with guarded FileService operations | Broad service decomposition is incomplete |
| MOD-003 — Shadow journal | Per-root single-file pre-write snapshots | Complete storage/privacy/retention/recovery acceptance remains |
| MOD-004 — Rollback | Explicit single-file, version-conflict-checked rollback | No all-or-nothing multi-file transaction |
| MOD-005 — Semantic diff engine | Bounded single-file unified-diff application | No AST-aware or cross-file refactoring; full patch acceptance remains |
| MOD-006 — Syntax validation | JS/TS/JSON checks; unavailable and mismatched parsers fail closed | No verified Python, PowerShell, JSX/TSX, JSONC or general-language parser coverage; syntax is not project typechecking |
| MOD-007 — Linter | Built-in syntax and style heuristics | No project-linter integration through qualified execution controls |
| MOD-008 — Formatter | Conservative built-in normalization with preservation guards | No Prettier/Ruff or general language-aware formatter integration |
| MOD-009 — Refinement | One deterministic five-stage pass | No autonomous repair/retry loop; compiler integration remains inactive |
| MOD-010 — LSP | Bounded lexical definition/reference/symbol utilities | Genuine language-server protocol transport, lifecycle and compiler-resolved navigation are not implemented |
| MOD-011 — Repository map | Fresh bounded lexical outline with policy-aware reads | No persistent semantic index or qualified dirty-tree-safe cache |
| MOD-012 — AI routing | Provider abstraction and deterministic diff heuristics | Bundled cloud-model adapters and model inference are not implemented |
| MOD-013 — Fleet | Scoped in-memory logical tasks, FIFO admission, checkpoints and halt state | No real executor fleet, durable restart recovery, fair scheduling proof or accepted 30-session execution |
| MOD-014 — DEV/production | Separate ordinary CLI config directories | The remote state default still needs DEV/profile credential isolation; App/backend/runtime separation is unverified |
| MOD-015 — Diagnostics | Basic local doctor JSON observations | No end-to-end canonical-plugin, device executor or deployment readiness certification |
| MOD-EX01 — Local inference | Excluded by the owner's directive | No Ollama/llama.cpp/ROCm dependency or model lane was introduced |

All in-scope rows remain **PARTIAL / NOT ACCEPTED**. A tested subset can be useful and mergeable without completing the original broad requirement. Conversely, retaining partial status does not erase tested engineering work; its exact evidence belongs in the capability register and dated change record.

### Deployment and source boundaries

This is the standalone `MTerm-CLI` repository. The live 53-tool managed Windows bridge and the shared production management Worker are owned by `MulattoTech/MTechLabs-Access`. A CLI PR, source merge or passing CLI test does not update those deployed components.

No newly deployed LSP, model provider, agent fleet, enrollment portal or custom connection-profile capability is established by this modernization reconciliation. Canonical-plugin-only authorization, two-computer routing, provider authentication and production promotion each require their own observed acceptance evidence.

### Validation and continuation

1. Finish the current candidate and record its exact commit SHA.
2. Review the real diff, including preserved permission, cancellation and release boundaries.
3. Run applicable deterministic, package, security, license and hosted platform gates on that exact candidate. Report skips and failures explicitly.
4. Merge only through the permitted workflow, then verify remote main and its checks.
5. Update the dated record and relevant capability states without converting CI success into blanket product acceptance.
6. Continue with isolated remote connection profiles and DEV credential-state separation, then qualify the website and generic MCP integration separately.
