# Capability register contract

The [report](REPORT.md) and [derived counts](summary.json) come from
[register.json](register.json). The register maps the original mission to existing
CLI, Desktop Commander parity, remote Web and expansion requirements and to exact
GitHub issue owners. It separates five product layers: canonical plugin, managed
bridge, production edge, standalone CLI and standalone staging gateway.

The archived mission is source material for the crosswalk. Its discovery hints,
execution instructions and historical observations do not create new runtime
permissions. Governance obligations do not count as product capabilities.

## Meaning of the counts

Coverage means every original feature bullet has an explicit requirement target.
Registration means a concrete issue owns that requirement's acceptance. Neither
count measures delivery. The overlapping CLI300, DCP48, WEB12, AUG117 and mission
catalogs retain separate denominators. There is no combined completion percentage.

Each requirement has independent implementation, test, merge, deployment and
acceptance claims. Existing source, earlier test receipts, partial component merges
and runtime tool advertisement remain visible in separate fields. Closing an issue
does not change an acceptance flag. A source merge does not change a live service.

Historical source observations retain their original immutable SHA and timestamp.
Later `deliveryObservations` show qualified component work without rewriting that
history. A qualified partial-delivery observation must match its saved six-check
main receipt, candidate SHA, merge SHA and tree. An unmerged candidate remains an
unmerged candidate until a subsequent observation establishes otherwise.

Whole-requirement credit requires an explicit qualification receipt for each axis.
The receipt names the requirement, exact source, product layer, environment, full
scope, reviewer, UTC time and immutable evidence URLs with artifact hashes. It also
binds the current acceptance-criteria hash. A different source, layer, environment,
partial scope or changed criterion invalidates that receipt. Accepted status requires
all five axes and its explicit final-qualification prerequisites; verification
timestamps cannot be copied from inventory refreshes. The receipt's source must
belong to the stated repository and an explicitly mapped product layer. Private
plugin artifacts without that source binding need a separately reviewed receipt
schema before they can receive full credit.

Consumed upstream research and saved main receipts are byte-hashed in the reviewed
register. A change to those inputs requires explicit reconciliation. Partial delivery
labels come from a fixed set, and a successful main receipt must name the six required
fast/platform/isolation checks; six unrelated green jobs are insufficient.

These checks establish internal consistency, not the authenticity or truth of the
evidence. A human or independently authorized reviewer must inspect the linked
artifacts and actual behavior before recording full-scope assertions. The validator
does not download artifacts, query live GitHub state or run product qualification.
It is a development tool and is not shipped as a runtime MCP capability.

## Updating the register

1. Recheck the relevant source, issue and deployment, retaining exact identities and
   observation times. Preserve prior failed or superseded observations.
2. Update the affected row, source mapping, issue ownership or delivery observation.
   Do not alter the CLI seed or weights to improve the display.
3. If another legitimate baseline ledger changes, explicitly reconcile its snapshot
   hash here while retaining its fixed scope and independent acceptance rules. An
   unexpected baseline difference fails normal build/check instead of going stale.
4. Run `npm run capabilities:render`, then `npm run capabilities:check` and the
   capability-register regressions. Rendering never awards progress or approves source.
5. Record the change and review the affected CLI requirements through the normal
   roadmap review/render/check workflow. The whole capabilities directory is part of
   the reviewed source fingerprint, including the generated report.

Normal `build`, `check` and therefore packaging validate the source register and
compare both generated outputs byte-for-byte after LF normalization. Duplicate IDs,
unmapped bullets, invalid references, dependency cycles, altered baseline snapshots,
unproven claims and stale output all fail. Tests cover these rejection paths using
synthetic receipts; no test grants product acceptance.

## Current boundaries

The register's initial observation is November 12, 2026. New delivery observations
have their own times and do not make every issue or deployment observation current.
The source baseline remains available even after later merges. Complete mission
acceptance is unawarded; local profile work, heuristic navigation and in-memory task
ledgers remain partial facets of broader requirements. Production source identity,
supported-client behavior and real multi-computer acceptance require their own
evidence.
