# MTerm GUI/CLI Two-Repository Split — Master Execution Prompt

**Intended executor:** a ChatGPT Web GPT-6 Astra Pro reasoning conversation with Remote Desktop Commander and GitHub connected.
**Prepared/revised:** 27 September 2026.
**GUI repository:** `https://github.com/MulattoTech/MTerm-GUI`
**GUI local checkout:** `C:\Tools\Dev\MTerm-GUI`
**CLI repository:** `https://github.com/MulattoTech/MTerm-CLI`
**CLI local checkout:** `C:\Tools\Dev\MTerm-CLI`
**Legacy migration archive:** `https://github.com/MulattoTech/MTerm` / `C:\Tools\Dev\MTerm`
**Task type:** execute the implementation, testing, publication and handoff; do not stop at architecture-only analysis.

This prompt supersedes the earlier monorepo plan. **Do not create product-level `gui/` and `cli/` directories in one repository.** MTerm-GUI and MTerm-CLI are independent sibling repositories with separate histories, CI, roadmaps, versions and releases.

---

## 1. Mission, product boundaries, and authority

You are continuing MTerm after an explicit repository split.

### Product sources of truth

1. **MTerm-GUI** — `MulattoTech/MTerm-GUI`, local `C:\Tools\Dev\MTerm-GUI`.
   It owns the native C++20/Qt desktop application, preserved Electron behavioral reference, GUI tests, GUI roadmap/metrics, GUI evidence/history, source-project lineage and future desktop/DevFleet work.
2. **MTerm-CLI** — `MulattoTech/MTerm-CLI`, local `C:\Tools\Dev\MTerm-CLI`.
   It owns the standalone CLI, adapters, pins/vendor inventory, CLI tests, CLI roadmap/metrics, CLI docs, CI, releases and CLI-specific attribution.
3. **Legacy MTerm** — `MulattoTech/MTerm`, local recovery checkout `C:\Tools\Dev\MTerm`.
   It is migration/history source only after the split. Do not resume ordinary product development there.

The two products may document compatibility contracts and cross-link one another, but must not share mutable build trees, hidden runtime dependencies or a combined default branch.

### CLI mission

Build **MTerm CLI** as a lightweight standalone terminal client combining, where genuinely feasible and licensed:

1. **OpenAI Codex CLI** — `https://github.com/openai/codex`: the real coding agent/TUI.
2. **codex-chatgpt-web** — `https://github.com/miuuyy/codex-chatgpt-web`: legitimate ChatGPT Web model integration, subject to verified browser/runtime/auth/bridge requirements.
3. **pi-codex-status** — `https://github.com/lhl/pi-codex-status`: Codex usage windows, credits, reset data, boxed output, one-line output and normalized JSON.

Required commands:
- `mterm-cli`
- `mterm-cli status`
- `mterm-cli status --line`
- `mterm-cli status --json`
- `mterm-cli update`
- `mterm-cli config`

Add only narrowly necessary setup/doctor/help operations. Preserve Codex's familiar TUI rather than inventing a replacement chat UI.

### GUI preservation mission

Repository separation is not permission to redesign, reduce or falsely mark the desktop complete. Preserve the current native GUI, Electron reference, tests, source-project lineage, roadmap/metrics, evidence and AI/provenance rules in MTerm-GUI. CLI work must not pull Qt/Electron into CLI or change GUI business behavior for convenience.

### Authority and safety

You are authorized to make scoped changes, checkpoints, fixture/local tests, branches, PRs and ordinary merges in **each new repository**. Create a CLI release tag only when its gates genuinely pass.

Do not force-push, rewrite history, delete user data/checkpoints, weaken protections, alter credentials, enable public listeners, or submit paid/model-consuming test prompts without specific authorization.

The owner has authorized deletion of the old `MulattoTech/MTerm` repository **after** both replacements and recovery artifacts are verified. Deletion is optional, not a release requirement. If the connected GitHub tools do not expose repository deletion, do not bypass that limitation with a token or settings trick: leave the legacy repository as a clearly marked migration archive and report the manual owner action.

### Scope-conflict rule

The requested CLI simultaneously wants all three upstream integrations, one lightweight MTerm-owned runtime, no Electron/GUI/daemon, legitimate existing authentication and an installed footprint below 50 MB. Current upstream Web architecture may conflict with those constraints.

Keep blocked requirements visible. Never satisfy them by relabeling a companion, excluding mandatory downloads from size accounting, hardcoding fake models, stealing browser state, or silently falling back to another transport/provider. Continue safe independent CLI work, but do not call a core-only preview full three-component completion.

---

## 2. Verified split context supplied with this prompt

These are point-in-time observations. **Revalidate before mutation.**

### 2.1 Split state observed 27 September 2026

- Remote Desktop Commander identified the authorized Windows workstation as MulattoTechBox. Re-discover the device rather than relying blindly on a stored ID.
- GitHub reports admin/maintain/push permissions for both `MulattoTech/MTerm-GUI` and `MulattoTech/MTerm-CLI`.
- The legacy local candidate `5b15df023b17dfade85bc7b2c08030733b823b13` and legacy remote `main` `9f33a64bd8af31aed19e8955c93c2a065f1ed725` were verified to have the identical tree `850228803432bf57c2d7a5c4cbe41b34541d023a`.
- Recovery checkpoint: `C:\Tools\Dev\MTerm\artifacts\split-20260927T182123Z`, containing a verified complete Git bundle, source ZIP, status, old-main metadata and SHA-256 manifest.
- `MTerm-GUI` originally contained only a placeholder README commit. The split session preserved that commit and merged the full legacy GUI/native history into it. The observed migration commit was `b5c4df53febb8b4f9425e40fafb3fd35b375a787`; recheck current `main`.
- Product branches exported to MTerm-GUI: `candidate/native-20260923`, `feat/native-core-20260922`, `feat/native-resume-20260922`, `feat/native-ux-20260922`, and `feat/native-workbench-roadmap-20260923`.
- The local recovery-only `archive/native-core-with-local-ci` ref was not pushed by local Git because that credential rejected its workflow file. It remains in the verified pre-split bundle. Do not weaken credentials to manufacture remote parity.
- `MTerm-CLI` existed with placeholder initial commit `11f54d9cffe08c66df1d8c01b4030e90f169893b` and was cloned to `C:\Tools\Dev\MTerm-CLI`. Recheck because the bootstrap may have advanced it.
- The permission-test branch `access-check/cli-prompt-20260925T115559Z` is **not product history** and must not be merged into GUI or CLI.
- The connected GitHub toolset did not expose repository deletion during the split. The user's deletion authorization is not authority to bypass tool boundaries.

### 2.2 Repository responsibilities

**MTerm-GUI**
- native C++/Qt desktop source and native tests;
- preserved Electron behavioral reference and its tests;
- GUI roadmap, evidence, screenshots, source-project lineage and desktop release engineering;
- future GUI-side DevFleet adapter.

**MTerm-CLI**
- standalone CLI code and package;
- Codex/Web/status adapters and immutable pins;
- CLI config/cache/update/install/security logic;
- CLI roadmap, evidence, CI, releases and CLI-specific third-party inventory.

Each repo has its own root `.github`, contributor instructions, `README`, roadmap and release/tag namespace. Do not recreate a monorepo.

### 2.3 Upstream facts requiring fresh verification

Earlier source inspection found:
- Codex is a native Rust application under Apache-2.0; a Node wrapper does not make Codex JavaScript.
- `codex-chatgpt-web` 6.1.0 used Bun 1.4.0 and its desktop launcher used Electron; browser/session/bridge requirements may conflict with a strict pure-CLI package.
- Codex OAuth does not itself establish an authenticated ChatGPT Web browser session.
- `pi-codex-status` 0.1.0 exposes CLI/library status surfaces, supports multiple credential sources, and may refresh/write credentials.
- Codex quota and ChatGPT Web allowances are different domains.
- Node 20 is EOL; select a supported Node LTS for new MTerm-owned glue.
- Codex credentials may be stored in an OS keyring rather than plaintext auth.json.

Re-read upstream source and pin exact commits/artifacts before implementation. These bullets are investigation leads, not evergreen facts.

---

## 3. Tool-aware operating procedure

### 3.1 Discover before acting

Inspect the functions exposed in this conversation. Use `api_tool.list_resources` for relevant connectors when their schemas are not loaded. Invoke only functions actually returned. Do not use invented namespaces, obsolete `functions.exec` wrappers, nonexistent parallel agents, assumed GitHub endpoints, or a remembered desktop-control API.

Remote Desktop Commander is the bridge to the Windows host. The ChatGPT analysis/container filesystem is **not** `C:\Tools\Dev\MTerm`. Never claim that creating a file in `/mnt/data` changed the workstation.

Use the GitHub connector for repository/PR/issues/Actions metadata and supported writes. Use local Git through RDC for filesystem moves, commits, comparisons, tags and pushes when that credential permits them. These are separate paths with separate authority. If you write remotely through the connector, fetch and reconcile that commit locally before continuing; do not create diverging histories unknowingly.

### 3.2 Revalidate capabilities with minimal side effects

1. List devices and identify the correct host.
2. Verify command execution and a new repository-local create/read/rename/read-back probe. Keep the proof under ignored `artifacts/`; do not modify source to test permissions.
3. Query GitHub repository permissions and verify ordinary content writes on an isolated scratch branch when a current proof is needed.
4. Test workflow-file writes independently using an inert, disabled/manual-only file outside `main`; do not dispatch it as a probe.
5. Report each capability as verified, failed, or not tested. A permission flag is not an executed write; a written workflow is not a successful workflow run.
6. Do not remove command blocks, widen `allowedDirectories`, change ACLs globally, grant OAuth scopes, or use elevation as an approval bypass. Explain the precise blocked operation and continue through an already-authorized route only when it genuinely supports that operation.

Do not claim administrator rights are necessary for project-local source work. No global tool installation or security-setting change is a default step.

### 3.3 Efficient, recoverable execution through RDC

- Prefer `read_file`, `read_multiple_files`, scoped searches, and known-range reads to broad recursive dumps.
- For longer remote transformations, create or execute bounded scripts through the exposed process tool. Write/read files only on that actual host.
- Respect `write_file` chunk guidance when using it directly. Read back and hash significant generated files; an attempted call is not proof of a complete file.
- Capture logs under unique artifact directories. A returned PID means a process started, not that it passed. Poll the process and record its actual exit status.
- Use fail-fast shell/script semantics. Check each external exit code; do not let a successful final `echo` conceal an earlier failure.
- Avoid long pipelines of unrelated writes. Finish and checkpoint one coherent unit before starting the next.
- On reconnect, inspect processes, status, hashes, logs and the execution ledger. Resume the first unverified action; never restart a build or transformation blindly.
- No background-work promises. Work only while executing tools, or leave a durable handoff.

The current host being Windows does not prove macOS or Linux execution. Discover existing authorized runners/devices or use permitted GitHub Actions; otherwise mark platform validation pending.

