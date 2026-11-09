# Supported installer review coverage

Session `MTERM-WEB-20261109T031131Z-e0efd5d4`; OpenAI / GPT-6 Astra Pro (self-reported).
Base: `640953514c44c5932364341ecd754399f6265bd8`, normally merged PR #212 with the same qualified tree.
Issue: [AUG-013 #94](https://github.com/MulattoTech/MTerm-CLI/issues/94).

## Defect and bounded correction

`Install-MTermCLI.ps1` is the documented root setup/repair/sprint entry point, but it was absent from every recursive review root and the explicitly covered single files. Its content could change without invalidating a source review.

The scanner now includes that one existing file alongside the root launcher. Existing bounded regular-file reads, link denial and text normalization remain in use. The installer itself is neither changed nor executed by this fix.

## Actual development evidence

- Four isolated regressions on the unchanged scanner: **0 passed / 4 failed**, no skips/cancellations. Both check and render incorrectly accepted a changed installer; manifest assertions proved its omission. [RED log](2026-11-09-installer-review-red.tap).
- Corrected installer cases plus existing roadmap and expansion-matrix tests: **31/31 passed**, no skips/cancellations, Node v24.22.1 Linux x64. [GREEN log](2026-11-09-installer-review-green.tap).
- Cases verify stale check/render refusal, unchanged approval/output/catalog after refusal, explicit re-review recovery, addition/removal manifest membership and real LF/CRLF equivalence with a nonempty installer hash.
- Fixtures contain harmless PowerShell text that is never executed. They use temporary minimal catalogs; the protected 300-item seed and existing pinned fixtures remain unchanged.

Exact fixture SHA-256: `19ae414949b8d0495fa607cf017d55b56d717643ef4de9e59a71999c5771e513`.
Scanner SHA-256: `2f06c9ac033d8c99df7b17bfbf629ac247a89345bf583ab55d538dd262fdb7a4`.

Independent read-only review found no material issues and ran all **4/4** new cases successfully, with no skips/cancellations. Reviewed file hashes match the values above. The reviewed build, typecheck, format, roadmap/parity and diff checks passed.

## Review and delivery boundary

CLI-231, CLI-233 and CLI-235 receive evidence only; all stages, scope, weights, estimates and acceptance text are unchanged. Full AUG-013 and installer execution qualification remain open. No runtime dependency, upstream implementation or license was introduced. Independent review, reviewed build/typecheck/format/parity and all normal exact-head hosted/package/platform checks are required before normal expected-head merge. The inherited cloud Unix-socket EPERM restriction does not waive hosted full tests.

The source and expansion subject fingerprints intentionally gain the installer. Existing historical matrix receipts retain their original subjects; no accepted capability is inferred from wider coverage.
