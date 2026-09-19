# AoT — Visibilidade de propostas da Knowledge

Contrato: `docs/qa/agreement-knowledge-proposal-visibility.md` 1.0.0. Execução: `docs/qa/execution-knowledge-proposal-visibility.md`. Data: 2026-09-19.

## Matriz de Acordos

| ID | Acordo | Implementação | Teste / evidência | Status | Limitação |
| --- | --- | --- | --- | --- | --- |
| D-01 | Super Admin vê Global e empresa ativa | `isKnowledgeProposalVisible` filtra por `organizationId` ativo | testes positivo e negativo; CI/main | PASS | depende da empresa ativa já autorizada pela sessão/RLS |
| D-02 | Alcance explícito no card | `KnowledgePage` mostra `Global Prisma` ou `Empresa ativa` | teste de fonte, typecheck e build web | PASS | inspeção visual autenticada posterior permanece manual |
| D-03 | Aprovação server-side preservada | somente leitura cliente mudou | revisão do diff: nenhuma migration/RPC/RLS; `require_knowledge_admin` inalterado | PASS | nenhuma |

## Proibições verificadas

| ID | Guardrail | Evidência | Status |
| --- | --- | --- | --- |
| P-01 | Outra empresa não aparece | teste com `org-b` e empresa ativa `org-a` | PASS |
| P-02 | Nenhum conceito foi criado, aprovado ou associado | diff e Supabase sem mutação | PASS |
| P-03 | Sem alteração de RLS, schema, RPC ou histórico | diff contém somente web, teste e documentação | PASS |

## Fora de escopo preservado

| ID | Evidência | Status |
| --- | --- | --- |
| F-01 | Nenhuma mudança em reinterpretação, taxonomia, normalização ou pesquisa | diff revisado | PASS |
| F-02 | A proposta `Transformação operacional` permaneceu em revisão | nenhuma escrita de curadoria foi executada | PASS |

## Evidência visual

| Referência / viewport | Evidência | Status |
| --- | --- | --- |
| Captura do Perfil fornecida pelo PO | a topologia não foi alterada; o card em `Conhecimento > Propostas` ganha somente a etiqueta de alcance | implementação PASS por build/teste; smoke autenticado manual pendente |

## Desvios do contrato

Nenhum. O deploy inicial encontrou o checkout da VPS atrasado; ele foi sincronizado por fast-forward antes da reconstrução. O primeiro smoke recebeu 502 transitório na partida do container; leitura posterior confirmou `prisma-web` em execução, zero reinícios e HTTPS 200.

## Validação final

- `pnpm run generate:prisma-context` e `pnpm run check:prisma-context`: PASS.
- `pnpm run typecheck:web` e `pnpm run build:web`: PASS.
- `pnpm run test`: 523/523 PASS no fechamento do AoT.
- CI da branch: `35417835714` PASS; CI da main: `35417962769` PASS.

## Git / ambiente

- Implementação funcional: `2230d152597a465e8c821beb03a0f9215d0bb85c`, integrada por fast-forward em `main` e GitHub.
- VPS `/opt/prisma`: mesmo SHA; somente `prisma-web` foi recriado. Supabase, Edge Functions, gateway, workers e Traefik não foram alterados.
- Smoke posterior: HTTPS 200; container `running`, `RestartCount=0`. Itens preexistentes `models/`, `.tmp.driveupload/` e `services/paddle/Dockerfile.gpu` preservados.

## Conclusão

A proposta da empresa ativa volta a aparecer para Super Admin em `Conhecimento > Propostas`, com etiqueta de alcance e o botão existente de aprovação. A decisão de aprovar `Transformação operacional` continua humana, explícita e fora desta correção.
