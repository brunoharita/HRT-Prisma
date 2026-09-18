# AoT — M7.1 Taxonomia Profissional e Inteligência de Posições

Contrato: `docs/qa/agreement-m71-position-taxonomy.md` 1.0.0 + texto integral em `docs/qa/execution-m71-position-taxonomy.md`. Data: 2026-09-18. Status: implementação/prova local. Não significa rollout remoto.

## Evidências

- E1 — `supabase/qa/m71_position_taxonomy_verification.sql`, executado com sucesso no PostgreSQL 17 local (loopback 55471, base descartável m71_contract_tests_4). RPCs atuais, autorização/RLS reais das migrations, usuários/empresas sintéticos, SET ROLE authenticated/anon, rollback das fixtures. Confirma alias/prioridade, ambiguidade, single/multisource aprovado, métricas, versões, correção, ausência de promoção e negativos de autorização. Versão final das funções reaplicada pelo runner local e verificada.
- E2 — `pnpm run build` + Node test dirigido: positionTaxonomy, vacancyIntelligence, matchingScore, m62VerificationJourney, knowledgeFoundation, knowledgeNormalization e productRelease: **88/88 PASS**. Sem suite completa nem LLM.
- E3 — navegador local, componente real `PositionTaxonomyPanel` montado por `tests/ui/m71.html`; serviços/atores sintéticos, sem escrita remota. Desktop 1764 px e viewport mobile 390 × 844. Resolução visível, fonte O*NET 31.0; inclusão desejável aumenta requisitos de 0 para 1; desfazer referência preserva título e requisito; criar/associar complemento mantém 1 e inclusão obrigatória explícita passa a 2. Ambiguidade mantém conceito vazio até escolha; seleção humana altera conceito e mantém nome da empresa. Drawer mostra histórico e operador; Escape fecha e foco retorna ao botão de origem. Modal e drawer mobile legíveis; largura útil 375 e scrollWidth 375, sem overflow horizontal. Erro simulado oferece retry, mantém 2 requisitos e texto; carregamento observado. Aviso de depreciação List da versão Ant Design existente, sem exceção funcional observada.
- E4 — `pnpm run typecheck:web` e `pnpm run build:web`: PASS. Build conserva aviso de chunk Ant Design >900 kB, não introduziu dependência nova.
- E5 — inspeção read-only do backend `ioldpnqqvobprjiontre`: CBO CBO 2002-2025-06-06, ESCO 1.2.1 e O*NET 31.0 publicadas/correntes; zero reconciliações aprovadas. Identificadores O*NET/ESCO da fixture vêm de linhas/snapshots observados; relações/crosswalk de teste são explicitamente sintéticos, nunca alegados como publicação real.
- E6 — revisão do diff, owners/ADR-060, Context Pack gerado/checker e higiene do diff no fechamento. Nenhum arquivo de matching-score, M6.2, parser, perfil ou provider alterado. Fórmula, pesos, versão de matching 5.0.0 e score 1.2.0 mantidos.

## Matriz de Acordos

