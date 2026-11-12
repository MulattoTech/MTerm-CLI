# Independent profile review — d412b774

## Verdict

**Source and narrow corrective delta approved. Merge qualification is pending successful exact-candidate CI.** No additional source blocker was found after the scoped independent review. The original candidate was blocked by a reproducible installed-package verifier path defect; the revised commit corrects that defect without weakening validation.

- Base: `83a97daed6ef92b69e681b6b68f982f5d4266a51`.
- Initially reviewed/tested source: `4742c179cbb94a0e0c5cefdff1df32ba50ebdc66`, tree `36e1c1114c60b21a9d603904fbd5c3be522a6d6d`.
- Revised candidate: `d412b7748ad6747f0b7fbc670e6ec252b74ebdf5`, tree `a41dd2124f4f9106ae86fbd6c42022bf44a9f9c3`.
- Pull request: https://github.com/MulattoTech/MTerm-CLI/pull/256.
- Runtime source and test tree objects are identical between the two candidates.

## Independent verification

The requested nine-file focused suite passed **104/104 tests**, with zero failures, skips or cancellations on Linux Node24.22.1. Wall time was 5.438 seconds. A no-emit TypeScript check also completed successfully. These commands ran in a separate immutable-source scratch clone; no tracked source, shared worktree, GitHub record or production service was changed.

The review covered profile selection/admission, environment isolation, public and protected scope binding, lifecycle routing, legacy compatibility, bounded inventory, parent identity checks and installed-package qualification. Synthetic pairing/transport tests made no real remote enrollment or paid model calls.

## Five earlier findings

| Finding | Reviewed repair and evidence |
|---|---|
| PROFILE-STOP-ROOT | CLI stop selects open/requestStop without config() root-liveness validation; focused regression renames enrolled workspace and confirms owned stop marker. |
| PROFILE-INVENTORY-UNKNOWN | Inventory returns paired:null with invalid-or-unconfigured status when status metadata cannot be read; it cannot claim a recorded device is unpaired. |
| PROFILE-INVENTORY-PROBE | discoverRemoteTargets admits namespace/collection directly; inventory-probe is an ordinary entry, invalid files are counted and do not suppress other profiles. |
| PROFILE-LEGACY-PARENT | Owned namespace may be mode0755, while private leaf and named collection remain mode0700; writable-by-others ancestors still fail. Legacy v1 state stays unbound and is not rewritten. |
| PROFILE-WINDOWS-ALIAS | Windows reserved collection comparison is case-insensitive and canonical membership is checked too. Named stores require bound scope, including prospective uppercase collection paths. Native Node24 Windows source suite initially passed all1375 tests; installed qualification remained blocked by harness defect. |

## Blocking defect found in the initial candidate

`scripts/verify-package.mjs` passed `installed`, the path to `bin/mterm-cli.js`, as `MTERM_PROFILE_VERIFY_ROOT`. The new test imports modules relative to a package directory, producing an impossible path ending in `bin/mterm-cli.js/dist/remote/cli.js` and `ERR_MODULE_NOT_FOUND`.

The failure was independently observed in PR native job131375664182, branch native job131375238215 and PR Ubuntu job131375664499. Other captured platform failures have the same cause. Thus the native installed containment step had not reached its acceptance assertions; this was a verifier regression, not an observed kernel containment failure.

The revised commit introduces `installedPackageRoot`, derives the executable from it, and supplies/reports the correct package root. The complete four-file delta contains this correction, a failure receipt, the dated change record and the corresponding roadmap fingerprint. It leaves runtime source, tests and dependency manifests unchanged. No failing test or zero-failure assertion was removed.

## Required qualification

The six pull-request jobs must succeed for d412b774: fast checks plus Ubuntu, Windows, both macOS architectures and native Linux isolation. The canonical PR runs are43274453513 and43274453565;43274440733 is the duplicate branch compatibility run. A source pass on the previous commit is useful evidence for unchanged code but does not substitute for the revised installed-package and native gates.

After an authorized normal merge, the actual main SHA still needs its own qualification receipt. This review does not claim deployment, live pairing, provider OAuth, arbitrary remote MCP compatibility or completion of the broader issue250.

## Evidence

- `peer-profile-review-d412b774.json`: machine-readable review and limitations.
- `peer-profile-4742-focused.log`: complete independent104-test output.
- `peer-profile-4742-focused-summary.json`: command, Node version, exit code and elapsed time.
- `peer-profile-object-evidence.json`: Git object identities, delta file list and full-log hashes.
- `peer-profile-4742-evidence/`: full captured CI logs and GitHub job snapshot.
