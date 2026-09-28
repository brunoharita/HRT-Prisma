# AoT — M8.6 Matching profissional universal

Contrato de referência: `docs/qa/agreement-m86-universal-professional-matching.md` v1.0.0; execução: `docs/qa/execution-m86-universal-professional-matching.md`. Baseline: `98bb6cc919d1c90dac04a0bf7e2cf1d6cc1674d2`.

## Matriz de Acordos

| ID | Acordo | Implementação | Teste | Evidência | Status | Ambiente / limitação |
| --- | --- | --- | --- | --- | --- | --- |
| D-01/D-02 | Knowledge-first e IA como último recurso | Relações internas confirmadas encerram interpretação; provider só é chamado para relação não resolvida | Deno cache/AI disabled; orchestration tests | `vacancyService.ts`, `handler.test.ts` | PASS | lógica local validada; smoke remoto foi somente de autenticação |
| D-03 | Cobertura universal e filtro de Perfil vazio | `isSemanticPilot` aceita título não vazio; `hasUsableProfessionalContent` filtra antes da IA | `semanticTriage.test.ts`, Deno triage | 115 Node + 28 Deno | PASS | universalidade sem qualidade universal comprovada |
| D-04/D-05 | Categorias, grupos e cálculo determinísticos | Categorias 2.0, A/B/C e score 1.4.0 compartilhados no web/runtime gerado | semântica, score e runtime | `check:matching-runtime`; 115 Node | PASS | corpus histórico ainda majoritariamente técnico |
| D-06/D-07 | Limites semânticos e híbridos | Prompt fechado, citações literais e ausência de inferência; composição preservada no domínio | corpus contrastado e parser negativo | `semanticTrajectory.test.ts` | PARTIAL | híbridos têm contrato e rota, mas falta corpus específico universal |
| D-08 | Política temporal explícita | `experience_policy` e `temporalApplicable` removem tempo somente em `not_required` | score temporal existente + typecheck | migration e `matchingScore.ts` | PASS | coluna remota confirmada; smoke autenticado de UI pendente |
| D-09 | Penalização simétrica de senioridade | Marcadores explícitos; ajuste -1/-4 acima e abaixo | teste dedicado | `semanticTriage.test.ts` | PASS | sem inferência por anos/título genérico |
| D-10 | Aprendizado governado | RPC enfileira Inbox e request tenant-scoped após confirmação; não publica | typecheck, SQL review e contrato de RPC | migration M8.6 | PARTIAL | revisão conectada da Inbox ainda pendente |
| D-11 | Autoridade e proveniência | versões, tenant, snapshot, cache, citações e guardas preservados | 28 Deno de segurança/snapshot | handler/snapshot suites + inspeção remota | PASS | migration e Edge ativos; smoke funcional autenticado pendente |

## Proibições verificadas

| ID | Guardrail | Teste negativo | Evidência | Status |
| --- | --- | --- | --- | --- |
| P-01 | Sem equivalência lexical automática | corpus de cargos distintos e título sem marcador de senioridade | prompt/schema e função determinística | PASS |
| P-02 | Ausência/erro não vira incapacidade ou score zero | pending, unavailable, malformed e triage vazio | 115 Node + 28 Deno | PASS |
| P-03 | Sem base paralela/publicação automática | RPC somente Inbox/review; tabela de fila sem publicação | migration e grants | PASS |
| P-04 | Sem PII/currículo integral/provider body | sanitização, input hash e envelope negativo | semanticTrajectory e handler tests | PASS |
| P-05 | Sem decisão de contratação | score/reading fechados e decisão humana separada | domínio e UI | PASS |
| P-06 | Sem alegação de qualidade universal | limitação registrada e CA-07 parcial | este AoT | PASS |

## Mapa de Impacto e Preservação

| Capacidade protegida / área | Relação | Impacto previsto | Baseline | Regressão executada | Evidência | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Interpretação/prompt | direct | universalizar categorias e contexto mínimo | M8.3 v1.2 | corpus, schema, duas leituras | 115 Node | PASS |
| Matching web/Edge gerado | direct | manter cálculo e espelho | matching 1.4.0 / runtime atual | typecheck, build, runtime check, Deno | comandos acima | PASS |
| Auth/RLS/cache/snapshot | critical_transversal | aceitar versão nova sem reescrever histórico | M8.3/M8.4 | negativos de autoridade, tenant, stale, forged input | 28 Deno | PASS |
| Position/temporal policy | direct | persistir regra explícita por versão | vacancy-definition 1.3.0 | typecheck, migration review | migration M8.6 | PARTIAL |
| Knowledge | direct | leitura anterior e proposta humana reutilizável | Knowledge Inbox existente | grants/RPC e revisão estática | migration M8.6 | PARTIAL |
| UI de Posições/matching | plausible_indirect | exibir experiência anterior e proposta de aprendizado | Vagas local | typecheck/build | `build:web` | PASS |
| Parser/publicação de Perfil | no_impact_identified | somente leitura de Perfil publicado | contratos existentes | diff e testes | sem alteração de publicação | PASS |

