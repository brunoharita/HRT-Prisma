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
| Comparação selecionada | plausible_indirect | Continua ordenada pela seleção explícita de IDs; revisar diff e teste existente |
| Score, dados, tenant e autoridade humana | critical_transversal | Sem cálculo novo, escrita, banco ou autorização; testes de score e revisão do diff |
| Outras telas/domínios sem dependência identificada | no_impact_identified | Confirmado por busca de consumidores; sem alteração |

## Execução e evidências

Implementação: `profileDiscoveryService` agora expõe registros paginados e total esperado, mantendo os totais de candidatos analisados intactos. `VacancyPeoplePage` oculta avisos de sucesso e comparação pendente, conserva aviso de requisitos não classificados e só mostra alerta de consulta incompleta quando `complete` é falso. `sortVacancyMatches` sempre aplica grupo, score descendente, decisão existente e nome como desempates; comparação individual, pesos e elegibilidade não mudam.

| Critério | Evidência local | Status |
| --- | --- | --- |
| D-PEOPLE-01 / CA-PEOPLE-02 | `tests/vacancyIntelligence.test.ts` e `tests/matchingScore.test.ts` verificam o alerta condicionado a `complete`, contagens, ausência de confirmação e preservação da pendência de classificação. | PASS |
| D-PEOPLE-02 | Regressões da lista confirmam ausência do aviso de comparação pendente/ordem alfabética; a tela de comparação selecionada não foi alterada. | PASS |
| D-PEOPLE-03 / CA-PEOPLE-01 | `tests/semanticTrajectory.test.ts`, `tests/matchingScore.test.ts` e `tests/vacancyIntelligence.test.ts`: 146 testes, 146 PASS, incluindo pendência sem bloquear score descendente. | PASS |
| CA-PEOPLE-03 | `pnpm run build`, `pnpm run typecheck:web`, `pnpm run build:web`, `pnpm run generate:prisma-context`, `pnpm run check:prisma-context`, `git diff --check`. Build web PASS com warnings preexistentes do chunk/injeção dinâmica; Context Pack PASS. | PASS |
| D-PEOPLE-01 produção | Publicação web/VPS e smoke ainda não executados neste registro. | NOT TESTED |

Versão: nenhuma alteração; fórmula e contrato `matching-score-1.4.0` são preservados. Diff sem alteração de schema, RPC, RLS, backend ou Edge; release esperado apenas web/VPS e documentação. Rollback previsto: restaurar a imagem anterior do `prisma-web`, sem operação de banco. Desvios conhecidos: nenhum funcional; CI e smoke de produção aguardam publicação.

O primeiro CI da branch parou no verificador de Context Pack porque os arquivos gerados não incluíam a seção de evidências acima, atualizada após a geração local. Os dois artefatos foram regenerados e `check:prisma-context` passou; a nova execução de CI ainda é necessária.
