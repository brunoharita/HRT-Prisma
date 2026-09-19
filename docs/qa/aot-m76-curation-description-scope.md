# AoT M7.6 — descrição de conceito e escopo da curadoria

Data: 2026-09-18
Contrato: `docs/qa/agreement-m76-curation-description-scope.md` 1.0.0
Execução: `docs/qa/execution-m76-curation-description-scope.md` 1.0.0
Baseline: `15a82a4`
Entrega: `cc2e5966f25232e5880d1ceabd1e596c214cdf56`
Migration: `20260918220000_m76_curation_description_scope`

## Acordo -> implementação -> teste -> evidência

| ID | Implementação e prova | Status |
|---|---|---|
| D-01 | `CompetencyCuration.tsx` apresenta descrição opcional, limite 2.000 caracteres e payload `p_proposal_description`; RPC v4 persiste somente em `proposed_concept.description`. SQL M7.6 e smoke visual confirmam. | PASS |
| D-02 | Justificativa removida do painel, domínio, serviço v4 e persistência específica da curadoria de Perfil. Limpeza histórica profile-linked é idempotente; contagem prévia remota: 0/0. Fluxos de aprovação administrativa Knowledge permanecem fora do escopo. | PASS |
| D-03 | UI limita Global por `super_admin`; RPC v4 exige `private.require_knowledge_admin(null)` para Global. Grants remotos: `anon=false`, `authenticated=true`; QA PostgreSQL prova rejeição de Global para administrador comum. | PASS |
| D-04 | Proposta continua pendente, sem publicação automática nem evidência. Mensagem e estado foram confirmados no smoke e no teste SQL. | PASS |
| D-05 | RPC v4 preserva tenant, autoridade, snapshot, concorrência, declaração original e versão do workflow; wrappers legados ignoram o campo aposentado sem reintroduzir captura. | PASS |
| D-06 | Contrato, execução, ADR-067, migration, testes, Context Pack e rollout foram atualizados. | PASS |
| P-01 | Nenhuma captura/persistência nova de justificativa de curadoria; teste estático e SQL não encontram `p_reason` no fluxo v4. | PASS |
| P-02 | Global não é aceito para não-super; guarda server-side e teste negativo local cobrem o limite. | PASS |
| P-03 | Descrição é opcional e não cria evidência/publicação. | PASS |
| P-04 | Razões do fluxo administrativo Knowledge não foram removidas nem alteradas. | PASS |

## Validação

- TypeScript raiz e web: PASS (`tsc --noEmit`); build raiz: PASS.
- Lint: PASS (`582 files`); `git diff --check`: PASS.
- Testes direcionados: PASS, 16/16 (`profileCompetencyCuration`, `knowledgeFoundation`, `m76CurationDescriptionScope`).
- PostgreSQL descartável M7.6: PASS, incluindo proposta com descrição, descrição vazia, Global negado e grants.
- Context Pack: PASS (`generate-prisma-context` e `check:prisma-context`).
- Migration remota: PASS no único Supabase de produção; ledger registrado como `20260918220000`.
- Produção web: `main`/GitHub/VPS em `cc2e596`; imagem ativa `sha256:e96c30ed09ac6e4e0423564bb21566286f3e01ba8458adb1e53dfd6ccef339f1`; rollback preservado em `prisma-web:rollback-before-m76-curation-description-20260918`; somente `prisma-web` recriado; gateway e Traefik permaneceram ativos.
- HTTPS: `200`.
- Smoke autenticado read-only: Perfil Bruno Harita Santos → Competências → pendência → “Propor novo conceito”. Campo “Descrição do conceito” visível, justificativa ausente, escopo “Knowledge da empresa” visível; painel cancelado e alterações descartadas sem gravação.

## Limites

- O smoke não submeteu proposta nem testou a sessão de um usuário não-super na UI; a proibição de Global para não-super foi provada no PostgreSQL/RPC server-side.
- A ocorrência genérica “Justificativa da correção antes de salvar” permanece em mensagens do fluxo de revisão documental, que é distinto e fora do escopo desta curadoria.
- O ambiente remoto é único; não há homologação Supabase separada.
