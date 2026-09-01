---
prisma_context_id: technical-reference
owner: engineering-security
status: current
version: 1.7.0
last_verified: 2026-08-31
---

# Referência técnica do Prisma

## Stack

TypeScript estrito, Node.js 22+, pnpm, testes nativos do Node, CLI, Vite para o shell web, PostgreSQL/Supabase como contrato de produção e JSON tenant-scoped para execução local.

## Arquitetura

`src/domain` define contratos, incluindo normalização Knowledge; `src/ai` contém providers determinísticos e a abstração de pesquisa. `web/src` hospeda o shell, o módulo Conhecimento e o motor de evidência visual. `spatialEvidence` converte unidades PDF.js/OCR para `normalized-page-v1`, de modo que seleção, texto, refinamento e destaque independam do zoom. `supabase/functions/knowledge-agent` é o boundary opcional para Responses API/Web Search.

## Banco

A foundation migration cria organizações, memberships, unidades, papéis, posições, vagas, pessoas, dados privados, documentos, perfis, evidências, inferências, competências, requisitos, avaliações e telemetria. O M2-A adiciona grupos e operadores; o M2-B adiciona Storage privado, tentativas, páginas e drafts; o M2-C adiciona operações idempotentes, retries, revisões, mudanças por campo e promoção atômica de perfil. O currículo-first adiciona `resume_intakes` antes da criação de Pessoa e resolve criar/vincular em transação. `organization_id`, foreign keys compostas, índices, grants e RLS formam a estratégia multi-tenant aceita.

A publicação Delta adiciona `profile_publication_removals` como ledger imutável e `publish_profile_review` como autoridade cliente. A RPC mescla perfil-base e proposta, preserva omissões, aplica somente remoções explícitas e chama a promoção atômica interna. A antiga `approve_profile_review` não possui mais grant para `authenticated`.

Foundation, M2-A, M2-B, M2-C, intake currículo-first e as migrations M4 estão ativos no Prisma-QA. Leituras usam RLS; mutações compostas sensíveis usam Edge Functions ou RPCs controladas, com DML direto revogado nas tabelas críticas M2-C/intake/Knowledge.

O Movimento 4 adiciona 16 tabelas Knowledge, RLS global/tenant, source versions, change sets, resolução com precedência, Inbox, research/proposals, impacts e jobs. Reinterpretação prepara um draft `profile_reviews` e a promoção continua em M2-C. As migrations `20260826204413_m4_knowledge_foundation` e `20260826205027_m4_knowledge_indexes_rls` estão aplicadas ao QA.

O M5.1 possui apenas arquitetura documental planejada para Verification Need, Policy, Definition, Item Bank, Blueprint, Composer, Attempt, Integrity Analysis e Demonstrated Evidence. Nenhuma tabela, migration, RPC, Edge Function, componente ou integração do M5.1 existe no runtime atual.

## Segurança

Autorização usa membership persistida e `platform_users`, não `user_metadata`. `anon` não recebe grants. `member` não lê documento ou PII privada nem publica perfil. O shell web valida sessão com `getClaims()` e usa apenas a chave publicável. Secret/service key nunca vai para frontend. Documento é input não confiável.

## Ambientes

Local existe para CLI e shell web. O projeto Supabase `Prisma-QA` (`ioldpnqqvobprjiontre`) é o único backend remoto atual e possui foundation, M2-A, M2-B, M2-C, intake currículo-first, M4 e quatro Edge Functions ativas. Login, Usuários, Pessoas, PDF/OCR, concorrência, retry, revisão, aprovação, resolução currículo-first e resolução Knowledge foram comprovados com dados sintéticos. `knowledge-agent` está implantada com JWT obrigatório, porém sem pesquisa externa ativada. Por decisão do produto, frontend hospedado e ambiente de produção separado foram adiados enquanto o uso permanece interno e sem clientes.

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

Catálogo: `docs/architecture/contracts.md`. Knowledge: `professional-concept-architecture.md`. Jornada e Delta: ADR-025. M5.1: `docs/product/m5-1-competency-verification.md`, `docs/architecture/competency-verification-architecture.md`, `docs/ai/competency-verification-evaluation.md`, `docs/security/competency-verification-security.md`, `docs/qa/competency-verification-test-plan.md` e ADR-026 proposto.

## Operação

Telemetria básica e eventos operacionais de ingestão/revisão existem. Auditoria global, alerts, deployment automatizado e incident owners não estão completos. `.prisma-data`, `dist`, `node_modules`, `.env*` e caches ficam fora do Git.
