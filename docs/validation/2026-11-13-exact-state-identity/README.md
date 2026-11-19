# Exact remote-state identity repair

Base: 15dd5de8387507774f6471e4b34d108a492393dc (PR #263 actual main).
Execution: Windows, private checksum-verified Node 24.21.0; isolated new checkout.
Standing owner authorization: docs/OWNER_AUTHORIZATION.md.

## Reproduction and correction

The original Windows job [131583155535](https://github.com/MulattoTech/MTerm-CLI/actions/runs/43333319809/job/131583155535)
failed the existing replacement-parent run-lock case with ENOENT after cleanup.
Its exact observed IDs were not logged, so the CI root-cause attribution remains
an inference. Independent source inspection identified lossy numeric identity
comparisons. The new deterministic suite proves that distinct exact IDs which
round to the same Number permit the wrong cleanup/admission on unchanged source.

The initial test-development RED (red-initial.tap) had five failures and eight
passes: dev-only substitutions were still distinguished by the real inode.
The final fixture explicitly models equal inode values on distinct devices; its
final RED has 13 cases, 10 expected failures and 3 controls. Source and compiled
hashes are identical before/after RED. All originals are retained.

The correction uses BigIntStats for parent/leaf/descriptor lock identity and
bound directory admission. Persisted/public schemas and error precedence remain
unchanged. The exact final fixture is unchanged between RED and GREEN. The full
nearby GREEN is 110/110, zero failed/skipped/cancelled/TODO. Existing lock inode
assertions use exact integers; the ownership-mode mock is type-aware and asserts
that the mutation hook completed rather than accepting a swallowed TypeError.

The installed verifier executes all 13 new cases outside the checkout, checks
source/installed bytes before and after, retains TAP before cleanup, and adds
profile/config modules to the lock binding graph. The deterministic IDs model
precision boundaries; they are not real cross-volume moves. No credential,
network/provider, deployment, paid model or production-load action is included.
Exact comparison does not provide atomic conditional unlink or eliminate inode
reuse and final-check races.

## Qualification

See red-receipt.json and green-receipt.json for exact commands/hashes. Full local
normal build/check, independent review and exact candidate/actual-main CI are
recorded separately as they complete. No gate is inferred from another commit.

## Completed local qualification

Normal build and the complete normal check passed on private Windows Node 24.21.0:
1,595 tests, all passed, zero failures/skips/cancellations/TODO. The full original
check log is preserved as check.log.gz, with a verified lossless round trip and
byte/hash receipt in complete-check.json. Independent source, tests and installed
verifier review found no blocking issue; its separate managed-parent matrix
passed 12/12 with unchanged before/after hashes. See independent-review/receipt.json.

The failed PR263 main receipt is copied byte-for-byte as pr263-main-failure.json;
its entire failed Windows log is preserved in pr263-main-windows.log.gz. Exact
candidate and fresh actual-main hosted jobs for this repair remain required.
