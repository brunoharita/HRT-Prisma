# AoT — M7.2 Perfil de Competências e Evidências

Contrato: `docs/qa/agreement-m72-person-professional-evidence.md` 1.0.0. Execução: `docs/qa/execution-m72-person-professional-evidence.md`. Data: 2026-09-18. Ambiente: local. Status: implementação e prova local; sem migration remota, deploy, merge ou produção.

## Evidências

- E1 — `supabase/qa/m72_person_professional_evidence_verification.sql` em PostgreSQL 17 local descartável `m72_contract_tests_1`, com migrations reais até M7.2 e rollback das fixtures. PASS para Perfil vigente, Knowledge publicada, declaração, M5.1 ativa/suficiente, M5.1 invalidada/insuficiente, ambiguidade, versão incompatível, membro autorizado, outro tenant, inativo e anon.
- E2 — `tests/personProfessionalEvidence.test.ts`: decoder fail-closed, agrupamento por identidade/tipo, múltiplas naturezas, contagens, demonstração inválida, ambiguidade, guardrails SQL/UI e release.
- E3 — `tests/productRelease.test.ts` e fonte central consumida por login/sidebar: Prisma v1.7.2; harness real exibiu v1.7.2 na barra lateral.
- E4 — `pnpm run lint`, `pnpm run check:foundation`, typecheck de domínio/web e build web: PASS. Teste dirigido de M7.2, release, perfil canônico, M7.1, matching e M6.2: 37/37 PASS. Tooling/Context Pack: 12/12 PASS. Build manteve apenas o aviso preexistente de chunk Ant Design acima de 900 kB.
- E5 — comparação visual local por `tests/ui/m72.html`, componente real, dados sintéticos e nenhuma escrita remota. Resumo, Competências e Evidências foram inspecionados no desktop; mobile 390 × 844 confirmou empilhamento, origem/detalhe e `scrollWidth` 375 para largura interna 390. Topologia, hierarquia, agrupamentos, ordem e ações correspondem às três referências; avatar usa iniciais porque foto não pertence ao contrato disponível. Sem divergência estrutural material observada.
- E6 — navegação de origem: `PersonProfilePage` preserva documento/review/campo/página/região/link em sessão; `ProfileReviewPage` seleciona o campo, abre o painel documental e navega para a região quando disponível. Sem região, a UI declara a limitação.
- E7 — revisão de diff/owners/ADR-062/Context Pack. Nenhum arquivo de fórmula de matching, parser/OCR, fonte externa ou dependência alterado. Material alheio `.tmp.driveupload/` e `services/paddle/Dockerfile.gpu` preservado.

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
| D-15 | guarda server-side + authenticated; membro permitido; negativos | E1 | PASS | migration apenas local |
| D-16 | fixture sintética e sem logging de payload | E1, E5, E7 | PASS | nenhum dado real usado |
| D-17 | versões matching/score e arquivos fora do diff | E2, E7 | PASS | regressão dirigida |
| D-18 | decoder/RPC `person-professional-evidence-1.0.0` | E1, E2 | PASS | futuro falha fechado |
| D-19 | owners, ADR, AoT e Context Pack | E7 | PASS | local |
| D-20 | registro M7 entrega 2; login/sidebar centralizados | E2, E3 | PASS | hospedado segue v1.6.4 |
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

- A migration `20260918160000_m72_person_professional_evidence.sql` está preparada no repositório, não aplicada ao Supabase.
- O código hospedado continua v1.6.4; Prisma v1.7.2 é o estado aceito no código local e no branch de entrega.
- Não houve smoke com Pessoa real nem escrita remota. A prova visual usa dados sintéticos e a prova SQL usa base descartável.
- Rollback local: reverter o commit da entrega. Em eventual rollout futuro, publicar migration aditiva antes do web; rollback web pode retornar ao bundle anterior e revogar/remover a RPC por migration forward, sem reescrever Perfis, Knowledge ou M5.1.
