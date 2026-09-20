# AoT — M8.1 Migração Sistêmica da Arquitetura de Competências

Contrato: `docs/agreements/agreement-m8-redefinicao-agrupamento-competencias.md` v1.0.0 e aditivo `docs/agreements/AGREEMENT_M8.1_FINAL.md` v1.1.0. Prompt: `docs/qa/execution-m81-competency-architecture.md`. Estado deste AoT: **PARCIAL**, em 2026-09-20. `PASS` abaixo significa prova local ou leitura remota específica, nunca entrega completa.

## Matriz de Acordos

| ID | Implementação e prova | Status | Limite |
| --- | --- | --- | --- |
| D-01 | `competency_macro_groups`, `competency_subgroups`; QA SQL 2/9 | PASS | Local |
| D-02 | FK classificação → subagrupador, unicidade da linha corrente; QA SQL | PASS | Local |
| D-03 | Projeção `person-professional-evidence-4.0.0`; testes TS e SQL | PASS | Local |
| D-04 | Tipo nativo `certification` excluído da classificação e projeção; credencial como evidência vinculada | PASS | Local |
| D-05 | Links cumulativos; QA SQL com contexto e certificado simultâneos | PASS | Local |
| D-06 | Currículo só produz declaração e vínculo contextual/credencial humano; teste negativo SQL | PASS | Local |
| D-07 | M5.1 é projetado como `verified_assessment` quando vigente; teste de contrato | PARTIAL | Sem jornada real M5.1 |
| D-08 | Sem escrita de habilidade prática a partir de currículo; teste negativo SQL | PASS | Fonte organizacional própria ainda indisponível |
| D-09 | Pendência explícita e ausência neutra; testes de domínio | PASS | Local |
| D-10 | FK usa `knowledge_concepts.id`; sem catálogo paralelo | PASS | Local |
| D-11 | RPC e testes M7.1 existentes preservados; 22 regressões dirigidas PASS | PASS | Local |
| D-12 | UI M8 agrupa por Hard/Soft/subagrupador, não pelos seis tipos | PARTIAL | Falta comparação visual e smoke real |
| D-13 | RPCs, trigger, RLS, cliente e UI rejeitam escopo/natureza inválidos; QA SQL | PASS | Local |
| D-14 | Inventário: 8 Pessoas com criação por intake rastreável | BLOCKED | Backup e descarte remoto pendentes |
| D-15 | Uma Pessoa com origem de currículo sem intake resolvido permanece ambígua | BLOCKED | Não há prova de origem exclusiva |
| D-16 | Leitura remota: 1 `platform_users`, 1 Auth e 1 Super Admin ativo para `harita.super` | PARTIAL | Preservação pós-limpeza não testada |
| D-17 | Sem exclusão de Knowledge | BLOCKED | Proveniência exclusiva e backup não fechados |
| D-18 | CBO/ESCO/O*NET sem mutação; backfill estruturado só O*NET technology | PARTIAL | Preservação pós-limpeza pendente |
| D-19 | Saga M5.5 existente inspecionada | BLOCKED | Exclusão dependente pendente |
| D-20 | Storage não foi removido | BLOCKED | Backup de objetos e deleção pendentes |
| D-21 | FKs e QA local do novo schema | PARTIAL | Ausência de órfãos pós-limpeza pendente |
| D-22 | Projeto remoto identificado `ioldpnqqvobprjiontre`; backup técnico concluído sem escrita remota | PARTIAL | Restauração isolada e smoke ainda pendentes |
| D-23 | Nenhum ledger novo criado | PARTIAL | Ledger pessoal histórico M5.5 só pode ser tratado após inventário/backup |
| D-24 | Contratos intake/Perfil preservados | NOT TESTED | Falta novo ciclo sintético real |
| D-25 | Sem mudança de matching/score no diff; regressões M7.1 dirigidas | PARTIAL | Smoke de matching faltante |
| D-26 | ADR-070, owners e Context Pack atualizados; geração/check PASS | PARTIAL | AoT e estado de rollout requerem fechamento |
| D-27 | Contratos persistidos versionados; versão pública atual mantida | PARTIAL | Registro de entrega depende de validação/publicação |
| D-28 | QA SQL e testes TS usam dados sintéticos | PASS | Local |
| D-29 | RLS, papéis, escopo cruzado e escrita direta negativos no PostgreSQL local | PASS | Sem smoke remoto autenticado |
| D-30 | Imagem de nove telas registrada como referência normativa no Agreement/Prompt | PARTIAL | Comparação same-state/same-data/same-viewport faltante |
| D-31 | Três tabelas com FKs, dois macros e nove subgrupos; QA SQL | PASS | Local |
| D-32 | Global/organização protegidos por trigger, RPC e RLS; QA negativo | PASS | Local |
| D-33 | Schema admite subgrupo organizacional tenant-scoped; UI sem cadastro/edição | PASS | Local |

