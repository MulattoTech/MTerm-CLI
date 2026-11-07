# Expansion evidence matrix

The development-only matrix checks the 152-source, 117-capability expansion ledger for epic #81. It renders source mappings, recorded execution observations and independent acceptance assertions separately. A successful ledger check is not product PASS, a license admission, or evidence that an unimplemented feature works.

Related issue: [AUG-013 / #94](https://github.com/MulattoTech/MTerm-CLI/issues/94). Existing roadmap requirements CLI-222, CLI-231, CLI-233 and CLI-262 retain their reviewed stages and weights.

## Run locally

From a reviewed checkout with Node 24:

```sh
node scripts/expansion-matrix.mjs --check
node scripts/expansion-matrix.mjs --report
```

Both operations emit one JSON document to stdout and leave the repository unchanged. An explicit `--root ABS_DIR` selects another owned checkout. `--timeout-ms` accepts an integer from 1 through 30000; the default is 3000 ms. Errors use a bounded code and message, exit 1, and no raw exception or file contents. Cancellation exits 130.

The default root is the script's own repository. The checker reads local evidence only. It does not download sources, execute fixtures or backend commands, start a model, modify a status, or contact GitHub. Recorded GitHub state is an offline snapshot. Running from outside the checkout is covered by the tests.

If a roadmap review exists, the standalone commands reject a stale source fingerprint. A fixture root without a review reports `reviewFreshness: not_reviewed`; its structural consistency does not establish approval. Normal `npm run roadmap:check`, build, check and prepack continue to require the complete reviewed catalog and generated-output checks. Rendering the matrix never calls roadmap review or grants credit.

## Three input ledgers

| Input | Authority |
| --- | --- |
| `sources.json` | The original 152 repository identities, exact or unknown source/version pins, reuse restrictions and source-to-issue mappings |
| `queue.json` | The original 117 AUG IDs/GitHub issue numbers, reciprocal source mappings, declared prerequisites and recorded implementation/acceptance state |
| `evidence.json` | Sparse, explicit fixture pins, historical references, platform/scenario observations and independent acceptance assertions |

The original source identities and AUG-to-issue identities have frozen scope digests in the checker. A count-preserving substitution, duplicate identity, duplicate mapping, dangling mapping or one-sided edge is rejected. The initial graph has 397 reciprocal edges. All source rows remain in the denominator. A later unmapped row needs a duplicate or not-applicable disposition, a concrete reason and a pinned JSON review. Duplicate targets must exist and cannot form a cycle.

The seven reference-only repositories retain their no-copy restriction. The four identified copyleft sources cannot be silently imported by this ledger-only slice; their separate compliance boundary remains required. A source mapping can identify an alternative or inspiration and does not imply copied code. The retained SDK rebuild remains its existing narrowly reviewed artifact. Unknown source pins and dependency-license reviews remain unknown.

## Platform and scenario vocabulary

Every normalized capability row contains `win32-x64`, `linux-x64`, `darwin-arm64` and `darwin-x64`. Sparse or absent input cells become `support: unknown`, a null subject and unrun scenarios. An explicit unsupported cell requires a reason and remains distinct from an untested cell.

Each cell has five cases: `success`, `permission_denied`, `cancelled`, `deadline` and `unsupported_platform`. Their states are `not_run`, `passed` or `failed`. A passed denial case means the expected denial occurred; it grants no permission. A passed unsupported-platform fixture does not establish support for that simulated platform. One platform's receipt cannot populate another platform's cell.

Observed cases require a pinned fixture, an exact tested commit and subject fingerprint, backend/runtime names and versions, and a pinned structured execution receipt. The receipt binds its capability, platform, subject, UTC observation time, recorded command, exit code, explicit limitations, scenario outcome and **fixture SHA-256**. Recorded commands are text, never executed by this checker. Documentation or test-plan prose alone cannot become an execution observation.

Pins use SHA-256 over strictly decoded UTF-8 with CRLF normalized to LF, declared as `hashMode: sha256-utf8-lf`. This matches existing cross-platform roadmap hashing. It is not a claim of raw-byte equality across Git newline conversions. Actual content edits still invalidate fixture and receipt pins.

Historical qualification documents can be retained as separately labeled pinned references. They do not automatically populate the five cases. This preserves older evidence without inventing machine-readable scenario outcomes that those reports did not record.

## Acceptance remains explicit

The report has independent counts for sources accounted for, capabilities represented, reciprocal mappings, recorded accepted capabilities, and unrun/passed/failed observations. It emits no overall readiness percentage. Existing CLI maturity, DCP acceptance, WEB acceptance and AUG acceptance remain separate.

An `accepted: true` queue flag requires a pinned independent review report, distinct executor and reviewer task identities, exact tested commit, current subject fingerprint, scope digest, evidence digest, UTC acceptance time and `allCriteriaSatisfied: true`. Every explicitly required platform must have a matching subject and all five evidenced passing cases. The evidence digest binds the required platform subjects and scenario receipt pins, so replacing a receipt cannot reuse an old independent review. A missing review, stale subject, altered scope, unrun required case or mismatched report is rejected.

These are auditable **self-reported assertions**, not authenticated reviewer identities or cryptographic proof that an external test ran. `reviewerIdentityAuthenticated` is always false. The independent peer still must inspect actual implementation, test output, limitations and exact GitHub results before qualified delivery. The owner's standing authorization delegates that workflow; it is not a recurring manual approval gate.

The full roadmap source fingerprint now includes all three ledgers. A distinct subject fingerprint hashes the same implementation source-file manifest while excluding those three inputs. The capability scope digest includes the identity, original issue-body hash, test plan, common test plan, declared CLI/issue prerequisites, scope/limitations, relevant source mappings/pins/reuse rules, selected platform scope, scenario set and fixture pins. It excludes observation outcomes, timestamps and acceptance records. The separate evidence digest binds current normalized observations and their pins. These bindings avoid a receipt containing the hash of itself while preserving source, scope and reviewed-evidence freshness.

## Read bounds and security limits

| Evidence-reader limit | Bound |
| --- | ---: |
| One input, fixture or receipt | 2,097,152 bytes |
| Aggregate unique evidence bytes | 16,777,216 bytes |
| Unique evidence files | 2,048 |
| Serialized report | 2,097,152 bytes |
| Read chunk | 65,536 bytes |
| Default / maximum cooperative deadline | 3 / 30 seconds |

Only regular single-link files under the selected canonical repository root are admitted. Absolute paths, parent traversal, ambiguous separators/streams, private path components, symbolic links, junctions and hard links are denied. File and path identities are checked around descriptor reads. Errors do not include the rejected file contents.

The evidence byte/file bounds apply to the three ledgers and their referenced fixtures/receipts. The shared source-fingerprint walk separately permits at most 4,096 regular files, 8,192 directory entries, depth 32, 8 MiB per source file and 64 MiB total. It streams directory entries and descriptor reads, preserves byte-exact hashing of binary artifacts such as the retained SDK archive, rejects linked/nonregular roots and single files, and checks identities around reads. It observes cooperative deadline checkpoints when the standalone matrix uses it. Neither operation is an OS sandbox or a hard wall-clock interrupt. An already pending OS read may finish before cancellation is observed, and a hostile concurrent writer can still race separate pathname checks. Use owned, trusted checkouts.

## Qualification and remaining work

The baseline was tested before implementation: the matrix entry point was absent, and a new roadmap test reproduced the expansion-freshness gap. Native Windows focused qualification passed 26/26 tests at 2026-11-07T23:38:07.762Z; the original failed logs are retained. Later exact-commit receipts and PR/main checks supply subsequent qualification without rewriting those observations.

The matrix checker is original MIT MTerm development code. There is no new runtime dependency, npm script or launcher implementation. Its scripts, tests and evidence ledgers stay outside the package's runtime file allowlist. Actual normal packaging must verify that boundary and the unchanged launcher/runtime bytes.

Most capabilities still have no structured execution observation. They remain visible and unrun. This slice does not manufacture 117 feature fixtures, authenticate every upstream license, complete the generic admission gate, verify an unavailable ChatGPT connector, or accept the whole expansion. Full AUG-013 acceptance stays open until the issue's complete evidence requirements are genuinely established.
