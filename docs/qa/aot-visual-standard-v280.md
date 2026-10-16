# AoT — V2M8 Padronização visual 2.8.0

Contrato: `docs/qa/agreement-visual-standard-v280.md` 1.0.0; execução: `docs/qa/execution-visual-standard-v280.md`. Fonte: aprovação explícita de Bruno em 16/10/2026. Baseline a33c3d4d7b779351855fbf177501925afe9e1033 (2.7.8). Classe C; somente apresentação, sem nova dependência, backend ou dados.

## Matriz de Acordos

| ID | Implementação | Teste/evidência | Status | Ambiente/limite |
| --- | --- | --- | --- | --- |
| D-01 | Reutiliza tema, foundation, PrismaPage, AntD e ADR-050 | Capturas/estilos por papel | PASS | Fixture local |
| D-02 | Leitura16/24, detalhe14/20, seção24/32 e20/28; Pessoas14/20+12/18; Kanban compacto explícito | Medidas computadas, hierarquia e preservação | PASS | Fixture local |
| D-03 | Tokens de link/hover, texto principal e complementar; semântica preservada |775checks,148confrontos de peso,106pares e SHA publicado | PASS | Runtime final10b0c0e |
| D-04 | Topo tabular, rolagem local, contenção de grid e alertas móveis | Desktop1448/celular390 e regressões320 quando existentes | PASS | Limite anterior registrado abaixo |
| D-05 | Todas as oito famílias da auditoria cobertas | Antes/depois e suites reaproveitadas | PASS | Estados determinísticos |
| D-06 | Classes/tokens compartilhados e variantes sem biblioteca nova | Diff, build, testes visuais e de interação | PASS | Local/CI |
| D-07 | Registro2.8.0, docs/contexto e entrega seletiva | CI branch/main, plano web, publicação e33checks de smoke | PASS | Runtime final10b0c0e; fechamento documental sem rebuild |

## Proibições verificadas

| ID | Guardrail/prova | Status |
| --- | --- | --- |
| P-01 | Comparação de conteúdo renderizado nos estados pareados; origens/histórico acessíveis e interações | PASS |
| P-02 | Handlers, serviços, domínio e dados intactos; testes de apoio e transporte sintético sem saída externa | PASS |
| P-03 | Mesmas composições/ordem/seleção; rascunhos e publicação humana exercitados | PASS |
| P-04 | Evidência sintética explicitamente separada de smoke público e autenticação real | PASS |

## Mapa de Impacto e Preservação

| Capacidade | Relação | Baseline/regressão/evidência | Status |
| --- | --- | --- | --- |
| Manual/revisão/comparação | direct | Baseline2.7.8, seis abas, valores de referência, vazio/erro; editar/salvar/comparar/publicar apenas por ação humana | PASS |
| Processos/Acompanhamento | direct | 38/62 desktop, seleção móvel, lista/Kanban, cinco colunas, filtros, detalhes, entrevistas/decisão e histórico | PASS |
| Pessoa/competências/evidências | direct | Abas, tabela do subgrupo, conceito, evidências, proveniência; Resumo/destaques preservados fora do novo escopo | PASS |
| Posições/documentos | direct | Lista preenchida, células pelo topo, datas e ação seguinte, detalhe/histórico do documento | PASS |
| Tokens/Banco | direct | Saldo/destaques, origem, carteira, estados/limites e portais, consulta/ações explícitas | PASS |
| Conhecimento/Pessoas/Home/Settings | plausible_indirect | Cor de link do tema; tipografiaSM já era14; demais regras opt-in. Regressão Conhecimento e Pessoas, inspeção de dependências | PASS |
| Autorização/humano/tenant/rascunhos | critical_transversal | Nenhum serviço/handler alterado; testes negativos e interações de apoio sem dados reais | PASS |
| Backend/schema/IA/matching | no_impact_identified | Diff de apresentação/testes/docs; release-plan.json confirma todos esses destinos SKIPPED | PASS |
| Hospedagem | direct | Web publicada;33checks PASS, running/0, rollback e IDs protegidos preservados | PASS |