## Proibições verificadas

### Contrato-base M8 v1.0.0

| IDs | Implementação/prova | Status e limite |
| --- | --- | --- |
| D-01 a D-04 | Dois macrogrupos, H1–H5, S1–S4 e FK única corrente; QA SQL | PASS local |
| D-05 | Conceitos sem fonte inequívoca ficam pendentes; teste negativo SQL | PASS local |
| D-06 a D-08 | Credencial separada, evidências por natureza e links cumulativos | PASS local |
| D-09 a D-11 | Currículo não produz Assessment/prática; M5.1 é fonte de verificação | PARTIAL: falta jornada M5.1 real |
| D-12 a D-16 | Ausência neutra, proveniência/versão, Knowledge existente, tipos e taxonomia ocupacional preservados | PASS local |
| D-17 a D-18 | FK/trigger/RPC/UI e ajuda com definição, exemplos e pergunta de classificação | PARTIAL: sem QA visual autenticada |
| D-19 a D-20 | M5.1 reaproveitado, nove subgrupos genéricos sem setor no primeiro nível | PASS local |
| D-UX-01 a D-UX-04 | Formulários usam Hard/Soft/subgrupo e exibem significado; pendentes não são reclassificados lexicalmente | PARTIAL: comparação visual pendente |
| P-01 a P-03 | Credencial não é família; natureza da evidência não muda identidade do conceito | PASS local |
| P-04 a P-08 | Negativos SQL para currículo, certificado, Assessment/prática; ausência neutra | PASS local |
| P-09 a P-13 | Sem score/nível, equivalência lexical automática, perda de fonte ou mudança de matching/taxonomia ocupacional | PASS local |
| P-14 a P-16 | Sem provider externo, sucessão/PDI/9-Box/gap ou fixture com PII | PASS local |

| IDs | Prova | Status |
| --- | --- | --- |
| P-01 a P-08 | Nenhuma mutação remota de Auth, Pessoas, Knowledge, Vagas ou Storage; FKs e inventário agregados | PARTIAL |
| P-09 a P-11 | Tipos nativos preservados; currículo e credencial não produzem Assessment ou habilidade prática; QA SQL | PASS |
| P-12 a P-13 | Matching/score e schema global sem alteração destrutiva | PASS |
| P-14 a P-15 | Sem PII em logs/AoT e sem alegação de limpeza pela UI | PASS |
| P-16 a P-17 | Conceitos ambíguos ficam pendentes; evidência referencia identidade Knowledge existente | PASS |
| P-18 a P-20 | Nenhuma nova fonte/provider/modelo, produto adjacente ou currículo real versionado | PASS |
| P-21 a P-23 | Sem novo ledger; nenhum histórico pessoal apagado sem avaliar contrato M5.5 | PARTIAL |
| P-24 a P-25 | Tabelas próprias, FK e rejeição tenant/global em escrita direta/RPC | PASS |

