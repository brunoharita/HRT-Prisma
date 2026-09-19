# AoT — M7.7 Governança Empresa → Global da Knowledge

Contrato de referência: `docs/qa/agreement-m77-knowledge-company-global-governance.md` 1.0.0.

## Matriz de Acordos

| ID | Acordo | Implementação | Teste | Evidência | Status | Ambiente / limitação |
| --- | --- | --- | --- | --- | --- | --- |
| D-01 | Criação local imediata por `owner`/`admin` | `propose_knowledge_concept_from_inbox` aprova a proposta de empresa na mesma transação | suíte M7.7; typecheck e suíte completa | migration `20260919040000`; 526 testes locais PASS | PASS | Produção recebeu a migration; jornada autenticada ainda não foi executada nesta entrega |
| D-02 | Contribuição global sanitizada e rastreável | origem de empresa/conceito, idempotência e payload sanitizado | suíte M7.7; inspeção remota das funções | migrations `20260919040000` e `20260919041500` aplicadas | PASS | Sem criação de dados de teste em produção |
| D-03 | Empresa prevalece sobre Global | reuso do resolvedor M5.2, sem nova regra paralela | regressão `organization Knowledge overlays Global without mutating it` | suíte completa PASS | PASS | Não reprocessa históricos |
| D-04 | Candidatos globais apenas informativos | snapshot de candidatos exato/prefixo no payload e cards de revisão | suíte M7.7 | migration `20260919041500`; build web PASS | PASS | Não usa substring curto, score opaco ou associação automática |
| D-05 | Super Admin decide a fila global | fila somente Super, pesquisa, aprovar, manter local ou rejeitar com motivo | visibilidade e M7.7; build web; smoke autenticado | políticas RLS e RPC aplicada; `bruno.harita`/Super Admin abriu `Conhecimento > Propostas` | PASS | Fila vazia; nenhuma ação de escrita foi necessária |
| D-06 | IA externa sob demanda e auditável | `knowledge-agent` recebe contribuição autorizada, mantém sanitização/orçamento/fontes e reusa pesquisa pronta | contrato M7.7; deploy da Function ACTIVE v18 | Function `knowledge-agent` ACTIVE; nenhuma chamada paga de teste | PASS | Não foi disparada pesquisa externa com dado real/sintético |
| D-07 | Decisão global preserva origem local | RPC de adiar/rejeitar só altera a contribuição Global e registra `local_origin_preserved` | teste estático M7.7 e revisão SQL | migration `20260919041500` aplicada | PASS | Sem decisão humana artificial em produção |
| D-08 | Autor, escopo, origem, versão e decisão auditáveis | colunas de origem, change sets e `knowledge_approvals`; grants mínimos | inspeção de migration, ledger e suíte completa | ledger 136 mapeadas, sem migration local pendente | PASS | RLS efetiva depende da sessão autenticada para a prova de interface |

## Proibições verificadas

| ID | Guardrail | Teste negativo | Evidência | Status |
| --- | --- | --- | --- | --- |
| P-01 | Similaridade/IA não publica nem reprocessa automaticamente | candidatos são informativos; IA é botão explícito | migrations e UI revisadas | PASS |
| P-02 | Pesquisa externa não recebe PII/segredos | contrato sanitizado existente do `knowledge-agent` | teste `research payload contains only a sanitized concept and blocks PII` PASS | PASS |
| P-03 | Empresa não acessa fila/Global de outra empresa | RLS de propostas/approvals só Super; visibilidade local retorna falso | testes `knowledgeProposalVisibility` PASS | PASS |
| P-04 | Auditoria não é apagada | decisões inserem `knowledge_approvals`; origem é FK restritiva | migrations aplicadas | PASS |

## Fora de escopo preservado

| ID | Evidência no diff | Status |
| --- | --- | --- |
| F-01 | Sem CRUD genérico, massa ou reinterpretação retroativa | PASS |
| F-02 | Reuso de `knowledge-agent`; sem provider, embedding ou pesquisa automática | PASS |
| F-03 | Nenhuma alteração de Matching, extração ou taxonomias M7.1/M7.2 | PASS |

## Evidência de fidelidade visual

Não aplicável: não houve referência visual normativa. Foram reutilizados `Tabs`, `PrismaCard`, `Alert`, `Input` e `Button` existentes; `pnpm run build:web` PASS.

## Desvios do contrato

Nenhum desvio. A pesquisa externa não foi executada para fabricar uma decisão ou gerar custo: a Function publicada e a ação explícita são a evidência técnica disponível.

## Mudanças autorizadas durante a execução

O Product Owner autorizou o contrato e a implementação M7.7. A complementação de candidatos informativos e de decisões “manter somente local”/“rejeitar” foi necessária para satisfazer D-04 e D-05, sem ampliar o domínio.

## Validação final

- `pnpm run typecheck:web` — PASS.
- `pnpm run build:web` — PASS; avisos preexistentes de chunk/dynamic import, sem falha.
- `pnpm run generate:prisma-context` e `pnpm run check:prisma-context` — PASS.
- `pnpm run check:supabase-ledger` — PASS; 136 mapeadas, zero migration local pendente; `db push` geral continua bloqueado.
- `pnpm run test` — PASS, 526 testes.
- Supabase: migrations `20260919040000` e `20260919041500` aplicadas e registradas; funções M7.7 confirmadas. `knowledge-agent` ACTIVE, versão 18.
- `supabase db lint --linked` executou e reportou erros/warnings históricos em rotinas anteriores, sem apontar a migration M7.7; não foram corrigidos por estarem fora do escopo.

## Git / QA / ambiente

O banco e a Function foram publicados no projeto `ioldpnqqvobprjiontre`. O SHA `705f306a62a8864cbb60a9930da2843d1a803ef5` foi validado pelo dispatcher e promovido por fast-forward para `main`/GitHub. Após a configuração explícita do alias SSH `prisma-vps`, o deploy controlado atualizou a VPS `/opt/prisma` para `040400d6cec14c8d00a3c467c26394bc8991e5c3`, recriou somente `prisma-web` e preservou a imagem anterior. Verificação independente: container `running`, zero reinícios e HTTPS `200`. O smoke autenticado em 2026-09-19 reconheceu `bruno.harita` como Super Admin e abriu `Conhecimento > Propostas`, com fila vazia. Nenhuma contribuição ou decisão de teste foi criada.

## Conclusão

Implementação, publicação, smoke técnico e inspeção visual autenticada: PASS. A fila estava vazia; a jornada de decisão com dado real permanece para o próximo caso legítimo, sem fabricar uma contribuição de teste.

## Correção posterior do teste de visibilidade (2026-09-19)

O CI da `main` no baseline `a792c69` falhou porque `m77KnowledgeCompanyGlobalGovernance.test.ts` proibia a aba `Propostas` no ramo reservado ao Super Admin, contrariando D-05/CA-D05 e a interface já entregue. Com autorização específica do PO, o commit `0815b94` substituiu essa expectativa por verificações de presença da aba para `profile === "super_admin"` e ausência no ramo da empresa. Nenhum runtime, RLS, RPC, dado ou decisão de curadoria foi alterado. Build, lint e seis testes dirigidos de M7.7/visibilidade passaram localmente; CI da branch `35452735434` e da `main` `35452848899` passaram. A prova de autorização server-side original permanece nas migrations e no serviço; esta correção cobre somente a expectativa de navegação.
