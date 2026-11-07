# Retained MCP SDK security rebuild

This directory retains the MTerm-maintained `@modelcontextprotocol/server 2.3.0-mterm.1` archive. It derives from upstream SDK 2.3.0 at commit `a202a3621fcb97918e09fa45d0f9efd2dbdee19b`; it is not an official upstream release.

The upstream server embeds fast-uri in its Ajv bundles. The ordinary installed-package audit missed that component. The separate bundled inventory audit found twelve advisories in fast-uri 3.1.0; the available SDK 2.4.0 still contained 3.1.8. This rebuild pins fast-uri 3.1.9 while retaining the SDK implementation source and existing runtime dependency graph. The failed audit is retained in `docs/validation/2026-11-07-aug002-bundled-security.json`.

## Inputs and modifications

- `source.patch` changes only the root URI resolution, its exact lockfile entries, server version/private/files metadata, and a build-generated modification banner.
- `LICENSE` is the byte-exact upstream SDK license, including its Apache/MIT transition and documentation notices.
- `NOTICE-MTERM.md` identifies the modified distribution and retains complete license text for eight embedded npm components and the JSON Schema origin.
- `provenance.json` records exact archive, input, and unpacked-file hashes, the packaging environment, and observed validation.
- `rebuild.mjs` performs the recorded build in a new directory. It refuses an existing directory and uses an exact source commit, LF checkout, frozen dependency lock, and disabled install lifecycle scripts. It explicitly runs the core build and server prepack/build, sorts only dependency dictionaries, then repacks with npm using --ignore-scripts. Export-condition order is preserved.

All emitted JavaScript and declaration files carry the build tool's modification banner. The build tool emits their source maps; no banner is manually prepended after mapping.

## Rebuild

The recorded archive packaging host is Windows x64 with the official Node 24.21.0 distribution and its npm 11.19.0. The script installs pnpm 10.26.1 inside the new build directory. Git and access to the official GitHub source and npm registry are required.

Run `node vendor/modelcontextprotocol-server/rebuild.mjs ABSOLUTE_NEW_DIRECTORY` from the recorded Node distribution. The parent directory must exist. The resulting directory contains the source clone, isolated build tools, logs, archive, and `result.json`. Compare the archive SHA-256 and SHA-512 integrity against `provenance.json`.

Four fresh builds produced byte-identical archives after dependency-key normalization. The final recipe also pins pnpm integrity before execution and snapshots the patch, notice, license and recipe inputs. Exact gzip/tar bytes are qualified on the recorded packaging host; cross-platform reproducible builds are not claimed. Runtime compatibility is tested separately on Windows, Linux, and both supported macOS architectures.

## Consumption and scope

MTerm's package declaration and both lockfiles bind this archive to an immutable GitHub commit URL and its SHA-512 integrity. Preserve that commit in main ancestry with a normal merge. A squash merge followed by deleting the only containing ref could make the URL unavailable.

The archive is not duplicated inside MTerm's own npm payload. npm retrieves it as the existing SDK dependency, and no install lifecycle hooks run. The SDK archive's complete file inventory is checked against the actual installed package.

This repair supplies concrete build, integrity, security and notice evidence. The generic provenance command still reports the broader embedded-file SPDX/admission contract as pending. No whole-product, all-source, legal-authentication or model-driven client acceptance is awarded by this artifact.
