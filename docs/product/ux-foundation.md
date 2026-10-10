# Base transversal de experiência do Prisma

Contrato de apresentação atual: `prisma-ux-foundation-1.4.0`. Acordos aprovados: `docs/qa/agreement-ux-foundation.md` 1.0.0, `docs/qa/agreement-visual-reference-fidelity.md` 1.0.0, `docs/qa/agreement-sidebar-branding-v171.md` 1.0.0 e `docs/qa/agreement-visual-option4-v211.md` 1.0.0. Fontes: decisões de Bruno em2026-09-13,2026-09-18 e2026-10-06. A versão1.3.0 aplica a direção visual4 escolhida para toda a plataforma, preservando organização, navegação e contratos de domínio anteriores.

## Retorno imediato v2.3.1

O contrato de apresentação passa a `prisma-ux-foundation-1.4.0`, por decisão de Bruno em10/10/2026; a direção visual1.3.0 acima permanece. A seta compartilhada no alto à esquerda retorna à tela imediatamente anterior registrada, inclusive etapas/áreas internas integradas. Links de destino fixo permanecem sem seta e usam nomes como Ir para Pessoas/Posições. Não usar o pai hierárquico como substituto de uma origem conhecida. Entrada direta sem origem elegível mostra a seta indisponível. O retorno usa history.back, não adiciona uma nova visita; confirma rascunho uma única vez e mantém as proteções do navegador. Origem restrita à mesma sessão, papel e empresa, sem armazenar URLs de autenticação ou portais com tokens. Histórico interno guarda apenas identificadores de apresentação em memória, até50estados. Modais/painéis continuam fechando sobre a tela de origem; portais públicos mantêm a navegação própria. Acordo `docs/qa/agreement-navigation-back-v231.md`1.0.0 e AoT correspondente. Sem nova dependência/roteador, contrato de domínio ou alteração de autorização.

## Hierarquia e iconografia v2.1.1

Títulos de página30–36px, seções20–24px, fatos principais24–26px, leitura16px, rótulos14–15px e metadados14px. Ícones de área32–36px em suporte56–64px; destaques32px em56px. Controles mantêm escala e foco próprios. Metadados compactos e selos auxiliares podem usar13px, sem promover instrução essencial a texto minúsculo.

Diretriz permanente de Bruno em08/10/2026: todo ícone em uma superfície de destaque deve ficar centralizado horizontal e verticalmente. A centralização pertence ao contêiner e deve resistir às regras de componentes carregadas em runtime, preservando dimensões, cores, raios e responsividade. Não compensar com deslocamentos arbitrários do SVG. Correção dos quatro indicadores de Início mantém v2.2.0; inspeção e limites de cobertura no acordo/AoT `docs/qa/agreement-icon-centering.md` e `docs/qa/aot-icon-centering.md`.

Cards de destaques usam fundo azul-claro #edf4ff, borda #b9d2ff, suporte de ícone #dceaff, acento #155eef e cantos16px. Conteúdo e superfícies de leitura permanecem claros; peso tipográfico e separação distinguem fato, complemento e origem. Não aplicar tonalidade a todos os painéis indistintamente. Ícones semânticos reutilizam Ant Design; capelo e maleta SVG simples seguem currentColor e ficam ocultos de leitores de tela quando acompanham rótulo textual.

Pessoa mantém seis abas, leitura72/28, quatro destaques em desktop,2x2 intermediário/uma coluna no celular, síntese e oito análises integrais, fontes opcionais e estados reais. Dados ilustrativos da imagem não substituem fatos/cálculos do Perfil. Home, Pessoas, Posições, Conhecimento, Verificações e Administração compartilham cabeçalhos, cartões e escala. Nenhuma faixa escura da opção2 foi aprovada neste movimento.

## Detalhes da Posição — v2.2.1

A proposta revisada aprovada por Bruno em08/10/2026 adapta a linguagem do Perfil à leitura da Posição: cabeçalho compacto, quatro abas em faixa branca, painel principal aproximadamente72% e sidebar contextual28%. A missão abre o resumo; dois destaques azul-claro mostram responsabilidades/resultados e requisitos obrigatórios/desejáveis, preservando categorias e origens. A lateral reúne contexto de trabalho, estado real da referência e acesso ao acompanhamento. Associação, fontes, conhecimentos relacionados e complementos permanecem completos em drawer sob demanda, com explicação e correção existentes.

