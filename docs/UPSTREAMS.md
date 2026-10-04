# Upstream state and integration boundaries

`versions.json` records exact registry versions/integrities for the local host's production and
development dependencies. Node24.21.0 ZIP was checksum-verified from the official Node distribution;
it is a local test/runtime prerequisite, not bundled in the npm package.

OpenAI Codex0.160.0 was observed via an existing official npm wrapper on this workstation. MTerm
reuses it without injecting sandbox/approval/model flags. This is dependency-reuse mode, not a
managed pinned Codex distribution. Source/artifact SHA for a complete bundle remains unverified.

The requested miuuyy/codex-chatgpt-web and lhl/pi-codex-status projects remain required scope but are
not imported. Historical prompt descriptions are research leads, not evergreen current compatibility
claims. A future change must read exact upstream source/license/runtime/auth/refresh behavior and
pin source/artifact identities before integrating. No static fake Web model list or fabricated quota
is substituted. Their runtime/auth/size conflicts are visible in the roadmap.

Actual runtime dependency licenses remain in node_modules/distributed package installation.
See THIRD_PARTY.md. No upstream source has been relabeled as MTerm-owned MIT.