### Novidade e preservação

Novidade: papéis visuais consistentes e densidade explícita, sem alterar jornada. Preservação: conteúdo, dados, composição, permissões, foco, filtros, rascunhos e autoridade humana, sob evidência proporcional. O mapa inicial permanece; a descoberta de overflow anterior no detalhe de competência e de alerta estreito320 revisa a prova responsiva dessas superfícies diretas, sem novo domínio ou destino.

Limitações do baseline: detalhe de competência no celular390 excedia a página (406px), e revisão preenchida320 tinha overflow horizontal, reproduzido com fonte exata do baseline; alerta de erro no editor320 podia reduzir texto a uma coluna estreita ao lado da ação. Contenção e distribuição responsiva corrigidas nas superfícies normalizadas. Deprecações AntD e chave sintética repetida de tentativa documental são avisos anteriores de fixture/API, sem exceção de runtime. Nenhuma captura vazia substitui prova preenchida.

## Fora de escopo preservado

F-01 PASS: diff de apresentação/testes/docs; sem funcionalidade, schema, backend, IA, nova biblioteca, reprocessamento ou dados fictícios produtivos. Plano seletivo registrado em release-plan.json: somente web é destino de runtime.

## Evidência de fidelidade visual

Referência normativa: escala e hierarquia do acordo, UX Foundation e composições existentes. Nenhuma nova imagem alvo foi fornecida. `evidence/visual-standard-v280/before` e `after` identificam pares no mesmo viewport/dado/estado. `before.json`/`after.json` registram papéis computados, conteúdo e overflow; `preservation` guarda testes existentes reaproveitados. A flag baseline usa a fonte exata a33c3d4 para os arquivos de produto, inclusive para ampliar cenários após a implementação.

## Desvios e decisões

Desvio transitório de implementação em D-03 no primeiro runtime2.8.0: tons locais remanescentes em documentos, competências e contexto de questões. Corrigidos, comprovados e publicados no runtime final10b0c0e antes do fechamento. Nenhum desvio pendente. Nenhuma regra do acordo foi reinterpretada. Sem nova decisão de produto. Nenhuma ampliação de domínio. O Kanban preserva trilhas, ordem, alinhamento, Score50px e regiões de ação; somente papéis de texto/densidade explícita. Pessoas mantém sua escala compacta. Conhecimento mantém área informativa com Editar separado e conceito clicável.

## Validação final

PASS local:106 estados pareados preenchidos/vazios/erro,1448/390 e revisão320;775 verificações de papéis computados, cores de links, hierarquia, conteúdo idêntico normalizado, topo tabular, foco/teclado, ausência de overflow e portais. Confirmação estática do acompanhamento também usa24px e preserva o rascunho ao cancelar. Busca/filtro/abertura da Posição e acesso à Pessoa/histórico técnico do documento exercitados.212 capturas pareadas, além das suites de preservação. Amostras inspecionadas visualmente: Processos1448/390, Kanban1448, revisão390/320, conceito390 e drawer de questão390.

As11suites existentes reaproveitadas passaram806verificações: revisão manual87, acompanhamento34, detalhes30, navegação32, Conhecimento299, Banco191+34, Tokens48+9 e Pessoas18+24. `preservation/runs.json`, resultados JSON e logs `.txt` identificam as fontes e durações. O roteiro manual usa novo recorte `--review-only`; rótulos históricos de vínculo/filtragem são cobertos pelos testes atuais de Pessoas. O seletor de título do acompanhamento foi atualizado ao ciclo explícito já vigente. Tokens usa o roteiro calendário2.6.2, compatível com o baseline, em vez do roteiro2.4.0 que procurava Saldo disponível. Nenhum ajuste de produto motivado por esses seletores.

