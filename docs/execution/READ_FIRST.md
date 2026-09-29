# MTerm GUI/CLI implementation prompt — read first

Prepared 25 September 2026 for Dylan's next ChatGPT Web reasoning session.

## What to use

**Use `MTerm_GUI_CLI_Master_Implementation_Prompt.md` as the implementation instruction.** It is self-contained: it contains the current project context, proposed GUI/CLI layout, tool-aware execution rules, compatibility decisions, command contracts, testing/release requirements, and a 262-item numbered acceptance seed.

Paste the complete Markdown into the new conversation, with Remote Desktop Commander and GitHub connected. Alternatively, attach it and explicitly instruct the executor to read the entire file and use it as the implementation specification, not merely summarize it. The executor must recheck live source and access before changes.

`MTerm_CLI_Requirements_Seed.json` is the machine-readable equivalent of Appendix A. It is optional context for importing and expanding the new CLI backlog; the main prompt already contains all 262 entries. It is **not** an implemented product roadmap and grants no completion credit. The implementation session must expand each entry's acceptance criteria, dependencies, platform scope, evidence, estimates and reviewed status.

## What was actually done in this preparation session

The application has **not** been split or modified to implement the CLI. This session performed scoped access checks, inspected the current repository and upstream sources, and authored the handoff files.

### Remote Desktop Commander: verified

Device discovery reported MulattoTechBox online. Create, read-back, rename and second read-back succeeded at:

`C:\Tools\Dev\MTerm\artifacts\prompt-access-20260925T115559Z\write-proof-renamed.txt`

The probe was placed in ignored artifacts, not application source. Repository/status/remote-head reads also succeeded. This does not establish unrestricted host access, administrator privileges, arbitrary ACL changes, or the local Git credential's workflow-write scope.

### GitHub connector: verified

An isolated branch was created from main:

`access-check/cli-prompt-20260925T115559Z`

The connector created and read back an ordinary Markdown file and a workflow file. The latter was manual-only, with its sole job disabled; it was not dispatched. The ordinary-file write commit was `b3ed246bf9ceb45aea71aa18dd07c60e92baf233`. The workflow-file write commit was `d8bbc9c4b644cde40c88942528c10220e3590bd5`.

Evidence paths on that branch:

- `docs/access-checks/20260925T115559Z-cli-prompt.md`
- `.github/workflows/mterm-write-access-probe.yml`

**Main was not modified by the probes.** Keep the branch as access evidence; do not merge the disabled probe workflow into product CI. The older blanket workflow-write blocker should not be reused without checking the actual credential and operation: the current connector's workflow-file write succeeded.

No Actions run, protected merge, tag, release-asset upload, npm publication, local Git push or administrator access was tested in this preparation session. These remain distinct capabilities, not implied by repository permission flags.

## Point-in-time source state

The local checkout was `C:\Tools\Dev\MTerm`, branch `candidate/native-20260923`, HEAD `5b15df023b17dfade85bc7b2c08030733b823b13`; the inspection listed no working-tree changes. Remote main was `9f33a64bd8af31aed19e8955c93c2a065f1ed725`. The existing GUI/native product is a working but incomplete C++/Qt application plus its Electron reference, with its own large roadmap and preservation requirements.

These hashes are observations, not permission for the future executor to overwrite newer work. Reconcile again at execution time.

## Important changes made to the original draft

### Use one monorepo, not permanently separate product branches

The prompt selects `gui/` and `cli/` under the same repository. It keeps root `.git`, active `.github` workflows and global governance in place. A move manifest and preservation tests precede GUI freeze. Existing user profiles, checkpoints, Qt SDKs and path-sensitive caches are not swept into a wildcard move.

### Preserve native Codex; do not assume all three dependencies run in Node

Codex is a native Rust application with Apache-2.0 licensing. MTerm-owned glue can remain MIT and use supported Node LTS; bundling upstream code does not relicense it. The prompt initially targets Node 24 for the glue because Node 20 reached end of life on 30 April 2026. The future session must confirm current supported versions and platform artifacts.

Sources: https://github.com/openai/codex/blob/main/README.md ; https://github.com/openai/codex/blob/main/codex-rs/cli/Cargo.toml ; https://github.com/openai/codex/blob/main/LICENSE ; https://github.com/nodejs/Release/blob/main/schedule.json

### Make the Web integration a real feasibility decision

The inspected codex-chatgpt-web manifests identified 6.1.0, Bun 1.4.0 and an Electron launcher. Its documented architecture uses an authenticated browser session and a launcher-managed bridge/daemon. This is not evidence that it can be embedded unchanged into a Node-only, browser-free, daemon-free package.

The prompt retains the desired Web model integration. It requires a verified compliant adapter or an explicitly approved change to the constraints. Safe core-CLI work may continue independently, but it cannot be called completion of the full three-component request while the Web requirement is blocked. A static list of model names is not proof of routing those models.