---

## 4. Reconcile the two publication authorities before implementation

### 4.1 MTerm-GUI

Read current GUI instructions, README, HANDOFF, STATUS, ROADMAP/METRICS, build scripts, manifests, source attribution and workflows. Record local/remote HEAD, dirty state, tags, PRs and branches. Verify the imported legacy product history is represented or preserved in the pre-split bundle. Do not import the access-test branch.

Run GUI roadmap/fingerprint checks from the GUI repo root. A repository move grants no feature credit.

### 4.2 MTerm-CLI

Read current CLI README, AGENTS, implementation prompt, requirements seed, feasibility docs, code and workflows. Record local/remote state independently. Never assume it is still an empty placeholder if another session has advanced it.

### 4.3 Legacy MTerm

Treat `C:\Tools\Dev\MTerm` and `MulattoTech/MTerm` as recovery/migration sources only. Preserve the complete bundle, source archive, split report, resulting GUI/CLI SHAs, and excluded access/recovery-only refs. Do not reset/clean/force-push either replacement from the legacy tree.

### 4.4 Source-of-truth rule

After verification:
- **MTerm-GUI/main** is the desktop publication authority.
- **MTerm-CLI/main** is the CLI publication authority.
- There is no combined MTerm default branch.

A coordinated change affecting both products requires two explicit changes/PRs with compatibility notes.

---

## 5. Target two-repository architecture

### 5.1 MTerm-GUI

```text
MTerm-GUI/
├── .github/
├── AGENTS.md / CONTRIBUTING.md / CLAUDE.md / GEMINI.md
├── README.md / LICENSE
├── CMakeLists.txt / CMakePresets.json / Start-MTerm.ps1
├── native/                     # C++20 / Qt desktop and native services
├── apps/ / packages/           # preserved Electron reference
├── tests/ / scripts/
├── docs/                       # GUI roadmap, evidence, lineage, DevFleet vision
├── package.json / pnpm-lock.yaml / pnpm-workspace.yaml
└── ignored local .tools/ out/ artifacts/ release-local/ node_modules/
```

### 5.2 MTerm-CLI

```text
MTerm-CLI/
├── .github/
├── AGENTS.md / CONTRIBUTING.md / CLAUDE.md / GEMINI.md
├── README.md / LICENSE
├── package.json / package-lock.json
├── tsconfig.json
├── versions.json
├── bin/mterm-cli.js
├── src/
│   ├── commands/
│   ├── adapters/
│   ├── auth/ config/ cache/
│   ├── lifecycle/ updates/ security/
│   └── output/
├── vendor/
├── patches/
├── tests/fixtures/
├── scripts/
├── update.sh
└── docs/
    ├── execution/             # this prompt and requirements seed
    ├── HANDOFF.md STATUS.md ARCHITECTURE.md SECURITY.md
    ├── ROADMAP.md FEATURE_CHECKLIST.md
    ├── UPSTREAMS.md COMPATIBILITY.md SIZE_REPORT.md
    ├── TESTING.md RELEASING.md TROUBLESHOOTING.md
    └── roadmap/
```

This is a responsibility map, not permission to create empty scaffolding without behavior/tests.

### 5.3 Split rules

1. Do not move either product back under a shared `gui/` or `cli/` parent repository.
2. Preserve GUI history/authorship, destination placeholder history, GUI roadmap IDs/weights/evidence and Electron reference.
3. GUI dependencies stay out of CLI. CLI install/help/status must not import or install Qt/Electron/native GUI dependencies.
4. CLI starts from its own repository history; link to GUI/legacy migration docs instead of grafting the entire GUI history into CLI.
5. Each repository owns its workflows. A workflow under the other repository is not active for this product.
6. CLI uses its own version, roadmap IDs, metrics, release tags and third-party inventory.
7. Recreate path-sensitive build/tool caches in their new local roots rather than copying stale CMake/Python/Node build state.
8. Preserve ignored user profiles, auth, old checkpoints and toolchains outside committed source.
9. GUI compatibility launch paths may be documented, but CLI does not become a dispatcher that installs/starts the GUI.
10. The legacy access-check branch remains excluded.
11. Record a split/reconciliation document in both repos with exact source/destination SHAs and recovery checkpoint.
12. Only after both new repos are independently verified may the old remote be retired; if deletion is unsupported, leave a migration notice.

---

## 6. Feasibility gate: resolve the original contradictions explicitly

Before selecting production dependencies, read each upstream's current README, license, package manifest, CLI entry point, authentication logic, runtime lifecycle, update behavior and release assets. Record source commit, displayed version, platform artifacts, license, build/runtime requirements, size and real integration API in `cli/docs/UPSTREAMS.md` and `docs/CLI-FEASIBILITY.md`.

### 6.1 One MTerm-owned runtime, not a false claim about upstreams

Use **TypeScript compiled for supported Node LTS, initially Node 24**, for MTerm CLI glue. Pin the verified minimum/CI patch. Ship JavaScript, not a requirement for `tsx`, Bun, Python, C++, Rust compilers or Qt on every end-user invocation.

Codex remains an external native binary managed by a thin adapter. Prefer a verified upstream platform release over rebuilding the entire Rust agent during ordinary updates. Do not port Codex into TypeScript.

Use pi-codex-status's standalone/library surface; do not install the entire pi coding agent merely to fetch a quota snapshot. Inspect its transitive dependencies and compiled package, not just top-level `package.json`.

The current Web project's Bun/Electron requirements are a separate compatibility issue. Do not install its desktop launcher into the strict CLI bundle and call the result “no GUI.” Evaluate whether a documented headless/terminal-only runtime satisfies the required model-picker behavior at the chosen pin. A `.ts` filename or `bin` field is not evidence of Node compatibility.

### 6.2 Strict CLI and Web-enabled modes

Build the ordinary Codex/status/config/update foundation without a GUI, background service, startup registration or unsolicited network listener. All heavyweight imports are lazy.

The **Web-enabled target remains in scope**, but its acceptance is conditional on a verified mechanism:

- Prefer an existing documented non-GUI adapter that can preserve the desired behavior without a persistent daemon.
- If the upstream only works with a separately authenticated browser and local bridge, describe those exact requirements. Do not silently launch Electron, install Chromium, create login items, or keep a daemon running after MTerm exits.
- A session-owned helper is not the same as a permanently installed daemon, but it still adds runtime/footprint requirements. Obtain approval when it relaxes the literal no-daemon/no-browser/single-runtime/size constraints.
- Reusing a separately installed companion may be a useful approved compatibility mode; it is not a self-contained under-50-MB bundle. Label it accurately and report its full required footprint.
- A Node-compatible fork/extraction of MIT upstream functionality is a possible engineering option, not a guaranteed shortcut. Record patches, ownership, tests and remaining authentication/browser requirements.
- If constraints cannot all be satisfied, ask the user to choose the specific relaxation. Continue implementing unrelated safe work. Do not select an old vulnerable upstream release simply because it is smaller.

No fictional integration, static pretend Web model entries, silent official-model fallback, borrowed browser cookies, authentication bypass, rate-limit evasion, or hidden remote model calls are acceptable.

### 6.3 Authentication is not one interchangeable token

“Reuse existing auth; no separate login flow” means **no new MTerm account or custom OAuth implementation** for normal Codex operation. It does not mean that Codex's `auth.json` authenticates an embedded ChatGPT browser.

Prefer existing legitimate sessions when the upstream supports them. Initial browser sign-in, expired sessions, consent, connector setup and organization policy may require the human. Clearly distinguish one-time setup from routine launches. After approved setup, launches should be automatic until upstream state expires or changes—not repeat the setup every time.

### 6.4 The footprint requirement is a release gate

Treat “under 50 MB installed” as **50,000,000 bytes**, measured after extraction for each supported platform, including MTerm runtime JavaScript, transitive production dependencies, bundled Codex executables, required native helpers, and any automatically installed runtime/bridge/browser payload.

Report separately:

- wrapper/package bytes;
- Codex payload bytes;
- quota adapter bytes;
- Web component/helper bytes;
- total required installed bytes;
- declared preinstalled prerequisites such as system Node;
- compressed download size, which is not installed size;
- development source/toolchain/caches, which are not production payload.

Do not hide components in a cache or side-download to claim a lower total. Provide a lean dependency-reuse profile only with clear prerequisite and “not self-contained” labeling. If the full required bundle exceeds 50 MB, mark that requirement failed/blocked and seek a precise scope decision before certifying a release.

### 6.5 Licenses

Keep MTerm-owned glue MIT. Preserve Codex's Apache-2.0 license/NOTICE obligations and each dependency's own license, notices and modification record. Do not relabel vendored upstream code MIT. Produce a component inventory/SBOM and inspect the actual artifacts included. Treat legal uncertainty as a release-review item, not an excuse to strip notices.

---

## 7. Command and lifecycle contracts

### `mterm-cli`

Launch the resolved, pinned Codex executable in the caller's working directory. In a successfully configured and supported Web-enabled mode, make the verified Web model routes available through the actual upstream integration. Do not replace Codex's TUI with a homemade prompt loop.

Preserve stdin/stdout/stderr TTY behavior, Unicode, terminal resizing, Ctrl+C, signal forwarding, child exit status and process cleanup. Use argument arrays rather than shell interpolation. Prefer inherited stdio when it preserves the upstream TUI; do not scrape/reprint the TUI or insert status polling into its screen.

Reserve MTerm's own documented subcommands; provide explicit passthrough using `mterm-cli -- <codex arguments>` and optionally `mterm-cli run -- <arguments>`. Parse only MTerm arguments before the separator. Test spaces, quotes, non-ASCII paths and leading-dash arguments.

Default invocation must not install/update dependencies, refresh quotas, reauthenticate, modify global Codex config, or silently choose a different transport. Missing setup yields actionable diagnostics. A chosen unsupported Web route fails clearly; it must not quietly consume Codex/API quota instead.

### `mterm-cli status`

Display pi-codex-status-style boxed Codex quota information from its verified library/adapter. Identify freshness and data source. Present the server-reported windows/credits/resets when available. Do not request a model completion to find quota.

A boxed display is a presentation requirement, not permission to copy terminal-unsafe strings blindly. Support narrow terminals, non-TTY output, `NO_COLOR`, `TERM=dumb`, Unicode fallback and untrusted control-character sanitization.

### `mterm-cli status --line`

One compact line suitable for prompts/tmux. Default to a bounded cache-first/cache-only path so a shell prompt does not hang for a network timeout, rotate credentials, or create a daemon. Offer explicit documented refresh behavior rather than hidden background refresh. Indicate stale/unavailable data compactly. Avoid a trailing spinner, multiline warnings or ANSI injection. Do not embed unescaped shell/tmux formatting from an upstream field.

### `mterm-cli status --json`

Write **one valid JSON document to stdout**, including on expected failures. Diagnostic text goes to stderr and never includes credentials. Adopt a versioned normalized contract with:

