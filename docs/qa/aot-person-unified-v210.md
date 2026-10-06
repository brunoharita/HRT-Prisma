# AoT — Página unificada da Pessoa v2.1.0

Contrato: `docs/qa/agreement-person-unified-v210.md` versão 1.0.0, integralmente lido/congelado. Execução: `docs/qa/execution-person-unified-v210.md`. Baseline local/origin/VPS main `df7b8403d23adefb0d8981f4391e757067e30551`, produto v2.0.12; branch `codex/person-unified-v210`. Classe C com testes negativos das fronteiras D existentes. QA determinístico local, sem banco/LLM externo.

## Matriz de Acordos

| ID | Acordo / implementação | Teste / evidência | Status | Ambiente / limite |
| --- | --- | --- | --- | --- |
| D-01 | `PrismaApplication` unifica as duas entradas; `PersonProfilePage` mantém identidade e seis abas com estado por Pessoa | `personUnifiedRoutes.test.mjs`, `uxFoundation.test.ts`, browser: seis abas/identidade única/destinos | PASS | Navegação real em componentes, dados sintéticos; busca/filtros/retorno usam mecanismo existente |
| D-UX-02 | CSS 72/28, quatro destaques, síntese inteira, oito análises abertas, rail e responsividade | Renders 2048/1024/390, medidas DOM, inspeção visual desktop/celular, texto longo | PASS | Referência normativa e fixture Marina equivalentes; adaptações abaixo |
| D-03 | Reutilização `ProfileHighlightCards`/`profileHighlights`, decoder/classificação, sem cálculo novo | Testes highlights/educação/repositório, MBA+Especialização e dados íntegros nos renders | PASS | Snapshot publicado fictício; qualidade universal de currículo não avaliada |
| D-04 | Nenhum `request` em visita; fontes lazy/cache, narrativa aberta; resumo original em modal | 15 cenários unificados e 11 regressões de síntese; zero IA automática; foco/scroll/fontes e geração só explícita | PASS | Contadores de adapters determinísticos, sem provedor externo |
| D-05 | Carregamentos separados, Perfil vigente preservado, pendências de estados reais; diagnóstico existente de período com destino contextual | Sem Perfil, ausência de pendências, falhas operações/síntese/documento/fonte; `personReviewNotice` e destino `review-focus` | PASS | Sem ausência convertida em obrigação; apenas diagnóstico conhecido recebe campo |
| D-06 | Handlers/adapters operacionais e páginas especializadas mantidos; contato autorizado separado; member não monta workspace; proteção dirty | Person-flow 256/256; contratos/negative routes; member/recruiter/archive/dirty/documentos/auditoria; regressão síntese | PASS | Prova dirigida sintética e revisão do diff; mutações autenticadas reais não executadas |
| D-REL-07 | Registry v2.1.0, owners/current-state/Context Pack; release seletivo e publicação autorizada | Tipos/build/lint/foundation/contextos/CI PASS; SHA6b82358, infra e15HTTP200 em produção | PASS | Somente web; runtime validado e fechamento documental separados abaixo |

## Proibições verificadas

| ID | Guardrail | Teste negativo / evidência | Status |
| --- | --- | --- | --- |
| P-01 | Sem truncamento/acordeão de análise/dados inventados/IA por navegação/permissão ampliada/PII real/mistura versões | Texto longo integral; 8 eixos abertos; zero requests ao visitar/abas/fontes; member sem workspace/version/contact/curadoria; períodos sem invenção; Documento v2 separado de Perfil v3; fixture fictícia | PASS |

## Mapa de Impacto e Preservação

| Capacidade / área | Relação | Baseline / regressão / evidência | Status |
| --- | --- | --- | --- |
| Entrada/abas/cabeçalho/rail | direct | df7b8403: Central e Perfil separados; novas entradas testadas, mesmas rotas operacionais; browser-results.json | PASS |
| Síntese/fontes/cards/publicado | direct | v2.0.12: cálculo/card8 respostas/fontes existentes; 95 testes dirigidos e 11 regressões UI de síntese; texto longo, cache, foco/scroll, falha local | PASS |
| Documentos/revisão/versões/ciclo de vida | plausible_indirect | Handlers, serviços, páginas/RPCs existentes sem mudança; 256 person-flow e controles/destinos sintéticos | PASS |
| Tenant/papéis/contato/dirty/retorno | critical_transversal | Filtros de organização e autorização existentes preservados; negativos member/rotas e dirty cancel preserva texto; `uxFoundation` | PASS |
| Registry/build/release web | direct | Histórico v2.0.12 mantido, v2.1.0 e próxima2.1.1 testados; tipos/build/CI PASS; SHA/versão no bundle, web running0,15HTTP200/rollback | PASS |
| SQL/Parser/Synthesis/Paddle/matching/Posições | no_impact_identified | Diff/plan sem schema/migrations/RPCs/serviço/provider/modelo/prompt/score. SELECT inclui status já existente. Mesmos IDs/imagens/reinícios de Parser/Synthesis/Paddle; workers healthy | PASS |

