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
| Lista, progresso, comparação e decisão | direct | Resposta única após IA; seleção e decisão humanas presentes | Callback inicial/por Perfil, build web, inspeção da UI, preservação de decisões, bundle publicado e HTTP 200 | PASS |
| Edge, auth, tenant, cache e snapshot | critical_transversal | Edge v10/JWT; reconstituição server-side | 32 testes Deno, negativos antes de cache/provedor, v11 ACTIVE/JWT, 12 arquivos idênticos e POST anônimo 401 | PASS |
| Score, requisitos, Knowledge | plausible_indirect | Fórmula e Knowledge publicadas | Score dirigido, 1.205 linhas paginadas e falha fechada | PASS |
| Parser e publicação de Perfil | no_impact_identified | Fontes publicadas somente lidas | Diff sem escrita nesses fluxos; apenas leitura autorizada | PASS |
| Release web/Edge | direct | Produção em `77068e9` e Edge v10 | Plano 1.0.1: sem banco, só `matching-trajectory` e `prisma-web`; CI PASS, main/GitHub/VPS no SHA funcional, HTTP 200 e zero reinícios | PASS |

### Novidade e preservação

- Entrega comprovada por testes e publicação: descoberta ampla, gate seletivo na Edge e resultados iniciais/progressivos com falha preservada.
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

Nenhum desvio de regra identificado. O smoke HTTP automático do script recebeu 404 imediatamente após a recriação, mas verificação subsequente confirmou `/`, `/login` e `/index.html` com 200, contêiner `running` e zero reinícios. O procedimento não testou a lista autenticada com Pessoas reais para evitar gasto de IA; isso é limitação de evidência, não prova de falha ou de latência real.

## Mudanças autorizadas durante a execução

Nenhuma mudança adicional de decisão do Product Owner após a aprovação da triagem seletiva. Paginação foi dependência técnica direta para D-07, sem mudança de regra de produto.

## Validação local

`pnpm run typecheck`, `pnpm run build`, `pnpm run build:web`, `pnpm run lint`, `pnpm run check:matching-runtime`, `pnpm run generate:prisma-context`, `pnpm run check:prisma-context`; 72 testes Node dirigidos e 32 testes Deno de `matching-trajectory`. O CI `36652901031` executou a fundação completa, ledger, script seletivo e auditoria de dependências com resultado PASS. Duas tentativas anteriores de CI detectaram Context Pack gerado com documento não rastreado da pasta local; os exports foram regenerados num checkout isolado e limpo, sem tocar naquele documento, antes do CI aprovado.

## Git / QA / ambiente

SHA funcional `3fd1a8703bcd717f5b597515785ededd32281b75` integrado por fast-forward em `main`, `origin/main` e `/opt/prisma` da VPS. Sem ambiente remoto QA separado: Supabase e VPS existentes são produção, apesar do rótulo legado Prisma-QA. Gate QA com fixtures sintéticas locais, sem LLM ou banco real. Edge `matching-trajectory` v11 ACTIVE, `verify_jwt=true`, bundle `c8679df77e97fb90dccd9c1a3e5670061953276bbacad1728d19c51237a01b04`; os 12 arquivos remotos são idênticos ao bundle local e POST anônimo retornou 401. Web `prisma-web` imagem `sha256:d7b5d6d13b38b4ea13f81e1e1cbbcde95d912c3a68eda5ec4ad27494bfc21805`, `running`, zero reinícios; rollback `prisma-web:rollback-before-3fd1a8703bcd` preservado. `models/` não rastreado na VPS e os quatro itens não rastreados do checkout principal permaneceram intactos.

## Conclusão

Implementação, integração e publicação concluídas nas superfícies planejadas, com smoke técnico proporcional. A busca autenticada com Perfis reais, o tempo com 100 currículos e a taxa de falsos negativos ocupacionais não foram medidos; não há promessa de SLA ou recall universal.
