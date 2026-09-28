# AoT — preservação do matching após falha da IA

Contrato: `docs/qa/agreement-matching-ai-failure-fallback.md` v1.0.0; execução: `docs/qa/execution-matching-ai-failure-fallback.md`. Baseline: `origin/main` em 2026-09-28. Este movimento responde à falha real `RESPONSE_INVALID` observada na busca da Posição Analista de Marketing, sem alterar registros de produção.

## Matriz de Acordos

| ID | Acordo | Implementação | Teste / evidência | Status |
| --- | --- | --- | --- | --- |
| D-01 | Preservar o resultado pré-IA | `applySemanticAssessment` conserva o `VacancyCandidateMatch` e acrescenta somente `semanticFallback` transitório | `semanticTrajectory.test.ts` exige igualdade de todos os campos anteriores; caso Marketing em `semanticTriage.test.ts` | PASS |
| D-02 | Notificar em tela | Aviso na busca e comparação, marcador nos Perfis afetados | JSX verificado, typecheck/build web, asset publicado com HTTP 200; smoke visual autenticado não executado | PASS |
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
| Busca e comparação | direct | Seção de pendências retirava o Perfil do Grupo A/B | Avisos e marcador; typecheck/build e asset servido; smoke autenticado pendente | PARTIAL |
| Score, ordenação e avaliação | plausible_indirect | Cálculo determinístico e versões vigentes | Testes de score/ordenação e corpus semântico; nenhuma fórmula alterada | PASS |
| Edge, autoridade e tenant | critical_transversal | Resposta do backend validada antes da aplicação | Negativos de proveniência, runtime gerado, 28 testes Deno funcionais e Edge v8 JWT | PASS |
| Knowledge, parser, publicação e banco | no_impact_identified | Sem novo caminho de escrita ou schema | Diff restrito a objeto transitório, apresentação, testes e documentação | PASS |
| Release | direct | Web/VPS e Edge existentes | Plano seletivo, CI, Edge v8, VPS no SHA funcional e HTTP 200 | PASS |

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

Não há referência visual normativa. A apresentação acrescenta aviso e marcador às superfícies existentes, sem alteração da estrutura da página. O build web e o asset servido passaram; smoke visual autenticado permanece pendente para evitar possível reanálise de Perfis reais.

## Desvios do contrato

Nenhum desvio intencional. CA-02 tem prova de implementação e asset, mas não de renderização autenticada com os Perfis reais; essa limitação permanece explícita.

## Mudanças autorizadas durante a execução

A decisão de Bruno em 2026-09-28 substitui o estado de pendência com apagamento do resultado pré-IA em falhas; demais regras M8.6 permanecem.

## Validação final

- `pnpm run build`: PASS.
- `node --test dist/tests/semanticTrajectory.test.js dist/tests/semanticTriage.test.js`: 95/95 PASS após atualização das expectativas antigas.
- `node --test dist/tests/matchingRuntime.test.js`: 3/3 PASS.
- `deno test --no-check supabase/functions/matching-trajectory/handler.test.ts supabase/functions/matching-trajectory/snapshot.test.ts`: 28/28 PASS. O typecheck do Deno 2.8.3 encontrou incompatibilidade preexistente em `handler.ts:131` (`kind` inferido como `string`); nenhum arquivo desse handler mudou neste movimento.
- `pnpm run typecheck:web`, `pnpm run build:web`, `pnpm run lint`: PASS.
- `pnpm run check:matching-runtime`: PASS. `pnpm run generate:prisma-context` e `pnpm run check:prisma-context`: PASS com o rascunho não rastreado de outro movimento temporariamente fora da leitura do gerador; o arquivo foi restaurado. CI `36374496622`: PASS no checkout limpo.
- `pnpm run release:plan`: 13 arquivos; somente Edge `matching-trajectory` e web/VPS; sem migration. `pnpm run release:verify`: Git alinhado e site HTTP 200.

## Git / QA / ambiente

SHA funcional `a20bd84dd1f25eacb9e216f5dcbb230626fdbb8a` na branch `codex/matching-ai-fallback`, `main`, `origin/main` e checkout VPS `/opt/prisma`. Edge `matching-trajectory` v8 ACTIVE, JWT obrigatório, hash `339061b888bd34bf64a423d588fa0f5c9ad1c095c71bc2028cf94aad201dcf01`; somente seu módulo gerado de fallback diferiu da v7. VPS: imagem `sha256:e637beaf26a4752aaa164dded9af405c6cdef9bccaf27b50fc50e5eeb56f1171`, contêiner `running`, zero reinícios, `/`, `/login` e asset novo HTTP 200. O smoke automatizado imediato da troca encontrou 404 e saiu com código 22; a verificação posterior confirmou a recuperação sem novo deploy. Quatro itens não rastreados preexistentes do usuário permaneceram intactos e fora do commit. Nenhum Perfil ou Posição real foi alterado para teste.

## Conclusão

`PARTIAL`: correção implementada e publicada com testes e verificações de infraestrutura aprovados; o resultado visual autenticado com os Perfis reais não foi exercitado para evitar reanálise e custo de IA.
