---
prisma_context_id: technical-reference
owner: engineering-security
status: current
version: 1.13.0
last_verified: 2026-09-16
---

# Referência técnica do Prisma

## Transporte Paddle hospedado temporário

ADR-058 / `paddle-hosted-transport-1.0.0`: Nginx encaminha as duas rotas existentes a um gateway Node por socket Unix compartilhado. Gateway valida Auth/RLS e escopo, mantém payload PaddleX e encaminha apenas a 127.0.0.1:18080/18081 da VPS; SSH reverso chega a 8080/8081 no PC. Nenhuma porta do worker/gateway é publicada. Não há migration, chave privilegiada nem parser novo. Status de rollout e aceite em `docs/qa/aot-hosted-paddle-bridge.md`.

## M6.1.2 Matching por trajetória antes dos requisitos

`vacancy-matching-explainable-5.0.0` avalia primeiro a trajetória profissional e depois usa os requisitos para refinar a aderência. Grupo A exige experiência direta na área ou função equivalente; Grupo B reúne trajetória adjacente/transferível e potencial de entrada; Grupo C preserva termos e ferramentas encontrados sem trajetória relacionada, fica recolhido e não recebe score comparável. Posições de entrada podem usar formação, projetos e conhecimentos para o Grupo B. `matching-score-1.2.0` preserva fórmula e pesos para A/B e registra indisponibilidade explícita no C. A conexão factual introduzida no 4.0.0 continua ativa: categoria organiza, mas não bloqueia termo explícito, limite lexical e negação permanecem.

## M6.2 Verificação contextual

M6.2 reutiliza a avaliação persistida de Pessoa, Posição, versão e requisito para criar ou recuperar uma necessidade de verificação somente após ação humana. A RPC tenant-scoped valida snapshots matching 4.0.0 históricos ou 5.0.0 atuais, requisito da mesma versão e papel autorizado; loaders são somente leitura. Preparação, convite manual, acompanhamento e resultado preservam o contexto e a timeline. O Prisma-QA possui as migrations M6.2; produção, delivery automático e uso com Pessoas reais não foram autorizados.

## M5.4.6 Vagas

`vacancy-definition-1.2.0` mantém `vacancy_requirements.importance = required|desired|unclassified` para leitura histórica e rascunhos, mas novas versões aceitam somente `required|desired`. Inclusão manual nasce como `required`; sugestões assistidas pendentes exigem decisão antes de salvar. A RPC versiona toda escrita e rejeita `unclassified`; `vacancy_requirement_dimension_feedback` registra correção humana tenant-scoped e alimenta o `knowledge_inbox` organizacional sem DML direto ou publicação automática. `VacancyPages.tsx` projeta somente seções preenchidas e o matching conserva a leitura segura de snapshots históricos.

## Stack

TypeScript estrito, Node.js 22+, pnpm, testes nativos do Node, CLI, Vite para o shell web, PostgreSQL/Supabase como contrato de produção e JSON tenant-scoped para execução local.

## Arquitetura

`src/domain` define contratos, incluindo normalização Knowledge; `src/ai` contém providers determinísticos e a abstração de pesquisa. `web/src` hospeda o shell, o módulo Conhecimento e o motor de evidência visual. `spatialEvidence` converte unidades PDF.js/OCR para `normalized-page-v1`, de modo que seleção, texto, refinamento e destaque independam do zoom. `web/src/domain/ocrWorker.ts` carrega dinamicamente o worker, o core WASM e os dados `por+eng` locais do Tesseract para evitar dependência de CDN na inicialização do OCR. `supabase/functions/knowledge-agent` é o boundary opcional para Responses API/Web Search.

## Banco

A foundation migration cria organizações, memberships, unidades, papéis, posições, vagas, pessoas, dados privados, documentos, perfis, evidências, inferências, competências, requisitos, avaliações e telemetria. O M2-A adiciona grupos e operadores; o M2-B adiciona Storage privado, tentativas, páginas e drafts; o M2-C adiciona operações idempotentes, retries, revisões, mudanças por campo e promoção atômica de perfil. O currículo-first adiciona `resume_intakes` antes da criação de Pessoa e resolve criar/vincular em transação. `organization_id`, foreign keys compostas, índices, grants e RLS formam a estratégia multi-tenant aceita.

