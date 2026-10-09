# AoT — Avaliação dentro do Score

Acordo `agreement-evaluation-inside-score.md` v1.0.0 e execução correspondente; baseline `9415f4180dad4d031ae02c94307fa1fed33a4187`, 2.2.1. Evidências em `docs/qa/evidence/evaluation-inside-score/`.

| Regra | Implementação / prova | Status |
| --- | --- | --- |
| D-01/02, CA-01/02 | children opcional em MatchingScoreSummary, nos cabeçalhos normal/pendente; quatro colunas e ação compacta de 36px dentro do fundo lilás. Reference normativa e before/after mesmos dados/viewport; seis larguras e estados | PARTIAL |
| D-03, CA-03 | handler/IDs/gates intocados; browser loading/falha/retry/sucesso/navegação e 48 testes dirigidos | PARTIAL |
| P-01/F-01 | sem duplicação/recálculo/decisão implícita; nenhum backend/IA/dado real/dependência/denominador/versão alterado | PASS |
| CA-04 | tipos/build/contextos/diff, CI/web/smoke/rollback/sincronização | PARTIAL |

## Impacto e preservação

Direct: Score/CTA e componente de inclusão. Plausible_indirect: demais consumidores sem children, papéis/consultas/relação/revisão/comparação. No_impact_identified: lista/Kanban/backend/tenant/IA/Perfil; nenhum serviço/consulta alterado, CSS limitado ao cabeçalho/CTA. Baseline e regressão conforme mapa do acordo. Altura cresce apenas para acomodar a ação; largura desktop preservada. Sem nova dependência ou desvio material da imagem aprovada. Ramo semântico pendente preservado por diff idêntico; streaming/contextual coberto no browser. Jornada autenticada real NOT TESTED.

## Validação e ambientes

48 testes dirigidos PASS. Demais checks e publicação pendentes. Versão 2.2.1 mantida; arquivos alheios preservados. Fechar após evidência do render/CI/smoke, sem inferir prova real de persistência a partir de fixtures.
