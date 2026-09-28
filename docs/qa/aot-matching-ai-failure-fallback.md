# AoT — preservação do matching após falha da IA

Contrato: `docs/qa/agreement-matching-ai-failure-fallback.md` v1.0.0; execução: `docs/qa/execution-matching-ai-failure-fallback.md`. Baseline: `origin/main` em 2026-09-28. Este movimento responde à falha real `RESPONSE_INVALID` observada na busca da Posição Analista de Marketing, sem alterar registros de produção.

## Matriz de Acordos

| ID | Acordo | Implementação | Teste / evidência | Status |
| --- | --- | --- | --- | --- |
| D-01 | Preservar o resultado pré-IA | `applySemanticAssessment` conserva o `VacancyCandidateMatch` e acrescenta somente `semanticFallback` transitório | `semanticTrajectory.test.ts` exige igualdade de todos os campos anteriores; caso Marketing em `semanticTriage.test.ts` | PASS |
| D-02 | Notificar em tela | Aviso na busca e comparação, marcador nos Perfis afetados | Typecheck e build web; smoke visual autenticado ainda pendente | PARTIAL |
| D-03 | Manter leitura válida e permitir atualização | Caminho de resposta completa mantém cálculo/versionamento; botão de atualizar refaz a consulta existente | Corpus semântico offline e testes de orquestração | PASS |

## Proibições verificadas

| ID | Guardrail | Teste / evidência | Status |
| --- | --- | --- | --- |
| P-01/P-02 | Falha não zera nem apaga grupo, score e evidências | Igualdade integral e ordenação em testes dirigidos | PASS |
| P-03 | Resposta/proveniência inválida não vira conclusão semântica | Negativos de tenant, Perfil, Posição, método, prompt, hash e leitura malformada | PASS |

## Mapa de Impacto e Preservação

| Área / capacidade | Relação | Baseline | Regressão proporcional | Status |
| --- | --- | --- | --- | --- |
| Matching e descoberta | direct | Erro convertia área, função, trajetória e score em indisponível | Igualdade do match anterior sob falhas; Marketing fica no grupo anterior | PASS |
| Busca e comparação | direct | Seção de pendências retirava o Perfil do Grupo A/B | Avisos e marcador; typecheck/build; smoke autenticado pendente | PARTIAL |
| Score, ordenação e avaliação | plausible_indirect | Cálculo determinístico e versões vigentes | Testes de score/ordenação e corpus semântico; nenhuma fórmula alterada | PASS |
| Edge, autoridade e tenant | critical_transversal | Resposta do backend validada antes da aplicação | Negativos de proveniência e runtime gerado; teste Edge direcionado pendente | PARTIAL |
| Knowledge, parser, publicação e banco | no_impact_identified | Sem novo caminho de escrita ou schema | Diff restrito a objeto transitório, apresentação, testes e documentação | PASS |
| Release | direct | Web/VPS e Edge existentes | Plano após commit, CI e publicação ainda pendentes | NOT TESTED |

### Novidade e preservação

- Novo: aviso transitório de falha que não substitui o resultado calculado.
- Preservado: grupo, score, dimensões, relações, evidências, requisitos, decisões humanas, cálculo e versão persistida.
- Limitação: a classificação determinística anterior continua sujeita às suas próprias limitações de evidência; a falha de IA não a valida nem a invalida.

## Fora de escopo preservado

| ID | Evidência | Status |
| --- | --- | --- |
| F-01 | Política de acionamento, prompt, modelo e orçamento sem alteração | PASS |
| F-02 | Sem migration, pesos, Knowledge ou mutação de dados reais | PASS |

## Evidência de fidelidade visual

Não há referência visual normativa. A apresentação acrescenta aviso e marcador às superfícies existentes, sem alteração da estrutura da página. O build web passou; smoke visual autenticado permanece pendente.

## Desvios do contrato

Nenhum desvio intencional. CA-02 e CA-03 permanecem parciais até smoke e release.

## Mudanças autorizadas durante a execução

A decisão de Bruno em 2026-09-28 substitui o estado de pendência com apagamento do resultado pré-IA em falhas; demais regras M8.6 permanecem.

## Validação final

- `pnpm run build`: PASS.
- `node --test dist/tests/semanticTrajectory.test.js dist/tests/semanticTriage.test.js`: 95/95 PASS após atualização das expectativas antigas.
- `pnpm run typecheck:web`, `pnpm run build:web`, `pnpm run lint`: PASS.
- `pnpm run check:matching-runtime`, `pnpm run check:prisma-context`: PASS no workspace; o Context Pack será regenerado novamente sem incluir o rascunho não rastreado de outro movimento antes do commit.

## Git / QA / ambiente

Branch `codex/matching-ai-fallback`. Release ainda não executado. Quatro itens não rastreados preexistentes do usuário serão preservados e não entram no commit.

## Conclusão

`PARTIAL` até validação final, CI, publicação seletiva e smoke.