A publicação Delta adiciona `profile_publication_removals` como ledger imutável e `publish_profile_review` como autoridade cliente. A RPC mescla perfil-base e proposta, preserva omissões, aplica somente remoções explícitas e chama a promoção atômica interna. A antiga `approve_profile_review` não possui mais grant para `authenticated`.

O aprendizado estrutural v3 preserva linhas PDF.js/Tesseract, aprende assinatura somente no documento atual e usa RPCs fail-closed para auditar detecção/descarte e aplicar sugestões com regiões complementares por campo. A migration `20260902003617_m5_sibling_block_learning` está ativa no Prisma-QA; a RPC v2 permanece compatível. A migration `20260910104122_allow_ocr_spatial_field_evidence` corrige a fronteira de persistência para aceitar geometria OCR somente quando o método é `tesseract-layout-v1`, mantendo rejeição de combinações cruzadas.

Foundation, M2-A, M2-B, M2-C, intake currículo-first e as migrations M4 estão ativos no Prisma-QA. Leituras usam RLS; mutações compostas sensíveis usam Edge Functions ou RPCs controladas, com DML direto revogado nas tabelas críticas M2-C/intake/Knowledge.

O Movimento 4 adiciona a fundação Knowledge. O M5.2 a estende com source ingestion por CSV, SHA-256, manifestos, staging RLS, diff, publicação humana, source version corrente, observações ligadas ao Perfil/review/evidência, resolver 2.0.0, Inbox de aliases/propostas e busca de Pessoas por conceito. As migrations `20260903094700`, `20260903100340`, `20260903101644` e `20260903102721` estão ativas no QA; CBO `CBO 2002-2025-06-06`, ESCO 1.2.1 e O*NET 31.0 estão publicados e correntes.

As migrations `20260903161003` e `20260903163053` e a Edge Function `knowledge-source-monitor` adicionam monitoramento mensal CBO/ESCO/O*NET. Supabase Cron desperta um scanner de vencimento horário, `next_check_at` fixa a execução real no primeiro dia às 01:00 em `America/Sao_Paulo`, Vault protege a chamada e `knowledge_source_checks` mantém o ledger RLS. Falhas repetem em 6h, 24h e 72h. A Home lê versão, data, estado e última checagem por `PrismaDataRepository`; detecção nunca publica snapshot.

O M5.1 possui M5.1A para preparação, M5.1B para execução e M5.1C para governança do Item Bank, ativos no Prisma-QA. M5.1C adiciona oito tabelas iniciais de governança, RPCs idempotentes, deduplicação lexical, ledger de budget, snapshots analíticos tenant-scoped e `assessment-item-generator` v2 com JWT. O provider fake está ativo; a geração externa está implantada e fail-closed. O rollout conectado foi comprovado com dados sintéticos; o smoke visual M5.1C nos cinco viewports permanece pendente.

## Segurança

Autorização usa membership persistida e `platform_users`, não `user_metadata`. `anon` não recebe grants. `member` não lê documento ou PII privada nem publica perfil. O shell web valida sessão com `getClaims()` e usa apenas a chave publicável. Secret/service key nunca vai para frontend. Documento é input não confiável.

## Ambientes

Local existe para CLI e shell web. O projeto Supabase `Prisma-QA` (`ioldpnqqvobprjiontre`) é o único backend remoto atual e possui foundation até M6.2, incluindo a compatibilidade M6.1.2 de matching 5.0.0, no escopo autorizado. `knowledge-agent` está implantada com JWT e pesquisa externa ativa sob políticas/caps; `assessment-item-generator` permanece implantado com provider externo desativado. O frontend está hospedado na Hostinger desde 2026-09-15; ambiente Supabase separado de produção permanece inexistente.

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

Catálogo: `docs/architecture/contracts.md`. Knowledge: `professional-concept-architecture.md` e ADR-032. Jornada e Delta: ADR-025. M5.1: ADR-026 para Evidência Demonstrada, ADR-027 para a fronteira pública e ADR-028 para expansão governada, custo e calibração. Blocos irmãos: ADR-029. UX compartilhada: ADR-050. Matching/score atuais: ADR-053, ADR-055 e ADR-057. Verificação contextual: ADR-054. Distribuição do Context Pack: ADR-056.

## Operação

Telemetria básica e eventos operacionais de ingestão/revisão existem. Auditoria global, alerts, deployment automatizado e incident owners não estão completos. `.prisma-data`, `dist`, `node_modules`, `.env*` e caches ficam fora do Git.