- `schemaVersion`, `ok`, `provider: "codex"`;
- `source` and `fetchedAt`/age/staleness metadata;
- pseudonymous account-scope identity only when necessary; no email/token by default;
- `windows[]` with source labels, duration in seconds, used/remaining percentage or `null`, reset timestamp in UTC or `null`;
- `credits` with explicit known/unknown/unlimited semantics supported by source data;
- additional named limits when provided;
- a safe structured error with stable code and actionable remedy.

Preserve raw unknown information internally where useful, but never include raw credentials/HTTP bodies as an error shortcut. Do not infer a missing limit is zero, a missing credit balance is unlimited, or two arbitrary windows are always exactly five hours and seven days.

Codex usage remains labeled Codex usage. Web/Pro usage is a separate optional namespace only if the upstream actually supplies trustworthy data. Local launcher message estimates, if surfaced after approval, must remain estimates that omit out-of-launcher usage.

### `mterm-cli config`

Show effective non-secret settings and their origin. Support explicit `show`, `get`, `set`, `edit`, `path` and validation operations as justified. Validate settings before an atomic write; failed edits preserve the old file. Parse an editor invocation safely, do not pass config values through a shell eval, and do not permit `__proto__`/prototype pollution in merge logic.

Define precedence: explicit CLI options, documented MTerm environment variables, MTerm user config, defaults. Preserve Codex's documented own precedence; do not shadow `CODEX_HOME` unexpectedly. Version the config schema and test migration/backups. Reject invalid paths, types, unknown dangerous keys and insecure endpoints.

Do not store access/refresh tokens, browser cookies, API keys or private tunnel credentials in MTerm config. Config points to an authorized existing credential source; it is not a second credential vault.

### `mterm-cli update`

Use the single transactional updater described in section 10. `cli/update.sh` is only a thin portable launcher for it. A separate PowerShell wrapper may improve Windows development; update logic must not be duplicated in shell languages.

### `mterm-cli doctor` and help

Add an offline-first diagnostic command with human/JSON output for dependency paths/versions, architecture compatibility, configuration, credential-source availability, cache state and integration readiness. It must distinguish **not installed**, **not configured**, **auth unavailable**, **unsupported**, **needs human setup**, and **ready**.

A doctor command does not send prompts or display token values. Any network check is separately explicit. `--help`/`--version` must work without credentials, internet or Codex installed.

### Exit codes

Document and test a small stable exit-code table. Distinguish usage/config errors, unavailable authentication, network/service failure, dependency incompatibility and update contention. In coding-agent mode, preserve the underlying Codex exit/signal outcome. A valid quota response with no quota left is valid status data, not a fabricated transport failure. Explicitly define stale-cache success semantics and expose staleness in JSON.

---

## 8. Credential, quota, cache and network safety

### Auth resolution

Default the status adapter to the **Codex** credential source, not the upstream's unrelated MultiCodex/pi preference. An alternate account source requires explicit configuration. Pass the resolved auth path explicitly where the pinned status library does not implement `CODEX_HOME` itself.

Respect supported Codex storage configuration. If credentials are in a keyring unsupported by pi-codex-status, report that limitation; do not dump the keyring or silently change Codex storage to plaintext. Normal Codex launch may still work even when this independent status path cannot.

Read real credentials only in the trusted local execution context when needed for an explicitly authorized live operation. Never print their contents into tool output, prompts, command lines, screenshots, logs, test snapshots, GitHub issues or repository files. During development use temporary synthetic credentials and fixtures.

### Refresh semantics

Inspect the pinned status implementation: token refresh can mutate the shared source file. An atomic rename by itself does not solve concurrent refresh-token rotation or lost updates.

Prefer letting Codex own authentication/refresh when a supported interface exists. If the status adapter refreshes credentials, require bounded timeout, correct account binding, protected file mode, exclusive coordination, read-compare-write protection and preservation of unrelated fields. An MTerm-only lock does not coordinate an unrelated Codex process; document that boundary. Do not claim full cross-application race safety without testing a real interoperable mechanism. When safe coordination is not available, fail or require an explicit refresh operation rather than risk corrupting active credentials from a prompt-status hook.

### Cache

Use per-user platform-appropriate cache locations, bounded files, atomic writes and explicit schema/version metadata. Bind cache identity to provider/account/auth source so switching accounts cannot show the previous account's quota. Token rotation should not accidentally merge different accounts or leak tokens through cache filenames. Do not store credential JSON in the cache.

Test cold/warm cache, TTL expiry, corruption, stale fallback, clock skew, concurrent readers/writers, read-only cache directories, account changes and cache-size limits. Expose freshness consistently in all output modes.

### Network

Use bounded request timeout/body size/retries. Respect `Retry-After` and provider limits. Never hammer quota endpoints on each shell render. Treat the usage endpoint as a private/unstable upstream interface; distinguish schema drift, 401, 403, 429, timeout, offline and server errors.

Prevent token exfiltration through a configurable `--endpoint`: allowlist the credential-bearing official origin(s), validate HTTPS, and do not forward Authorization across arbitrary redirects. Test HTTP/loopback fixture exceptions must be explicit, isolated, and never used with real auth. A custom endpoint override must not silently receive the user's existing bearer token.

Never weaken TLS verification. Do not log raw error response bodies that can echo credentials. Scrub subprocess/HTTP errors as well as ordinary logs.

---

## 9. Dependency pins, source inventory and packaging

Create `cli/versions.json` as an immutable desired dependency set, not a file containing moving `latest` references. For each of the three required upstreams record:

- canonical project URL and component role;
- exact source commit SHA and resolved release/tag/package version;
- fetch mechanism and per-platform artifact identity;
- checksum/integrity data and any available signature/attestation verification;
- license/notice paths;
- required runtime/build tool versions;
- compatible Codex/bridge/status combination and actual test evidence;
- reviewed patch list and patch hashes;
- source/distribution exclusions with rationale.

Resolve pins from real upstream releases/commits. A compatibility range may be descriptive, but it does not replace an exact lock. Commit the corresponding package lock. Use submodules/subtrees/vendor snapshots only when they are actually maintainable and the release/install path initializes them reliably. Do not put entire upstream histories, every OS binary, Rust build output or desktop launcher downloads into the npm runtime package.

Prefer a maintained integration contract over edits to undocumented global files. If a small upstream patch is unavoidable, keep it separate, attributed, reproducible and covered by tests; detect when a new upstream version invalidates it. Never run arbitrary downloaded scripts directly just because they came from an upstream repository.

Ship production-only CLI code and target-specific assets. Exclude GUI files, tests, source maps unless justified, `.git`, fixtures, private research/transcripts, caches, browser profiles, unused architectures and build toolchains. Validate the actual package using `npm pack`/unpacked inspection, not merely the `files` field you intended to use.

Keep the path to system/managed Codex configurable. Do not overwrite an unrelated global `codex` installation. Resolve absolute executable paths and avoid recursively launching `mterm-cli` through a naming collision.

---

## 10. Deterministic updates rather than `git pull` surprises

Distinguish **installed state**, **the desired reviewed pin set**, and **new upstream candidates**.

- `update --check`: inspect differences and availability without modifying installed state, source pins, auth or configuration. A network check is user-initiated.
- `update`: display old→new versions, source/hashes, compatibility and size consequences; request interactive confirmation before applying the reviewed target set.
- In non-interactive mode, do not prompt forever or auto-confirm. Require explicit `--yes` for the displayed reviewed target; that flag never bypasses auth or code-execution permissions.
- A maintainer/developer pin-refresh operation can discover a newer compatible set and propose changes to `versions.json` through normal review. Ordinary installed-user updates must not edit source lockfiles or `git pull` a moving branch.
- No check on normal launch, no scheduled updater, no login item, no daemon.

### Transactional state machine

Acquire a scoped update lock; validate ownership/staleness safely. Resolve an immutable target manifest. Download into a **new** staging directory with size/time limits. Verify checksums and source identity. Reject path traversal, absolute paths, unsafe symlink/hardlink escapes, unexpected archive entries and decompression bombs. Apply reviewed patches/build only when necessary. Run offline compatibility checks and packaging tests. Atomically activate a new version pointer or equivalent safe platform mechanism. Keep the previous version usable for rollback.

Interruption, checksum mismatch, unavailable architecture, build failure, smoke failure or activation failure must leave the prior installed version functional. Preserve config, caches, browser profiles and credentials. Do not replace an executable beneath an active session; defer activation or keep versioned paths until it exits. Rollback uses the recorded exact previous manifest, never an arbitrary directory supplied by untrusted config.

For `npm link`/source development, distinguish the checkout from the managed runtime cache. User updates must not reset the developer's branches, vendor edits or working tree. Do not garbage-collect old source/checkpoints as part of this task. Any later cache cleanup must be explicit, ownership-checked and bounded.

---

## 11. Installation and platform contract

### Root developer linking

Provide and actually test one documented MTerm-CLI repository-root installation path that exposes `mterm-cli` through `npm link`. A minimal root package can forward to the CLI, but must not bring in the GUI workspace or install Electron/Qt.

MTerm-GUI keeps its own package manager/lockfile; MTerm-CLI has a completely separate dependency graph and lockfile. Choose one package-manager strategy for CLI dependencies and document root/CLI lockfile ownership. Do not mix global npm/pnpm side effects until the installation graph is understood. Test linking with a temporary prefix/home where possible, including symlinked entry-point resolution and uninstall of only the test-owned link.

If an installer is also supplied, prefer download → inspect/verify → execute documentation over a blind `curl | sh` recommendation. A one-command bootstrap must fetch a pinned trusted artifact, verify it, avoid `sudo`, preserve shell files by default, and never silently install an unrelated runtime/browser. Creating installer files is not authorization to publish to npm or release binaries publicly.

### Required product platforms

Support and validate:

- macOS Apple Silicon;
- macOS Intel;
- Linux x86-64, with a clearly stated distribution/libc floor.

Assess Linux arm64 explicitly and include it only when the chosen upstream combination and testing support it; otherwise keep its limitation visible. Windows is the current development workstation: preserve Windows development commands and safe local tests. Do not label native Windows CLI delivery complete unless it is deliberately included and tested.

Distinguish architecture detection from actual execution. Inspect runner OS/architecture during CI rather than assuming `macos-latest` exercises both architectures. Pin/select presently available runner labels and document unsupported coverage. Docker/WSL may help Linux testing when already authorized; neither proves macOS behavior. Do not install virtualization or alter unrelated VMs just to fill a matrix.

### Runtime expectations

The wrapper must not perform a heavyweight provider import, browser start, quota fetch, compilation or installation just to show help or cached status. Measure spawn/wrapper overhead separately from agent inference. Measure non-TTY behavior, terminal restoration after abnormal exit, signal routing, and surviving descendant processes. Do not recreate the GUI's terminal emulator for this CLI when ordinary inherited terminal I/O is sufficient.

