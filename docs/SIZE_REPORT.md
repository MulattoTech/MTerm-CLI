# Windows dependency-reuse preview size

Measured with a fresh packed install on Node24.21.0:
- MTerm compressed archive: 23,631 bytes.
- MTerm unpacked package: 84,248 bytes.
- MTerm plus production dependencies: 14,031,618 bytes across 976 files.
- Separate Node executable prerequisite: 93,580,104 bytes, NOT bundled.
- Existing Codex: separate prerequisite, NOT bundled or counted above.
- Web integration and quota adapter: not implemented/bundled.

The full required three-component under50,000,000-byte product is NOT verified.
This is a dependency-reuse local tool host, not a self-contained all-three-upstream bundle.
Five external launch-to-help-completion samples: [35.87, 32.27, 33.77, 34.44, 34.29] ms.
Median 34.29 ms. These are help-only results, not model latency, cold-cache
certification, interactive readiness or a GUI/CLI speed comparison. Later documentation/formatting
can change package byte counts slightly; reproduce using scripts/verify-package.mjs.
Raw evidence: artifacts/package-verify-zYwAC2/result.json.
