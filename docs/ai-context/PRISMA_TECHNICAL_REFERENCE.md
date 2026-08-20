---
prisma_context_id: technical-reference
owner: engineering-security
status: current
version: 1.0.0
last_verified: 2026-08-20
---

# Referência técnica do Prisma

## Stack

TypeScript estrito, Node.js 22+, pnpm, testes nativos do Node, CLI, PostgreSQL/Supabase como contrato de produção e JSON tenant-scoped para execução local.

## Arquitetura

`src/domain` define contratos; `src/application` orquestra; `src/ai` implementa boundary, regras, retrieval e matching; `src/infrastructure` implementa repository; `src/cli.ts` demonstra o fluxo.

## Banco

A migration cria organizações, memberships, unidades, papéis, posições, vagas, pessoas, dados privados, documentos, perfis, evidências, inferências, competências, requisitos, avaliações e telemetria. `organization_id`, foreign keys compostas, índices, grants e RLS formam a estratégia multi-tenant aceita.

Migration existente não significa banco ativo. O adaptador Supabase ainda não existe.

## Segurança

Autorização usa membership persistida, não `user_metadata`. `anon` não recebe grants. Hiring manager não lê documento ou PII privada. Secret/service key nunca vai para frontend. Documento é input não confiável.

## Ambientes

Somente local existe. QA e produção estão documentados, mas não provisionados. Mudança sensível deve seguir local, QA, evidência, aprovação, produção e smoke.

## Comandos

```bash
pnpm install
pnpm run validate
pnpm run demo
pnpm run generate:prisma-context
pnpm run check:prisma-context
```

## Contratos e decisões

Catálogo: `docs/architecture/contracts.md`. Versionamento: `versioning.md`. ADRs aceitos: stack, RLS multi-tenant, boundary do provider, versionamento de IA e Context Pack.

## Operação

Telemetria básica existe. Audit log, domain events completos, alerts, deployment e incident owners não estão implementados. `.prisma-data`, `dist`, `node_modules`, `.env*` e caches ficam fora do Git.
