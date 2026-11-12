# Public endpoint inspector — source evidence

This directory records issue251's bounded public HTTPS inspection slice on base
`4fb205088e77731e42da5adaca6bf167f8b75194`. It does not certify provider
authentication, actual remote routing, installed production behavior or a whole
CLI/DCP/WEB/AUG requirement.

## Regression and review history

| Evidence | Recorded outcome |
| --- | --- |
| `cli-initial-red.tap` | Old CLI:1 new behavior failure,2 passing controls. |
| `policy-initial-red.tap`, `probe-initial-red.tap` | New modules absent before implementation. |
| `scoped-ipv6-red.tap.json` | Defensive exported classifier accepted a zone suffix;4 controls passed,1 failed. Raw URL admission already refused the suffix. |
| `schema-parser-red.tap.json` |46/50 passed;4 failed counts exposed coercive cacheScope, invalid optional serverInfo and an unset strict HTTP-parser option. |
| `initial-policy-review.json` | Independent source review and1,051 address vectors covering all51 IANA networks; zone-suffix and translated-route claim corrections requested. |
| `initial-probe-review.json`, `initial-transport-review.json` | Existing61 tests passed, but independent session, cleanup-reporting and CRLF limit findings required corrections. These are not final approvals. |
| `independent-session-red.tap.json`, `independent-malformed-session-red.tap.json`, `independent-crlf-observation.json` | Original independent reproductions retained unchanged. The CRLF event was21,181 bytes and was accepted despite the16KiB event limit; the separate64KiB body bound still held. |
| `peer-regressions-red.tap.json` |20 tests:6 boundary controls passed and14 failed counts before source fixes. |
| `endpoint-green.tap` | Corrected source:81/81, zero failures/skips/cancellations/todos, including owned real TLS checks. |
| `corrected-probe-review.json`, `corrected-transport-review.json` | Independent corrected-source approval, unchanged original session regressions now passing, original oversized CRLF event refused, and eight additional boundary cases passing. |
| `local-normal-quick.json` | Normal build/typecheck/format/roadmap/parity passed. Full local source suite failed:1,417 passed,27 existing Unix-socket `listen EPERM` failures,12 Windows-only skips. Complete raw log retained losslessly. |
| `installed-local-result.json` | Installed endpoint81/81 and profiles24/24 passed outside the checkout with matching compiled module hashes. Full package gate failed in isolation protocol fixtures:4 passed,27 `listen EPERM` failures. Later provenance/link stages were not reached. |
| `metric-evidence-reconciliation.json` | New register guard rejected the changed progress-file hash. All300 rows were compared: only notes/evidence/reviewer changed on seven IDs. Historical baseline retained; current evidence hash explicitly reconciled with unchanged validation and credit rules. |

The source tests use controlled DNS/HTTP streams; the TLS test uses an owned
loopback listener to exercise the actual private-agent factory. The product URL
policy still rejects that loopback address. The test certificate/key are public
synthetic data, excluded from the product package. No external endpoint probe,
stored credential, real enrollment or model request was used.

Normal repository tests, installed-package verification, final immutable review,
six exact-candidate jobs and six actual-main jobs are separate delivery gates.
The local failures above remain failures and do not waive the hosted gates.
Their current state must be read from the dated AI record, PR and later checkpoint.
An earlier source pass does not establish a later commit's result.

## Primary source and policy basis

`primary-source-manifest.json` retains exact retrieval URLs, commit identities,
dates and hashes from the independent design research. Its full raw research
captures are separate development inputs; this directory includes the two IANA
CSV snapshots and derived policy/corpus records. Corpus design is not a claim
that every proposed case is a product regression. Actual product tests and the
independent1,051-vector review identify their own executed cases.

- Official MCP documentation and schema were read at immutable commit
  [06e923405df3df242f1471b9300d9db90ebd10fd](https://github.com/modelcontextprotocol/modelcontextprotocol/tree/06e923405df3df242f1471b9300d9db90ebd10fd).
  Default2026-07-28 discovery creates no MCP protocol session; legacy2025
  initialization is selected explicitly and may negotiate a listed2025 revision.
- Node24.22.2 tag resolves to immutable commit
  [f7f273a9bb6445f6f7fb6349105e7532972045fb](https://github.com/nodejs/node/tree/f7f273a9bb6445f6f7fb6349105e7532972045fb).
  Private-agent options and real TLS controls were checked against those primary
  sources and the actual local Node24.22.1 runtime; hosted Node qualification
  remains separate.
- The [IANA IPv4 registry](https://www.iana.org/assignments/iana-ipv4-special-registry/)
  and [IPv6 registry](https://www.iana.org/assignments/iana-ipv6-special-registry/)
  both reported2025-10-09 as their last-update date. Public mode conservatively
  denies their special-purpose allocations, including globally reachable exceptions.
  Azure's [168.63.129.16 platform address](https://learn.microsoft.com/en-us/azure/virtual-network/what-is-ip-address-168-63-129-16)
  is additionally excluded.

The address policy is not an OS routing sandbox. Arbitrary routes, transparent
intermediaries, organization-specific translation and trusted local runtime or
certificate-store changes remain outside its proof. Timers bound ordinary async
operation; they do not promise an OS hard wall-clock deadline during event-loop
stalls. Session cleanup acknowledgment records a protocol response, not a remote
storage audit.

`evidence-manifest.json` binds the retained evidence bytes. It is an integrity
index, not a cryptographic attestation of test authenticity or complete security.

Raw captures with producer trailing spaces and the original CRLF IANA CSV files
use lossless `.tap.json`/`.csv.json` wrappers. Decode the `data` base64 field and
verify the stored byte count/SHA256 to recover the exact original file. No test
output or registry content was normalized to satisfy source whitespace checks.
