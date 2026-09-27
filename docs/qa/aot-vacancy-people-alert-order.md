# AoT — consulta e ordenação de Pessoas por Posição

## Acordo do delta aprovado

Escopo aprovado por Bruno em 2026-09-27: corrigir os avisos da tela Pessoas para uma Posição e a ordenação das Pessoas dentro de cada grupo. Baseline `main`/`origin/main`: `a5ec007ff04d69df2bbf619ee4604983cda63f8a`.

- D-PEOPLE-01: ocultar confirmação de consulta completa; alertar apenas quando a paginação dos Perfis publicados terminar incompleta, informando contagens de registros consultados e esperados.
- D-PEOPLE-02: retirar da lista o aviso redundante de comparação incompleta e a alegação de ordem alfabética; manter a apresentação de cobertura e as pendências específicas de classificação.
- D-PEOPLE-03: manter a ordem dos grupos e ordenar scores numéricos do maior para o menor dentro de cada grupo; score indisponível permanece após scores numéricos.
- P-PEOPLE-01: não alterar fórmula/pesos/versão do score, elegibilidade, classificação A/B/C, decisões humanas, tela de comparação individual, dados persistidos, banco ou IA.
- F-PEOPLE-01: refatorações, mudanças de metodologia do matching e ajustes fora da tela de Pessoas ficam fora do escopo.
- A-PEOPLE-01: reutilizar `complete` da paginação e o comparador de score já existente; expor somente as contagens reais necessárias ao aviso de falha.
- CA-PEOPLE-01: teste prova grupo antes de score, score descendente mesmo quando existe interpretação pendente e score nulo por último.
- CA-PEOPLE-02: teste/checagem prova que a lista não mostra confirmação de sucesso nem aviso geral de comparação pendente e preserva aviso de requisitos não classificados.
- CA-PEOPLE-03: validar contagens de registros consultados/esperados, typecheck/build web, testes afetados, Context Pack e release web; smoke de produção confirma implantação.

## Mapa de impacto e preservação

| Capacidade | Relação | Baseline e prova proporcional |
| --- | --- | --- |
| Consulta/paginação de Perfis publicada | direct | `complete` já compara páginas processadas ao total exato; testes do contrato de contagens e alerta incompleto |
| Lista Pessoas e grupos A/B/C | direct | Baseline contém alertas de sucesso e pendência; teste de ausência e preservação dos grupos |
| Ordenação por score | direct | `prismaScoreComparison` já ordena descendente e coloca null ao final; regressão com interpretação pendente |
| Espelho de matching `matching-trajectory` | direct | `sortVacancyMatches` é exportado no runtime gerado, embora o handler atual não o consuma; regenerar e executar `tests/matchingRuntime.test.ts` para manter igualdade fonte/artefato |
| Comparação selecionada | plausible_indirect | Continua ordenada pela seleção explícita de IDs; revisar diff e teste existente |
| Score, dados, tenant e autoridade humana | critical_transversal | Sem cálculo novo, escrita, banco ou autorização; testes de score e revisão do diff |
| Outras telas/domínios sem dependência identificada | no_impact_identified | Confirmado por busca de consumidores; sem alteração |

## Execução e evidências

Implementação: `profileDiscoveryService` agora expõe registros paginados e total esperado, mantendo os totais de candidatos analisados intactos. `VacancyPeoplePage` oculta avisos de sucesso e comparação pendente, conserva aviso de requisitos não classificados e só mostra alerta de consulta incompleta quando `complete` é falso. `sortVacancyMatches` sempre aplica grupo, score descendente, decisão existente e nome como desempates; comparação individual, pesos e elegibilidade não mudam.

| Critério | Evidência local | Status |
| --- | --- | --- |
| D-PEOPLE-01 / CA-PEOPLE-02 | `tests/vacancyIntelligence.test.ts` e `tests/matchingScore.test.ts` verificam o alerta condicionado a `complete`, contagens, ausência de confirmação e preservação da pendência de classificação. | PASS |
| D-PEOPLE-02 | Regressões da lista confirmam ausência do aviso de comparação pendente/ordem alfabética; a tela de comparação selecionada não foi alterada. | PASS |
| D-PEOPLE-03 / CA-PEOPLE-01 | `tests/semanticTrajectory.test.ts`, `tests/matchingScore.test.ts`, `tests/vacancyIntelligence.test.ts` e `tests/matchingRuntime.test.ts`: 149 testes, 149 PASS, incluindo pendência sem bloquear score descendente. | PASS |
| Espelho Edge | `pnpm run check:matching-runtime` e `tests/matchingRuntime.test.ts` confirmam paridade do runtime gerado; handler Edge não chama a função de ordenação. | PASS |
| CA-PEOPLE-03 | `pnpm run build`, `pnpm run typecheck:web`, `pnpm run build:web`, `pnpm run generate:prisma-context`, `pnpm run check:prisma-context`, `pnpm run generate:matching-runtime`, `pnpm run check:matching-runtime`, `git diff --check`. Build web PASS com warnings preexistentes do chunk/injeção dinâmica; Context Pack e espelho Edge PASS. | PASS |
| D-PEOPLE-01 produção / CA-PEOPLE-03 | CI `36341051361` aprovado; runtime SHA `0e42bdc93ff9cc42736637293eca17c2a91faac6` integrado ao histórico de `main`/GitHub e executando na VPS. O fechamento documental posterior está em `main` HEAD `88ea5dbd0d267747d7dadf1a871c01eb3dacb120`; não exigiu rebuild. `prisma-web` running, reinícios 0, imagem `sha256:58af5ddf16854692e196573b28386fb73c027e66d0d79d5eb498655c97e197d5`; HTTPS 200 após 404 transitório imediato. Edge `matching-trajectory` v6 ACTIVE, `verify_jwt=true`, hash `bf0bceb24dc0aa8de1beadc96f1d3a20b2e1e584d87559db31551c929a74d445`; POST anônimo 401. | PASS |
| Smoke autenticado da lista | Não executado: abrir a lista poderia reanalisar Perfis reais e acionar IA/custo; testes focados provam ordenação e estados da interface sem escrever dados reais. | NOT TESTED |

Versão: nenhuma alteração; fórmula e contrato `matching-score-1.4.0` são preservados. Sem mudança de schema, RPC, RLS, handler ou comportamento Edge; foi publicado somente o módulo puro gerado para manter paridade fonte/artefato. Rollback web: `prisma-web:rollback-before-0e42bdc93ff9`; Edge pode retornar à versão 5/hash `a65990adb020b9dfd2c7993ae9e99fa8a8e4b506f736cfb4c21ce897f873f6df`. Nenhuma migration ou dado foi alterado. Desvio: a lista não recebeu smoke autenticado em produção pelo risco/custo descrito acima.

Os dois primeiros CI da branch apontaram, respectivamente, exports do Context Pack desatualizados e o espelho Edge anterior. Ambos foram regenerados; `check:prisma-context`, `check:matching-runtime`, os 149 testes focados e o terceiro CI completo passaram. O dispatcher publicou web; o connector Supabase publicou somente `matching-trajectory` para sincronizar o espelho, preservando JWT. A primeira verificação HTTP da VPS retornou 404 durante a recriação; a checagem posterior confirmou recuperação para 200.
