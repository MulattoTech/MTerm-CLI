# CLI progress contract

All300 original CLI IDs and acceptance texts remain, including unimplemented quota/Web/update/platform
requirements. The seed file is immutable input; the reviewed progress catalog is independent from GUI.

Stages: not_started0, planned10, implementation40, integrated65, validated85, complete100.
Maturity = sum(weight * stage credit) / sum(weight). Weights are initial rough engineer-hour bands,
not measured labor or certainty. Routine review rejects changing IDs/weights under an established
baseline. A new scope baseline requires an explicit versioned decision, not manipulating a bar.
Blocked rows remain scored and red with earned credit. No item is silently excluded to reach100%.

Every item has objective/acceptance, current scope, evidence, stage, baseline, remaining range,
platforms, dependencies, reviewer and blocker. Calendar ETA is Unscheduled without a capacity plan.
No initial item is100% merely because a test passes on one machine.

Contributor sequence:
1. Identify affected IDs; inspect exact implementation/tests and update stages or justify unchanged.
2. Record actual provider/model/UTC/base/tests and roadmap_updates in docs/ai/changes/<ID>.json.
3. Run `node scripts/roadmap.mjs --review --change ID` explicitly after the assessment.
4. Run `node scripts/roadmap.mjs --render` then `node scripts/roadmap.mjs --check`.
5. Run normal build/test/package gates; publish only through authorized operations.

Source review covers src,bin,scripts,tests,.github,package/lock/config manifests, launchers,
instruction entry points and security/architecture/today-candidate docs. New source files are
included without relying on Git tracking. Changed source/catalog or altered generated output fails.
Rendering cannot approve source or infer completion. --review is a self-reported deliberate review,
not a cryptographic attestation or substitute for testing.

Generated local SVGs, Markdown, JSON and HTML need no external badge service. HTML includes literal
search and stage/blocked filters; it is an offline file, not a deployed GitHub Pages site.
