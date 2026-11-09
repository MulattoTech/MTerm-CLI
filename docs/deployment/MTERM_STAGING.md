# MTerm staging deployment and recovery

This deployment serves the read-only MTerm MCP gateway and private dashboard. It
does not promote MTerm to production, expose an inbound workstation port, enable
remote writes/process execution, or install an unattended agent service.

Use [the public deployment template](../../gateway/deployment.example.json) for
reviewable metadata and [the owner guide](../REMOTE_MCP.md) for pairing and use.
The template is not a Wrangler file or an executable deployment script. It defaults
to `MCP_ENABLED=false` and an empty `ALLOWED_EMAILS` value, which denies human
identities until the exact permitted owner identities are configured outside Git.

The latest qualified code deployment is the [2026-11-09 checkpoint](../validation/2026-11-09-staging-deployment.md):
source `9e2d6633294e22ff63053564bad1ebeda2dd4059`, Worker version
`88e1a5ff-ac1e-4b9a-a4c2-31ba32d6221e`, deployment
`e9b702fb-c6c0-4b15-b101-a9c8307a654f` at 100%. Public discovery, ordinary health and
anonymous denial were observed after deployment. Authenticated registry adoption
and a fresh live Windows smoke remain unqualified. The November 2 smoke below is
historical evidence for its own source and version.

## Resource inventory

| Resource | Recorded staging identity |
| --- | --- |
| Cloudflare account | `9e18ebcb3c1a920c9ef58a3d61b8d6b6` |
| M-TechLabs zone | `8bd58c3aba1973a88d32ae09ccca9595` |
| Worker | `mterm-gateway-staging` |
| Durable Object class | `MTermRegistry` |
| Durable Object namespace | `b66edc2d536e474093e1a18d0e88a24d` |
| Storage / migration tag | SQLite / `v1` |
| Gateway origin | `https://mcp-staging.m-techlabs.com` |
| MCP endpoint | `https://mcp-staging.m-techlabs.com/mcp` |
| Private dashboard | `https://mterm-staging.m-techlabs.com` |
| Access issuer | `https://broken-breeze-d0bb.cloudflareaccess.com` |
| Dashboard Access application | `598ab343-fa9c-40d7-8308-b1fa24b55d81` |
| Access audience | `9533396534dbc90c78bae02791ecdd0fab21f775876ed7164ed3b57bf54e1563` |
| Existing Google identity provider | `7ce61789-b506-4480-bf8d-7138a1765165` |
| Exact-owner allow policy | `278aac2d-13d9-424f-845b-dd7c27d43662` |

These IDs identify the existing staging resources. Reinspect them before a change;
do not create a second registry or overwrite a conflicting hostname. Owner emails,
Cloudflare API tokens, device credentials, Access service secrets, and OAuth tokens
are not repository configuration.

## Architecture and runtime configuration

Both custom domains route to the same Worker. The dashboard hostname is protected
by its Access application. The MCP origin exposes OAuth discovery and authenticated
protocol/device endpoints; it is not placed behind an incompatible browser-only
login redirect. The Worker independently validates Access JWT signature, issuer,
audience, expiry, and the permitted identity before accepting dashboard actions.

The `REGISTRY` binding resolves the existing SQLite Durable Object. Its versioned
records own pairing, authorization grants, device routing, bounded requests and
metadata audit. The local agent connects outbound and reuses the CLI filesystem
service. No D1 database, additional tunnel, or second local broker is required by
this staging implementation.

The required bindings are `PUBLIC_ORIGIN`, `DASHBOARD_ORIGIN`, `ACCESS_ISSUER`,
`ACCESS_AUDIENCE`, `ALLOWED_EMAILS`, `ENVIRONMENT`, `MCP_ENABLED`, `BUILD_SHA`, and
`REGISTRY`. Set `ENVIRONMENT=staging`; derive `BUILD_SHA` from the reviewed artifact
manifest. `ALLOWED_EMAILS` must match the deliberately permitted Access identities.
An empty value fails closed; a wildcard or Access bypass policy is not a substitute.

Use compatibility date `2026-11-01` and flag `enable_request_signal`. Keep Workers.dev
and preview URLs disabled with `enabled:false` and `previews_enabled:false`. The
recorded privacy settings are:

