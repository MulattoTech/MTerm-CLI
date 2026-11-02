# MTerm staging deployment and recovery

This deployment serves the read-only MTerm MCP gateway and private dashboard. It
does not promote MTerm to production, expose an inbound workstation port, enable
remote writes/process execution, or install an unattended agent service.

Use [the public deployment template](../../gateway/deployment.example.json) for
reviewable metadata and [the owner guide](../REMOTE_MCP.md) for pairing and use.
The template is not a Wrangler file or an executable deployment script. It defaults
to `MCP_ENABLED=false` and an empty `ALLOWED_EMAILS` value, which denies human
identities until the exact permitted owner identities are configured outside Git.

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

The builder writes immutable `manifest.json` and `modules.json` beneath
`artifacts/gateway/<source-commit>-<artifact-hash-prefix>/`. Preserve both files and
record the full artifact SHA-256, source commit, Worker version and deployment ID.
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
with `Content-Type: application/javascript`. Set `metadata.main_module` to
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

Inspect `GET /accounts/{account_id}/workers/domains` before creating a missing
custom domain through `PUT /accounts/{account_id}/workers/domains`. A creation body
contains `hostname`, `zone_id`, `service:"mterm-gateway-staging"`, and the API's
default slot `environment:"production"`. That slot name does not change the product's
`ENVIRONMENT=staging`. Reuse an already correctly owned domain; stop for a conflict.

## Final verified staging state

| Evidence identity | Value |
| --- | --- |
| Tested source | `b90432a1bc138d59305692a9f74f110a475d0881` |
| Immutable Windows-built artifact SHA-256 | `97a0457b78e113c058ae8da3d3a6a54fcd93c2b35d1dd1781316c41001ac10a6` |
| Final smoke Worker version | `f643872f-5fbb-44be-9e3d-a6f8f3f32aab` |
| Current owner-only version / preferred safe recovery target | `af4fd06e-c4a3-4545-ad22-31d0ae956215` |
| Current deployment | `5a0ff21c-6341-4e73-b4af-169e98b76db2` |
| Final live SDK-to-Windows checks | 11/11 PASS; finished 2026-11-02 01:24:29 UTC / 2026-11-01 19:24:29 Central |
| Current MCP mode | Enabled; read-only |
| Temporary test identity | Service token and dedicated Access policy deleted; `STAGING_SERVICE_ID` removed |
| Dashboard authorization | Original owner allow policy only |
| Workers.dev / preview URLs | Disabled / disabled |
| Registry | Existing SQLite namespace `b66edc2d536e474093e1a18d0e88a24d` preserved |

The [final live smoke report](../validation/2026-11-02-remote-staging-smoke-final.json)
records all fixture cleanup checks as true. No test agent or actual owner-paired agent
remains running. The owner-only version uses the same tested artifact with the
acceptance-only identity binding removed. Template defaults remain deliberately
disabled/empty; they are not a snapshot of the live owner's bindings.

Full Windows gates, the native Codex probe and four-platform CI passed for the tested
code. PR #69's matrix/fast runs are
[41372073094](https://github.com/MulattoTech/MTerm-CLI/actions/runs/41372073094) and
[41372073095](https://github.com/MulattoTech/MTerm-CLI/actions/runs/41372073095);
the push run is [41372068412](https://github.com/MulattoTech/MTerm-CLI/actions/runs/41372068412).
The [final sprint record](../validation/2026-11-02-remote-sprint.md) is authoritative
for final Git merge/checkpoint status. Human Google/Access sign-in, browser consent
and ChatGPT connector use remain unverified. This is not production promotion.

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
the final verified artifact. Inspect its availability and current compatibility
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
reuploaded with preserved owner-only bindings. The final version and deployment are
listed above; the registry namespace was unchanged. No owner device was active.
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