---

## 12. Test and CI plan

Write targeted failing tests before behavior changes. Keep production parsing/rendering/normalization paths in the fixture tests; a fixture mode must not merely print a prewritten “success” JSON object.

### Required local suites

1. Argument parsing, command routing, passthrough quoting and exit codes.
2. Config precedence/types/schema/edit failure/atomic writes and path resolution.
3. Credential-source selection without actual user secrets; missing/malformed/expired/keyring/alternate-account cases.
4. Refresh concurrency/failure tests under controlled fixtures, including unrelated file changes.
5. Quota normalization, missing fields, unknown windows, reset units/time zones, credits, named limits and schema drift.
6. Account-bound bounded cache, TTL/corruption/stale/future-clock/concurrency behavior.
7. Box/line/JSON rendering, narrow terminals, non-TTY, `NO_COLOR`, control-character injection and JSON-only stdout.
8. Launcher child lifecycle, inherited I/O, cancellation, resize where needed, signals and no orphaned helpers.
9. Pinned dependency resolution, compatibility and missing-artifact diagnostics.
10. Transactional update rollback, lock contention, checksum mismatch, malicious archives and active-session safety.
11. Source-install/packed-install isolation from GUI and sensitive files.
12. Product-specific roadmap validation and stale-review negative tests.

### CI

Create a real MTerm-CLI root `.github/workflows/cli-ci.yml`, using supported connector/local operations and current permission evidence. Never put executable workflow definitions under `gui/.github` or `cli/.github` and expect automatic execution. Pin third-party actions to reviewed commits and declare least privileges. Do not change organization protection settings.

Use fixture credentials and an offline/in-process or loopback mock service **with external network access blocked in the tests**. A dummy `auth.json` does not make a real remote quota request valid or safe. CI must not send dummy credentials to ChatGPT, refresh real tokens, log browser sessions, or spend model quota.

CI should cover the available required OS/architecture matrix, clean installation, typechecking/linting, unit/integration tests, `mterm-cli status --json`, line/boxed formats, package content/size, update fixtures, and roadmap freshness. Exercise GUI preservation on a suitable existing native runner when feasible; do not treat CLI CI as GUI certification.

Inspect actual job logs/check conclusions. Distinguish written workflow, dispatched run, pending run, failed run, skipped platform and passed run. No `continue-on-error` disguising a required gate. A permissions error leaves a documented actionable block, not a fake green badge.

### Account-bound smoke tests

No real coding prompt, Web submission or token-refresh experiment is implicitly authorized by this development prompt. Prepare an opt-in human-run/live-smoke procedure. When the human authorizes it, record the exact transport/account scope and result without secrets. Confirm actual Web model discovery/selection/routing, not merely the presence of strings in a JSON file. Account-bound unrun tests remain release blockers for that acceptance claim.

---

## 13. Separate GUI and CLI roadmap systems

MTerm-GUI preserves its existing scope, weights, IDs, source-project lineage, reviews and honest completion assessment in its own repository. MTerm-CLI has its **own** catalog, detailed individually numbered checklist, generated progress bars, status table, evidence, estimates and review history. Do not copy GUI completion credit into the CLI.

Use the appendix below as a required seed inventory. Expand each item into a verbose, individually reviewable requirement; split it further where acceptance differs. Assign stable CLI-prefixed IDs so there are no collisions with existing GUI REQ/DF/GOV identifiers. Maintain an original-request→CLI-ID traceability table. Distinguish direct product requirements, engineering acceptance conditions, conditional upstream requirements and optional enhancements.

For every item record: title; user-visible objective; detailed scope; non-goals; current stage/percent; baseline weight; remaining engineer-hour range and basis; dependencies/blocker; ETA status and basis; implementation paths; acceptance criteria; exact test/evidence references; platform applicability; upstream attribution; last reviewer/change ID/time. A missing implementation has no earned implementation credit.

Use the existing explicit stage rubric unless there is a separately reviewed reason to change it:

`not_started 0 · planned 10 · implementation 40 · integrated 65 · validated 85 · complete 100`

Blocked items turn red but retain earned maturity; exclusions are visible and justified. Keep baseline weights stable. Calculate weighted progress deterministically; do not equate checklist count with engineering effort. Progress reflects a reviewed assessment, not measured percent of all coding or security work.

Each repository README must show its own product bar, scope/as-of date and detailed roadmap, plus a sibling-repository link. A cross-product summary may be documented but must not combine percentages without an explicit non-double-counting formula. A combined number is optional only with a documented formula and no double-counted shared requirements. Preserve the existing GUI number during a pure directory migration; explain any later real reassessment.

Use repository-local SVGs and accessible text/color labels. Produce a verbose Markdown all-feature report, normalized JSON, and an offline searchable dashboard. GitHub renders Markdown/SVG; raw HTML is not automatically a hosted app. Do not enable GitHub Pages without considering and authorizing its publication scope.

Remaining hours are low-confidence estimates, not elapsed AI runtime. Calendar ETAs stay **Unscheduled** until an actual owner/capacity/dependency schedule exists. A public upstream/auth/platform blocker must not be turned into a made-up date.

### Mandatory maintenance and enforcement

Update global and component `AGENTS.md`, `CONTRIBUTING.md`, existing vendor-specific instruction pointers, PR template and feature template. Every contributor must:

1. identify affected GUI/CLI/shared requirement IDs;
2. update evidence, stage, estimate/blocker or explicitly record an unchanged stage;
3. update the dated AI/human change record;
4. regenerate affected dashboards;
5. pass freshness and source/catalog review checks before publishing.

Parameterize or adapt the existing generator carefully. The GUI can retain its Python development tooling; that does not authorize requiring Python for installed MTerm CLI runtime. Prefer Node tooling for the new CLI's own metric generator, or a documented development-only shared tool that is excluded from the runtime package.

Test freshness coverage against edits in `gui/native`, GUI reference source, `cli/src`, CLI dependency pins/lockfiles, shared install/update/build scripts, schemas and instruction entry points. Do not let moving paths disable review enforcement. Keep byte-identical historical evidence immutable where appropriate; use relocation maps instead of rewriting factual histories.

A generator does not award credit automatically. A successful build does not make all related requirements 100%. Scope changes require a visible review; blocked Web/size/platform requirements cannot be excluded simply to make the CLI bar reach 100%.

---

## 14. Vendor-neutral AI attribution and interruption recovery

Retain current authorship and all third-party notices. New MTerm source has its appropriate SPDX identifier and AI change-record reference. Modified files append a concise modification attribution rather than claiming the whole file. Use the actual provider/model identity available to the session; use `unknown` when unavailable. Never invent co-authors, emails, credentials or timestamps.

Comments explain invariants, ownership, threading/process lifetime, units, non-obvious security choices and failure behavior. They do not narrate every line or stamp every line with an AI name. Store exact file diffs in Git and self-reported provenance in records.

Each task record includes UTC start/update, base SHA, component/requirement IDs, files, decisions, test commands/results, source commits, limitations, checkpoint location, next unverified action, and `roadmap_updates`. No private chain-of-thought, raw conversations, credentials or account identifiers belong in the record.

Checkpoint before migration, after verified relocation, after each working CLI vertical slice, before update/packaging changes, and before publication. Record outstanding process IDs/log files so reconnects do not duplicate work. Maintain `cli/docs/HANDOFF.md` and a root component-routing handoff.

When nearing an execution limit, stop at a coherent checkpoint and report exactly what is implemented, tested, published, merged and still blocked. A failed tool call is never evidence that an operation completed. Never leave an entire uncommitted implementation dependent on chat memory.

---

## 15. Suggested execution sequence and commit boundaries

**Phase A — verify split and reconciliation.** Recheck RDC/GitHub capabilities, local/remote SHAs, dirty state and recovery bundle. Verify MTerm-GUI/main contains the intended GUI history and MTerm-CLI/main contains only intentional CLI/bootstrap work. Exclude permission-test branches.

**Phase B — GUI export certification.** Verify GUI roadmap/fingerprint coverage, native Release/Debug and Electron-reference gates in MTerm-GUI. Fix split-path/metadata issues only; do not redesign GUI for CLI convenience. Record the authoritative GUI SHA.

**Phase C — CLI feasibility.** Re-read/pin upstreams and test actual entry points/help/fixtures. Resolve runtime/auth/browser/license/size contradictions in writing. Do not perform unattended real Web login/model tests.

**Phase D — CLI vertical skeleton.** Implement help/version/config/doctor and deterministic dispatch in MTerm-CLI, with clean installation and no GUI dependencies.

**Phase E — status vertical slice.** Integrate the pinned quota/status surface with Codex-first auth, bounded cache, box/line/JSON contracts and offline fixtures.

**Phase F — Codex launch vertical slice.** Resolve a real pinned native Codex executable, inherit TTY I/O, preserve cwd/flags/signals and test lifecycle without model-consuming prompts.

**Phase G — Web adapter.** Implement only a verified compliant non-GUI path or an explicitly approved companion mode. Keep blocked requirements visible; no fake picker or fallback.

**Phase H — updates/install/package.** Implement transactional reviewed-pin updates, checksum/staging/rollback, root npm-link/developer path and honest installed-size accounting.

**Phase I — CI, roadmaps and platform gates.** Complete the numbered CLI inventory, dashboards, provenance/freshness enforcement and actual supported runner results. GUI CI remains separate in MTerm-GUI.

**Phase J — integrate/release.** Merge verified CLI work through an ordinary MTerm-CLI PR. Verify remote/local trees. Tag only the accepted CLI scope. MTerm-GUI releases and tags remain independent.

Continue safe feasible work without repeated generic permission questions. Ask only for a real requirement conflict, human authentication/approval, destructive action, or unavailable publication capability.

---

## 16. Publication, tags and legacy retirement

### MTerm-GUI

Publish GUI-only changes to `MulattoTech/MTerm-GUI` through normal reviewed branches/PRs. Do not mix CLI implementation into GUI commits. Preserve imported history and existing GUI version/tag semantics.

### MTerm-CLI

Do not push a large untested CLI directly to main. Use a tested integration branch/PR, expected-head merge protection where available, then fetch/compare the resulting remote tree.

MTerm-CLI starts its own version line at `0.1.0`. Because it is a separate repository, `v0.1.0` is unambiguous if unused; `cli-v0.1.0` is also acceptable if deliberately chosen. Never overwrite a tag. Tag only the verified merged commit after required platform/Web/size/license gates, or explicitly label a preview/prerelease when mandatory acceptance remains blocked.

A tag is not npm publication, signing or release-asset upload.

### Workflow authority

Each repository has independent root workflows. If the GitHub connector can write a workflow but local Git cannot, use the already-authorized connector only for that repository and then fetch/reconcile its commit locally. Do not alter OAuth scopes or server protections to make a push pass.

### Legacy MTerm