Pessoas encontradas abre diretamente a descoberta; Acompanhamento conserva Lista/Kanban. Editar e Encontrar pessoas permanecem no cabeçalho, com Avaliar Pessoa atual para posição ocupada; exclusão fica em Mais ações com confirmação, carregamento, cancelamento e tentativa explícita após falha. Ausências são indicadas sem conteúdo fictício; pendências reais de classificação/associação permanecem visíveis. Tablet/celular refluem para uma coluna, preservando navegação por teclado e fontes. Consulta não dispara IA, descoberta, preview ou recálculo. Acordo1.0.0, referência visual retida e prova em `docs/qa/agreement-position-overview-v221.md` e `docs/qa/aot-position-overview-v221.md`.

## Avaliação da relação da trajetória com a Posição

Na descoberta, Adicionar ao acompanhamento é uma ação azul compacta com ícone de adicionar, dentro do quadro do Prisma Score, abaixo das informações e com margens iguais. O quadro preserva a largura desktop anterior (até 300px nos cartões com inclusão); tablet/celular mantêm a ação dentro dele, antes de Consultar. O componente preserva loading, falha/retry, confirmação desabilitada e Abrir acompanhamento. Não duplicar a inclusão nem exigir comparação/confirmação da relação. Papéis, cálculo e demais ações permanecem. Acordo `docs/qa/agreement-evaluation-inside-score.md` v1.0.0 substitui a localização do acordo discovery-header-evaluation; ajuste na 2.2.1.

Na descoberta de Pessoas, o bloco explicita a pergunta sobre a experiência profissional e o trabalho da Posição selecionada. Confirmar relação com a Posição, Desconsiderar esta relação e Enviar relação à curadoria têm explicações permanentes, seguidas da orientação de que confirmar não comprova requisitos nem aprova no processo seletivo. Adicionar ao acompanhamento permanece a ação independente para o Kanban. Selos descrevem a relação contextual confirmada/desconsiderada, inclusive na comparação; proposta à Knowledge continua sujeita à curadoria e aos gates atuais. Ajuste de clareza na2.2.1, sem mudança de matching, persistência, autoridade ou cálculo. Acordo `docs/qa/agreement-position-relation-clarity.md` v1.0.0 e AoT correspondente.

## Organização e jornadas

O menu agrupa Operação (Início, Pessoas, Posições, Verificações), Curadoria (Conhecimento, Banco de Itens) e Administração (Usuários e capacidades administrativas entregues), conforme a autoridade já existente. Páginas sem capacidade utilizável não são anunciadas no menu. Rotas antigas continuam compatíveis: a mudança de linguagem não renomeia URLs, contratos, entidades, tabelas, payloads ou snapshots históricos.

A análise de aderência pertence ao contexto da posição/pessoa. Necessidades de verificação conectam esse contexto ao acompanhamento; Matching deixa de ser uma entrada isolada do menu. A Central da Pessoa reúne perfil vigente, próxima ação e manutenção. Consulta de histórico, documentos e diagnóstico não se torna etapa obrigatória.

Jornadas de referência:

- Informação nova: importar → identificar quando necessário → processar → revisar fonte e evidências → conferir alterações → publicar → consultar perfil.
- Pessoa existente: Central → consultar ou adicionar fonte → revisar → publicar nova versão. Contato, mesclagem e histórico são ramificações.
- Busca: critérios → resultados explicados → selecionar duas pessoas → comparar/consultar evidências → retornar aos mesmos critérios.
- Posição: criar/reutilizar definição → conferir requisitos → salvar → encontrar pessoas → comparar evidências → verificar quando necessário → preparar → emitir convite → acompanhar.
- Participante: convite → boas-vindas → instruções → confirmação → questões → revisão final → envio → conclusão/comprovante, com pausa e retomada conforme contrato.
- Curadoria: termo/lacuna → reutilização ou proposta → revisão humana → publicação → impactos/acompanhamento.
- Administração: cadastro → permissões → ativação → manutenção.

Etapas só interrompem a jornada quando exigem decisão, informação relevante ou condição necessária. As sequências são padrões para a base e movimentos específicos seguintes; não autorizam suprimir decisões ou evidências obrigatórias dos contratos de domínio.

## Apresentação

Preservar marca/ativos, azul e navegação lateral da ADR-007. Reduzir brilho, sombras e cartões aninhados. Um título principal, contexto breve e ação principal por área de trabalho. Pessoa, posição e empresa permanecem identificáveis. Detalhes técnicos ficam acessíveis por divulgação progressiva.

Azul significa ação/seleção; verde conclusão confirmada; amarelo atenção; vermelho falha ou destruição; neutro informação ausente. Texto/ícone complementam a cor. Arquivar e excluir têm significados distintos. Usar componentes compartilhados para página, cabeçalho, cartão, estado, painel e área pública.

