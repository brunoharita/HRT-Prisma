# Cabeçalhos e cargos de Pessoas — correção visual sem mudança de versão

## Acordo 1.0.0 e execução congelada

Bruno aprovou em17/10/2026 corrigir cabeçalhos e cargos conforme a diretriz, preservar densidade, validar, integrar em main e publicar sem alterar a versão3.1.1. Restauração de `docs/product/ux-foundation.md`1.5.0, tabela compacta14/20 e complementos12/18; sem nova decisão de produto.

- D-01: cabeçalhos14px/20px/peso600; cargos da tabela14px/20px/peso400; equivalente móvel com14px/peso400 e entrelinha existente preservada. CA-01: estilos computados no navegador.
- D-02: manter nomes600, complementos12/18, padding/densidade, conteúdo, cores, busca, seleção, ordenação, colunas e responsividade. CA-02: mesmas fixtures/estados/viewports antes/depois e interações dirigidas.
- D-03: publicar somente web, preservar versão3.1.1, demais serviços/configuração/dados e rollback; main/origin/VPS sincronizados. CA-03: CI, SHA/versão/assets/rotas/serviços e recuperação.
- P-01: não alterar regra de negócio, contratos, acesso, dados, IA ou publicação de Perfil.
- F-01: redesenho de tela, normalização global, outras tabelas/telas, funcionalidades e nova versão.
- A-01: CSS estritamente escopado a Pessoas; reutilizar Ant Design, tema, fixture e fluxo seletivo existentes. Screenshot é evidência do defeito, não nova topologia normativa. Nenhuma Q pendente.

Execução: implementar integralmente D-01 a D-03 preservando P-01/F-01, exercer A-01. Primeiro capturar baseline computado/renderizado; ajustar somente os papéis incorretos; conferir cascata efetiva e densidade em1448/390/320. Reusar cenário sintético existente; nenhum teste permanente adicional para esta correção CSS reversível. Tipos/build, lint/contexto, diff e CI obrigatórios; publicação seletiva e fechamento sem rebuild documental.

## Mapa de impacto e preservação inicial

Baseline main/local/origin1b60b4f42cf15d4d2ffc94984ff518b16930fd2a, runtime3.1.1/5e210b9. Tracked limpo, rascunhos alheios preservados. Classe B visual, mudança exclusivamente CSS.

| Capacidade | Relação | Baseline / validação proporcional |
| --- | --- | --- |
| Cabeçalhos/cargos Pessoas | direct | Screenshot + fixture sintética, estilos computados e capturas antes/depois |
| Densidade/nomes/complementos/mobile | direct | Fonte/peso/altura/padding e layout sem overflow nos3viewports |
| Busca/seleção/ordem/colunas | plausible_indirect | Interações da fixture real de Pessoas; sem alteração de handlers |
| Permissões/Perfil/IA/tenant | no_impact_identified | Nenhum código, writer ou backend modificado; plano seletivo e serviços preservados |
| Outras telas/tema compartilhado | plausible_indirect | Seletores restritos a Pessoas; revisão do diff sem mudança de tokens globais |

Fechamento mínimo: CA-01/02, tipos/build, contexto/lint/diff, CI, publicação web no SHA validado e verificação operacional/rollback. Sem suíte integral local nem banco produtivo para validar CSS.

## AoT — resultados

| ID | Implementação / teste / evidência | Status |
| --- | --- | --- |
| D-01 | Estilos computados: cabeçalhos14/20/600 (antes11,52/17,28/740), cargos14/20/400 (antes700). Mobile preserva entrelinha23,1 e reduz apenas peso700→400. before.json/after.json e capturas nos3viewports. | PASS |
| D-02 | 35checks browser: nomes/metadados idênticos, padding e altura de linhas desktop preservados, densidade móvel sem aumento, busca/colunas/seleção/ordenação e ausência de overflow/erros. checks.json. | PASS |
| D-03 | Runtimec13e355 publicado, versão3.1.1 intacta; CI branch39085174619/main39085277691 SUCCESS.28checks públicos incluindo CSS,assets/SHA/versão/rotas. Rollback,5serviços e configuração preservados. production.json/public-smoke.json/ci-runtime.json. Fechamento documental sem rebuild. | PASS |
| P-01 / F-01 | Diff runtime só styles.css; seletores da tabela exclusivos de PeoplePage e móvel escopado à página. Nenhum handler, contrato, dado, token global ou registro de versão alterado. | PASS |

Sem desvio autorizado. Evidências serão registradas em `docs/qa/evidence/people-typography-v311/`. Limite: fixture/browser sintéticos e smoke produtivo público, sem jornada autenticada humana real ou escrita produtiva.

### Render e preservação

Mesmos dados/estado/viewports nas capturas before/after1448/390/320. Alturas desktop e complementos inalterados. Em390px o primeiro cartão móvel perde23,09px e em320px o segundo perde23,09px: o cargo em peso400 ocupa uma linha a menos. Padding e entrelinha mantidos; nenhum registro aumenta. É consequência natural da tipografia solicitada, sem espaço artificial para congelar a quebra anterior. O cabeçalho passa a20px de entrelinha para a legibilidade prevista; não se aumenta o padding ou a altura das linhas de dados.

## Mapa final e validação

| Capacidade | Relação final | Prova / status |
| --- | --- | --- |
| Cabeçalhos/cargos | direct | before/after computados/capturas e35checks locais; CSS produtivo14/20/600 e14/20/400 conferido — PASS |
| Densidade/nomes/complementos/mobile | direct | Nomes/metadados/padding e linhas desktop idênticos; mobile sem aumento; exceções de quebra documentadas — PASS |
| Busca/seleção/ordem/colunas | plausible_indirect | Interações locais com3registros, seleção de2, busca e dialog de colunas; ordenação desktop — PASS |
| Permissões/Perfil/IA/tenant | no_impact_identified | Nenhum handler/writer/dado/backend alterado;5serviços preservados; leitura pública não aciona IA — PASS |
| Outras telas/tema | plausible_indirect | Nenhum token/global alterado, classe da tabela usada só por PeoplePage e seletor móvel escopado; diff revisado — PASS |

Tipos web/build web, lint1936arquivos do snapshot rastreado, Context Pack e diff PASS. Suíte integral local não executada: dispatcher roteia, mas CSS limitado é comprovado pelo browser afetado; CI obrigatório executou os gates do repositório. Registro de versão sem diff.

Publicado c13e355e836109d4744cc9a96de2944d64610e00; web0557c6903b91/imagem453daf4b0d1a/running/restart0. HEAD imediato após recriação respondeu404 transitório, impedindo recibo final do dispatcher. Sem novo rebuild, runtime/health/SHA/versão/assets/CSS/rotas/rollback foram conferidos independentemente (28checks). Cinco serviços adjacentes e hash da configuração idênticos. Rollback anterior78ac70337c45 disponível; recuperação3.0.7 preservada. Sem deploy de banco/Edge/Parser/serviços, consumo de IA ou mutação de dados reais.

Main/origin/VPS alinhados ao publicar. Fechamento documental atualiza checkouts sem reconstruir runtime; CI final continua obrigatório. Arquivos alheios não rastreados preservados; servidor Vite desta tarefa encerrado, servidor existente na5731 preservado. Limite de evidência: fixture sintética e smoke público, sem jornada autenticada humana real.

Conclusão: D-01/D-02/D-03 e P-01/F-01 PASS. Nenhum desvio de contrato; versão de produto permanece3.1.1.
