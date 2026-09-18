# AoT — M7.4 Curadoria contextual de competências

2026-09-18. Acordo `agreement-m74-contextual-curation.md` v1.1.0; execução `execution-m74-contextual-curation.md`. Baseline `a26472c`. Implementação `d762b1d`, autorização e runtime `98bdf9c`, release central **Prisma v1.7.4**. Após aceite local, Bruno autorizou main e produção e estabeleceu entrega completa como padrão, salvo veto explícito. Regra registrada no AGENTS.md v1.3.0.

## Matriz de Acordos

| ID | Implementação | Teste e evidência | Status | Ambiente / limite |
| --- | --- | --- | --- | --- |
| D-01 | `CompetencyCuration`, adapter Supabase e reutilização Knowledge | Painel/candidatos/fonte/escopo/justificativa inspecionados; alias e proposta nas verificações SQL | PASS | UI sintética + PostgreSQL local |
| D-02 | retorno/avanço e projeção na resposta transacional | Cancelar no item 14/página 2; gravar 59→58, foco As-Is/To-Be; gravar/próximo 58→57, Operating model aberto; proposta mantém 57 | PASS | Navegador CUA, fixture M74 |
| D-03 | chave composta com ocorrência, próximo/anterior, clamp e filtros | Testes de domínio: último item, página vazia, duplicatas, filtro e lista vazia. UI: erro preserva formulário; busca Operating preservada ao descartar; foco restaurado após modal | PASS | Domínio + browser |
| D-04 | `require_knowledge_admin`, empresa padrão, Global adicional | PostgreSQL: owner/admin empresa, super_admin Global, recusas anon/member/inativo/outsider/Global indevido; proposta não publica e não duplica | PASS | Dados inteiramente sintéticos, rollback |
| D-05 | RPC transacional, leitura V3, aliases auditados, snapshots intactos | SQL: conflito humano, Perfil antigo, trecho forjado, ocupação/empresa alheia negados; resposta com método/justificativa; replay 40001; snapshots e número de calls preservados | PASS | Sem IA ou mutação remota |
| D-UX-01 | lista esquerda, seleção azul, painel direito não modal, ações fixas | Captura desktop 1586×992, página 2/item 14/BPMN, comparada ao mockup aprovado; lista utilizável sem máscara | PASS | Shell real preservado |
| D-UX-02 | tela inteira até 1200px, foco/ciclo teclado, confirmação e guard de navegação | Captura 390×844; Shift+Tab → Cancelar, Tab → Fechar, Escape → Operating model/página 2; sem overflow horizontal; descarte confirmado e continuar editando | PASS | CUA + guard existente |
| D-06 | workflow versionado, registro central, owners/ADR/contexto | Builds, testes, contexto e revisão de diff abaixo | PASS | Local e fechamento operacional |
| D-07 | main, migration e frontend publicados; autorização permanente registrada | CA-04: grants remotos, imagem/rollback, HTTP 200, UI autenticada e cancelamento na página 2 | PASS | Produção; nenhuma curadoria real gravada no smoke |

## Proibições verificadas

| ID | Prova | Status |
| --- | --- | --- |
| P-01 | URL local permaneceu no Perfil; gravação/erro/cancelamento/continuação exercitados. Link externo removido. | PASS |
| P-02 | Proposta sem conceito publicado; papéis/escopo server-side; ocupação negada; curadoria somente declarada. | PASS |
| P-03 | Snapshots inalterados por assert SQL; diff sem modelos/parser/matching; rollout limitado à migration aditiva e frontend autorizados, sem inventar curadoria humana. | PASS |

## Fora de escopo e autonomia

F-01 revisado pelo Product Owner: main e produção incluídos em D-07; continuam excluídos IA nova, reprocessamento pago e decisões de curadoria reais para teste. A-01/A-UX-01 usados para adapter, RPC aditiva, chave estável, componentes e breakpoint; sem dependências novas. Descoberta priorizou a Knowledge e o guard de navegação existentes. Skills supabase e supabase-postgres-best-practices orientaram grants, transação curta e testes negativos; computer-use guiou os smokes local e hospedado.

## Fidelidade visual

Referência normativa: imagem aprovada `C:/Users/Bruno/.codex/generated_images/01a0b361-bb0c-79e3-acf8-d4abb0d51be0/exec-8ed2a0bd-1697-4348-bef8-fb0e64a4a2a0.png`.

Render reproduzível: `tests/ui/m74.html` + `tests/ui/m74/main.tsx`, com o Vite config de M72. Capturas efetivamente renderizadas nesta tarefa pelos passos CUA “Registrar comparação visual desktop, página 2 e item 14” e “Abrir revisão móvel após estabilização do layout”. Estado desktop equivalente: 59 pendências, dez itens/página, item 14 BPMN selecionado na página 2, declaração BPM/BPMN; candidatos e pessoa sintéticos. Captura móvel posterior: Operating model, página 2, após os testes de gravação. Não são capturas de produção.

Topologia, hierarquia e ordem mantidas: lista pesquisável à esquerda, painel à direita, declaração/termo, busca/definição/fonte, alcance/justificativa, ações fixas. Ajustes sob A-UX-01: sidebar/cabeçalho reais em vez do shell ilustrativo; largura limitada a 620px/40vw, título de lista pode quebrar linha; fonte do candidato identificada como sintética. Móvel vira tela inteira. Nenhuma substituição de topologia ou campo material. Teste não afirma identidade de pixels.

## Desvios e decisões durante a execução

Nenhum desvio funcional do acordo. Foram corrigidos durante o smoke: fonte/definição herdando font-size zero do Radio.Group, título estreito e foco perdido durante busy/desmontagem do modal. Fixtures de papéis ajustadas às constraints/triggers reais antes do resultado SQL final. Nenhuma nova decisão material ou ampliação de autoridade.

