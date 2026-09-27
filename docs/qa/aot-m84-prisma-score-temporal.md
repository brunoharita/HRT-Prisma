# AoT — M8.4 Score Prisma temporal

Contrato: `docs/qa/agreement-m84-prisma-score-temporal.md` v1.0.0. Execução: `docs/qa/execution-m84-prisma-score-temporal.md`. ADR: `docs/decisions/ADR-074-m84-temporal-prisma-score.md`. Baseline `main` em `d1be125a0628d5984c9da6e18a3eba62fb7f33d7`; SHA publicado `20a39a9e4e598dbfc4cc51146e7c4b7441923624`.

## Matriz de acordos

| ID | Implementação | Teste/evidência | Status |
| --- | --- | --- | --- |
| D-01/D-02 | `matchingScore.ts` com seis dimensões e soma direta | `m84ScoreTemporal`, `matchingScore`, golden | PASS |
| D-03 | Janelas mensais unificadas e bandas 0/3/5/7/10 | `m84ScoreTemporal` com limites e sobreposição | PASS |
| D-04 | Recência atual/6/12/18/24 meses | `m84ScoreTemporal` com cinco fronteiras | PASS |
| D-05/D-06 | Experiências relacionadas, referência civil e fingerprint | testes semântico/determinístico e score temporal | PASS |
| D-07 | Breakdown progressivo, evidência e data na UI | `matchingScore` UI/service assertions; build | PASS |
| D-08 | Cálculo determinístico e sem desempate | testes de determinismo e ordenação | PASS |

## Proibições verificadas

| ID | Guardrail | Evidência | Status |
| --- | --- | --- | --- |
| P-01/P-02 | Desconhecimento não vira zero; sobreposição não duplica; gestão não prova programação | testes de ausência, ano parcial, sobreposição e piloto semântico | PASS |
| P-03 | A/B/C, requisitos, decisão humana e Knowledge preservados | regressão direcionada e diff | PASS |

## Mapa de impacto e preservação

| Capacidade | Relação | Baseline/regressão | Evidência | Status |
| --- | --- | --- | --- | --- |
| Motor/breakdown do score | direct | Score anterior e novos máximos | build, testes M8.4 e golden 23/23 | PASS |
| Semântico M8.3 e Edge | direct | versão 1.3.0 aceita; 1.4.0 gerada | build e check de runtime | PASS |
| Busca, comparação, ordenação | plausible_indirect | grupos e ordenação existentes | `matchingScore.test` | PASS |
| Perfil/parser/publicação | plausible_indirect | sem escrita ou alteração de fatos | diff e testes semânticos | PASS |
| M6.2/snapshots | plausible_indirect | compatibilidade SQL forward-only | migration remota e smoke negativo da Edge | PASS |
| Auth/RLS/tenant/PII | critical_transversal | sem nova fonte ou autoridade | Edge remota ativa com JWT; POST sem token retorna 401 | PASS |
| Knowledge/curadoria | no_impact_identified | nenhum objeto tocado | diff | PASS |

## Fora de escopo

F-01 desempate temporal, aprendizado, curadoria, nova dimensão, expansão semântica e mudança de banners: não implementados.

## Validação local

- `pnpm run build`: PASS.
- Testes direcionados `matchingScore`, `m84ScoreTemporal` e `semanticTrajectory`: PASS após atualização dos fixtures; golden matching/extraction: 23/23 PASS.
- `pnpm run check:matching-runtime`: PASS; sete módulos fonte e dois extratos exatos conferidos.
- `pnpm run generate:prisma-context` e `pnpm run check:prisma-context`: PASS; exports gerados do Context Pack conferidos.
- `pnpm run check:foundation`: PASS; 18 tabelas públicas e 6 versões de processamento.
- `pnpm run typecheck:web`, `pnpm run build:web` e `pnpm run lint`: PASS. Build web manteve apenas avisos existentes de chunk/import dinâmico.
- `pnpm run test`: PASS; 689 testes Node, com probes de falha sintéticos esperados pelo próprio harness; nenhum teste final falhou.
- `pnpm run test:release-tooling`: PASS, 15 testes.
- `pnpm run release:plan` no SHA `20a39a9e4e598dbfc4cc51146e7c4b7441923624`: 42 arquivos; roteamento backend, Context Pack, database, documentação, Edge `matching-trajectory`, hosting/web e testes. Parser e outras Edge Functions ficaram fora.
- `pnpm run check:supabase-ledger`: PASS como diagnóstico de ledger; `cliDbPushAllowed: false`, 138 migrations mapeadas, 2 somente locais, 6 somente remotas e 26 migrations históricas ainda pendentes no mapa. O novo M8.4 foi registrado como alias remoto observado e aplicado individualmente pelo conector autorizado, sem `db push` genérico.
- Deno handler/snapshot: não executado; o binário disponível falhou com acesso negado ao `deno.exe`. Limitação permanece explícita.
- Não foi executado `pnpm run validate` integral, conforme escopo econômico e contrato do repositório.

## Ambiente, release e limitações

O plano de release foi derivado do commit `20a39a9e4e598dbfc4cc51146e7c4b7441923624`. A migration nova e forward-only foi aplicada no único remoto de produção pelo conector autorizado como `20260927162056_m84_score_temporal_compatibility`; a função `commit_matching_snapshot` aceita `matching-score-1.3.0` e `matching-score-1.4.0`. A Edge `matching-trajectory` está ativa na versão 4, `verify_jwt=true`, hash `d4a3d989e671ae8b3433374e82fe4c46642915a76618e1409209f73d90717d68`; POST sem token retornou 401 `UNAUTHORIZED_NO_AUTH_HEADER`.

O `prisma-web` foi sincronizado na VPS `/opt/prisma` no mesmo SHA, reconstruído e recriado somente no serviço web. O primeiro smoke durante a troca retornou 404 transitório; a verificação posterior confirmou container `running`, zero reinícios, imagem `sha256:eccbb7345f96ac21ca2e170fdb35bf597a6b6a5b39a60055abe3128b2f25f3b7`, HTTPS 200 e presença de `matching-score-1.4.0` no bundle. Rollback preservado em `prisma-web:rollback-before-20a39a9e4e59`, imagem `sha256:f78ed4ffefd156e323e5b6bed11a469ae78a471d8c8cad28125a1edc3393e83f`.

Deno handler/snapshot não foi executado localmente porque o `deno.exe` disponível retornou acesso negado no host; o empacotamento remoto e o smoke negativo da Edge passaram. Nenhum dado real foi criado ou alterado para testes. Não foi executado `pnpm run validate` integral, conforme escopo econômico e contrato do repositório.

## Desvios

Nenhum desvio funcional identificado. Limitações: Deno não executado localmente e o smoke autenticado de uma jornada de comparação não foi realizado; a verificação web foi HTTPS/bundle e a verificação Edge foi negativa, sem token e sem escrita.
