# AUG-002 provenance qualification — 2026-11-07

## Identity and scope

- Issue: [#85](https://github.com/MulattoTech/MTerm-CLI/issues/85); expansion [#81](https://github.com/MulattoTech/MTerm-CLI/issues/81).
- Executor and independent read-only reviewer: OpenAI / GPT-6 Astra Pro, self-reported, using ChatGPT and MCP tools. No Codex/model CLI/API lane.
- Base: `560b3713bb9aea36578b8b7b576f4beda0775a6d`, verified merge of PR #199. Its tree matched the nine-check qualified head `311fdcaca68e69277482ff029ffc374efd7b4a01`; all five main checks passed.
- Active normal clone: `H:\\MTechLabs\\Dev\\MTerm-CLI-AUG002-20261107`, branch `feat/aug-002-provenance-gate-20261107`.
- Runtime: Node 24.21.0; npm 11.19.0. Existing primary dirty checkout and other project/worktree state remain preserved.
- [Standing authorization](../OWNER_AUTHORIZATION.md) covers normal reviewed delivery and merge. There is no recurring owner-review gate.

## Observed development receipts

Initial build/install of the clean base passed. The original 14 actual CLI acceptance cases then failed against the base (0 pass, 14 fail, no skips/cancellations), at 2026-11-07T21:48:14.9579760Z. The original test-file SHA-256 was `328bdfd4b6382228af81a0fd852ca3829e7e754405a3d2dc7d68235be996a3fe`.

The first implementation built but failed because it requested a 2 MiB file-service limit while the existing service permits at most 1 MiB. The verifier was corrected to preserve that existing boundary. The unchanged original cases then passed 14/14.

Two cancellation/deadline cases brought the suite to 16/16. Independent review found decoy package metadata could be supplied at a path unrelated to the installed location. A real failing regression reproduced this (2026-11-07T21:57:38.1424913Z). The fix binds metadata to the exact package location and package name and rejects unsupported workspace/alias layouts.

The current focused Windows run passed **17/17**, no skips/failures/cancellations, at 2026-11-07T22:05:18.1151558Z. It also covers empty license text and cooperative cancellation after a real license-file read. These are local development receipts, not a claim about an as-yet untested final commit.

Retained workstation receipts are under `artifacts/aug002/`: initial RED, implementation limit failure, identity RED, focused GREEN and subsequent qualification logs. Finished process sessions are not required to recover those files.

## Evidence semantics

[PROVENANCE.md](../PROVENANCE.md) states the trust boundary, supported contract, limits and exclusions. The output reports selected local review eligibility separately from upstream authentication, complete runtime integrity, patch replay, pack admission and whole-product acceptance.

The npm 11.19.0 lock-only SPDX command returned exit 0 while omitting two actual runtime packages. The unmodified captured document has raw SHA-256 `c2620436b3c3a9c452de3d658d31cd71f7f56b2ab44ce4e1471905fc1439d866`. A regression rejects it. Installed-prefix npm SBOM also failed with a null `replace` error; that failed experiment is retained in the prior pilot's ignored receipts and is not a valid SBOM.

The actual npm runtime graph has four package identities and five dependency edges. Server/core 2.3.0 retain the complete upstream mixed Apache/MIT transition license at `a202a3621fcb97918e09fa45d0f9efd2dbdee19b`, with raw license SHA-256 `0382b0057770ca05e9c350a50aa3b1c1fea84da0bc81d723bf00b9aa841be58a`. The package.json Apache declaration alone does not express the full retained notice. Zod 4.6.7 source pin is `b500a2ee95134f81d74da7911d7378dd2853d042`; retained MIT license SHA-256 is `3f1189b28e3866e0d979968d466b78f813f76827cfdca1fbb124cc0a5c8841f8`.

Published SDK source maps reveal additional embedded components and JSON Schema metaschema origin. Their full attribution is being retained separately; a four-package graph is not automatically complete bundled-code rights evidence. The real runtime qualification intentionally expects a blocked transitive-review report while that broader contract remains pending.

## Gates and remaining work

Focused local tests are observed above. Full native/installed qualification, official schema validation, production advisory audit, final-head hosted Windows/Linux/macOS runs, independent final diff review and normal merge/main verification must be read from the later appended receipt or latest PR checkpoint. Do not infer them from this preparation.

No runtime dependencies are added. The package keeps its existing standalone-core budget; the normal installed verifier measures actual bytes. No runtime/helper/network/model execution is added by the provenance command.

Original CLI-151/152/153 and CLI-300 evidence/notes are reviewed without changing acceptance, stage, weight, estimates, dependencies or blockers. AUG remains 0/117 accepted; original CLI maturity29.12% and0/300 complete; DCP0/48; WEB0/12. The broader vendor update strategy, generalized SPDX/license expressions, complete bundled component/file SBOM, patch replay and all152 source integrations remain unaccepted.

## Observed qualification checkpoint — 2026-11-07T22:23:50.478Z

Full local wrapper exited0:352/352 native tests, no skips/failures/cancellations; actual installed provenance17/17; seven reference files; four-package/five-edge graph; all nine retained license sections and twelve SDK artifact pins checked. Standalone installed core14280183bytes. Native Codex0.167.0 parsed only synthetic registration; no model invocation or user config change. Both actual SPDX documents passed the official schema using Pythonjsonschema4.26.0 plus separate Node semantic checks. Independent review found no implementation blocker at source fingerprintaeb6e5f66c0e5efc500a600ce4ab093cd3f29a4d1765ff39c49ab1941f36bd93.

**Security is not clear:** ordinary production audit returned0, but the separate eight-component bundled inventory audit found fast-uri3.1.0 affected by12 advisories. Product exploitability is not demonstrated; it remains needs-review. Published SDK2.4.0 still embeds3.1.8, so a simple upgrade is not full remediation. See the bundled-security JSON receipt. An isolated rebuild of the exact2.3.0 SDK source with fast-uri3.1.9 is being prepared; it is not yet a qualified replacement. This draft diagnostic checkpoint does not clear production distribution or claim full AUG acceptance. Owner review is already authorized; no owner action is required.

## Replacement artifact checkpoint — 2026-11-07T22:59:39.721Z

Artifact commit8e6f2336d995b5c1cb5ff044071ed186cce03567 retains server2.3.0-mterm.1 at upstream2.3.0 with embedded fast-uri3.1.9. The complete license, nine bundled notices,48modification banners and86filepins are retained. Four fresh Windows rebuilds produced the same archive SHA256fe2a319a6c282893d657479a67c821a62addd947e4277964b8db653762c77692. The final recipe snapshots inputs and verifies pnpm SRI before use. Independent review matched72SDKsources to original Git,114externalpayloads to pinned inputs and17JSONmodules in each format to the official Ajv archive. The new selected-component audit reports0advisories; the earlier12-advisory failure remains historical evidence.

The actual installed URL uses that immutable commit, and source lock/shrinkwrap are synchronized without changing other locked entries. The affected-version regression first failed against3.1.0 and now passes alongside the17provenance cases. The original captured npm failure is preserved as rawCRLF bytes in Git using -text plus a rawhash assertion. Final integrated native/installed and hosted gates remain pending at this checkpoint; no acceptance metrics changed. See the SDK-remediation JSON receipt and later exact-head PR checkpoint.

## Integrated local qualification — 2026-11-07T23:07:28.925Z

All seven stages completed at 2026-11-07T23:03:20.314Z: reviewed build, native suite, MCP self-host check, normal prepack, clean installed package, isolated native registration and managed-registration verification. Native **353/353**, installed provenance/security **18/18**, and installed optional packs **16/16** passed. All 86 installed SDK file hashes and nine bundled license sections matched. The standalone installed core measured **14,476,966 bytes**; the external Node prerequisite is separate. Actual MCP initialize/list/call operations passed. Native Codex parsed only synthetic temporary configuration; no model request or real-user configuration change occurred.

The two actual installed SPDX documents passed the pinned official schema and independent semantic checks. Ordinary production and the separate selected-component audits both report zero findings. The raw failed npm SPDX capture still matches its original bytes. The source fingerprint is **6eed11f7367649df06946da493791e13016bd888d37ad95b64e05e1146c3b23d**. See [the integrated receipt](2026-11-07-aug002-integrated.json). Exact-head hosted and merged-main checks remain separate gates. No whole-product, real ChatGPT connector, or complete bundled-file SPDX/admission acceptance is claimed.