## Validação final

- `pnpm run lint`: PASS, 566 arquivos.
- `pnpm run build` e `pnpm run typecheck:web`: PASS.
- `pnpm run build:web`: PASS; avisos de chunk grande e import dinâmico já coexistente, sem erro.
- Node: `profileCompetencyCuration`, `competencyNormalization`, `personProfessionalEvidence`, `productRelease`: 19/19 PASS; `uxFoundation`: 10/10 PASS.
- `scripts/test-m74-postgres.ps1`: PASS, integração M73/M74 e negativos com ROLLBACK final. Casos Global/admin, conflito humano e proposta repetida incluídos.
- `generate:prisma-context`, `check:prisma-context` e testes `prismaContext`: PASS, 3/3. O resumo M73 foi compactado com referência ao AoT original para respeitar 60 mil caracteres, sem editar exports manualmente.
- `git diff --check`: PASS. Diff revisado nas superfícies, adapter, identidade/retorno, autorização e migration. Não executado `pnpm run validate` integral.
- Smoke final: v1.7.4 visível no shell; no móvel painel 390px, scroll de fundo bloqueado apenas enquanto aberto, Cancelar restaurou overflow original e foco BPMN/página 2. Viewport restaurado, aba de fixture fechada e Vite temporário encerrado. Avisos de Fast Refresh/createRoot durante edição da fixture não ocorreram como falha funcional do build entregue.

## Git / QA / ambiente

Sem QA remoto separado disponível. PostgreSQL 17 descartável em loopback, database `m72_m73_baseline`; runner aplica migrations/fixtures em transação e termina em ROLLBACK. UI local usa adapter sintético; testes de persistência usam funções reais com roles/JWT sintéticos. E2E hospedado de leitura e cancelamento PASS; gravação real pelo navegador permanece NOT TESTED por F-01, não sendo substituída silenciosamente pela prova local. Arquivos preexistentes `.tmp.driveupload/`, `services/paddle/Dockerfile.gpu` e `models/` na VPS preservados.

## Rollout autorizado e smoke de produção

- main local/GitHub e checkout `/opt/prisma` da VPS integrados por fast-forward em `98bdf9c`; fechamento documental posterior não altera o runtime. Destino GitHub conferido, sem force-push.
- Supabase único `ioldpnqqvobprjiontre`: migration local `20260918190000_m74_contextual_competency_curation.sql` aplicada antes da UI e registrada como `20260918134315_m74_contextual_competency_curation`.
- Funções de curadoria e leitura V3: SECURITY DEFINER, search_path vazio, anon sem EXECUTE e authenticated autorizado; guards negativos já provados no PostgreSQL local.
- Web construída com `PRISMA_DEPLOY_COMMIT=98bdf9c`, `VITE_DOCUMENT_INTELLIGENCE_MODE=baseline` e `VITE_PARSER_IA_MODE=hosted`. Somente `prisma-web` recriado via `up -d --no-deps prisma-web`, início 2026-09-18T13:44:27Z. Imagem `sha256:0f853b35248ee1a9911b1935a2178acc776fc6dc91a6278eb3da6beb0d637489`; HTTPS 200. Tag legada de imagem no Compose não define a versão do produto.
- Rollback conservado: `prisma-web:rollback-before-m74-20260918`, imagem `sha256:8bbcce5ad320e3e453eb363a63d2e63f769c674177d99f44b505fb334a90e2ff`. Restaurar web anterior mantendo RPCs compatíveis e decisões auditadas, nunca apagar aliases/propostas. Gateway permaneceu na imagem `sha256:a8fceee917710b3860d597ed5f8bd6849dad93aabebeaa668c5bdff2401ee2b7`, sem recriação; workers/Traefik não alterados.
- `/sign-in` reutilizou a sessão e abriu a Home. Menu mostrou v1.7.4. O formulário de login não foi exibido, portanto preenchimento e aparência não foram observados; código do login e menu usa o mesmo `PRISMA_RELEASE.displayVersion`.
- Perfil vigente real: Competências → página 2 (11–20 de 60) → item 14 → painel com declaração, candidatos/fonte, alcance empresa padrão, justificativa e ações fixas. Captura CUA “Conferir o painel de produção renderizado” comprovou lista e painel lado a lado, sem navegação à Knowledge. Cancelar fechou o painel e restaurou foco no item 14, página 2 e contagens intactas. Nenhuma decisão foi gravada.
- Limite observado da busca Knowledge reutilizada: o termo Priorização trouxe candidatos C/R não equivalentes. Não foram selecionados nem aprovados. Este smoke comprova transporte e contexto, não qualidade semântica dessas sugestões; não houve mudança do mecanismo de busca neste movimento.
- Advisors: 7 INFO de RLS sem policy em tabelas existentes/service-only, 72 WARN de funções SECURITY DEFINER executáveis por authenticated (incluindo as duas RPCs M74 intencionalmente protegidas por guards), 1 WARN de proteção contra senha vazada desativada. Não são zero alertas; configuração Auth e funções alheias não foram alteradas. Container experimental Paddle já unhealthy permaneceu fora do escopo.

## Conclusão

Entrega M7.4 e rollout concluídos, D-* e P-* PASS no acordo revisado. Prisma v1.7.4 ativo; main local/GitHub/VPS sincronizados com a entrega e fechamento documental. Escrita real em produção não exercitada para evitar fabricar decisões humanas. Qualidade das sugestões e alertas preexistentes permanecem limites explícitos, sem serem apresentados como validação semântica ou ausência de riscos.
