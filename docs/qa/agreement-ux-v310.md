# Contrato de Acordos — evolução de UX 3.1.0

Versão 1.0.0, `agreed`, Product Owner Bruno, 17/10/2026. Fonte: aprovação explícita das seis propostas nesta conversa, com preservação do estado atual antes de implementar em sequência, integrar em main e publicar 3.1.0. Não é pedido para rediscutir as propostas. Referência integral congelada: `docs/product/proposta-ux-v310/propostas.html` e suas doze capturas desktop/mobile; conteúdo ilustrativo não é dado de produção.

## DEVE

- D-00 — Preservar e verificar recuperação da aplicação 3.0.7 antes da implementação. Git, imagem web e configuração existentes; restaurar versão não apaga dados posteriores.
- D-01 — Pessoas com caminhos visíveis Sua base / Encontrar profissionais / Para uma Posição, busca, filtros identificados e removíveis, restauração do padrão, buscas salvas, escolha de colunas e seleção de duas pessoas para comparação. Manter áreas/cargo/empresa/cidade/data e filtros existentes; celular com registros verticais.
- D-02 — Início orientado ao trabalho: continuar atividade, pendências acionáveis e acessos recentes reais; métricas secundárias. Adaptar conteúdo a Super Admin, Owner, Recruiter e usuário comum sem expandir autoridade ou inventar pendências. Manter empresa/grupo identificáveis e recuperação de consultas.
- D-03 — Resumo da Pessoa com síntese primeiro, quatro destaques depois e leitura completa preservada. Seis seções e fontes/histórico/documentos acessíveis. Pendências e gestão na lateral desktop e após a leitura mobile; seletor de seção identificado no celular. Nenhuma geração de IA ao apenas abrir a tela.
- D-04 — Comparação contextual por requisito, duas pessoas, evidências/fontes/limitações, filtro somente diferenças e resumo factual para o gestor com perguntas de aprofundamento. Reutilizar cálculo e resultados existentes. Comparação geral permanece sem Score; escolher Posição explicitamente quando necessário. No celular, blocos por requisito.
- D-05 — Tokens com saldo/franquia/renovação e simulador de atividade/quantidade, consumo estimado e saldo restante usando tarifas vigentes reais. Consumo por atividade, fontes e movimentações mantidos. Simular não reserva, debita, cobra ou chama IA; manter limites do acesso ao histórico.
- D-06 — Importação de vários PDFs com acompanhamento e recuperação por arquivo, processamento serial explícito, identificação/duplicidades humanas, revisão do próximo e confirmação humana anterior à publicação. Falha individual não interrompe outros arquivos. Reusar pipeline, persistência privada, cache/idempotência/consentimento e revisão existentes. Seção Integrações conforme referência, distinguindo preparação e dependência de definição da origem das conexões ainda futuras.
- D-07 — Seguir diretriz UX, Aptos/Segoe UI e tokens atuais, informação escura/azul ação, estados com texto/ícone, densidade legível, responsividade e acessibilidade. Preservar topologia, hierarquia, proporções relativas, agrupamentos e posição das ações das seis propostas.
- D-08 — Validação proporcional, evidência visual/funcional, documentação/contexto, CI, integração em main, publicação 3.1.0, smoke e sincronização. Não apresentar mock como operação real.

## PROIBIDO

- P-01 — Não mudar Score/matching, interpretações IA, modelos/prompts, critérios de seleção, planos, tarifas, balanços, autoria, contrato de publicação ou decisões humanas. Ausência de informação não prova incapacidade.
- P-02 — Não expandir acesso/tenant, expor PII em cache persistente/log público, gravar currículos em armazenamento público, executar chamadas pagas em teste ou publicar Perfil/decisão automaticamente.
- P-03 — Não incluir rascunhos não rastreados alheios, limpar worktrees existentes, apagar história, force-push ou restaurar banco descartando dados posteriores. Nenhuma integração externa é ativada por um botão ilustrativo.
- P-UX-01 — Não trocar a composição aprovada por outra, esconder leitura integral ou remover navegação/filtros/fontes para simplificar. Não copiar números fictícios para o produto.

## FORA DE ESCOPO

- F-01 — Conector/API de fornecedor específico, credenciais, sincronização externa e mapeamento de um formato externo ainda não escolhido: a própria proposta os identifica como futuros. Não contratar serviço, introduzir dependência ou migrar banco para isso.
- F-02 — Novo algoritmo, nova síntese automática, ranking, decisão de contratação, alteração do ciclo Owner ou identidade/senha. Não reconstruir serviços sem impacto.

## AUTONOMIA

