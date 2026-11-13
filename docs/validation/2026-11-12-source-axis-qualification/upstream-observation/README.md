# Bounded final upstream observation

Official GitHub metadata was read beginning **2026-11-12T23:52:10.083Z**.
The changed-commit diff was observed at **23:52:40.702Z**. This updates only the
release/main identities below relative to the retained16:53:06.736392Z audit.

## Comparison

| Surface | Final bounded observation | Change from earlier audit |
| --- | --- | --- |
|DesktopCommanderMCP latest GitHub stable release|`v0.3.3`, release442946839, publishedNovember12 at12:54:41Z; neither draft nor prerelease|No change|
|DesktopCommanderMCP main|`bce370e9395f5bc74eda34913e5ae1dee48df8f8`, commit`Release v0.3.3`|No change|
|Public remote-desktop-commander main|`f0ea4348c63912017ec460830c4301e4eec4cd8b`, commit`Release 1.1.28`, November12 at18:40:22Z|Advanced by one direct-child commit from`13f3aad116bcca609cea5714ba1bcba513fc433b`|
|Public remote latest GitHub release|Tag`1.0.80`, release420520300, publishedOctober22 at09:19:19Z|No change|
|npm latest/alpha/beta dist-tags and selected version gitHead/time|Final refresh unavailable through the search fetcher|No fresh unchanged/changed claim; preserve the earlier dated records|

Official primary URLs:

- [DesktopCommanderMCP latest release API](https://api.github.com/repos/wonderwhy-er/DesktopCommanderMCP/releases/latest)
- [DesktopCommanderMCP main API](https://api.github.com/repos/wonderwhy-er/DesktopCommanderMCP/branches/main)
- [Public remote latest release API](https://api.github.com/repos/desktop-commander/remote-desktop-commander/releases/latest)
- [Public remote main API](https://api.github.com/repos/desktop-commander/remote-desktop-commander/branches/main)
- [Exact changed public remote commit](https://github.com/desktop-commander/remote-desktop-commander/commit/f0ea4348c63912017ec460830c4301e4eec4cd8b)

## The changed public remote commit is release metadata only

The exact commit has one parent, the prior observed
`13f3aad116bcca609cea5714ba1bcba513fc433b`. Its entire changed-file list is:

| File | Exact change |
| --- | --- |
|`gemini-extension.json`|Version1.1.25 →1.1.28|
|`plugin.json`|Version1.1.25 →1.1.28|
|`server.json`|Version1.1.25 →1.1.28|

The captured complete diff totals three added and three removed lines. Every
changed line is the version string. No public capability documentation or
implementation changed in this commit. A public commit titled“Release1.1.28”
does not replace the distinct GitHub latest-release artifact tag1.0.80, and the
public metadata diff says nothing about changes to the private hosted backend.

## npm limitation

The search fetcher reported the official registry URLs inaccessible for the
dist-tags endpoint and selected latest/alpha version endpoints, including one
unencoded-path fallback. Both attempted request sets and returned errors are
retained. This is an access limitation of this tool; no registry outage or package
removal was established.

Retain these facts with their **earlier16:53:06.736392Z observation time**:

- npm latest0.3.3, gitHead`bce370e9395f5bc74eda34913e5ae1dee48df8f8`,
  publishedNovember12 at12:59:49.155Z.
- npm alpha0.3.2-alpha.3, gitHead`9ac442d64731a1a7322a5b45585c3c53b2089a90`,
  publishedNovember5 at22:05:43.356Z.

No fresh claim is made about the beta tag's presence or absence, npm tag movement,
or selected publication times. The successful GitHub refresh cannot stand in for
a fresh npm registry observation.

## Evidence and scope

`receipt.json` records exact identities, comparisons, limitations and SHA-256
hashes of all seven capture files. The five GitHub captures retain the original
connector-returned JSON text together with request URL and observation time; the
two npm captures retain search-tool error responses. All captured content is
public metadata. The earlier committed upstream audit remains untouched.

No129-PR inventory or34-group capability review was repeated. No browser,
package install, owner-machine mutation, repository edit, GitHub mutation,
runtime probe or deployment occurred. This observation is complete and does not
change source qualification or whole-feature acceptance.
