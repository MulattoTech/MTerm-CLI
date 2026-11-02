# Windows DPAPI operation and cleanup bounds

Prepared **2026-11-02T21:55:56.070535+00:00** at base `458e0bd72b94f34fbc74662a0cfd570bdb42bdcb`, tree `0ddf875d9f5f5e571aaa199ef373707b87aa3882`, on `fix/web-003-dpapi-deadline-20261102t2142`. This is a source-candidate preparation record for a separate bounded WEB-003 reliability follow-up. Full committed native/fresh/hosted and delivery qualification remains pending; later exact-head receipts may supersede this timestamped status.

## Observed problem and attribution

PR #79 merged the UTF-16LE slice with the qualified tree. Its actual main Windows job [125566510677](https://github.com/MulattoTech/MTerm-CLI/actions/runs/41529733903/job/125566510677), run **41529733903**, failed on attempt 1: **301 passes and one failure out of 302 tests**. All 30 new UTF-16 cases passed. The existing remote-state protection round trip failed at the helper's **10,000 ms timer** with `REMOTE_SECRET_STORAGE`. Both the helper and existing remote-state tests were byte-identical before and after the UTF-16LE slice.

The raw failure proves timer expiry. It does not prove slow PowerShell startup, DPAPI service failure, runner load, an orphaned process, or an encoding defect. Successful earlier candidate/native runs do not erase that main failure. The new **30-second budget is an explicit bounded policy**, not a claim about the unobserved cause or about when that original child would have finished. The failed attempt, full log and comparison remain retained in the [development receipt](2026-11-02-windows-dpapi-bounds-development.json).

## Contract

The fixed PowerShell program, CurrentUser protection scope, `MTerm-CLI remote credential v1` entropy, stdin-only input, per-call executable resolution and inclusive **32,768-byte stdout ceiling** remain. No retry, plaintext fallback, exported test hook, new runtime setting or real enrollment is introduced.

| Outcome | Required behavior |
|---|---|
| Code-zero close before the operation deadline | Return bounded trimmed output only if no earlier failure was latched. An exit event alone cannot establish successful output completion. |
| Operation timer reaches 30,000 ms; output exceeds 32 KiB; child or stream fails | Latch failure first, request termination once through that owned `ChildProcess`, and wait for observed exit or close. Do not use a numeric PID or target an unrelated process. |
| Synchronous spawn failure or failed spawn with no child PID | Return the existing generic storage error; no child exists to terminate or justify a retained lock. |
| Synchronous stdin write throw | Treat it as a child failure, terminate the owned child and apply the same observation/grace policy. |
| Failure with observed exit before pipe close | Dispose only owned streams and return the generic failure. Observed exit establishes the child ended even if pipe close trails. |
| No termination observed during the 5,000 ms cleanup grace | Dispose owned streams, unreference the owned child and return a generic failure. This does **not** claim OS termination. |

Of the DPAPI callers, only **`savePairing` Protect** holds mutation admission. If that child's termination remains unconfirmed, a module-private WeakSet marks the internally created error and `mutate` closes its file handle while retaining **`state.lock`**. No credential/config bytes are committed. Late events cannot silently remove that retained lock. Subsequent mutation remains `REMOTE_STATE_BUSY`; deliberate local inspection is required. No automatic stale-lock removal is added.

**`credential()` Unprotect is read-only and has no mutation lock to retain.** It keeps the existing generic `REMOTE_CREDENTIAL` boundary and preserves stored files. Protect errors retain the fixed generic `REMOTE_SECRET_STORAGE` message; input, stdout, stderr and unexpected exception text are omitted from diagnostics.

The configured timers total **30 seconds plus up to five seconds of cleanup grace**. Event-loop and operating-system scheduling prevent a hard wall-clock or guaranteed-termination claim. This is not a new global process supervisor, process-tree policy, Windows Job Object or OS sandbox.

## Original RED and supplementary GREEN

The new fixture invokes actual `RemoteStateStore` operations on isolated temporary files. Within each sequential test it substitutes the builtin child-process spawn binding, platform and a deterministic timer scheduler, then restores them in `finally`. No real user auth, gateway enrollment or production test switch is involved. Synthetic-child evidence establishes the state machine; it does not establish actual DPAPI cryptography or OS termination.

