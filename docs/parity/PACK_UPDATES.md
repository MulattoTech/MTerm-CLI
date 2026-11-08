# Offline optional-pack update check

AUG-011 / #93 prerequisite: CLI-157 and a scoped verification foundation for CLI-165.

`packs update --check --root ABS_DIR --manifest ABS_FILE --sha256 SHA256 --registry ABS_FILE --provenance ABS_FILE --provenance-sha256 SHA256 [--timeout-ms 1..30000]`

## Selected scope

This command compares one explicitly supplied local ABI-1 candidate against one rooted registry snapshot. It discovers no upstream release, performs no semantic-version ordering and makes no “latest” claim. Every selected path and the previous registered payload must remain under the selected root. RootPolicy rejects private metadata, lexical/canonical escapes, nested symlinks/junctions, hardlinks and ambiguous Windows names. A selected root alias is canonicalized using the existing owner-root contract.

The checker never downloads, writes, creates a lock, changes registration, launches pack code, modifies authentication or enables a global agent. There is no apply option in this slice. Unknown/repeated flags, missing explicit --check and --apply fail before filesystem work. Ordinary launcher help/status/config remain on their existing lazy command paths.

## Captured data and comparison

The existing ABI-1 schema, Node24/platform support, execute-unsandboxed permission and no-external-dependency restrictions are reused. Pack manifests are at most65,536bytes; up to16 declared UTF-8 files are each at most65,536bytes. A full fatal-UTF-8 read preserves BOM and CRLF. The captured string is round-tripped to bytes and must match the measured length and raw SHA-256. Frozen payload rows hold immutable strings, and public plans omit payload text. The existing inspect command retains its output contract.

The registry's raw SHA or missing state is read before payload work and again before publication. A version change, including creation of a previously absent registry, aborts the plan. This is a consistency check of observed reads, not an OS filesystem transaction; an ABA change or changes after the final read cannot be excluded.

The plan includes exact manifest pins/source identity, supported ABI/runtime/platforms, declared permissions, measured payload inventories, added/removed/changed files, byte delta, source/version/permission changes, and bounded tool/schema differences. A same-version/different-pin candidate is a replacement. No semantic-version downgrade or upgrade is inferred.

If the old registered payload fails verification, the report is blocked and its error remains explicit. Its file deltas are unavailable rather than guessed. Rollback records the exact previous registration and whether its referenced payload verified. No backup is created, no path is reserved and no rollback is executed or certified.

The deterministic plan SHA binds selected paths/pins, captured inventories, rights observations and registry version. Generated SPDX timestamps/UUIDs and operation timeout configuration are excluded. It is a report identity, not a signature or an activation token.

## Provenance binding

The general provenance verifier remains an evidence-only verifier. Its eligible result alone cannot make a candidate eligible. The checker additionally requires:

1. Review subject name/version and exactly one primary source match the candidate ID/version/repository/commit/license.
2. Every candidate file has one attribution at its exact canonical location and raw SHA-256. Identical bytes at a decoy path do not supply coverage. Normalized utf8-lf review hashes remain distinct from raw payload hashes.
3. The matching primary source contributes candidate payload. Every contributing source has complete transitive and bundled-code review; reference-only and pending reviews block the candidate.
4. Pinned nonempty license and required NOTICE evidence passes the existing bounded verifier. The report retains source identities, evidence pins and review metadata. Review evidence bytes can overlap payload bytes and are not an installed-footprint claim.

Review identity is owner-selected local evidence. Its legal authority is not authenticated; upstream bytes are not fetched and patches are not replayed. Synthetic fixtures test this binding without asserting real third-party rights. The command cannot infer undisclosed bundled code or independently prove a review author's claims. A future installer must retain required license/NOTICE texts in the actual staged payload.

## Deadlines and output

The whole comparison has a1..30,000ms cooperative deadline (default3,000ms), checkpoints around bounded local operations and a final checkpoint before returning. It waits for pending reads to finish/close; there is no detached Promise.race read or hard OS-read interruption claim. Existing provenance limits remain:1MiB per evidence file,8MiB aggregate,192 evidence files. Serialized plan plus newline is bounded to262,144bytes.

Eligible no-change/difference reports exit0; blocked rights/current-state reports exit2; invalid inputs, integrity errors, cancellation, deadline expiry and stale registry failures return the existing CLI error path. Eligibility never grants execution or activation.

## Acceptance and remaining work

The42-case suite uses real temporary files, actual command execution and a never-execute pack marker. It covers byte fidelity, exact review binding, integrity/root/link rejection, registry races after observed real I/O, cancellation/deadlines, unsupported contracts, invalid options and unchanged synthetic auth/config/state. The permission-error case is an explicitly injected filesystem EACCES, not native ACL certification. The package gate runs the identical suite from outside the checkout against installed compiled modules and pins all seven relevant modules.

Full #93 installation remains open: bounded download/archive handling, new owned staging directories, staged byte verification and notice retention, concurrency-safe atomic activation, durable interruption recovery, preserved active sessions and exact retained rollback. Current invocation verifies file paths and later launches Node by pathname; import closure and hostile concurrent-writer races remain unresolved. This prerequisite does not satisfy full CLI-165 execution/extraction acceptance, actual ChatGPT integration or full AUG acceptance.