After both replacement repos and recovery artifacts are verified, update the legacy repository README to point to MTerm-GUI and MTerm-CLI. Delete/retire it only through an explicitly supported repository administration capability. If no delete action exists, leave the repository as a migration archive and report that manual owner deletion remains available.

Never delete local recovery bundles/checkpoints merely because the remote was retired.

---

## 17. Deliverables and final report

Deliver real code and tests for every feature claimed.

Required outputs:

1. Verified split/reconciliation reports for MTerm-GUI, MTerm-CLI and legacy MTerm, with recovery bundle and exact SHAs.
2. MTerm-GUI as the tested desktop source of truth, with complete native/Electron/reference history, roadmap/evidence and attribution preserved.
3. MTerm-CLI as a standalone repository with implementation prompt/requirements seed, real code, tests, exact upstream pins, compatibility and security decisions.
4. Required CLI command modes with real behavior or explicit evidence-backed blockers.
5. Transactional user-initiated updater and thin portable shell delegate.
6. Tested MTerm-CLI repository-root link/install path without GUI dependencies.
7. Independent GUI and CLI CI state, with actual conclusions distinguished from merely written workflows.
8. Independent GUI/CLI numbered requirements and color progress dashboards; no cross-product credit leakage.
9. README in each repo that identifies the sibling product, its own version/install/runtime/progress and source-of-truth role.
10. CLI threat model, licenses/notices/SBOM, footprint report, auth/setup/rollback/troubleshooting, and vendor-neutral handoff.
11. Incremental attributed commits and verified PR/merge state in the correct repository; release tag only when its own acceptance gates pass.
12. Legacy repository migration notice or documented supported deletion result.

Final response must report: RDC/GitHub capability results; current GUI/CLI/local/remote SHAs; GUI export/history state; CLI implemented commands; upstream commits/versions; Web mode reality; auth requirements; platform results; installed-size accounting; actual CI state; separate GUI/CLI maturity; merge/tag state; legacy-retirement state; blockers and exact next steps.

Do not label Windows-only testing as macOS/Linux support, a workflow file as a passing workflow, an adapter stub as integration, Codex auth as browser login, or a source tree as an under-50-MB installed product.

---

## 18. Primary-source research references

These references support the preparation notes, not unverified promises about a future build. Resolve commit permalinks during execution; branch URLs may change.

- **S1:** OpenAI Codex README/install/license overview: https://github.com/openai/codex/blob/main/README.md
- **S2:** Codex native CLI manifest: https://github.com/openai/codex/blob/main/codex-rs/cli/Cargo.toml
- **S3:** Codex license: https://github.com/openai/codex/blob/main/LICENSE
- **S4:** codex-chatgpt-web README: https://github.com/miuuyy/codex-chatgpt-web/blob/main/README.md
- **S5:** Web bridge runtime manifest: https://github.com/miuuyy/codex-chatgpt-web/blob/main/package.json
- **S6:** Web launcher Electron manifest: https://github.com/miuuyy/codex-chatgpt-web/blob/main/launcher/package.json
- **S7:** Web architecture, lifecycle/auth/model-routing/limits distinctions: https://github.com/miuuyy/codex-chatgpt-web/blob/main/docs/architecture.md
- **S8:** pi-codex-status README: https://github.com/lhl/pi-codex-status/blob/main/README.md
- **S9:** Status package/export/runtime manifest: https://github.com/lhl/pi-codex-status/blob/main/package.json
- **S10:** Status CLI parsing/format/cache behavior: https://github.com/lhl/pi-codex-status/blob/main/src/cli.ts
- **S11:** Status credential selection/refresh/write behavior: https://github.com/lhl/pi-codex-status/blob/main/src/auth.ts
- **S12:** Node.js official release schedule: https://github.com/nodejs/Release/blob/main/schedule.json
- **S13:** Official OpenAI Codex credential-store guidance: https://openai.com/index/running-codex-safely/ and https://developers.openai.com/codex/auth/

The following appendix is an original engineering acceptance inventory derived from this implementation brief. It is not copied upstream documentation and does not assert that any listed feature has already been implemented.


---

## Appendix A — Individually numbered CLI implementation and acceptance seed
This appendix contains **262 atomic seed items**. Expand each into the verbose product checklist and machine-readable catalog specified above. Their presence here awards no completion credit. Conditional upstream work stays visible until its requirement is satisfied or the user explicitly approves a scope change.
For each item add: objective; detailed implementation boundaries; non-goals; dependencies; platform scope; safety constraints; exact test commands and evidence; reviewed stage and weight; remaining engineer-hour range/basis; ETA status/basis; blocker; reviewer/change ID/time. Further split multi-part acceptance when needed, preserving parent IDs and traceability.

### Access, discovery and source reconciliation

**CLI-001 — Identify the authorized workstation.**
Acceptance seed: Match the discovered device to the intended MTerm host before any mutation.

**CLI-002 — Verify local source write access.**
Acceptance seed: A new ignored file survives create, read-back, rename and second read-back.

**CLI-003 — Separate GitHub capabilities.**
Acceptance seed: Record branch/content/workflow writes, CI, merges and tags as separately verified or untested.

**CLI-004 — Check current repository identity.**
Acceptance seed: Confirm the exact owner/repository, default branch and local remote URL.

**CLI-005 — Inventory dirty and untracked work.**
Acceptance seed: Every pre-existing staged, unstaged or untracked item is preserved or explicitly classified.

**CLI-006 — Inventory published heads and open PRs.**
Acceptance seed: Record current hashes and distinguish unique work from integrated ancestry.

**CLI-007 — Exclude access probes from product merges.**
Acceptance seed: The access-check branch and disabled permission-test workflow do not enter product history.

**CLI-008 — Preserve local recovery-only branches.**
Acceptance seed: Local CI/history archives remain recoverable without installing unauthorized content.

**CLI-009 — Create a pre-change source checkpoint.**
Acceptance seed: Verify the source manifest and Git bundle, with sensitive/ignored exclusions documented.

**CLI-010 — Resolve content conflicts deliberately.**
Acceptance seed: Each true conflict receives a reviewed resolution, not a whole-tree local/remote overwrite.

**CLI-011 — Establish a verified publication baseline.**
Acceptance seed: Remote main and the local integration baseline have recorded, reconciled hashes/trees.

**CLI-012 — Record recovery and outstanding process state.**
Acceptance seed: A later session can identify the first unverified action without replaying completed mutations.

### GUI directory migration and preservation

**CLI-013 — Create the legacy-to-GUI export map.**
Acceptance seed: The map accounts for every GUI source, configuration, test and documentation path exported from legacy MTerm to MTerm-GUI.

**CLI-014 — Preserve legacy GUI Git history.**
Acceptance seed: The legacy GUI commit graph and required product refs remain recoverable in MTerm-GUI or the verified pre-split bundle.

**CLI-015 — Preserve GUI automation in MTerm-GUI root.**
Acceptance seed: GUI workflows live under MTerm-GUI/.github/workflows; CLI workflows live independently under MTerm-CLI/.github/workflows.

**CLI-016 — Preserve GUI contributor entry points and add CLI equivalents.**
Acceptance seed: Each repository's root instructions route work to that product and cross-link the sibling repository without duplicated mutable rules.

**CLI-017 — Export native GUI source to MTerm-GUI.**
Acceptance seed: The same native features remain buildable from MTerm-GUI/native after repository export.

**CLI-018 — Preserve the Electron reference in MTerm-GUI.**
Acceptance seed: The reference source, tests and dependency lock remain runnable in MTerm-GUI.

**CLI-019 — Isolate CLI from GUI package dependencies.**
Acceptance seed: MTerm-CLI installation does not transitively install packages from MTerm-GUI or Electron/Qt.

**CLI-020 — Verify native CMake paths in the MTerm-GUI checkout.**
Acceptance seed: Fresh configure/build succeeds without depending on the old source/build directory.

**CLI-021 — Verify PowerShell and GUI launchers in MTerm-GUI.**
Acceptance seed: Native build/package/start commands resolve the new product root correctly.

**CLI-022 — Verify GUI-reference test and fixture paths after export.**
Acceptance seed: Reference tests execute against the relocated source, not stale previous builds.

**CLI-023 — Preserve GUI roadmap identity and scope.**
Acceptance seed: IDs, baseline weights and requirement text survive migration without artificial credit.

**CLI-024 — Correct GUI evidence references.**
Acceptance seed: Every live evidence path resolves after relocation; historical provenance stays attributable.

**CLI-025 — Verify GUI source-fingerprint coverage in MTerm-GUI.**
Acceptance seed: Changing MTerm-GUI/native or its GUI reference source demonstrably invalidates an unreviewed GUI metric snapshot.

**CLI-026 — Preserve checkpoints and ignored user state.**
Acceptance seed: No auth, profile, old checkout, artifact or active toolchain is swept into a bulk move.

**CLI-027 — Recreate path-sensitive caches safely.**
Acceptance seed: New CMake/Python/Node development state is tested while old recoverable state is retained.

**CLI-028 — Keep compatible desktop launching.**
Acceptance seed: A documented old entry point forwards correctly or has a clearly tested replacement.

**CLI-029 — Verify unchanged GUI behavior.**
Acceptance seed: Native/reference gates run; relocation-only edits do not redesign GUI business behavior.

**CLI-030 — Keep GUI business work independent after export.**
Acceptance seed: Later CLI commits contain no unrelated GUI changes; necessary path fixes are separately justified.

### Feasibility and architecture decisions

**CLI-031 — Inspect all three actual upstream projects.**
Acceptance seed: Read manifests, source entry points, auth, lifecycle and licensing at recorded commits.

**CLI-032 — Document the native Codex boundary.**
Acceptance seed: The adapter invokes Codex as a native binary rather than assuming JavaScript internals.

**CLI-033 — Select a supported Node LTS for MTerm glue.**
Acceptance seed: Verify lifecycle support and pin/test the selected Node line and patch policy.

**CLI-034 — Determine the Web runtime dependency set.**
Acceptance seed: Identify Bun, Electron/browser and bridge/helper requirements from the selected upstream pin.

**CLI-035 — Resolve the no-daemon constraint.**
Acceptance seed: Prove compliant operation or record the exact session-helper/persistent-service deviation for approval.

**CLI-036 — Resolve the no-GUI constraint.**
Acceptance seed: Do not ship a desktop launcher inside the purported pure CLI without an explicit approved exception.

**CLI-037 — Resolve the single-runtime constraint.**
Acceptance seed: Report extra upstream runtimes separately; a compiled helper is not mislabeled pure Node.

**CLI-038 — Resolve the under-50-MB constraint.**
Acceptance seed: Measure all required installed payloads and leave the requirement blocked if they exceed the budget.

**CLI-039 — Keep the three-integration scope visible.**
Acceptance seed: Core-only progress never silently excludes the desired Web integration from completion accounting.

**CLI-040 — Record module and lifecycle ownership.**
Acceptance seed: Each adapter has a narrow contract, owner, cancellation policy and bounded resources.

