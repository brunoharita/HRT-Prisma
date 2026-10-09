# AoT — Etapas claras de acompanhamento

Acordo `agreement-follow-up-stages.md` v1.0.0 e execução correspondente. Baseline `9bd6c79b048e3005cda78caaddcba083c6071eae`, versão 2.2.1 mantida. Evidências em `docs/qa/evidence/follow-up-stages/`.

| Regra | Implementação / prova | Status |
| --- | --- | --- |
| D-01/02, CA-01 | projeção dos dois legados, cinco colunas, nomes/filtros/seleção mobile/vínculos compartilhados; unitários e browser | PASS |
| D-03, CA-03 | inclusão/loading/sucesso/vazio/orientação/processo com acompanhamento, preservando handlers; browser discovery | PASS |
| D-04, CA-02 | etapas factuais abrem formulário existente sem mutação, validação e salvamento explícitos, falha/conflito/rascunho | PASS |
| D-UX-01 | colunas iguais, rolagem local, seletor mobile; render sintético e geometria | PASS |
| P-01/F-01 | sem backend, IA, banco/questões, Score/Perfil/Knowledge/ocupação ou escolhas implícitas; diff, snapshots, testes dirigidos | PASS |
| CA-04 | tipos/build/contextos/diff/CI/publicação web/smoke/rollback/sincronização | PASS |

## Impacto e preservação

Mapa do acordo aplicado: direct etapas/colunas/CTA/formulários e release; plausible_indirect vínculos na Pessoa; critical_transversal autoridade, revisão e estabilidade Score; no_impact_identified para persistência/IA/ingestão/Knowledge/Perfil/ocupação, com serviço e migrations intactos. Aliases são projeção de apresentação; audit payloads brutos e identificadores persistidos permanecem. Baseline visual reutiliza render validado da mesma fixture/viewport 1448/390 em position-follow-up-v220; diferenças recentes no baseline Git eram na descoberta. Render novo nos mesmos estados/dados/viewport. Sem redesign dos cartões.

## Validação e ambientes

Local: 34 checks browser Kanban e 51 checks de descoberta PASS, incluindo falha/conflito, formulários sem gravação, estados factuais e mobile legado. Render desktop/mobile inspecionado; colunas iguais e cartões originais preservados. 53 testes dirigidos, tipos/build root e web, contextos/lint/foundation/diff PASS. Publicado somente web no SHA funcional c2d7a072e4e1fd6e23eb0f2e27e14ab16162d5e5; CI branch 37872518199/main 37872609932 success (ci.json). Host srv1038882, imagem sha256:033c370c167e5d52a77e7df148ebb89fe343ab31d1c455b41ead4cb814a925cc, running/zero reinícios; 16 HTTP200 e 15 checks de SHA/2.2.1/etapas/textos/layout/assets/infra PASS. Rollback sha256:10f4d7815d9fd7b863b738b1b30e38518b23b89ee20db874d903f859db38b05f conferido; Parser/Synthesis/gateway preservam IDs/imagens e workers healthy. Fechamento documental sincroniza main/origin/VPS sem rebuild. Smoke é público; jornada autenticada real NOT TESTED. Jornada autenticada real NOT TESTED; fixtures e smoke público não comprovam persistência real. Nenhum dado real ou decisão fictícia gravada. Sem QA remoto separado. Sem alteração de versão. Publicação limitada ao web conforme dispatcher; fechamento sincroniza Git sem reconstruir runtime.

Dispatcher confirmou web apenas; validação local proporcional substituiu o comando genérico pnpm test do plano por 53 testes dirigidos conforme mapa, com CI existente completo. Sem desvio funcional. Rolagem horizontal local preserva largura legível no desktop; mobile mantém uma coluna e os mesmos cinco destinos. Arquivos alheios preservados.

Probe imediato retornou HTTP404 durante recriação; dispatcher exit1/SSH22. A verificação independente posterior passou (16HTTP200/15checks), sem repetir deploy. Resultado consolidado em publication-consolidated.json.
