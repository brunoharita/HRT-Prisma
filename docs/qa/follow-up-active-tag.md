# Acordo, execução e AoT — tag de acompanhamento ativo

Versão 1.0.0. Correção autorizada por Bruno em 14/10/2026: tag verde somente em processo em andamento; vínculo e acesso ao histórico encerrado preservados, sem outras mudanças. Baseline `9806e1e406954d9096e040aeaf4d297fd067583e`, app 2.6.0. Este delta supersede somente a indicação verde de D-03 de `agreement-people-compact-v234.md` 1.0.0 para processo encerrado; preserva os demais gates e D-01/D-04/D-05 de `agreement-selection-processes-v260.md` 1.0.0.

## Acordo e execução congelados

- D-01: renderizar “Já está no acompanhamento” verde somente para Pessoa vinculada ao processo com status `active`.
- D-02: conservar vínculo, indicação “Processo atual · encerrado” e “Abrir acompanhamento” com os mesmos IDs; encerramento não elimina histórico.
- D-03: validar e publicar somente web/documentação, em main/origin/VPS, mantendo app 2.6.0.
- P-01: não alterar dados, histórico, estado de processo, etapas, Score, Perfil, decisões, autorização, IA ou cobrança; nenhuma mutação passiva.
- P-UX-01: não alterar textos, estilos, topologia, agrupamentos, densidade ou controles além da condição da tag verde.
- F-01: banco/migrations/Edge e demais serviços; outras funcionalidades ou redesenhos.
- A-01: reutilizar condicional JSX, fixture de Pessoas e fluxo seletivo de publicação existentes; sem dependência nova.
- Q: nenhuma pendência material.
- CA-01: ativo/encerrado e Pessoa sem vínculo, em 1448/390px; navegação com IDs exatos, retorno à janela somente consulta, conteúdo/geometria dos cards preservados exceto tag; screenshots antes/depois, tipos/build e CI. Smoke público/SHA/rollback e serviços preservados; jornada real autenticada não inferida.

Execução: aplicar integralmente D-01..03, P-01/P-UX-01, F-01/A-01 e CA-01 acima. Alterar apenas o render da tag verde em `VacancyPeoplePage`, mantendo a condição externa de vínculo e o componente de acesso. Encerrar após evidência proporcional, contexto, CI, publicação seletiva e sincronização; sem suíte integral local.

## Matriz de Acordos

| ID | Acordo | Implementação | Teste/evidência | Status | Ambiente/limite |
| --- | --- | --- | --- | --- | --- |
| D-01 | Verde somente ativa/vinculada | Condição JSX de status | Browser ativo/encerrado/sem vínculo, browser-results.json | PASS | UI real, fixture sintética |
| D-02 | Vínculo/histórico preservados | Condição externa e botão intactos | IDs exatos, render e retorno, browser-results.json | PASS | Sem mutação produtiva |
| D-03 | Publicação seletiva 2.6.0 | Dispatcher/main/VPS | CI e smoke/SHA/rollback | NOT TESTED | Público não prova uso autenticado |

## Proibições verificadas

| ID | Guardrail | Teste negativo/evidência | Status |
| --- | --- | --- | --- |
| P-01 | Dados e autoridade intactos | Diff funcional só render, zero chamadas passivas de escrita/IA | PASS |
| P-UX-01 | Demais capacidades visuais intactas | Texto/geometria ativos idênticos, encerrado sem outra mudança além do refluxo vertical natural da tag, screenshots | PASS |

## Mapa de Impacto e Preservação

Mapa inicial, classe B. Baseline funcional 9806e1e, fixture existente ativa/encerrada em 1448/390px. Reúso da capacidade atual suficiente; sem decisão arquitetural nova.

| Capacidade/área | Relação | Impacto e regressão mínima | Status |
| --- | --- | --- | --- |
| Tag/vínculo/identificação/acesso | direct | Verde ativa, azul encerrada, botão com mesmos IDs; browser-results.json | PASS |
| Layout, Score, requisitos e controles de Pessoas | plausible_indirect | Texto idêntico exceto verde; geometria horizontal e cards seguintes iguais, screenshots desktop/mobile sem overflow | PASS |
| Tenant/papéis/consulta e retorno | critical_transversal | Nenhum gate/serviço alterado; IDs mantidos e consulta por retorno sem mutações | PASS |
| Persistência/IA/billing/ocupação e demais runtimes | no_impact_identified | Nenhum writer/contrato alterado; plano web/docs e identidade de containers adjacentes | NOT TESTED |

### Novidade e preservação

Correção exclusiva da condição verde. Sem dependência/reclassificação prevista. Baseline visual sintético; screenshot do usuário é relato do defeito e referência de preservação da composição, não fixture de produção.

## Fora de escopo preservado

F-01: diff funcional somente condicional JSX; nenhuma alteração em writer, banco, Edge ou outro serviço. Plano/publicação pendentes.

## Evidência de fidelidade visual

Mesmo estado/dados/viewports 1448/390px nos arquivos `evidence/follow-up-active-tag/before-*` e `after-*`. Topologia/ordem/conteúdo preservados; mudança normativa somente remoção da tag verde no encerrado. Ativo e desktop encerrado mantêm geometria integral; celular encerrado reduz altura em 34,390625px devido à remoção da tag, deslocando os cards seguintes pela mesma medida, sem mudar suas dimensões. PASS. Inspeção visual desktop/mobile mais comparação automática; dados sintéticos da fixture existente, sem usar registros produtivos.

## Desvios e mudanças autorizadas

Nenhum desvio funcional. Única decisão nova é a condição ativa autorizada nesta conversa. Primeiro teste exigia altura idêntica no celular mesmo removendo a tag; corrigida somente a asserção para verificar refluxo natural e ausência de outras mudanças, sem editar produto adicionalmente.

## Validação final / Git / QA / ambiente

Local: 32 verificações de browser PASS (ativo/encerrado, vínculo ausente, IDs históricos, retorno, zero escrita/IA/externas/erros, preservação visual). Tipos web, build, lint e contexto PASS; avisos de bundle/import dinâmico preexistentes. Dependências já instaladas reutilizadas por junction no checkout limpo; pnpm não reinstalou nem alterou lockfile. CI/publicação pendentes. Jornada produtiva autenticada NOT TESTED.

## Conclusão

QA dirigido PASS; D-03 depende de CI/publicação/sincronização.