```json
{
  "observability": { "enabled": false, "redact_query_string": true },
  "logpush": false
}
```

`STAGING_SERVICE_ID` is a temporary acceptance binding, not normal runtime
configuration. A separately authorized staging service identity may exercise the
real Access JWT, PKCE, pairing and MCP paths. Remove its binding, temporary Access
policy and service token after final proof. A service identity does not establish
owner Google sign-in or ChatGPT Web consent, and production does not accept it.

The November 9 upload requested the privacy values above; subsequent settings
reads returned `logpush:false` and normalized `observability:null`. That null does
not independently attest the requested query-string redaction flag. Preserve the
distinction between submitted configuration and observed provider representation.

## Build and preserve the exact artifact

Start from the reviewed source commit with pinned dependencies. Complete the normal
build/check and relevant acceptance gates; do not use the artifact builder to label
unreviewed working-tree bytes as a verified commit.

```powershell
npm ci --ignore-scripts --no-audit --no-fund
npm run build
npm run check
$MTermSource = (git rev-parse HEAD).Trim()
node scripts/build-gateway.mjs $MTermSource
```

The builder requires the supplied SHA to equal the checkout's raw HEAD commit. It
compares the five gateway modules, protocol TypeScript, compiler configuration and
pins, both locks, and builder/helper source with committed blobs, normalizing CRLF
to LF. Relevant edits are refused; unrelated tracked/untracked work is permitted.
Git replacement objects and inherited repository/config overrides cannot substitute
another source identity.

Using the installed exact-pinned TypeScript CLI, the builder compiles the standalone
protocol into an owned temporary directory and compares it with the existing tested
`dist/remote/protocol.js`. Missing or stale output fails before artifact creation;
the builder does not repair shared `dist`. Unsupported compiler routing, including
`extends`, references or custom output directories, requires explicit support.
Temporary compiler inputs/output are removed before the builder proceeds. Normal
build/check remains a separate prerequisite; source consistency is not test or
review acceptance. See [the source-binding evidence](../validation/2026-11-09-gateway-source.md).

The builder writes immutable `manifest.json` and `modules.json` beneath
`artifacts/gateway/<source-commit>-<artifact-hash-prefix>/`. Preserve both files and
record the full artifact SHA-256, source commit, Worker version and deployment ID.
The manifest's additive `sourceVerification` records normalized material-input
hashes and the compiler version, with test execution and deployment verification
explicitly false. The six-module digest and existing exclusive-write/byte-equal
repeat behavior remain unchanged. This uses a trusted Git/compiler installation;
it is not a hermetic or hostile-checkout build sandbox.
Verify every module's byte count and SHA-256 against the manifest before upload.
The six module names must remain exact so relative imports resolve:

1. `gateway/app.mjs`
2. `gateway/dashboard.mjs`
3. `gateway/registry.mjs`
4. `gateway/security.mjs`
5. `gateway/worker.mjs`
6. `dist/remote/protocol.js`

Upload through the authorized Cloudflare connector or REST control plane:
`PUT /accounts/{account_id}/workers/scripts/mterm-gateway-staging`.
Use `multipart/form-data`: one `metadata` part containing the reviewed upload
metadata as `application/json`, and one part for each exact module name and filename
with `Content-Type: application/javascript+module`. Set `metadata.main_module` to
`gateway/worker.mjs`. Upload the saved module content, without rebuilding it between
acceptance and deployment. Keep credentials out of the artifact and command output.

For a genuinely new Worker/class only, include this in upload metadata:

```json
{ "migrations": { "new_tag": "v1", "new_sqlite_classes": ["MTermRegistry"] } }
```

For subsequent uploads to this existing staging Worker, omit migrations and retain
the established `REGISTRY` binding/class. Confirm the namespace remains
`b66edc2d536e474093e1a18d0e88a24d`. Never replay initial provisioning or destroy
registry storage to simplify an update or rollback.

The November 9 code-only update explicitly used
`code_update_strategy:{mode:"deferred",max_delay:300}`. Preserve active-owner state
and inspect the intended adoption strategy before another deployment; do not add
an immediate reset to make a public health label converge. A write whose response
is lost is unconfirmed: reconcile the exact script, versions, deployments, ETags,
module bytes and audit events before considering a new write. Do not blindly retry.