- A-01 — Reusar AntD/componentes/serviços/rotas e estado de navegação já autorizado. Limites operacionais do lote, detalhes acessíveis e implementações determinísticas ficam com engenharia; manter ações sensíveis explícitas.
- A-UX-01 — Adaptar conteúdo ilustrativo aos dados disponíveis, rótulos existentes e componentes reais. Composição e hierarquia são normativas; pixel idêntico não é exigido.

## PENDÊNCIAS

Nenhuma para o escopo acima. F-01 é limite explícito das propostas aprovadas, não conexão autorizada pendente de implementação.

## CRITÉRIOS DE ACEITE

- CA-00 — Tag remota, arquivo de código íntegro, imagem recuperável e hashes/metadados em baseline.json; instrução de restauração sem apagar dados.
- CA-01 — Encontrar os três caminhos, aplicar/remover/restaurar filtros, salvar/reabrir busca, ocultar/restaurar colunas, selecionar duas pessoas, estados vazio/erro/membro e layout 1448/390/320.
- CA-02 — Pendência factual abre destino correto; erro não vira zero; papéis e empresa respeitados, acessos reais por sessão/escopo, nenhum dado sintético no produto.
- CA-03 — Síntese precede destaques; oito análises disponíveis quando existentes, seis seções, fontes/limitações/sem Perfil preservados; mobile sem overflow e sem geração na navegação.
- CA-04 — Duas pessoas e Posição identificadas, fontes consultáveis, diferenças por evidência (mesmo status não significa conteúdo igual), resumo sem escolher vencedor; pendências e geral sem Score preservados.
- CA-05 — Tarifas ausentes/futuras/inválidas não geram estimativa inventada; quantidade válida calcula resultado e insuficiência; simulação sem chamada mutante. Histórico/fonte/validade intactos.
- CA-06 — Lote serial com sucesso/falha/duplicidade/pendência, sem publicação automática, retomada em navegação da sessão, erro recuperável por arquivo, troca de usuário/empresa isola a fila; regressão de importação/revisão vigente.
- CA-07 — Comparação visual nos mesmos viewports com dados equivalentes e diferenças de conteúdo justificadas; tokens atuais e navegação protegidos.
- CA-08 — Checks dirigidos e CI PASS, runtime3.1.0/SHA/assets/rotas/rollback; origem/main/VPS sincronizados e limites de smoke explícitos.

## MAPA DE IMPACTO E PRESERVAÇÃO

Baseline código be1b049d9335d82ce5195f9e3f7399764d0d5a96, runtime e7ea4df/3.0.7, imagem d336b3925596. Estado rastreado limpo; arquivos não rastreados preservados. Risco integrado C; fronteiras de importação/dados sensíveis D preservadas por reuso e negativos dirigidos.

| Área/capacidade | Relação | Dependência/baseline | Regressão proporcional |
| --- | --- | --- | --- |
| Pessoas/busca/filtros/colunas/comparação | direct | páginas e serviços atuais, amostras sintéticas | browser real dos componentes + utilitários/seleção/estados |
| Home/pendências/acessos | direct | summary/listas existentes, nenhum painel inventado | papéis, erro, escopo, navegação e nenhuma mutação |
| Perfil/síntese/fontes/seis seções | direct | síntese existente somente leitura | harness Pessoa e síntese/fontes atuais + visual |
| Comparação contextual/gestor | direct | VacancyComparePage/matching existente | diferenças/fontes/pendência/negativos; algoritmo intocado |
| Tokens/carteira/plano | direct | ledger2.0/tarifas vigentes | cálculo/ausência/zero/quantidade + browser histórico/origem |
| Lote/PDF/identificação/revisão | direct | pipeline serial atual + intakes privados | fila determinística/serial/falha/idempotência/retomada e importação existente |
| Auth/perfis/tenant/publicação/custos | critical_transversal | gates do servidor3.0.7, atual provedor de estado | isolamento por sessão/empresa, membro, troca durante async, não chamar IA/teste; smoke negação |
| Shell/estado de navegação/estilos | plausible_indirect | design system e NavigationViewStore | rotas/voltar/dirty/responsivo/shell; estilos limitados às páginas |
| IA/backends/banco/Owner/portais/Knowledge | no_impact_identified | contratos e algoritmos existentes reutilizados | revisão das chamadas e diff, provas de não mutação no harness; sem deploy por adjacência |

## CONDIÇÃO DE FECHAMENTO

Todos D/P aplicáveis comprovados, evidência/AoT/contexto, CI, publicação autorizada e sincronização. Testes adicionais somente para dúvida concreta/falha ou edição posterior relevante. Sem suíte integral local por padrão.
