# AoT — M8.1 Migração Sistêmica da Arquitetura de Competências

Contrato: `docs/agreements/agreement-m8-redefinicao-agrupamento-competencias.md` v1.0.0 e aditivo `docs/agreements/AGREEMENT_M8.1_FINAL.md` v1.1.1. Prompt: `docs/qa/execution-m81-competency-architecture.md` revisão 1.1.1. Estado deste AoT: **PARCIAL**, em 2026-09-20. `PASS` abaixo significa prova local ou leitura remota específica, nunca entrega completa.

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
| D-12 | UI M8 agrupa por Hard/Soft/subagrupador, com lista e detalhes de subagrupador e conceito; comparação autenticada das nove composições locais | PASS | Smoke hospedado ainda pendente |
| D-13 | RPCs, trigger, RLS, cliente e UI rejeitam escopo/natureza inválidos; QA SQL | PASS | Local |
| D-14 | Inventário remoto: 8 Pessoas com criação por intake rastreável e `[QA] Marina Dados` confirmada individualmente pelo Product Owner como teste; preview das 9 sagas | PARTIAL | Descarte remoto pendente |
| D-15 | Outra Pessoa sem criação por intake comprovada foi excluída do lote; `[QA] Marina Dados` recebeu autorização individual explícita | PARTIAL | Preservação após o descarte pendente |
| D-16 | Leitura remota: 1 `platform_users`, 1 Auth e 1 Super Admin ativo para `harita.super` | PARTIAL | Preservação pós-limpeza não testada |
| D-17 | 128 observações e 78 Inbox ligadas aos oito alvos inventariadas; 80 Inbox vazias não relacionadas protegidas por migration local | PARTIAL | Limpeza remota e decisão sobre cinco Inbox não `unresolved`/conceito organizacional pendentes |
| D-18 | CBO/ESCO/O*NET sem mutação; backfill estruturado só O*NET technology | PARTIAL | Preservação pós-limpeza pendente |
| D-19 | Saga M5.5 existente inspecionada | BLOCKED | Exclusão dependente pendente |
| D-20 | Os 15 objetos foram restaurados e lidos pela Storage API isolada com SHA-256 idêntico; plano local de 9 objetos dos alvos verificado | PARTIAL | Remoção remota e smoke pós-limpeza pendentes |
| D-21 | FKs e QA local do novo schema | PARTIAL | Ausência de órfãos pós-limpeza pendente |
| D-22 | Projeto remoto identificado `ioldpnqqvobprjiontre`; backup, banco e 15 objetos Storage restaurados e lidos em ambiente isolado | PARTIAL | Limpeza, deploy e smoke remotos pendentes |
| D-23 | Nenhum ledger novo criado; 22 operações M5.5 concluídas e 31 itens Storage removidos foram inspecionados no snapshot, sem vínculo com os oito alvos atuais | PARTIAL | Preservação e ausência de resíduo após a limpeza remota pendentes |
| D-24 | Contratos intake/Perfil preservados | NOT TESTED | Falta novo ciclo sintético real |
| D-25 | Sem mudança de matching/score no diff; regressões M7.1 dirigidas | PARTIAL | Smoke de matching faltante |
| D-26 | ADR-070, owners e Context Pack atualizados; geração/check PASS | PARTIAL | AoT e estado de rollout requerem fechamento |
| D-27 | Contratos persistidos versionados; versão pública atual mantida | PARTIAL | Registro de entrega depende de validação/publicação |
| D-28 | QA SQL e testes TS usam dados sintéticos | PASS | Local |
| D-29 | RLS, papéis, escopo cruzado e escrita direta negativos no PostgreSQL local | PASS | Sem smoke remoto autenticado |
| D-30 | Nove superfícies renderizadas e comparadas em sessão local autenticada com a imagem normativa; topologia, ordem, densidade e ação principal corrigidas | PASS | Smoke visual hospedado ainda pendente |
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

Referência normativa: `docs/assets/m81-nine-screen-reference.png`, SHA-256 `f7b586ccaa224d3d9bc146827e64822c6b43fb0d58d014a1e576feadbcb3f681`. Em 2026-09-20, o app local autenticado em viewport desktop 1277 × 1272 foi confrontado com as nove composições da imagem: Dashboard (`/`), importação (`/profiles/import`), Perfil/Competências, detalhe de subagrupador, detalhe de conceito, revisão/comparação (`/delta`), Pessoas (`/profiles`), Conhecimento (`/knowledge`) e Configurações (`/settings`). As capturas da sessão Codex M8.1 identificam as telas renderizadas; a imagem composta não informa o viewport original de cada miniatura, portanto a equivalência foi julgada pela composição desktop e não por pixels. Houve ainda inspeção responsiva em 760 × 900 para Configurações. A renderização usou dados reais do ambiente de teste, sem preencher contagens fictícias.

Dashboard agora apresenta quatro indicadores compactos e aviso M8; importação coloca a jornada em quatro passos acima do upload; Perfil separa Hard/Soft e pendências; subagrupador tem título, breadcrumb e tabela; conceito tem status cumulativos e guias de evidência, contexto e histórico; comparação de revisão apresenta duas colunas; Pessoas mantém busca/filtros próximos da ação de importar; Conhecimento abre com fontes oficiais preservadas; Configurações mostra listas compactas Hard/Soft. As diferenças de conteúdo são dados ilustrativos da referência: a aplicação aceita PDF no contrato vigente, o ambiente tem Pessoas e fontes existentes antes da limpeza, e a Pessoa QA legada com perfil publicado inconsistente retorna `PERSON_PUBLISHED_PROFILE_NOT_FOUND` no mapa e está no lote confirmado de exclusão. A comparação usou outra Pessoa de teste com projeção M8 válida. O App Shell existente foi preservado conforme F-12. Nenhuma divergência estrutural remanescente foi identificada nas nove composições locais; a validação hospedada ainda depende do deploy.

