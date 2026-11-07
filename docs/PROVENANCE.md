# Offline provenance and rights evidence

Issue [AUG-002 / #85](https://github.com/MulattoTech/MTerm-CLI/issues/85), expansion [#81](https://github.com/MulattoTech/MTerm-CLI/issues/81). This is an original MIT implementation using the existing file policy and Zod dependency.

## Command and trust boundary

```text
mterm-cli provenance inspect --root ABS_DIR --manifest ABS_FILE --sha256 HEX [--timeout-ms 1..30000]
mterm-cli provenance help
```

The caller selects an absolute owner root, an absolute review record, and its exact raw SHA-256. The CLI reads local UTF-8 evidence, verifies selected hashes and review relationships, and prints a companion attribution report containing MTerm-generated SPDX 2.3 JSON. It does not fetch upstreams, copy/vendor implementation, apply patches, execute packs, call models, or grant pack admission.

Exit 0 means the selected pinned review record meets this supported contract. Exit 2 returns a structured report with rights/review blockers. Malformed, missing, out-of-root, tampered or unsupported inputs fail with a bounded error. The report explicitly distinguishes the caller-selected review record from authenticated upstream/license authority. A recorded source commit and registry integrity are different claims from proving a reproducible build or all installed runtime bytes.

`eligible` applies only to the selected review evidence. It is not a legal attestation or a permission token. Standing owner authorization permits the executor to conduct the review and retain notices without another manual gate; it cannot create rights that an upstream did not grant.

## Review record version 1

The exact schema is in `src/provenance.ts`; fixtures provide executable examples.

- `schemaVersion: 1`, bounded name/version, allowed platform IDs, and reviewer/date/rationale.
- `sources`: unique ID, HTTPS repository without credentials/query/fragment, exact 40-character commit, version, reviewed license expression, retained copyright, one or more license pins, explicit retained/absent NOTICE declaration, and transitive review status.
- `files`: unique relative file path, SHA-256/hash mode, source ID, upstream path/hash, and either unmodified status or a patch record.
- A patch record binds the retained upstream base, retained diff, rationale and regression-evidence pins. The verifier does not replay the patch or rerun the recorded regression.
- Optional `packages` plus npm v3 `lockfile` select an installed runtime dependency closure. Each package JSON pin must be the exact `location/package.json`; dependency resolution must reach the named package, not a decoy or an alias.
- Optional `sbom` compares a supplied SPDX document's package identities, versions, declared licenses, locked integrities and dependency edges with that independently traversed closure.

A pin contains `path`, `sha256`, and `hashMode`. `bytes` hashes original bytes. `utf8-lf` normalizes CRLF to LF for the existing checked-in reference snapshot, while the report retains a separate raw-byte SHA-256. It never silently substitutes a normalized digest for registry or upstream byte integrity.

Supported permissive expressions are MIT, Apache-2.0, Apache-2.0 AND MIT, BSD-2-Clause, BSD-3-Clause, ISC and 0BSD. Other expressions fail closed. Copyleft expressions return `REDISTRIBUTION_REVIEW_REQUIRED`; unknown/proprietary/no-license declarations return `LICENSE_DENIED`. This bounded allowlist is not a general SPDX expression parser. License text is retained and hash-bound, not classified or authenticated by an LLM at runtime.

The source review must separately resolve bundled-code rights. A complete npm lock traversal cannot infer those rights. `pending` transitive review returns `TRANSITIVE_REVIEW_PENDING`, even when all separately installed package identities and edges match. An absent NOTICE declaration is a pinned review assertion, not a network search by the command.

## Supported scope and bounds

Platforms are Windows x64, Linux x64, macOS ARM64 and macOS x64 on the declared Node 24+ runtime. Hosted qualification must be checked on the exact candidate head; a listed platform alone is not PASS.

| Resource | Bound |
| --- | ---: |
| Review manifest | 65,536 bytes |
| Single UTF-8 evidence file | 1,048,576 bytes |
| Aggregate evidence | 8,388,608 bytes |
| Unique evidence reads | 192 |
| Sources / selected files / packages | 16 / 64 / 64 |
| Serialized companion report | 262,144 bytes |
| Default / maximum deadline | 3,000 / 30,000 ms |

Root/link/private-file rules reuse `FileService`. Reads reject outside-root traversal, symlinks/junctions, multiply linked files, invalid UTF-8, binary content and oversized evidence. There is no new filesystem policy bypass.

API cancellation and deadlines are **cooperative checkpoints around bounded reads**. They prevent subsequent work and close completed reads through the existing file service. They do not promise an OS-level interruption of a pending filesystem operation. Tests cover pre-abort, root-initialization abort, cancellation after a real license evidence read, and a deadline during actual file I/O.

Runtime closure support is deliberately bounded to ordinary npm v3 non-workspace installations with direct production dependencies. Optional/peer/bundled dependency metadata, links, workspace/alias layouts, repeated package identities and unsupported graph shapes are refused rather than silently omitted. Separately bundled content must have its own reviewed evidence; it is not inferred from a lockfile.

## SPDX and actual producer regression

The output is explicitly generated by `Tool: MTerm-Provenance-1`, with SPDX-2.3, CC0-1.0 document data, SPDXRef-DOCUMENT, a unique HTTPS namespace, UTC creation time, stable intra-document IDs and resolved relationships. Runtime packages use `filesAnalyzed: false`, no file-verification code, and `licenseConcluded: NOASSERTION`. Locked SHA512 SRI is decoded into the SPDX hexadecimal checksum representation. Selected file attribution remains in the companion report; it is not mislabeled as a complete SPDX file inventory.

This SPDX portion describes the selected separately installed package graph (or reference snapshot metadata). It does not claim to enumerate every component embedded in a compiled dependency. Bundled-source license review remains separate and visible.

The retained real `npm 11.19.0 sbom --sbom-format spdx --omit=dev --package-lock-only --offline` result exited successfully but included only MTerm and the server package, omitting core and Zod. Its original bytes are kept in `tests/fixtures/provenance/npm-11.19-incomplete.spdx.json`. The verifier rejects that document. It does not insert missing packages into an npm-produced document or claim that the original producer succeeded semantically.

The installed qualification helper binds the installed CLI, provenance, file, policy and error module hashes to the compiled candidate, runs the same acceptance suite from outside the checkout, verifies the seven real pinned DesktopCommander reference files, and generates a real four-package/five-edge runtime report. A pending SDK bundled review must produce a blocked report, not a green redistribution claim.

Independent SPDX JSON-schema qualification uses the official SPDX 2.3 schema at `aadf3b0b8dbbabdb4d880b0fc714255fea436ff7` (SHA-256 `239208b7ac287b3cf5d9a9af23f9d69863971102a5e1587a27a398b43490b89b`) with its CC-BY-3.0 license retained in ignored validation artifacts. Schema acceptance is complemented by semantic identity/edge/checksum assertions. The schema/validator is not a new runtime dependency.

## Remaining acceptance

This slice supplies an offline evidence verifier, bounded closure checks, metadata SPDX generation, and installed qualification. It does not complete the vendor initialization/update strategy (CLI-151), all upstream notices across the 152-source expansion (CLI-152), or patch application/replay and end-to-end regression provenance (CLI-153). Full AUG-002 acceptance remains open until the broader integration and rights contract is verified. No existing CLI stage or AUG/DCP/WEB count is promoted from this slice alone.

## Retained SDK security rebuild

PR #200 replaces the affected embedded fast-uri with version 3.1.9 in a MTerm-maintained server 2.3.0-mterm.1 rebuild. [The retained recipe and provenance](../vendor/modelcontextprotocol-server/README.md) bind the original source, four-file patch, all nine notices, 86 installed file hashes, and the exact archive at commit 8e6f2336d995b5c1cb5ff044071ed186cce03567. Package-lock and shipped shrinkwrap use its immutable HTTPS URL and SHA-512 integrity. The installed helper runs the affected-version regression alongside the provenance acceptance suite and verifies every SDK file against that reviewed archive. The actual separately installed graph remains four packages and five edges.

Four fresh Windows builds produced identical archive bytes after normalizing dependency dictionary order; export-condition order is preserved. The independent review also checked 72 original SDK source payloads, 114 embedded external payloads and 17 JSON modules in each Ajv format. The separate bundled-component audit returns zero advisories for those exact versions. These observations do not complete the generalized bundled-file SPDX/admission contract or establish cross-host reproducible builds; the runtime review continues to report that wider contract as pending.
