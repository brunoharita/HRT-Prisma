# AoT — Centralização de ícones, versão 2.2.0 mantida

Contrato: `agreement-icon-centering.md` v1.0.0; execução `execution-icon-centering.md`. Baseline main/origin `aaa289458676556de000b651539bbeb3ee07354f`. Pedido direto de Bruno em08/10/2026, sem incremento de versão.

## Matriz de Acordos

| ID | Implementação | Teste / evidência | Status / limite |
| --- | --- | --- | --- |
| D-01/D-UX-01 | Seletor do prefixo Statistic ganha especificidade contra a regra Ant Design | Antes(-12,-7), depois(0,0);36cenários/254medições, `evidence/icon-centering/browser-results.json` | PASS |
| D-02/D-UX-02 | Declarações existentes de tamanho/cor/raio/layout preservadas |4prefixos56/SVG32; flex fracionário55.78125 em768 preservado; valores24/6/18/0, Perfil4cards/8eixos, sem overflow | PASS |
| D-03 | Somente seletor existente em foundation.css, sem reset global |8páginas e27variantes em1813/768/390/320; menu móvel abre/fecha | PASS |
| D-04 | Registro2.2.0 inalterado; ownerUX/contexto/AoT | CI branch/main PASS, web publicada,15HTTP200/9checks, rollback e serviços preservados; recibos abaixo | PASS |

## Proibições verificadas

| ID | Prova | Status |
| --- | --- | --- |
| P-01/P-UX-01 | Diff CSS somente seletor e comentário; nenhum offset, resize, hide ou reset global | PASS |
| P-02 | Sem diff de banco/serviços/IA/matching/releaseRegistry; dados sintéticos e rede externa bloqueada no browser; plano web-only, IDs dos serviços preservados | PASS |

## Mapa de Impacto e Preservação

| Capacidade / relação | Baseline | Regressão / evidência | Status |
| --- | --- | --- | --- |
| Indicadores Início / direct |4ícones com desvio(-12,-7);56/SVG32 | Centros0/0, mesma dimensão/cor/raio, quatro números; baseline.json e renders antes/depois | PASS |
| Títulos/Pessoas/Perfil/Posições/Knowledge/Settings/Kanban / plausible_indirect | Outros destaques medidos já centralizados |8páginas +27topologias CSS nas4larguras, sem overflow | PASS no escopo sintético |
| Controles/navegação / plausible_indirect | CSS existente; seletor restrito | Sidebar/cabeçalhos medidos, menu móvel/Escape operável; botões preservados nos renders | PASS dirigido |
| Tenant/dados/backend/IA / no_impact_identified | Contratos e serviços vigentes | Não atingidos pelo seletor; diff sem consumidores de dados, sem destino backend | PASS por análise de alcance; sem acesso ao banco |
| Versão/contexto/publicação / direct |2.2.0, web58b326d6 | Plano somenteweb, CI branch/main,15HTTP200/9checks, rollback58b326d6 | PASS |

Nova entrega: centralização resistente à injeção CSS do Ant Design. Preservação: mesmos ícones, dimensões, superfícies, conteúdo e responsividade. Sem reclassificações nem novas dependências. Inventário dos três CSS: styles.css/foundation.css/positionFollowUp.css; destaque já utiliza contêiner grid/flex centralizado nas demais variantes. Galeria testa topologias CSS existentes; não substitui navegação autenticada por todos os estados ocultos.

## Fora de escopo e fidelidade visual

F-01 PASS: sem redesign, troca de ícones ou novas funções. Referência anexada é contraexemplo do desalinhamento. Renders `home-before-1813.png`, `home-1813.png`, `home-before-390.png`, `home-390.png` usam os mesmos dados/estado/viewport de fixture. Baseline original foi capturado antes da mudança; renders antes reproduzem a regra original, não um deslocamento fabricado. Valores sintéticos24/6/18/0 diferem das contagens reais ilustradas pelo usuário. Topologia, hierarquia, proporções, agrupamentos, informação e ações preservadas; somente centralização muda. Renders de Pessoas, Perfil e Kanban em1813/390 também revisados. Nenhum desvio material do contrato ou mudança de escopo.

## Validação final

- 36cenários/254medições no navegador: PASS;8páginas e galeria27variantes em1813/768/390/320, sem runtime errors ou chamadas externas.
- Tipos web/build web: PASS; avisos preexistentes de chunk/import dinâmico.
- 19testes release-tooling/contexto: PASS.
- Lint/foundation/Context Pack/diff check: PASS em cópia dos rastreados, preservando arquivos alheios não rastreados.
- CI branch37831599237/main37831737267 success:831testes, golden/demo, ledger/script e auditoria de dependências PASS. Sem suíte completa local adicional.

## Git / QA / produção

Branch `codex/fix-highlight-icon-centering`, origin oficial `git@github.com:brunoharita/HRT-Prisma.git`, integrada por fast-forward em main. SHA funcional `ad55395ab95db8ee5cda824835705f5ac43e7ac1` publicado no GitHub e VPSsrv1038882 /opt/prisma. Fechamento documental posterior sincroniza os checkouts sem reconstruir runtime. Não há QA remoto separado; fixtures determinísticas locais, sem IA ou registros reais.

Plano oficial e dry-run em `evidence/icon-centering/release-plan.json`/`dry-run.json`: somenteweb, sem banco/Edge/Parser/Synthesis. Dispatcher aguardou CI e promoveu main; deploy recriou apenas prisma-web. O curl final coincidiu com troca do container e retornou404; conferência posterior estabilizou sem rebuild/reexecução do deploy. Recuperação explícita em `publication-recovery.json`, sem fabricar recibo de sucesso do comando encerrado com22.

Web container03359d9e96b5, imagemf8349547f6dc, running/zero reinícios. Rollback `prisma-web:rollback-before-ad55395ab95d` aponta à imagem anterior58b326d6. Parser/Synthesis/gateway preservam exatamente IDs/imagens/restarts do baseline; Parser/Synthesis healthy. `infrastructure.json` contém identidade, metadata e verificações. Nenhum acesso ao banco ou mutação de dados humanos.

Smoke `https://prisma.hrtsolutions.com.br`:15HTTP200 e9checks PASS, entryindex-BnkTz1MZ.js com SHA e2.2.0, CSSindex-EOT1QpDk.css com seletor/grid/center/dimensões originais; assets anteriores continuam200. `production-smoke.json`. Jornada autenticada real NOT TESTED; geometria sintética e smoke de assets não comprovam todos os estados de dados reais. Warnings preexistentes de componentes Ant Design nos fixtures permanecem fora de escopo.

## Conclusão

Todos D/P e critérios aplicáveis PASS: correção publicada, versão2.2.0 mantida e diretriz permanente documentada. Cobertura e limitações acima permanecem explícitas.