| Gate | Actual result |
|---|---|
| Original source, supplementary Linux Node 24.22.1, 21:49:03.598–21:49:03.991 UTC | Exit **1**; **17 tests, four pass, 13 fail**, no skips/cancellations |
| Original source, Windows Node 24.21.0 / npm 11.19.0, 21:50:24.165–21:50:24.538 UTC | Exit **1**; **17 tests, four pass, 13 fail**, no skips/cancellations |
| Changed source, supplementary Linux, 21:50:21.490–21:50:22.168 UTC | Exit **0**; **22/22**: unchanged 17 new cases plus five unchanged existing remote-state cases |
| Independent source/test/installed-harness review | No blocking findings; exact source, fixture, raw log hashes and original failure attribution reviewed |
| New installed RemoteStateStore verifier execution | Supplementary Linux offline run passed at 21:53:07.953–21:53:09.409 UTC; Windows DPAPI fields explicitly null, actual native Windows qualification pending |
| Committed native/fresh/hosted/delivery qualification | Pending; no pass inferred from development build or prior candidate |

The same **16,523-byte** fixture was used for both original RED runs and local GREEN, SHA-256 `1125e477a85d2dd264942a5a97edeccdf799528b85a7bccb4adc9de0404ebd58`. It covers valid completion at 15 seconds and 29,999 ms; exact deadline; close-versus-exit success; 32 KiB and one-byte overflow; generic child/stdin/nonzero-exit failures; synchronous throws; repeated/late events; kill-false/kill-throw; finite cleanup uncertainty; byte preservation and retained admission. The existing five tests were not weakened or skipped.

Native original focused stdout is **17,013 bytes**, SHA-256 `076627eee7f59af25ef0e2e2b71a1affbbb620b06cb86f6c0476ea7bd46d363e`; stderr is empty. All four transferred compile/focused streams match the native receipt. Its `ok:true` means the expected RED was observed; the actual test exit is **1**.

Focused commands are `npm run build:code` and `node --test --test-concurrency=1 tests/remote-state-dpapi.test.mjs tests/remote-state.test.mjs`. Supplementary scratch used `--test-isolation=none`. Development compile is not the normal reviewed-build gate.

The installed verifier binds the installed `dist/remote` module inventory and bytes to a snapshot taken before packing, imports the actual installed state module and uses only synthetic local state. Windows checks real Protect/Unprotect close events and missing-executable failures; POSIX reports Windows-only fields as null. These are supplementary/external qualification checks, not an invented installed RED or actual gateway pairing.

The supplementary installed probe packed a **60,694-byte** tarball with `--ignore-scripts`,
SHA-256 `29ae5d944f33d596d8f29a4c2a6c8b70a6700741c317a61eb9abdb1b1c72943c`.
The separate offline install and installed synthetic POSIX round trip exited zero;
all six raw streams match their receipt. Windows DPAPI was **not** exercised on
Linux, and Windows-only proof fields are null.

The first supplementary preparation attempted registry access, which logged `EPERM`
and reached a **180-second Python driver TimeoutExpired** before the product verifier
ran. Its tool session exited 1, but the driver did not retain the npm PID or actual
npm exit: **originalNpmExitCode is null**, not 1. The closure receipt reports the
previously observed task wrapper PIDs absent and no remaining matching task process;
it does not claim a complete process inventory or an ordinary npm exit. That original
attempt and the separate corrected offline success remain retained. Native normal
prepack/fresh gates must provide their own actual process completion evidence.

## Acceptance, preservation and next gate

[Source review](2026-11-02-windows-dpapi-bounds-source-review.json) and [protected-ledger comparison](2026-11-02-windows-dpapi-bounds-protected-ledgers.json) bind this scope. CLI-191/195/200/206/215/239/300 gain evidence/notes/reviewer entries only. WEB-003 gains scoped local implementation evidence only. DCP **0/48**, WEB **0/12** and maturity **29.12%** remain unchanged; stages, weights, acceptance criteria, estimates, dependencies, blockers and platform scope remain protected.

The deployed/staging source `b90432a1bc138d59305692a9f74f110a475d0881` and Worker version `af4fd06e-c4a3-4545-ad22-31d0ae956215` are unchanged. No owner pairing, enrollment, permission, autostart, authentication or deployment action is part of this follow-up. The isolated native follow-up is `20261102T214500Z-web003-dpapi` under the existing `20261102T211227Z-dcp017` loop checkpoint, preserving the original scope and failed main evidence.

Next: qualify the exact committed correction through native actual DPAPI/installed/full/prepack/Codex, fresh source and hosted gates, obtain final review, then normal merge and actual merged-main proof. Preserve the original failure and any new failure. Final primary/owner preservation and additive recovery remain separate. The read-only npm shrinkwrap audit is postponed until main is healthy. Model calls are **0**; actual model-directed Codex and authenticated ChatGPT tool use are not established.
