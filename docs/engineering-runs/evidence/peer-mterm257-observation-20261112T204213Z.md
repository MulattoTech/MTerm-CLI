# PR257 bounded merge observation

Observed at **2026-11-12 20:42:13 UTC**.

**The merge is still not observed.** PR257 remains open, ready for review, `merged: false`, and `merged_at: null`. GitHub reports `mergeable: true` and `mergeable_state: clean`. The synthetic merge SHA remains `3dc259920452b04bd661ac83160b5a155de7e665`; this is not an actual merged main commit.

| Identity | SHA |
| --- | --- |
| Candidate / head ref | `b0348d901b27975789d8764397a103204e08aaf0` |
| Main / PR base | `4fb205088e77731e42da5adaca6bf167f8b75194` |

All six canonical required checks remain successful for the exact candidate, on pull-request runs 43279988914 and 43279988939. The additional five push checks are also successful. No new run appeared. The legacy commit-status endpoint has zero status records and reports pending; that is separate from the successful check-runs endpoint and is not evidence of a failed check.

The earlier merge timeout and HTTP405 response are historical context supplied by the parent. These reads do not expose GitHub’s current backend operation state. No merge retry, branch/PR change, CI rerun or other mutation was attempted. This is a status observation, not new full candidate or actual-main qualification.

Independent `git ls-remote` also returned the same main and candidate branch SHAs with exit code 0.