Tipos web/build root e34testes focados de release/UX/manual/acompanhamento/resultado/questões PASS. Build web final, lint, Foundation, geração e checker de contexto PASS; aviso anterior de chunk grande preservado. Diff integral revisto: TSX muda apenas escopos de apresentação e portais, sem handlers/serviços/domínio. Sem suíte integral local; CI geral obrigatório PASS nos dois refs do SHA funcional1220c97;22testes de tooling de release/contexto também PASS. O dispatcher sugeriu pnpm test como rota geral; a validação local foi deduplicada e limitada aos34testes afetados, conforme AGENTS, e o CI integral permaneceu obrigatório.

Reprodução: `node tests/tooling/visualStandard.browser.mjs --baseline`, depois sem flag para dados/abas/portais; usar `--states-only` com PRISMA_VISUAL_GROUPS=selection,followup,person,foundation,documents,tokens,bank para os estados adicionais; PRISMA_VISUAL_WIDTHS=320 com grupo manual para o caso estreito. `node tests/tooling/visualStandard.preservation.mjs` reaproveita as11suites em portas/caches isolados. Transportes nunca acessam serviços reais.

## Git / QA / ambiente

Worktree isolado `codex/v2m8-visual`; canônico em main, rascunhos untracked preservados. QA visual local com componentes reais/transporte determinístico, sem banco/LLM/rede externa. Jornada autenticada produtiva com pessoa real NOT TESTED; smoke público não a substitui.

## Tempos e ocorrências

Primeiro checkpoint verificável16/10/2026 10:22:14 BRT. Baseline/reuso/inventário e criação do worktree até10:26; fonte isolada exclui rascunhos do gerador. Implementação e provas visuais ocorreram com compilação/testes em paralelo, portanto durações de jobs não devem ser somadas como tempo total. A primeira suite manual revelou o alerta320; uma tentativa de navegação expirou durante servidores Vite simultâneos com cache compartilhado. Caches e servidores de fixture foram isolados; nenhum ajuste de produto foi feito para esse timeout. Uma comparação de cor capturou interpolação durante transição; medida estabilizada com prefers-reduced-motion, sem alterar semântica visual.

## Conclusão

D-01..D-07 e P-01..P-04 PASS dentro da cobertura delimitada.2.8.0 final publicada no SHA10b0c0ec9e911428c2ea43431958644e8ecd6f5b;775checks visuais,148confrontos de peso e106pares PASS. O desvio transitório de cor/ênfase do primeiro runtime foi corrigido; nenhum desvio pendente. A documentação posterior não muda o runtime nem repete os testes válidos. Prova sintética de componentes reais e smoke público não equivalem a jornada autenticada produtiva.

## Primeira publicação — histórico superado pelo runtime final abaixo

CIs funcionais38913086598 (branch) e38913390886 (main) SUCCESS no SHA1220c97c6ca6ea4c14dfa463838d1a34a69e6cac. Integração ff-only pelo checkout canônico, com rascunhos untracked preservados. Plano447arquivos, majoritariamente evidência: web apenas; nenhum banco/Edge/Parser/gateway/mail/Synthesis publicado. Backend e dados reais não foram acessados pelo movimento.

Runtime iniciado em16/10/2026 11:11:50 BRT.33checks de publicação PASS: rotas/entry/assets, versão2.8.0 e SHA no bundle, classes de leitura/compacta, hierarquia24px, entry anterior preservado e login real em1448/390 com senha/rodapé/reflow sem exceções. `publication.json` registra horários, CIs, imagem, IDs protegidos e limites. Contêiner running/0; nginx -t PASS; rollbackprisma-web:rollback-before-1220c97c6ca6 aponta à imagem anterior4de0d8fc. Nenhum contêiner protegido mudou de ID. O primeiro curl do script retornou404 transitório durante recriação; smoke independente estável passou sem reconstrução adicional. A imagem anterior está disponível, sem exercício de rollback em produção.

Artefatos de screenshot foram normalizados para nomes ASCII após o dispatcher identificar quoting octal de nomes acentuados como caminhos desconhecidos; novo plano PASS sem contornar o gate. O Git emitiu avisos de permissão ao tentar housekeeping de worktrees antigas; nenhuma worktree/lock alheia foi removida ou alterada.

