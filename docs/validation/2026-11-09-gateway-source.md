# Gateway artifact source consistency

Session `MTERM-WEB-20261109T031131Z-e0efd5d4`; OpenAI / GPT-6 Astra Pro (self-reported).
Issue: [WEB-008 #61](https://github.com/MulattoTech/MTerm-CLI/issues/61), related immutable-update work #64.
Source base: `3434f3319e707642727f95e3010c6b62dedc3db6`.
Prerequisite PR #215 is normally merged as `288499a427a71cf6c2c4006e21dbfc8701cf04dd`,
with the same tree `731edad164428343c70bd128fcca20030f08d941`.

## Reproduced problem and correction

The previous builder accepted any lowercase 40-hex commit label, read five current
gateway files plus existing compiled protocol output, and attributed those bytes to
the supplied commit. It did not resolve the identity, compare committed inputs or
detect stale protocol output. Existing exclusive writes and byte-equal repeat checks
already protected artifacts from overwrite; those controls are retained.

The builder now requires the supplied SHA to equal raw HEAD, disables Git replacement
substitution and removes inherited repository/config overrides from its Git child
environment. It captures twelve bounded regular UTF-8 text inputs and compares them
with committed blobs after CRLF-to-LF normalization: five gateway modules, protocol
TypeScript, tsconfig, package manifest, both locks and builder/helper source. Only
those material inputs must match; unrelated tracked or untracked work can remain.

Exact TypeScript pins must agree across the committed manifest/lock pair, installed
package metadata and actual CLI version output. The standalone protocol is compiled
from captured committed bytes in an owned temporary ESM project using the pinned
CLI. Current routing is constrained to the expected source/output layout; external
configuration, project references and unrecognized compiler options are refused.
The isolated project disables ambient types, declarations and source maps and fixes
LF output. It must produce exactly one protocol module, identical to the captured
tested `dist/remote/protocol.js` after normalization. Missing, stale or invalid output
fails before artifact creation, and shared dist is never repaired by the builder.

After temporary cleanup, the builder serializes frozen verified module contents.
The six names/order, module byte/SHA-256 records, artifact digest calculation and
exclusive-write behavior remain unchanged. The additive `sourceVerification` field
records material-input hashes and compiler version; it explicitly does not claim
that the builder executed tests or verified a deployment.

## Actual regression evidence

Tests use real disposable Git repositories and the installed TypeScript 7.0.2 CLI,
with no network install or deployment. Each repository contains the exact selected
builder/material inputs, an owned Git history and an isolated compiler-temporary
directory. Dependencies are read through an owned link to the existing installation.
The final unchanged-source run selects an archive of the exact base through
`MTERM_GATEWAY_FIXTURE_SOURCE`; it does not replace current work.

| Execution | Observed result |
| --- | --- |
| Initial 17 cases before behavioral change | 5 passed / 12 failed |
| Final 19 cases against archived original source | **5 passed / 14 failed**, exit 1 |
| Corrected 19 cases plus existing gateway runtime tests | **33/33 passed** |
| Independent final frozen fixture execution | **19/19 passed** |

All runs above had zero skips/cancellations. Local runtime was Node v24.22.1, Linux
x64. [Final RED](2026-11-09-gateway-source-red.tap) and
[focused GREEN](2026-11-09-gateway-source-green.tap) preserve the observations. Only
trailing whitespace is trimmed in committed TAP display; raw hashes are recorded
in the [change record](../ai/changes/2026-11-09-gateway-source.json).

The cases verify exact six-module hashes and input evidence, byte-identical repeat,
nonexistent and wrong-existing commit refusal, drift in each material class including
the helper, stale/missing protocol, equivalent CRLF inputs, unrelated committed-file
edits, inherited Git overrides, unsupported compiler routing, mismatched pins, actual
compiler failure, replacement-object attribution refusal, and preservation of tampered
manifest/module files. Source-consistency failures create no artifact. Every builder
invocation verifies removal of its compiler-temporary directories before settlement.
Stale/invalid compiler cases also verify unchanged shared dist bytes.

Independent source review found no blocker within the trusted-checkout scope. The
earlier independent 17-case run is historical; the final fixture separately passed
19/19 with before/after hashes unchanged.

| Final reviewed input | SHA-256 |
| --- | --- |
| `scripts/build-gateway.mjs` | `135d9501647b4f6daa80d69e825af0f4a4c954c915ae326ca16a6d149a68d6b9` |
| `scripts/gateway-source.mjs` | `ceb0d805b2277aa3478ebb8bf07664f38a2204a0c0b53adf919f36868791a010` |
| `tests/gateway-artifact.test.mjs` | `d061936613ed6c053b5d15b56b63225d4283f63d6f0eb5a63729d4998a659029` |

## Qualification and limits

Normal reviewed build/check and exact-head hosted/platform/package gates remain
separate requirements. The builder checks source/output consistency; it does not
establish review approval, full test success, compiler authenticity, complete
redistribution clearance or deployed source identity. The Git/compiler installation
is trusted; this is not a general hostile-repository, malicious-toolchain or local
concurrent-writer sandbox. Compiling one standalone protocol is intentionally narrower
than rebuilding arbitrary future gateway dependencies. Unsupported routing must be
implemented and reviewed before use.

No gateway runtime, protocol source, deployment template, dependency pin, registry,
secret, Access/OAuth setting, production bridge/plugin, owner runtime or live Worker
was changed. No model calls occur. CLI-147 receives scoped evidence only; its broader
versions/distribution acceptance remains open. All 300 protected fields and all
WEB-008 historical deployment metadata, acceptance and remaining work are preserved.
Cross-platform and exact committed-checkout observations are subsequent evidence,
not predicted by these local fixtures.
