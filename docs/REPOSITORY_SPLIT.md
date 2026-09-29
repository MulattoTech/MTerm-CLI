# MTerm repository split

Effective 2026-09-27:
- MTerm-GUI: https://github.com/MulattoTech/MTerm-GUI — native C++/Qt desktop product, Electron reference, GUI roadmap/history/evidence.
- MTerm-CLI: https://github.com/MulattoTech/MTerm-CLI — standalone CLI product, adapters, tests, CLI roadmap/releases.
- Legacy MTerm: https://github.com/MulattoTech/MTerm — migration/history source only.

Pre-split recovery checkpoint on the authorized workstation:
C:\Tools\Dev\MTerm\artifacts\split-20260927T182123Z

Before export, legacy local candidate 5b15df023b17dfade85bc7b2c08030733b823b13 and legacy remote main 9f33a64bd8af31aed19e8955c93c2a065f1ed725 had identical tree 850228803432bf57c2d7a5c4cbe41b34541d023a.

MTerm-GUI preserved its destination placeholder commit and merged the full legacy GUI/native history. Observed split-session GUI migration commit: b5c4df53febb8b4f9425e40fafb3fd35b375a787; recheck current main.

The access-check branch access-check/cli-prompt-20260925T115559Z is permission evidence, not product work, and is intentionally excluded.

The owner authorized deletion of the legacy GitHub repository after split verification, but the connected GitHub toolset exposed no repository-delete action during migration. Do not bypass that limitation; keep a migration notice unless a supported administration action becomes available.
