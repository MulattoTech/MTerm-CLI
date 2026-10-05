# Every MTerm CLI feature

All original requirement IDs/acceptance text are retained. Stage credit is explicit review, not lines of code or test count.

## CLI-001 — Identify the authorized workstation

![85% validated](bars/cli-001.svg)

**Objective / acceptance:** Match the discovered device to the intended MTerm host before any mutation.

**Current scope:** Authorized host and root reverified; GUI and archived legacy untouched. Product work published on PR52, hosted gate blocked.

**Baseline weight:** 8 h (rough). **Remaining:** 1–2 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `docs/plans/2026-10-04-local-mcp.md`, `docs/validation/2026-10-05-codex-parity-foundation.md`

## CLI-002 — Verify local source write access

![85% validated](bars/cli-002.svg)

**Objective / acceptance:** A new ignored file survives create, read-back, rename and second read-back.

**Current scope:** Host/current state verified and interrupted source preserved. GitHub publication remains blocked; source metadata only, not product completion.

**Baseline weight:** 8 h (rough). **Remaining:** 1–2 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `docs/plans/2026-10-04-local-mcp.md`

## CLI-003 — Separate GitHub capabilities

![85% validated](bars/cli-003.svg)

**Objective / acceptance:** Record branch/content/workflow writes, CI, merges and tags as separately verified or untested.

**Current scope:** RDC write/rename, GitHub content/workflow writes, normal pushes and PR creation reverified. Actual hosted jobs are blocked by account billing/spending limits; merge/tag unperformed.

**Baseline weight:** 8 h (rough). **Remaining:** 1–6 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `docs/plans/2026-10-04-local-mcp.md`, `docs/validation/2026-10-05-codex-parity-foundation.md`

## CLI-004 — Check current repository identity

![65% integrated](bars/cli-004.svg)

**Objective / acceptance:** Confirm the exact owner/repository, default branch and local remote URL.

**Current scope:** Separate GitHub capability probe recorded. Reads/branch creation worked; content-write safety denial prevents current publication.

**Baseline weight:** 8 h (rough). **Remaining:** 1–6 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `docs/plans/2026-10-04-local-mcp.md`

## CLI-005 — Inventory dirty and untracked work

![85% validated](bars/cli-005.svg)

**Objective / acceptance:** Every pre-existing staged, unstaged or untracked item is preserved or explicitly classified.

**Current scope:** Host/current state verified and interrupted source preserved. GitHub publication remains blocked; source metadata only, not product completion.

**Baseline weight:** 8 h (rough). **Remaining:** 1–2 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `docs/plans/2026-10-04-local-mcp.md`

## CLI-006 — Inventory published heads and open PRs

![65% integrated](bars/cli-006.svg)

**Objective / acceptance:** Record current hashes and distinguish unique work from integrated ancestry.

**Current scope:** Separate GitHub capability probe recorded. Reads/branch creation worked; content-write safety denial prevents current publication.

**Baseline weight:** 8 h (rough). **Remaining:** 1–6 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `docs/plans/2026-10-04-local-mcp.md`

## CLI-007 — Exclude access probes from product merges

![65% integrated](bars/cli-007.svg)

**Objective / acceptance:** The access-check branch and disabled permission-test workflow do not enter product history.

**Current scope:** Separate GitHub capability probe recorded. Reads/branch creation worked; content-write safety denial prevents current publication.

**Baseline weight:** 8 h (rough). **Remaining:** 1–6 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `docs/plans/2026-10-04-local-mcp.md`

## CLI-008 — Preserve local recovery-only branches

![85% validated](bars/cli-008.svg)

**Objective / acceptance:** Local CI/history archives remain recoverable without installing unauthorized content.

**Current scope:** Host/current state verified and interrupted source preserved. GitHub publication remains blocked; source metadata only, not product completion.

**Baseline weight:** 8 h (rough). **Remaining:** 1–2 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `docs/plans/2026-10-04-local-mcp.md`

## CLI-009 — Create a pre-change source checkpoint

![85% validated](bars/cli-009.svg)

**Objective / acceptance:** Verify the source manifest and Git bundle, with sensitive/ignored exclusions documented.

**Current scope:** Host/current state verified and interrupted source preserved. GitHub publication remains blocked; source metadata only, not product completion.

**Baseline weight:** 8 h (rough). **Remaining:** 1–2 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `docs/plans/2026-10-04-local-mcp.md`

## CLI-010 — Resolve content conflicts deliberately

![65% integrated](bars/cli-010.svg)

**Objective / acceptance:** Each true conflict receives a reviewed resolution, not a whole-tree local/remote overwrite.

**Current scope:** Separate GitHub capability probe recorded. Reads/branch creation worked; content-write safety denial prevents current publication.

**Baseline weight:** 8 h (rough). **Remaining:** 1–6 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `docs/plans/2026-10-04-local-mcp.md`

## CLI-011 — Establish a verified publication baseline

![65% integrated](bars/cli-011.svg)

**Objective / acceptance:** Remote main and the local integration baseline have recorded, reconciled hashes/trees.

**Current scope:** Separate GitHub capability probe recorded. Reads/branch creation worked; content-write safety denial prevents current publication.

**Baseline weight:** 8 h (rough). **Remaining:** 1–6 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `docs/plans/2026-10-04-local-mcp.md`

## CLI-012 — Record recovery and outstanding process state

![85% validated](bars/cli-012.svg)

**Objective / acceptance:** A later session can identify the first unverified action without replaying completed mutations.

**Current scope:** Host/current state verified and interrupted source preserved. GitHub publication remains blocked; source metadata only, not product completion.

**Baseline weight:** 8 h (rough). **Remaining:** 1–2 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `docs/plans/2026-10-04-local-mcp.md`

## CLI-013 — Create the legacy-to-GUI export map

![0% not_started](bars/cli-013.svg)

**Objective / acceptance:** The map accounts for every GUI source, configuration, test and documentation path exported from legacy MTerm to MTerm-GUI.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 8 h (rough). **Remaining:** 4–16 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-014 — Preserve legacy GUI Git history

![0% not_started](bars/cli-014.svg)

**Objective / acceptance:** The legacy GUI commit graph and required product refs remain recoverable in MTerm-GUI or the verified pre-split bundle.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 8 h (rough). **Remaining:** 4–16 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-015 — Preserve GUI automation in MTerm-GUI root

![0% not_started](bars/cli-015.svg)

**Objective / acceptance:** GUI workflows live under MTerm-GUI/.github/workflows; CLI workflows live independently under MTerm-CLI/.github/workflows.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 8 h (rough). **Remaining:** 4–16 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-016 — Preserve GUI contributor entry points and add CLI equivalents

![0% not_started](bars/cli-016.svg)

**Objective / acceptance:** Each repository's root instructions route work to that product and cross-link the sibling repository without duplicated mutable rules.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 8 h (rough). **Remaining:** 4–16 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-017 — Export native GUI source to MTerm-GUI

![0% not_started](bars/cli-017.svg)

**Objective / acceptance:** The same native features remain buildable from MTerm-GUI/native after repository export.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 8 h (rough). **Remaining:** 4–16 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-018 — Preserve the Electron reference in MTerm-GUI

![0% not_started](bars/cli-018.svg)

**Objective / acceptance:** The reference source, tests and dependency lock remain runnable in MTerm-GUI.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 8 h (rough). **Remaining:** 4–16 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-019 — Isolate CLI from GUI package dependencies

![0% not_started](bars/cli-019.svg)

**Objective / acceptance:** MTerm-CLI installation does not transitively install packages from MTerm-GUI or Electron/Qt.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 8 h (rough). **Remaining:** 4–16 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-020 — Verify native CMake paths in the MTerm-GUI checkout

![0% not_started](bars/cli-020.svg)

**Objective / acceptance:** Fresh configure/build succeeds without depending on the old source/build directory.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 8 h (rough). **Remaining:** 4–16 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-021 — Verify PowerShell and GUI launchers in MTerm-GUI

![0% not_started](bars/cli-021.svg)

**Objective / acceptance:** Native build/package/start commands resolve the new product root correctly.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 8 h (rough). **Remaining:** 4–16 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-022 — Verify GUI-reference test and fixture paths after export

![0% not_started](bars/cli-022.svg)

**Objective / acceptance:** Reference tests execute against the relocated source, not stale previous builds.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 8 h (rough). **Remaining:** 4–16 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-023 — Preserve GUI roadmap identity and scope

![0% not_started](bars/cli-023.svg)

**Objective / acceptance:** IDs, baseline weights and requirement text survive migration without artificial credit.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 8 h (rough). **Remaining:** 4–16 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-024 — Correct GUI evidence references

![0% not_started](bars/cli-024.svg)

**Objective / acceptance:** Every live evidence path resolves after relocation; historical provenance stays attributable.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 8 h (rough). **Remaining:** 4–16 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-025 — Verify GUI source-fingerprint coverage in MTerm-GUI

![0% not_started](bars/cli-025.svg)

**Objective / acceptance:** Changing MTerm-GUI/native or its GUI reference source demonstrably invalidates an unreviewed GUI metric snapshot.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 8 h (rough). **Remaining:** 4–16 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-026 — Preserve checkpoints and ignored user state

![0% not_started](bars/cli-026.svg)

**Objective / acceptance:** No auth, profile, old checkout, artifact or active toolchain is swept into a bulk move.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 8 h (rough). **Remaining:** 4–16 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-027 — Recreate path-sensitive caches safely

![0% not_started](bars/cli-027.svg)

**Objective / acceptance:** New CMake/Python/Node development state is tested while old recoverable state is retained.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 8 h (rough). **Remaining:** 4–16 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-028 — Keep compatible desktop launching

![0% not_started](bars/cli-028.svg)

**Objective / acceptance:** A documented old entry point forwards correctly or has a clearly tested replacement.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 8 h (rough). **Remaining:** 4–16 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-029 — Verify unchanged GUI behavior

![0% not_started](bars/cli-029.svg)

**Objective / acceptance:** Native/reference gates run; relocation-only edits do not redesign GUI business behavior.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 8 h (rough). **Remaining:** 4–16 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-030 — Keep GUI business work independent after export

![0% not_started](bars/cli-030.svg)

**Objective / acceptance:** Later CLI commits contain no unrelated GUI changes; necessary path fixes are separately justified.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 8 h (rough). **Remaining:** 4–16 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-031 — Inspect all three actual upstream projects

![10% planned](bars/cli-031.svg)

**Objective / acceptance:** Read manifests, source entry points, auth, lifecycle and licensing at recorded commits.

**Current scope:** Architecture and conflicts retained. Node24 LTS and official SDK pinned for local host; three-upstream bundle compatibility is not established.

**Baseline weight:** 8 h (rough). **Remaining:** 4–14 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `docs/plans/2026-10-04-local-mcp.md`

## CLI-032 — Document the native Codex boundary

![10% planned](bars/cli-032.svg)

**Objective / acceptance:** The adapter invokes Codex as a native binary rather than assuming JavaScript internals.

**Current scope:** Architecture and conflicts retained. Node24 LTS and official SDK pinned for local host; three-upstream bundle compatibility is not established.

**Baseline weight:** 8 h (rough). **Remaining:** 4–14 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `docs/plans/2026-10-04-local-mcp.md`

## CLI-033 — Select a supported Node LTS for MTerm glue

![10% planned](bars/cli-033.svg)

**Objective / acceptance:** Verify lifecycle support and pin/test the selected Node line and patch policy.

**Current scope:** Architecture and conflicts retained. Node24 LTS and official SDK pinned for local host; three-upstream bundle compatibility is not established.

**Baseline weight:** 8 h (rough). **Remaining:** 4–14 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `docs/plans/2026-10-04-local-mcp.md`

## CLI-034 — Determine the Web runtime dependency set

![10% planned](bars/cli-034.svg)

**Objective / acceptance:** Identify Bun, Electron/browser and bridge/helper requirements from the selected upstream pin.

**Current scope:** Architecture and conflicts retained. Node24 LTS and official SDK pinned for local host; three-upstream bundle compatibility is not established.

**Baseline weight:** 8 h (rough). **Remaining:** 4–14 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `docs/plans/2026-10-04-local-mcp.md`

## CLI-035 — Resolve the no-daemon constraint

![10% planned](bars/cli-035.svg)

**Objective / acceptance:** Prove compliant operation or record the exact session-helper/persistent-service deviation for approval.

**Current scope:** Architecture and conflicts retained. Node24 LTS and official SDK pinned for local host; three-upstream bundle compatibility is not established.

**Baseline weight:** 8 h (rough). **Remaining:** 4–14 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `docs/plans/2026-10-04-local-mcp.md`

## CLI-036 — Resolve the no-GUI constraint

![10% planned](bars/cli-036.svg)

**Objective / acceptance:** Do not ship a desktop launcher inside the purported pure CLI without an explicit approved exception.

**Current scope:** Architecture and conflicts retained. Node24 LTS and official SDK pinned for local host; three-upstream bundle compatibility is not established.

**Baseline weight:** 8 h (rough). **Remaining:** 4–14 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `docs/plans/2026-10-04-local-mcp.md`

## CLI-037 — Resolve the single-runtime constraint

![10% planned](bars/cli-037.svg)

**Objective / acceptance:** Report extra upstream runtimes separately; a compiled helper is not mislabeled pure Node.

**Current scope:** Architecture and conflicts retained. Node24 LTS and official SDK pinned for local host; three-upstream bundle compatibility is not established.

**Baseline weight:** 8 h (rough). **Remaining:** 4–14 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `docs/plans/2026-10-04-local-mcp.md`

## CLI-038 — Resolve the under-50-MB constraint

![10% planned](bars/cli-038.svg)

**Objective / acceptance:** Measure all required installed payloads and leave the requirement blocked if they exceed the budget.

**Current scope:** Architecture and conflicts retained. Node24 LTS and official SDK pinned for local host; three-upstream bundle compatibility is not established.

**Baseline weight:** 8 h (rough). **Remaining:** 4–14 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** Complete mandatory Codex/Web/status installed footprint and compatible pins are unverified..

**Evidence:** `docs/plans/2026-10-04-local-mcp.md`

## CLI-039 — Keep the three-integration scope visible

![10% planned](bars/cli-039.svg)

**Objective / acceptance:** Core-only progress never silently excludes the desired Web integration from completion accounting.

**Current scope:** Architecture and conflicts retained. Node24 LTS and official SDK pinned for local host; three-upstream bundle compatibility is not established.

**Baseline weight:** 8 h (rough). **Remaining:** 4–14 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `docs/plans/2026-10-04-local-mcp.md`

## CLI-040 — Record module and lifecycle ownership

![10% planned](bars/cli-040.svg)

**Objective / acceptance:** Each adapter has a narrow contract, owner, cancellation policy and bounded resources.

**Current scope:** Architecture and conflicts retained. Node24 LTS and official SDK pinned for local host; three-upstream bundle compatibility is not established.

**Baseline weight:** 8 h (rough). **Remaining:** 4–14 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `docs/plans/2026-10-04-local-mcp.md`

## CLI-041 — Provide an executable mterm-cli entry point

![85% validated](bars/cli-041.svg)

**Objective / acceptance:** The installed/link-created command invokes the real CLI from outside the checkout.

**Current scope:** Real production tarball install, official-client MCP file round trip outside checkout, isolated-prefix npm link and actual Windows shim passed. No user-global prefix mutation; other platforms and full three-component bundle remain unverified.

**Baseline weight:** 8 h (rough). **Remaining:** 1–2 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `scripts/verify-package.mjs`, `tests/cli.test.mjs`

## CLI-042 — Make help work offline

![85% validated](bars/cli-042.svg)

**Objective / acceptance:** Help succeeds without credentials, dependencies installed, network or model calls.

**Current scope:** Offline command behavior and no injected Codex approval flags tested on Windows Node24. Installed Codex non-model startup verified.

