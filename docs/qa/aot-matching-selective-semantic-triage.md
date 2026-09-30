# AoT — triagem ocupacional seletiva antes da IA

Contrato: `docs/qa/agreement-matching-selective-semantic-triage.md` v1.0.0; execução: `docs/qa/execution-matching-selective-semantic-triage.md`. Baseline: `77068e969cf73bb01ee45f3c91e69b318b920b67`. Este AoT separa evidência local de implantação remota; a simulação não mede latência de rede nem cobertura universal.

## Matriz de Acordos

| ID | Acordo | Implementação | Teste / evidência local | Status | Ambiente / limitação |
| --- | --- | --- | --- | --- | --- |
| D-01 | Busca interna ampla | `isSemanticDiscoveryEligible`, `findPeople` e coleção publicada paginada | `semanticTriage.test.ts`, `vacancyIntelligence.test.ts` | PASS | Sintético; Perfis reais não modificados |
| D-02 | Knowledge primeiro | Estados `resolved_internal` e `contextual_only`, observações/conceitos completos | `semanticTriage.test.ts`, `matchingCandidatePagination.test.ts` | PASS | Qualidade depende da Knowledge publicada |
| D-03 | Fila seletiva independente de grupo/score | `semanticTriageDisposition` compartilhado; apenas `needs_interpretation` na fila | Sete trilhas sintéticas, 100 Perfis, positivos e negativos | PASS | Detector não garante recall universal para nomenclatura inédita |
| D-04 | Autoridade no servidor | `buildDeterministicMatch` incorpora decisão autorizada; handler reavalia gate antes de service/cache/provedor | `handler.test.ts`, `snapshot.test.ts`, 32 testes Deno | PASS | Sem chamada autenticada a Perfil real |
| D-05 | Resultado progressivo | Callback inicial e atualização por Perfil; UI de progresso e pendência | Teste de orquestração com 100 Perfis e IA atrasada; build web | PASS | Interação visual real ainda requer smoke autenticado |
| D-06 | Preservação | Fallback reaplica match pré-IA e alerta; decisões humanas mantidas na atualização | `semanticTriage.test.ts`, `handler.test.ts`, regressão de score | PASS | Falha em rede real não provocada em produção |
| D-07 | Escala verificável | Paginação de observações e evidências, triagem seletiva e primeira lista antecipada | 100 Perfis/8 pendências; 1.205 observações e evidências paginadas | PASS | Não é SLA de 100 currículos reais |

## Proibições verificadas

| ID | Guardrail | Teste negativo / evidência | Status |
| --- | --- | --- | --- |
| P-01 | Sem top-K, grupo fixo, score ou família única como veto | Todos os 100 passam pela descoberta; elegibilidade depende de evidência ocupacional | PASS |
| P-02 | Sem IA para contextual/resolvido, inclusive Edge | `handler.test.ts` verifica zero service/cache/provedor em request normal e snapshot | PASS |
| P-03 | Sem zero/C na falha, invenção ou mudança de score | Fallback e regressão `matchingScore.test.ts`; pesos/versionamento do score intocados | PASS |
| P-04 | Sem mistura de tenant/versão, currículo bruto ou telemetria sensível | Handler e RPC existentes preservados; diff não altera payload, auth ou logger | PASS |

## Mapa de Impacto e Preservação

| Capacidade / área | Relação | Baseline | Regressão executada | Status |
| --- | --- | --- | --- | --- |
| Descoberta e triagem | direct | Lista aguardava IA; gate aceitava todo conteúdo utilizável | 72 testes Node dirigidos, sete trilhas e 100 Perfis sintéticos | PASS |
| Lista, progresso, comparação e decisão | direct | Resposta única após IA; seleção e decisão humanas presentes | Callback inicial/por Perfil, build web, inspeção da UI e preservação de decisões | PARTIAL |
| Edge, auth, tenant, cache e snapshot | critical_transversal | Edge v9/JWT; reconstituição server-side | 32 testes Deno, incluindo negativos antes de cache/provedor; smoke remoto pendente | PARTIAL |
| Score, requisitos, Knowledge | plausible_indirect | Fórmula e Knowledge publicadas | Score dirigido, 1.205 linhas paginadas e falha fechada | PASS |
| Parser e publicação de Perfil | no_impact_identified | Fontes publicadas somente lidas | Diff sem escrita nesses fluxos; apenas leitura autorizada | PASS |
| Release web/Edge | direct | Produção em SHA anterior | Plano e publicação pendentes | NOT TESTED |

### Novidade e preservação

- Entrega local comprovada: descoberta ampla, gate seletivo também na Edge e resultados iniciais/progressivos com falha preservada.
- Capacidades preservadas: pesos e versões do Prisma Score, separação das evidências, decisões humanas e proteção tenant/versionamento nos testes dirigidos.
- Dependência descoberta durante o movimento: paginação de observações da Knowledge e Evidências Demonstradas para não truncar silenciosamente um lote de 100. Incorporada ao mapa como dependência direta da triagem confiável.
- Limitações: o corpus é sintético e não mede tempo de Supabase, provedor ou navegador com 100 currículos reais; nomenclaturas profissionais inéditas podem precisar de curadoria. Não foi feita avaliação paga em Pessoas reais.

## Fora de escopo preservado

| ID | Evidência no diff | Status |
| --- | --- | --- |
| F-01 | Sem schema, nova base, classificação manual ou reprocessamento | PASS |
| F-02 | Prompt, modelo, leituras, requisitos, pesos e dados reais intocados | PASS |

## Evidência de fidelidade visual

Não aplicável: não foi fornecida referência visual normativa; a mudança adapta a tela existente. Smoke visual autenticado permanece pendente.

## Desvios do contrato

Nenhum desvio identificado na implementação local. Evidência de implantação e smoke ainda pendentes; não declarar movimento concluído enquanto o mapa tiver `PARTIAL` ou `NOT TESTED`.

## Mudanças autorizadas durante a execução

Nenhuma mudança adicional de decisão do Product Owner após a aprovação da triagem seletiva. Paginação foi dependência técnica direta para D-07, sem mudança de regra de produto.

## Validação local

`pnpm run typecheck`, `pnpm run build`, `pnpm run build:web`, `pnpm run lint`, `pnpm run check:matching-runtime`, `pnpm run generate:prisma-context`, `pnpm run check:prisma-context`; 72 testes Node dirigidos e 32 testes Deno de `matching-trajectory`. Registrar os resultados finais e o SHA no fechamento.

## Git / QA / ambiente

Branch `codex/occupational-ai-triage`. Sem ambiente remoto QA separado: Supabase e VPS existentes são produção, apesar do rótulo legado Prisma-QA. Gate QA executado com fixtures sintéticas locais; verificação remota deve ser proporcional e sem IA paga em Perfis reais.

## Conclusão

Entrega local em validação; release e smoke ainda pendentes.
