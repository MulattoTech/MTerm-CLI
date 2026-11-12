# Access PR25: actual-main qualification receipt

**Actual main passed both required jobs.** Main is `499255adf0c3988558eb4b1dd04ee95ad3c7da33`, with tree `04d1d397de37cb730b191f47bbe9877d0a94b7a3`, exactly matching the qualified descriptor candidate tree.

## Merge identity

PR25 is closed and merged at **2026-11-12 19:41:26 UTC**. The actual main commit has exactly these parents:

1. Previous main: `ba4a55b7ed351f7e60928179edaa7449de00be7d`.
2. Expected candidate: `60f188a805f59eeb13d04f27285ab7b55d1d6507`.

Both complete job logs record checkout of the actual main SHA. GitHub check records, the push run and main ref independently identify the same commit.

## Actual-main run

[Run 43292737244](https://github.com/MulattoTech/MTechLabs-Access/actions/runs/43292737244), push event, attempt 1, completed successfully.

| Required check | Job ID | Result |
|---|---:|---|
| test | 131442935649 | 123/123 pass |
| managed-mcp | 131442935086 | 79/79 pass |

There were **zero failures, skips or cancellations**. Both jobs used **Node v24.22.2 / npm 11.19.1**. Root check, build and generated-UI verification also passed.

## Remaining acceptance

[MTerm-CLI issue #246](https://github.com/MulattoTech/MTerm-CLI/issues/246), covering tool and skill description rendering in ChatGPT Plugin Settings, remains **open**. The receipt establishes source and CI status; rendered UI acceptance and production deployment remain unverified. This merge does not qualify PR24's unresolved Linux PDF path.

## Retained evidence

Both complete decoded logs total **71,406 bytes**. Exact run/check/job/PR/main/commit/issue records and per-log SHA-256 hashes are retained under `peer-access-main-499255ad-evidence` and in the JSON receipt. The reviewer did not merge, retry, mutate source/GitHub, execute upstream locally or deploy production.