**Baseline weight:** 4 h (rough). **Remaining:** 1–2 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/cli.test.mjs`, `scripts/verify-codex-setup.mjs`

## CLI-043 — Make version output deterministic

![85% validated](bars/cli-043.svg)

**Objective / acceptance:** Version identifies MTerm CLI independently of the GUI and can report pinned components safely.

**Current scope:** Offline command behavior and no injected Codex approval flags tested on Windows Node24. Installed Codex non-model startup verified.

**Baseline weight:** 4 h (rough). **Remaining:** 1–2 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/cli.test.mjs`, `scripts/verify-codex-setup.mjs`

## CLI-044 — Dispatch the required subcommands

![40% implementation](bars/cli-044.svg)

**Objective / acceptance:** Status, update and config route correctly without being forwarded accidentally to Codex.

**Current scope:** MCP/doctor/setup/config/launch work; status/update explicitly return NOT_IMPLEMENTED instead of fake data.

**Baseline weight:** 8 h (rough). **Remaining:** 2–10 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/cli.test.mjs`

## CLI-045 — Support explicit Codex argument passthrough

![65% integrated](bars/cli-045.svg)

**Objective / acceptance:** Arguments following -- reach Codex byte/argument-equivalently without shell evaluation.

**Current scope:** Existing Codex adapter preserves cwd/arguments/environment and inherited stdio. Deterministic fixture and real version/setup probes; full interactive/platform/provider acceptance remains.

**Baseline weight:** 8 h (rough). **Remaining:** 1–6 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/cli.test.mjs`, `tests/processes.test.mjs`

## CLI-046 — Preserve the caller working directory

![65% integrated](bars/cli-046.svg)

**Objective / acceptance:** Launch tests show Codex sees the requested caller workspace rather than the install directory.

**Current scope:** Existing Codex adapter preserves cwd/arguments/environment and inherited stdio. Deterministic fixture and real version/setup probes; full interactive/platform/provider acceptance remains.

**Baseline weight:** 8 h (rough). **Remaining:** 1–6 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/cli.test.mjs`, `tests/processes.test.mjs`

## CLI-047 — Handle paths with spaces and Unicode

![65% integrated](bars/cli-047.svg)

**Objective / acceptance:** Launch and config paths work without quoting loss or command injection.

**Current scope:** Existing Codex adapter preserves cwd/arguments/environment and inherited stdio. Deterministic fixture and real version/setup probes; full interactive/platform/provider acceptance remains.

**Baseline weight:** 8 h (rough). **Remaining:** 1–6 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/cli.test.mjs`, `tests/processes.test.mjs`

## CLI-048 — Preserve inherited terminal I/O

![65% integrated](bars/cli-048.svg)

**Objective / acceptance:** The actual agent gets interactive stdin/stdout/stderr where appropriate, not captured fake TUI output.

**Current scope:** Existing Codex adapter preserves cwd/arguments/environment and inherited stdio. Deterministic fixture and real version/setup probes; full interactive/platform/provider acceptance remains.

**Baseline weight:** 8 h (rough). **Remaining:** 1–6 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/cli.test.mjs`, `tests/processes.test.mjs`

## CLI-049 — Propagate interrupts and shutdown

![65% integrated](bars/cli-049.svg)

**Objective / acceptance:** Ctrl+C and relevant signals reach the intended child and restore terminal state.

**Current scope:** Existing Codex adapter preserves cwd/arguments/environment and inherited stdio. Deterministic fixture and real version/setup probes; full interactive/platform/provider acceptance remains.

**Baseline weight:** 8 h (rough). **Remaining:** 1–6 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/cli.test.mjs`, `tests/processes.test.mjs`

## CLI-050 — Preserve child exit outcomes

![65% integrated](bars/cli-050.svg)

**Objective / acceptance:** Codex failures/cancellation are not converted into a misleading MTerm success exit.

**Current scope:** Existing Codex adapter preserves cwd/arguments/environment and inherited stdio. Deterministic fixture and real version/setup probes; full interactive/platform/provider acceptance remains.

**Baseline weight:** 8 h (rough). **Remaining:** 1–6 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/cli.test.mjs`, `tests/processes.test.mjs`

## CLI-051 — Avoid unsolicited startup work

![85% validated](bars/cli-051.svg)

**Objective / acceptance:** Ordinary launches do not update, install, query quotas or silently reconfigure credentials.

**Current scope:** Offline command behavior and no injected Codex approval flags tested on Windows Node24. Installed Codex non-model startup verified.

**Baseline weight:** 4 h (rough). **Remaining:** 1–2 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/cli.test.mjs`, `scripts/verify-codex-setup.mjs`

## CLI-052 — Define non-interactive semantics

![65% integrated](bars/cli-052.svg)

**Objective / acceptance:** Pipes and redirected input do not hang on hidden confirmation prompts.

**Current scope:** Existing Codex adapter preserves cwd/arguments/environment and inherited stdio. Deterministic fixture and real version/setup probes; full interactive/platform/provider acceptance remains.

**Baseline weight:** 8 h (rough). **Remaining:** 1–6 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/cli.test.mjs`, `tests/processes.test.mjs`

## CLI-053 — Reject unknown wrapper flags safely

![65% integrated](bars/cli-053.svg)

**Objective / acceptance:** Wrapper errors are explicit while passthrough arguments remain available after the delimiter.

**Current scope:** Existing Codex adapter preserves cwd/arguments/environment and inherited stdio. Deterministic fixture and real version/setup probes; full interactive/platform/provider acceptance remains.

**Baseline weight:** 8 h (rough). **Remaining:** 1–6 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/cli.test.mjs`, `tests/processes.test.mjs`

## CLI-054 — Avoid executable recursion/collisions

![65% integrated](bars/cli-054.svg)

**Objective / acceptance:** Resolving codex never resolves mterm-cli back to itself or replaces an unrelated installation.

**Current scope:** Existing Codex adapter preserves cwd/arguments/environment and inherited stdio. Deterministic fixture and real version/setup probes; full interactive/platform/provider acceptance remains.

**Baseline weight:** 8 h (rough). **Remaining:** 1–6 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/cli.test.mjs`, `tests/processes.test.mjs`

## CLI-055 — Resolve exact Codex version and artifact

![0% not_started](bars/cli-055.svg)

**Objective / acceptance:** The manifest names a real source commit and the corresponding platform distribution.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 8 h (rough). **Remaining:** 4–16 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-056 — Verify Codex download integrity

![0% not_started](bars/cli-056.svg)

**Objective / acceptance:** Hash/signature checks use reviewed provenance and reject a modified artifact.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 8 h (rough). **Remaining:** 4–16 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-057 — Select only the current platform payload

![0% not_started](bars/cli-057.svg)

**Objective / acceptance:** A production install does not carry every operating system and architecture binary.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 8 h (rough). **Remaining:** 4–16 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-058 — Support an explicitly selected existing Codex

![65% integrated](bars/cli-058.svg)

**Objective / acceptance:** External-binary mode validates compatibility and labels itself dependency-reuse, not self-contained.

**Current scope:** Existing Codex adapter preserves cwd/arguments/environment and inherited stdio. Deterministic fixture and real version/setup probes; full interactive/platform/provider acceptance remains.

**Baseline weight:** 8 h (rough). **Remaining:** 1–6 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/cli.test.mjs`, `tests/processes.test.mjs`

## CLI-059 — Preserve Codex configuration precedence

![65% integrated](bars/cli-059.svg)

**Objective / acceptance:** The wrapper respects supported CODEX_HOME/config behavior without silently overriding user settings.

**Current scope:** Existing Codex adapter preserves cwd/arguments/environment and inherited stdio. Deterministic fixture and real version/setup probes; full interactive/platform/provider acceptance remains.

**Baseline weight:** 8 h (rough). **Remaining:** 1–6 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/cli.test.mjs`, `tests/processes.test.mjs`

## CLI-060 — Preserve Codex safety approvals

![85% validated](bars/cli-060.svg)

**Objective / acceptance:** No approval-bypass or sandbox-weakening flags are automatically added.

**Current scope:** Offline command behavior and no injected Codex approval flags tested on Windows Node24. Installed Codex non-model startup verified.

**Baseline weight:** 8 h (rough). **Remaining:** 1–2 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/cli.test.mjs`, `scripts/verify-codex-setup.mjs`

## CLI-061 — Test actual upstream executable startup

![85% validated](bars/cli-061.svg)

**Objective / acceptance:** Allowed non-model probes verify real binary launch in addition to deterministic child fixtures.

**Current scope:** Offline command behavior and no injected Codex approval flags tested on Windows Node24. Installed Codex non-model startup verified.

**Baseline weight:** 8 h (rough). **Remaining:** 1–2 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/cli.test.mjs`, `scripts/verify-codex-setup.mjs`

## CLI-062 — Diagnose missing/incompatible executables

![65% integrated](bars/cli-062.svg)

**Objective / acceptance:** Errors distinguish absence, wrong architecture, unsupported version and execution failure.

**Current scope:** Existing Codex adapter preserves cwd/arguments/environment and inherited stdio. Deterministic fixture and real version/setup probes; full interactive/platform/provider acceptance remains.

**Baseline weight:** 8 h (rough). **Remaining:** 1–6 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/cli.test.mjs`, `tests/processes.test.mjs`

## CLI-063 — Preserve resumable session behavior

![65% integrated](bars/cli-063.svg)

**Objective / acceptance:** Documented Codex resume arguments pass through without relocating or corrupting its history.

**Current scope:** Existing Codex adapter preserves cwd/arguments/environment and inherited stdio. Deterministic fixture and real version/setup probes; full interactive/platform/provider acceptance remains.

**Baseline weight:** 8 h (rough). **Remaining:** 1–6 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/cli.test.mjs`, `tests/processes.test.mjs`

## CLI-064 — Avoid persistent agent processes by default

![65% integrated](bars/cli-064.svg)

**Objective / acceptance:** No resident service remains merely because help, config or status was used.

**Current scope:** Existing Codex adapter preserves cwd/arguments/environment and inherited stdio. Deterministic fixture and real version/setup probes; full interactive/platform/provider acceptance remains.

**Baseline weight:** 8 h (rough). **Remaining:** 1–6 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/cli.test.mjs`, `tests/processes.test.mjs`

## CLI-065 — Pin the Web adapter and compatibility contract

![0% not_started](bars/cli-065.svg)

**Objective / acceptance:** Record the actual commit/version and compatible Codex route/model contract.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 40 h (rough). **Remaining:** 20–80 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** Web runtime/session/authenticated relay compatibility not verified; no browser or remote listener deployed..

**Evidence:** None; no implementation credit.

## CLI-066 — Verify a genuine non-GUI integration path

![0% not_started](bars/cli-066.svg)

**Objective / acceptance:** Exercise a supported path or record why the selected upstream requires an approved companion.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 40 h (rough). **Remaining:** 20–80 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** Web runtime/session/authenticated relay compatibility not verified; no browser or remote listener deployed..

**Evidence:** None; no implementation credit.

## CLI-067 — Keep one-time setup explicit

![0% not_started](bars/cli-067.svg)

**Objective / acceptance:** Initial browser/session/connector setup has a named entry point and clear human actions.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 40 h (rough). **Remaining:** 20–80 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** Web runtime/session/authenticated relay compatibility not verified; no browser or remote listener deployed..

**Evidence:** None; no implementation credit.

## CLI-068 — Reuse supported existing Web sessions

![0% not_started](bars/cli-068.svg)

**Objective / acceptance:** Reuse is limited to upstream-supported owned profiles, not cookie extraction or arbitrary session copying.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 40 h (rough). **Remaining:** 20–80 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** Web runtime/session/authenticated relay compatibility not verified; no browser or remote listener deployed..

**Evidence:** None; no implementation credit.

## CLI-069 — Distinguish Web and Codex auth readiness

![0% not_started](bars/cli-069.svg)

**Objective / acceptance:** Doctor/config do not treat auth.json presence as a browser login.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 40 h (rough). **Remaining:** 20–80 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** Web runtime/session/authenticated relay compatibility not verified; no browser or remote listener deployed..

**Evidence:** None; no implementation credit.

## CLI-070 — Verify real model discovery

![0% not_started](bars/cli-070.svg)

**Objective / acceptance:** Model availability is sourced from the configured account/integration, not a hardcoded marketing list.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 40 h (rough). **Remaining:** 20–80 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** Web runtime/session/authenticated relay compatibility not verified; no browser or remote listener deployed..

**Evidence:** None; no implementation credit.

## CLI-071 — Make configured Web routes available in Codex

![0% not_started](bars/cli-071.svg)

**Objective / acceptance:** Test the actual picker/catalog path under the compatible upstream protocol.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 40 h (rough). **Remaining:** 20–80 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** Web runtime/session/authenticated relay compatibility not verified; no browser or remote listener deployed..

**Evidence:** None; no implementation credit.

## CLI-072 — Prevent silent transport/model fallback

![0% not_started](bars/cli-072.svg)

**Objective / acceptance:** An unavailable selected Web model fails clearly instead of secretly using native/API quota.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 40 h (rough). **Remaining:** 20–80 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** Web runtime/session/authenticated relay compatibility not verified; no browser or remote listener deployed..

**Evidence:** None; no implementation credit.

## CLI-073 — Preserve model identity and supported effort

![0% not_started](bars/cli-073.svg)

**Objective / acceptance:** Do not translate effort/model settings through guessed undocumented flags.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 40 h (rough). **Remaining:** 20–80 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** Web runtime/session/authenticated relay compatibility not verified; no browser or remote listener deployed..

**Evidence:** None; no implementation credit.

## CLI-074 — Protect existing model routes

![0% not_started](bars/cli-074.svg)

**Objective / acceptance:** Any required config integration is scoped, backed up and conflict-checked before mutation.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 40 h (rough). **Remaining:** 20–80 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** Web runtime/session/authenticated relay compatibility not verified; no browser or remote listener deployed..

**Evidence:** None; no implementation credit.

## CLI-075 — Restore only owned route changes

![0% not_started](bars/cli-075.svg)

**Objective / acceptance:** Disable/rollback restores MTerm-owned settings without undoing unrelated user changes.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 40 h (rough). **Remaining:** 20–80 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** Web runtime/session/authenticated relay compatibility not verified; no browser or remote listener deployed..

**Evidence:** None; no implementation credit.

## CLI-076 — Own any approved session helper lifetime

![0% not_started](bars/cli-076.svg)

**Objective / acceptance:** Start/stop only helpers belonging to the MTerm session, with explicit version and health checks.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 40 h (rough). **Remaining:** 20–80 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** Web runtime/session/authenticated relay compatibility not verified; no browser or remote listener deployed..

**Evidence:** None; no implementation credit.

## CLI-077 — Do not install background autostart

![0% not_started](bars/cli-077.svg)

**Objective / acceptance:** No login item, scheduled task, system service or persistent daemon is enabled without separate approval.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 40 h (rough). **Remaining:** 20–80 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** Web runtime/session/authenticated relay compatibility not verified; no browser or remote listener deployed..

**Evidence:** None; no implementation credit.

## CLI-078 — Handle browser/selector drift explicitly

![0% not_started](bars/cli-078.svg)

**Objective / acceptance:** Changed upstream behavior yields a diagnosed failure, not repeated submissions or guessed results.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 40 h (rough). **Remaining:** 20–80 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** Web runtime/session/authenticated relay compatibility not verified; no browser or remote listener deployed..

**Evidence:** None; no implementation credit.

## CLI-079 — Handle interrupted Web sessions safely

![0% not_started](bars/cli-079.svg)

**Objective / acceptance:** Cancellation avoids duplicate submissions and leaves owned helper/session state understandable.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 40 h (rough). **Remaining:** 20–80 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** Web runtime/session/authenticated relay compatibility not verified; no browser or remote listener deployed..

**Evidence:** None; no implementation credit.

## CLI-080 — Keep Codex quota distinct from Web allowances

![0% not_started](bars/cli-080.svg)

