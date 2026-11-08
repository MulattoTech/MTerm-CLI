# ChatGPT MTerm-CLI connector: ownership, connection and release lanes

This is an operations/release record for the repository owner, not a claim that this
repository's local/staging MCP code implements the separately hosted owner bridge.
No credentials, OAuth grants, private App IDs or personal session data belong in Git.

## One production entry; development stays in Git

- **Production ChatGPT plugin:** the existing private **MTerm-CLI** package, version
  `0.2.2` as observed on 2026-11-08. Preserve its existing plugin identity and
  its recovery skill. Its owner-managed server is `https://mcp.m-techlabs.com/mcp`.
- **MCP App dependency:** the separately registered ChatGPT custom MCP App provides
  the OAuth registration and actual tools. The private plugin package references
  that App. A plugin manifest's `mcp.json` URL alone did not make its tools
  callable in the observed ChatGPT account.
- **GitHub code authority:** `MulattoTech/MTerm-CLI` owns the standalone CLI and
  its own documented six-tool read-only staging gateway at
  `https://mcp-staging.m-techlabs.com/mcp`. Its staging acceptance must never be
  conflated with the separately hosted 53-tool owner bridge.
- **DEV lane:** ordinary scoped feature branches/PRs in this repository, plus
  isolated tests and staging deployment when an authorized staging target exists.
  Do **not** install a second production-capable `MTerm-CLI-DEV` ChatGPT plugin
  against the same owner endpoint or grant merely for development. A future
  truly isolated DEV connector requires its own staging backend, App, owner
  policy, clearly labeled data scope and independently verified teardown.

## Dated observations (2026-11-08; historical, not standing health)

1. ChatGPT exposed 53 tools through the separately registered owner MCP App.
   Live read-only `get_file_info` on an owner-selected `package.json` file,
   `mterm_system_inventory`, and `mterm_math_evaluate` all succeeded. The
   metadata tool returned file attributes; the inventory reported a Windows
   host; the math result was exactly 21 for `sqrt(144)+3^2`.
2. The existing private plugin was updated from `0.2.1` to `0.2.2` without
   changing its original plugin ID. Its manifests acquired an owner App
   dependency. ChatGPT then displayed **Apps 1 — Connected** inside the original
   MTerm-CLI package, while the separate wrapper was still installed.
3. Uninstalling only the duplicate App-backed wrapper removed its ChatGPT
   connected-account grant as well. The original plugin remained installed
   and retained its App dependency, but the page changed to **Connect**.
   Calls through the previous conversation's App tool namespace failed with
   `Mcp error -32001: Unknown tool`. The cleanup therefore **did not** prove
   independent authorization or a working single-plugin connection.
4. Reconnecting the original plugin initiated Cloudflare Dashboard OAuth login.
   No completed callback, renewed grant or fresh original-plugin tool call was
   observed during this record. Do not mark the connector PASS until those
   actions succeed in a new chat with the original plugin selected.

## Supported one-plugin recovery

1. Keep the original MTerm-CLI plugin installed. In its ChatGPT plugin page,
   choose **Connect** for the referenced MCP App and complete the normal
   Cloudflare authorization in the intended user browser. Do not reuse, paste,
   export or manufacture tokens or session cookies.
2. Verify that the original plugin page says **Connected**, not merely
   **Installed** or **Uses App**. In a fresh chat with the original MTerm-CLI
   selected, call `get_file_info` for an approved, nonsensitive local file
   without reading contents.
3. Record the exact tool namespace, returned metadata, connection time and
   errors. A 53-tool count elsewhere or healthy HTTP endpoint is insufficient.
4. If uninstalling a wrapper revokes the grant again, stop destructive cleanup.
   Preserve a working connector, report the dependency, and investigate
   ChatGPT's App ownership/install model through supported controls. Do not
   delete the App, revoke the Cloudflare policy or weaken OAuth to hide this.

## Improvement and promotion contract

1. Open one scoped issue/branch/PR per change. Use `AGENTS.md`, the immutable
   300-ID roadmap, and the existing review/evidence workflow. No Codex/paid
   model lane is started by this document.
2. Use deterministic fixture tests, security/license checks and independent
   review. Test owner-bridge changes against an explicitly separated staging
   backend; no shared OAuth account or production filesystem writes in tests.
3. For the separately hosted owner bridge, first identify its actual source
   repository and deployment artifacts. Do not claim a commit to this CLI repo
   is a deployment of the owner bridge; validate version and SHA linkage.
4. Before a private plugin release, compare the checked source package,
   `mcp.json`, OAuth App dependency, version and recovery skill. Keep private
   account-specific `.app.json` out of this public repository. Use an owner
   controlled build/release handoff and record the approved App binding.
5. Promote only a reviewed release after a real ChatGPT OAuth + tool-call
   smoke, then reconcile the private ChatGPT plugin version with the
   `m-techlabs.com/admin/mcp` downloadable archive/checksum. Both surfaces
   must be independently checked; merely updating GitHub does not update them.
6. Roll back to a previous reviewed package or server artifact only after
   preserving current release IDs and checking the actual affected client.
   Never delete or invalidate existing account grants as a first recovery step.

## Still open

- Establish the actual source/deployment ownership of the 53-tool bridge,
  distinct from this CLI repository's staging gateway.
- Reconnect and live-test the **original** MTerm-CLI plugin after the wrapper
  uninstall; the last observed state was **Connect**, not **Connected**.
  Track the lifecycle regression in [issue #209](https://github.com/MulattoTech/MTerm-CLI/issues/209).
- Add a safe, repeatable App grant lifecycle/cleanup test before removing any
  remaining backing App or legacy installation.
- Sync the private v0.2.2 plugin package and verified release archive on the
  owner website after auth recovery and independent release qualification.

These operational observations do not change CLI, WEB, DCP or AUG acceptance
stages. A normal GitHub CI result is not proof of account OAuth or a live
Windows workstation connection.