Tabelas priorizam objeto, situação e próxima ação. Rolagem interna cabe a informação realmente bidimensional. Telas pequenas priorizam uma coluna, filtros progressivos, comparação por requisito e alternância fonte/campo quando a implementação específica requer. Controles, títulos e ações não podem se sobrepor com conteúdo longo.

### Sidebar institucional

No desktop expandido, a sidebar mantém identidade Prisma, navegação agrupada, empresa ativa, usuário ativo e rodapé institucional, nessa ordem. O rodapé usa `Powered by`, o asset HRT oficial já utilizado no login e a versão calculada pelo registro executável. No desktop recolhido, permanecem o símbolo Prisma completo, um único controle contextual de expansão, navegação por ícones, empresa e usuário operáveis e somente a versão no rodapé. O drawer móvel preserva a composição expandida e suas funções. Marca, controle e conteúdo não podem se sobrepor; a versão não pode ser duplicada como string local.

## Fidelidade a referências visuais

Uma imagem fornecida como orientação do resultado planejado é normativa para a arquitetura visual, salvo classificação diferente do Product Owner. Devem ser preservados de forma reconhecível: topologia da página, hierarquia, proporções relativas, agrupamentos, densidade, alinhamentos, ordem da informação, posição relativa das ações e relação entre área principal, painéis e navegação. Textos de exemplo, nomes, contagens, avatares e dados ilustrativos não são requisitos de produto.

“Não copiar literalmente” significa adaptar o conteúdo real, os componentes acessíveis existentes, os tokens Prisma, a implementação e o acabamento fino. Não significa trocar uma composição em duas colunas por uma página linear, mover ações primárias para outra região, alterar substancialmente a densidade ou reorganizar os blocos sem autorização. Restrições reais de domínio, segurança, acessibilidade e dados prevalecem, mas o conflito deve ser declarado e decidido; não pode virar um redesenho silencioso.

Todo prompt de criação ou alteração visual com referência deve:

- classificar a referência como alvo normativo, inspiração, contraexemplo ou exemplo de conteúdo;
- decompor a imagem em topologia, hierarquia, proporções, agrupamentos, densidade, alinhamento, ações, estados e comportamento responsivo;
- registrar requisitos e proibições `D-UX-*` e `P-UX-*`, autonomia `A-UX-*`, dúvidas materiais `Q-UX-*` e aceites `CA-UX-*`;
- exigir comparação visual com o mesmo estado, dados equivalentes e viewport da referência, além das larguras responsivas aplicáveis;
- registrar no AoT a evidência renderizada e toda divergência material, com sua autorização ou limitação.

Teste funcional, typecheck, presença dos componentes ou descrição textual não comprovam fidelidade visual. Pixel perfect só é exigido quando explicitamente acordado; o padrão é fidelidade estrutural reconhecível dentro do design system e das restrições reais do Prisma.

## Linguagem

Português do Brasil, profissional, direto e acolhedor. Glossário de interface: Início; Nome de usuário; Posições/Posição; Necessidades de verificação; Base global de conhecimento; Termos para revisar; Competências nos filtros de pessoas. Identificadores internos e termos originais de fontes não são traduzidos como dados.

Nomear ações pelo efeito: salvar rascunho, publicar perfil, arquivar, excluir, gerar link, enviar convite. Só anunciar envio, publicação ou salvamento após resultado confirmado. Ausência permanece “Não informado”, “Ainda sem dados” ou “Não identificado no documento”; não vira zero, insuficiência profissional ou primeira publicação. Erros comuns indicam situação e recuperação; diagnósticos técnicos não são transferidos ao operador.

## Estados e continuidade

### Diretriz permanente de carregamento visível (Bruno, 07/10/2026, v2.1.6)

Sempre que uma operação pendente puder alterar o conteúdo que a pessoa está vendo, sinalizar visualmente até terminar, falhar ou ser cancelada. Vale para todas as páginas autenticadas e públicas, blocos, tabelas, modais, consultas auxiliares, processamento e cálculos. O responsável por UX define a granularidade: primeiro carregamento essencial pode usar skeleton de página; operações independentes usam indicador local e aviso contínuo não bloqueante. Preservar conteúdo disponível durante atualizações, rascunhos e escolhas. Um botão ocupado sozinho pode sair da área visível: o aviso compartilhado acompanha operações pendentes sem interceptar cliques.