### Novidade e preservação

- Nova entrega: composição profissional/operacional única, seis abas, resumo original contextual e pendência precisa quando o diagnóstico existente conhece o campo.
- Preservação: cálculos/classificação/evidências, snapshot vigente, fronteiras de acesso, fontes/cache/foco/scroll, documentos/importação/revisão/versões e páginas especializadas existentes.
- Dependência descoberta: Perfil completo precisava exibir detalhes/origem da formação e contato autorizado. Adicionados somente nesta superfície, com contrato/cálculo existentes; sem alterar outros consumidores canônicos.
- Revisão final de D-05: a indisponibilidade operacional passou a ser explícita também na lateral do Resumo e no Histórico, com skeleton independente durante a consulta. Regressão adicional `operations-regression.json` comprova as três superfícies e preservação das oito análises. Sem nova regra de negócio ou alteração de handler.
- Baseline limitado: não havia prova de todas as mutações em Pessoa real neste movimento. QA local testa fixtures determinísticas e fluxos/contratos existentes; smoke público não prova publicação/restauração/curadoria autenticada real. Sem sessão compartilhada QA ou produção humana usada.

## Fora de escopo preservado

| ID | Evidência no diff | Status |
| --- | --- | --- |
| F-01 | Sem matching/Posições/shell/marca/schema/motor/prompt/modelo/dependências novas; nenhuma Pessoa real publicada/curada, LLM ou suíte integral local | PASS |

## Fidelidade visual

| Referência / viewport | Estado e dados equivalentes / render | Comparação estrutural | Divergências | Status |
| --- | --- | --- | --- | --- |
| `evidence/person-unified-v210/approved-reference.png`, 2048 | Marina, Perfil v3, documento novo pendente, 3 organizações, MBA/especialização, narrativa3 parágrafos; `reference-2048.png` | Topologia, hierarquia,72/28,4cards,8eixos2colunas,rail/ordem/ações; DOM e inspeção do render | Tokens/componentes Prisma; períodos/durações reais calculados da fixture e textos operacionais existentes adaptados conforme A-01; sem desvio estrutural | PASS |
| Transformação intermediária,1024 | Mesmo estado; `reference-1024.png` | 2x2 cards, pendências antes da leitura, rail no fluxo, sem overflow | Transformação prevista pelo contrato | PASS |
| Transformação móvel,390 | Mesmo estado; `reference-390.png`; `long-390.png` | 1coluna, pendências prioritárias, abas/ações acessíveis, altura natural e texto inteiro | Transformação prevista pelo contrato | PASS |

## Desvios e mudanças autorizadas

Nenhum desvio material identificado na comparação integral com o acordo. Sem decisão nova de produto/arquitetura. Fontes/dados ilustrativos adaptados pelos cálculos e componentes aprovados; IA gerada por visita foi removida conforme D-04. Autorização explícita inclui main/produção e número v2.1.0; não inclui mutação de dados humanos para teste.

## Validação final

