# Qualified staging code deployment — 2026-11-09

Session `MTERM-WEB-20261109T131339Z-resume-a9287b3c`, OpenAI / GPT-6 Astra Pro
(self-reported). Root performed the supported Cloudflare operations under the
[standing owner authorization](../OWNER_AUTHORIZATION.md); an independent peer
reviewed the artifact, preservation/rollback procedure and final control-plane
evidence. [Durable deployment receipt](https://github.com/MulattoTech/MTerm-CLI/issues/61#issuecomment-6744936272).

## Result and scope

The existing `mterm-gateway-staging` Worker now serves the qualified main source
`9e2d6633294e22ff63053564bad1ebeda2dd4059`. This is a code-only staging update, with
the complete nine bindings preserved except for the deliberate `BUILD_SHA` change.
No service token, Access policy, temporary `STAGING_SERVICE_ID`, device enrollment,
OAuth grant, owner lifecycle, production bridge or global toolchain was changed.
Broad WEB-008/012 acceptance remains open.

| Evidence identity | Observed value |
| --- | --- |
| Source commit | `9e2d6633294e22ff63053564bad1ebeda2dd4059` |
| Source tree | `6d72d0b0da08a1300b3a6210b7e342cf48160559` |
| Six-module artifact SHA-256 | `b6108e45df2c8142924a746c85af34790a3f2894221658798406b6a5cdeba722` |
| Manifest SHA-256 | `7cc054299138952f130347f2d33339d17d21815bfaac0e3c05107045601c5897` |
| Modules JSON SHA-256 | `1b22996a60ed9332041181d9bac586c7c10488055dd83ee329fbfae05ea596fd` |
| Active/latest Worker version | `88e1a5ff-ac1e-4b9a-a4c2-31ba32d6221e` (version 9) |
| Deployment, 100% | `e9b702fb-c6c0-4b15-b101-a9c8307a654f` |
| Upload and active-version ETag | `d20a7684447f43ccd0354621eefb1bf7a1541cb95cf45e87d9923161b6ba5432` |
| Existing SQLite namespace | `b66edc2d536e474093e1a18d0e88a24d`, `MTermRegistry`, migration `v1` |
| Completed independent qualification | 2026-11-09 16:07:30 UTC |

PR230 had all six exact candidate gates and all six distinct actual-main gates
qualified before deployment. Actual-main Windows passed 902/902; Linux and both
macOS suites passed 890 with the same 12 existing platform skips. The native lane
passed 12 source and 12 installed cases with real owned containment/cleanup. The
installed-package groups, receipt retention and zero-model-call Codex parser/MCP
checks also passed. [Main qualification and narrow issue229 closure](https://github.com/MulattoTech/MTerm-CLI/issues/229#issuecomment-6743831173).
These are source/platform checks, not a live staging smoke.

The committed-input builder bound 12 raw material inputs, pinned TypeScript 7.0.2
and the freshly compiled protocol against the tested output. Independent artifact
review was clear. The six exact modules were uploaded without rebuilding them;
the downloaded deployed content and service-environment content subsequently
matched each module and the aggregate digest above.

## Upload outcomes and preservation

Both guarded no-write preflights passed before the first PUT. That first attempt
at 15:52:32 UTC did not yield a confirmed upload response and was treated as unconfirmed. Root and
peer reconciled the exact old version, deployment, settings, downloaded modules
and public boundary before a separately chosen second attempt. No automatic retry
or rollback occurred. A catch-only diagnostic refinement exposed only allowlisted
status/error classifications; it did not change the upload or preservation logic.

The second PUT ran at 16:02:09–16:02:13 UTC and positively confirmed upload, active
version ETag and module readback. Delayed provider audit indexing subsequently
identified the first PUT as HTTP504 failure, event
`01a1c102-da06-78c8-8465-1492ecbbbbfc`, and the second as HTTP200 success, event
`01a1c10b-a864-7de2-bacf-a54f3e38e8e7`. Only one new version was observed in the
nine-version inventory. No claim is made about unobserved intermediate processing
of the first attempt. It was a provider gateway timeout, not an approval rejection.

The upload used one JSON metadata part and six
`application/javascript+module` parts, preserving exact names and filenames.
It omitted migrations and selected `code_update_strategy:{mode:"deferred",max_delay:300}`.
It preserved the owner allowlist, full Access application and original owner-only
policy, both domain targets, compatibility date/flag, standard usage model,
namespace and all other bindings. Workers.dev and preview URLs remained disabled;
logpush remained false. The requested observability values were
`{enabled:false,redact_query_string:true}`; readback normalized them to null, which
does not independently establish the redaction flag.

The API's domain slot is named `production`; the product binding remains
`ENVIRONMENT=staging`. An independent read of that exact service environment found
the same settings and module aggregate as the script endpoint. No route, cache or
domain intervention was performed.

## Public propagation observations

The authorized Windows host made bounded requests without owner cookies or
credentials. At 16:03:08 UTC ordinary health still reported the old `b90432a…`
build. At 16:04:16 a unique-query health request reported the intended `9e2d663…`.
At **16:05:23 UTC the ordinary health URL** also returned HTTP200 and the intended
full source, with `mterm-remote`, read-only mode, enabled true and staging
environment. Its Date was 16:05:22 GMT, Cache-Control was no-store, Age and
CF-Cache-Status were absent, and the observed Ray ended in DFW.

At that final ordinary-URL observation, OAuth discovery returned HTTP200 with the
exact expected resource and only `mterm:read`; anonymous MCP initialize returned
HTTP401. This establishes those public observations after deployment. It does not
prove every edge location, continuous version stability, authenticated registry
adoption, successful Google sign-in, a Windows device read or ChatGPT consent.

Cloudflare documents that [deferred Durable Object adoption](https://developers.cloudflare.com/durable-objects/concepts/durable-object-lifecycle/)
does not delay deployment of the Worker itself. The public observation sequence
does not establish the cause of the temporary mismatch or prove a particular
registry object's adoption. A fresh smoke must separately satisfy the runner's
initial and final public-edge and authenticated-registry build checks.

## Retained recovery and owner state

The preferred pre-update owner-only rollback version remains
`af4fd06e-c4a3-4545-ad22-31d0ae956215`, source
`b90432a1bc138d59305692a9f74f110a475d0881`, artifact
`97a0457b78e113c058ae8da3d3a6a54fcd93c2b35d1dd1781316c41001ac10a6`.
Before upload, its actual six modules were downloaded into an owned local
builder-compatible JSON, SHA-256
`c6ad99a6a2b3d8255e774303440e6d2fb4815043009a897a3d23638ff355a486`.
Root independently checked the gateway modules against that committed source and
recorded the protocol bytes. No rollback was needed or performed.

Use an ordinary 100% deployment of that retained version if recovery is necessary.
If the known latest/active-version divergence makes a settings PATCH fail with
10214, reupload the retained exact modules with the complete preserved owner-only
binding set and old BUILD_SHA. Reconcile first; do not repeatedly PATCH, destroy
storage, replay migrations or restore a former acceptance identity.

The dirty primary Windows checkout and its unpublished files remained unchanged.
An isolated normal clone at the qualified source completed locked installation and
normal build with the existing portable Node 24.21.0; all 11 setup commands exited
0, the lockfile was unchanged, the launcher exited naturally and no owned setup
process remained. This did not run the full Windows suite or replace global Node.
The protected owner staging files and retained lock were only inspected for
metadata; the recorded foreground PID was absent. No credential was decrypted,
lock removed, owner pairing repaired or global client drain asserted.

## Evidence retained and next prerequisite

Ignored reproducible operational evidence remains under
`artifacts/staging-deployment-readiness/`. The complete sanitized independent
receipt `deploy-independent-final-160730.json` is SHA-256
`941f421c93f5ab47f57a3692e1d7de72de7fad51cc6b2f750c55c9e0b59181d1`.
The guarded successful execution function is SHA-256
`15a99a9e67dfe2b2dd5e3ebb165ab7c55e6278fa26f0933075a12983cd0a9cde`.
Its old-version guard means it is not a reusable next-upload command.

Issue231 qualifies ciphertext-only credential transport through the observed
logged process channel. Issue232 separately qualifies recovery of an interrupted
dedicated principal. No real token or new smoke has been attempted at this
checkpoint. Removing a Cloudflare token/policy/binding alone does not revoke the
principal's MTerm devices or OAuth grants. The browser connector lacks the
originating browser context in this chat; owner login/consent acceptance remains
separate from supported Cloudflare API and isolated service-principal work.
