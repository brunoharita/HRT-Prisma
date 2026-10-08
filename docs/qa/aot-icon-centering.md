# AoT — Centralização de ícones, versão 2.2.0 mantida

Contrato: `agreement-icon-centering.md` v1.0.0; execução `execution-icon-centering.md`. Baseline main/origin `aaa289458676556de000b651539bbeb3ee07354f`. Pedido direto de Bruno em08/10/2026, sem incremento de versão.

## Matriz de Acordos

| ID | Implementação | Teste / evidência | Status / limite |
| --- | --- | --- | --- |
| D-01/D-UX-01 | Seletor do prefixo Statistic ganha especificidade contra a regra Ant Design | Antes(-12,-7), depois(0,0);36cenários/254medições, `evidence/icon-centering/browser-results.json` | PASS local |
| D-02/D-UX-02 | Declarações existentes de tamanho/cor/raio/layout preservadas |4prefixos56/SVG32; flex fracionário55.78125 em768 preservado; valores24/6/18/0, Perfil4cards/8eixos, sem overflow | PASS local |
| D-03 | Somente seletor existente em foundation.css, sem reset global |8páginas e27variantes em1813/768/390/320; menu móvel abre/fecha | PASS local |
| D-04 | Registro2.2.0 inalterado; ownerUX/contexto/AoT | Publicação seletiva/CI/smoke/rollback a concluir | PARTIAL |

## Proibições verificadas

| ID | Prova | Status |
| --- | --- | --- |
| P-01/P-UX-01 | Diff CSS somente seletor e comentário; nenhum offset, resize, hide ou reset global | PASS |
| P-02 | Sem diff de banco/serviços/IA/matching/releaseRegistry; dados sintéticos e rede externa bloqueada no browser | PASS local; plano operacional pendente |

## Mapa de Impacto e Preservação

| Capacidade / relação | Baseline | Regressão / evidência | Status |
| --- | --- | --- | --- |
| Indicadores Início / direct |4ícones com desvio(-12,-7);56/SVG32 | Centros0/0, mesma dimensão/cor/raio, quatro números; baseline.json e renders antes/depois | PASS |
| Títulos/Pessoas/Perfil/Posições/Knowledge/Settings/Kanban / plausible_indirect | Outros destaques medidos já centralizados |8páginas +27topologias CSS nas4larguras, sem overflow | PASS no escopo sintético |
| Controles/navegação / plausible_indirect | CSS existente; seletor restrito | Sidebar/cabeçalhos medidos, menu móvel/Escape operável; botões preservados nos renders | PASS dirigido |
| Tenant/dados/backend/IA / no_impact_identified | Contratos e serviços vigentes | Não atingidos pelo seletor; diff sem consumidores de dados, sem destino backend | PASS por análise de alcance; sem acesso ao banco |
| Versão/contexto/publicação / direct |2.2.0, web58b326d6 | Checks/plano/smoke a concluir | PARTIAL |

Nova entrega: centralização resistente à injeção CSS do Ant Design. Preservação: mesmos ícones, dimensões, superfícies, conteúdo e responsividade. Sem reclassificações nem novas dependências. Inventário dos três CSS: styles.css/foundation.css/positionFollowUp.css; destaque já utiliza contêiner grid/flex centralizado nas demais variantes. Galeria testa topologias CSS existentes; não substitui navegação autenticada por todos os estados ocultos.

## Fora de escopo e fidelidade visual

F-01 PASS: sem redesign, troca de ícones ou novas funções. Referência anexada é contraexemplo do desalinhamento. Renders `home-before-1813.png`, `home-1813.png`, `home-before-390.png`, `home-390.png` usam os mesmos dados/estado/viewport de fixture. Baseline original foi capturado antes da mudança; renders antes reproduzem a regra original, não um deslocamento fabricado. Valores sintéticos24/6/18/0 diferem das contagens reais ilustradas pelo usuário. Topologia, hierarquia, proporções, agrupamentos, informação e ações preservadas; somente centralização muda. Renders de Pessoas, Perfil e Kanban em1813/390 também revisados. Nenhum desvio material do contrato ou mudança de escopo.

## Validação final

- 36cenários/254medições no navegador: PASS;8páginas e galeria27variantes em1813/768/390/320, sem runtime errors ou chamadas externas.
- Tipos web/build web: PASS; avisos preexistentes de chunk/import dinâmico.
- 19testes release-tooling/contexto: PASS.
- Lint/foundation/Context Pack/diff check: PASS em cópia dos rastreados, preservando arquivos alheios não rastreados. CI pendente.

## Git / QA / produção

Branch `codex/fix-highlight-icon-centering`, origin oficial. Não há QA remoto separado; fixtures determinísticas locais, sem IA ou registros reais. Publicação somente web em andamento. Jornada autenticada real NOT TESTED; geometria sintética e smoke de assets não comprovam todos os estados de dados reais.

## Conclusão

Aceites visuais locais PASS. Fechamento operacional pendente; não declarar entrega concluída até D-04 PASS.