**Objective / acceptance:** Usage labels never claim that pi-codex-status is a Web/Pro message counter.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 40 h (rough). **Remaining:** 20–80 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** Web runtime/session/authenticated relay compatibility not verified; no browser or remote listener deployed..

**Evidence:** None; no implementation credit.

## CLI-081 — Gate live Web acceptance on authorization

![0% not_started](bars/cli-081.svg)

**Objective / acceptance:** An account-bound smoke is opt-in, records actual behavior and never exposes credentials.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 40 h (rough). **Remaining:** 20–80 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** Web runtime/session/authenticated relay compatibility not verified; no browser or remote listener deployed..

**Evidence:** None; no implementation credit.

## CLI-082 — Keep incompatible Web acceptance blocked

![0% not_started](bars/cli-082.svg)

**Objective / acceptance:** No final all-three-components completion claim while required runtime/auth/size conflicts remain unresolved.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 40 h (rough). **Remaining:** 20–80 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** Web runtime/session/authenticated relay compatibility not verified; no browser or remote listener deployed..

**Evidence:** None; no implementation credit.

## CLI-083 — Default quota auth to Codex

![0% not_started](bars/cli-083.svg)

**Objective / acceptance:** The upstream auto preference cannot silently select MultiCodex or pi accounts.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 24 h (rough). **Remaining:** 12–48 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-084 — Honor an explicit auth-file path

![0% not_started](bars/cli-084.svg)

**Objective / acceptance:** The requested source is resolved safely without falling back to unrelated accounts.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 24 h (rough). **Remaining:** 12–48 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-085 — Honor supported CODEX_HOME behavior

![0% not_started](bars/cli-085.svg)

**Objective / acceptance:** An alternate Codex home is handled through an explicit adapter path when upstream lacks support.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 24 h (rough). **Remaining:** 12–48 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-086 — Handle missing credentials

![0% not_started](bars/cli-086.svg)

**Objective / acceptance:** Show actionable existing-login guidance without creating a new MTerm account.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 24 h (rough). **Remaining:** 12–48 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-087 — Handle malformed credentials

![0% not_started](bars/cli-087.svg)

**Objective / acceptance:** Invalid JSON/types fail safely and do not produce partial token-bearing diagnostics.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 24 h (rough). **Remaining:** 12–48 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-088 — Handle API-key versus OAuth mode

![0% not_started](bars/cli-088.svg)

**Objective / acceptance:** Unsupported quota data is marked unavailable rather than fabricating OAuth usage.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 24 h (rough). **Remaining:** 12–48 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-089 — Handle OS keyring credentials honestly

![0% not_started](bars/cli-089.svg)

**Objective / acceptance:** Unsupported keyring access is reported; credentials are never exported to plaintext for convenience.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 24 h (rough). **Remaining:** 12–48 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-090 — Keep credentials out of process arguments

![0% not_started](bars/cli-090.svg)

**Objective / acceptance:** Bearer/refresh tokens and cookies never appear in argv or diagnostic command examples.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 24 h (rough). **Remaining:** 12–48 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-091 — Keep credentials out of logs and stdout

![0% not_started](bars/cli-091.svg)

**Objective / acceptance:** All success/error paths are tested with sentinel secrets absent from output.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 24 h (rough). **Remaining:** 12–48 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-092 — Keep credentials out of repository artifacts

![0% not_started](bars/cli-092.svg)

**Objective / acceptance:** Staging, snapshots, issue bodies and CI uploads exclude real credential material.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 24 h (rough). **Remaining:** 12–48 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-093 — Identify token-refresh side effects

![0% not_started](bars/cli-093.svg)

**Objective / acceptance:** Document whether the pinned status adapter can write the shared auth source.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 24 h (rough). **Remaining:** 12–48 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-094 — Bound refresh timeout/retries

![0% not_started](bars/cli-094.svg)

**Objective / acceptance:** A refresh failure cannot hang a status command or repeatedly rotate tokens.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 24 h (rough). **Remaining:** 12–48 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-095 — Protect concurrent credential updates

![0% not_started](bars/cli-095.svg)

**Objective / acceptance:** Test account changes and unrelated field edits; use coordinated or fail-closed behavior.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 24 h (rough). **Remaining:** 12–48 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-096 — Preserve credential file protection

![0% not_started](bars/cli-096.svg)

**Objective / acceptance:** Legitimate authorized refresh maintains owner-only protection and existing unrelated fields.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 24 h (rough). **Remaining:** 12–48 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-097 — Distinguish app-local locks from external coordination

![0% not_started](bars/cli-097.svg)

**Objective / acceptance:** Do not claim that an MTerm lock serializes an unrelated Codex process.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 24 h (rough). **Remaining:** 12–48 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-098 — Prevent statusline auth mutation

![0% not_started](bars/cli-098.svg)

**Objective / acceptance:** The default prompt-hook path cannot quietly refresh credentials or initiate sign-in.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 24 h (rough). **Remaining:** 12–48 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-099 — Avoid account details in public output

![0% not_started](bars/cli-099.svg)

**Objective / acceptance:** Email/account identifiers are omitted or pseudonymized unless explicitly requested and safe.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 24 h (rough). **Remaining:** 12–48 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-100 — Handle revoked/expired auth without evasion

![0% not_started](bars/cli-100.svg)

**Objective / acceptance:** Report the required human upstream reauthentication; do not switch identities to escape limits.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 24 h (rough). **Remaining:** 12–48 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-101 — Integrate the real pi status surface

![0% not_started](bars/cli-101.svg)

**Objective / acceptance:** The wrapper calls verified library/CLI behavior, not a replacement hardcoded success report.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 8 h (rough). **Remaining:** 4–16 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** Quota adapter is not integrated; no credentials or usage endpoint accessed..

**Evidence:** None; no implementation credit.

## CLI-102 — Recognize private endpoint instability

![0% not_started](bars/cli-102.svg)

**Objective / acceptance:** The implementation documents and distinguishes schema drift and unsupported responses.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 8 h (rough). **Remaining:** 4–16 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** Quota adapter is not integrated; no credentials or usage endpoint accessed..

**Evidence:** None; no implementation credit.

## CLI-103 — Preserve source window durations

![0% not_started](bars/cli-103.svg)

**Objective / acceptance:** Window duration remains source-driven in seconds rather than always assuming two fixed periods.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 8 h (rough). **Remaining:** 4–16 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** Quota adapter is not integrated; no credentials or usage endpoint accessed..

**Evidence:** None; no implementation credit.

## CLI-104 — Normalize used and remaining percentages

![0% not_started](bars/cli-104.svg)

**Objective / acceptance:** Test supported values, bounds, missing values and semantics without silently clamping away errors.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 8 h (rough). **Remaining:** 4–16 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** Quota adapter is not integrated; no credentials or usage endpoint accessed..

**Evidence:** None; no implementation credit.

## CLI-105 — Preserve reset timestamp units

![0% not_started](bars/cli-105.svg)

**Objective / acceptance:** Unix seconds and milliseconds are handled explicitly and normalized consistently.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 8 h (rough). **Remaining:** 4–16 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** Quota adapter is not integrated; no credentials or usage endpoint accessed..

**Evidence:** None; no implementation credit.

## CLI-106 — Render local reset times safely

![0% not_started](bars/cli-106.svg)

**Objective / acceptance:** Local display and UTC machine timestamps agree, including daylight-saving boundaries.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 8 h (rough). **Remaining:** 4–16 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** Quota adapter is not integrated; no credentials or usage endpoint accessed..

**Evidence:** None; no implementation credit.

## CLI-107 — Distinguish missing versus zero quota

![0% not_started](bars/cli-107.svg)

**Objective / acceptance:** Null/unknown data cannot be displayed as exhausted or fully available.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 8 h (rough). **Remaining:** 4–16 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** Quota adapter is not integrated; no credentials or usage endpoint accessed..

**Evidence:** None; no implementation credit.

## CLI-108 — Normalize credits without invention

![0% not_started](bars/cli-108.svg)

**Objective / acceptance:** Known balance, unknown balance and source-supported unlimited state remain distinct.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 8 h (rough). **Remaining:** 4–16 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** Quota adapter is not integrated; no credentials or usage endpoint accessed..

**Evidence:** None; no implementation credit.

## CLI-109 — Preserve additional named limits

![0% not_started](bars/cli-109.svg)

**Objective / acceptance:** Per-model or named limits are carried through with bounded safe labels.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 8 h (rough). **Remaining:** 4–16 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** Quota adapter is not integrated; no credentials or usage endpoint accessed..

**Evidence:** None; no implementation credit.

## CLI-110 — Return meaningful service errors

![0% not_started](bars/cli-110.svg)

**Objective / acceptance:** 401,403,429,timeout,offline and server failures have distinct tested diagnoses.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 8 h (rough). **Remaining:** 4–16 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** Quota adapter is not integrated; no credentials or usage endpoint accessed..

**Evidence:** None; no implementation credit.

## CLI-111 — Respect retry guidance and rate limits

![0% not_started](bars/cli-111.svg)

**Objective / acceptance:** Bounded retries honor Retry-After and do not hammer private endpoints.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 8 h (rough). **Remaining:** 4–16 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** Quota adapter is not integrated; no credentials or usage endpoint accessed..

**Evidence:** None; no implementation credit.

## CLI-112 — Avoid model calls for usage inspection

![0% not_started](bars/cli-112.svg)

**Objective / acceptance:** Status tests assert that no coding completion or Web message is sent.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 8 h (rough). **Remaining:** 4–16 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** Quota adapter is not integrated; no credentials or usage endpoint accessed..

**Evidence:** None; no implementation credit.

## CLI-113 — Prevent credential-bearing origin changes

![0% not_started](bars/cli-113.svg)

**Objective / acceptance:** Endpoint overrides and redirects cannot send real tokens to an arbitrary host.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 8 h (rough). **Remaining:** 4–16 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** Quota adapter is not integrated; no credentials or usage endpoint accessed..

**Evidence:** None; no implementation credit.

## CLI-114 — Bound response size and parsing

![0% not_started](bars/cli-114.svg)

**Objective / acceptance:** Oversized/malformed upstream responses are rejected with sanitized error output.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 8 h (rough). **Remaining:** 4–16 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** Quota adapter is not integrated; no credentials or usage endpoint accessed..

**Evidence:** None; no implementation credit.

## CLI-115 — Render the requested boxed status

![0% not_started](bars/cli-115.svg)

**Objective / acceptance:** The normal terminal view shows supported quota/credits/resets in a readable box.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 4 h (rough). **Remaining:** 2–8 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-116 — Render a single compact status line

![0% not_started](bars/cli-116.svg)

**Objective / acceptance:** The --line mode emits one bounded line, not spinners or multiline diagnostics.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 4 h (rough). **Remaining:** 2–8 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-117 — Produce versioned JSON-only stdout

![0% not_started](bars/cli-117.svg)

**Objective / acceptance:** The --json path emits exactly one parseable document on success and expected errors.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 4 h (rough). **Remaining:** 2–8 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-118 — Use stable structured error codes

![0% not_started](bars/cli-118.svg)

**Objective / acceptance:** Consumers do not need to scrape human error strings to distinguish failure modes.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 8 h (rough). **Remaining:** 4–16 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-119 — Expose freshness in every format

![0% not_started](bars/cli-119.svg)

**Objective / acceptance:** Fresh, cached, stale and unavailable values remain distinguishable.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 8 h (rough). **Remaining:** 4–16 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-120 — Support NO_COLOR and dumb terminals

![0% not_started](bars/cli-120.svg)

**Objective / acceptance:** No-color/plain modes avoid ANSI escapes and unsuitable Unicode decoration.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 8 h (rough). **Remaining:** 4–16 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-121 — Handle narrow display widths

![0% not_started](bars/cli-121.svg)

**Objective / acceptance:** Clipping/wrapping remains readable and does not corrupt the terminal.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 8 h (rough). **Remaining:** 4–16 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-122 — Sanitize untrusted terminal controls

![0% not_started](bars/cli-122.svg)

**Objective / acceptance:** Upstream labels/errors cannot inject CSI/OSC hyperlinks, titles or escape sequences.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 8 h (rough). **Remaining:** 4–16 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-123 — Preserve shell/tmux prompt safety

![0% not_started](bars/cli-123.svg)

**Objective / acceptance:** Status text does not execute or inject prompt-language syntax through unescaped values.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 8 h (rough). **Remaining:** 4–16 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-124 — Define quota-exhausted exit semantics

![0% not_started](bars/cli-124.svg)

**Objective / acceptance:** A valid exhausted quota result is not mistaken for network or parser failure.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 8 h (rough). **Remaining:** 4–16 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-125 — Keep raw secret-bearing data private

![0% not_started](bars/cli-125.svg)

**Objective / acceptance:** Normalized output never includes auth documents or unfiltered HTTP error bodies.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 8 h (rough). **Remaining:** 4–16 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-126 — Keep output deterministic under fixtures

![0% not_started](bars/cli-126.svg)

**Objective / acceptance:** Stable snapshots cover time/locale-sensitive output with controlled clocks and settings.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 8 h (rough). **Remaining:** 4–16 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-127 — Use a per-user cache location

![0% not_started](bars/cli-127.svg)

**Objective / acceptance:** Platform paths are documented and isolated from GUI state and source checkout.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 8 h (rough). **Remaining:** 4–16 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-128 — Bind cache to the selected account/source

![0% not_started](bars/cli-128.svg)

**Objective / acceptance:** Switching accounts cannot display a previous account’s quota.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 8 h (rough). **Remaining:** 4–16 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-129 — Define cache schema and size bounds

![0% not_started](bars/cli-129.svg)

**Objective / acceptance:** Unknown schema/corrupt/oversized cache fails safely without unbounded reads.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 8 h (rough). **Remaining:** 4–16 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-130 — Write cache atomically

![0% not_started](bars/cli-130.svg)

**Objective / acceptance:** Interrupted writes do not destroy the last usable snapshot.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 8 h (rough). **Remaining:** 4–16 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-131 — Test concurrent readers and writers

![0% not_started](bars/cli-131.svg)

**Objective / acceptance:** Contention produces coherent snapshots, not partial JSON or silent cross-account merges.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 8 h (rough). **Remaining:** 4–16 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-132 — Implement explicit TTL behavior

![0% not_started](bars/cli-132.svg)

**Objective / acceptance:** Freshness is deterministic under a controlled clock.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 8 h (rough). **Remaining:** 4–16 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-133 — Handle future clock/skew cases

![0% not_started](bars/cli-133.svg)

**Objective / acceptance:** A future timestamp does not become indefinitely fresh.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 8 h (rough). **Remaining:** 4–16 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-134 — Handle cache directory permission errors

![0% not_started](bars/cli-134.svg)

**Objective / acceptance:** Status can report the problem without changing broad filesystem permissions.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 8 h (rough). **Remaining:** 4–16 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-135 — Offer clearly labeled stale fallback

![0% not_started](bars/cli-135.svg)

**Objective / acceptance:** Network failure may reuse an allowed stale result only with visible staleness.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 8 h (rough). **Remaining:** 4–16 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-136 — Keep statusline bounded and offline by default

![0% not_started](bars/cli-136.svg)

**Objective / acceptance:** A prompt hook does not wait for a remote request or create a background worker.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 8 h (rough). **Remaining:** 4–16 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-137 — Implement effective config display

![65% integrated](bars/cli-137.svg)

**Objective / acceptance:** Show non-secret values and precedence sources, not raw auth.

**Current scope:** Typed local config, safe validation/atomic snapshots, offline doctor and structured setup plan work; full editor/migration/concurrency platform coverage remains.

**Baseline weight:** 4 h (rough). **Remaining:** 1–3 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/cli.test.mjs`

## CLI-138 — Implement typed config get/set

![65% integrated](bars/cli-138.svg)

**Objective / acceptance:** Unsupported keys and wrong types are rejected before mutation.

**Current scope:** Typed local config, safe validation/atomic snapshots, offline doctor and structured setup plan work; full editor/migration/concurrency platform coverage remains.

**Baseline weight:** 4 h (rough). **Remaining:** 1–3 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/cli.test.mjs`