Inspect `GET /accounts/{account_id}/workers/domains` before creating a missing
custom domain through `PUT /accounts/{account_id}/workers/domains`. A creation body
contains `hostname`, `zone_id`, `service:"mterm-gateway-staging"`, and the API's
default slot `environment:"production"`. That slot name does not change the product's
`ENVIRONMENT=staging`. Reuse an already correctly owned domain; stop for a conflict.

## Source identity for a new staging smoke

Use the exact qualified checkout and its tested Node runtime after the reviewed
build. The runner now requires the nonsecret
`MTERM_STAGING_EXPECTED_SOURCE_COMMIT` environment value before reading credentials
or making requests. Set it deliberately from the source commit in the verified
artifact manifest for this deployment; it must be exactly 40 lowercase hexadecimal
characters. Do not substitute a short SHA, the current branch name, an inferred
health response or an unreviewed local HEAD.

For the connected process transport, use the fixed encrypted handoff. A nonsecret
preflight demonstrated that plaintext process input is retained in local tool
history. Never paste a real credential line into process-interaction arguments,
the chat, commands, environment variables or a plaintext file. The unchanged smoke
runner still reads its credential line from stdin, but the helper supplies that
line through an anonymous child pipe inside the authorized Windows process.

After checking out and building the exact reviewed helper revision, inspect its
public identities with `node scripts/staging-handoff.mjs --describe-source`.
Independently verify the commit, helper/harness hashes, locked dependencies,
compiled output and actual raw bundle before selecting the values below. The local
helper revision and deployed gateway revision are distinct identities; neither is
inferred from the challenge or a public health response.

In an isolated PowerShell session, first qualify explicit nonsecret probe mode:

```powershell
$MTermSmokeManifest = Get-Content -Raw '<verified-artifact-directory>\manifest.json' | ConvertFrom-Json
$env:MTERM_STAGING_EXPECTED_SOURCE_COMMIT = $MTermSmokeManifest.sourceCommit
$env:MTERM_STAGING_LOCAL_SOURCE_COMMIT = '<reviewed-full-local-commit>'
$env:MTERM_STAGING_HANDOFF_BUNDLE_SHA256 = '<independently-verified-raw-bundle-sha256>'
$env:MTERM_STAGING_HANDOFF_MODE = 'probe'
node .\scripts\staging-handoff.mjs
```

Use the already qualified portable Node executable explicitly when the host's
global Node differs. The placeholders are deliberately selected nonsecret values,
not executable defaults. The receiver publishes a fresh public challenge with a
120-second delivery deadline. Execute the exact reviewed
`sealStagingHandoff(challenge, cloudflare, selectedAccountId, reviewed)` function
from `scripts/staging-handoff-seal.mjs` in the connected Cloudflare executor, with
independently selected mode, local commit/bundle/helper/harness/sealer hashes and
deployed commit. Supply only its canonical encrypted envelope as the receiver's
one input line. The function uses a fixed public probe pair and performs no API
operation in probe mode. A directly invoked `--probe-child` receipt is not proof
of the parent encryption/transport/lifecycle path.