## Evidência e validação

- PostgreSQL 17 descartável: migrations M8.1 e QA em transação com `ROLLBACK` passaram, incluindo escopo cruzado, RLS, histórico, aprovação, curadoria e naturezas de evidência. Nenhum dado sintético foi persistido no remoto.
- `pnpm run typecheck:web`, `pnpm run build:web`, `pnpm run build`, 11 testes dirigidos de M8/M7.2/M7.6 e 22 regressões dirigidas de M7.1/M7.3/M7.7: PASS. O build Vite avisou sobre chunks grandes e import dinâmico ineficaz, sem falha.
- `pnpm run generate:prisma-context` e `pnpm run check:prisma-context`: PASS.
- `pnpm run check:supabase-ledger`: PASS como inspeção histórica; `cliDbPushAllowed=false`. As cinco migrations M8.1 foram aplicadas individualmente ao projeto remoto em ordem, após revisão, sem `db push` geral nem `migration repair`. No remoto: 2 macrogrupos, 9 subagrupadores, 8.908 classificações correntes de tecnologia O*NET e RLS verificado. A migração de proteção da saga M5.5 foi aplicada antes de qualquer descarte.
- Leitura remota agregada antes da limpeza: 10 Pessoas, 9 alvos autorizados (8 por intake e `[QA] Marina Dados` por confirmação individual), 14 documentos, 128 observações, 15 objetos Storage/2.118.277 bytes; 7 Auth, 7 `platform_users`, 8 Vagas, 30.230 conceitos globais, 8.908 classificações correntes. `harita.super` continua ativo; 80 Inbox vazias não relacionadas foram identificadas para preservação. O esquema remoto M8.1 foi alterado; os dados pessoais ainda não.
- Dashboard Supabase, projeto Prisma Free: **sem backups automáticos**. [Documentação oficial](https://supabase.com/docs/guides/platform/backups) informa que backup de banco não inclui objetos Storage.
- Backup M8.1: `scripts/backup-prisma-production.mjs` e `docs/operations/prisma-production-backup.md` executados com a CLI Supabase autenticada, acesso temporário `cli_login_postgres`/`SET ROLE postgres` e chave Secret transitória para o Storage. A cópia privada `C:\Users\Bruno\Documents\Prisma-Backups\prisma-2026-09-20T15-16-28-483Z` contém dump customizado de 28.619.375 bytes, 15 objetos Storage/2.118.277 bytes e manifesto com SHA-256; `node --check`, verificação estrutural/hash e ACL protegida passaram. `pg_restore --clean --if-exists --exit-on-error` restaurou o banco em PostgreSQL Supabase 17.6.1.155 isolado; 7 Auth, 10 Pessoas, 15 intakes, 1 bucket e 15 objetos passaram no smoke de leitura. Fingerprints de buckets/objetos e os 15 caminhos/tamanhos corresponderam ao manifesto. Em rede Docker interna, PostgREST 14.15 e Storage API 1.71.0 restauraram os 15 PDFs pelo endpoint de objetos; download autenticado confirmou 2.118.277 bytes e SHA-256 individual. Contagens finais: 7 Auth, 10 Pessoas, 1 bucket, 15 objetos. Contêineres e rede removidos; backup original intacto. O agendamento continua pendente. D-22 permanece `PARTIAL`.
- Preflight M8.1 sobre o banco restaurado: 8 Pessoas têm criação por intake comprovada; a nona, `[QA] Marina Dados`, recebeu confirmação individual posterior do Product Owner como teste artificial. `preview_person_definitive_deletion` retornou 8 operações com 9 documentos/objetos e 128 observações. A preparação, marcação local de 9 itens e finalização relacional das 8 Pessoas passou com `ROLLBACK`, preservando usuários, conceitos e 80 Inbox vazias não relacionadas; contagens originais 10/160/22 de Pessoas/Inbox/ledger foram confirmadas após o rollback. A migration `20260920153000_m81_person_deletion_inbox_scope` corrige a exclusão ampla de Inbox da saga M5.5; fixture sintética negativa passou no banco isolado. Nenhum objeto Storage foi removido no ensaio. No remoto, as nove prévias foram conferidas pela interface antes da confirmação de exclusão: 14 documentos e 11 arquivos Storage no lote.

## Desvios e bloqueios

Nenhum desvio implementado foi aprovado como substituto de requisito. Limpeza, smoke e rollout permanecem pendentes. A confirmação individual do Product Owner resolveu a origem de `[QA] Marina Dados` apenas para esse cadastro; a outra Pessoa fica preservada. Cinco Inbox vinculadas exclusivamente às observações do lote e dois aliases organizacionais requerem limpeza exata após a saga, com guarda de referências independentes; o conceito organizacional aprovado com proposta própria e os conceitos globais permanecem preservados. `supabase db push` geral e `migration repair` automático continuam vedados pelo ledger histórico.

## Git / QA / produção

Branch `codex/m81-competency-architecture`. As migrations M8.1 estão no backend remoto; o frontend hospedado, a limpeza de dados de teste, a integração em main e o smoke final ainda não ocorreram. O trabalho não pode ser declarado concluído enquanto houver `D-*` bloqueado, parcial ou sem teste.
