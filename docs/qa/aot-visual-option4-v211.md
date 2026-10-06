# AoT — Comunicação visual Prisma v2.1.1

Contrato integral: `agreement-visual-option4-v211.md`1.0.0, execução `execution-visual-option4-v211.md`. Aprovação explícita de Bruno inclui a opção4 e publicação2.1.1. Classe C, branch codex/visual-option4-v211, baseline main/local/VPS b781870c5b4df0fe71ac6e1035290da2c620929e.

## Matriz de Acordos

| ID | Implementação | Teste / evidência | Status / limite |
| --- | --- | --- | --- |
| D-UX-01 | Theme16px, títulos30–36, cabeçalhos de áreas com ícones56–64px, cards compartilhados20px | Tipos/build;6páginas reais com adapters sintéticos em1516/768/390/320 | PASS:27cenários visuais e medidas DOM |
| D-UX-02 | Destaques tonais16px de raio, ícones32 em56, valores25px/rótulos14; síntese/8eixos preservados | Browser Pessoa15cenários PASS; renders1516/390/320 e medidas DOM PASS | PASS |
| D-UX-03 | Home/indicadores/fontes e padrões de entrada tonais, leitura branca | Capturas/valores factuais e medidas DOM, Home32px/rótulo15px | PASS |
| D-UX-04 | Componentes acessíveis e handlers existentes, foco/reflow | Pessoa15cenários PASS,46dirigidos PASS; revisão32checks PASS,menu/teclado/reflow PASS | PASS |
| D-REL-05 | Registry2.1.1, owner/current-state/contextos e release web seletivo | Produção/CI ainda pendentes | NOT TESTED |

## Proibições verificadas

| ID | Evidência | Status |
| --- | --- | --- |
| P-01 | Diff de apresentação apenas;15cenários Pessoa e46testes dirigidos incluindo member/recruiter/dirty/fontes/rotas/classificação/cálculos; nenhum banco/LLM real | PASS nas fronteiras sintéticas e diff revisado |

## Mapa de Impacto e Preservação

| Capacidade / área | Relação | Baseline / regressão | Status |
| --- | --- | --- | --- |
| Theme/foundation/headers/cards e consumidores | direct | v2.1.0;6páginas reais,4larguras,DOM/capturas/ações | PASS |
| Pessoa/destaques/síntese/fontes | direct |4cards/8eixos,72/28 e cálculos existentes;15cenários/46dirigidos | PASS |
| Listas/formulários/diálogos/revisão | plausible_indirect | Sem novo handler;reflow/teclado/foco/revisão32checks | PASS |
| Tenant/papéis/dirty/seleção/geometria | critical_transversal | Negativos member/recruiter e dirty PASS;CSS não seleciona canvas/regiões/evidence highlights;revisão32checks/46dirigidos; nenhum seletor novo de geometria | PASS |
| Registry/release web | direct | webcc9ad878 em baseline;rollback/SHA/assets/CI | NOT TESTED |
| SQL/IA/Parser/matching/Paddle | no_impact_identified | Sem arquivos de runtime/domínio alterados, containers baseline registrados | PASS local/plano; preservação operacional final pendente |

### Novidade e preservação

Nova entrega: linguagem visual4 transversal, sem mudança estrutural. Preservação: funções, informação integral, cores de estado, marca e navegação existentes. Nenhuma dependência nova. SVG semântico simples para capelo/maleta porque a biblioteca instalada não oferece esses símbolos com a silhueta desejada.

Baseline limitado: fixtures determinísticas; não há autorização/necessidade de alterar Pessoas humanas para teste. Smoke público não estabelece jornada autenticada real ou qualidade universal de currículo. Arquivos alheios não rastreados foram preservados.

## Fora de escopo preservado

F-01: sem redesign estrutural, marca/login ilustrado, schema, IA, matching ou dados reais. PASS por diff/plano: somente web,zero migrations/Edge/Parser/Synthesis.

## Fidelidade visual

Referência normativa `evidence/visual-option4-v211/approved-option4.png`,1516x1037. Mesmo viewport no render `person-same-viewport.png`, dados ilustrativos Marina/4organizações/MBA/graduação e textos equivalentes. Duracões, rótulos, pendências, proveniência e fontes usam contratos/cálculos existentes, conforme A-UX-01; não são copiados como fatos do bitmap.8eixos mantidos abaixo da dobra;capturas integrais e390/320 identificam transformação. Inspeção visual desktop/celular concluída. Hierarquia25/14px, ícones32/56px, tons, proporção e agrupamento reconhecíveis. Conteúdo real mais longo amplia altura dos cards, conforme D-UX-02/A-UX-01, sem truncamento; nenhuma alteração estrutural material.

## Desvios do contrato

Inspeção visual desktop/celular concluída. Hierarquia25/14px, ícones32/56px, tons, proporção e agrupamento reconhecíveis. Conteúdo real mais longo amplia altura dos cards, conforme D-UX-02/A-UX-01, sem truncamento; nenhuma alteração estrutural material. Sem decisão material nova de produto.

## Validação final

Tipos raiz/web,build web,lint/foundation,diff-check PASS.46testes dirigidos PASS.27cenários visuais (24áreas+3Pessoa),15regressões Pessoa,32checks revisão PASS; sem banco/LLM externo. UI de áreas: run integral e rerun das larguras1516/390 após correção da precedência antiga de Home;768/320 inalterados preservados da execução integral. Evidências agregadas sem reapresentar medição antiga como nova. Dispatcher1.0.3 sem bloqueios,web=true,demais destinos=false; comandos deduplicados e teste geral substituído localmente por regressão proporcional conforme AGENTS. CI mantém gates obrigatórios integrais.

Primeira falha do smoke de áreas foi um locator exato que incluía nome acessível do ícone; corrigido para o botão correto. Primeira verificação de Escape ocorreu antes do foco/animação; corrigida espera/foco do teste, sem alterar navegação do produto. O smoke de revisão150ms observava foco antes dos dois animation frames; o teste passou a aguardar o foco efetivo mantendo a mesma asserção. A fixture visual passou a usar meses explícitos na experiência antiga, preservando o contrato que rejeita cronologia ambígua. Nenhum cálculo de domínio foi alterado.

Context Pack gerado/conferido em cópia dos arquivos rastreados PASS; documentos locais alheios excluídos da cópia e preservados. CI e publicação pendentes.

## Git / QA / ambiente

Baseline operacional em production-baseline.txt. Somente VPS/remote oficiais. Release e sincronização ainda pendentes.

## Conclusão

Entrega em validação; não declarar publicada até CI, rollout e smoke finais.
