# Optional local tool packs — ABI 1

This is the first implementation slice of [AUG-001 / #82](https://github.com/MulattoTech/MTerm-CLI/issues/82), under [expansion epic #81](https://github.com/MulattoTech/MTerm-CLI/issues/81). It supports explicitly approved local Node.js sidecars. It does not establish full AUG acceptance or the later provenance, sandbox, installer, remote authorization, or dynamic-catalog gates.

## Owner workflow

Use Node.js 24. The pack's files and manifest must already exist. Select the manifest SHA-256 through a trusted review or delivery channel; computing a hash of an unreviewed download does not establish trust.

```text
mterm-cli packs inspect --manifest ABS_MANIFEST --sha256 MANIFEST_SHA256
mterm-cli packs install --manifest ABS_MANIFEST --sha256 MANIFEST_SHA256 --registry ABS_REGISTRY_FILE
mterm-cli packs install --manifest ABS_MANIFEST --sha256 MANIFEST_SHA256 --registry ABS_REGISTRY_FILE --apply
mterm-cli packs list --registry ABS_REGISTRY_FILE
mterm-cli mcp --stdio --root ABS_OWNER_ROOT --pack-registry ABS_REGISTRY_FILE --allow-exec --allow-pack PACK_ID
mterm-cli packs uninstall --id PACK_ID --registry ABS_REGISTRY_FILE
mterm-cli packs uninstall --id PACK_ID --registry ABS_REGISTRY_FILE --apply
```

Replace the uppercase placeholders; quote paths containing spaces. Registry parent directories must exist. Install and uninstall preview by default. `--apply` changes only the explicit registry JSON file. It does not download, extract, install dependencies, execute a payload, delete source files, configure a client, or create a listener. Repeating an identical registration or removal is harmless. A different registration with the same ID requires explicit unregistration first.

Both the registry and every manifest/payload must be inside the MCP host's explicit owner roots. `--allow-pack` may be repeated for up to sixteen distinct IDs. No wildcard grant is supported. Without `--allow-exec` and the exact pack ID, that pack's tools are absent. `--allow-exec` also enables the existing general process tools; the pack allowlist does not narrow that pre-existing general execution authority.

Normal help, status, and default MCP startup do not load a registry or start a pack. Bad or unavailable packs produce bounded diagnostics in `mterm_capabilities.optionalPacks`; native tools remain usable. Discovery is a startup snapshot. Registration and pins are checked again before each call, so unregistration or replacement denies subsequent calls through an already advertised tool. Restart the host to refresh discovery. Unregistration does not interrupt a call already running; use request cancellation or close the host for owned-process cleanup.

Managed `setup codex` currently refuses pack flags because its configuration format does not preserve them. Direct stdio configuration can pass the explicit arguments. No real Codex or ChatGPT consent/setup acceptance is claimed by the synthetic SDK fixtures.

## Manifest contract

The raw UTF-8 manifest is SHA-256 pinned. Unknown fields, unsupported versions and invalid schemas are refused. The manifest declares:

| Field | ABI 1 contract |
| --- | --- |
| `manifestVersion`, `abiVersion` | Both `1`; unsupported ABI is refused before execution. |
| `id`, `version` | Lowercase hyphenated ID, at most 24 characters; exact three-part version with optional prerelease. |
| `source` | HTTPS URL without credentials/query/fragment, 40-hex source commit and nonempty license declaration. These are declarations, not an independently verified license attestation. |
| `runtime` | `{ "kind": "node-stdio-once", "nodeMajor": 24, "entry": "worker.mjs" }`. The host's selected Node executable is reused. |
| `platforms` | Explicit OS-architecture list. Implemented host targets: `win32-x64`, `linux-x64`, `darwin-arm64`, `darwin-x64`. Actual qualification is recorded separately. |
| `dependencies` | Required array. ABI 1 refuses nonempty arrays; there is no package resolver or dependency installer. |
| `files` | One to sixteen relative files with SHA-256; the entry must occur in the list. No parent traversal, absolute paths, duplicate case-folded names, links or private names. Each file must be bounded UTF-8. |
| `permissions` | Exactly `["execute-unsandboxed"]`. Other declarations are refused. |
| `tools` | One to sixteen distinct names, descriptions, object input/output schemas and `timeoutMs` from 100 to 30,000. |

Each tool is exposed as `mterm_pack_ID__NAME`, with destructive/open-world annotations. Descriptions and output are third-party data and must not be treated as owner instructions.

The schema subset supports strict objects (`properties`, explicit `required`, `additionalProperties:false`), strings (`minLength`, `maxLength`), finite numbers/integers (`minimum`, `maximum`), booleans, and arrays (`items`, `minItems`, `maxItems`). Unknown keywords, references, regexes, formats, unions, defaults, code and remote resolution are refused. Limits: depth four, 128 schema nodes, 32 properties per object, string length 4,096 and 64 array items. Input and output must be objects.

## One-shot protocol

The host verifies registration, platform, ABI, manifest and declared payload hashes before spawning its selected Node executable with the entry path as a structured argument. It sets the pack directory as cwd and uses the existing small OS environment allowlist. One JSON request followed by a newline is sent on stdin:

```json
{"protocol":"mterm-pack-stdio/1","id":"REQUEST_UUID","pack":"PACK_ID","version":"1.0.0","tool":"echo","arguments":{"text":"hello"}}
```

The child emits exactly one JSON response document to stdout and exits successfully:

```json
{"protocol":"mterm-pack-stdio/1","id":"REQUEST_UUID","pack":"PACK_ID","version":"1.0.0","result":{"text":"hello"}}
```

The response must echo the exact protocol, request ID, pack and version. Nonzero exit, malformed/extra JSON, mismatched identity/version and invalid result schema fail. No backend error body is copied into the pack error response. Pack sessions are retained by the shared process subsystem; an execution-authorized client can inspect their output there. Suppressing a response diagnostic is not a confidentiality boundary.

Manifest and registry limits are 65,536 bytes each; each declared payload file is at most 65,536 bytes. Registry limit: sixteen packs. Request limit: 65,536 bytes. Combined observed stdout/stderr limit: 65,536 bytes, including output already drained. Retention loss fails closed. Existing host limits of four concurrent tools, eight active processes and 32 retained process sessions still apply. Cancellation, deadline failure and shutdown use the existing owned-process termination path. A timeout is an event-loop/OS cleanup policy, not a hard real-time bound or proof of hostile descendant containment.

Registry changes use an exclusive sibling `.lock` and the existing version-checked atomic file writer. A lock is never automatically stolen. After a crash, inspect the owner and registry before deliberately removing a stale lock. No command performs stale-lock recovery automatically.

## Security and rights limits

**An approved pack executes arbitrary code with the user's OS permissions.** Root checks constrain host admission and file inspection; they do not confine the child. Pins verify the manifest and listed files at inspection time, not all code that may later execute. The Node entry can import undeclared files or ancestor packages, use builtins, access the network, start descendants, and access files outside the selected roots. A concurrent local writer can race pathname checks and the later Node open. Only trusted owner-reviewed local code is appropriate for this ABI.

`dependencies:[]` means no declared external dependency is supported by this loader. It is not enforcement of an import closure. The `source` and `license` fields do not prove a right to redistribute. `licenseVerified:false` and `osSandbox:false` are explicit in diagnostics. AUG-002, AUG-004, AUG-005, AUG-011 and the real remote-client gates remain open. No third-party source or heavy runtime is copied or bundled by this change.

The synthetic fixture backend in `tests/tool-packs.test.mjs` only echoes test data, writes a test-owned PID marker, and exercises faults. Its manifest source fields are fixture metadata, not evidence that an upstream backend has been installed or audited. No model invocation is in this implementation or fixture. This statement is scoped to these paths; arbitrary approved packs are not prevented from making network or model calls.

## Qualification

```text
npm run build:code
node --test --test-concurrency=1 tests/tool-packs.test.mjs
node scripts/orchestration/verify.mjs --quick
node scripts/verify-package.mjs
```

Normal build/check/pack also require the explicit roadmap review workflow. The installed verifier binds compiled CLI/MCP/pack bytes to the installed tarball, runs the same real CLI/SDK acceptance suite from outside the checkout, and records the measured production footprint. See the [dated report](validation/2026-11-07-aug001.md) and [resumable queue](expansion/README.md). Platform pass, owner authorization (including the standing delegation in OWNER_AUTHORIZATION.md), actual-client consent, licensing scope and whole-product acceptance remain separate evidence fields. Routine implementation review/merge does not require another owner action.
