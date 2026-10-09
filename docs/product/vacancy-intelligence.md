# Vagas como necessidade profissional estruturada

## M8.6 — Interpretação profissional universal

Toda Posição com título pode ser comparada com qualquer profissão usando o mesmo contrato de evidência. A busca aproveita primeiro Knowledge Global/Empresa e decisões humanas autorizadas; a IA só interpreta relações não resolvidas. Títulos não eliminam Perfis por veto lexical. Um Perfil sem conteúdo profissional utilizável fica fora daquela Posição e não consome IA, sem conclusão de incapacidade.

A triagem ocupacional seletiva `semantic-triage-2.0.0` preserva a análise interna de todos esses Perfis, incluindo experiências históricas. Relação publicada suficiente fica interna; apenas relação profissional atribuível, plausível e ainda indefinida aciona a IA. Área ampla, venda no setor, requisito ou ferramenta isolada não bastam. Uma pendência plausível não é tratada como Grupo C definitivo só porque a classificação inicial foi incompleta. C somente contextual permanece consultável sem IA automática. A lista interna aparece antes da conclusão das interpretações e cada resultado é atualizado isoladamente; falha mantém o cálculo anterior integralmente. A política de acionamento substitui somente a cobertura automática irrestrita da IA do M8.6, conforme `docs/qa/agreement-matching-selective-semantic-triage.md` v1.0.0.

A relação distingue atuação direta, equivalente, relacionada/transferível, potencial de entrada, contexto, outro domínio e indeterminação. Híbridos exigem prova dos dois componentes para equivalência integral. A Posição registra se experiência anterior não é necessária, necessária ou não especificada. A decisão humana continua necessária para confirmar, descartar ou propor aprendizado à Inbox da Knowledge; nenhuma relação global é publicada automaticamente.

## M7.1 — Taxonomia Profissional e Inteligência de Posições

Ativo no frontend/backend único desde o rollout autorizado de 2026-09-18: o nome da empresa permanece separado do conceito profissional Prisma e das referências CBO/ESCO/O*NET sustentadas. Correspondência aprovada inequívoca é automática, visível e corrigível; ambiguidade exige escolha e insuficiência preserva o preenchimento manual, sem inventar referência.

Conhecimentos e habilidades relacionados são sugestões agrupadas pelos tipos efetivamente publicados, não uma lista automática de exigências. Cada inclusão pede obrigatório ou desejável no contrato existente. Knowledge complementar pertence à empresa, é reutilizável e só vira requisito após seleção explícita. Não usa estados de evidência da Pessoa, não presume proficiência e não altera o matching. “Por que o Prisma associou assim?” expõe fontes, versões, regra, decisão humana, histórico e correção; a origem também está disponível por item. Histórico sem interpretação M7.1 continua identificado como tal, sem reprocessamento retroativo.

Detalhes e limites: ADR-060 e AoT M7.1. Nenhuma referência/equivalência dos mocks é dado de produto. Uma, duas ou três fontes são possíveis somente se sustentadas; não é obrigatório preencher as três.

## M6.1 — Score Prisma

A descoberta continua respondendo quem possui relação profissional com a Posição. Depois dela, o Score Prisma organiza a compatibilidade observada de 0 a 100 sem excluir Pessoas, escolher vencedor ou substituir julgamento humano.

A trajetória separa A (direta), B (relacionada/transferível) e C (somente contextual). A/B mostram score, cobertura e estado provisório; C permanece visível/recolhido e sem score comparável. O detalhe explica área, função/senioridade, requisitos, evidências, pontos aplicáveis e versões. Falta de evidência é informação insuficiente, nunca incapacidade. Localidade, regime, disponibilidade e remuneração ficam fora do score profissional.

Não existem faixas baixa/média/alta, cutoff ou decisão automática no M6.1. O relatório sombra serve apenas à calibração futura e não retroalimenta o cálculo.

