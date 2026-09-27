# Contributing to MTerm-CLI

MTerm-CLI is developed independently from MTerm-GUI.

Every contribution must:
- identify affected CLI-NNN requirement IDs;
- include tests/evidence appropriate to the claimed stage;
- state actual platform coverage and intentional skips;
- preserve authentication/security boundaries and user state;
- update status, roadmap and handoff when implementation state changes;
- retain upstream licenses and scoped AI/human provenance;
- avoid unrelated GUI changes.

AI-authored commits should record AI-Provider, AI-Model, AI-Change and Tests trailers when known. Use unknown rather than inventing identity.

Comments should explain invariants, ownership, units, lifecycle/security choices and non-obvious failure behavior rather than narrating every line.
