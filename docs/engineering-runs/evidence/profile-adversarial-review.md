# Remote profile slice: bounded adversarial review

Read-only review of the evolving `/workspace/scratch/a92a3aacdca1/MTerm-CLI-Profiles` tree, based on committed head `83a97daed6ef92b69e681b6b68f982f5d4266a51` plus uncommitted profile changes. This is not final approval. No repository edits, build, install, full test suite, live credential operation or production mutation was performed.

## Material findings

### 1. Owned stop depended on the workspace remaining available

The new unconditional `store.config()` before command dispatch also resolved and validated the exposed workspace. A renamed/deleted/inaccessible workspace therefore prevented `remote stop` from writing the selected agent's owned stop marker even though its public state scope remained valid.

Use metadata/scope admission for stop; the open and requestStop paths already enforce it. Keep workspace validation in operations that need workspace access. Root independently reproduced this regression, added its RED fixture and removed the unconditional config call during this review. I did not duplicate that fixture or certify the evolving repair.

### 2. Inventory incorrectly converted unreadable status into unpaired state

The inventory catch returned `paired: false` for every status failure, including malformed runtime JSON or a missing workspace with a valid existing device pairing. An exception establishes unknown status, not revocation/unpairing.

Omit pairing or report it unknown on an unreadable status, or obtain it separately from validated public metadata. Root accepted the finding and added a RED case; its current source no longer contains the broad `paired: false` fallback. Final-head verification remains separate.

### 3. A valid profile name could abort inventory

Collection admission descended through a fictitious `inventory-probe` profile. That is a user-valid name. A file, linked directory or invalid-mode entry with that name aborted the entire listing before its ordinary invalid-entry handling.

Admit the namespace and collection directly. Root accepted the finding and replaced the magic-child admission during review. No duplicate fixture was run by this reviewer.

### 4. Legacy production state regresses under a safe 0755 ancestor

**Reproduced using current compiled code before the next source edit.** A legacy production default has an owner-owned mode-0700 credential directory and mode-0600 config, under an owner-owned mode-0755 `MTerm-CLI` namespace. The previous store contract admitted the private leaf. The new admission uses the leaf's strict mode-0700 check for every managed ancestor and rejects the existing state with `REMOTE_STATE_PERMISSIONS`.

Evidence: `profile-legacy-parent-reproduction.json` records source/compiled hashes, freshness checks, modes and exact error. The fixture was created under scratch and removed in a finally block; no credentials were read or network call attempted.

Recommended correction: distinguish ancestor admission from credential-directory admission. For the existing application namespace require an ordinary current-user directory with no group/world write permission, while preserving strict mode-0700 for the credential-bearing leaf and named-profile collection. Retain link/identity checks and reject writable/unowned ancestors. Do not chmod an existing namespace implicitly merely to make the test pass. This preserves valid legacy defaults without weakening the credential directory.

### 5. Windows case aliases can evade named-store classification

**Source-level finding; native Windows qualification not performed.** `admitRemoteStateDirectory` uses case-insensitive Windows path containment but tests the resulting lexical component using `relative[0] === 'remote-profiles'`. An explicit Windows path containing `REMOTE-PROFILES` therefore follows the legacy/unbound branch.

The CLI's preliminary canonicalization can fix the spelling of an already lowercase physical collection, but it does not fix a physically uppercase collection or a not-yet-created uppercase collection. A new explicit setup can create that case alias as an unbound legacy state; on Windows the same collection is also reachable through the named-profile spelling. Direct store admission has the gap for an uppercase alias even if canonical spelling is lowercase.

Example structural counterexample on Windows:

```js
path.win32.relative(
  'C:\\state\\MTerm-CLI',
  'C:\\state\\MTerm-CLI\\REMOTE-PROFILES\\alpha'
).split(path.win32.sep)[0] === 'remote-profiles' // false
```

Classify using canonical namespace membership for existing paths and Windows-aware reserved-component comparison for prospective paths, while retaining lexical link checks. Do not let alternate casing or a short-name alias downgrade a named state into legacy credential rules. Cover an uppercase physical collection and explicit alias with a fixture containing an unbound v1 configuration; it must reject or receive mandatory scoped admission. A platform-simulated fixture was prepared to inspect this branch, but refused to execute when the owner changed source after the last compile; no stale-code result is claimed.

## Other observations

The examined parser rejects duplicate/conflicting selectors, pins an explicit environment in continuation argv and does not interpolate shell commands. Public state scope is checked before lifecycle work and repeated in protected credentials. Copying both public and credential state across profiles is covered by the owner's current tests. Inventory has bounded entry/profile counts and projects allowed runtime fields. These are scoped source observations, not final acceptance of all alias, cancellation or lifecycle behavior.

The three initially accepted findings were being repaired while this pass ran. The next independent review should use an immutable source/tree and exact regression results, including the platform-sensitive cases above. This review does not request a new human approval or propose generic MCP/portal scope.