### Entry point and CLI argument behavior

**CLI-041 — Provide an executable mterm-cli entry point.**
Acceptance seed: The installed/link-created command invokes the real CLI from outside the checkout.

**CLI-042 — Make help work offline.**
Acceptance seed: Help succeeds without credentials, dependencies installed, network or model calls.

**CLI-043 — Make version output deterministic.**
Acceptance seed: Version identifies MTerm CLI independently of the GUI and can report pinned components safely.

**CLI-044 — Dispatch the required subcommands.**
Acceptance seed: Status, update and config route correctly without being forwarded accidentally to Codex.

**CLI-045 — Support explicit Codex argument passthrough.**
Acceptance seed: Arguments following -- reach Codex byte/argument-equivalently without shell evaluation.

**CLI-046 — Preserve the caller working directory.**
Acceptance seed: Launch tests show Codex sees the requested caller workspace rather than the install directory.

**CLI-047 — Handle paths with spaces and Unicode.**
Acceptance seed: Launch and config paths work without quoting loss or command injection.

**CLI-048 — Preserve inherited terminal I/O.**
Acceptance seed: The actual agent gets interactive stdin/stdout/stderr where appropriate, not captured fake TUI output.

**CLI-049 — Propagate interrupts and shutdown.**
Acceptance seed: Ctrl+C and relevant signals reach the intended child and restore terminal state.

**CLI-050 — Preserve child exit outcomes.**
Acceptance seed: Codex failures/cancellation are not converted into a misleading MTerm success exit.

**CLI-051 — Avoid unsolicited startup work.**
Acceptance seed: Ordinary launches do not update, install, query quotas or silently reconfigure credentials.

**CLI-052 — Define non-interactive semantics.**
Acceptance seed: Pipes and redirected input do not hang on hidden confirmation prompts.

**CLI-053 — Reject unknown wrapper flags safely.**
Acceptance seed: Wrapper errors are explicit while passthrough arguments remain available after the delimiter.

**CLI-054 — Avoid executable recursion/collisions.**
Acceptance seed: Resolving codex never resolves mterm-cli back to itself or replaces an unrelated installation.

### Codex binary integration

**CLI-055 — Resolve exact Codex version and artifact.**
Acceptance seed: The manifest names a real source commit and the corresponding platform distribution.

**CLI-056 — Verify Codex download integrity.**
Acceptance seed: Hash/signature checks use reviewed provenance and reject a modified artifact.

**CLI-057 — Select only the current platform payload.**
Acceptance seed: A production install does not carry every operating system and architecture binary.
**CLI-058 — Support an explicitly selected existing Codex.**
Acceptance seed: External-binary mode validates compatibility and labels itself dependency-reuse, not self-contained.

**CLI-059 — Preserve Codex configuration precedence.**
Acceptance seed: The wrapper respects supported CODEX_HOME/config behavior without silently overriding user settings.

**CLI-060 — Preserve Codex safety approvals.**
Acceptance seed: No approval-bypass or sandbox-weakening flags are automatically added.

**CLI-061 — Test actual upstream executable startup.**
Acceptance seed: Allowed non-model probes verify real binary launch in addition to deterministic child fixtures.

**CLI-062 — Diagnose missing/incompatible executables.**
Acceptance seed: Errors distinguish absence, wrong architecture, unsupported version and execution failure.

**CLI-063 — Preserve resumable session behavior.**
Acceptance seed: Documented Codex resume arguments pass through without relocating or corrupting its history.

**CLI-064 — Avoid persistent agent processes by default.**
Acceptance seed: No resident service remains merely because help, config or status was used.

### ChatGPT Web integration

**CLI-065 — Pin the Web adapter and compatibility contract.**
Acceptance seed: Record the actual commit/version and compatible Codex route/model contract.

**CLI-066 — Verify a genuine non-GUI integration path.**
Acceptance seed: Exercise a supported path or record why the selected upstream requires an approved companion.

**CLI-067 — Keep one-time setup explicit.**
Acceptance seed: Initial browser/session/connector setup has a named entry point and clear human actions.

**CLI-068 — Reuse supported existing Web sessions.**
Acceptance seed: Reuse is limited to upstream-supported owned profiles, not cookie extraction or arbitrary session copying.

**CLI-069 — Distinguish Web and Codex auth readiness.**
Acceptance seed: Doctor/config do not treat auth.json presence as a browser login.

**CLI-070 — Verify real model discovery.**
Acceptance seed: Model availability is sourced from the configured account/integration, not a hardcoded marketing list.

**CLI-071 — Make configured Web routes available in Codex.**
Acceptance seed: Test the actual picker/catalog path under the compatible upstream protocol.

**CLI-072 — Prevent silent transport/model fallback.**
Acceptance seed: An unavailable selected Web model fails clearly instead of secretly using native/API quota.

**CLI-073 — Preserve model identity and supported effort.**
Acceptance seed: Do not translate effort/model settings through guessed undocumented flags.

**CLI-074 — Protect existing model routes.**
Acceptance seed: Any required config integration is scoped, backed up and conflict-checked before mutation.

**CLI-075 — Restore only owned route changes.**
Acceptance seed: Disable/rollback restores MTerm-owned settings without undoing unrelated user changes.

**CLI-076 — Own any approved session helper lifetime.**
Acceptance seed: Start/stop only helpers belonging to the MTerm session, with explicit version and health checks.

**CLI-077 — Do not install background autostart.**
Acceptance seed: No login item, scheduled task, system service or persistent daemon is enabled without separate approval.

**CLI-078 — Handle browser/selector drift explicitly.**
Acceptance seed: Changed upstream behavior yields a diagnosed failure, not repeated submissions or guessed results.

**CLI-079 — Handle interrupted Web sessions safely.**
Acceptance seed: Cancellation avoids duplicate submissions and leaves owned helper/session state understandable.

**CLI-080 — Keep Codex quota distinct from Web allowances.**
Acceptance seed: Usage labels never claim that pi-codex-status is a Web/Pro message counter.

**CLI-081 — Gate live Web acceptance on authorization.**
Acceptance seed: An account-bound smoke is opt-in, records actual behavior and never exposes credentials.

**CLI-082 — Keep incompatible Web acceptance blocked.**
Acceptance seed: No final all-three-components completion claim while required runtime/auth/size conflicts remain unresolved.

### Credential source and refresh safety

**CLI-083 — Default quota auth to Codex.**
Acceptance seed: The upstream auto preference cannot silently select MultiCodex or pi accounts.

**CLI-084 — Honor an explicit auth-file path.**
Acceptance seed: The requested source is resolved safely without falling back to unrelated accounts.

**CLI-085 — Honor supported CODEX_HOME behavior.**
Acceptance seed: An alternate Codex home is handled through an explicit adapter path when upstream lacks support.

**CLI-086 — Handle missing credentials.**
Acceptance seed: Show actionable existing-login guidance without creating a new MTerm account.

**CLI-087 — Handle malformed credentials.**
Acceptance seed: Invalid JSON/types fail safely and do not produce partial token-bearing diagnostics.

**CLI-088 — Handle API-key versus OAuth mode.**
Acceptance seed: Unsupported quota data is marked unavailable rather than fabricating OAuth usage.

**CLI-089 — Handle OS keyring credentials honestly.**
Acceptance seed: Unsupported keyring access is reported; credentials are never exported to plaintext for convenience.

**CLI-090 — Keep credentials out of process arguments.**
Acceptance seed: Bearer/refresh tokens and cookies never appear in argv or diagnostic command examples.

**CLI-091 — Keep credentials out of logs and stdout.**
Acceptance seed: All success/error paths are tested with sentinel secrets absent from output.

**CLI-092 — Keep credentials out of repository artifacts.**
Acceptance seed: Staging, snapshots, issue bodies and CI uploads exclude real credential material.

**CLI-093 — Identify token-refresh side effects.**
Acceptance seed: Document whether the pinned status adapter can write the shared auth source.

**CLI-094 — Bound refresh timeout/retries.**
Acceptance seed: A refresh failure cannot hang a status command or repeatedly rotate tokens.

**CLI-095 — Protect concurrent credential updates.**
Acceptance seed: Test account changes and unrelated field edits; use coordinated or fail-closed behavior.

**CLI-096 — Preserve credential file protection.**
Acceptance seed: Legitimate authorized refresh maintains owner-only protection and existing unrelated fields.

**CLI-097 — Distinguish app-local locks from external coordination.**
Acceptance seed: Do not claim that an MTerm lock serializes an unrelated Codex process.

**CLI-098 — Prevent statusline auth mutation.**
Acceptance seed: The default prompt-hook path cannot quietly refresh credentials or initiate sign-in.

**CLI-099 — Avoid account details in public output.**
Acceptance seed: Email/account identifiers are omitted or pseudonymized unless explicitly requested and safe.

**CLI-100 — Handle revoked/expired auth without evasion.**
Acceptance seed: Report the required human upstream reauthentication; do not switch identities to escape limits.

### Quota acquisition and normalization

**CLI-101 — Integrate the real pi status surface.**
Acceptance seed: The wrapper calls verified library/CLI behavior, not a replacement hardcoded success report.

**CLI-102 — Recognize private endpoint instability.**
Acceptance seed: The implementation documents and distinguishes schema drift and unsupported responses.

**CLI-103 — Preserve source window durations.**
Acceptance seed: Window duration remains source-driven in seconds rather than always assuming two fixed periods.

**CLI-104 — Normalize used and remaining percentages.**
Acceptance seed: Test supported values, bounds, missing values and semantics without silently clamping away errors.

**CLI-105 — Preserve reset timestamp units.**
Acceptance seed: Unix seconds and milliseconds are handled explicitly and normalized consistently.

**CLI-106 — Render local reset times safely.**
Acceptance seed: Local display and UTC machine timestamps agree, including daylight-saving boundaries.

**CLI-107 — Distinguish missing versus zero quota.**
Acceptance seed: Null/unknown data cannot be displayed as exhausted or fully available.

**CLI-108 — Normalize credits without invention.**
Acceptance seed: Known balance, unknown balance and source-supported unlimited state remain distinct.

**CLI-109 — Preserve additional named limits.**
Acceptance seed: Per-model or named limits are carried through with bounded safe labels.

**CLI-110 — Return meaningful service errors.**
Acceptance seed: 401,403,429,timeout,offline and server failures have distinct tested diagnoses.

**CLI-111 — Respect retry guidance and rate limits.**
Acceptance seed: Bounded retries honor Retry-After and do not hammer private endpoints.

**CLI-112 — Avoid model calls for usage inspection.**
Acceptance seed: Status tests assert that no coding completion or Web message is sent.

**CLI-113 — Prevent credential-bearing origin changes.**
Acceptance seed: Endpoint overrides and redirects cannot send real tokens to an arbitrary host.

**CLI-114 — Bound response size and parsing.**
Acceptance seed: Oversized/malformed upstream responses are rejected with sanitized error output.