## CLI-139 — Implement safe config editing

![0% not_started](bars/cli-139.svg)

**Objective / acceptance:** An invalid editor result preserves the previous validated configuration.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 8 h (rough). **Remaining:** 4–16 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-140 — Version config schemas

![40% implementation](bars/cli-140.svg)

**Objective / acceptance:** Migrations preserve existing values and are tested against representative old files.

**Current scope:** Core production dependencies are exact-pinned and third-party boundaries documented. Full Codex/Web/status bundle and all-platform installed-size acceptance remain unverified.

**Baseline weight:** 8 h (rough). **Remaining:** 2–10 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `package.json`, `package-lock.json`

## CLI-141 — Use atomic config writes and backups

![65% integrated](bars/cli-141.svg)

**Objective / acceptance:** A failed write/migration does not strand the installed CLI.

**Current scope:** Typed local config, safe validation/atomic snapshots, offline doctor and structured setup plan work; full editor/migration/concurrency platform coverage remains.

**Baseline weight:** 8 h (rough). **Remaining:** 1–6 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/cli.test.mjs`

## CLI-142 — Reject prototype-pollution keys

![65% integrated](bars/cli-142.svg)

**Objective / acceptance:** Merging configuration cannot alter object prototypes or runtime behavior through inherited properties.

**Current scope:** Typed local config, safe validation/atomic snapshots, offline doctor and structured setup plan work; full editor/migration/concurrency platform coverage remains.

**Baseline weight:** 8 h (rough). **Remaining:** 1–6 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/cli.test.mjs`

## CLI-143 — Resolve config/data/cache paths explicitly

![65% integrated](bars/cli-143.svg)

**Objective / acceptance:** Flags/environment/default precedence is documented and tested.

**Current scope:** Typed local config, safe validation/atomic snapshots, offline doctor and structured setup plan work; full editor/migration/concurrency platform coverage remains.

**Baseline weight:** 8 h (rough). **Remaining:** 1–6 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/cli.test.mjs`

## CLI-144 — Provide offline doctor output

![65% integrated](bars/cli-144.svg)

**Objective / acceptance:** Dependency/auth-source/config/cache readiness is diagnosed without real token or model calls.

**Current scope:** Typed local config, safe validation/atomic snapshots, offline doctor and structured setup plan work; full editor/migration/concurrency platform coverage remains.

**Baseline weight:** 4 h (rough). **Remaining:** 1–3 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/cli.test.mjs`

## CLI-145 — Provide structured doctor JSON

![65% integrated](bars/cli-145.svg)

**Objective / acceptance:** Missing, unsupported, blocked and ready states are stable machine-readable values.

**Current scope:** Typed local config, safe validation/atomic snapshots, offline doctor and structured setup plan work; full editor/migration/concurrency platform coverage remains.

**Baseline weight:** 4 h (rough). **Remaining:** 1–3 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/cli.test.mjs`

## CLI-146 — Keep network diagnostics opt-in

![65% integrated](bars/cli-146.svg)

**Objective / acceptance:** A health check requiring network is clearly separate from ordinary help/config inspection.

**Current scope:** Typed local config, safe validation/atomic snapshots, offline doctor and structured setup plan work; full editor/migration/concurrency platform coverage remains.

**Baseline weight:** 8 h (rough). **Remaining:** 1–6 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/cli.test.mjs`

## CLI-147 — Create immutable versions.json records

![40% implementation](bars/cli-147.svg)

**Objective / acceptance:** Each required component has an exact source commit and distribution identity.

**Current scope:** Core production dependencies are exact-pinned and third-party boundaries documented. Full Codex/Web/status bundle and all-platform installed-size acceptance remain unverified.

**Baseline weight:** 8 h (rough). **Remaining:** 2–10 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `package.json`, `package-lock.json`

## CLI-148 — Record platform asset checksums

![40% implementation](bars/cli-148.svg)

**Objective / acceptance:** Downloads can be checked against a trusted reviewed manifest.

**Current scope:** Core production dependencies are exact-pinned and third-party boundaries documented. Full Codex/Web/status bundle and all-platform installed-size acceptance remain unverified.

**Baseline weight:** 8 h (rough). **Remaining:** 2–10 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `package.json`, `package-lock.json`

## CLI-149 — Commit a coherent CLI package lock

![40% implementation](bars/cli-149.svg)

**Objective / acceptance:** Clean installs reproduce the same declared production dependency graph.

**Current scope:** Core production dependencies are exact-pinned and third-party boundaries documented. Full Codex/Web/status bundle and all-platform installed-size acceptance remain unverified.

**Baseline weight:** 8 h (rough). **Remaining:** 2–10 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `package.json`, `package-lock.json`

## CLI-150 — Record the compatible three-component set

![0% not_started](bars/cli-150.svg)

**Objective / acceptance:** Pins are tested as a combination, not independently assumed compatible.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 8 h (rough). **Remaining:** 4–16 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** Complete mandatory Codex/Web/status installed footprint and compatible pins are unverified..

**Evidence:** None; no implementation credit.

## CLI-151 — Choose a maintainable vendor strategy

![0% not_started](bars/cli-151.svg)

**Objective / acceptance:** Submodule/subtree/snapshot initialization and update behavior work from a clean clone.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 8 h (rough). **Remaining:** 4–16 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-152 — Preserve upstream notices and licenses

![40% implementation](bars/cli-152.svg)

**Objective / acceptance:** Vendored code retains its original licenses and attribution.

**Current scope:** Core production dependencies are exact-pinned and third-party boundaries documented. Full Codex/Web/status bundle and all-platform installed-size acceptance remain unverified.

**Baseline weight:** 8 h (rough). **Remaining:** 2–10 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `package.json`, `package-lock.json`

## CLI-153 — Track patches separately

![0% not_started](bars/cli-153.svg)

**Objective / acceptance:** Every patch has rationale, hash, upstream base and regression evidence.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 8 h (rough). **Remaining:** 4–16 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-154 — Detect upstream patch drift

![0% not_started](bars/cli-154.svg)

**Objective / acceptance:** An update refuses to silently apply a patch to incompatible source.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 8 h (rough). **Remaining:** 4–16 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-155 — Avoid shipping full upstream development histories

![40% implementation](bars/cli-155.svg)

**Objective / acceptance:** The runtime package excludes repositories/toolchains/tests not required to execute.

**Current scope:** Core production dependencies are exact-pinned and third-party boundaries documented. Full Codex/Web/status bundle and all-platform installed-size acceptance remain unverified.

**Baseline weight:** 8 h (rough). **Remaining:** 2–10 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `package.json`, `package-lock.json`

## CLI-156 — Separate desired pins from installed state

![40% implementation](bars/cli-156.svg)

**Objective / acceptance:** The installed manifest records exact active versions without rewriting source pins.

**Current scope:** Core production dependencies are exact-pinned and third-party boundaries documented. Full Codex/Web/status bundle and all-platform installed-size acceptance remain unverified.

**Baseline weight:** 8 h (rough). **Remaining:** 2–10 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `package.json`, `package-lock.json`

## CLI-157 — Implement non-mutating update check

![0% not_started](bars/cli-157.svg)

**Objective / acceptance:** --check reports available/reviewed differences without changing installed state or auth.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 24 h (rough). **Remaining:** 12–48 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-158 — Display old-to-new changes before apply

![0% not_started](bars/cli-158.svg)

**Objective / acceptance:** The user sees components, hashes, compatibility and footprint implications.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 24 h (rough). **Remaining:** 12–48 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-159 — Require deliberate update confirmation

![0% not_started](bars/cli-159.svg)

**Objective / acceptance:** Interactive confirmation or explicit non-interactive --yes is required for mutation.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 24 h (rough). **Remaining:** 12–48 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-160 — Avoid automatic startup updates

![0% not_started](bars/cli-160.svg)

**Objective / acceptance:** Default launch/status/config do not call update or schedule it.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 24 h (rough). **Remaining:** 12–48 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-161 — Use a scoped update lock

![0% not_started](bars/cli-161.svg)

**Objective / acceptance:** Concurrent updaters cannot activate conflicting versions.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 24 h (rough). **Remaining:** 12–48 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-162 — Validate stale lock ownership

![0% not_started](bars/cli-162.svg)

**Objective / acceptance:** Recovery does not kill unrelated processes or delete unrelated lock paths.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 24 h (rough). **Remaining:** 12–48 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-163 — Stage into a new owned directory

![0% not_started](bars/cli-163.svg)

**Objective / acceptance:** The active installation remains untouched during download/build/test.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 24 h (rough). **Remaining:** 12–48 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-164 — Bound download time and size

![0% not_started](bars/cli-164.svg)

**Objective / acceptance:** A hanging or oversized artifact cannot consume unlimited resources.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 24 h (rough). **Remaining:** 12–48 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-165 — Verify hashes before execution/extraction

![0% not_started](bars/cli-165.svg)

**Objective / acceptance:** Untrusted or modified binaries/scripts are never executed.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 24 h (rough). **Remaining:** 12–48 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-166 — Reject archive traversal and link escapes

![0% not_started](bars/cli-166.svg)

**Objective / acceptance:** Absolute entries, parent traversal and unsafe symlink/hardlink targets fail safely.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 24 h (rough). **Remaining:** 12–48 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-167 — Reject decompression bombs

![0% not_started](bars/cli-167.svg)

**Objective / acceptance:** Extraction enforces file count and expanded-byte budgets.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 24 h (rough). **Remaining:** 12–48 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-168 — Run compatibility checks before activation

![0% not_started](bars/cli-168.svg)

**Objective / acceptance:** Failed build/tests/smokes leave the previous version selected.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 24 h (rough). **Remaining:** 12–48 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-169 — Activate atomically

![0% not_started](bars/cli-169.svg)

**Objective / acceptance:** The command sees either the old or new coherent component set, not a partial mixture.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 24 h (rough). **Remaining:** 12–48 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-170 — Support exact manifest rollback

![0% not_started](bars/cli-170.svg)

**Objective / acceptance:** Rollback selects a known previous owned version without disturbing user state.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 24 h (rough). **Remaining:** 12–48 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-171 — Preserve active sessions during updates

![0% not_started](bars/cli-171.svg)

**Objective / acceptance:** Versioned binaries are not removed or replaced beneath running jobs.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 24 h (rough). **Remaining:** 12–48 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-172 — Preserve config/auth/cache/browser profiles

![0% not_started](bars/cli-172.svg)

**Objective / acceptance:** An update never resets account login or deletes private state.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 24 h (rough). **Remaining:** 12–48 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-173 — Protect linked developer checkouts

![0% not_started](bars/cli-173.svg)

**Objective / acceptance:** Installed-user update logic cannot git-reset or overwrite source/vendor edits.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 24 h (rough). **Remaining:** 12–48 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-174 — Keep update.sh a thin wrapper

![0% not_started](bars/cli-174.svg)

**Objective / acceptance:** Shell and CLI entry points call the same tested update engine.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 24 h (rough). **Remaining:** 12–48 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-175 — Implement MTerm-CLI repository-root npm link

![85% validated](bars/cli-175.svg)

**Objective / acceptance:** A clean install from MTerm-CLI repository root exposes mterm-cli without cloning/installing MTerm-GUI.

**Current scope:** Real production tarball install, official-client MCP file round trip outside checkout, isolated-prefix npm link and actual Windows shim passed. No user-global prefix mutation; other platforms and full three-component bundle remain unverified.

**Baseline weight:** 8 h (rough). **Remaining:** 1–2 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `scripts/verify-package.mjs`, `tests/cli.test.mjs`, `docs/validation/2026-10-05-codex-parity-foundation.md`

## CLI-176 — Resolve symlinked entry paths

![85% validated](bars/cli-176.svg)

**Objective / acceptance:** Linked commands find their own package/resources outside the current working directory.

**Current scope:** Real production tarball install, official-client MCP file round trip outside checkout, isolated-prefix npm link and actual Windows shim passed. No user-global prefix mutation; other platforms and full three-component bundle remain unverified.

**Baseline weight:** 8 h (rough). **Remaining:** 1–2 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `scripts/verify-package.mjs`, `tests/cli.test.mjs`

## CLI-177 — Isolate global test links

![85% validated](bars/cli-177.svg)

**Objective / acceptance:** Test install/uninstall uses an owned temporary prefix and preserves unrelated commands.

**Current scope:** Real production tarball install, official-client MCP file round trip outside checkout, isolated-prefix npm link and actual Windows shim passed. No user-global prefix mutation; other platforms and full three-component bundle remain unverified.

**Baseline weight:** 8 h (rough). **Remaining:** 1–2 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `scripts/verify-package.mjs`, `tests/cli.test.mjs`

## CLI-178 — Inspect the real packed tarball

![85% validated](bars/cli-178.svg)

**Objective / acceptance:** Unpack the produced package and assert its complete file allowlist.

**Current scope:** Real production tarball install, official-client MCP file round trip outside checkout, isolated-prefix npm link and actual Windows shim passed. No user-global prefix mutation; other platforms and full three-component bundle remain unverified.

**Baseline weight:** 8 h (rough). **Remaining:** 1–2 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `scripts/verify-package.mjs`, `tests/cli.test.mjs`, `docs/validation/2026-10-05-codex-parity-foundation.md`

## CLI-179 — Exclude private and development material

![85% validated](bars/cli-179.svg)

**Objective / acceptance:** No credentials, browser profiles, raw chats, source maps without reason or caches enter distribution.

**Current scope:** Real production tarball install, official-client MCP file round trip outside checkout, isolated-prefix npm link and actual Windows shim passed. No user-global prefix mutation; other platforms and full three-component bundle remain unverified.

**Baseline weight:** 8 h (rough). **Remaining:** 1–2 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `scripts/verify-package.mjs`, `tests/cli.test.mjs`

## CLI-180 — Exclude GUI/runtime bloat

![85% validated](bars/cli-180.svg)

**Objective / acceptance:** The CLI dependency/install graph contains no Qt/Electron/GUI code unless explicitly approved as a separate mode.

**Current scope:** Real production tarball install, official-client MCP file round trip outside checkout, isolated-prefix npm link and actual Windows shim passed. No user-global prefix mutation; other platforms and full three-component bundle remain unverified.

**Baseline weight:** 8 h (rough). **Remaining:** 1–2 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `scripts/verify-package.mjs`, `tests/cli.test.mjs`

## CLI-181 — Record all production dependency bytes

![40% implementation](bars/cli-181.svg)

**Objective / acceptance:** The size report counts target binaries, transitive modules and mandatory side-downloads.

**Current scope:** Core production dependencies are exact-pinned and third-party boundaries documented. Full Codex/Web/status bundle and all-platform installed-size acceptance remain unverified.

**Baseline weight:** 8 h (rough). **Remaining:** 2–10 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** Complete mandatory Codex/Web/status installed footprint and compatible pins are unverified..

**Evidence:** `package.json`, `package-lock.json`

## CLI-182 — Separate compressed and installed size

![40% implementation](bars/cli-182.svg)

**Objective / acceptance:** The under-50-MB claim uses extracted bytes, not archive compression.

**Current scope:** Core production dependencies are exact-pinned and third-party boundaries documented. Full Codex/Web/status bundle and all-platform installed-size acceptance remain unverified.

**Baseline weight:** 8 h (rough). **Remaining:** 2–10 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** Complete mandatory Codex/Web/status installed footprint and compatible pins are unverified..

**Evidence:** `package.json`, `package-lock.json`

## CLI-183 — Label preinstalled prerequisite mode

![85% validated](bars/cli-183.svg)

**Objective / acceptance:** Reusing Node/Codex/companion installations is not presented as a self-contained bundle.

