# Satelligence integration in MTerm-CLI

MTerm-CLI is the product entry point for Satelligence workstation tools. The installed ChatGPT plugin and Live Connection use the separate authenticated workstation bridge. A change to the npm CLI is visible in the plugin only after the bridge exposes and qualifies it. OpenHands is a separate local agent client. A change to its prompts, model settings or tools stays there unless the change is shared through a reviewed runtime or tool interface.

## Integration order

1. Use the existing DCP-48 ledger and capability register. Compare the standalone MCP tool list, the authenticated MTerm plugin surface and the owner's Remote Desktop Commander surface by schema, behavior, authorization and errors. The existing baseline pins DesktopCommander 0.2.52 and 26 manifest tools. The older handoff reported 53 tools on a separate 0.3.1 bridge. Neither number establishes parity with the current Remote Desktop Commander client. Track local source, packaged runtime and authenticated-client acceptance independently.
2. Move the reviewed-document workflow to a bounded MTerm-CLI/MCP contract. Bind one selected workspace excerpt, source SHA-256, exact question, expiry and single-use consent. Keep source text out of logs and ordinary persistence. Exercise the CLI and MCP surfaces with the same fixture, then qualify the authenticated development bridge before promotion. Keep model dispatch local until cloud financial admission is independently verified.
3. Reuse the Satelligence local memory and creative workers where their contracts fit. Keep artifact generation behind separate review and approval. Exercise the shared interfaces through OpenHands and the MTerm plugin. Preserve the frozen GUI preview as recovery evidence.
4. Use the local evaluation corpus to measure task completion, scope violations, tool selection, tool-call reliability and latency. Satelligence model quality and MTerm tool coverage are distinct deliverables. Compare each with its previous measured baseline.

No product maturity stage advances on the strength of this record.

Baseline commit: ae13ea5bbf0a797e20a4ea9b17763306ef66468e. Local parity snapshot and roadmap checks passed.
