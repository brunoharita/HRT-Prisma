# AoT — Avaliação dentro do Score

Acordo `agreement-evaluation-inside-score.md` v1.0.0 e execução correspondente; baseline `9415f4180dad4d031ae02c94307fa1fed33a4187`, 2.2.1. Evidências em `docs/qa/evidence/evaluation-inside-score/`.

| Regra | Implementação / prova | Status |
| --- | --- | --- |
| D-01/02, CA-01/02 | children opcional em MatchingScoreSummary, nos cabeçalhos normal/pendente; quatro colunas e ação compacta de 36px dentro do fundo lilás. Reference normativa e before/after mesmos dados/viewport; seis larguras e estados | PASS |
| D-03, CA-03 | handler/IDs/gates intocados; browser loading/falha/retry/sucesso/navegação e 48 testes dirigidos | PASS |
| P-01/F-01 | sem duplicação/recálculo/decisão implícita; nenhum backend/IA/dado real/dependência/denominador/versão alterado | PASS |
| CA-04 | tipos/build/contextos/diff, CI/web/smoke/rollback/sincronização | PASS |

## Impacto e preservação

Direct: Score/CTA e componente de inclusão. Plausible_indirect: demais consumidores sem children, papéis/consultas/relação/revisão/comparação. No_impact_identified: lista/Kanban/backend/tenant/IA/Perfil; nenhum serviço/consulta alterado, CSS limitado ao cabeçalho/CTA. Baseline e regressão conforme mapa do acordo. Altura cresce apenas para acomodar a ação; largura desktop preservada. Sem nova dependência ou desvio material da imagem aprovada. Ramo semântico pendente preservado por diff idêntico; streaming/contextual coberto no browser. Jornada autenticada real NOT TESTED.

## Validação e ambientes

48 testes dirigidos, 51 checks browser, tipos/build web, contextos/lint/foundation/diff PASS. Versão 2.2.1 mantida; arquivos alheios preservados. Publicado somente web no SHA funcional 4f68ed5421004da59f9219f4914b1614a2fe4d76, CI 37864083286/37863950098 success (ci.json). Host srv1038882, imagem sha256:10f4d7815d9fd7b863b738b1b30e38518b23b89ee20db874d903f859db38b05f, running/zero reinícios. Smoke 16 HTTP 200/14 checks PASS: SHA/2.2.1/CTA/CSS/assets novos e anteriores/infra; rollback sha256:9233290e63599d62e560618f94aad53c741922d2ffa1b8f7592d9fd43f105bbd conferido. Parser/Synthesis/gateway preservam IDs e imagens, workers healthy. Probe inicial HTTP 404 durante recriação, dispatcher exit1/SSH22; verificação independente posterior PASS, sem repetir deploy. Fechamento documental sincroniza main/origin/VPS sem rebuild. Nenhum desvio material. Render sintético inspecionado desktop/mobile; não inferir prova real de persistência a partir de fixtures.