Comunicar a operação em português, com anúncio acessível e sem depender apenas de cor. Operações simultâneas continuam sinalizadas até terminar a última operação relevante. Ao fechar/desmontar a superfície, remover seus indicadores; falha encerra espera e mantém recuperação disponível. Percentual só quando mensurável; carregamento não é vazio nem zero provisório. A sinalização acompanha estados reais de UI, não toda chamada de rede; atividade técnica incapaz de alterar a visualização não produz aviso artificial. Não disparar consultas, geração de IA ou recálculo de score para alimentar indicadores. Manter a estabilidade e atualização causal da v2.1.4. Novas telas e alterações futuras devem seguir a diretriz e incluir validação dos estados pendentes.

Implementação/aceite: acordo `docs/qa/agreement-loading-feedback-v216.md` 1.0.0 e AoT correspondente. Esta regra complementa a versão de apresentação1.3.0 sem mudar sua arquitetura visual.

Carregamento, vazio inicial, busca sem resultados, erro, sucesso e indisponibilidade têm apresentações distintas e acessíveis. Carregamento não apresenta zero provisório. Vazio inicial orienta a entrada permitida; resultado vazio oferece ajuste de filtros; erro oferece recuperação sem apagar informação vigente. URLs desconhecidas e entidades inexistentes não abrem outra entidade.

Decisão explícita de Bruno em 06/10/2026, aplicada na v2.0.10: toda mensagem de erro, atenção ou outra natureza que implique revisão/correção humana deve conter o problema/divergência em português claro e sucinto e um botão que leve ao campo, registro, painel ou recuperação correta. Não basta orientar por texto ou apontar um menu genérico. A ação preserva rascunhos e escolhas; não recarrega formulários para simular uma correção. Falha interna sem correção de campo oferece consulta do estado/recuperação permitida, nunca inventa trabalho manual. Mensagens informativas sem intervenção requerida permanecem informativas, sem botões artificiais. Aviso temporário de erro com ação permanece até ser fechado ou acionado. Esta decisão substitui a restrição anterior às superfícies novas/alteradas.

Mensagens partem da causa efetivamente conhecida e indicam somente ações que o sistema realmente permite. Quando a causa não puder ser determinada, isso deve ser dito sem atribuir culpa a um serviço externo ou à pessoa. Detalhes técnicos ficam fora do texto principal. Permissões e estados continuam controlados no servidor; a interface não fabrica encaminhamento ao suporte nem envia mensagens automaticamente. Grupo/subgrupo de competência e vínculo factual são estados distintos: definir grupo reutiliza a classificação humana existente na Knowledge, com alcance explícito, sem preseleção e sem apagar evidências.

Buscas remotas iniciadas durante digitação esperam uma pausa curta, cancelam solicitações superadas e podem reutilizar resultados somente na sessão corrente. Um limite de tempo interrompe esperas sem resposta e preserva o conteúdo preenchido; nova tentativa continua explícita.

Navegação preserva filtros, seleção, paginação, aba e rolagem nos contextos integrados à base. Estado de navegação é temporário, separado por sessão autenticada, papel e empresa, sem persistir currículos, respostas, senhas ou tokens. Sair de edição com alterações não salvas exige confirmação; navegação sem alterações não exige confirmação. Retorno ao contexto de origem, menu, histórico do navegador, troca de empresa e saída da sessão usam o mesmo limite de proteção. Autorização permanece nos contratos existentes fora da UI.

## Acessibilidade e aceite

Toda alteração verifica critérios aplicáveis: operação por teclado, nomes acessíveis, foco visível e retorno após diálogo, hierarquia de títulos, erros associados a campos e anúncios de estado. Não depender somente de cor. Reutilizar comportamento acessível do Ant Design e sua localização pt-BR.

Na revisão de divergências da trajetória (v2.1.3), cada opção tem descrição sempre visível e ajuda de significado/impacto por botão de informação, clique, mouse e teclado. A ajuda acompanha a categoria efetivamente recebida, não preseleciona nem salva. Escape fecha a ajuda sem fechar o modal. O impacto é condicionado às evidências: declaração não vira experiência, e não se promete pontuação fixa. Aviso informa aplicação ao salvar, alcance deste Perfil/versão da Posição e ausência de regra na Knowledge. Qualquer item não determinável mantém o cálculo anterior e a revisão sem conclusão. Preservar três escolhas e conclusão integral, pares/citações e ações anteriores. Acordo `docs/qa/agreement-trajectory-review-help-v213.md` 1.0.0.

