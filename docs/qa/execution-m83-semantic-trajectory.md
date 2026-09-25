# Execução M8.3

Implementar integralmente `docs/qa/agreement-m83-semantic-trajectory.md`, versão congelada 1.0.0, incluindo D-01–D-08, P-01–P-03, F-01, A-01 e critérios de aceite. Classificação D/E: matching, IA, PII e persistência derivada. Mapa de impacto no acordo é baseline mínimo.

Reutilizar o score, requisitos e componentes existentes; estender com interpretação backend versionada. Sem aprendizado, nova base de fatos ou nota livre. Política financeira do Parser. Validar em ambiente local sintético, depois migration/Edge/web nas superfícies do dispatcher, smoke e sincronização main. Não executar db push geral nem repair de ledger.

AoT: `docs/qa/aot-m83-semantic-trajectory.md`. Decisão técnica: ADR de interpretação derivada M8.3. Não declarar aceite de itens sem evidência.