**Current scope:** Real production tarball install, official-client MCP file round trip outside checkout, isolated-prefix npm link and actual Windows shim passed. No user-global prefix mutation; other platforms and full three-component bundle remain unverified.

**Baseline weight:** 8 h (rough). **Remaining:** 1–2 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `scripts/verify-package.mjs`, `tests/cli.test.mjs`

## CLI-184 — Provide safe optional installer semantics

![0% not_started](bars/cli-184.svg)

**Objective / acceptance:** A bootstrap verifies pinned artifacts, avoids sudo/autostart and preserves shell configuration.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 8 h (rough). **Remaining:** 4–16 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-185 — Version the CLI separately

![85% validated](bars/cli-185.svg)

**Objective / acceptance:** MTerm GUI 0.2.0 and future versions are not overwritten by CLI 0.1.0.

**Current scope:** Real production tarball install, official-client MCP file round trip outside checkout, isolated-prefix npm link and actual Windows shim passed. No user-global prefix mutation; other platforms and full three-component bundle remain unverified.

**Baseline weight:** 4 h (rough). **Remaining:** 1–2 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `scripts/verify-package.mjs`, `tests/cli.test.mjs`

## CLI-186 — Diagnose unsupported runtime/platform installs

![40% implementation](bars/cli-186.svg)

**Objective / acceptance:** Errors identify required architecture/OS/runtime instead of partially installing.

**Current scope:** Core production dependencies are exact-pinned and third-party boundaries documented. Full Codex/Web/status bundle and all-platform installed-size acceptance remain unverified.

**Baseline weight:** 8 h (rough). **Remaining:** 2–10 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `package.json`, `package-lock.json`

## CLI-187 — Validate macOS arm64 execution

![0% not_started](bars/cli-187.svg)

**Objective / acceptance:** Run the actual supported artifact on an arm64 macOS environment.

**Current scope:** Workflow job is defined with actual architecture assertions, but no runner steps executed. Platform implementation acceptance stays not_started.

**Baseline weight:** 16 h (rough). **Remaining:** 8–32 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** Hosted CI cannot start: GitHub account payment/spending-limit gate. Owner resolution needed; no billing or protection changes authorized..

**Evidence:** `docs/validation/2026-10-05-codex-parity-foundation.md`

## CLI-188 — Validate macOS x86-64 execution

![0% not_started](bars/cli-188.svg)

**Objective / acceptance:** Run the actual Intel artifact rather than assuming arm64 results cover it.

**Current scope:** Workflow job is defined with actual architecture assertions, but no runner steps executed. Platform implementation acceptance stays not_started.

**Baseline weight:** 16 h (rough). **Remaining:** 8–32 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** Hosted CI cannot start: GitHub account payment/spending-limit gate. Owner resolution needed; no billing or protection changes authorized..

**Evidence:** `docs/validation/2026-10-05-codex-parity-foundation.md`

## CLI-189 — Validate Linux x86-64 execution

![0% not_started](bars/cli-189.svg)

**Objective / acceptance:** Declare and test the supported libc/distribution floor and executable permissions.

**Current scope:** Workflow job is defined with actual architecture assertions, but no runner steps executed. Platform implementation acceptance stays not_started.

**Baseline weight:** 16 h (rough). **Remaining:** 8–32 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** Hosted CI cannot start: GitHub account payment/spending-limit gate. Owner resolution needed; no billing or protection changes authorized..

**Evidence:** `docs/validation/2026-10-05-codex-parity-foundation.md`

## CLI-190 — Assess Linux arm64 explicitly

![0% not_started](bars/cli-190.svg)

**Objective / acceptance:** Record whether the full chosen upstream set is supported and tested, or keep it out of claimed support.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 16 h (rough). **Remaining:** 8–32 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-191 — Preserve Windows development capability

![65% integrated](bars/cli-191.svg)

**Objective / acceptance:** Build/test scripts work on the actual workstation without assuming Unix shell availability.

**Current scope:** Local Windows tests exercise actual SDK wire/lifecycle paths with synthetic roots and no account/model calls. No hosted CI, Unix/macOS or sandbox claim.

**Baseline weight:** 16 h (rough). **Remaining:** 3–11 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/cli.test.mjs`, `tests/mcp.test.mjs`, `tests/processes.test.mjs`

## CLI-192 — Verify actual runner architecture

![0% not_started](bars/cli-192.svg)

**Objective / acceptance:** CI records process OS/architecture; moving runner labels are not assumed equivalent.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 16 h (rough). **Remaining:** 8–32 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-193 — Test interactive terminal integration

![65% integrated](bars/cli-193.svg)

**Objective / acceptance:** TTY detection, resize, interrupts and exit restoration work under representative terminals.

**Current scope:** Local Windows tests exercise actual SDK wire/lifecycle paths with synthetic roots and no account/model calls. No hosted CI, Unix/macOS or sandbox claim.

**Baseline weight:** 16 h (rough). **Remaining:** 3–11 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/cli.test.mjs`, `tests/mcp.test.mjs`, `tests/processes.test.mjs`

## CLI-194 — Test redirected/non-TTY invocation

![65% integrated](bars/cli-194.svg)

**Objective / acceptance:** Commands have documented behavior under pipes, files and CI.

**Current scope:** Local Windows tests exercise actual SDK wire/lifecycle paths with synthetic roots and no account/model calls. No hosted CI, Unix/macOS or sandbox claim.

**Baseline weight:** 16 h (rough). **Remaining:** 3–11 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/cli.test.mjs`, `tests/mcp.test.mjs`, `tests/processes.test.mjs`

## CLI-195 — Test cancellation and descendant cleanup

![65% integrated](bars/cli-195.svg)

**Objective / acceptance:** Owned session helpers stop without killing unrelated user processes.

**Current scope:** Local Windows tests exercise actual SDK wire/lifecycle paths with synthetic roots and no account/model calls. No hosted CI, Unix/macOS or sandbox claim.

**Baseline weight:** 16 h (rough). **Remaining:** 3–11 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/cli.test.mjs`, `tests/mcp.test.mjs`, `tests/processes.test.mjs`

## CLI-196 — Document untested platform boundaries

![65% integrated](bars/cli-196.svg)

**Objective / acceptance:** Unsupported/skipped coverage cannot be presented as a passing support matrix.

**Current scope:** Local Windows tests exercise actual SDK wire/lifecycle paths with synthetic roots and no account/model calls. No hosted CI, Unix/macOS or sandbox claim.

**Baseline weight:** 16 h (rough). **Remaining:** 3–11 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/cli.test.mjs`, `tests/mcp.test.mjs`, `tests/processes.test.mjs`

## CLI-197 — Use minimal operation permissions

![65% integrated](bars/cli-197.svg)

**Objective / acceptance:** Local file/network/process capabilities are separated and no global settings are widened.

**Current scope:** Local Windows tests exercise actual SDK wire/lifecycle paths with synthetic roots and no account/model calls. No hosted CI, Unix/macOS or sandbox claim.

**Baseline weight:** 16 h (rough). **Remaining:** 3–11 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/cli.test.mjs`, `tests/mcp.test.mjs`, `tests/processes.test.mjs`

## CLI-198 — Keep Codex safety controls intact

![65% integrated](bars/cli-198.svg)

**Objective / acceptance:** MTerm never installs automatic approval bypasses for convenience.

**Current scope:** Local Windows tests exercise actual SDK wire/lifecycle paths with synthetic roots and no account/model calls. No hosted CI, Unix/macOS or sandbox claim.

**Baseline weight:** 16 h (rough). **Remaining:** 3–11 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/cli.test.mjs`, `tests/mcp.test.mjs`, `tests/processes.test.mjs`

## CLI-199 — Validate executable and managed-install paths

![0% not_started](bars/cli-199.svg)

**Objective / acceptance:** Untrusted config cannot redirect updates or execution outside owned/trusted locations silently.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 16 h (rough). **Remaining:** 8–32 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-200 — Sanitize diagnostics consistently

![65% integrated](bars/cli-200.svg)

**Objective / acceptance:** Sentinel credentials are absent from normal errors, debug logs and support reports.

**Current scope:** Local Windows tests exercise actual SDK wire/lifecycle paths with synthetic roots and no account/model calls. No hosted CI, Unix/macOS or sandbox claim.

**Baseline weight:** 16 h (rough). **Remaining:** 3–11 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/cli.test.mjs`, `tests/mcp.test.mjs`, `tests/processes.test.mjs`

## CLI-201 — Restrict credential-bearing endpoint origins

![0% not_started](bars/cli-201.svg)

**Objective / acceptance:** Arbitrary endpoints/redirects cannot receive auth headers.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 16 h (rough). **Remaining:** 8–32 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-202 — Reject insecure TLS behavior

![65% integrated](bars/cli-202.svg)

**Objective / acceptance:** No insecure TLS flags or certificate-validation disablement are added.

**Current scope:** Local Windows tests exercise actual SDK wire/lifecycle paths with synthetic roots and no account/model calls. No hosted CI, Unix/macOS or sandbox claim.

**Baseline weight:** 16 h (rough). **Remaining:** 3–11 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/cli.test.mjs`, `tests/mcp.test.mjs`, `tests/processes.test.mjs`

## CLI-203 — Prevent silent quota evasion

![0% not_started](bars/cli-203.svg)

**Objective / acceptance:** No account switching, route fallback or repeated submission is used to avoid product limits.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 16 h (rough). **Remaining:** 8–32 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-204 — Keep browser access legitimate

![0% not_started](bars/cli-204.svg)

**Objective / acceptance:** No session theft, cookie export, CAPTCHA bypass or unsupported privilege escalation.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 16 h (rough). **Remaining:** 8–32 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-205 — Keep default operation daemon-free

![65% integrated](bars/cli-205.svg)

**Objective / acceptance:** No persistent updater/status worker/listener or OS startup registration is installed.

**Current scope:** Local Windows tests exercise actual SDK wire/lifecycle paths with synthetic roots and no account/model calls. No hosted CI, Unix/macOS or sandbox claim.

**Baseline weight:** 16 h (rough). **Remaining:** 3–11 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/cli.test.mjs`, `tests/mcp.test.mjs`, `tests/processes.test.mjs`

## CLI-206 — Separate fixture and real credentials

![65% integrated](bars/cli-206.svg)

**Objective / acceptance:** Fixture endpoints/modes cannot read the real user auth home.

**Current scope:** Local Windows tests exercise actual SDK wire/lifecycle paths with synthetic roots and no account/model calls. No hosted CI, Unix/macOS or sandbox claim.

**Baseline weight:** 16 h (rough). **Remaining:** 3–11 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/cli.test.mjs`, `tests/mcp.test.mjs`, `tests/processes.test.mjs`

## CLI-207 — Create the root CLI workflow

![65% integrated](bars/cli-207.svg)

**Objective / acceptance:** The actual .github/workflows/cli-ci.yml is present and readable on the intended branch.

**Current scope:** Actual root workflow installed/read back on PR52, with four OS/architecture jobs. Job execution is account-blocked; presence is not platform acceptance.

**Baseline weight:** 16 h (rough). **Remaining:** 1–6 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `docs/plans/2026-10-04-local-mcp.md`, `docs/validation/2026-10-05-codex-parity-foundation.md`

## CLI-208 — Pin workflow actions and permissions

![85% validated](bars/cli-208.svg)

**Objective / acceptance:** Third-party action refs and least-privilege settings are reviewed.

**Current scope:** Third-party actions are exact-commit pinned; contents-read, no persisted checkout credential, exact Node/Codex tests and no model/auth calls. Runtime jobs remain blocked.

**Baseline weight:** 16 h (rough). **Remaining:** 1–6 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `docs/plans/2026-10-04-local-mcp.md`, `docs/validation/2026-10-05-codex-parity-foundation.md`

## CLI-209 — Run credential-free status JSON in CI

![65% integrated](bars/cli-209.svg)

**Objective / acceptance:** A temporary dummy auth plus offline/mock provider exercises the real normalization path.

**Current scope:** Local Windows tests exercise actual SDK wire/lifecycle paths with synthetic roots and no account/model calls. No hosted CI, Unix/macOS or sandbox claim.

**Baseline weight:** 16 h (rough). **Remaining:** 3–11 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/cli.test.mjs`, `tests/mcp.test.mjs`, `tests/processes.test.mjs`

## CLI-210 — Block external network in fixture tests

![65% integrated](bars/cli-210.svg)

**Objective / acceptance:** Dummy or real secrets cannot reach ChatGPT from the test suite.

**Current scope:** Local Windows tests exercise actual SDK wire/lifecycle paths with synthetic roots and no account/model calls. No hosted CI, Unix/macOS or sandbox claim.

**Baseline weight:** 16 h (rough). **Remaining:** 3–11 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/cli.test.mjs`, `tests/mcp.test.mjs`, `tests/processes.test.mjs`

## CLI-211 — Test missing auth and expired-token failures

![65% integrated](bars/cli-211.svg)

**Objective / acceptance:** CI validates failure schemas as well as a happy-path usage snapshot.

**Current scope:** Local Windows tests exercise actual SDK wire/lifecycle paths with synthetic roots and no account/model calls. No hosted CI, Unix/macOS or sandbox claim.

**Baseline weight:** 16 h (rough). **Remaining:** 3–11 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/cli.test.mjs`, `tests/mcp.test.mjs`, `tests/processes.test.mjs`

## CLI-212 — Run typecheck/lint/unit/integration gates

![65% integrated](bars/cli-212.svg)

**Objective / acceptance:** Commands fail the job on actual errors rather than relying on final echo output.

**Current scope:** Local Windows tests exercise actual SDK wire/lifecycle paths with synthetic roots and no account/model calls. No hosted CI, Unix/macOS or sandbox claim.

**Baseline weight:** 16 h (rough). **Remaining:** 3–11 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/cli.test.mjs`, `tests/mcp.test.mjs`, `tests/processes.test.mjs`

## CLI-213 — Run update failure-injection tests

![0% not_started](bars/cli-213.svg)

**Objective / acceptance:** Hash, download, archive, lock, activation and rollback failures are covered.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 16 h (rough). **Remaining:** 8–32 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-214 — Run clean link/pack/install tests

![85% validated](bars/cli-214.svg)

**Objective / acceptance:** The produced CLI installs and runs outside the developer checkout without GUI dependencies.

**Current scope:** Fresh production tarball, offline npm exec MCP8aliases, isolated prefix link and actual Windows shim all passed. Cross-platform installed proof still pending.

**Baseline weight:** 16 h (rough). **Remaining:** 1–6 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/cli.test.mjs`, `tests/mcp.test.mjs`, `tests/processes.test.mjs`, `docs/validation/2026-10-05-codex-parity-foundation.md`

## CLI-215 — Run all claimed OS/architecture jobs

![10% planned](bars/cli-215.svg)

**Objective / acceptance:** Missing runners remain visible; a Windows-only local result is not cross-platform acceptance.

**Current scope:** Content/workflow publication is now verified. Current unmerged PR52 and actual account-blocked hosted verification remain distinct from product acceptance.

**Baseline weight:** 16 h (rough). **Remaining:** 7–29 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** Hosted CI cannot start: GitHub account payment/spending-limit gate. Owner resolution needed; no billing or protection changes authorized..

**Evidence:** `docs/plans/2026-10-04-local-mcp.md`, `docs/validation/2026-10-05-codex-parity-foundation.md`

## CLI-216 — Inspect real workflow conclusions

![85% validated](bars/cli-216.svg)

**Objective / acceptance:** Written, queued, skipped, failed and passed workflows are distinguished.

**Current scope:** Read actual run/job/check annotations: jobs did not start due to account payment/spending-limit gate. Explicitly not code PASS, failure-in-test or skipped-platform success.

**Baseline weight:** 16 h (rough). **Remaining:** 1–6 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `docs/plans/2026-10-04-local-mcp.md`, `docs/validation/2026-10-05-codex-parity-foundation.md`

## CLI-217 — Keep model tests opt-in

