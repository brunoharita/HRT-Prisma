# AoT — M7.2 Perfil de Competências e Evidências

Contrato: `docs/qa/agreement-m72-person-professional-evidence.md` 1.0.0. Execução: `docs/qa/execution-m72-person-professional-evidence.md`. Data: 2026-09-18. Ambiente: local e produção única (`ioldpnqqvobprjiontre` + Hostinger). Status: implementação, integração e rollout concluídos; inspeção visual autenticada pós-login permanece `NOT TESTED` por ausência de sessão salva.

## Evidências

- E1 — `supabase/qa/m72_person_professional_evidence_verification.sql` em PostgreSQL 17 local descartável `m72_contract_tests_1`, com migrations reais até M7.2 e rollback das fixtures. PASS para Perfil vigente, Knowledge publicada, declaração, M5.1 ativa/suficiente, M5.1 invalidada/insuficiente, ambiguidade, versão incompatível, membro autorizado, outro tenant, inativo e anon.
- E2 — `tests/personProfessionalEvidence.test.ts`: decoder fail-closed, agrupamento por identidade/tipo, múltiplas naturezas, contagens, demonstração inválida, ambiguidade, guardrails SQL/UI e release.
- E3 — `tests/productRelease.test.ts` e fonte central consumida por login/sidebar: Prisma v1.7.2; harness real exibiu v1.7.2 na barra lateral.
- E4 — `pnpm run lint`, `pnpm run check:foundation`, typecheck de domínio/web e build web: PASS. Teste dirigido de M7.2, release, perfil canônico, M7.1, matching e M6.2: 37/37 PASS. Tooling/Context Pack: 12/12 PASS. Build manteve apenas o aviso preexistente de chunk Ant Design acima de 900 kB.
- E5 — comparação visual local por `tests/ui/m72.html`, componente real, dados sintéticos e nenhuma escrita remota. Resumo, Competências e Evidências foram inspecionados no desktop; mobile 390 × 844 confirmou empilhamento, origem/detalhe e `scrollWidth` 375 para largura interna 390. Topologia, hierarquia, agrupamentos, ordem e ações correspondem às três referências; avatar usa iniciais porque foto não pertence ao contrato disponível. Sem divergência estrutural material observada.
- E6 — navegação de origem: `PersonProfilePage` preserva documento/review/campo/página/região/link em sessão; `ProfileReviewPage` seleciona o campo, abre o painel documental e navega para a região quando disponível. Sem região, a UI declara a limitação.
- E7 — revisão de diff/owners/ADR-062/Context Pack. Nenhum arquivo de fórmula de matching, parser/OCR, fonte externa ou dependência alterado. Material alheio `.tmp.driveupload/` e `services/paddle/Dockerfile.gpu` preservado.
- E8 — rollout Supabase autorizado: migration registrada como `20260918081743_m72_person_professional_evidence`. Inspeção remota confirmou helper privado sem execução para `public`/`anon`/`authenticated`; RPC pública `stable`, `SECURITY DEFINER`, `search_path` vazio, sem execução para `public`/`anon` e com execução somente para `authenticated`. Advisors mantiveram o baseline de tabelas, FKs, índices e policies; surgiu apenas o aviso esperado da RPC autenticada protegida internamente.
- E9 — smoke remoto read-only, tenant-scoped e sem PII sobre um Perfil real retornou `person-professional-evidence-1.0.0` e `position-taxonomy-1.0.0`, preservando ausência de associação como issues explícitas. Nenhum fixture, escrita, perfil, evidência ou decisão foi criado em produção; o fixture sintético remoto foi deliberadamente recusado e permaneceu somente na prova PostgreSQL local descartável.
- E10 — integração fast-forward em `main`, push GitHub e CI `35324103297` aprovados no commit `8f7473a791c5229b1804df34f5809b6f911e8f6e`. Hostinger construiu o mesmo commit com `baseline` + Parser IA `hosted`, preservou `prisma-web:rollback-before-m72-20260918` e recriou somente `prisma-web`. HTTPS 200, container sem restart, bundle com commit/contrato e login público exibindo v1.7.2 passaram; gateway/workers permaneceram ativos e não foram recriados.

## Matriz de Acordos

