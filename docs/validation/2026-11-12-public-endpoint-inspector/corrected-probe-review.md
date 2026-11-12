# Corrected endpoint-probe source review

**Approve the corrected source slice** at probe SHA256 `da57c3085f6f8de18e4e8d4e396edebf4630f6748aded659408233b80ed5d8a9` and regression SHA256 `cee7fd1a5a009cbb3932ddde8f6de6a6f133668b017e640250df05b27a0aaa10`. All three previously reported defects are resolved; no concrete remaining in-scope bypass or regression was found. Final immutable publication and delivery gates remain separate.

## Independent verification

- The corrected frozen endpoint suite passes **81/81**, with zero failures, skips or cancellations.
- Both original reviewer session regressions pass unchanged against the corrected source. Their bytes match the earlier failure receipt.
- The original **21,181-byte** CRLF event now returns `ENDPOINT_LIMIT`, `inconclusive` and `protocolChecked:false`.
- Eight independent exact **16,384-byte** and plus-one **16,385-byte** cases pass for LF, lone CR, CRLF and split CRLF. Each uses one mocked request and verifies its destruction.
- All selected source hashes remain unchanged after offline dependency installation, isolated build and tests.

## Corrected behavior

Metadata containing the known initial session is omitted, including exact and embedded occurrences in either display field. The session sent to the original endpoint for cleanup is unchanged. Session-header observation records uncertainty before validation; storage and adoption still require separate checks. Invalid or duplicate headers cannot authorize DELETE. SSE event accounting now charges the actual consumed delimiter width without changing the other response bounds.

DNS pinning, TLS/proxy settings, protocol selection, target authority, credential isolation and CLI dispatch retain the previously reviewed behavior. The accompanying documentation distinguishes bounded compatibility from authenticated readiness and keeps local-routing/trust limitations explicit. The package-verifier threshold increases from 61 to 81; this source review does not claim that the installed-package lane has run.

No external endpoint probes, user credentials, production operations or repository source edits occurred. The original failing snapshots and logs remain intact.