Before real credentials, verify actual Cloudflare-to-Windows interoperability,
observed transport-history/result privacy, the anonymous child-pipe transfer,
natural owned process closure and independent absence of the owned launcher and
children. Then qualify recovery of an interrupted dedicated principal under
[#232](https://github.com/MulattoTech/MTerm-CLI/issues/232). Source tests, hosted
checks and a probe success do not replace that recovery prerequisite.

Only after those gates may a separately selected `smoke` invocation create its
uniquely named 30-minute service token. Keep the original service-only and
initially-empty identity prerequisites; never use owner cookies or an owner grant.
The helper does not add an Access policy, set `STAGING_SERVICE_ID`, revoke MTerm
authority or recover a reused nonempty principal. Prepare and verify those exact
owned lifecycle operations separately; the short challenge is not a control-plane
propagation budget. Removing a Cloudflare token/policy/binding does not revoke
already created MTerm device or OAuth authority. Preserve recovery access until
that principal's remote authority and owned local processes are verified cleaned.

The [handoff evidence](../validation/2026-11-09-staging-handoff.md) records source
binding, one-shot encryption, strict output filtering and bounded child handling.
Encryption does not attest the OS/Node executable, authenticate a sender by itself,
make filesystem checks atomic, guarantee memory erasure or hide upstream internals.
Hard termination or unconfirmed child closure is failed/cleanup-unconfirmed and
requires deliberate reconciliation; it is never a successful smoke.

Before OAuth registration, pairing or agent startup, public edge health and the
authenticated registry dashboard must both return the expected full source label.
After successful owned remote/local cleanup and agent/SDK shutdown, the runner
checks both again. Missing, malformed, mismatched or unavailable observations fail
closed without retrying or waiting for deployment convergence. Canonical observed
SHAs are recorded by phase; arbitrary values are replaced with null. New successful
runs include `final_staging_build_identity` in addition to the historical eleven
checks. Historical reports remain evidence of their original executable and scope.

[Cloudflare code updates](https://developers.cloudflare.com/durable-objects/deployments/durable-objects-code-updates/)
can leave the edge Worker and an active Durable Object on different versions;
the documented default deferred strategy permits up to 300 seconds before forced
adoption. A public health build alone does not prove registry adoption. Inspect
and qualify the deployment separately before starting a fresh smoke attempt; this
runner never deploys, changes a strategy or silently waits for a different result.

Build labels are response metadata. Matching initial/final observations do not
independently hash deployed bytes, prove an atomic observation, or establish that
versions stayed constant during the run or afterward. Preserve the separate
control-plane version, artifact/module-hash, configuration, owner-lifecycle and
rollback checks. See the [source-level regression evidence](../validation/2026-11-09-staging-build-identity.md).

## Historical complete staging smoke — 2026-11-02

| Evidence identity | Value |
| --- | --- |
| Tested source | `b90432a1bc138d59305692a9f74f110a475d0881` |
| Immutable Windows-built artifact SHA-256 | `97a0457b78e113c058ae8da3d3a6a54fcd93c2b35d1dd1781316c41001ac10a6` |
| Final smoke Worker version | `f643872f-5fbb-44be-9e3d-a6f8f3f32aab` |
| Owner-only version after that smoke / retained recovery target | `af4fd06e-c4a3-4545-ad22-31d0ae956215` |
| Deployment at that checkpoint | `5a0ff21c-6341-4e73-b4af-169e98b76db2` |
| Final live SDK-to-Windows checks | 11/11 PASS; finished 2026-11-02 01:24:29 UTC / 2026-11-01 19:24:29 Central |
| MCP mode at that checkpoint | Enabled; read-only |
| Temporary test identity | Service token and dedicated Access policy deleted; `STAGING_SERVICE_ID` removed |
| Dashboard authorization | Original owner allow policy only |
| Workers.dev / preview URLs | Disabled / disabled |
| Registry | Existing SQLite namespace `b66edc2d536e474093e1a18d0e88a24d` preserved |

The [final live smoke report](../validation/2026-11-02-remote-staging-smoke-final.json)
records all fixture cleanup checks as true. At that historical 01:24 UTC checkpoint,
no test agent or actual owner-paired agent remained running. The later
[owner connection record](../validation/2026-11-02-owner-connection.md) documents
an authorized owner pairing and foreground online/stop/reconnect sequence without
redeployment or autostart. The owner-only version uses the same tested artifact with the
acceptance-only identity binding removed. Template defaults remain deliberately
disabled/empty; they are not a snapshot of the live owner's bindings.

Full Windows gates, the native Codex probe and four-platform CI passed for the tested
code. PR #69's matrix/fast runs are
[41372073094](https://github.com/MulattoTech/MTerm-CLI/actions/runs/41372073094) and
[41372073095](https://github.com/MulattoTech/MTerm-CLI/actions/runs/41372073095);
the push run is [41372068412](https://github.com/MulattoTech/MTerm-CLI/actions/runs/41372068412).
The [final sprint record](../validation/2026-11-02-remote-sprint.md) is authoritative
for that sprint's final Git merge/checkpoint status. Existing authenticated owner
dashboard access and pairing were observed at that checkpoint. Fresh Google/Access login, client
consent and ChatGPT tool use remain unverified. This is not production promotion.

## First recorded complete staging smoke

| Evidence identity | Value |
| --- | --- |
| Worker version | `2083411f-68a7-4ec8-9ecc-5c2473ad09b9` |
| Source commit | `305c89c88a10f4c9243096e3d1125bde76f17563` |
| Artifact SHA-256 | `f76e37d77c218bc9c2bc9203346ec98d590e5a69b7fef285bcd16792ae32c0f1` |

This is historical evidence from the first complete staging smoke. Prefer the
post-cleanup owner-only recovery version recorded above; the older version may
restore obsolete bindings. Manual PKCE/compatible-SDK proof is distinct from a
human completing Google/Access sign-in and connecting ChatGPT Web.

## Immediate pause: disable new MCP calls while preserving bindings

Use an owner-provided, appropriately scoped `CF_API_TOKEN` environment variable in
your PowerShell session. Do not paste the token into source, a URL, an issue, or the
commands themselves. The following reads existing settings, changes only the MCP
switch, and submits the complete current binding list. It fails on unfamiliar
binding types so a future secret binding cannot be silently lost or guessed.

```powershell
if (-not $env:CF_API_TOKEN) { throw 'Provide an authorized CF_API_TOKEN in the environment.' }
$MTermApi = 'https://api.cloudflare.com/client/v4/accounts/9e18ebcb3c1a920c9ef58a3d61b8d6b6/workers/scripts/mterm-gateway-staging'
$MTermHeaders = @{ Authorization = 'Bearer ' + $env:CF_API_TOKEN }
$MTermBefore = Invoke-RestMethod -Method Get -Uri "$MTermApi/settings" -Headers $MTermHeaders
if (-not $MTermBefore.success) { throw 'Could not read current Worker settings.' }
$MTermBindings = @($MTermBefore.result.bindings)
if (@($MTermBindings | Where-Object { $_.type -notin @('plain_text','durable_object_namespace') }).Count) {
    throw 'Unexpected binding type: explicitly reconcile preservation before applying this example.'
}
$MTermGate = @($MTermBindings | Where-Object { $_.name -eq 'MCP_ENABLED' })
$MTermRegistry = @($MTermBindings | Where-Object { $_.name -eq 'REGISTRY' })
if ($MTermGate.Count -ne 1 -or $MTermGate[0].type -ne 'plain_text') { throw 'Unexpected MCP switch binding.' }
if ($MTermRegistry.Count -ne 1 -or $MTermRegistry[0].namespace_id -ne 'b66edc2d536e474093e1a18d0e88a24d') {
    throw 'Registry identity differs; inspect it before changing settings.'
}
$MTermGate[0].text = 'false'
$MTermSettingsJson = @{ bindings = $MTermBindings } | ConvertTo-Json -Depth 32 -Compress
$MTermBoundary = 'mterm-settings-' + [Guid]::NewGuid().ToString('N')
$MTermMultipart = @(
    "--$MTermBoundary"
    'Content-Disposition: form-data; name="settings"'
    'Content-Type: application/json'
    ''
    $MTermSettingsJson
    "--$MTermBoundary--"
    ''
) -join "`r`n"
$MTermPause = Invoke-RestMethod -Method Patch -Uri "$MTermApi/settings" -Headers $MTermHeaders `
    -ContentType "multipart/form-data; boundary=$MTermBoundary" `
    -Body ([Text.Encoding]::UTF8.GetBytes($MTermMultipart))
if (-not $MTermPause.success) { throw 'MCP pause was not accepted.' }
$MTermAfter = Invoke-RestMethod -Method Get -Uri "$MTermApi/settings" -Headers $MTermHeaders
$MTermAfterGate = @($MTermAfter.result.bindings | Where-Object { $_.name -eq 'MCP_ENABLED' })
if (-not $MTermAfter.success -or $MTermAfterGate.Count -ne 1 -or $MTermAfterGate[0].text -ne 'false') {
    throw 'MCP disabled state has not been verified.'
}
Invoke-RestMethod 'https://mcp-staging.m-techlabs.com/health' | Select-Object service, enabled, build
```

The settings endpoint's multipart part is named `settings`; the module upload's
part is named `metadata`. Do not replace the whole binding list with only
`MCP_ENABLED`. Check that all original bindings and the registry identity remain.
Do not dump the settings object or headers into shared logs: they may contain the
owner allowlist or future sensitive configuration.

Disabling intake does not revoke existing credentials or undo an already admitted
read. Stop the owned agent and use device/client revocation when that is the intended
boundary. Authentication remains enforced while MCP is disabled: an anonymous call
must still fail, and a valid authenticated new MCP call must report `mcp_disabled`.

## Restore a recorded Worker version

First preserve the current version/deployment IDs and settings, stop agents, and
revoke affected grants if necessary. Inspect the target version and its bindings.
An exact version rollback may restore old `MCP_ENABLED` or temporary service binding
values; the earlier pause is not a guarantee that an old version stays disabled.
After rollback, verify the active version through the deployments API and public
health endpoint. During the recorded drill, GET settings still described the latest
uploaded paused version, while the restored active version correctly served enabled
MCP. A settings PATCH then returned Cloudflare code 10214 because that latest upload
was not deployed. To change bindings after such a rollback, upload the retained
immutable artifact with the intended complete binding set as described above; do
not repeatedly PATCH, delete storage, or relax authentication. The drill reuploaded
the same verified modules with owner-only read-only settings and checked both the
settings inventory and live endpoint. Remove any temporary identity before reuse.

The preferred recorded target below is the post-cleanup owner-only version, using
the November 2 verified artifact. It was rechecked and its exact module bytes
retained before the November 9 deployment. Inspect its availability and current compatibility
before applying it; preserve the existing Durable Object and Access resources.

In the same PowerShell session as the pause commands:

```powershell
$MTermRollbackBody = @{
    strategy = 'percentage'
    versions = @(@{
        version_id = 'af4fd06e-c4a3-4545-ad22-31d0ae956215'
        percentage = 100
    })
} | ConvertTo-Json -Depth 8 -Compress
$MTermRollback = Invoke-RestMethod -Method Post -Uri "$MTermApi/deployments" `
    -Headers $MTermHeaders -ContentType 'application/json' -Body $MTermRollbackBody
if (-not $MTermRollback.success) { throw 'Worker rollback was not accepted.' }
$MTermRollback.result | Select-Object id, strategy, versions
```

The REST action is
`POST /accounts/{account_id}/workers/scripts/{script_name}/deployments`, with
`strategy:"percentage"` and `versions:[{version_id,percentage:100}]`.
If Cloudflare refuses a version because it is unavailable or incompatible with
Durable Object migrations, leave intake disabled. Restore the retained verified
artifact using compatible current bindings instead of forcing a storage reset.

## Recorded rollback drill

The [actual staging drill](../validation/2026-11-02-rollback-drill.json) paused new
MCP intake, observed health enabled=false, restored the recorded owner-only version
through POST deployments, and observed health enabled=true with anonymous MCP 401.
After the observed code-10214 settings constraint, the identical saved artifact was
reuploaded with preserved owner-only bindings. The final version and deployment for
that drill are in the November 2 table; the registry namespace was unchanged. No owner device was active.
This proves that controlled drill, not arbitrary future migration compatibility.

## Qualification after deployment or rollback

Confirm TLS and both custom-domain targets, Workers.dev/preview disablement,
privacy settings, exact Access audience/policy, and the unchanged registry namespace.
Check public discovery and `/health`, anonymous MCP rejection, signed identity
validation, PKCE exchange, pairing, inventory, and an actual read from the selected
Windows agent. Exercise wrong-user/device denial, protected paths, cancellation,
timeout, reconnect and revocation. Verify that write/process tools remain absent.

Record the source SHA, artifact hash, Worker version, deployment ID, tested client,
and completed checks. Keep owner Google/Access sign-in and actual ChatGPT Web
connector consent separately unaccepted until the owner performs them. Remove the
temporary staging test identity and leave a verified rollback reference. Production
promotion requires its own explicit reviewed configuration and acceptance.