### Status rendering and machine contracts

**CLI-115 — Render the requested boxed status.**
Acceptance seed: The normal terminal view shows supported quota/credits/resets in a readable box.

**CLI-116 — Render a single compact status line.**
Acceptance seed: The --line mode emits one bounded line, not spinners or multiline diagnostics.

**CLI-117 — Produce versioned JSON-only stdout.**
Acceptance seed: The --json path emits exactly one parseable document on success and expected errors.

**CLI-118 — Use stable structured error codes.**
Acceptance seed: Consumers do not need to scrape human error strings to distinguish failure modes.

**CLI-119 — Expose freshness in every format.**
Acceptance seed: Fresh, cached, stale and unavailable values remain distinguishable.

**CLI-120 — Support NO_COLOR and dumb terminals.**
Acceptance seed: No-color/plain modes avoid ANSI escapes and unsuitable Unicode decoration.

**CLI-121 — Handle narrow display widths.**
Acceptance seed: Clipping/wrapping remains readable and does not corrupt the terminal.

**CLI-122 — Sanitize untrusted terminal controls.**
Acceptance seed: Upstream labels/errors cannot inject CSI/OSC hyperlinks, titles or escape sequences.

**CLI-123 — Preserve shell/tmux prompt safety.**
Acceptance seed: Status text does not execute or inject prompt-language syntax through unescaped values.

**CLI-124 — Define quota-exhausted exit semantics.**
Acceptance seed: A valid exhausted quota result is not mistaken for network or parser failure.

**CLI-125 — Keep raw secret-bearing data private.**
Acceptance seed: Normalized output never includes auth documents or unfiltered HTTP error bodies.

**CLI-126 — Keep output deterministic under fixtures.**
Acceptance seed: Stable snapshots cover time/locale-sensitive output with controlled clocks and settings.

### Cache ownership and performance

**CLI-127 — Use a per-user cache location.**
Acceptance seed: Platform paths are documented and isolated from GUI state and source checkout.

**CLI-128 — Bind cache to the selected account/source.**
Acceptance seed: Switching accounts cannot display a previous account’s quota.

**CLI-129 — Define cache schema and size bounds.**
Acceptance seed: Unknown schema/corrupt/oversized cache fails safely without unbounded reads.

**CLI-130 — Write cache atomically.**
Acceptance seed: Interrupted writes do not destroy the last usable snapshot.

**CLI-131 — Test concurrent readers and writers.**
Acceptance seed: Contention produces coherent snapshots, not partial JSON or silent cross-account merges.

**CLI-132 — Implement explicit TTL behavior.**
Acceptance seed: Freshness is deterministic under a controlled clock.

**CLI-133 — Handle future clock/skew cases.**
Acceptance seed: A future timestamp does not become indefinitely fresh.

**CLI-134 — Handle cache directory permission errors.**
Acceptance seed: Status can report the problem without changing broad filesystem permissions.

**CLI-135 — Offer clearly labeled stale fallback.**
Acceptance seed: Network failure may reuse an allowed stale result only with visible staleness.

**CLI-136 — Keep statusline bounded and offline by default.**
Acceptance seed: A prompt hook does not wait for a remote request or create a background worker.

### Configuration and diagnostics

**CLI-137 — Implement effective config display.**
Acceptance seed: Show non-secret values and precedence sources, not raw auth.

**CLI-138 — Implement typed config get/set.**
Acceptance seed: Unsupported keys and wrong types are rejected before mutation.

**CLI-139 — Implement safe config editing.**
Acceptance seed: An invalid editor result preserves the previous validated configuration.

**CLI-140 — Version config schemas.**
Acceptance seed: Migrations preserve existing values and are tested against representative old files.

**CLI-141 — Use atomic config writes and backups.**
Acceptance seed: A failed write/migration does not strand the installed CLI.

**CLI-142 — Reject prototype-pollution keys.**
Acceptance seed: Merging configuration cannot alter object prototypes or runtime behavior through inherited properties.

**CLI-143 — Resolve config/data/cache paths explicitly.**
Acceptance seed: Flags/environment/default precedence is documented and tested.

**CLI-144 — Provide offline doctor output.**
Acceptance seed: Dependency/auth-source/config/cache readiness is diagnosed without real token or model calls.

**CLI-145 — Provide structured doctor JSON.**
Acceptance seed: Missing, unsupported, blocked and ready states are stable machine-readable values.

**CLI-146 — Keep network diagnostics opt-in.**
Acceptance seed: A health check requiring network is clearly separate from ordinary help/config inspection.

### Dependency pins and source provenance

**CLI-147 — Create immutable versions.json records.**
Acceptance seed: Each required component has an exact source commit and distribution identity.

**CLI-148 — Record platform asset checksums.**
Acceptance seed: Downloads can be checked against a trusted reviewed manifest.

**CLI-149 — Commit a coherent CLI package lock.**
Acceptance seed: Clean installs reproduce the same declared production dependency graph.

**CLI-150 — Record the compatible three-component set.**
Acceptance seed: Pins are tested as a combination, not independently assumed compatible.

**CLI-151 — Choose a maintainable vendor strategy.**
Acceptance seed: Submodule/subtree/snapshot initialization and update behavior work from a clean clone.

**CLI-152 — Preserve upstream notices and licenses.**
Acceptance seed: Vendored code retains its original licenses and attribution.

**CLI-153 — Track patches separately.**
Acceptance seed: Every patch has rationale, hash, upstream base and regression evidence.

**CLI-154 — Detect upstream patch drift.**
Acceptance seed: An update refuses to silently apply a patch to incompatible source.

**CLI-155 — Avoid shipping full upstream development histories.**
Acceptance seed: The runtime package excludes repositories/toolchains/tests not required to execute.

**CLI-156 — Separate desired pins from installed state.**
Acceptance seed: The installed manifest records exact active versions without rewriting source pins.

### Transactional updater

**CLI-157 — Implement non-mutating update check.**
Acceptance seed: --check reports available/reviewed differences without changing installed state or auth.

**CLI-158 — Display old-to-new changes before apply.**
Acceptance seed: The user sees components, hashes, compatibility and footprint implications.

**CLI-159 — Require deliberate update confirmation.**
Acceptance seed: Interactive confirmation or explicit non-interactive --yes is required for mutation.

**CLI-160 — Avoid automatic startup updates.**
Acceptance seed: Default launch/status/config do not call update or schedule it.

**CLI-161 — Use a scoped update lock.**
Acceptance seed: Concurrent updaters cannot activate conflicting versions.

**CLI-162 — Validate stale lock ownership.**
Acceptance seed: Recovery does not kill unrelated processes or delete unrelated lock paths.

**CLI-163 — Stage into a new owned directory.**
Acceptance seed: The active installation remains untouched during download/build/test.

**CLI-164 — Bound download time and size.**
Acceptance seed: A hanging or oversized artifact cannot consume unlimited resources.

**CLI-165 — Verify hashes before execution/extraction.**
Acceptance seed: Untrusted or modified binaries/scripts are never executed.

**CLI-166 — Reject archive traversal and link escapes.**
Acceptance seed: Absolute entries, parent traversal and unsafe symlink/hardlink targets fail safely.

**CLI-167 — Reject decompression bombs.**
Acceptance seed: Extraction enforces file count and expanded-byte budgets.

**CLI-168 — Run compatibility checks before activation.**
Acceptance seed: Failed build/tests/smokes leave the previous version selected.

**CLI-169 — Activate atomically.**
Acceptance seed: The command sees either the old or new coherent component set, not a partial mixture.

**CLI-170 — Support exact manifest rollback.**
Acceptance seed: Rollback selects a known previous owned version without disturbing user state.

**CLI-171 — Preserve active sessions during updates.**
Acceptance seed: Versioned binaries are not removed or replaced beneath running jobs.

**CLI-172 — Preserve config/auth/cache/browser profiles.**
Acceptance seed: An update never resets account login or deletes private state.

**CLI-173 — Protect linked developer checkouts.**
Acceptance seed: Installed-user update logic cannot git-reset or overwrite source/vendor edits.

**CLI-174 — Keep update.sh a thin wrapper.**
Acceptance seed: Shell and CLI entry points call the same tested update engine.

### Install and runtime distribution

**CLI-175 — Implement MTerm-CLI repository-root npm link.**
Acceptance seed: A clean install from MTerm-CLI repository root exposes mterm-cli without cloning/installing MTerm-GUI.

**CLI-176 — Resolve symlinked entry paths.**
Acceptance seed: Linked commands find their own package/resources outside the current working directory.

**CLI-177 — Isolate global test links.**
Acceptance seed: Test install/uninstall uses an owned temporary prefix and preserves unrelated commands.

**CLI-178 — Inspect the real packed tarball.**
Acceptance seed: Unpack the produced package and assert its complete file allowlist.

**CLI-179 — Exclude private and development material.**
Acceptance seed: No credentials, browser profiles, raw chats, source maps without reason or caches enter distribution.

**CLI-180 — Exclude GUI/runtime bloat.**
Acceptance seed: The CLI dependency/install graph contains no Qt/Electron/GUI code unless explicitly approved as a separate mode.

**CLI-181 — Record all production dependency bytes.**
Acceptance seed: The size report counts target binaries, transitive modules and mandatory side-downloads.

**CLI-182 — Separate compressed and installed size.**
Acceptance seed: The under-50-MB claim uses extracted bytes, not archive compression.

**CLI-183 — Label preinstalled prerequisite mode.**
Acceptance seed: Reusing Node/Codex/companion installations is not presented as a self-contained bundle.

**CLI-184 — Provide safe optional installer semantics.**
Acceptance seed: A bootstrap verifies pinned artifacts, avoids sudo/autostart and preserves shell configuration.

**CLI-185 — Version the CLI separately.**
Acceptance seed: MTerm GUI 0.2.0 and future versions are not overwritten by CLI 0.1.0.

**CLI-186 — Diagnose unsupported runtime/platform installs.**
Acceptance seed: Errors identify required architecture/OS/runtime instead of partially installing.

### Platform support and native terminal behavior

**CLI-187 — Validate macOS arm64 execution.**
Acceptance seed: Run the actual supported artifact on an arm64 macOS environment.

**CLI-188 — Validate macOS x86-64 execution.**
Acceptance seed: Run the actual Intel artifact rather than assuming arm64 results cover it.

**CLI-189 — Validate Linux x86-64 execution.**
Acceptance seed: Declare and test the supported libc/distribution floor and executable permissions.

**CLI-190 — Assess Linux arm64 explicitly.**
Acceptance seed: Record whether the full chosen upstream set is supported and tested, or keep it out of claimed support.

**CLI-191 — Preserve Windows development capability.**
Acceptance seed: Build/test scripts work on the actual workstation without assuming Unix shell availability.

**CLI-192 — Verify actual runner architecture.**
Acceptance seed: CI records process OS/architecture; moving runner labels are not assumed equivalent.

