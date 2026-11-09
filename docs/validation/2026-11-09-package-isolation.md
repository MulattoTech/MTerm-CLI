# Installed package isolation qualification — 2026-11-09

Session `MTERM-WEB-20261109T031131Z-e0efd5d4`, OpenAI / GPT-6 Astra Pro
(self-reported), ChatGPT Web. [Atomic issue8 claim](https://github.com/MulattoTech/MTerm-CLI/issues/8#issuecomment-6733913700),
`coord/mterm/issue-8`, feature `fix/issue-8-package-isolation-20261109`.
One implementation writer, three independent read-only review/testing peers.

Base `19a446e5b88815154dea4b48fa7ecbd08deb136a` is merged PR221, tree
`4dac0d42d47068d3c9c8bea125687eee5508bfe4`, identical to its qualified candidate.
All six PR and all six separate merged-main gates passed with independent actual-log
review. The [PR receipt](https://github.com/MulattoTech/MTerm-CLI/pull/221#issuecomment-6733887191)
and [main receipt](https://github.com/MulattoTech/MTerm-CLI/issues/57#issuecomment-6734000843)
retain exact identities, 713 Windows passes, other full suites 701 passes plus12
existing skips, installed16/18/8/46/18/5 and native12+12 containment/cleanup.
PR211–221 have completed their PR and separate main gates. This does not deploy
any bridge, plugin or gateway.

## Confirmed qualification gap and historical reconciliation

Before this change, `verify-package.mjs` created its output, installation prefix,
home, npm cache and most configured working directories beneath checkout
`artifacts/package-verify-*`. The first packaged MCP transport additionally omitted
`cwd`, inheriting the verifier's checkout. Older top-level and several component
`fromOutsideCheckout: true` fields therefore overstated this boundary. More recent
move, run-lock and admission probes used actual external working directories, but
their installed package still lived below the checkout.

A module loaded from that nested installation can walk ancestor `node_modules`
directories and resolve a dependency supplied only by the checkout. An external
working directory alone does not prevent this. Real CJS and ESM fixture controls
reproduce this mechanism. No missing MTerm production dependency has been
identified; this corrects the qualification boundary. Prior observed functional,
module-binding, licensing and native-containment results retain their specific
scope. Historical reports, hashes and ledger entries are not rewritten or promoted.
The new dated notes narrow the earlier outside-checkout wording.

Inherited `NODE_PATH`, `NODE_OPTIONS`, and npm's `node-options` environment setting
were separate escape paths. A real npm-script fixture reproduces npm reconstructing
`NODE_OPTIONS` from its inherited configuration. These are owned fixture preloads,
not injected code or a change to the owner's environment.

## Implemented boundary

The new development-only `withPackageWorkspace` helper canonicalizes the checkout
and selected temporary parent. A parent inside the checkout, including through an
alias/junction, is rejected before verification. It creates a unique external runtime
workspace and a separate evidence directory under checkout artifacts. The original
verification body is mechanically wrapped; gate order, binding checks, fixture counts,
assertions and helper-specific shutdown/cleanup protections are preserved.

| Operation | Location / qualification |
| --- | --- |
| Actual tarball installation and npm cache | External owned workspace; installation runs from external home |
| Installed entry, prefix, output, home, cache and configured standalone cwd | Canonical locations measured after installation and asserted outside checkout |
| Initial packaged MCP child | Explicit external home cwd |
| Configuration, remote-state, provenance and other existing helper fixtures | Existing paths beneath output now resolve externally |
| Source-hosted test drivers / development SDK client | Remain in checkout; this is explicitly reported |
| `npm pack` and `npm link` | Explicit source-root cwd |
| Owned-prefix linked executable | External launch cwd, target explicitly resolves to checkout; source-linked compatibility, not isolated dependency resolution |

Child environments remove Node path/loader settings and npm node-options keys
case-insensitively, including underscore/hyphen forms. Owned HOME/USERPROFILE,
CODEX_HOME, config files and npm cache remain selected. Native-lane isolation
inputs and the configuration helper's explicit command-line `--import` network
guard remain available. This cannot undo a preload already executed in the parent
verifier, and does not establish hermetic isolation from every system directory.

The top-level and prior component outside-checkout fields now derive from measured
standalone locations. Provenance independently measures its installed entry, prefix,
output and configured cwd. These are configured directory measurements, not a claim
that every descendant separately reported its live cwd.

## Retention and error behavior

The old verifier retained its whole workspace. The new owner also retains the
external workspace on success and failure; it never removes it, steals a child,
sweeps stale directories or claims new process-exit proof. This preserves existing
helpers' deliberate retention when product exits are uncertain.

Before returning, the owner mirrors regular evidence under the checkout evidence
directory and records relative copied paths, byte sizes and SHA-256 values in
`workspace.json`. Existing reports retain their original external paths; the receipt
maps those originals to their copied snapshot. After retention, final stdout additionally
embeds the actual receipt and its SHA-256 for hosted-log inspection. The captured
callback result.json is not rewritten; its receipt hash remains valid. This small
reporting addition follows the independent fixture run and receives separate source
review plus actual hosted execution. Install, link, home, cache, scope,
remote-state/reference fixture trees and nested `fixtures` are excluded. Static
symlinks/junctions and nonregular objects are skipped without following targets;
configuration reports, stderr, audits and guard evidence remain eligible.

A callback failure is rethrown with its exact identity, including falsy thrown values,
after retention. Available command stdout/stderr is captured, capped at8MiB per stream
with explicit truncation metadata. A concurrent evidence-copy error is secondary.
If the callback succeeds but copying fails, qualification fails. If the receipt itself
cannot be written normally, a fallback receipt is attempted alongside the external
originals. No missing installed prefix is inspected during failure reporting. The
mirror is a captured snapshot, not a hostile-filesystem race guarantee or proof that
a failed child stopped writing.

## Regression evidence

The original allocator/environment was first extracted unchanged into a helper and
the existing body wrapped mechanically. RED therefore uses a **behavior-preserving
extraction**, not an untouched Git HEAD. The archived original verifier SHA-256 is
`6b26d64754e2d20473ae24f88713f474a50a10b048a8e06099b6b9bbf0b9366e`;
extracted helper `c198a4c57ddb16228caa1cd01ac480e1625f8162e1a548bf02cd6da97198169c`;
wrapper `0057afddcc31c337a2809f5d426553b05ea5cf0a527a6e2ab4f1e78989bb1509`.
All19 initial regression cases preceded the behavioral fix. The final fixture adds
review-requested bounded teardown, live-child observations, pinned npm-script PATH
and captured-stream assertions; its same19 cases were also executed against the
archived extraction without replacing the working implementation.

| Evidence | Actual result |
| --- | --- |
| Initial pre-fix19 cases | 4 passed /15 failed:11 assertions and4 missing-new-receipt failures; no skips/cancellations/todo |
| Frozen final19 against archived extraction | Same4/15 outcome; CJS/ESM negatives actually resolve the checkout-only sentinel |
| Corrected focused package/npm/prepack cases | 27/27; no failures/skips/cancellations/todo |
| Independent frozen new fixture | 19/19, exit0, empty stderr, one execution; five source/fixture/resolver hashes unchanged |
| Full local suite | Not rerun because the known cloud Unix-socket `listen EPERM` fixture limitation remains; hosted gates are required |
| Normal reviewed build/typecheck/format/parity | Passed, including final reporting delta; all27 compiled JS modules byte-identical;174-file source fingerprint397050988bcfb293615d09482bd4bb6d2c9d9475714d8445b2f9e910d0c3e5c4 |
| Hosted package/platform/native gates | Pending exact candidate publication; no local result substitutes for them |

The19 cases include real CJS/ESM controls, missing-dependency negatives and installed
positives; external location and canonical alias checks; separate Node/npm preload
and NODE_PATH checks; case variants and native-input preservation; evidence copying,
exclusions and retained state; early/falsy failures; an actually held owned child;
and primary/secondary copy-failure precedence. Positive dependency packages are
constructed fixtures, not npm-installed artifacts. Actual npm packaging/install and
all existing installed contracts remain hosted gates. The held child's cleanup uses
its captured ChildProcess, bounded close observation and retention on unresolved
closure; there is no numeric-PID termination fallback.

The committed [RED TAP](2026-11-09-package-isolation-red.tap) and [focused GREEN TAP](2026-11-09-package-isolation-green.tap)
remove only trailing whitespace for display. Raw frozen RED SHA-256
`209a2ff407c9970daa8f450ce99cfa2abfd7b991742cbfb7d948bd585418167b`;
focused GREEN `c793a4494552cd41b53c8ddb2caf3c73b87d09e2ed1ebcd901977ab75d8e6787`.
Initial RED `9b41769ec9664d8e9f3c4bc8cf9c126d175a4a48e7ed485af5e5baf255739f07`.
Independent TAP `8967c4acd69b15b90d9ca5c9ec8f65bd869264ae8b5250d7e3717a20058708dd`;
independent receipt `b5539e199e73eb76368a7645ac950568a2dca94cb15522b61085fd5cbc16ef32`.

## Scope and next gate

CLI214/260 receive evidence and dated corrective notes only. DCP006 remains open;
its original observation and review timestamp remain intact. Preserve all300 protected
IDs/acceptance/stages/weights/estimates, seeds, locks, pins, historical receipts and
AUG/DCP/WEB acceptance. Maturity remains29.36%,0 complete,45 blocked,126 not started.
No CLI product/runtime source or dependencies change. This is not full Codex-agent,
security-sandbox, dependency redistribution, crash/cleanup, production-load or
20–30-client acceptance. No real owner configuration, credentials, grants, bridge,
plugin, global runtime, Cloudflare deployment or unrelated project changes.

Independent source/fixture reviews, documentation/protected-ledger checks and normal
reviewed gates passed. Next: publish the exact-head draft, qualify all six hosted gates, merge normally
with expected head and verify the separate merged-main results. Standing owner
authorization applies; no new manual approval is required.