![65% integrated](bars/cli-217.svg)

**Objective / acceptance:** No routine CI job submits paid/token-consuming coding or Web requests.

**Current scope:** Local Windows tests exercise actual SDK wire/lifecycle paths with synthetic roots and no account/model calls. No hosted CI, Unix/macOS or sandbox claim.

**Baseline weight:** 16 h (rough). **Remaining:** 3–11 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/cli.test.mjs`, `tests/mcp.test.mjs`, `tests/processes.test.mjs`

## CLI-218 — Preserve GUI regression evidence

![0% not_started](bars/cli-218.svg)

**Objective / acceptance:** Migration acceptance runs the existing GUI native/reference gates rather than only CLI tests.

**Current scope:** Requirement preserved; no implementation or acceptance evidence in this local candidate.

**Baseline weight:** 16 h (rough). **Remaining:** 8–32 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** None; no implementation credit.

## CLI-219 — Create a separate CLI requirement catalog

![65% integrated](bars/cli-219.svg)

**Objective / acceptance:** Every original request maps to stable CLI IDs without importing GUI progress credit.

**Current scope:** All300 IDs retained in reviewed catalog. Local SVG/Markdown/JSON/offline HTML plus explicit review and stale-source/output tests; hosted publication/browser-matrix validation pending.

**Baseline weight:** 8 h (rough). **Remaining:** 1–6 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `scripts/roadmap.mjs`, `tests/roadmap.test.mjs`

## CLI-220 — Expand the atomic seed inventory

![65% integrated](bars/cli-220.svg)

**Objective / acceptance:** Each item receives verbose scope, acceptance, dependencies, paths and test evidence.

**Current scope:** All300 IDs retained in reviewed catalog. Local SVG/Markdown/JSON/offline HTML plus explicit review and stale-source/output tests; hosted publication/browser-matrix validation pending.

**Baseline weight:** 8 h (rough). **Remaining:** 1–6 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `scripts/roadmap.mjs`, `tests/roadmap.test.mjs`

## CLI-221 — Keep conditional and blocked requirements visible

![65% integrated](bars/cli-221.svg)

**Objective / acceptance:** Web/size/auth/platform conflicts cannot disappear from the denominator without approved scope change.

**Current scope:** All300 IDs retained in reviewed catalog. Local SVG/Markdown/JSON/offline HTML plus explicit review and stale-source/output tests; hosted publication/browser-matrix validation pending.

**Baseline weight:** 8 h (rough). **Remaining:** 1–6 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `scripts/roadmap.mjs`, `tests/roadmap.test.mjs`

## CLI-222 — Use evidence-backed stage credit

![65% integrated](bars/cli-222.svg)

**Objective / acceptance:** 0/10/40/65/85/100 stage semantics have explicit acceptance criteria.

**Current scope:** All300 IDs retained in reviewed catalog. Local SVG/Markdown/JSON/offline HTML plus explicit review and stale-source/output tests; hosted publication/browser-matrix validation pending.

**Baseline weight:** 8 h (rough). **Remaining:** 1–6 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `scripts/roadmap.mjs`, `tests/roadmap.test.mjs`

## CLI-223 — Freeze baseline weights per task

![65% integrated](bars/cli-223.svg)

**Objective / acceptance:** Weights cannot be adjusted just to increase the reported overall percentage.

**Current scope:** All300 IDs retained in reviewed catalog. Local SVG/Markdown/JSON/offline HTML plus explicit review and stale-source/output tests; hosted publication/browser-matrix validation pending.

**Baseline weight:** 8 h (rough). **Remaining:** 1–6 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `scripts/roadmap.mjs`, `tests/roadmap.test.mjs`

## CLI-224 — Compute weighted overall CLI maturity

![65% integrated](bars/cli-224.svg)

**Objective / acceptance:** Math is deterministic and tested; requirement count is not treated as effort.

**Current scope:** All300 IDs retained in reviewed catalog. Local SVG/Markdown/JSON/offline HTML plus explicit review and stale-source/output tests; hosted publication/browser-matrix validation pending.

**Baseline weight:** 8 h (rough). **Remaining:** 1–6 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `scripts/roadmap.mjs`, `tests/roadmap.test.mjs`

## CLI-225 — Show independent GUI and CLI README bars

![10% planned](bars/cli-225.svg)

**Objective / acceptance:** MTerm-GUI README links its GUI bar/roadmap and MTerm-CLI README links its CLI bar/roadmap; both link the sibling product.

**Current scope:** GUI remains unchanged with its separate history/metrics. CLI does not inherit GUI credit or claim GUI recertification in this pass.

**Baseline weight:** 8 h (rough). **Remaining:** 4–14 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `docs/REPOSITORY_SPLIT.md`

## CLI-226 — Preserve GUI percentage during repository export

![10% planned](bars/cli-226.svg)

**Objective / acceptance:** Repository export alone confers no additional GUI implementation credit.

**Current scope:** GUI remains unchanged with its separate history/metrics. CLI does not inherit GUI credit or claim GUI recertification in this pass.

**Baseline weight:** 8 h (rough). **Remaining:** 4–14 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `docs/REPOSITORY_SPLIT.md`

## CLI-227 — Render color-coded per-item and area bars

![65% integrated](bars/cli-227.svg)

**Objective / acceptance:** Accessible text accompanies local SVG colors; blockers retain earned credit.

**Current scope:** All300 IDs retained in reviewed catalog. Local SVG/Markdown/JSON/offline HTML plus explicit review and stale-source/output tests; hosted publication/browser-matrix validation pending.

**Baseline weight:** 8 h (rough). **Remaining:** 1–6 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `scripts/roadmap.mjs`, `tests/roadmap.test.mjs`

## CLI-228 — Publish a verbose numbered feature table

![65% integrated](bars/cli-228.svg)

**Objective / acceptance:** Every CLI requirement has percentage, remaining effort, ETA state, evidence and blocker.

**Current scope:** All300 IDs retained in reviewed catalog. Local SVG/Markdown/JSON/offline HTML plus explicit review and stale-source/output tests; hosted publication/browser-matrix validation pending.

**Baseline weight:** 8 h (rough). **Remaining:** 1–6 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `scripts/roadmap.mjs`, `tests/roadmap.test.mjs`

## CLI-229 — Provide an offline searchable dashboard

![65% integrated](bars/cli-229.svg)

**Objective / acceptance:** Search/status/component filters work without external badge or runtime services.

**Current scope:** All300 IDs retained in reviewed catalog. Local SVG/Markdown/JSON/offline HTML plus explicit review and stale-source/output tests; hosted publication/browser-matrix validation pending.

**Baseline weight:** 8 h (rough). **Remaining:** 1–6 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `scripts/roadmap.mjs`, `tests/roadmap.test.mjs`

## CLI-230 — Keep ETA assumptions honest

![65% integrated](bars/cli-230.svg)

**Objective / acceptance:** Calendar dates require an actual capacity/dependency basis; otherwise use Unscheduled.

**Current scope:** All300 IDs retained in reviewed catalog. Local SVG/Markdown/JSON/offline HTML plus explicit review and stale-source/output tests; hosted publication/browser-matrix validation pending.

**Baseline weight:** 8 h (rough). **Remaining:** 1–6 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `scripts/roadmap.mjs`, `tests/roadmap.test.mjs`

## CLI-231 — Record reviewed source/catalog fingerprints

![85% validated](bars/cli-231.svg)

**Objective / acceptance:** Changing CLI source, pins or reviewed settings invalidates stale assessments.

**Current scope:** Reproduced prior clean Git checkout CRLF/LF mismatch and fixed normalized text fingerprints; binary and real source/catalog drift remain detected.

**Baseline weight:** 8 h (rough). **Remaining:** 1–6 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `scripts/roadmap.mjs`, `tests/roadmap.test.mjs`, `docs/validation/2026-10-05-codex-parity-foundation.md`

## CLI-232 — Test exported GUI fingerprint coverage

![10% planned](bars/cli-232.svg)

**Objective / acceptance:** Changes under MTerm-GUI/native and its GUI reference paths are still caught.

**Current scope:** GUI remains unchanged with its separate history/metrics. CLI does not inherit GUI credit or claim GUI recertification in this pass.

**Baseline weight:** 8 h (rough). **Remaining:** 4–14 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `docs/REPOSITORY_SPLIT.md`

## CLI-233 — Enforce metrics at relevant gates

![85% validated](bars/cli-233.svg)

**Objective / acceptance:** Build/package/CI publication checks reject stale reviews rather than silently regenerating credit.

**Current scope:** Normal build/check now enforce both roadmap review and pinned-parity integrity. Forged PASS/closure without evidence is rejected; generated credit is still explicit review.

**Baseline weight:** 8 h (rough). **Remaining:** 1–6 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `scripts/roadmap.mjs`, `tests/roadmap.test.mjs`, `docs/validation/2026-10-05-codex-parity-foundation.md`

## CLI-234 — Update contributor entry points in both repositories

![65% integrated](bars/cli-234.svg)

**Objective / acceptance:** Each repository's AGENTS, templates and existing vendor pointers require metrics maintenance.

**Current scope:** All300 IDs retained in reviewed catalog. Local SVG/Markdown/JSON/offline HTML plus explicit review and stale-source/output tests; hosted publication/browser-matrix validation pending.

**Baseline weight:** 8 h (rough). **Remaining:** 1–6 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `scripts/roadmap.mjs`, `tests/roadmap.test.mjs`

## CLI-235 — Separate rendering from review approval

![65% integrated](bars/cli-235.svg)

**Objective / acceptance:** A render command cannot satisfy the explicit human/AI assessment requirement.

**Current scope:** All300 IDs retained in reviewed catalog. Local SVG/Markdown/JSON/offline HTML plus explicit review and stale-source/output tests; hosted publication/browser-matrix validation pending.

**Baseline weight:** 8 h (rough). **Remaining:** 1–6 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `scripts/roadmap.mjs`, `tests/roadmap.test.mjs`

## CLI-236 — Retain complete cross-repository source-project traceability

![10% planned](bars/cli-236.svg)

**Objective / acceptance:** GUI lineage and the CLI’s three upstream licenses/features remain documented independently.

**Current scope:** GUI remains unchanged with its separate history/metrics. CLI does not inherit GUI credit or claim GUI recertification in this pass.

**Baseline weight:** 8 h (rough). **Remaining:** 4–14 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `docs/REPOSITORY_SPLIT.md`

## CLI-237 — Record actual contributor identity

![65% integrated](bars/cli-237.svg)

**Objective / acceptance:** Provider/model is self-reported accurately or unknown; no invented provenance.

**Current scope:** Vendor-neutral attribution, preserved interrupted work and exact local evidence are recorded. Review fingerprints/checkpoint references updated before final delivery.

**Baseline weight:** 8 h (rough). **Remaining:** 1–6 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `docs/ai/changes/2026-10-04-local-mcp.json`

## CLI-238 — Preserve original authorship

![65% integrated](bars/cli-238.svg)

**Objective / acceptance:** Modified upstream/GUI files retain their origin and receive scoped change references.

**Current scope:** Vendor-neutral attribution, preserved interrupted work and exact local evidence are recorded. Review fingerprints/checkpoint references updated before final delivery.

**Baseline weight:** 8 h (rough). **Remaining:** 1–6 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `docs/ai/changes/2026-10-04-local-mcp.json`

## CLI-239 — Explain non-obvious invariants in comments

![65% integrated](bars/cli-239.svg)

**Objective / acceptance:** Ownership, credential boundaries, units and lifecycle assumptions are visible near relevant code.

**Current scope:** Vendor-neutral attribution, preserved interrupted work and exact local evidence are recorded. Review fingerprints/checkpoint references updated before final delivery.

**Baseline weight:** 8 h (rough). **Remaining:** 1–6 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `docs/ai/changes/2026-10-04-local-mcp.json`

## CLI-240 — Write durable task change records

![65% integrated](bars/cli-240.svg)

**Objective / acceptance:** UTC/base SHA/IDs/files/tests/decisions/limitations/next step are inside the repository.

**Current scope:** Vendor-neutral attribution, preserved interrupted work and exact local evidence are recorded. Review fingerprints/checkpoint references updated before final delivery.

**Baseline weight:** 8 h (rough). **Remaining:** 1–6 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `docs/ai/changes/2026-10-04-local-mcp.json`

## CLI-241 — Record mandatory roadmap_updates

![65% integrated](bars/cli-241.svg)

**Objective / acceptance:** Every source change has a reviewed metric update or a justified no-stage-change review.

**Current scope:** Vendor-neutral attribution, preserved interrupted work and exact local evidence are recorded. Review fingerprints/checkpoint references updated before final delivery.

**Baseline weight:** 8 h (rough). **Remaining:** 1–6 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `docs/ai/changes/2026-10-04-local-mcp.json`

## CLI-242 — Checkpoint migration and vertical slices

![65% integrated](bars/cli-242.svg)

**Objective / acceptance:** Verified bundles/manifests permit recovery without relying on chat memory.

**Current scope:** Vendor-neutral attribution, preserved interrupted work and exact local evidence are recorded. Review fingerprints/checkpoint references updated before final delivery.

**Baseline weight:** 8 h (rough). **Remaining:** 1–6 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `docs/ai/changes/2026-10-04-local-mcp.json`

## CLI-243 — Resume from observed state

![65% integrated](bars/cli-243.svg)

**Objective / acceptance:** Reconnect inspects actual processes/files/logs before repeating a write or install.

**Current scope:** Vendor-neutral attribution, preserved interrupted work and exact local evidence are recorded. Review fingerprints/checkpoint references updated before final delivery.

**Baseline weight:** 8 h (rough). **Remaining:** 1–6 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `docs/ai/changes/2026-10-04-local-mcp.json`

## CLI-244 — Leave vendor-neutral handoff instructions

![65% integrated](bars/cli-244.svg)

**Objective / acceptance:** Another AI company’s model can discover the current source of truth and next task from the repo.

**Current scope:** Vendor-neutral attribution, preserved interrupted work and exact local evidence are recorded. Review fingerprints/checkpoint references updated before final delivery.

**Baseline weight:** 8 h (rough). **Remaining:** 1–6 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `docs/ai/changes/2026-10-04-local-mcp.json`

## CLI-245 — Prepare a reviewable integration PR

![10% planned](bars/cli-245.svg)

**Objective / acceptance:** Migration, implementation, evidence, generated metrics and upstream decisions are inspectable.

**Current scope:** Content/workflow publication is now verified. Current unmerged PR52 and actual account-blocked hosted verification remain distinct from product acceptance.

**Baseline weight:** 8 h (rough). **Remaining:** 4–14 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** Hosted CI cannot start: GitHub account payment/spending-limit gate. Owner resolution needed; no billing or protection changes authorized..

**Evidence:** `docs/plans/2026-10-04-local-mcp.md`, `docs/validation/2026-10-05-codex-parity-foundation.md`

## CLI-246 — Reconcile concurrent upstream changes

![10% planned](bars/cli-246.svg)

**Objective / acceptance:** Merge decisions use refreshed remote hashes and avoid overwriting work added during execution.

**Current scope:** Local development continues; no publication, merge or release claim while GitHub content writes are blocked.

**Baseline weight:** 8 h (rough). **Remaining:** 4–14 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `docs/plans/2026-10-04-local-mcp.md`

## CLI-247 — Merge with expected-head protection

![10% planned](bars/cli-247.svg)

**Objective / acceptance:** Ordinary repository checks/permissions are respected without force or policy changes.

**Current scope:** Content/workflow publication is now verified. Current unmerged PR52 and actual account-blocked hosted verification remain distinct from product acceptance.

**Baseline weight:** 8 h (rough). **Remaining:** 4–14 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** Hosted CI cannot start: GitHub account payment/spending-limit gate. Owner resolution needed; no billing or protection changes authorized..

**Evidence:** `docs/plans/2026-10-04-local-mcp.md`, `docs/validation/2026-10-05-codex-parity-foundation.md`

## CLI-248 — Verify the resulting main tree

![10% planned](bars/cli-248.svg)

**Objective / acceptance:** Fetch and compare remote/local state after the successful merge action.

**Current scope:** Content/workflow publication is now verified. Current unmerged PR52 and actual account-blocked hosted verification remain distinct from product acceptance.

**Baseline weight:** 8 h (rough). **Remaining:** 4–14 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** Hosted CI cannot start: GitHub account payment/spending-limit gate. Owner resolution needed; no billing or protection changes authorized..

**Evidence:** `docs/plans/2026-10-04-local-mcp.md`, `docs/validation/2026-10-05-codex-parity-foundation.md`

## CLI-249 — Select a non-conflicting CLI tag

![10% planned](bars/cli-249.svg)

**Objective / acceptance:** Prefer cli-v0.1.0; a bare v0.1.0 is used only when unused and explicitly scoped.

**Current scope:** Local development continues; no publication, merge or release claim while GitHub content writes are blocked.

**Baseline weight:** 8 h (rough). **Remaining:** 4–14 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `docs/plans/2026-10-04-local-mcp.md`

## CLI-250 — Tag only accepted mandatory scope

![10% planned](bars/cli-250.svg)

**Objective / acceptance:** Required unvalidated Web/size/platform behavior blocks a full release claim unless scope is explicitly revised.

**Current scope:** Local development continues; no publication, merge or release claim while GitHub content writes are blocked.

**Baseline weight:** 8 h (rough). **Remaining:** 4–14 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `docs/plans/2026-10-04-local-mcp.md`

## CLI-251 — Keep tag and package publication distinct

![10% planned](bars/cli-251.svg)

**Objective / acceptance:** No claim that a Git tag automatically published npm assets, signed binaries or releases.

**Current scope:** Local development continues; no publication, merge or release claim while GitHub content writes are blocked.

**Baseline weight:** 8 h (rough). **Remaining:** 4–14 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `docs/plans/2026-10-04-local-mcp.md`

## CLI-252 — Preserve rollback and old branches

![10% planned](bars/cli-252.svg)

**Objective / acceptance:** No destructive history cleanup, tag overwrite or branch deletion is bundled into release.

**Current scope:** Local development continues; no publication, merge or release claim while GitHub content writes are blocked.

**Baseline weight:** 8 h (rough). **Remaining:** 4–14 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `docs/plans/2026-10-04-local-mcp.md`

## CLI-253 — Deliver a complete final evidence report

![10% planned](bars/cli-253.svg)

**Objective / acceptance:** Report exact commands, SHAs, size accounting, compatibility, real CI state and known blockers.

**Current scope:** Local development continues; no publication, merge or release claim while GitHub content writes are blocked.

**Baseline weight:** 8 h (rough). **Remaining:** 4–14 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `docs/plans/2026-10-04-local-mcp.md`

## CLI-254 — Publish runnable setup/update/rollback documentation

![10% planned](bars/cli-254.svg)

**Objective / acceptance:** A fresh user can install, diagnose, use and recover the CLI without hidden developer context.

**Current scope:** Local development continues; no publication, merge or release claim while GitHub content writes are blocked.

**Baseline weight:** 8 h (rough). **Remaining:** 4–14 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `docs/plans/2026-10-04-local-mcp.md`

## CLI-255 — Measure wrapper overhead separately

![40% implementation](bars/cli-255.svg)

**Objective / acceptance:** Startup timing excludes remote model reasoning and distinguishes cold/warm environments.

**Current scope:** Help is lazy, process queues bounded and packed-install verification prepared. Quota-line latency and full-platform bundled footprint are not implemented.

**Baseline weight:** 8 h (rough). **Remaining:** 2–10 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/cli.test.mjs`, `tests/processes.test.mjs`, `package.json`