### Novidade e preservação

- Entrega nova comprovada: interpretação universal, filtro pré-IA, política temporal, senioridade explícita e fila de aprendizado.
- Capacidades preservadas comprovadas: isolamento tenant/server-side, histórico, score determinístico, snapshots, citações e falhas fechadas.
- Relações reclassificadas: o antigo veto lexical de piloto foi substituído por cobertura universal; categorias antigas permanecem somente para compatibilidade histórica.
- Limitações de baseline/evidência: não há corpus universal independente nem smoke funcional autenticado; o corpus M8.3 não prova todas as profissões. O smoke remoto executado foi deliberadamente anônimo e somente confirmou a barreira de autenticação.

## Fora de escopo preservado

| ID | Evidência no diff | Status |
| --- | --- | --- |
| F-01 | sem embeddings, novo fornecedor, taxonomia paralela, pesquisa de Pessoas ou backfill | PASS |
| F-02 | requisitos, pesos e decisão de contratação não foram substituídos | PASS |
| F-03 | RPC cria Inbox/review, não publicação Global automática | PASS |

## Evidência de fidelidade visual

Não aplicável: não houve screenshot ou referência visual normativa. A alteração visual é limitada ao controle explícito de política de experiência e à ação de proposta, validada por build/typecheck; comparação visual autenticada permanece pendente do smoke.

## Desvios do contrato

Nenhum desvio intencional identificado. CA-04, CA-06, CA-07 e CA-08 permanecem `PARTIAL` até corpus/Inbox conectado, release e smoke proporcional.

## Mudanças autorizadas durante a execução

Nenhuma mudança de produto além do acordo congelado. O teste Deno do piloto foi atualizado para esperar a versão universal 2.0/7.0 e admitir conteúdo profissional utilizável, preservando os negativos de segurança.

## Validação final

- `pnpm run typecheck` PASS.
- `pnpm run typecheck:web` PASS.
- `pnpm run build` PASS.
- `pnpm run build:web` PASS, com warnings históricos de chunk grande/dynamic import.
- `pnpm run lint` PASS (725 arquivos).
- `pnpm run check:foundation` PASS.
- `pnpm run check:prisma-context` PASS.
- `pnpm run check:matching-runtime` PASS.
- Node direcionado: 115/115 PASS.
- Deno Edge direcionado: 28/28 PASS.
- `pnpm run check:supabase-ledger`: PASS como diagnóstico; migration M8.6 aparece pendente local e o CLI de banco não está instalado neste ambiente.
- `pnpm run release:plan`: PASS; superfícies detectadas: database, matching-trajectory Edge, web/VPS, Context Pack, documentação e testes.

## Evidência remota de migration e Edge

- Migration aplicada pelo conector Supabase no projeto configurado: registro remoto `20260928023716` com nome `20260927130000_m86_universal_professional_matching`.
- Consulta SQL somente leitura confirmou `experience_policy`, `knowledge_relation_learning_requests`, `enqueue_position_relation_learning(...)` e uma policy tenant-scoped na fila.
- Edge Function `matching-trajectory`: ACTIVE, versão 7, `verify_jwt=true`, hash de bundle `8563aac2a3238a409d0b6f503843760144918b99b2e37a76042da81b55d00167`.
- POST anônimo sem token ao endpoint retornou HTTP 401 `UNAUTHORIZED_NO_AUTH_HEADER`; nenhuma Pessoa, relação ou proposta foi criada em produção.

## Git / QA / ambiente

Implementação isolada na branch `codex/m86-universal-professional-matching`, com commit local validado. Migration e Edge já estão publicados com a evidência acima; integração em `main` e publicação web/VPS ainda dependem do fechamento seletivo deste SHA. Produção não foi usada como ambiente de teste.

## Conclusão

`PARTIAL`: implementação, validação local direcionada, migration remota e Edge aprovados; integração em `main`, publicação web/VPS, smoke autenticado e confirmação conectada do fluxo Knowledge Inbox ainda permanecem para concluir M8.6.
