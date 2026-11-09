# Read-only Git boundaries — scoped development evidence

Session `MTERM-WEB-20261109T031131Z-e0efd5d4`; OpenAI / GPT-6 Astra Pro (self-reported).
Base: `9d4a1815e9fcc005cfc5dd34e0eff1b74cb3cbb4` (qualified merged PR #211).
Issue: [AUTO-001 #66](https://github.com/MulattoTech/MTerm-CLI/issues/66).

## Confirmed behavior and correction

An authorized per-worktree Git directory could refer to a common Git directory outside the selected scope. Separately, a repository-defined clean or process filter could run during native read-only diff, including the default MCP server without general process execution enabled. The fixtures use only disposable repositories and harmless marker-only filter programs.

Every request now validates the bounded canonical worktree, private Git directory and common Git directory against the existing roots and current request guard. A keys-only, NUL-delimited configuration query then refuses executable filter declarations and config includes before status/diff. Values and command strings are not retrieved by that query or copied into the fixed error.

The existing file policy, root grants and execution flags are unchanged. Repositories with filters/includes are explicitly unsupported for this adapter, including empty or unused declarations and inactive includeIf conditions. No owner configuration is changed. Ordinary repositories, benign keys and already-authorized linked layouts retain working status/diff.

## Regression evidence

Final fixture SHA-256: `058d41674db5cc596c9c644108b82c8f70a9d35b8a560701eedaa144933eed65`.

- On unchanged base code: **18 tests, 4 passed / 14 failed**, exit 1, zero skipped/cancelled. [Exact RED log](2026-11-09-git-boundaries-red.tap).
- Corrected new Git cases plus existing Git/MCP suites: **26/26 passed**, zero skipped/cancelled, Node v24.22.1 Linux x64. [GREEN log](2026-11-09-git-boundaries-green.tap).
- Independent peer review found no material issue and independently ran the new **18/18** cases successfully. Exact reviewed hashes appear in the change JSON. This is not a GitHub approval event.
- The installed verifier binds Git/executable modules and existing dependencies to the tarball and reruns these same 18 cases outside the checkout; full exact-head hosted qualification is subsequent evidence.

Coverage includes absolute/relative external common directories, nested cwd, canonical aliases, current narrowing, explicit multiple roots, normal/direct-external metadata cases, cancellation, clean/process/smudge filters, mixed/dotted names, duplicate/empty declarations, config.worktree, includes, inactive includeIf, and an actual no-exec SDK call.

## Limits and acceptance

Initial native Git discovery can consult configuration/includes before this admission check. Alternate object stores, partial-clone implicit fetches, native extensions and concurrent local writers remain separate concerns. This is not a hostile-repository sandbox or full AUTO-001 acceptance.

The 300 protected requirement stages/weights remain unchanged; CLI-266/283/284 receive only scoped evidence references. No dependencies, upstream code or licenses were added. Standing owner authorization covers normal delivery after independent review and required automated gates. The prior cloud Unix-socket EPERM failure is retained; it is not hidden by editing tests. Existing hosted full/platform/installed/native-isolation checks remain mandatory.

Official behavior references: [Git config keys, NUL output and includes](https://git-scm.com/docs/git-config), [Git filter commands](https://git-scm.com/docs/gitattributes), and [Git revision/path reporting](https://git-scm.com/docs/git-rev-parse).

The committed RED TAP display trims trailing whitespace for the repository diff check. Original log SHA-256 is retained in the change record; test outcomes and diagnostic text are otherwise preserved.
