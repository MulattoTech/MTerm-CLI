# MTerm capability delivery register

**143 scoped product requirements** cover 272/272 feature bullets and 488/488 mission bullets. Inventory observation: 2026-11-12T17:21:23.133206+00:00. Later component delivery observations retain their own timestamps.

This is an evidence inventory. Overall mission maturity is not calculated. Repository checks validate record coherence; reviewers must still establish the truth and completeness of each qualification receipt.

[Machine-readable register](register.json) · [Derived counts](summary.json) · [Original mission](mission-2026-11-12.md) · [Metric and update contract](README.md)

| Whole-requirement axis | Qualified / total |
| --- | ---: |
| Code complete | 0 / 143 |
| Tested | 0 / 143 |
| Merged | 0 / 143 |
| Deployed | 0 / 143 |
| Accepted | 0 / 143 |

143 requirements have issue owners; 117 have partial source observations, 84 have partial components in the original baseline, and 40 reference subsequently qualified component deliveries. These overlapping counts are not acceptance or a completion percentage.

## Separate baseline catalogs

| Catalog | Requirements |
| --- | ---: |
| CLI-300 | 300 |
| DCP-48 | 48 |
| WEB-12 | 12 |
| AUG-117 | 117 |

The CLI seed, progress snapshot, DCP, WEB and AUG baseline hashes are checked. These scopes overlap and their denominators remain separate.

## Component delivery observations

9 qualified source deliveries across the owning repositories are recorded separately from runtime deployment and whole-requirement acceptance.

