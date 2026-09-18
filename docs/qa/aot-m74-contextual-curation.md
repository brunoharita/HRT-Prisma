# AoT — M7.4 Curadoria contextual de competências

2026-09-18. Acordo `agreement-m74-contextual-curation.md` v1.0.0; execução `execution-m74-contextual-curation.md`. Baseline `a26472c`. Implementação local na branch `codex/m74-contextual-curation`, release central **Prisma v1.7.4**. Produção fora deste aceite, sem autorização específica nesta etapa.

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
| D-06 | workflow versionado, registro central, owners/ADR/contexto | Builds, testes, contexto e revisão de diff abaixo | PASS | Entrega local, não rollout |

## Proibições verificadas

| ID | Prova | Status |
| --- | --- | --- |
| P-01 | URL local permaneceu no Perfil; gravação/erro/cancelamento/continuação exercitados. Link externo removido. | PASS |
| P-02 | Proposta sem conceito publicado; papéis/escopo server-side; ocupação negada; curadoria somente declarada. | PASS |
| P-03 | Snapshots inalterados por assert SQL; diff sem modelos/parser/matching; nenhuma ferramenta de escrita em produção. | PASS |

## Fora de escopo e autonomia

F-01 preservado: sem produção, merge main, IA nova, reprocessamento pago ou perfis reais. A-01/A-UX-01 usados para adapter, RPC aditiva, chave estável, componentes e breakpoint; sem dependências novas. Descoberta priorizou a Knowledge e o guard de navegação já existentes. Skills supabase e supabase-postgres-best-practices orientaram grants, transação curta e testes negativos; computer-use guiou o smoke real de interface local.

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

Sem QA remoto separado disponível. PostgreSQL 17 descartável em loopback, database `m72_m73_baseline`; runner aplica migrations/fixtures em transação e termina em ROLLBACK. UI local usa adapter sintético; testes de persistência usam funções reais com roles/JWT sintéticos. Isso não substitui E2E hospedado navegador→PostgREST→banco, que permanece NOT TESTED. Produção não acessada nem modificada nesta melhoria. Arquivos preexistentes `.tmp.driveupload/` e `services/paddle/Dockerfile.gpu` preservados fora do commit.

## Rollout posterior

Após aprovação: migration aditiva M74 antes do novo frontend, build com configuração hosted já vigente, smoke autenticado tenant-scoped e verificação de v1.7.4 no login/menu. Não assumir credenciais ausentes: inspecionar o formulário de login antes de solicitar sessão. Rollback: imagem web anterior, mantendo aliases/propostas auditados e RPCs compatíveis; não apagar decisões. Integração em main também depende de aprovação específica.

## Conclusão

Implementação local concluída, D-* e P-* PASS no escopo acordado. Branch de entrega `codex/m74-contextual-curation`, destino verificado `git@github.com:brunoharita/HRT-Prisma.git`; commit/push identificados no fechamento da tarefa. Sem merge main ou produção. Aplicação hospedada e E2E remoto permanecem fora deste aceite e dependem da autorização de rollout.