**CLI-193 — Test interactive terminal integration.**
Acceptance seed: TTY detection, resize, interrupts and exit restoration work under representative terminals.

**CLI-194 — Test redirected/non-TTY invocation.**
Acceptance seed: Commands have documented behavior under pipes, files and CI.

**CLI-195 — Test cancellation and descendant cleanup.**
Acceptance seed: Owned session helpers stop without killing unrelated user processes.

**CLI-196 — Document untested platform boundaries.**
Acceptance seed: Unsupported/skipped coverage cannot be presented as a passing support matrix.

### Security and privacy gates

**CLI-197 — Use minimal operation permissions.**
Acceptance seed: Local file/network/process capabilities are separated and no global settings are widened.

**CLI-198 — Keep Codex safety controls intact.**
Acceptance seed: MTerm never installs automatic approval bypasses for convenience.

**CLI-199 — Validate executable and managed-install paths.**
Acceptance seed: Untrusted config cannot redirect updates or execution outside owned/trusted locations silently.

**CLI-200 — Sanitize diagnostics consistently.**
Acceptance seed: Sentinel credentials are absent from normal errors, debug logs and support reports.

**CLI-201 — Restrict credential-bearing endpoint origins.**
Acceptance seed: Arbitrary endpoints/redirects cannot receive auth headers.

**CLI-202 — Reject insecure TLS behavior.**
Acceptance seed: No insecure TLS flags or certificate-validation disablement are added.

**CLI-203 — Prevent silent quota evasion.**
Acceptance seed: No account switching, route fallback or repeated submission is used to avoid product limits.

**CLI-204 — Keep browser access legitimate.**
Acceptance seed: No session theft, cookie export, CAPTCHA bypass or unsupported privilege escalation.

**CLI-205 — Keep default operation daemon-free.**
Acceptance seed: No persistent updater/status worker/listener or OS startup registration is installed.

**CLI-206 — Separate fixture and real credentials.**
Acceptance seed: Fixture endpoints/modes cannot read the real user auth home.

### Automated testing and CI

**CLI-207 — Create the root CLI workflow.**
Acceptance seed: The actual .github/workflows/cli-ci.yml is present and readable on the intended branch.

**CLI-208 — Pin workflow actions and permissions.**
Acceptance seed: Third-party action refs and least-privilege settings are reviewed.

**CLI-209 — Run credential-free status JSON in CI.**
Acceptance seed: A temporary dummy auth plus offline/mock provider exercises the real normalization path.

**CLI-210 — Block external network in fixture tests.**
Acceptance seed: Dummy or real secrets cannot reach ChatGPT from the test suite.

**CLI-211 — Test missing auth and expired-token failures.**
Acceptance seed: CI validates failure schemas as well as a happy-path usage snapshot.

**CLI-212 — Run typecheck/lint/unit/integration gates.**
Acceptance seed: Commands fail the job on actual errors rather than relying on final echo output.

**CLI-213 — Run update failure-injection tests.**
Acceptance seed: Hash, download, archive, lock, activation and rollback failures are covered.

**CLI-214 — Run clean link/pack/install tests.**
Acceptance seed: The produced CLI installs and runs outside the developer checkout without GUI dependencies.

**CLI-215 — Run all claimed OS/architecture jobs.**
Acceptance seed: Missing runners remain visible; a Windows-only local result is not cross-platform acceptance.

**CLI-216 — Inspect real workflow conclusions.**
Acceptance seed: Written, queued, skipped, failed and passed workflows are distinguished.

**CLI-217 — Keep model tests opt-in.**
Acceptance seed: No routine CI job submits paid/token-consuming coding or Web requests.

**CLI-218 — Preserve GUI regression evidence.**
Acceptance seed: Migration acceptance runs the existing GUI native/reference gates rather than only CLI tests.

### CLI roadmap, progress bars and governance

**CLI-219 — Create a separate CLI requirement catalog.**
Acceptance seed: Every original request maps to stable CLI IDs without importing GUI progress credit.

**CLI-220 — Expand the atomic seed inventory.**
Acceptance seed: Each item receives verbose scope, acceptance, dependencies, paths and test evidence.

**CLI-221 — Keep conditional and blocked requirements visible.**
Acceptance seed: Web/size/auth/platform conflicts cannot disappear from the denominator without approved scope change.

**CLI-222 — Use evidence-backed stage credit.**
Acceptance seed: 0/10/40/65/85/100 stage semantics have explicit acceptance criteria.

**CLI-223 — Freeze baseline weights per task.**
Acceptance seed: Weights cannot be adjusted just to increase the reported overall percentage.

**CLI-224 — Compute weighted overall CLI maturity.**
Acceptance seed: Math is deterministic and tested; requirement count is not treated as effort.

**CLI-225 — Show independent GUI and CLI README bars.**
Acceptance seed: MTerm-GUI README links its GUI bar/roadmap and MTerm-CLI README links its CLI bar/roadmap; both link the sibling product.

**CLI-226 — Preserve GUI percentage during repository export.**
Acceptance seed: Repository export alone confers no additional GUI implementation credit.

**CLI-227 — Render color-coded per-item and area bars.**
Acceptance seed: Accessible text accompanies local SVG colors; blockers retain earned credit.

**CLI-228 — Publish a verbose numbered feature table.**
Acceptance seed: Every CLI requirement has percentage, remaining effort, ETA state, evidence and blocker.

**CLI-229 — Provide an offline searchable dashboard.**
Acceptance seed: Search/status/component filters work without external badge or runtime services.

**CLI-230 — Keep ETA assumptions honest.**
Acceptance seed: Calendar dates require an actual capacity/dependency basis; otherwise use Unscheduled.

**CLI-231 — Record reviewed source/catalog fingerprints.**
Acceptance seed: Changing CLI source, pins or reviewed settings invalidates stale assessments.

**CLI-232 — Test exported GUI fingerprint coverage.**
Acceptance seed: Changes under MTerm-GUI/native and its GUI reference paths are still caught.

**CLI-233 — Enforce metrics at relevant gates.**
Acceptance seed: Build/package/CI publication checks reject stale reviews rather than silently regenerating credit.

**CLI-234 — Update contributor entry points in both repositories.**
Acceptance seed: Each repository's AGENTS, templates and existing vendor pointers require metrics maintenance.

**CLI-235 — Separate rendering from review approval.**
Acceptance seed: A render command cannot satisfy the explicit human/AI assessment requirement.

**CLI-236 — Retain complete cross-repository source-project traceability.**
Acceptance seed: GUI lineage and the CLI’s three upstream licenses/features remain documented independently.

### AI attribution and recovery

**CLI-237 — Record actual contributor identity.**
Acceptance seed: Provider/model is self-reported accurately or unknown; no invented provenance.

**CLI-238 — Preserve original authorship.**
Acceptance seed: Modified upstream/GUI files retain their origin and receive scoped change references.

**CLI-239 — Explain non-obvious invariants in comments.**
Acceptance seed: Ownership, credential boundaries, units and lifecycle assumptions are visible near relevant code.

**CLI-240 — Write durable task change records.**
Acceptance seed: UTC/base SHA/IDs/files/tests/decisions/limitations/next step are inside the repository.

**CLI-241 — Record mandatory roadmap_updates.**
Acceptance seed: Every source change has a reviewed metric update or a justified no-stage-change review.

**CLI-242 — Checkpoint migration and vertical slices.**
Acceptance seed: Verified bundles/manifests permit recovery without relying on chat memory.

**CLI-243 — Resume from observed state.**
Acceptance seed: Reconnect inspects actual processes/files/logs before repeating a write or install.

**CLI-244 — Leave vendor-neutral handoff instructions.**
Acceptance seed: Another AI company’s model can discover the current source of truth and next task from the repo.

### Release integration and delivery

**CLI-245 — Prepare a reviewable integration PR.**
Acceptance seed: Migration, implementation, evidence, generated metrics and upstream decisions are inspectable.

**CLI-246 — Reconcile concurrent upstream changes.**
Acceptance seed: Merge decisions use refreshed remote hashes and avoid overwriting work added during execution.

**CLI-247 — Merge with expected-head protection.**
Acceptance seed: Ordinary repository checks/permissions are respected without force or policy changes.

**CLI-248 — Verify the resulting main tree.**
Acceptance seed: Fetch and compare remote/local state after the successful merge action.

**CLI-249 — Select a non-conflicting CLI tag.**
Acceptance seed: Prefer cli-v0.1.0; a bare v0.1.0 is used only when unused and explicitly scoped.

**CLI-250 — Tag only accepted mandatory scope.**
Acceptance seed: Required unvalidated Web/size/platform behavior blocks a full release claim unless scope is explicitly revised.

**CLI-251 — Keep tag and package publication distinct.**
Acceptance seed: No claim that a Git tag automatically published npm assets, signed binaries or releases.

**CLI-252 — Preserve rollback and old branches.**
Acceptance seed: No destructive history cleanup, tag overwrite or branch deletion is bundled into release.

**CLI-253 — Deliver a complete final evidence report.**
Acceptance seed: Report exact commands, SHAs, size accounting, compatibility, real CI state and known blockers.

**CLI-254 — Publish runnable setup/update/rollback documentation.**
Acceptance seed: A fresh user can install, diagnose, use and recover the CLI without hidden developer context.

### Footprint and latency verification

**CLI-255 — Measure wrapper overhead separately.**
Acceptance seed: Startup timing excludes remote model reasoning and distinguishes cold/warm environments.

**CLI-256 — Measure cached statusline latency.**
Acceptance seed: The reported timing comes from the real packaged path with a stated environment/sample count.

**CLI-257 — Measure each platform installation.**
Acceptance seed: Disk accounting is performed after extraction, including automatically installed requirements.

**CLI-258 — Prove status/help do not start heavyweight helpers.**
Acceptance seed: Process/fixture tests detect accidental browser, GUI, agent or daemon startup.

**CLI-259 — Bound process and log memory.**
Acceptance seed: Long command output and helper errors do not accumulate without a configured bound.

**CLI-260 — Test installed behavior rather than only source execution.**
Acceptance seed: Packaged/link-installed artifacts pass the same representative command contracts.

**CLI-261 — Expose performance regressions honestly.**
Acceptance seed: Measured regressions remain visible; no “never slows down” or unlike CLI/GUI comparison claims.

**CLI-262 — Keep development tooling out of runtime.**
Acceptance seed: Build/test/progress generation dependencies are excluded from installed CLI operation where possible.

---

## Appendix B — Executor kickoff

Verify this session’s actual RDC/GitHub capabilities, inspect current local/remote state and the enabled repository instructions, preserve a checkpoint, and begin the reconciliation/feasibility phases. Use the supplied research as leads, not evergreen facts. Keep all three desired integrations and every GUI preservation requirement visible. Produce the maximum genuinely tested implementation possible, with the exact remaining blockers recorded rather than invented completion.