## Fora de escopo preservado

F-01 a F-14: sem sucessão, 9-Box, PDI, gap, nova fórmula de score/matching, novo Assessment, performance, verificação externa de credencial, provider/modelo, redesign global de shell, mudança de OCR/parser ou cadastro/edição de subagrupadores por usuário. O schema apenas prepara a representação organizacional. `PASS` no diff local.

## Fidelidade visual

Referência normativa: `docs/assets/m81-nine-screen-reference.png`, SHA-256 `f7b586ccaa224d3d9bc146827e64822c6b43fb0d58d014a1e576feadbcb3f681`. Topologia principal de Hard/Soft, subagrupadores, Perfil, Knowledge, Pessoas e Configurações foi implementada sobre componentes existentes. **NOT TESTED** para CA-40: ainda não houve render das nove telas com o mesmo estado, dados e viewport nem comparação registrada de proporções, densidade e posição relativa. A imagem é alvo estrutural; pessoas, nomes e contagens nela são ilustrativos.

## Evidência e validação

- PostgreSQL 17 descartável: migrations M8.1 e QA em transação com `ROLLBACK` passaram, incluindo escopo cruzado, RLS, histórico, aprovação, curadoria e naturezas de evidência. Nenhum dado sintético foi persistido no remoto.
- `pnpm run typecheck:web`, `pnpm run build:web`, `pnpm run build`, 11 testes dirigidos de M8/M7.2/M7.6 e 22 regressões dirigidas de M7.1/M7.3/M7.7: PASS. O build Vite avisou sobre chunks grandes e import dinâmico ineficaz, sem falha.
- `pnpm run generate:prisma-context` e `pnpm run check:prisma-context`: PASS.
- `pnpm run check:supabase-ledger`: PASS como inspeção; 137 migrações mapeadas, quatro migrations M8.1 pendentes e `cliDbPushAllowed=false`. Nenhum `db push` geral foi executado.
- Leitura remota agregada: 10 Pessoas, 8 com criação por intake rastreável (uma também ligada a outro intake), 1 com `latest_source_type=resume_pdf` sem intake resolvido; identidade `harita.super` ativa/Super Admin. Sem alteração remota.
- Dashboard Supabase, projeto Prisma Free: **sem backups automáticos**. [Documentação oficial](https://supabase.com/docs/guides/platform/backups) informa que backup de banco não inclui objetos Storage.
- Backup M8.1: `scripts/backup-prisma-production.mjs` e `docs/operations/prisma-production-backup.md` executados com a CLI Supabase autenticada, acesso temporário `cli_login_postgres`/`SET ROLE postgres` e chave Secret transitória para o Storage. A cópia privada `C:\Users\Bruno\Documents\Prisma-Backups\prisma-2026-09-20T15-16-28-483Z` contém dump customizado de 28.619.375 bytes, 15 objetos Storage/2.118.277 bytes e manifesto com SHA-256; `node --check`, verificação estrutural/hash e ACL protegida passaram. A restauração isolada, smoke de leitura e agendamento ainda não ocorreram. D-22 permanece `PARTIAL`.

## Desvios e bloqueios

Nenhum desvio implementado foi aprovado como substituto de requisito. A limpeza, o rollout e a comparação visual permanecem requisitos pendentes, não itens dispensados. A exclusão real exige backup técnico verificável do banco e dos objetos Storage, inventário da Pessoa sem origem de intake inequívoca e preflight de Knowledge/ledger. `supabase db push` geral e `migration repair` automático continuam vedados pelo ledger histórico.

## Git / QA / produção

Branch `codex/m81-competency-architecture`, commit local/remoto `ab25ab5`, publicada apenas em `origin/codex/m81-competency-architecture`. Sem integração, QA compartilhado ou deploy. Produção permanece no contrato M7 anterior. O trabalho não pode ser declarado concluído enquanto houver `D-*` bloqueado, parcial ou sem teste.