| ID | Implementação | Evidência | Status | Limite |
| --- | --- | --- | --- | --- |
| D-01 | tipos/agrupadores importados de `positionTaxonomy`; Knowledge existente | E1, E2, ADR-062 | PASS | sem taxonomia paralela |
| D-02 | RPC não consulta Vagas/requisitos; conceito de Pessoa separado | E1, E2, E7 | PASS | matching permanece consumidor futuro |
| D-03 | `superseded_at is null` + `review_status='approved'` | E1 | PASS | sem backfill |
| D-04 | associações declared/contextual/demonstrated independentes | E1, E2, E5 | PASS | podem coexistir |
| D-05 | `qualifiesAsVerified` exige active, vigência e nível suficiente | E1, E2 | PASS | M5.1 já existente |
| D-06 | issues/avisos neutros, sem penalização | E1, E2, E5 | PASS | ausência não é deficiência |
| D-07 | lista conserva múltiplas associações do conceito | E1, E2 | PASS | sem sobrescrita |
| D-08 | grouping por ID e seis tipos publicados | E2, E5 | PASS | ordem estável |
| D-09 | Resumo, taxonomia, cards e recentes | E5 | PASS | fixture sintética |
| D-10 | busca, filtros e disclosure no mapa | E2, E5 | PASS | sem score |
| D-11 | filtros, métricas, lista e detalhe de evidências | E2, E5 | PASS | métricas descritivas |
| D-12 | termo, método, versões, fonte e decisão humana | E2, E5 | PASS | sem cadeia privada |
| D-13 | documento/review/região ou Verificações | E6 | PASS | depende da origem existir |
| D-14 | loading, vazio, parcial, erro/retry e incompatível explícitos | E2, revisão de UI | PASS | falha mantém Perfil publicado |
| D-15 | guarda server-side + authenticated; membro permitido; negativos | E1, E8, E9 | PASS | ativa em produção |
| D-16 | fixture sintética local, smoke remoto read-only e sem logging de payload | E1, E5, E7, E9 | PASS | nenhuma escrita ou PII retornada no smoke remoto |
| D-17 | versões matching/score e arquivos fora do diff | E2, E7 | PASS | regressão dirigida |
| D-18 | decoder/RPC `person-professional-evidence-1.0.0` | E1, E2 | PASS | futuro falha fechado |
| D-19 | owners, ADR, AoT e Context Pack | E7, E10 | PASS | sincronizados após rollout |
| D-20 | registro M7 entrega 2; login/sidebar centralizados | E2, E3, E10 | PASS | v1.7.2 publicada |
| D-UX-01 | cabeçalho, abas, conteúdo principal e coluna lateral/detalhe | E5 | PASS | mesmas três superfícies |
| D-UX-02 | hierarquia, densidade, ordem e ações preservadas | E5 | PASS | conteúdo ilustrativo adaptado |
| D-UX-03 | grids empilham; filtros/detalhe/origem permanecem | E5 | PASS | 390 × 844 |
| D-UX-04 | Ant Design/Prisma, labels, foco e outline | E2, E5 | PASS | teclado apoiado por elementos nativos |
| D-UX-05 | comparação por estado e viewport equivalente | E5 | PASS | evidência identificada pelo harness/sessão local |

## Proibições verificadas

| ID | Prova negativa | Status |
| --- | --- | --- |
| P-01 | SQL não contém tabela de requisitos/Vagas; teste estático | PASS |
| P-02 | DTO sem score/proficiência/senioridade e aviso explícito | PASS |
| P-03 | package/lock e providers intactos; sem fetch/IA/Lominger | PASS |
| P-04 | somente M5.1 direta produz `qualifiesAsVerified` | PASS |
| P-05 | ambiguous/unresolved em issues, não em concepts | PASS |
| P-06 | projeção somente leitura; teste sem DML | PASS |
| P-07 | diff sem parser/OCR/publicação/matching | PASS |
| P-08 | migration sem backfill; fixtures sintéticas com rollback | PASS |
| P-09 | explicação limitada a fatos/regras/versões/proveniência | PASS |
| P-10 | anon/inativo/outro tenant negados; helper privado | PASS |
| P-UX-01 | três composições mantêm modelo visual reconhecível | PASS |
| P-UX-02 | browser real + métricas responsivas além dos testes funcionais | PASS |

## Fechamento e limites reais

- A migration `20260918160000_m72_person_professional_evidence.sql` está ativa no Supabase como `20260918081743_m72_person_professional_evidence`; não houve reaplicação de migrations históricas nem backfill.
- Prisma v1.7.2 está ativo no frontend hospedado a partir do commit funcional `8f7473a`; main local, GitHub e checkout da Hostinger foram sincronizados por fast-forward.
- O smoke remoto consultou um Perfil real apenas por contrato/contagens, sem retornar PII e sem escrita. A prova visual completa continua baseada no componente real com fixture sintética. A inspeção visual pós-login em produção ficou `NOT TESTED` porque o navegador disponível não tinha sessão autenticada; nenhuma credencial foi inserida ou contornada.
- Rollback web preservado: `prisma-web:rollback-before-m72-20260918`, imagem `sha256:4e18858eaa7e81b5a2e581f9d042c3c39a33ed046d87d27ad2cd4c8e2770c8b6`. Em reversão de banco, usar migration forward para revogar/remover a RPC; não reescrever Perfis, Knowledge ou M5.1.