| ID | Acordo | Implementação | Teste / evidência | Status | Ambiente / limitação |
| --- | --- | --- | --- | --- | --- |
| D-01 | Reusar fundação | Conceitos/termos/relações/mappings/RPCs existentes | E1, E2, ADR-060 | PASS | local; sem tabela paralela |
| D-02 | Fontes oficiais publicadas | m71_official_links, filtro fonte/status/current | E1, E5 | PASS | sem fetch externo |
| D-03 | Sob demanda | preview por título/ocupação; sem backfill | E1, E2, E6 | PASS | nenhum lote massivo |
| D-04 | Preservar título | save restaura título literal; changeTaxonomyTitle | E1, E2, E3 | PASS | texto humano intacto |
| D-05 | Conceito/estados/multisource | preview + reconciliações aprovadas | E1, E3 | PASS | crosswalk multisource sintético |
| D-06 | Automático seguro e visível | alias exato, método e card | E1, E3 | PASS | não aproxima por substring |
| D-07 | Ambiguidade humana | ambiguous sem seleção; picker | E1, E3 | PASS | alias ambíguo também bloqueia auto |
| D-08 | Insuficiência/manual/Inbox | unresolved, clear, save sem referência | E1, E3 | PASS | falha transacional não vira sucesso |
| D-09 | Proveniência por ligação | mapping/source/snapshot/método/data | E1, E2, E3 | PASS | fonte histórica preservada |
| D-10 | Agrupamento sustentado | tipos publicados; dedup por ID | E1, E2 | PASS | não funde rótulos iguais |
| D-11 | Sugestões não requisitos | items separados da definição | E1, E3 | PASS | listas vazias neutras |
| D-12 | Seleção explícita | selectTaxonomyRequirement required/desired | E1, E2, E3 | PASS | modelo existente |
| D-13 | Métricas originais | relation_attributes e detalhe progressivo | E1, E2 | PASS | não cria proficiência/peso |
| D-14 | Complemento tenant-owned | create/reuse Organization | E1, E3 | PASS | autoridade admin existente |
| D-15 | Criar/associar ≠ exigir | complement IDs separados dos requisitos | E1, E3 | PASS | três ações distinguíveis |
| D-16 | Corrigir/desfazer | seleção, cleared, nova versão | E1, E3 | PASS | requisitos anteriores preservados |
| D-17 | Feedback sem Global | Inbox da empresa, curadoria vigente | E1 | PASS | nenhum alias Global automático |
| D-18 | Reuso escopado/versionado | publicação corrente; aliases aprovados | E1, E2, E6 | PASS | remount por viewScope já existente |
| D-19 | Acesso ao porquê | card e drawer de explicação | E3 | PASS | também histórico sem contrato |
| D-20 | Explicação completa | título, termos, conceito, fontes, regra, ator, versão/histórico | E1, E3, E4 | PASS | fatos/regras, não raciocínio privado |
| D-21 | Origem por item | TaxonomyOriginDetails + origem no requisito | E1, E2, E3 | PASS | detalhes técnicos progressivos |
| D-22 | UX responsiva/a11y/recuperação | PrismaCard, Ant Design, cancelamento/timeouts | E3, E4 | PASS | componente real, adaptador sintético |
| D-23 | Separar Pessoa | nenhum estado de evidência de Pessoa na taxonomia | E1, E2, E6 | PASS | zero Pessoa criada |
| D-24 | Comparação posterior separada | metadados não entram como evidência | E2, E6 | PASS | matching preservado |
| D-25 | Matching compatível | funções/fórmula/pesos intactos | E2 | PASS | A/B/C e M6.2 |
| D-26 | Owner real da tela | vacancy_versions sob UI Posições | E1, E6 | PASS | entidades não fundidas |
| D-27 | Reconstituição | snapshot + ledger + origem + versão esperada | E1, E3 | PASS | sem sobrescrever histórico |
| D-28 | Autorização/RLS | guard server-side e RLS herdada | E1 | PASS | negativos como authenticated/anon |
| D-29 | Ausência neutra | unresolved/sem relações não é deficiência | E2, E3 | PASS | nenhuma penalização inventada |
| D-30 | Mudanças auditáveis | ator/decisão/savedBy/previousVersion separados | E1 | PASS | decisão mantida preserva autor original |
| D-31 | Fontes reais, mocks não são dados | consultas E5; códigos versionados na fixture | E1, E5 | PASS | sem PII real |
| D-32 | Reuso futuro sem M7.2 | DTO/grupos sobre conceitos existentes | E2, E6 | PASS | nenhuma tela de Pessoa alterada |

## Proibições verificadas

| ID | Guardrail | Teste negativo / evidência | Status |
| --- | --- | --- | --- |
| P-01 | Sem Lominger | Filtro explícito de 3 fontes; E1/E2 | PASS |
| P-02 | Sem web research da taxonomia | E2/E6; novo fluxo não chama Agent/fetch | PASS |
| P-03 | Sem fonte nova | E1 rejeita fonte fora da lista | PASS |
| P-04 | Sem IA/provider/embedding novo | E2/E6; package/lock intactos | PASS |
| P-05 | Sem ontologia massiva | E1/E6; zero tabela nova/backfill | PASS |
| P-06 | Não substituir título | E1/E2/E3 | PASS |
| P-07 | Não restringir fonte única | E1 multisource aprovado | PASS |
| P-08 | Não perder proveniência | E1 dedup mantém duas origens | PASS |
| P-09 | Não exigir todas as sugestões | E1 zero requisitos após preview/save | PASS |
| P-10 | Não classificar automaticamente | E2/E3 required/desired só por clique | PASS |
| P-11 | Sem score/proficiência novo | E1 métricas brutas; E2/E6 | PASS |
| P-12 | Não mudar matching | E2, 62 testes de matching/Posições/M6.2 | PASS |
| P-13 | Não criar evidência de Pessoa | E1 zero Pessoas; E2/E6 separação | PASS |
| P-14 | Sem M7.2 | E6 escopo do diff | PASS |
| P-15 | Sem carreira/sucessão/mobilidade | E6 escopo do diff | PASS |
| P-16 | Sem avaliação/360 novo | E2/E6 | PASS |
| P-17 | Sem promoção Global automática | E1 DML Global bloqueado; contagem Global inalterada | PASS |
| P-18 | Sem editar fonte por necessidade da empresa | E1/E6 mutações limitadas ao overlay/versão | PASS |
| P-19 | Sem obrigatoriedade paralela | E1/E2 contrato required/desired existente | PASS |
| P-20 | Não ocultar normalização | E3 card, explicação, correção | PASS |
| P-21 | Não bloquear silenciosamente | E1 unresolved salvo; E3 erro/retry preserva edição | PASS |
| P-22 | Não relaxar autorização | E1 anon, member, inativo, outro tenant, helpers, DML | PASS |
| P-23 | Não inventar ontologia comum | E1/E2 tipos/IDs reais; CBO família não vira skill | PASS |
| P-24 | Não copiar dados ilustrativos | E5 e fixture com arquivo/linha/versão observados | PASS |

