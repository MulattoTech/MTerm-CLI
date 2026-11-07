# Retained npm SPDX regression

`npm-11.19-incomplete.spdx.json` is the unmodified stdout from npm11.19.0 on Node24.21.0, captured 2026-11-07T21:27:35.451Z in the AUG-001 pilot using:

```text
npm sbom --sbom-format spdx --omit=dev --package-lock-only --offline
```

The command exited0. The document contains only mterm-cli0.0.1-preview.1 and @modelcontextprotocol/server2.3.0, despite the locked production closure also containing @modelcontextprotocol/core2.3.0 and zod4.6.7. The fixture must be rejected; tests must not repair it and attribute the repair to npm.

Raw SHA-256: `c2620436b3c3a9c452de3d658d31cd71f7f56b2ab44ce4e1471905fc1439d866`.
The generated document declares CC0-1.0 data licensing. It contains public registry metadata and no credentials or private filesystem paths. MTerm does not claim authorship of npm's output.