Conferir leitura, contraste e ampliação nas superfícies alteradas, com referências de 390 px, 768 px e desktop; considerar reflow em 320 CSS px. Avaliar conteúdo longo, vazio, erro e menu aberto/recolhido. Inspeção dirigida não equivale a certificação WCAG de todo o produto.

## Autonomia e evolução

Sem referência normativa, engenharia escolhe medidas, espaçamento, tipografia, distribuição dos componentes e redação coerente com este contrato. Com referência normativa, a autonomia cobre acabamento e implementação dentro da arquitetura visual acordada; mudança estrutural exige decisão explícita. Esta aprovação não muda autorização, isolamento, obrigatoriedade de dados de domínio, matching, parser, fontes externas, custo ou produção. Os grupos específicos 4–14 ainda serão trabalhados nos próprios escopos; a base transversal vale imediatamente para novas alterações. Critérios de aceite e limitações ficam no AoT da entrega aplicável.

## Painel executivo do Resumo v2.0.12

Acordo congelado docs/qa/agreement-profile-summary-cards-v2012.md v1.0.0: quatro cards inicialmente abertos (áreas da experiência mais recente, posição mais recente e outra experiência recente, maior formação concluída, empresas). Desktop: uma linha de quatro cards, síntese larga com acento azul, oito eixos completos em duas colunas; intermediário: duas colunas de destaques; celular: uma coluna. Altura livre, sem corte de listas/textos, fontes desligadas inicialmente. Posição/empresa/período/duração e complemento visíveis; sobreposição nunca vira posição anterior. Cards não substituem respostas, lacunas ou perguntas. Ausência de vínculo seguro da área tem explicação local e preserva o relato publicado e as áreas gerais. Mostrar fontes abre origem opcional dos destaques já carregados, identificando Perfil vigente, separadamente do snapshot de IA. Falha de render de um card preserva outros cards e respostas, com ação Consultar Perfil completo. Ref. visual normativa e renders sintéticos no diretório de evidência do movimento.

Correção autorizada em06/10/2026: maior formação concluída apresenta a qualificação conhecida e sustentada, inclusive MBA. Quando MBA e especialização empatam, ambos permanecem visíveis; não se cria hierarquia entre eles. Sem qualificação conhecida mantém nível genérico. Confirmação publicada deve chegar intacta à tela, sem exigir nova ação humana. Layout, fontes sob demanda e conteúdo dos demais cards/seções permanecem. Acordo `docs/qa/agreement-profile-education-read-fix.md`.

## Etapas de acompanhamento

O acompanhamento usa cinco colunas concretas e de dimensões iguais: Selecionadas para acompanhamento, Aguardando entrevista, Entrevista agendada, Aguardando decisão e Decisão registrada. Desktop preserva largura legível dos cartões com rolagem local; mobile continua uma coluna selecionável. Arraste/Mover etapa para uma situação factual abre o formulário e exige salvamento válido. As duas etapas iniciais antigas e filtros/coluna mobile convergem na nova etapa inicial sem perda de histórico. Nomes automáticos Avaliação NN aparecem como Acompanhamento NN, preservando o valor original no banco e nomes personalizados. Acordo `docs/qa/agreement-follow-up-stages.md`1.0.0; sem questionários, mudança de Score ou versão.

## Cards compactos do acompanhamento (2.2.1)

Referência aprovada em docs/qa/agreement-compact-follow-up-cards.md: avatar/identificação/localização à esquerda; alça e quadrado numérico à direita; aviso de qualidade fora do quadrado; rodapé com Ver detalhes e Mover etapa lado a lado. Nome/cargo quebram linhas, sem corte. Cinco colunas iguais, mínimo desktop 320px com rolagem local; mobile mantém uma coluna selecionável. Numeral indisponível é travessão com nome acessível; zero persistido é exibido como zero. Idade e explicações completas continuam no detalhe.

## Pessoas compactas e vínculo atual — 2.3.4

A primeira proposta visual aprovada em10/10/2026 define os cards da descoberta em uma coluna. O cabeçalho reúne seleção, Pessoa, status de acompanhamento e Score. A faixa abaixo concentra consulta e inclusão/abertura do acompanhamento. Requisitos resumidos permanecem visíveis no card expandido; todas as evidências e a revisão humana são expansíveis e independentes. O primeiro card abre completo e os seguintes ficam recolhidos, com controle acessível. Celular reorganiza os mesmos dados em uma coluna. A indicação de acompanhamento usa o processo atual persistido, sem esconder a Pessoa nem mudar matching ou decisão humana. Fonte/limites: acordo e AoT `people-compact-v234`.