## Objetivo

`Vaga` descreve uma necessidade profissional concreta da organização. Ela pode estar ocupada ou não ocupada e não representa campanha de recrutamento, anúncio público ou etapa de ATS.

## Modelo mental

- Referência ocupacional global: conceito reutilizável da Knowledge Global, como CBO, ESCO ou O*NET.
- Função da organização: definição privada e reutilizável da empresa em `job_roles`.
- Posição: lugar concreto no desenho organizacional, com situação e Pessoa ocupante quando houver.
- Vaga: versão contextual da necessidade, com Sobre a posição, responsabilidades, resultados e requisitos próprios. O contexto relevante é consolidado em Sobre a posição, sem card final separado.

Vagas com o mesmo título podem ter requisitos diferentes. O título nunca substitui a definição versionada.

## Jornada M5.4

1. listar e filtrar Vagas;
2. criar manualmente ou iniciar por função, Vaga anterior, referência Knowledge ou descrição livre;
3. revisar sugestões determinísticas, corrigir a dimensão e decidir obrigatório/desejável; pendências não escondem Pessoas, mas mantêm a aderência detalhada incompleta;
4. consultar o detalhe editorial e o histórico;
5. encontrar Pessoas pelos Perfis publicados do tenant;
6. comparar exatamente duas Pessoas por requisito e evidência; o score vigente não escolhe vencedor nem decide contratação.
7. consultar o Assistente Prisma. Em `Na sua empresa`, a resposta usa somente a Vaga atual, Vagas e funções acessíveis e Knowledge publicada autorizada, incluindo relações publicadas quando disponíveis. Ela informa se a evidência interna é suficiente, parcial ou insuficiente; contagens são apenas metadados. Toda pergunta preenchida consulta a Web por padrão, separadamente da leitura interna, e mostra as fontes usadas. O operador pode escolher explicitamente `Somente fontes internas`; não há classificação oculta por palavras-chave. Nenhuma resposta substitui a leitura interna ou altera a Vaga automaticamente.

## Regras de aderência

- `Atendido`: o requisito genérico aparece explicitamente em qualquer conteúdo profissional publicado ou possui equivalência canônica publicada; a categoria não bloqueia a conexão.
- `Parcial`: existe correspondência textual parcial, transferência explicitamente configurada ou o termo aparece sem comprovar o nível exigido; exige revisão humana.
- `Sinal relacionado`: relação confirmada apenas para a versão da Vaga; não comprova o requisito.
- `Sem evidência suficiente`: o Perfil atual não traz evidência suficiente; nunca significa que a Pessoa não possui a experiência ou o conhecimento.

A relação com a posição aparece separada da aderência por requisitos: mesma referência, referência equivalente, referência relacionada, possível relação por título/experiência ou nenhuma relação automática. O usuário pode confirmar ou descartar a relação; sua decisão prevalece na ordenação, sem alterar Perfil, Vaga ou Knowledge.

A ordenação vigente é determinística: grupo de trajetória, Prisma Score decrescente em A/B (inclusive provisório identificado), decisão humana e nome/ID como desempate. C não recebe score competitivo. Todos os Perfis publicados acessíveis são analisados; a interface informa o universo analisado e a origem dos sinais. Não é recomendação automática de contratação. Essa regra antecede M7.1 e não foi alterada pela taxonomia.

## Estrutura canônica da Vaga pronta

`Sobre a posição` e `Resultados esperados` são opcionais. `Responsabilidades` descreve ações e entregas, nunca uma tecnologia isolada. Esses campos pertencem à definição da Vaga e não são evidência da Pessoa. O matching detalhado consome requisitos classificados pelo humano em `Requisitos obrigatórios` ou `Requisitos desejáveis`. Os grupos equivalentes às dimensões do Perfil organizam a leitura e a proveniência, mas uma menção profissional explícita pode atender ao requisito independentemente do grupo em que foi cadastrada. A importância continua sendo decisão humana. A ausência de desejável ou de dimensão não exigida não é gap obrigatório. Requisitos manuais e correções humanas permanecem em reestruturações; uma alteração da descrição mostra delta e nunca remove item não encontrado automaticamente.