- `pnpm run build`, `typecheck:web`, `build:web`: PASS. Avisos conhecidos de chunk grande/importação dinâmica ineficaz; sem erro.
- Person-flow: 256/256 PASS. Testes existentes de texto estático ajustados à nova entrada e permissão no host correto; negativos funcionais adicionados. Logs FAIL internos do teste do validationRunner são cenários deliberados de propagação de falha, não falha da suíte.
- Dirigidos: 95/95 PASS (período, registry, highlights/formação/repositório, resumo/evidência/curadoria, UX, synthesis/advisory/routes).
- Browser unificado: 15/15 cenários PASS, `evidence/person-unified-v210/browser-results.json`.
- Síntese preservada: 11/11 cenários PASS, `evidence/person-unified-v210/synthesis-regression.json` (texto longo1448/390, fonte/cache, erros locais, análise anterior, consulta sem geração, pendente, falha de fonte, refresh e retry explícito).
- `git diff --check`, lint e foundation: PASS. Context Pack gerado/conferido em cópia limpa do índice Git: PASS. O checker no diretório habitual detectou documentos locais alheios não rastreados; foram preservados e excluídos da cópia, evitando incluí-los na entrega.
- Primeira implementação6697f8a: CI branch37531196095/main37531413330 PASS. Ajuste final6b82358: tipo/build e regressão operacional adicional PASS, CI branch37532031009/main37532222790 PASS. CI executa os gates integrais obrigatórios; local permaneceu proporcional.
- Dispatcher1.0.3,40 arquivos, sem bloqueios: somente web; banco/Edge/Parser/Synthesis dispensados. `release-plan.json` e `release-dry-run.json`. Comandos deduplicados; `pnpm run test` geral sugerido pelo dispatcher foi substituído localmente pela regressão afetada conforme AGENTS, sem retirar gates integrais da CI.
- Smoke público:15HTTP200 e5 verificações de bundle/versão/SHA/textos/assets anteriores, `production-smoke.json`. Infra:7 checks PASS, `infrastructure.json`. Sem token, Pessoa real ou decisão humana.
- Render do site público em browser de teste: NOT TESTED. O processo escalado não pôde iniciar Chrome (EACCES), e o processo local iniciou mas o acesso HTTPS foi negado (ERR_NETWORK_ACCESS_DENIED). Não foi usada sessão humana nem removida restrição; HTTP/assets foram conferidos pelo fluxo de rede autorizado. As27 verificações de cenários UI são locais/sintéticas, não captura de Pessoa em produção.
- Reprodução UI unificada: `pnpm run dev:web -- --config tests/ui/person-unified.vite.config.mts`, depois `node tests/tooling/personUnified.browser.mjs`, com Playwright disponível (`PRISMA_PLAYWRIGHT_PATH`) e navegador (`PRISMA_BROWSER_PATH`). O fixture antigo de síntese permanece em `tests/ui/profile-synthesis.html`; sua autoavaliação registra os cenários descritos acima.

## Git / QA / ambiente

VPS existente verificada: `srv1038882`, `/opt/prisma`, remote oficial, main baseline df7b8403. Web ativo baseline; Parser/Synthesis saudáveis, Paddle ativo. Contêiner experimental `paddle-vl-llama-test` já estava unhealthy antes do movimento e está fora de escopo. Nenhuma alteração nele.

Runtime definitivo `6b823584c49776b7799cec5bb243a19b5be50e3d` integrado por fast-forward e publicado via `deploy/release-web.sh` em06/10/2026. Somente `prisma-web` reconstruído/recriado: imagem `sha256:cc9ad878fa9e0fa925cfd0c7a5982928b83dd193967240b655eb44863db4b071`, running/zero reinícios. Entry servido `index-DjiZ1bdV.js`. Os dois smokes imediatos do script terminaram22 por404 durante recriação; checagens posteriores estabilizaram200 sem rebuild por causa desse404. A segunda construção foi exclusivamente para o ajuste necessário de D-05.

Rollback anterior a todo o movimento: `prisma-web:rollback-before-6697f8a0f258`, imagem `sha256:1cfa7dd7494822a921ebb9dcf413ab33e7dc53ed6d943eb169163f66296595bd`. Rollback intermediário `rollback-before-6b823584c497` também disponível. Assets v2.0.12 mantidos e servidos200. Parser/Synthesis/Paddle preservam exatamente ID/imagem/reinícios do baseline; workers healthy. Nenhuma migration, Edge, mutação de Pessoa ou IA paga.

O fechamento documental posterior ao runtime atualiza apenas AoT/current-state/owner operacional/contextos/evidências. Seu plano dispensa deploy web: sincronizar main local/origin/checkout VPS por fast-forward, mantendo a imagem construída a partir do SHA funcional6b82358. Não apresentar o SHA documental como build novo. Arquivos alheios não rastreados permanecem intactos.

## Conclusão

v2.1.0 implementada, validada e publicada. Todos os D e P aplicáveis PASS nas fronteiras evidenciadas; sem desvio material. Jornada autenticada real permanece NOT TESTED e não é inferida de smoke público. O estado unhealthy experimental preexistente é resíduo alheio ao release, não uma capacidade protegida aprovada neste AoT.