## Fora de escopo preservado

| ID | Evidência no diff | Status |
| --- | --- | --- |
| F-01 | Sem alterações em Pessoa/M7.2/parser/OCR/verificação/fórmula/carreira | PASS |
| F-02 | Sem provider externo/research/nova arquitetura de Knowledge | PASS |
| F-03 | Sem migration, merge, deploy ou dados reais escritos remotamente; somente commit/push de código autorizados | PASS |

## Desvios e decisões de execução

Nenhum desvio funcional do acordo. A mudança de UX substitui o gate de referência obrigatório e a etapa IA anteriores por determinação/seleção explicitamente autorizadas; RPCs legadas preservadas. Grupos visuais são tipos reais, não grupos de software dos mocks. A versão pública permanece v1.6.4 conforme a política: código local validado não inventa aceite/ativação de nova entrega pública. Não houve nova decisão material nem expansão de fonte/provider.

O teste local foi preparado com schemas mínimos auth/storage, min(uuid) de compatibilidade e remoção do helper antigo antes de M2 recriar suas políticas no banco vazio. Duas correções textuais históricas de currículo que não reaplicam sobre a migration atual e o monitor remoto Vault/Cron/net foram excluídos do bootstrap. Nenhuma migration canônica antiga foi editada; todos os owners atuais de Posições, Knowledge e RLS foram aplicados. É prova dirigida do M7.1, não certificação do replay histórico integral ou equivalência da plataforma Supabase completa.

## Validação final / reprodução

Revisão final adicional: `saveAsRole` agora descarta `taxonomyOrigin` arbitrário do cliente antes da cópia para `job_roles.requirements_template`. A versão da Posição recebe somente origem recomposta no servidor. Caso negativo com origem forjada/cross-tenant passou na verificação SQL e o caminho é coberto também pelo teste de contrato. Não houve rollout da versão anterior nem mudança de contrato; correção integra o mesmo M7.1.

1. PostgreSQL local descartável, usuário m71_test, loopback, porta 55471: `pwsh -NoProfile -File scripts/test-m71-postgres.ps1 -Database m71_contract_tests_4 -VerifyOnly -RefreshFunctions`. Para base nova, omitir VerifyOnly/RefreshFunctions e escolher nome m71_* inexistente. O runner nunca reseta base existente.
2. Build/88 testes/typecheck/build web conforme E2/E4.
3. UI: `node node_modules/vite/bin/vite.js --config tests/ui/m71.vite.config.mts`; abrir `http://127.0.0.1:5571/m71.html`. Harness fora da entrada/build de produção, URL/key sintéticas loopback, mocks explícitos de todas as quatro operações.
4. `pnpm run generate:prisma-context` e `pnpm run check:prisma-context`; higiene e revisão somente dos arquivos do movimento. Não executar validate completo.
5. Rollout futuro exige autorização: migration antes do frontend, smoke autenticado e sem PII, sem confundir ambiente único remoto com sandbox local. Nenhuma prova UI contra backend remoto novo é alegada.

## Git / ambiente / resíduos

Baseline 1215c6e1cdd603a741e14def6724525b4fded2cb; branch codex/m71-position-taxonomy. Entrega em commit coerente e push ao origin existente conforme autorização permanente; SHA final e igualdade da ref são informados no relatório de fechamento. Sem merge/deploy. Material alheio preservado: .tmp.driveupload/ e services/paddle/Dockerfile.gpu. Bases/logs descartáveis da verificação ficam em tmp/ ignorado; processos auxiliares desta tarefa são encerrados no fechamento.

## Conclusão

D-01–D-32 e P-01–P-24 PASS no escopo local acima. Implementação local concluída com validação proporcional. M7.1 **não está ativado no backend/frontend hospedados**; isso depende de autorização de rollout. Ausência de reconciliações aprovadas limita consolidação real entre fontes por governança, não por equivalência inventada.
