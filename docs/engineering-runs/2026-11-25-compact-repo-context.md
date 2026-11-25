# Compact repository context — 2026-11-25

Base: f49c01002b994d36ce55f4a9da3bd7126c3583fa. Development-only. No hosted inference, production change, merge or deployment.

The existing mterm_repo_map default returns its original full shape. Opt in with:

```json
{"path":".","maxFiles":50,"maxLines":120,"compact":{"maxOutputBytes":8192}}
```

Compact-v1 contains a relative-path Markdown map with whole file/symbol lines, kind and line numbers; signatures and duplicated outlines are omitted. It reports filesIndexed, totalSymbols, filesReturned, symbolsReturned, omittedFiles, omittedSymbols, truncated and cacheHit. Totals describe the existing bounded scan, not an exhaustive repository index. A truncated result is not proof a symbol is absent. Narrow path and use approved source reads for exact content. Byte range 1024–32768, default 8192; cap applies to UTF-8 JSON report, not MCP envelope or tokenizer output. Read boundaries and cancellation unchanged.

Measured on a synthetic one-file 120-symbol fixture: full report 22631 bytes, compact 1015 bytes (1024 requested). Actual official SDK call result 47069 bytes versus 2255 bytes. These are serialized byte measurements, not model speed, accuracy, or token claims. Existing default map and neighboring tests passed; focused and neighboring suites 28/28. Expected-red fixtures failed before implementation. Local Node v27.0.0-alpha.0.0.0 on Windows, pinned local dependency reuse; no npm installation. No independent review, hosted CI, cross-platform or installed package acceptance yet.

Next: make the compact view available to an isolated, approved Satelligence/MTerm client, compare navigation correctness and measured token use on fixed synthetic tasks, then separately qualify OpenHands and authenticated plugin surfaces. Never auto-repin the existing read-only broker or widen its allowlist.