Sources: https://github.com/miuuyy/codex-chatgpt-web/blob/main/package.json ; https://github.com/miuuyy/codex-chatgpt-web/blob/main/launcher/package.json ; https://github.com/miuuyy/codex-chatgpt-web/blob/main/docs/architecture.md

### Separate browser authentication, Codex credentials and quota domains

Reusing Codex authentication does not establish a browser login. Codex can use an OS keyring, so auth.json is not guaranteed to exist. The pi status implementation also supports other credential stores, may refresh tokens, and can update its credential file. The adapter must make source selection explicit, preserve unrelated configuration and coordinate credential updates safely.

Codex quota is not ChatGPT Web model quota. Status must label its provider/data source, unknown values, credits, reset windows and staleness accurately. The prompt does not invent a unified quota pool.

Sources: https://github.com/lhl/pi-codex-status/blob/main/README.md ; https://github.com/lhl/pi-codex-status/blob/main/src/cli.ts ; https://github.com/lhl/pi-codex-status/blob/main/src/auth.ts ; https://openai.com/index/running-codex-safely/

### Replace floating updates with verified transactions

`git pull latest` and exact immutable pins are different update policies. The prompt distinguishes applying the approved manifest from a maintainer choosing newer pins. It requires a before/after plan, checksums, staging, compatibility checks, rollback and no automatic update. The shell updater delegates to the same tested updater implementation.

### Measure the full installation honestly

The requested limit becomes an explicit under-50,000,000-byte gate. Account for mandatory binaries, production dependencies and automatically downloaded helpers, not only the npm wrapper or compressed archive. Preinstalled prerequisites and optional companion modes are separately disclosed. No claim is made that the full requested three-component bundle currently meets that budget.

### Use offline CI, independent versions and separate metrics

Dummy credentials are not sent to a real quota endpoint. Tests use the production parser/normalizer with controlled fixtures and block external network calls. macOS and Linux results require actual execution, not a Windows developer machine's assumption.

The CLI keeps its own initial 0.1.0 version, preferably tagged `cli-v0.1.0`; it does not downgrade the existing GUI. Full release tagging waits for the actual required scope, platform, integration and size gates. A preview remains labeled a preview.

The GUI roadmap survives relocation without artificial credit. CLI gets a separate numbered catalog, progress bars, evidence, estimates, truthful ETA states and freshness enforcement. Root and component instructions require every contributor—regardless of AI vendor—to review and update the affected metrics and attribution.

## Expected result from the next session

A tested GUI relocation and the maximum genuinely implemented CLI work allowed by the verified constraints, with precise remaining blockers. The desired endpoint is a working three-component CLI on the requested platforms, not another architectural report. The prompt nevertheless prohibits fabricated compatibility, hidden browser/daemon dependencies, unsupported release claims and destructive source reconciliation.

## Files in this bundle

- `MTerm_GUI_CLI_Master_Implementation_Prompt.md`: paste/read this as the main instruction.
- `MTerm_CLI_Requirements_Seed.json`: optional machine-readable acceptance inventory.
- `MTerm_CLI_Prompt_Read_First.md`: this preparation/access/research explanation.
- `MTerm_Prompt_SHA256.json`: integrity hashes for the three files above.

The source URLs describe branches as inspected; the implementation session must pin immutable revisions. All proposed acceptance requirements are original engineering decomposition of the user's brief, not a claim that upstream sources already implement them.

## Two-repository split update — 27 September 2026

The earlier monorepo migration model is superseded. The desktop source of truth is now **MulattoTech/MTerm-GUI** with local checkout `C:\Tools\Dev\MTerm-GUI`; the CLI source of truth is **MulattoTech/MTerm-CLI** with local checkout `C:\Tools\Dev\MTerm-CLI`. The old `MulattoTech/MTerm` repository and `C:\Tools\Dev\MTerm` checkout are migration/recovery sources only.

A verified pre-split checkpoint exists at `C:\Tools\Dev\MTerm\artifacts\split-20260927T182123Z`. The legacy candidate and remote main were verified to have identical trees before export. MTerm-GUI was populated by preserving its original placeholder commit and merging the full legacy GUI/native history; observed migration main was `b5c4df53febb8b4f9425e40fafb3fd35b375a787` at split time. Recheck current heads before resuming.

Use `docs/execution/MASTER_IMPLEMENTATION_PROMPT.md` in MTerm-CLI as the authoritative execution prompt after bootstrap. Do **not** recreate a gui/cli monorepo. Each repository owns its own main, CI, roadmap, version and releases. Repository deletion of legacy MTerm is optional; if the connected GitHub tools do not expose deletion, leave a migration notice rather than bypassing tool or credential boundaries.