## CLI-256 — Measure cached statusline latency

![40% implementation](bars/cli-256.svg)

**Objective / acceptance:** The reported timing comes from the real packaged path with a stated environment/sample count.

**Current scope:** Help is lazy, process queues bounded and packed-install verification prepared. Quota-line latency and full-platform bundled footprint are not implemented.

**Baseline weight:** 8 h (rough). **Remaining:** 2–10 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/cli.test.mjs`, `tests/processes.test.mjs`, `package.json`

## CLI-257 — Measure each platform installation

![40% implementation](bars/cli-257.svg)

**Objective / acceptance:** Disk accounting is performed after extraction, including automatically installed requirements.

**Current scope:** Help is lazy, process queues bounded and packed-install verification prepared. Quota-line latency and full-platform bundled footprint are not implemented.

**Baseline weight:** 8 h (rough). **Remaining:** 2–10 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** Complete mandatory Codex/Web/status installed footprint and compatible pins are unverified..

**Evidence:** `tests/cli.test.mjs`, `tests/processes.test.mjs`, `package.json`

## CLI-258 — Prove status/help do not start heavyweight helpers

![40% implementation](bars/cli-258.svg)

**Objective / acceptance:** Process/fixture tests detect accidental browser, GUI, agent or daemon startup.

**Current scope:** Help is lazy, process queues bounded and packed-install verification prepared. Quota-line latency and full-platform bundled footprint are not implemented.

**Baseline weight:** 8 h (rough). **Remaining:** 2–10 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/cli.test.mjs`, `tests/processes.test.mjs`, `package.json`

## CLI-259 — Bound process and log memory

![40% implementation](bars/cli-259.svg)

**Objective / acceptance:** Long command output and helper errors do not accumulate without a configured bound.

**Current scope:** Help is lazy, process queues bounded and packed-install verification prepared. Quota-line latency and full-platform bundled footprint are not implemented.

**Baseline weight:** 8 h (rough). **Remaining:** 2–10 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/cli.test.mjs`, `tests/processes.test.mjs`, `package.json`

## CLI-260 — Test installed behavior rather than only source execution

![85% validated](bars/cli-260.svg)

**Objective / acceptance:** Packaged/link-installed artifacts pass the same representative command contracts.

**Current scope:** Real production tarball install, official-client MCP file round trip outside checkout, isolated-prefix npm link and actual Windows shim passed. No user-global prefix mutation; other platforms and full three-component bundle remain unverified.

**Baseline weight:** 8 h (rough). **Remaining:** 1–2 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `scripts/verify-package.mjs`, `tests/cli.test.mjs`

## CLI-261 — Expose performance regressions honestly

![40% implementation](bars/cli-261.svg)

**Objective / acceptance:** Measured regressions remain visible; no “never slows down” or unlike CLI/GUI comparison claims.

**Current scope:** Help is lazy, process queues bounded and packed-install verification prepared. Quota-line latency and full-platform bundled footprint are not implemented.

**Baseline weight:** 8 h (rough). **Remaining:** 2–10 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/cli.test.mjs`, `tests/processes.test.mjs`, `package.json`

## CLI-262 — Keep development tooling out of runtime

![85% validated](bars/cli-262.svg)

**Objective / acceptance:** Build/test/progress generation dependencies are excluded from installed CLI operation where possible.

**Current scope:** Real production tarball install, official-client MCP file round trip outside checkout, isolated-prefix npm link and actual Windows shim passed. No user-global prefix mutation; other platforms and full three-component bundle remain unverified.

**Baseline weight:** 8 h (rough). **Remaining:** 1–2 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `scripts/verify-package.mjs`, `tests/cli.test.mjs`

## CLI-263 — Define the Today Candidate replacement milestone

![85% validated](bars/cli-263.svg)

**Objective / acceptance:** A documented Windows milestone states the minimum local machine-control features required before claiming the CLI can replace Remote Desktop Commander for ordinary development work.

**Current scope:** Windows local MCP tools exercised through the official SDK. Versioned file saves, bounded literal search/process output and separate write/exec grants. Final all-platform/security/soak acceptance remains.

**Baseline weight:** 16 h (rough). **Remaining:** 1–5 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/files.test.mjs`, `tests/processes.test.mjs`, `tests/mcp.test.mjs`, `tests/git.test.mjs`, `tests/cli.test.mjs`

## CLI-264 — Provide an MCP stdio server entry point

![85% validated](bars/cli-264.svg)

**Objective / acceptance:** `mterm-cli mcp --stdio` performs real MCP initialization and remains usable without a network listener.

**Current scope:** Windows local MCP tools exercised through the official SDK. Versioned file saves, bounded literal search/process output and separate write/exec grants. Final all-platform/security/soak acceptance remains.

**Baseline weight:** 16 h (rough). **Remaining:** 1–5 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/files.test.mjs`, `tests/processes.test.mjs`, `tests/mcp.test.mjs`, `tests/git.test.mjs`, `tests/cli.test.mjs`, `docs/validation/2026-10-05-codex-parity-foundation.md`

## CLI-265 — Publish machine-readable tool capability discovery

![85% validated](bars/cli-265.svg)

**Objective / acceptance:** Clients can discover enabled tools, version, limits and disabled capabilities without guessing.

**Current scope:** Windows local MCP tools exercised through the official SDK. Versioned file saves, bounded literal search/process output and separate write/exec grants. Final all-platform/security/soak acceptance remains.

**Baseline weight:** 16 h (rough). **Remaining:** 1–5 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/files.test.mjs`, `tests/processes.test.mjs`, `tests/mcp.test.mjs`, `tests/git.test.mjs`, `tests/cli.test.mjs`, `docs/validation/2026-10-05-codex-parity-foundation.md`

## CLI-266 — Enforce explicit trusted filesystem roots

![65% integrated](bars/cli-266.svg)

**Objective / acceptance:** Every filesystem/cwd path is confined to configured roots with Windows case/canonicalization handled correctly.

**Current scope:** Conservative root/link checks and live-parent tree cleanup work; hostile filesystem races, directory moves, detached descendants and direct Web relay are not guaranteed. Local candidate is partial, not complete RDC relay replacement.

**Baseline weight:** 16 h (rough). **Remaining:** 3–11 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/files.test.mjs`, `tests/processes.test.mjs`, `tests/mcp.test.mjs`

## CLI-267 — Block symlink/reparse root escapes

![65% integrated](bars/cli-267.svg)

**Objective / acceptance:** Existing and newly created paths cannot traverse an allowed root through symlink/reparse-point indirection.

**Current scope:** Conservative root/link checks and live-parent tree cleanup work; hostile filesystem races, directory moves, detached descendants and direct Web relay are not guaranteed. Local candidate is partial, not complete RDC relay replacement.

**Baseline weight:** 16 h (rough). **Remaining:** 3–11 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/files.test.mjs`, `tests/processes.test.mjs`, `tests/mcp.test.mjs`

## CLI-268 — Implement bounded file read

![85% validated](bars/cli-268.svg)

**Objective / acceptance:** Read supports useful ranges/metadata while enforcing maximum bytes and UTF-8/binary diagnostics.

**Current scope:** Windows local MCP tools exercised through the official SDK. Versioned file saves, bounded literal search/process output and separate write/exec grants. Final all-platform/security/soak acceptance remains.

**Baseline weight:** 16 h (rough). **Remaining:** 1–5 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/files.test.mjs`, `tests/processes.test.mjs`, `tests/mcp.test.mjs`, `tests/git.test.mjs`, `tests/cli.test.mjs`, `docs/validation/2026-10-05-codex-parity-foundation.md`

## CLI-269 — Implement atomic bounded file write/create

![85% validated](bars/cli-269.svg)

**Objective / acceptance:** Writes use owned temporary staging/replace semantics and never truncate a target on validation failure.

**Current scope:** Windows local MCP tools exercised through the official SDK. Versioned file saves, bounded literal search/process output and separate write/exec grants. Final all-platform/security/soak acceptance remains.

**Baseline weight:** 16 h (rough). **Remaining:** 1–5 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/files.test.mjs`, `tests/processes.test.mjs`, `tests/mcp.test.mjs`, `tests/git.test.mjs`, `tests/cli.test.mjs`, `docs/validation/2026-10-05-codex-parity-foundation.md`

## CLI-270 — Implement directory listing

![85% validated](bars/cli-270.svg)

**Objective / acceptance:** Listing differentiates files/directories, is bounded, and cannot enumerate outside trusted roots.

**Current scope:** Windows local MCP tools exercised through the official SDK. Versioned file saves, bounded literal search/process output and separate write/exec grants. Final all-platform/security/soak acceptance remains.

**Baseline weight:** 16 h (rough). **Remaining:** 1–5 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/files.test.mjs`, `tests/processes.test.mjs`, `tests/mcp.test.mjs`, `tests/git.test.mjs`, `tests/cli.test.mjs`, `docs/validation/2026-10-05-codex-parity-foundation.md`

## CLI-271 — Implement safe move/rename

![65% integrated](bars/cli-271.svg)

**Objective / acceptance:** Source and destination remain inside trusted roots and cross-boundary/reparse escapes fail closed.

**Current scope:** Conservative root/link checks and live-parent tree cleanup work; hostile filesystem races, directory moves, detached descendants and direct Web relay are not guaranteed. Local candidate is partial, not complete RDC relay replacement.

**Baseline weight:** 16 h (rough). **Remaining:** 3–11 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/files.test.mjs`, `tests/processes.test.mjs`, `tests/mcp.test.mjs`, `docs/validation/2026-10-05-codex-parity-foundation.md`

## CLI-272 — Implement file metadata inspection

![85% validated](bars/cli-272.svg)

**Objective / acceptance:** Size/type/timestamps and useful text metadata are returned without reading unbounded content.

**Current scope:** Windows local MCP tools exercised through the official SDK. Versioned file saves, bounded literal search/process output and separate write/exec grants. Final all-platform/security/soak acceptance remains.

**Baseline weight:** 16 h (rough). **Remaining:** 1–5 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/files.test.mjs`, `tests/processes.test.mjs`, `tests/mcp.test.mjs`, `tests/git.test.mjs`, `tests/cli.test.mjs`, `docs/validation/2026-10-05-codex-parity-foundation.md`

## CLI-273 — Implement bounded filename search

![85% validated](bars/cli-273.svg)

**Objective / acceptance:** Search has depth/result/time limits and ignores expensive development trees by policy unless explicitly included.

**Current scope:** Windows local MCP tools exercised through the official SDK. Versioned file saves, bounded literal search/process output and separate write/exec grants. Final all-platform/security/soak acceptance remains.

**Baseline weight:** 16 h (rough). **Remaining:** 1–5 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/files.test.mjs`, `tests/processes.test.mjs`, `tests/mcp.test.mjs`, `tests/git.test.mjs`, `tests/cli.test.mjs`

## CLI-274 — Implement bounded content search

![85% validated](bars/cli-274.svg)

**Objective / acceptance:** Text search enforces file-size/result/time limits and returns safe context without secret/log flooding.

**Current scope:** Windows local MCP tools exercised through the official SDK. Versioned file saves, bounded literal search/process output and separate write/exec grants. Final all-platform/security/soak acceptance remains.

**Baseline weight:** 16 h (rough). **Remaining:** 1–5 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/files.test.mjs`, `tests/processes.test.mjs`, `tests/mcp.test.mjs`, `tests/git.test.mjs`, `tests/cli.test.mjs`

## CLI-275 — Implement structured process start

![85% validated](bars/cli-275.svg)

**Objective / acceptance:** The tool accepts executable plus argument array/cwd/env subset, avoids shell interpolation by default, and records ownership.

**Current scope:** Windows local MCP tools exercised through the official SDK. Versioned file saves, bounded literal search/process output and separate write/exec grants. Final all-platform/security/soak acceptance remains.

**Baseline weight:** 16 h (rough). **Remaining:** 1–5 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/files.test.mjs`, `tests/processes.test.mjs`, `tests/mcp.test.mjs`, `tests/git.test.mjs`, `tests/cli.test.mjs`

## CLI-276 — Gate executable/process capability explicitly

![85% validated](bars/cli-276.svg)

**Objective / acceptance:** Process tools are unavailable unless the MCP server is started with the documented execution capability enabled.

**Current scope:** Windows local MCP tools exercised through the official SDK. Versioned file saves, bounded literal search/process output and separate write/exec grants. Final all-platform/security/soak acceptance remains.

**Baseline weight:** 16 h (rough). **Remaining:** 1–5 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/files.test.mjs`, `tests/processes.test.mjs`, `tests/mcp.test.mjs`, `tests/git.test.mjs`, `tests/cli.test.mjs`