## Limites do piloto

- sem candidatura pública, proposta, contratação automática, página pública ou integração externa;
- acompanhamento interno por Pessoa/Posição, entrevistas e decisões explícitas seguem o contrato2.2.0 abaixo;
- sem publicação automática na Knowledge;
- sem provedor externo para estruturar descrições; Web Search existe somente na pergunta contextual e não altera a definição;
- sem avaliação automática M5.1;
- sem decisão de contratação.


## Acompanhamento Pessoa–Posição v2.2.0

A descoberta mantém a comparação de exatamente duas Pessoas. `Adicionar ao acompanhamento` é uma ação humana independente: inicia `Acompanhamento 01` na primeira inclusão e reutiliza a Pessoa publicada. Posição, ocupação, processo e etapa individual permanecem separados. O mesmo cadastro pode participar de acompanhamentos independentes em várias Posições.

A aba Acompanhamento alterna Lista/Kanban do mesmo conjunto. Lista oferece etapa, próxima ação, responsável e prazo; busca nome/ação, filtros etapa/responsável/prazo inclusive ausentes e ordenação nome/prazo. Indicadores consideram o processo inteiro, com contagem filtrada separada. Kanban mostra Selecionadas para acompanhamento, Aguardando entrevista, Entrevista agendada, Aguardando decisão e Decisão registrada. Os dois identificadores iniciais legados são projetados na primeira coluna; filtros e coluna mobile antigos continuam válidos, sem reescrever registros ou histórico. Concluídos permanece consultável.

Cartões exibem nome completo, título publicado, idade autorizada quando disponível e numeral azul do Score Prisma, sem denominador ou porcentagem. Não há idade inventada, corte nem faixa de mérito. Score indisponível/provisório mantém seu estado; score/cobertura, evidências e versões são consultáveis no detalhe. Arraste pela alça com placeholder/realce/Escape; Mover etapa atende teclado e mobile. Mobile usa uma coluna selecionada e detalhe de tela completa.

Detalhe reúne anotações internas/perguntas, ação/responsável/prazo, entrevista opcional, decisão e histórico autor/data. Agendar/reagendar/cancelar são explícitos, com data/hora/fuso/participantes e sem envio de convite. Decisão começa sem escolha, exige justificativa e vale apenas neste processo. Mover para Aguardando entrevista ou Aguardando decisão só organiza a etapa. Mover para Entrevista agendada ou Decisão registrada abre o formulário correspondente; somente salvar um registro válido muda a etapa. Esses estados aparecem em colunas próprias, sem tag redundante. Concluir sem decisão difere de não prosseguir. Encerrar/reabrir processo preserva etapas e decisões individuais. Ocupação, Perfil e outras Pessoas não são modificados.

Essas operações só leem o resultado persistido, sem recalcular score. Novas versões são sinalizadas; descoberta e recálculo autorizado continuam seguindo a estabilidade vigente. Notas e decisões operacionais não são evidência profissional nem curadoria Knowledge. Acesso reutiliza os papéis existentes de Posições, validado no servidor: super_admin autorizado, owner/admin/recruiter da organização. Atribuição não concede acesso; member não é ampliado. Não existem automações de candidatura/contratação, mensagens, novas fontes ou nova IA.

Contrato aprovado: `docs/qa/agreement-position-follow-up-v220.md`1.0.0; nomenclatura/colunas/inclusão atualizadas por `docs/qa/agreement-follow-up-stages.md`1.0.0, mantendo 2.2.1. Implementação/aceite/limites de ambiente: `docs/qa/aot-position-follow-up-v220.md`. ADR-079 registra persistência e interação.
