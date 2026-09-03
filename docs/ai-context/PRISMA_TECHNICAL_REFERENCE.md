---
prisma_context_id: technical-reference
owner: engineering-security
status: current
version: 1.9.0
last_verified: 2026-09-03
---

# Referência técnica do Prisma

## Stack

TypeScript estrito, Node.js 22+, pnpm, testes nativos do Node, CLI, Vite para o shell web, PostgreSQL/Supabase como contrato de produção e JSON tenant-scoped para execução local.

## Arquitetura

`src/domain` define contratos, incluindo normalização Knowledge; `src/ai` contém providers determinísticos e a abstração de pesquisa. `web/src` hospeda o shell, o módulo Conhecimento e o motor de evidência visual. `spatialEvidence` converte unidades PDF.js/OCR para `normalized-page-v1`, de modo que seleção, texto, refinamento e destaque independam do zoom. `supabase/functions/knowledge-agent` é o boundary opcional para Responses API/Web Search.

## Banco

A foundation migration cria organizações, memberships, unidades, papéis, posições, vagas, pessoas, dados privados, documentos, perfis, evidências, inferências, competências, requisitos, avaliações e telemetria. O M2-A adiciona grupos e operadores; o M2-B adiciona Storage privado, tentativas, páginas e drafts; o M2-C adiciona operações idempotentes, retries, revisões, mudanças por campo e promoção atômica de perfil. O currículo-first adiciona `resume_intakes` antes da criação de Pessoa e resolve criar/vincular em transação. `organization_id`, foreign keys compostas, índices, grants e RLS formam a estratégia multi-tenant aceita.

A publicação Delta adiciona `profile_publication_removals` como ledger imutável e `publish_profile_review` como autoridade cliente. A RPC mescla perfil-base e proposta, preserva omissões, aplica somente remoções explícitas e chama a promoção atômica interna. A antiga `approve_profile_review` não possui mais grant para `authenticated`.

O aprendizado estrutural v3 preserva linhas PDF.js/Tesseract, aprende assinatura somente no documento atual e usa RPCs fail-closed para auditar detecção/descarte e aplicar sugestões com regiões complementares por campo. A migration `20260902003617_m5_sibling_block_learning` está ativa no Prisma-QA; a RPC v2 permanece compatível.

Foundation, M2-A, M2-B, M2-C, intake currículo-first e as migrations M4 estão ativos no Prisma-QA. Leituras usam RLS; mutações compostas sensíveis usam Edge Functions ou RPCs controladas, com DML direto revogado nas tabelas críticas M2-C/intake/Knowledge.

O Movimento 4 adiciona a fundação Knowledge. O M5.2 a estende com source ingestion por CSV, SHA-256, manifestos, staging RLS, diff, publicação humana, source version corrente, observações ligadas ao Perfil/review/evidência, resolver 2.0.0, Inbox de aliases/propostas e busca de Pessoas por conceito. As migrations `20260903094700`, `20260903100340`, `20260903101644` e `20260903102721` estão ativas no QA; CBO está publicada e ESCO permanece bloqueada no download oficial.

O M5.1 possui M5.1A para preparação, M5.1B para execução e M5.1C para governança do Item Bank, ativos no Prisma-QA. M5.1C adiciona oito tabelas iniciais de governança, RPCs idempotentes, deduplicação lexical, ledger de budget, snapshots analíticos tenant-scoped e `assessment-item-generator` v2 com JWT. O provider fake está ativo; a geração externa está implantada e fail-closed. O rollout conectado foi comprovado com dados sintéticos; o smoke visual M5.1C nos cinco viewports permanece pendente.

## Segurança

Autorização usa membership persistida e `platform_users`, não `user_metadata`. `anon` não recebe grants. `member` não lê documento ou PII privada nem publica perfil. O shell web valida sessão com `getClaims()` e usa apenas a chave publicável. Secret/service key nunca vai para frontend. Documento é input não confiável.

## Ambientes

Local existe para CLI e shell web. O projeto Supabase `Prisma-QA` (`ioldpnqqvobprjiontre`) é o único backend remoto atual e possui foundation, M2-A, M2-B, M2-C, intake currículo-first, M4, M5 e M5.1A/B/C. `knowledge-agent` e `assessment-item-generator` estão implantadas com JWT obrigatório e chamadas externas desativadas. Por decisão do produto, frontend hospedado e ambiente de produção separado foram adiados enquanto o uso permanece interno e sem clientes.

## Comandos

```bash
pnpm install
pnpm run validate
pnpm run demo
pnpm run dev:web
pnpm run build:web
pnpm run generate:prisma-context
pnpm run check:prisma-context
```

## Contratos e decisões

Catálogo: `docs/architecture/contracts.md`. Knowledge: `professional-concept-architecture.md` e ADR-032. Jornada e Delta: ADR-025. M5.1: ADR-026 para Evidência Demonstrada, ADR-027 para a fronteira pública e ADR-028 para expansão governada, custo e calibração. Blocos irmãos: ADR-029.

## Operação

Telemetria básica e eventos operacionais de ingestão/revisão existem. Auditoria global, alerts, deployment automatizado e incident owners não estão completos. `.prisma-data`, `dist`, `node_modules`, `.env*` e caches ficam fora do Git.
