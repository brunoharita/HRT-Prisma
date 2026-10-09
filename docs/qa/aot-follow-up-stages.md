# AoT — Etapas claras de acompanhamento

Acordo `agreement-follow-up-stages.md` v1.0.0 e execução correspondente. Baseline `9bd6c79b048e3005cda78caaddcba083c6071eae`, versão 2.2.1 mantida. Evidências em `docs/qa/evidence/follow-up-stages/`.

| Regra | Implementação / prova | Status |
| --- | --- | --- |
| D-01/02, CA-01 | projeção dos dois legados, cinco colunas, nomes/filtros/seleção mobile/vínculos compartilhados; unitários e browser | PASS |
| D-03, CA-03 | inclusão/loading/sucesso/vazio/orientação/processo com acompanhamento, preservando handlers; browser discovery | PASS |
| D-04, CA-02 | etapas factuais abrem formulário existente sem mutação, validação e salvamento explícitos, falha/conflito/rascunho | PASS |
| D-UX-01 | colunas iguais, rolagem local, seletor mobile; render sintético e geometria | PASS |
| P-01/F-01 | sem backend, IA, banco/questões, Score/Perfil/Knowledge/ocupação ou escolhas implícitas; diff, snapshots, testes dirigidos | PASS |
| CA-04 | tipos/build/contextos/diff/CI/publicação web/smoke/rollback/sincronização | PARTIAL |

## Impacto e preservação

Mapa do acordo aplicado: direct etapas/colunas/CTA/formulários e release; plausible_indirect vínculos na Pessoa; critical_transversal autoridade, revisão e estabilidade Score; no_impact_identified para persistência/IA/ingestão/Knowledge/Perfil/ocupação, com serviço e migrations intactos. Aliases são projeção de apresentação; audit payloads brutos e identificadores persistidos permanecem. Baseline visual reutiliza render validado da mesma fixture/viewport 1448/390 em position-follow-up-v220; diferenças recentes no baseline Git eram na descoberta. Render novo nos mesmos estados/dados/viewport. Sem redesign dos cartões.

## Validação e ambientes

Local: 34 checks browser Kanban e 51 checks de descoberta PASS, incluindo falha/conflito, formulários sem gravação, estados factuais e mobile legado. Render desktop/mobile inspecionado; colunas iguais e cartões originais preservados. 53 testes dirigidos, tipos/build root e web, contextos/lint/foundation/diff PASS. Publicação em andamento. Jornada autenticada real NOT TESTED; fixtures e smoke público não comprovam persistência real. Nenhum dado real ou decisão fictícia gravada. Sem QA remoto separado. Sem alteração de versão. Publicação limitada ao web conforme dispatcher; fechamento sincroniza Git sem reconstruir runtime.
