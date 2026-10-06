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
| D-REL-07 | Registry v2.1.0, owners/current-state/Context Pack; release seletivo e publicação autorizada | Tipos/build/lint/foundation/contextos e publicação em andamento | PARTIAL | Git/CI/VPS/smoke serão registrados após verificação |

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
| Registry/build/release web | direct | Histórico v2.0.12 mantido, v2.1.0 e próxima2.1.1 testados; tipos/build PASS; CI/rollout pendentes | PARTIAL |
| SQL/Parser/Synthesis/Paddle/matching/Posições | no_impact_identified | Diff não muda schema/migrations/RPCs/serviço/provider/modelo/prompt/score. Novas leituras limitadas ao status já existente no SELECT de Pessoa. Serviços remotos baseline verificados, preservação pós-release pendente | PARTIAL |

### Novidade e preservação

- Nova entrega: composição profissional/operacional única, seis abas, resumo original contextual e pendência precisa quando o diagnóstico existente conhece o campo.
- Preservação: cálculos/classificação/evidências, snapshot vigente, fronteiras de acesso, fontes/cache/foco/scroll, documentos/importação/revisão/versões e páginas especializadas existentes.
- Dependência descoberta: Perfil completo precisava exibir detalhes/origem da formação e contato autorizado. Adicionados somente nesta superfície, com contrato/cálculo existentes; sem alterar outros consumidores canônicos.
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
- `git diff --check`, lint e foundation: PASS. Contextos/CI/publicação serão complementados após verificação.

## Git / QA / ambiente

VPS existente verificada: `srv1038882`, `/opt/prisma`, remote oficial, main baseline df7b8403. Web ativo baseline; Parser/Synthesis saudáveis, Paddle ativo. Contêiner experimental `paddle-vl-llama-test` já estava unhealthy antes do movimento e está fora de escopo. Nenhuma alteração nele.

Publicação, rollback/assets/rotas e sincronização ainda não verificadas neste registro inicial. Evidência será complementada sem reconstruir serviços fora do plano seletivo.

## Conclusão

Implementação e QA dirigido aprovados pelas evidências locais. Fechamento operacional pendente; D-REL-07 ainda não é PASS. Jornada autenticada real permanece NOT TESTED e não será inferida de smoke público.
