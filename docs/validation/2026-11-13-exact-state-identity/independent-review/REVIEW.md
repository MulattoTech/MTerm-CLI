# Exact filesystem identity: independent review

Reviewer: /root/delivery_evidence; GPT-6 Astra Pro (self-reported).
Reviewed on 2026-11-13. Source baseline: MulattoTech/MTerm-CLI 15dd5de8387507774f6471e4b34d108a492393dc.
Verdict: APPROVED for the frozen source/test/verifier correction and the bounded independent local qualification. Hosted candidate/main qualification remains a separate gate.

## Diagnosis and attribution

The reported PR263 Windows failure reads a missing run.lock after deliberately moving its original inode beneath a replacement parent. Main source compares ordinary Number-valued device/inode identifiers in the cleanup guard. Distinct large integers can alias: Number(9007199254740992n) equals Number(9007199254740993n). If the old and replacement parent IDs alias, the same moved leaf passes the remaining checks and is unlinked, matching the reported ENOENT.

This is a concrete source-level ownership-identity weakness. The exact filesystem IDs from the failed hosted run were not captured in the material I reviewed, so numeric aliasing is the supported explanation and deterministically reproduced class, not a claim that I recovered the hosted IDs. Root's final unchanged-source RED producer reported ten collision failures and three passing controls; the earlier five-failure test-development RED is retained separately. I did not rewrite or rerun either producer.

Primary API reference: https://nodejs.org/download/release/v24.21.0/docs/api/fs.html . Both fs.promises.lstat and FileHandle.stat support bigint:true; numeric metadata fields then use bigint. The local installed @types/node overloads independently confirm Promise<BigIntStats> for literal bigint:true.

## Exact correction reviewed

Both failed state.lock and run.lock initialization paths now capture the parent, opened handle, replacement parent and current leaf using BigIntStats, with nlink compared to 1n. Existing confirmed-close, regular-file, no-link, parent, canonical-path, mode, owner, primary-error and explicit-retry rules remain.

profiles.ts now captures and rechecks every admitted directory's dev/ino/mode/uid as bigint. POSIX mode masks and UID comparison use the matching type, including a fail-closed missing-UID fallback. These identities stay internal; stored configuration and credential schemas, public JSON, target selection, default compatibility and filesystem layout do not change.

Existing identity assertions use exact metadata. The changed-mode mock now uses a type-aware mask and a successful-hook flag; otherwise a swallowed Number/BigInt TypeError could have falsely satisfied retention assertions.

No blocking source or regression-test finding remains at the frozen hashes in managed-parent-receipt.json.

## Test and verifier review

The new thirteen-case producer suite uses real owned filesystem replacements, distinguishes dev and ino collisions, retains the primary failure, checks the replacement hook completed, and includes actual cleanup/retry controls. Device-ID cases intentionally hold inode identity equal to isolate that comparison; they model returned cross-device metadata and do not perform real cross-volume moves.

The package verifier runs that fixture against MTERM_VERIFY_BIN from the installed package, from a separately checked working directory outside the checkout. It preserves full output, requires at least thirteen tests with zero failure/skip/cancellation/TODO, and binds the fixture plus compiled runtime bytes before/after. The binding list now includes remote/profiles.js and config.js. Its hostile-filesystem-race and crash-durability limits remain false. I reviewed this verifier; I did not run the full package pipeline.

The root producer's entire 24,714-byte green-nearby.tap and green receipt were copied byte-for-byte. Its claimed 110/110 result is attributed to that producer, not counted as my independent execution.

## Independent managed-ancestor matrix

I ran twelve cases once on the explicitly supplied private Windows Node v24.21.0:

| Managed level | Distinct ino collision | Distinct dev collision | Unchanged controls |
|---|---|---|---|
| MTerm-CLI-DEV namespace | Refused | Refused | Both accepted |
| remote-profiles collection | Refused | Refused | Both accepted |
| selected alpha directory | Refused | Refused | Both accepted |

All twelve passed; zero failures, skips, cancellations or TODOs. Fixtures exist only under this review directory and were cleaned after each case. Real old objects are retained during replacement; original child objects are moved back, keeping the other admitted identities unchanged. Both selected and sibling sentinel bytes remain intact.

The independent metadata mapper keys objects by unmocked exact real (dev,ino), not pathname or boundary phase. A renamed alias retains the same synthetic identity. Distinct objects receive distinct BigInts that collapse only in Number form; requested Stats/BigIntStats type and remaining fields are preserved. The device cases are explicitly synthetic metadata modeling.

Before/after hashes match for both source modules, the verifier, all three changed tests, both compiled remote modules and their config/error dependencies. No product file was written.

## Safety and qualification limits

BigInt eliminates representation collisions; it does not make a pathname filesystem operation atomic. There is still a TOCTOU interval between lstat/realpath checks and unlink. No guarantee against hostile concurrent same-user path replacement, crash durability, deployment or whole-feature acceptance is added.

The original PR263 main failure must remain recorded. Local corrected-source approval does not retroactively qualify that failed main or substitute for exact candidate/main hosted jobs.
