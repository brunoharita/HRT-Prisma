---
prisma_context_id: technical-reference
owner: engineering-security
status: current
version: 1.3.0
last_verified: 2026-08-24
---

# Referência técnica do Prisma

## Stack

TypeScript estrito, Node.js 22+, pnpm, testes nativos do Node, CLI, Vite para o shell web, PostgreSQL/Supabase como contrato de produção e JSON tenant-scoped para execução local.

## Arquitetura

`src/domain` define contratos; `src/application` orquestra; `src/ai` implementa boundary, regras, retrieval e matching; `src/infrastructure` implementa repository; `src/cli.ts` demonstra o fluxo; `web/src` hospeda o shell web com Supabase Auth, route guards, M2-A e M2-B. PDF.js e Tesseract.js processam PDFs no navegador; o adaptador Supabase persiste documentos, tentativas, páginas, drafts, evidências e perfis. `supabase/functions` hospeda o boundary mínimo para `username`, recuperação de acesso e gestão de operadores. A convenção local atual usa porta `5555` para o app principal e `5556` para a variante QA.

## Banco

A foundation migration cria organizações, memberships, unidades, papéis, posições, vagas, pessoas, dados privados, documentos, perfis, evidências, inferências, competências, requisitos, avaliações e telemetria. O M2-A adiciona `organization_groups`, `platform_users`, `platform_user_audit_events`, `organizations.group_id` e a evolução do contrato de `membership_role`. O M2-B adiciona Storage privado, tentativas, páginas, drafts, eventos e a RPC `persist_person_extraction`. `organization_id`, foreign keys compostas, índices, grants e RLS formam a estratégia multi-tenant aceita.

Foundation, M2-A e M2-B estão ativos no Prisma-QA. O adaptador Supabase atende leituras e mutações autorizadas do frontend, enquanto operações compostas sensíveis usam Edge Functions ou RPC transacional.

## Segurança

Autorização usa membership persistida e `platform_users`, não `user_metadata`. `anon` não recebe grants. `member` não lê documento ou PII privada. O shell web valida sessão com `getClaims()` e usa apenas a chave publicável. Secret/service key nunca vai para frontend. Documento é input não confiável.

## Ambientes

Local existe para CLI e shell web. O projeto Supabase `Prisma-QA` (`ioldpnqqvobprjiontre`) é o único backend remoto atual e possui foundation, M2-A, M2-B e as três Edge Functions ativos. Login, Usuários, Pessoas, texto, PDF nativo, OCR e perfil versionado foram comprovados com dados sintéticos. Por decisão do produto, frontend hospedado e ambiente de produção separado foram adiados enquanto o uso permanece interno e sem clientes.

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