| Observation | Source / layer | Status |
| --- | --- | --- |
| modernization-qualified-main | [MulattoTech/MTerm-CLI #249](https://github.com/MulattoTech/MTerm-CLI/pull/249), `83a97daed6ef92b69e681b6b68f982f5d4266a51`; standalone_cli | QUALIFIED_PARTIAL_COMPONENTS; 2026-11-12T22:09:14.100364+00:00; whole requirement acceptance: false |
| remote-profiles-candidate | [MulattoTech/MTerm-CLI #256](https://github.com/MulattoTech/MTerm-CLI/pull/256), `4742c179cbb94a0e0c5cefdff1df32ba50ebdc66`; standalone_cli | SUPERSEDED_PARTIAL_CANDIDATE; 2026-11-12T17:51:53.782770+00:00; historical, superseded by remote-profiles-corrected-candidate; whole requirement acceptance: false |
| remote-profiles-corrected-candidate | [MulattoTech/MTerm-CLI #256](https://github.com/MulattoTech/MTerm-CLI/pull/256), `4fb205088e77731e42da5adaca6bf167f8b75194`; standalone_cli | MERGED_PENDING_MAIN_QUALIFICATION; 2026-11-12T18:13:00.676692+00:00; historical, superseded by remote-profiles-qualified-main; whole requirement acceptance: false |
| remote-profiles-qualified-main | [MulattoTech/MTerm-CLI #256](https://github.com/MulattoTech/MTerm-CLI/pull/256), `4fb205088e77731e42da5adaca6bf167f8b75194`; standalone_cli | QUALIFIED_PARTIAL_COMPONENTS; 2026-11-12T22:09:14.100364+00:00; whole requirement acceptance: false |
| capability-register-qualified-main | [MulattoTech/MTerm-CLI #257](https://github.com/MulattoTech/MTerm-CLI/pull/257), `f447c0baac3f36470d6fd96360928c6a2a192c4b`; standalone_cli | QUALIFIED_PARTIAL_COMPONENTS; 2026-11-12T22:09:14.100364+00:00; whole requirement acceptance: false |
| public-endpoint-inspector-qualified-main | [MulattoTech/MTerm-CLI #258](https://github.com/MulattoTech/MTerm-CLI/pull/258), `da03dc5255976b1524b22796fffadb01e50a5149`; standalone_cli | QUALIFIED_PARTIAL_COMPONENTS; 2026-11-12T22:09:14.100364+00:00; whole requirement acceptance: false |
| managed-upstream-033-qualified-main | [MulattoTech/MTechLabs-Access #24](https://github.com/MulattoTech/MTechLabs-Access/pull/24), `ef8dce0e1863e63958c4421e8506c9bdb5e881e0`; managed_bridge | QUALIFIED_PARTIAL_COMPONENTS; 2026-11-12T22:09:14.100364+00:00; whole requirement acceptance: false |
| engineering-descriptions-qualified-main | [MulattoTech/MTechLabs-Access #25](https://github.com/MulattoTech/MTechLabs-Access/pull/25), `499255adf0c3988558eb4b1dd04ee95ad3c7da33`; managed_bridge | QUALIFIED_PARTIAL_COMPONENTS; 2026-11-12T22:09:14.100364+00:00; whole requirement acceptance: false |
| managed-job-reauthorization-qualified-main | [MulattoTech/MTechLabs-Access #27](https://github.com/MulattoTech/MTechLabs-Access/pull/27), `9353b53a15cf50b67f4e9d452935e58a0bc9b8f3`; managed_bridge | QUALIFIED_PARTIAL_COMPONENTS; 2026-11-12T22:09:14.100364+00:00; whole requirement acceptance: false |
| canonical-plugin-source-qualified-main | [MulattoTech/MTechLabs-Access #28](https://github.com/MulattoTech/MTechLabs-Access/pull/28), `ff31efca7c94ca4653305c61e9b933ce835cc04f`; canonical_plugin | QUALIFIED_PARTIAL_COMPONENTS; 2026-11-12T22:09:14.100364+00:00; whole requirement acceptance: false |
| device-observations-qualified-main | [MulattoTech/MTerm-CLI #259](https://github.com/MulattoTech/MTerm-CLI/pull/259), `6a6a883f3ce1cd86a7405d2c53a1fb08cd1210c2`; standalone_staging_gateway | QUALIFIED_PARTIAL_COMPONENTS; 2026-11-12T22:22:36.707532+00:00; whole requirement acceptance: false |

## Saved plugin packages

- 0.2.3: saved package readback 2026-11-12T21:17:52.593543+00:00; later source reconciliation 2026-11-12T22:09:14.100364+00:00. Backend deployment, canonical-only OAuth, UI activation and wrapper removal remain unverified.

## Product requirements

| Requirement | Category | Acceptance owner | Current scope | Qualified components | Whole acceptance |
| --- | --- | --- | --- | --- | --- |
| **MTR-AUTH-01** Trusted remote authentication and v0.3.3 upgrade qualification | upstream_security | [#10](https://github.com/MulattoTech/MTerm-CLI/issues/10) | IMPLEMENTING; 3 source groups; 1 delivery observations | 1 | NOT_ACCEPTED |
| **MTR-EXEC-01** Shell-aware blocklists, nested wrappers and incomplete inspection | upstream_security | [#14](https://github.com/MulattoTech/MTerm-CLI/issues/14) | IMPLEMENTING; 1 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-EXEC-02** Owned process-tree termination and accurate PID ownership | process_reliability | [#40](https://github.com/MulattoTech/MTerm-CLI/issues/40) | IMPLEMENTING; 4 source groups; 2 delivery observations | 2 | NOT_ACCEPTED |
| **MTR-EXEC-03** Remote timeout alignment and bounded long-running calls | process_reliability | [#37](https://github.com/MulattoTech/MTerm-CLI/issues/37) | IMPLEMENTING; 2 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-EXEC-04** Session cancellation and downstream work cleanup | process_reliability | [#40](https://github.com/MulattoTech/MTerm-CLI/issues/40) | IMPLEMENTING; 1 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-FILE-01** Path and symlink boundary enforcement | files | [#13](https://github.com/MulattoTech/MTerm-CLI/issues/13) | IMPLEMENTING; 2 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-FILE-02** Explicit overwrite and checked patch behavior | files | [#22](https://github.com/MulattoTech/MTerm-CLI/issues/22) | IMPLEMENTING; 3 source groups; 1 delivery observations | 1 | NOT_ACCEPTED |
| **MTR-CAT-01** Structured tool schemas and side-effect declarations | capability_registry | [#9](https://github.com/MulattoTech/MTerm-CLI/issues/9) | IMPLEMENTING; 1 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-DEVICE-01** Website onboarding and Add Computer entry | device_registration | [#56](https://github.com/MulattoTech/MTerm-CLI/issues/56) | IMPLEMENTING; 2 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-DEVICE-02** Install/connection method selection and remote launchers | device_registration | [#64](https://github.com/MulattoTech/MTerm-CLI/issues/64) | IMPLEMENTING; 1 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-RUNTIME-01** Verified Node runtime support and installers | runtime | [#8](https://github.com/MulattoTech/MTerm-CLI/issues/8) | IMPLEMENTING; 1 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-DEVICE-03** Presence, heartbeat, last seen and actual executor readiness | device_registration | [#57](https://github.com/MulattoTech/MTerm-CLI/issues/57) | IMPLEMENTING; 3 source groups; 1 delivery observations | 1 | NOT_ACCEPTED |
| **MTR-DEVICE-04** Reconnect and credential-rotation recovery | device_registration | [#57](https://github.com/MulattoTech/MTerm-CLI/issues/57) | IMPLEMENTING; 2 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-DEVICE-05** Independent simultaneous multi-device management | device_registration | [#58](https://github.com/MulattoTech/MTerm-CLI/issues/58) | IMPLEMENTING; 2 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-DEVICE-06** Per-device roots, tool scopes, read-only and execution policy | device_registration | [#55](https://github.com/MulattoTech/MTerm-CLI/issues/55) | IMPLEMENTING; 3 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-TRANS-01** MQTT and realtime transport capability classification | transport | [#10](https://github.com/MulattoTech/MTerm-CLI/issues/10) | IMPLEMENTING; 1 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-TRANS-02** Acknowledgements, retry and correlation-safe deduplication | transport | [#57](https://github.com/MulattoTech/MTerm-CLI/issues/57) | IMPLEMENTING; 2 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-DIAG-01** Private redacted diagnostics and support bundles | observability | [#63](https://github.com/MulattoTech/MTerm-CLI/issues/63) | IMPLEMENTING; 2 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-RUNTIME-02** Windows environment propagation and shell quoting | runtime | [#36](https://github.com/MulattoTech/MTerm-CLI/issues/36) | IMPLEMENTING; 1 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-RUNTIME-03** Windows libuv threadpool and process responsiveness | runtime | [#37](https://github.com/MulattoTech/MTerm-CLI/issues/37) | IMPLEMENTING; 1 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-EXEC-05** Bounded process output, pagination and buffering | process_reliability | [#39](https://github.com/MulattoTech/MTerm-CLI/issues/39) | IMPLEMENTING; 2 source groups; 1 delivery observations | 1 | NOT_ACCEPTED |
| **MTR-FILE-03** Reliable asynchronous file/Office search completion | files | [#31](https://github.com/MulattoTech/MTerm-CLI/issues/31) | IMPLEMENTING; 3 source groups; 1 delivery observations | 1 | NOT_ACCEPTED |
| **MTR-JOBS-01** Durable job state and interrupted-work recovery | orchestration | [#130](https://github.com/MulattoTech/MTerm-CLI/issues/130) | IMPLEMENTING; 4 source groups; 2 delivery observations | 2 | NOT_ACCEPTED |
| **MTR-DOC-01** PDF read/create/modify and Docker rendering | documents | [#29](https://github.com/MulattoTech/MTerm-CLI/issues/29) | IMPLEMENTING; 2 source groups; 1 delivery observations | 1 | NOT_ACCEPTED |
| **MTR-DOC-02** Excel read/edit/search with range integrity | documents | [#28](https://github.com/MulattoTech/MTerm-CLI/issues/28) | IMPLEMENTING; 1 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-DOC-03** DOCX read/create/edit/search fidelity | documents | [#30](https://github.com/MulattoTech/MTerm-CLI/issues/30) | IMPLEMENTING; 1 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-DOC-04** Markdown preview, editing and disk-conflict handling | documents | [#160](https://github.com/MulattoTech/MTerm-CLI/issues/160) | DESIGNED; 0 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-FILE-04** Directory navigation and bounded listing | files | [#24](https://github.com/MulattoTech/MTerm-CLI/issues/24) | IMPLEMENTING; 1 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-FILE-05** Fuzzy surgical edits | files | [#27](https://github.com/MulattoTech/MTerm-CLI/issues/27) | IMPLEMENTING; 3 source groups; 1 delivery observations | 1 | NOT_ACCEPTED |
| **MTR-DOC-05** Rich images, Office and structured tool result contracts | documents | [#160](https://github.com/MulattoTech/MTerm-CLI/issues/160) | IMPLEMENTING; 1 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-DIST-01** MCPB bundle generation and installed validation | packaging | [#3](https://github.com/MulattoTech/MTerm-CLI/issues/3) | IMPLEMENTING; 1 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-DIST-02** MCP Registry publishable manifest and release verification | packaging | [#3](https://github.com/MulattoTech/MTerm-CLI/issues/3) | IMPLEMENTING; 1 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-CLIENT-01** Gemini CLI setup and actual client proof | client_integration | [#60](https://github.com/MulattoTech/MTerm-CLI/issues/60) | DESIGNED; 0 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-CLIENT-02** Supported VS Code, Cursor and Claude client integration matrix | client_integration | [#60](https://github.com/MulattoTech/MTerm-CLI/issues/60) | DESIGNED; 0 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-SKILL-01** Versioned skill discovery, permissions and reusable workflows | knowledge_skills | [#133](https://github.com/MulattoTech/MTerm-CLI/issues/133) | IMPLEMENTING; 1 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-DIST-03** Reversible installation and explicit safe update tooling | packaging | [#7](https://github.com/MulattoTech/MTerm-CLI/issues/7) | IMPLEMENTING; 2 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-CI-01** Coverage and cross-platform test execution | verification | [#8](https://github.com/MulattoTech/MTerm-CLI/issues/8) | IMPLEMENTING; 1 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-CI-02** Installed-package and installer lifecycle tests | verification | [#8](https://github.com/MulattoTech/MTerm-CLI/issues/8) | IMPLEMENTING; 2 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-CI-03** Frozen-source validation and reproducible packaging | verification | [#8](https://github.com/MulattoTech/MTerm-CLI/issues/8) | IMPLEMENTING; 2 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-CI-04** Dependency and license security inventory | verification | [#107](https://github.com/MulattoTech/MTerm-CLI/issues/107) | IMPLEMENTING; 1 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-TRUTH-01** Component source/deployment provenance and tool inventory | source_truth | [#63](https://github.com/MulattoTech/MTerm-CLI/issues/63) | IMPLEMENTING; 2 source groups; 1 delivery observations | 1 | NOT_ACCEPTED |
| **MTR-DIST-04** Qualified alpha-to-stable promotion | packaging | [#7](https://github.com/MulattoTech/MTerm-CLI/issues/7) | IMPLEMENTING; 2 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-DIST-05** Deployment rollback preserving sessions and credentials | packaging | [#61](https://github.com/MulattoTech/MTerm-CLI/issues/61) | IMPLEMENTING; 2 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-PLUGIN-01** Canonical plugin authorization without required duplicate wrapper | plugin | [#209](https://github.com/MulattoTech/MTerm-CLI/issues/209) | DESIGNED; 1 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-CAT-02** Unified namespace, stable capability discovery and duplicate reconciliation | capability_registry | [#83](https://github.com/MulattoTech/MTerm-CLI/issues/83) | IMPLEMENTING; 2 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-CAT-03** Selective tool packs with enforced permission scopes | capability_registry | [#82](https://github.com/MulattoTech/MTerm-CLI/issues/82) | IMPLEMENTING; 2 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-PROFILE-04** Independent development/staging settings and credentials | connection_profiles | [#252](https://github.com/MulattoTech/MTerm-CLI/issues/252) | IMPLEMENTING; 5 source groups; 3 delivery observations | 2 | NOT_ACCEPTED |
| **MTR-PLUGIN-02** Canonical reconnection after manager upgrade | plugin | [#209](https://github.com/MulattoTech/MTerm-CLI/issues/209) | IMPLEMENTING; 2 source groups; 1 delivery observations | 1 | NOT_ACCEPTED |
| **MTR-DIAG-02** Explicit authenticated/disconnected/unauthorized/degraded states | observability | [#63](https://github.com/MulattoTech/MTerm-CLI/issues/63) | IMPLEMENTING; 3 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-PLUGIN-03** Actual canonical ChatGPT integration qualification | plugin | [#209](https://github.com/MulattoTech/MTerm-CLI/issues/209) | DESIGNED; 1 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-AUTH-02** Website sign-in, account ownership and user authorization | device_registration | [#55](https://github.com/MulattoTech/MTerm-CLI/issues/55) | IMPLEMENTING; 3 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-DEVICE-07** Expiring consented device-code enrollment | device_registration | [#56](https://github.com/MulattoTech/MTerm-CLI/issues/56) | IMPLEMENTING; 2 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-DEVICE-08** Device name, labels, groups and website listing | device_registration | [#58](https://github.com/MulattoTech/MTerm-CLI/issues/58) | IMPLEMENTING; 2 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-DEVICE-09** Explicit session/device target binding | device_registration | [#55](https://github.com/MulattoTech/MTerm-CLI/issues/55) | IMPLEMENTING; 2 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-DEVICE-10** Credential rotation, disconnect, consent and revocation | device_registration | [#59](https://github.com/MulattoTech/MTerm-CLI/issues/59) | IMPLEMENTING; 3 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-DEVICE-11** Windows-first agent with explicit Linux/macOS boundaries | device_registration | [#57](https://github.com/MulattoTech/MTerm-CLI/issues/57) | IMPLEMENTING; 2 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-DEVICE-12** Signed/verified device identity and protected per-device secrets | device_registration | [#56](https://github.com/MulattoTech/MTerm-CLI/issues/56) | IMPLEMENTING; 2 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-DEVICE-13** Reported version and agent upgrade status | device_registration | [#58](https://github.com/MulattoTech/MTerm-CLI/issues/58) | IMPLEMENTING; 2 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-DEVICE-14** Safe pause, stop, reconnect and lifecycle control | device_registration | [#57](https://github.com/MulattoTech/MTerm-CLI/issues/57) | IMPLEMENTING; 2 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-DEVICE-15** Auditable ownership and access decisions | device_registration | [#63](https://github.com/MulattoTech/MTerm-CLI/issues/63) | IMPLEMENTING; 1 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-DEVICE-16** Opt-in same-user autostart and reboot recovery | device_registration | [#64](https://github.com/MulattoTech/MTerm-CLI/issues/64) | IMPLEMENTING; 1 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-DEVICE-17** Reversible uninstall and credential-revocation workflow | device_registration | [#59](https://github.com/MulattoTech/MTerm-CLI/issues/59) | IMPLEMENTING; 2 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-PROFILE-01** Managed/default, custom Cloudflare and approved local profiles | connection_profiles | [#250](https://github.com/MulattoTech/MTerm-CLI/issues/250) | IMPLEMENTING; 2 source groups; 2 delivery observations | 1 | NOT_ACCEPTED |
| **MTR-PROFILE-02** Endpoint/protocol validation and SSRF prevention | connection_profiles | [#251](https://github.com/MulattoTech/MTerm-CLI/issues/251) | IMPLEMENTING; 3 source groups; 1 delivery observations | 1 | NOT_ACCEPTED |
| **MTR-PROFILE-03** Cloudflare Access and provider-specific OAuth validation | connection_profiles | [#252](https://github.com/MulattoTech/MTerm-CLI/issues/252) | IMPLEMENTING; 1 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-PROFILE-05** No public unauthenticated listener or insecure fallback | connection_profiles | [#251](https://github.com/MulattoTech/MTerm-CLI/issues/251) | IMPLEMENTING; 3 source groups; 1 delivery observations | 1 | NOT_ACCEPTED |
| **MTR-PROFILE-06** Profile metadata and secret-free portal representation | connection_profiles | [#250](https://github.com/MulattoTech/MTerm-CLI/issues/250) | IMPLEMENTING; 1 source groups; 2 delivery observations | 1 | NOT_ACCEPTED |
| **MTR-PROFILE-07** Profile health, last connection and capability discovery | connection_profiles | [#253](https://github.com/MulattoTech/MTerm-CLI/issues/253) | IMPLEMENTING; 1 source groups; 1 delivery observations | 1 | NOT_ACCEPTED |
| **MTR-PROFILE-08** Secure profile edit, test, disable and delete controls | connection_profiles | [#253](https://github.com/MulattoTech/MTerm-CLI/issues/253) | DESIGNED; 0 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-PROFILE-09** Explicit per-device/client defaults and target routing | connection_profiles | [#62](https://github.com/MulattoTech/MTerm-CLI/issues/62) | IMPLEMENTING; 2 source groups; 2 delivery observations | 1 | NOT_ACCEPTED |
| **MTR-PROFILE-10** Per-profile secret isolation, rotation and revocation | connection_profiles | [#252](https://github.com/MulattoTech/MTerm-CLI/issues/252) | IMPLEMENTING; 3 source groups; 2 delivery observations | 1 | NOT_ACCEPTED |
| **MTR-PROFILE-11** Redacted profile-routing audit records | connection_profiles | [#62](https://github.com/MulattoTech/MTerm-CLI/issues/62) | DESIGNED; 0 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-ENG-01** Repository Doctor workflow | repository_engineering | [#133](https://github.com/MulattoTech/MTerm-CLI/issues/133) | IMPLEMENTING; 2 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-ENG-02** PR Finisher workflow | repository_engineering | [#133](https://github.com/MulattoTech/MTerm-CLI/issues/133) | IMPLEMENTING; 1 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-ENG-03** Worktree lifecycle and isolated coordinated edit leases | repository_engineering | [#66](https://github.com/MulattoTech/MTerm-CLI/issues/66) | IMPLEMENTING; 2 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-ENG-04** Clean/dirty and stale branch detection | repository_engineering | [#66](https://github.com/MulattoTech/MTerm-CLI/issues/66) | IMPLEMENTING; 2 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-ENG-05** Merge-conflict analysis and safe parallel merges | repository_engineering | [#118](https://github.com/MulattoTech/MTerm-CLI/issues/118) | IMPLEMENTING; 1 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-ENG-06** Automated test discovery/selection | repository_engineering | [#106](https://github.com/MulattoTech/MTerm-CLI/issues/106) | DESIGNED; 0 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-ENG-07** CI failure triage and CI Failure Investigator skill | repository_engineering | [#116](https://github.com/MulattoTech/MTerm-CLI/issues/116) | IMPLEMENTING; 1 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-ENG-08** Dependency graph, call paths and change impact | repository_engineering | [#99](https://github.com/MulattoTech/MTerm-CLI/issues/99) | IMPLEMENTING; 2 source groups; 1 delivery observations | 1 | NOT_ACCEPTED |
| **MTR-ENG-09** AST-aware navigation and structural analysis | repository_engineering | [#97](https://github.com/MulattoTech/MTerm-CLI/issues/97) | IMPLEMENTING; 2 source groups; 1 delivery observations | 1 | NOT_ACCEPTED |
| **MTR-ENG-10** Real LSP definition/reference integration | repository_engineering | [#96](https://github.com/MulattoTech/MTerm-CLI/issues/96) | IMPLEMENTING; 3 source groups; 1 delivery observations | 1 | NOT_ACCEPTED |
| **MTR-ENG-11** Semantic/hybrid indexed code search | repository_engineering | [#101](https://github.com/MulattoTech/MTerm-CLI/issues/101) | IMPLEMENTING; 3 source groups; 1 delivery observations | 1 | NOT_ACCEPTED |
| **MTR-ENG-12** Reliable cross-file rename/refactoring | repository_engineering | [#109](https://github.com/MulattoTech/MTerm-CLI/issues/109) | IMPLEMENTING; 2 source groups; 1 delivery observations | 1 | NOT_ACCEPTED |
| **MTR-ENG-13** Source-grounded persistent code knowledge graph | repository_engineering | [#98](https://github.com/MulattoTech/MTerm-CLI/issues/98) | DESIGNED; 0 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-MEM-01** Persistent code comprehension and project memory | knowledge_skills | [#110](https://github.com/MulattoTech/MTerm-CLI/issues/110) | DESIGNED; 0 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-ENG-14** Build/test results and reproducible engineering evidence | repository_engineering | [#114](https://github.com/MulattoTech/MTerm-CLI/issues/114) | IMPLEMENTING; 2 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-ENG-15** Evidence-based automated PR review | repository_engineering | [#108](https://github.com/MulattoTech/MTerm-CLI/issues/108) | IMPLEMENTING; 3 source groups; 1 delivery observations | 1 | NOT_ACCEPTED |
| **MTR-ENG-16** Release readiness checks | repository_engineering | [#81](https://github.com/MulattoTech/MTerm-CLI/issues/81) | IMPLEMENTING; 2 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-ENG-17** Plan, implementation, test and review loop | repository_engineering | [#134](https://github.com/MulattoTech/MTerm-CLI/issues/134) | IMPLEMENTING; 2 source groups; 1 delivery observations | 1 | NOT_ACCEPTED |
| **MTR-MEM-02** Cross-session handoff and compact taskbook | knowledge_skills | [#132](https://github.com/MulattoTech/MTerm-CLI/issues/132) | DESIGNED; 0 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-MEM-03** Source-cited memory, privacy and stale knowledge detection | knowledge_skills | [#138](https://github.com/MulattoTech/MTerm-CLI/issues/138) | DESIGNED; 0 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-MEM-04** Knowledge import, indexing and documentation retrieval | knowledge_skills | [#105](https://github.com/MulattoTech/MTerm-CLI/issues/105) | DESIGNED; 0 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-MEM-05** Context-efficient retrieval and grounded workflow improvement | knowledge_skills | [#139](https://github.com/MulattoTech/MTerm-CLI/issues/139) | DESIGNED; 0 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-SKILL-02** Readable Markdown tool and skill metadata | knowledge_skills | [#246](https://github.com/MulattoTech/MTerm-CLI/issues/246) | IMPLEMENTING; 3 source groups; 2 delivery observations | 2 | NOT_ACCEPTED |
| **MTR-SKILL-03** Windows Performance Analyst skill | knowledge_skills | [#254](https://github.com/MulattoTech/MTerm-CLI/issues/254) | DESIGNED; 0 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-SKILL-04** Cloudflare Doctor skill | knowledge_skills | [#133](https://github.com/MulattoTech/MTerm-CLI/issues/133) | DESIGNED; 0 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-SKILL-05** MTerm Self-Diagnostics skill | knowledge_skills | [#133](https://github.com/MulattoTech/MTerm-CLI/issues/133) | DESIGNED; 1 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-SKILL-06** GitHub Backlog Reconciler skill | knowledge_skills | [#133](https://github.com/MulattoTech/MTerm-CLI/issues/133) | DESIGNED; 0 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-SKILL-07** MCP Connection Doctor skill | knowledge_skills | [#133](https://github.com/MulattoTech/MTerm-CLI/issues/133) | IMPLEMENTING; 2 source groups; 1 delivery observations | 1 | NOT_ACCEPTED |
| **MTR-SKILL-08** Device Enrollment Doctor skill | knowledge_skills | [#133](https://github.com/MulattoTech/MTerm-CLI/issues/133) | DESIGNED; 0 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-ORCH-01** Task decomposition, dependency planning and role definitions | orchestration | [#127](https://github.com/MulattoTech/MTerm-CLI/issues/127) | IMPLEMENTING; 2 source groups; 1 delivery observations | 1 | NOT_ACCEPTED |
| **MTR-ORCH-02** Bounded delegation and follow-up queues | orchestration | [#137](https://github.com/MulattoTech/MTerm-CLI/issues/137) | IMPLEMENTING; 2 source groups; 1 delivery observations | 1 | NOT_ACCEPTED |
| **MTR-ORCH-03** Agent execution isolation | orchestration | [#84](https://github.com/MulattoTech/MTerm-CLI/issues/84) | IMPLEMENTING; 1 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-ORCH-04** Configurable concurrency and queue admission | orchestration | [#128](https://github.com/MulattoTech/MTerm-CLI/issues/128) | IMPLEMENTING; 4 source groups; 1 delivery observations | 1 | NOT_ACCEPTED |
| **MTR-ORCH-05** Duplicate-work prevention and authoritative ownership | orchestration | [#112](https://github.com/MulattoTech/MTerm-CLI/issues/112) | IMPLEMENTING; 3 source groups; 2 delivery observations | 2 | NOT_ACCEPTED |
| **MTR-ORCH-06** Per-agent and global cancellation | orchestration | [#131](https://github.com/MulattoTech/MTerm-CLI/issues/131) | IMPLEMENTING; 3 source groups; 1 delivery observations | 1 | NOT_ACCEPTED |
| **MTR-ORCH-07** Resource/model budget awareness | orchestration | [#92](https://github.com/MulattoTech/MTerm-CLI/issues/92) | IMPLEMENTING; 3 source groups; 1 delivery observations | 1 | NOT_ACCEPTED |
| **MTR-METRIC-01** Evidence-driven granular engineering progress | progress | [#255](https://github.com/MulattoTech/MTerm-CLI/issues/255) | IMPLEMENTING; 2 source groups; 1 delivery observations | 1 | NOT_ACCEPTED |
| **MTR-ORCH-08** Review and permission gates | orchestration | [#134](https://github.com/MulattoTech/MTerm-CLI/issues/134) | IMPLEMENTING; 2 source groups; 1 delivery observations | 1 | NOT_ACCEPTED |
| **MTR-ORCH-09** Bounded error recovery and retry classification | orchestration | [#130](https://github.com/MulattoTech/MTerm-CLI/issues/130) | IMPLEMENTING; 2 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-AUDIT-01** Structured task/tool audit trail | observability | [#89](https://github.com/MulattoTech/MTerm-CLI/issues/89) | IMPLEMENTING; 1 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-OPS-01** Windows processes, services and background-job diagnostics | system_operations | [#254](https://github.com/MulattoTech/MTerm-CLI/issues/254) | IMPLEMENTING; 2 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-OPS-02** Startup performance analysis | system_operations | [#254](https://github.com/MulattoTech/MTerm-CLI/issues/254) | DESIGNED; 0 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-OPS-03** Scheduled-task and Windows Event Log diagnostics | system_operations | [#254](https://github.com/MulattoTech/MTerm-CLI/issues/254) | IMPLEMENTING; 1 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-OPS-04** PowerShell and network diagnostics | system_operations | [#254](https://github.com/MulattoTech/MTerm-CLI/issues/254) | IMPLEMENTING; 1 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-OPS-05** Docker and WSL diagnostics | system_operations | [#254](https://github.com/MulattoTech/MTerm-CLI/issues/254) | IMPLEMENTING; 1 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-OPS-06** Permissioned Hyper-V diagnostics and lifecycle operations | system_operations | [#254](https://github.com/MulattoTech/MTerm-CLI/issues/254) | IMPLEMENTING; 1 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-OPS-07** Disk/file integrity and hardware inventory | system_operations | [#254](https://github.com/MulattoTech/MTerm-CLI/issues/254) | IMPLEMENTING; 1 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-OPS-08** Cloudflare Tunnel and Access diagnostics | system_operations | [#189](https://github.com/MulattoTech/MTerm-CLI/issues/189) | DESIGNED; 0 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-OPS-09** Environment/configuration troubleshooting | system_operations | [#63](https://github.com/MulattoTech/MTerm-CLI/issues/63) | IMPLEMENTING; 1 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-OPS-10** Explicitly authorized system-repair workflows | system_operations | [#254](https://github.com/MulattoTech/MTerm-CLI/issues/254) | DESIGNED; 0 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-CLIENT-03** Native Codex registration and installed invocation | client_integration | [#4](https://github.com/MulattoTech/MTerm-CLI/issues/4) | IMPLEMENTING; 1 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-CLIENT-04** Plugin Creator package/update integration | client_integration | [#209](https://github.com/MulattoTech/MTerm-CLI/issues/209) | IMPLEMENTING; 2 source groups; 1 delivery observations | 1 | NOT_ACCEPTED |
| **MTR-CLIENT-05** Template and Skill Creator workflow integration | client_integration | [#133](https://github.com/MulattoTech/MTerm-CLI/issues/133) | DESIGNED; 0 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-CLIENT-06** GitHub repository and CI provider adapter | client_integration | [#113](https://github.com/MulattoTech/MTerm-CLI/issues/113) | IMPLEMENTING; 1 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-CLIENT-07** Cloudflare deployment integration | client_integration | [#61](https://github.com/MulattoTech/MTerm-CLI/issues/61) | IMPLEMENTING; 1 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-CLIENT-08** Optional local-model provider extension boundary | client_integration | [#135](https://github.com/MulattoTech/MTerm-CLI/issues/135) | IMPLEMENTING; 2 source groups; 1 delivery observations | 1 | NOT_ACCEPTED |
| **MTR-CLIENT-09** Permissioned browser automation | client_integration | [#152](https://github.com/MulattoTech/MTerm-CLI/issues/152) | DESIGNED; 0 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-CLIENT-10** OCR and document extraction | client_integration | [#154](https://github.com/MulattoTech/MTerm-CLI/issues/154) | DESIGNED; 0 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-CLIENT-11** Symbolic math and verified numeric computation | client_integration | [#163](https://github.com/MulattoTech/MTerm-CLI/issues/163) | IMPLEMENTING; 1 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-CLIENT-12** Modular data, visualization, CAD and gaming interfaces | client_integration | [#82](https://github.com/MulattoTech/MTerm-CLI/issues/82) | IMPLEMENTING; 1 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-OBS-01** Reliable owner/role-aware administration dashboard | observability | [#63](https://github.com/MulattoTech/MTerm-CLI/issues/63) | IMPLEMENTING; 2 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-OBS-02** Real tool invocation timeline and per-tool execution status | observability | [#144](https://github.com/MulattoTech/MTerm-CLI/issues/144) | IMPLEMENTING; 1 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-OBS-03** Queue wait/depth and active/completed jobs | observability | [#149](https://github.com/MulattoTech/MTerm-CLI/issues/149) | IMPLEMENTING; 2 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-OBS-04** Measured outcomes and usage summaries | observability | [#46](https://github.com/MulattoTech/MTerm-CLI/issues/46) | DESIGNED; 1 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-OBS-05** Device health monitoring | observability | [#58](https://github.com/MulattoTech/MTerm-CLI/issues/58) | IMPLEMENTING; 3 source groups; 1 delivery observations | 1 | NOT_ACCEPTED |
| **MTR-OBS-06** Per-client observability, trace IDs and safe errors | observability | [#63](https://github.com/MulattoTech/MTerm-CLI/issues/63) | IMPLEMENTING; 1 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-OBS-07** Authenticated bounded live SSE/WebSocket event stream | observability | [#144](https://github.com/MulattoTech/MTerm-CLI/issues/144) | DESIGNED; 0 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-OBS-08** Optional Windows tray companion | observability | [#247](https://github.com/MulattoTech/MTerm-CLI/issues/247) | DESIGNED; 0 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-OBS-09** Accessible event-grounded optional cortex visualization | observability | [#195](https://github.com/MulattoTech/MTerm-CLI/issues/195) | DESIGNED; 0 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-PROFILE-12** Two-computer/two-profile authorized end-to-end routing | connection_profiles | [#65](https://github.com/MulattoTech/MTerm-CLI/issues/65) | DESIGNED; 0 source groups; 0 delivery observations | 0 | NOT_ACCEPTED |
| **MTR-PLUGIN-04** Preserve fallback access throughout canonical migration | plugin | [#209](https://github.com/MulattoTech/MTerm-CLI/issues/209) | IMPLEMENTING; 2 source groups; 1 delivery observations | 1 | NOT_ACCEPTED |

Full acceptance criteria, dependencies, original bullet text, baseline mappings, limitations, layer-specific source observations and exact evidence references are retained in register.json. Governance/discovery obligations are mapped separately and never count as product completion.
