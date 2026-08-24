---
prisma_context_id: technical-reference
owner: engineering-security
status: current
version: 1.2.0
last_verified: 2026-08-24
---

# Referência técnica do Prisma

## Stack

TypeScript estrito, Node.js 22+, pnpm, testes nativos do Node, CLI, Vite para o shell web, PostgreSQL/Supabase como contrato de produção e JSON tenant-scoped para execução local.

## Arquitetura

`src/domain` define contratos; `src/application` orquestra; `src/ai` implementa boundary, regras, retrieval e matching; `src/infrastructure` implementa repository; `src/cli.ts` demonstra o fluxo; `web/src` hospeda o shell web com Supabase Auth e route guards. `supabase/functions` hospeda o boundary mínimo para `username`, recuperação de acesso e gestão de operadores. A convenção local atual usa porta `5555` para o app principal e `5556` para a variante QA.

## Banco

A foundation migration cria organizações, memberships, unidades, papéis, posições, vagas, pessoas, dados privados, documentos, perfis, evidências, inferências, competências, requisitos, avaliações e telemetria. O M2-A adiciona localmente `organization_groups`, `platform_users`, `platform_user_audit_events`, `organizations.group_id` e a evolução do contrato de `membership_role`. `organization_id`, foreign keys compostas, índices, grants e RLS formam a estratégia multi-tenant aceita.

Migration existente não significa banco ativo. O adaptador Supabase para dados do domínio já atende leituras web da foundation, enquanto a nova mutation M2-A permanece apenas como contrato local até existir evidência remota explícita.

## Segurança

Autorização usa membership persistida e `platform_users`, não `user_metadata`. `anon` não recebe grants. `member` não lê documento ou PII privada. O shell web valida sessão com `getClaims()` e usa apenas a chave publicável. Secret/service key nunca vai para frontend. Documento é input não confiável.

## Ambientes

Local existe para CLI, shell web e Edge Functions versionadas. QA remoto existe no projeto Supabase `Prisma-QA` (`ioldpnqqvobprjiontre`) com schema inicial aplicado para Auth e validação de acesso. O novo movimento M2-A ainda não foi aplicado nem validado remotamente. Produção continua não provisionada. Mudança sensível deve seguir local, QA, evidência, aprovação, produção e smoke.

## Comandos

```bash
pnpm install
pnpm run validate
pnpm run demo
pnpm run dev:web
pnpm run dev:web:qa
pnpm run build:web
pnpm run generate:prisma-context
pnpm run check:prisma-context
```

## Contratos e decisões

Catálogo: `docs/architecture/contracts.md`. Versionamento: `versioning.md`. ADRs aceitos: stack, RLS multi-tenant, boundary do provider, versionamento de IA, Context Pack e o boundary `username + group scope + platform users`.

## Operação

Telemetria básica existe. Audit log, domain events completos, alerts, deployment e incident owners não estão implementados. `.prisma-data`, `dist`, `node_modules`, `.env*` e caches ficam fora do Git.