O fechamento documental posterior segue ff-only, CI obrigatório e pull na VPS, sem rebuild de web. SHA de runtime permanece1220c97; HEAD documental pode avançar e deve coincidir em main/origin/worktree/VPS ao término. Conferir o CI do HEAD final no GitHub; este documento não tenta autorreferenciar o próprio commit.

Oportunidades concretas de reduzir tempo: reutilizar este harness com cache/portas isoladas desde o início; selecionar os roteiros vigentes antes da bateria (ciclos explícitos, carteiras calendário e filtros atuais); configurar estados de leitura e escrita separadamente nas fixtures e medir apenas depois de estabilizar animações. A maior parte do retrabalho local veio de roteiros históricos e seletores/fixtures, não de defeitos introduzidos. As durações de suites em runs.json se sobrepõem a outras verificações e não representam tempo sequencial total.

### Complemento de D-03 no mesmo V2M8

A conferência de RGB no JSON renderizado revelou #42526b nas datas/próximas ações, #536584/#6d7b98 em filtros/complementos de competências e #52637a no contexto de questões. Esse requisito precisava de prova mais precisa do que apenas tipografia/links. A base agora usa os tokens de texto principal#10203a e secundário#53637d nessas superfícies, preservando cores de avisos/estados. Nova asserção por papel evita repetir a lacuna. Revalidação proporcional:22estados de dados/abas/portais e12de vazio/erro nas três áreas;775checks acumulados em106pares, sem falha. Build web PASS. Os806checks de interação anteriores continuam válidos: o complemento não altera geometria, handlers, estados ou dados. CI e rollout finais PASS no SHA10b0c0e, conforme registro abaixo.

A mesma revisão final explicitou peso600 para nomes clicáveis no Kanban e preservou o peso600 dos enunciados no Banco, impedindo que a regra genérica de leitura os achatasse. Esses dois papéis foram renderizados novamente em10estados de dados/portais e8de vazio/erro. `role-weights.json` confronta todos os papéis já renderizados com400/600, incluindo as ênfases legítimas de indicadores/filtro de verificação. Sem nova decisão, jornada ou regra; complemento concluído no mesmo V2M8 e na versão2.8.0.

## Encerramento operacional final

SHA funcional definitivo10b0c0ec9e911428c2ea43431958644e8ecd6f5b, versão2.8.0. CIs38915645661 (branch) e38915669662 (main) SUCCESS. Novo plano web apenas,33checks produtivos PASS, login1448/390 renderizado, runtime iniciado em11:28:51 BRT e smoke final às2026-10-16T14:29:18.345Z. Contêiner3366b94175e4, running/0, nginx válido; rollbackprisma-web:rollback-before-10b0c0ec9e91 preserva a imagem do primeiro runtime2.8.0. Os6containers protegidos mantêm os IDs do baseline. O404 inicial de recriação estabilizou sem rebuild extra; a segunda publicação foi necessária para concluir D-02/D-03, não por alteração documental. `publication-initial.json` preserva a primeira publicação e `publication.json` registra a final.

O primeiro checkpoint verificável foi10:22:14 BRT; o primeiro smoke produtivo passou11:12:39, e o complemento final foi verificado11:29 BRT. Esse intervalo inclui testes, renderizações, correções, CI e dois rollouts, com jobs sobrepostos. A oportunidade principal de economia é confrontar tamanho/cor/peso/alinhamento por papel desde a primeira bateria, além de iniciar com fixtures/seletores vigentes e caches isolados. Não basta contar assertivas ou confiar no diff para provar um papel ainda não medido.

A sincronização documental final usa ff-only e CI no HEAD integrado, com pull na VPS e confirmação de que o mesmo container/imagem do runtime final continua ativo. Sem novo build/deploy ou repetição dos testes funcionais válidos. A prova autenticada com pessoa real permanece NOT TESTED, fora do alcance destas fixtures/smokes; não há regressão conhecida na cobertura executada.