## CLI-277 — Implement process output polling

![85% validated](bars/cli-277.svg)

**Objective / acceptance:** Output has cursor/offset semantics, stdout/stderr identity, byte bounds and explicit truncation state.

**Current scope:** Windows local MCP tools exercised through the official SDK. Versioned file saves, bounded literal search/process output and separate write/exec grants. Final all-platform/security/soak acceptance remains.

**Baseline weight:** 16 h (rough). **Remaining:** 1–5 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/files.test.mjs`, `tests/processes.test.mjs`, `tests/mcp.test.mjs`, `tests/git.test.mjs`, `tests/cli.test.mjs`

## CLI-278 — Implement process stdin interaction

![85% validated](bars/cli-278.svg)

**Objective / acceptance:** Input targets only a currently owned live session and reports closed/blocked/error state safely.

**Current scope:** Windows local MCP tools exercised through the official SDK. Versioned file saves, bounded literal search/process output and separate write/exec grants. Final all-platform/security/soak acceptance remains.

**Baseline weight:** 16 h (rough). **Remaining:** 1–5 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/files.test.mjs`, `tests/processes.test.mjs`, `tests/mcp.test.mjs`, `tests/git.test.mjs`, `tests/cli.test.mjs`

## CLI-279 — Implement owned process/session listing

![85% validated](bars/cli-279.svg)

**Objective / acceptance:** Clients can enumerate MTerm-owned sessions without treating unrelated machine processes as owned.

**Current scope:** Windows local MCP tools exercised through the official SDK. Versioned file saves, bounded literal search/process output and separate write/exec grants. Final all-platform/security/soak acceptance remains.

**Baseline weight:** 16 h (rough). **Remaining:** 1–5 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/files.test.mjs`, `tests/processes.test.mjs`, `tests/mcp.test.mjs`, `tests/git.test.mjs`, `tests/cli.test.mjs`

## CLI-280 — Implement owned process termination

![85% validated](bars/cli-280.svg)

**Objective / acceptance:** Termination affects only the selected owned session and reports whether descendants were cleaned up.

**Current scope:** Windows local MCP tools exercised through the official SDK. Versioned file saves, bounded literal search/process output and separate write/exec grants. Final all-platform/security/soak acceptance remains.

**Baseline weight:** 16 h (rough). **Remaining:** 1–5 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/files.test.mjs`, `tests/processes.test.mjs`, `tests/mcp.test.mjs`, `tests/git.test.mjs`, `tests/cli.test.mjs`

## CLI-281 — Implement process-tree cleanup tests

![65% integrated](bars/cli-281.svg)

**Objective / acceptance:** Representative child/grandchild fixtures verify shutdown semantics on Windows and document remaining platform gaps.

**Current scope:** Conservative root/link checks and live-parent tree cleanup work; hostile filesystem races, directory moves, detached descendants and direct Web relay are not guaranteed. Local candidate is partial, not complete RDC relay replacement.

**Baseline weight:** 16 h (rough). **Remaining:** 3–11 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/files.test.mjs`, `tests/processes.test.mjs`, `tests/mcp.test.mjs`

## CLI-282 — Implement local system information

![85% validated](bars/cli-282.svg)

**Objective / acceptance:** OS/architecture/runtime/host information is available without exposing credentials or private user data.

**Current scope:** Windows local MCP tools exercised through the official SDK. Versioned file saves, bounded literal search/process output and separate write/exec grants. Final all-platform/security/soak acceptance remains.

**Baseline weight:** 16 h (rough). **Remaining:** 1–5 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/files.test.mjs`, `tests/processes.test.mjs`, `tests/mcp.test.mjs`, `tests/git.test.mjs`, `tests/cli.test.mjs`

## CLI-283 — Implement read-only Git status

![85% validated](bars/cli-283.svg)

**Objective / acceptance:** A trusted workspace can return repository status without shell interpolation or mutation.

**Current scope:** Windows local MCP tools exercised through the official SDK. Versioned file saves, bounded literal search/process output and separate write/exec grants. Final all-platform/security/soak acceptance remains.

**Baseline weight:** 16 h (rough). **Remaining:** 1–5 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/files.test.mjs`, `tests/processes.test.mjs`, `tests/mcp.test.mjs`, `tests/git.test.mjs`, `tests/cli.test.mjs`

## CLI-284 — Implement read-only Git diff/summary

![85% validated](bars/cli-284.svg)

**Objective / acceptance:** Bounded diff/status data can be inspected without staging, committing, fetching or pushing.

**Current scope:** Windows local MCP tools exercised through the official SDK. Versioned file saves, bounded literal search/process output and separate write/exec grants. Final all-platform/security/soak acceptance remains.

**Baseline weight:** 16 h (rough). **Remaining:** 1–5 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/files.test.mjs`, `tests/processes.test.mjs`, `tests/mcp.test.mjs`, `tests/git.test.mjs`, `tests/cli.test.mjs`

## CLI-285 — Bound retained process/log memory

![85% validated](bars/cli-285.svg)

**Objective / acceptance:** Long-running command output cannot grow the MCP server without a configured hard bound.

**Current scope:** Windows local MCP tools exercised through the official SDK. Versioned file saves, bounded literal search/process output and separate write/exec grants. Final all-platform/security/soak acceptance remains.

**Baseline weight:** 16 h (rough). **Remaining:** 1–5 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/files.test.mjs`, `tests/processes.test.mjs`, `tests/mcp.test.mjs`, `tests/git.test.mjs`, `tests/cli.test.mjs`

## CLI-286 — Bound concurrent sessions and tool work

![85% validated](bars/cli-286.svg)

**Objective / acceptance:** Explicit limits prevent unbounded processes, searches, file reads or queued requests.

**Current scope:** Windows local MCP tools exercised through the official SDK. Versioned file saves, bounded literal search/process output and separate write/exec grants. Final all-platform/security/soak acceptance remains.

**Baseline weight:** 16 h (rough). **Remaining:** 1–5 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/files.test.mjs`, `tests/processes.test.mjs`, `tests/mcp.test.mjs`, `tests/git.test.mjs`, `tests/cli.test.mjs`

## CLI-287 — Provide stable local-tool error contracts

![85% validated](bars/cli-287.svg)

**Objective / acceptance:** Root violation, missing file, disabled execution, timeout, truncation and dead session are distinguishable machine-readable failures.

**Current scope:** Windows local MCP tools exercised through the official SDK. Versioned file saves, bounded literal search/process output and separate write/exec grants. Final all-platform/security/soak acceptance remains.

**Baseline weight:** 16 h (rough). **Remaining:** 1–5 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/files.test.mjs`, `tests/processes.test.mjs`, `tests/mcp.test.mjs`, `tests/git.test.mjs`, `tests/cli.test.mjs`

## CLI-288 — Preserve cancellation and MCP shutdown

![85% validated](bars/cli-288.svg)

**Objective / acceptance:** Client disconnect/server exit cancels or cleanly resolves owned transient work according to documented policy.

**Current scope:** Windows local MCP tools exercised through the official SDK. Versioned file saves, bounded literal search/process output and separate write/exec grants. Final all-platform/security/soak acceptance remains.

**Baseline weight:** 16 h (rough). **Remaining:** 1–5 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/files.test.mjs`, `tests/processes.test.mjs`, `tests/mcp.test.mjs`, `tests/git.test.mjs`, `tests/cli.test.mjs`

## CLI-289 — Default to no public listener

![85% validated](bars/cli-289.svg)

**Objective / acceptance:** Today Candidate uses stdio/local-only transport and opens no TCP/HTTP port by default.

**Current scope:** Windows local MCP tools exercised through the official SDK. Versioned file saves, bounded literal search/process output and separate write/exec grants. Final all-platform/security/soak acceptance remains.

**Baseline weight:** 16 h (rough). **Remaining:** 1–5 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/files.test.mjs`, `tests/processes.test.mjs`, `tests/mcp.test.mjs`, `tests/git.test.mjs`, `tests/cli.test.mjs`

## CLI-290 — Require explicit opt-in for any network transport

![65% integrated](bars/cli-290.svg)

**Objective / acceptance:** Future HTTP/remote transport requires authentication, origin/bind policy and separate review rather than inheriting stdio trust.

**Current scope:** Conservative root/link checks and live-parent tree cleanup work; hostile filesystem races, directory moves, detached descendants and direct Web relay are not guaranteed. Local candidate is partial, not complete RDC relay replacement.

**Baseline weight:** 16 h (rough). **Remaining:** 3–11 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/files.test.mjs`, `tests/processes.test.mjs`, `tests/mcp.test.mjs`

## CLI-291 — Implement local-tool doctor/capability report

![85% validated](bars/cli-291.svg)

**Objective / acceptance:** `mterm-cli doctor` clearly reports trusted roots, execution enablement, MCP support and dependencies without secrets.

**Current scope:** Windows local MCP tools exercised through the official SDK. Versioned file saves, bounded literal search/process output and separate write/exec grants. Final all-platform/security/soak acceptance remains.

**Baseline weight:** 16 h (rough). **Remaining:** 1–5 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/files.test.mjs`, `tests/processes.test.mjs`, `tests/mcp.test.mjs`, `tests/git.test.mjs`, `tests/cli.test.mjs`

## CLI-292 — Implement Codex MCP registration guidance/helper

![85% validated](bars/cli-292.svg)

**Objective / acceptance:** A supported, reversible setup path registers MTerm's MCP server with Codex without overwriting unrelated Codex configuration.

**Current scope:** Managed --apply setup/removal, exact ownership and backup conflict handling passed on source and real installed artifact with Codex0.160.1, unrelated config preserved; no actual agent model call.

**Baseline weight:** 16 h (rough). **Remaining:** 1–5 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/files.test.mjs`, `tests/processes.test.mjs`, `tests/mcp.test.mjs`, `tests/git.test.mjs`, `tests/cli.test.mjs`, `docs/validation/2026-10-05-codex-parity-foundation.md`

## CLI-293 — Smoke-test MCP initialize and tool listing through stdio

![85% validated](bars/cli-293.svg)

**Objective / acceptance:** A real subprocess protocol fixture completes initialize, initialized notification, tools/list and clean shutdown.

**Current scope:** Windows local MCP tools exercised through the official SDK. Versioned file saves, bounded literal search/process output and separate write/exec grants. Final all-platform/security/soak acceptance remains.

**Baseline weight:** 16 h (rough). **Remaining:** 1–5 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/files.test.mjs`, `tests/processes.test.mjs`, `tests/mcp.test.mjs`, `tests/git.test.mjs`, `tests/cli.test.mjs`, `docs/validation/2026-10-05-codex-parity-foundation.md`

## CLI-294 — Smoke-test file round trip through MCP

![85% validated](bars/cli-294.svg)

**Objective / acceptance:** A temporary trusted root is used to create/read/list/move a fixture with exact expected content and no outside writes.

**Current scope:** Windows local MCP tools exercised through the official SDK. Versioned file saves, bounded literal search/process output and separate write/exec grants. Final all-platform/security/soak acceptance remains.

**Baseline weight:** 16 h (rough). **Remaining:** 1–5 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/files.test.mjs`, `tests/processes.test.mjs`, `tests/mcp.test.mjs`, `tests/git.test.mjs`, `tests/cli.test.mjs`, `docs/validation/2026-10-05-codex-parity-foundation.md`

## CLI-295 — Smoke-test process round trip through MCP

![85% validated](bars/cli-295.svg)

**Objective / acceptance:** A deterministic child process starts, emits output, accepts input when applicable, and terminates without orphaning unrelated work.

**Current scope:** Windows local MCP tools exercised through the official SDK. Versioned file saves, bounded literal search/process output and separate write/exec grants. Final all-platform/security/soak acceptance remains.

**Baseline weight:** 16 h (rough). **Remaining:** 1–5 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/files.test.mjs`, `tests/processes.test.mjs`, `tests/mcp.test.mjs`, `tests/git.test.mjs`, `tests/cli.test.mjs`

## CLI-296 — Test negative root and execution-policy cases

![85% validated](bars/cli-296.svg)

**Objective / acceptance:** Outside-root access and process execution without explicit enablement fail without side effects.

**Current scope:** Windows local MCP tools exercised through the official SDK. Versioned file saves, bounded literal search/process output and separate write/exec grants. Final all-platform/security/soak acceptance remains.

**Baseline weight:** 16 h (rough). **Remaining:** 1–5 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/files.test.mjs`, `tests/processes.test.mjs`, `tests/mcp.test.mjs`, `tests/git.test.mjs`, `tests/cli.test.mjs`

## CLI-297 — Keep local agent-control startup lightweight

![85% validated](bars/cli-297.svg)

**Objective / acceptance:** `--help`, doctor and MCP startup do not initialize browser/Electron/Web-provider/quota clients.

**Current scope:** Windows local MCP tools exercised through the official SDK. Versioned file saves, bounded literal search/process output and separate write/exec grants. Final all-platform/security/soak acceptance remains.

**Baseline weight:** 16 h (rough). **Remaining:** 1–5 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/files.test.mjs`, `tests/processes.test.mjs`, `tests/mcp.test.mjs`, `tests/git.test.mjs`, `tests/cli.test.mjs`

## CLI-298 — Define GUI/local-tool compatibility contract

![65% integrated](bars/cli-298.svg)

**Objective / acceptance:** MTerm-GUI documents how equivalent native local operations map to the CLI tool vocabulary without runtime coupling.

**Current scope:** Conservative root/link checks and live-parent tree cleanup work; hostile filesystem races, directory moves, detached descendants and direct Web relay are not guaranteed. Local candidate is partial, not complete RDC relay replacement.

**Baseline weight:** 16 h (rough). **Remaining:** 3–11 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/files.test.mjs`, `tests/processes.test.mjs`, `tests/mcp.test.mjs`

## CLI-299 — Define secure ChatGPT Web relay acceptance separately

![65% integrated](bars/cli-299.svg)

**Objective / acceptance:** Direct replacement of Remote Desktop Commander's remote relay remains blocked until an authenticated, reviewed, supported Web-to-local transport is genuinely tested.

**Current scope:** Conservative root/link checks and live-parent tree cleanup work; hostile filesystem races, directory moves, detached descendants and direct Web relay are not guaranteed. Local candidate is partial, not complete RDC relay replacement.

**Baseline weight:** 16 h (rough). **Remaining:** 3–11 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** Web runtime/session/authenticated relay compatibility not verified; no browser or remote listener deployed..

**Evidence:** `tests/files.test.mjs`, `tests/processes.test.mjs`, `tests/mcp.test.mjs`

## CLI-300 — Certify the Windows Today Candidate honestly

![65% integrated](bars/cli-300.svg)

**Objective / acceptance:** A dated evidence report lists the exact commands/tools that work on the authorized Windows workstation, test results, known gaps, and whether Remote Desktop Commander is still required for any stated workflow.

**Current scope:** Conservative root/link checks and live-parent tree cleanup work; hostile filesystem races, directory moves, detached descendants and direct Web relay are not guaranteed. Local candidate is partial, not complete RDC relay replacement.

**Baseline weight:** 16 h (rough). **Remaining:** 3–11 engineer hours. **ETA:** Unscheduled.

**Platform:** Windows Node24 tested for implemented local features; Linux/macOS and Web acceptance pending. **Blocker:** None recorded; incomplete work remains in scope.

**Evidence:** `tests/files.test.mjs`, `tests/processes.test.mjs`, `tests/mcp.test.mjs`, `docs/validation/2026-10-05-codex-parity-foundation.md`
