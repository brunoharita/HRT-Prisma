# Execução M7.1 — Taxonomia Profissional e Inteligência de Posições

Contrato: `docs/qa/agreement-m71-position-taxonomy.md` 1.0.0, aprovado pelo pedido explícito do Product Owner nesta tarefa. Texto original integral abaixo. As três imagens corretas fornecidas posteriormente substituem as referências visuais de Pessoa; dados ilustrativos não são autoridade.

Implementar o Movimento 7.1 do Prisma: Taxonomia Profissional e Inteligência de Posições.
Este movimento evolui capacidades já existentes de Knowledge, Professional Concept e Posições. Ele não cria uma segunda arquitetura paralela.
O objetivo é permitir que uma Posição informada pela empresa seja normalizada de forma explicável contra as fontes oficiais já publicadas no Prisma — CBO, ESCO e O*NET —, preservando o nome escolhido pela empresa, consolidando referências equivalentes em uma camada própria do Prisma, apresentando conhecimentos/habilidades relacionados e permitindo complementação pela Knowledge da organização.
A mesma taxonomia será reutilizada posteriormente pelo M7.2 para representar evidências da Pessoa, mas Pessoa não faz parte deste movimento.
As imagens anexadas a este prompt são referências de direção de UX:
- dashboard_prisma_de_posição_profissional.png
- tela_prisma_interpretação_da_posição.png
- modal_de_knowledge_complementar.png
Elas não são contratos de dados nem devem ser copiadas literalmente. Nomes, códigos, versões, textos, números, status e exemplos nelas são ilustrativos. Em caso de conflito, este contrato, as decisões vigentes do Product Owner e as fontes canônicas do repositório prevalecem.
Antes de modificar código, schema, contrato, documentação ou UX:
1. Leia AGENTS.md integralmente.
2. Consulte a seção pertinente de docs/ai-context/PRISMA_CURRENT_STATE.md.
3. Leia as referências canônicas relevantes:
   - docs/ai-context/PRISMA_WIKI.md
   - docs/ai-context/PRISMA_TECHNICAL_REFERENCE.md
   - docs/ai-context/PRISMA_AI_REFERENCE.md
4. Leia os owners de Posição, Knowledge e Professional Concept, incluindo, quando existentes/aplicáveis:
   - docs/product/vacancy-intelligence.md
   - docs/architecture/vacancy-intelligence.md
   - docs/architecture/professional-concept-architecture.md
   - docs/architecture/contracts.md
   - docs/ai/matching-contract.md
   - docs/product/ux-foundation.md
   - documentação de Knowledge em docs/product, docs/architecture e docs/ai
   - ADRs vigentes relacionados a Knowledge, Professional Concept, Posições, matching, UX compartilhada e versionamento
   - docs/security
   - docs/qa/agreement-contract-template.md
   - docs/qa/aot-template.md
   - docs/architecture/versioning.md
   - docs/qa/release-checklist.md
5. Confirme no código, migrations, contratos e testes o estado real das capacidades existentes antes de desenhar qualquer solução.
6. Inspecione especialmente:
   - web/src/pages
   - web/src/components
   - web/src/styles.css
   - serviços/domínio de Knowledge e Professional Concept
   - serviços/domínio de Posições
   - schemas/RPCs/migrations Supabase pertinentes
   - ingestão publicada de CBO, ESCO e O*NET
   - testes atuais de Posições, Knowledge, matching, RLS e isolamento por organização.
7. Inspecione os schemas reais dos snapshots publicados de CBO, ESCO e O*NET. Não suponha que as três fontes usem as mesmas categorias, relações ou níveis.
8. Reutilize capacidades existentes antes de criar qualquer novo componente, tabela, serviço, RPC, taxonomia ou contrato.
Se houver divergência entre documentação e comportamento verificado, registre-a. Não use o comportamento existente para substituir uma decisão vigente do Product Owner.
Considere como premissas, mas confirme no repositório:
- CBO, ESCO e O*NET já estão publicadas no Prisma-QA e possuem snapshots/versionamento próprios.
- A Knowledge já separa termo observado, conceito normalizado e inferência.
- Existe Knowledge Global Prisma e Knowledge da empresa como overlay tenant-owned.
- Termos desconhecidos podem ser preservados e tratados pela Knowledge Inbox.
- Correções e propostas não podem virar verdade global silenciosamente.
- Posição, vaga e papel são conceitos distintos e não devem ser fundidos.
- Posições já possuem definição e requisitos versionados.
- Requisitos novos aceitos usam required ou desired; não crie um segundo sistema de obrigatoriedade.
- Matching, grupos A/B/C e Prisma Score possuem contratos vigentes e não fazem parte da reformulação semântica deste movimento.
- Relações de CBO/ESCO/O*NET nunca se tornam evidência de competência de uma Pessoa.
- Todo resultado material precisa manter proveniência, método e versão.
- Ausência de informação não é deficiência.
- A autorização deve continuar fora do frontend e falhar fechada.
- A Knowledge da organização não altera automaticamente a Knowledge Global.
A arquitetura deve tornar explícitos três níveis diferentes:
```
Nome informado pela empresa
        ↓
Conceito profissional Prisma
        ↓
Referências e relações das fontes oficiais
CBO + ESCO + O*NET
```
Exemplo conceitual, sem assumir nomes/códigos reais:
```
Nome informado:
"Desenvolvedor Backend"

Conceito profissional Prisma:
"Desenvolvimento de software / backend"

Referências:
CBO  → ocupação equivalente/relacionada
ESCO → ocupação equivalente/relacionada
O*NET → ocupação equivalente/relacionada
```
O nome fornecido pela empresa não deve ser substituído pela nomenclatura de CBO, ESCO ou O*NET.
A taxonomia Prisma funciona como camada canônica de ligação e interpretação. As fontes oficiais continuam independentes e versionadas.
Este contrato representa as decisões aprovadas pelo Product Owner para este movimento.
Não reinterprete requisito numerado. Se houver conflito técnico real, interrompa somente a parte afetada, descreva o conflito e apresente alternativas para nova decisão.
O M7.1 deve evoluir a arquitetura existente de Knowledge/Professional Concept.
É proibido criar uma segunda base de conhecimento paralela para Posições.
A normalização ocupacional e a obtenção de relações profissionais deste movimento devem usar apenas:
- CBO publicada no Prisma;
- ESCO publicada no Prisma;
- O*NET publicada no Prisma.
Não usar Lominger nem outra metodologia ou fonte externa neste movimento.
A camada taxonômica Prisma deve crescer conforme Posições são utilizadas.
Não pré-calcular nem publicar massivamente uma nova ontologia de todas as ocupações e relações existentes nas três bases.
Quando uma Posição precisar de um conceito/relação:
1. procurar capacidade/conceito Prisma já existente;
2. reutilizar relação já consolidada quando aplicável;
3. consultar os snapshots oficiais locais publicados;
4. construir ou propor somente o conhecimento necessário para aquele uso;
5. persistir proveniência e versão conforme contratos existentes.
O título/nome de uma Posição é informação da organização.
Exemplo:
```
Nome da posição:
Desenvolvedor de software
```
A normalização não renomeia a Posição.
O conceito profissional Prisma e as referências oficiais aparecem como informação associada.
A Posição pode ser associada a um conceito profissional Prisma normalizado.
Esse conceito deve poder possuir uma ou mais referências a CBO, ESCO e O*NET quando houver correspondência sustentada.
Não exigir que as três fontes tenham sempre uma referência.
Estados válidos precisam contemplar pelo menos:
- associação resolvida;
- associação ambígua;
- associação ainda não resolvida/insuficiente.
Os nomes técnicos exatos desses estados ficam a cargo da implementação, respeitando a linguagem de produto existente.
Quando a resolução for suficientemente determinística segundo regras explicáveis e vigentes, o Prisma pode associar automaticamente a Posição ao conceito profissional correspondente.
O usuário não deve ser obrigado a confirmar toda associação correta.
A associação automática deve permanecer visível, explicável e corrigível.
Se duas ou mais interpretações puderem alterar materialmente o conceito profissional, os conhecimentos relacionados ou o comportamento da Posição, não escolher silenciosamente.
Apresentar opções compreensíveis ao usuário autorizado e exigir seleção explícita.
Quando não houver base suficiente para normalizar:
- preservar integralmente o nome informado;
- não inventar ocupação equivalente;
- não selecionar a opção “mais próxima” silenciosamente;
- comunicar que a referência ainda não foi resolvida;
- permitir os caminhos já aprovados de busca/seleção manual e Knowledge Inbox quando aplicáveis.
A Posição não deve desaparecer nem ser tratada como inválida apenas porque a normalização não foi concluída, salvo contrato vigente que exija algo diferente.
A taxonomia Prisma pode consolidar relações equivalentes entre CBO, ESCO e O*NET, mas deve manter cada ligação de origem.
Para qualquer associação material, deve ser possível recuperar:
- fonte;
- identificador oficial;
- rótulo/título na fonte;
- versão/snapshot publicado;
- método/regra de associação;
- timestamp/versionamento aplicável.
Não force as três fontes a uma estrutura falsa comum.
Ao organizar conhecimentos, habilidades, competências, atividades ou outros atributos:
- mapear somente o que os schemas reais sustentam;
- preservar o tipo/origem da fonte;
- consolidar conceitos equivalentes quando houver justificativa;
- manter itens distintos quando a equivalência não for segura.
A UX pode usar agrupadores Prisma compreensíveis, mas o modelo não pode esconder divergências relevantes das fontes.
Depois da normalização, a Posição deve poder exibir os conhecimentos, habilidades, competências ou atributos profissionais relacionados ao conceito segundo CBO, ESCO e O*NET.
Esses itens são referências/sugestões da taxonomia.
Eles não se tornam automaticamente requisitos obrigatórios ou desejáveis da Posição.
O usuário autorizado decide quais itens relacionados realmente fazem parte dos requisitos da Posição.
Ao selecionar um item como requisito, reutilizar o contrato de requisitos vigente, inclusive required/desired.
Não criar um segundo sistema paralelo de requisitos, criticidade ou obrigatoriedade.
Se uma fonte possuir métricas próprias de importância, nível, frequência ou relevância, elas podem ser preservadas como dados da fonte quando permitido pelo contrato.
Não converter automaticamente esses valores em:
- senioridade Prisma;
- nível de proficiência da Posição;
- score novo;
- peso de matching novo;
- exigência obrigatória/desejável.
Qualquer futura conversão exige decisão específica do Product Owner.
A organização deve poder adicionar conhecimento profissional que não esteja adequadamente representado nas bases oficiais.
Exemplos conceituais:
- ISO 27001;
- tecnologia proprietária;
- política interna;
- prática específica da organização.
Esse conhecimento deve utilizar a Knowledge da empresa/overlay existente sempre que possível.
Ele deve:
- ser tenant-owned;
- ficar visualmente distinguível de CBO/ESCO/O*NET;
- poder ser reutilizado em outras Posições da mesma organização quando o domínio atual permitir;
- nunca alterar automaticamente a Knowledge Global;
- nunca editar os snapshots das fontes oficiais.
Criar/usar um item na Knowledge da empresa não deve, sozinho, torná-lo requisito da Posição.
A associação à Posição e a classificação required/desired devem seguir o fluxo de requisitos vigente.
A interface da Posição deve fornecer uma ação clara equivalente a:
Corrigir associação
O usuário autorizado deve poder:
- substituir a interpretação atual;
- selecionar outra referência/conceito aplicável;
- resolver uma ambiguidade;
- desfazer uma associação incorreta conforme contrato.
A correção precisa ser auditável.
Uma correção feita em uma Posição deve alterar corretamente aquela Posição e, quando o desenho atual suportar, produzir feedback/proposta reutilizável no escopo da organização.
Ela não pode alterar automaticamente a Knowledge Global Prisma.
Promoção global continua sujeita à governança/publicação vigente.
O uso deve permitir que o Prisma reutilize associações já conhecidas.
Exemplo conceitual:
```
Primeira ocorrência:
"Desenvolvedor Backend"
→ conceito Prisma validado

Ocorrência futura:
"Backend Developer"
→ pode reutilizar alias/relação já conhecida se a regra vigente sustentar
```
O reaproveitamento precisa respeitar:
- organização;
- escopo Global vs Organization;
- versão;
- proveniência;
- ambiguidade;
- publicação/autorização.
Toda atuação de normalização, taxonomia ou Knowledge que influencie a Posição deve possuir acesso explícito na interface para explicar por que aquilo está acontecendo.
A tela principal não precisa exibir todos os detalhes continuamente, mas deve existir acesso claro, por exemplo:
- Por que o Prisma associou assim?
- Como esta posição foi interpretada?
- ícone de informação equivalente.
A explicação deve apresentar, quando aplicável:
1. nome original informado;
2. conceito profissional Prisma associado;
3. referências CBO/ESCO/O*NET utilizadas;
4. identificadores e versões das fontes;
5. regras/método aplicados;
6. informações que sustentaram a interpretação;
7. se a associação foi automática ou teve decisão humana;
8. histórico/auditoria relevante;
9. ação para corrigir a associação.
Não expor cadeia privada de raciocínio de IA.
Explicar por meio de fatos, regras, evidências, proveniência e decisão registrada.
Ao visualizar um conhecimento/habilidade sugerido pela taxonomia, deve ser possível compreender sua origem.
Exemplos:
- presente na ESCO para a referência X;
- relacionado no O*NET à ocupação Y;
- proveniente da Knowledge da organização;
- consolidado pelo conceito Prisma Z.
Evitar transformar a tela principal em uma lista técnica excessiva. Usar progressive disclosure.
Reutilizar componentes, padrões de disclosure, estados, locale, acessibilidade, foco, teclado e responsividade da UX compartilhada vigente.
Desktop deve permitir leitura ampla da taxonomia.
Mobile deve preservar:
- compreensão;
- acesso ao “por quê”;
- correção da associação;
- seleção de requisitos;
- origem dos itens.
M7.1 trabalha com aquilo que a Posição espera e com referências profissionais relacionadas.
Não apresentar conhecimentos da taxonomia como se fossem características de uma Pessoa.
Exemplo correto:
“Conhecimentos e habilidades relacionados a esta ocupação.”
Exemplo proibido:
“Pessoas desta ocupação possuem estas habilidades.”
O M7.1 deve deixar a Posição preparada para ser comparada ao Perfil da Pessoa, mas não deve fundir os dois modelos.
Conceitualmente:
```
Posição
o que é esperado
        ↓
     Matching
        ↑
Pessoa
o que está evidenciado
```
Este movimento não altera a fórmula, pesos, grupos A/B/C ou regras vigentes do Prisma Score.
Se novas relações normalizadas forem consumidas por capacidades já existentes, isso deve ser feito de modo versionado, explicável e backward-compatible.
Nenhum snapshot histórico pode mudar de significado silenciosamente.
Não use este movimento para fundir ou renomear agregados de domínio.
Confirme no código qual entidade sustenta a tela Posições atualmente e evolua o owner correto.
Nomenclatura histórica de contratos como vacancy-* não autoriza alterar o significado de Posição/Vaga sem decisão do Product Owner.
Toda associação material criada por este movimento precisa ser reconstituível posteriormente.
A persistência deve suportar, conforme aplicável:
- conceito Prisma;
- fonte oficial;
- snapshot/versão;
- método;
- decisão humana;
- escopo Global/Organization;
- versão da Posição;
- timestamps/auditoria.
Todo conhecimento da empresa, feedback, correção ou associação organization-owned deve carregar o tenant e obedecer RLS/autorização.
Não criar cache ou relação cross-tenant indevida.
Use linguagem neutra para insuficiência ou ausência.
Preferir conceitos como:
- não resolvido;
- sem referência encontrada;
- ainda não classificado;
- requer seleção.
Não usar ausência de referência como deficiência da Posição.
Mudanças relevantes na normalização da Posição devem ficar auditáveis.
O usuário deve poder identificar que a interpretação mudou, por quem/quando quando houver decisão humana e quais referências/versionamentos foram afetados.
Não hardcode listas, nomes, códigos ou equivalências apenas para satisfazer o exemplo “Desenvolvedor de software”.
Testes podem usar fixtures controladas, mas a funcionalidade deve operar sobre os dados/versionamentos reais das fontes publicadas.
A arquitetura criada deve permitir consumo posterior pelo Perfil da Pessoa sem duplicar conceitos.
Isso significa que o M7.2 deverá poder referenciar os mesmos conceitos Prisma e agrupadores, adicionando evidências da Pessoa separadamente.
Não implementar Pessoa agora.
Não incluir Lominger neste movimento.
Não usar internet/web research para completar a taxonomia da Posição.
Não introduzir nova fonte externa de ocupações, skills ou competências.
Não criar nova LLM, provider, embedding ou dependência de IA externa para resolver M7.1.
Se alguma capacidade aprovada existente puder ser reutilizada sem ampliar escopo/fonte, confirme seus contratos antes; não expanda provider/modelo silenciosamente.
Não pré-publicar toda CBO/ESCO/O*NET em uma nova tabela/ontologia Prisma apenas “para deixar pronto”.
Não substituir o título dado pela organização pelo título oficial de uma fonte.
Não tratar uma única fonte como autoridade exclusiva quando o conceito estiver relacionado a múltiplas fontes.
Não apagar proveniência ao consolidar conceitos equivalentes.
Não inferir que a Posição exige tudo que aparece em CBO, ESCO ou O*NET.
Não marcar automaticamente item como obrigatório ou desejável.
Não criar score, ranking, nível de proficiência, senioridade automática ou nova confiança probabilística.
Não alterar fórmula/pesos/ordenação do matching ou Prisma Score.
Não usar taxonomia da Posição como evidência de competência de Pessoa.
Não implementar tela/Perfil de Pessoa do M7.2.
Não implementar sucessão, mobilidade interna, workforce planning ou plano de carreira.
Não implementar 360, novos testes, novas avaliações ou feedback de Pessoa.
Não promover correção de cliente para Knowledge Global automaticamente.
Não modificar os snapshots oficiais para acomodar necessidade da empresa.
Não duplicar o mecanismo required|desired.
Não esconder normalização relevante da interface.
Não bloquear silenciosamente a Posição porque a normalização falhou.
Não relaxar autorização/RLS para facilitar UX.
Não inventar categorias comuns entre CBO/ESCO/O*NET que os dados não sustentem.
Não usar os códigos/textos das imagens anexadas como fonte de verdade.
Perfil de Competências e Evidências da Pessoa.
Qualquer alteração de parser de currículo, OCR ou publicação de Perfil.
Novos mecanismos de verificação de competências.
Sucessão e mobilidade interna.
Lominger ou qualquer metodologia comportamental adicional.
Nova fórmula de matching ou Prisma Score.
Proctoring, senioridade calculada ou proficiência calculada.
Pesquisa externa de mercado para enriquecer a Posição.
Reestruturação ampla do módulo Knowledge sem necessidade direta para este movimento.
Deploy, merge ou alteração de ambiente remoto sem autorização específica vigente para isso.
Commit/push devem seguir a autorização e as regras já registradas em AGENTS.md.
Escolher nomes internos de tipos, componentes, serviços e tabelas, desde que respeitem a linguagem canônica e não criem arquitetura paralela.
Escolher entre extensão de contratos existentes ou novo contrato versionado quando tecnicamente necessário.
Definir o melhor layout responsivo a partir da UX compartilhada e das imagens de referência.
Definir a estrutura interna de agrupadores/facets da taxonomia Prisma depois de inspecionar os schemas reais das três fontes.
Definir algoritmos determinísticos de resolução, alias e deduplicação compatíveis com os dados atuais.
Reutilizar componentes e RPCs existentes e refatorar mecanicamente quando isso reduzir duplicação sem alterar comportamento fora do contrato.
Criar índices, views, funções ou materializações necessárias para desempenho, desde que não mudem autoridade ou semântica e possuam rollback/validação apropriados.
Definir microcopy final consistente com o locale pt-BR, preservando os significados deste contrato.
Não há pendência funcional conhecida que autorize reinterpretar o movimento.
Se durante a inspeção surgir uma pendência que possa alterar comportamento, autoridade, dados, UX, custo, arquitetura, fonte externa, matching ou segurança, registre-a como Q-* e pare a parte afetada antes de implementar essa decisão.
Questões puramente mecânicas permanecem sob autonomia de engenharia.
Usuário informa, por exemplo:
```
Desenvolvedor de software
```
O Prisma preserva esse nome.
Em seguida, a capacidade de normalização tenta localizar:
1. conceito Prisma já conhecido;
2. aliases/relações aprovados;
3. referências compatíveis em CBO;
4. referências compatíveis em ESCO;
5. referências compatíveis em O*NET.
Essa ordem é conceitual. Reutilize o fluxo vigente de resolução/Knowledge se ele já resolver parte ou toda a sequência de modo equivalente.
Se houver associação não ambígua:
```
Nome informado
Desenvolvedor de software

Conceito Prisma
<conceito profissional normalizado>

Referências
CBO  → <referência real>
ESCO → <referência real>
O*NET → <referência real>
```
A Posição recebe essa associação versionada sem alterar seu nome.
Mostrar ao usuário as interpretações materiais possíveis, com contexto suficiente para escolher.
Não usar códigos técnicos isolados como única explicação.
Mostrar estado explícito.
Permitir busca/seleção manual em bases publicadas conforme capacidades existentes.
Preservar o termo para tratamento posterior.
Após resolução, apresentar itens ligados às referências oficiais.
Organizar em agrupadores Prisma compreensíveis.
Exemplo puramente ilustrativo:
```
Desenvolvimento de software
- programação
- APIs
- testes

Arquitetura e integração
- integração de sistemas
- arquitetura de software

Dados
- bancos de dados
- modelagem
```
Não hardcode esses grupos nem esses conteúdos. Eles devem derivar do modelo real e dos mappings aprovados.
Cada item deve manter origem.
Um item sugerido pode ser selecionado explicitamente pelo usuário.
Ao selecioná-lo:
- reutilizar requisito da Posição;
- usuário define required ou desired conforme UX atual;
- registrar origem daquele requisito quando possível.
A taxonomia ajuda a definir a Posição, mas não decide a Posição.
O usuário pode adicionar um conceito da Knowledge da organização.
Exemplo:
```
ISO 27001
```
Esse item:
- é criado/reutilizado no overlay da organização;
- possui proveniência Organization;
- não altera CBO/ESCO/O*NET;
- não vira Global automaticamente;
- pode ser associado à Posição;
- se for requisito, usa o mesmo contrato required|desired.
A implementação deve buscar a direção das imagens anexadas sem exigir reprodução pixel-perfect.
Na visão principal da Posição, incluir uma leitura simples:
```
Referência ocupacional Prisma

Nome informado pela empresa
Desenvolvedor de software

Conceito profissional Prisma
<conceito normalizado>

Referências oficiais
CBO    <nome/código>
ESCO   <nome/código>
O*NET  <nome/código>

[Por que o Prisma associou assim?]
[Corrigir associação]
```
Se uma fonte não tiver referência aplicável, não simular uma.
Apresentar agrupados, com progressive disclosure.
O usuário deve distinguir visualmente:
- item vindo de fonte oficial;
- item consolidado Prisma com múltiplas fontes;
- item da Knowledge da empresa.
O padrão “Por que o Prisma associou assim?” deve abrir explicação similar ao mockup tela_prisma_interpretação_da_posição.png.
Deve mostrar fatos e regras, não chain-of-thought.
A direção visual do mockup modal_de_knowledge_complementar.png pode ser usada para:
- selecionar/reutilizar conceito organization-owned;
- criar conceito complementar quando permitido;
- associar à Posição;
- informar origem;
- justificar contexto quando isso já fizer parte do contrato atual.
Não crie campos obrigatórios sem necessidade de domínio.
Preferir:
- Referência ocupacional Prisma
- Conceito profissional Prisma
- Referências oficiais associadas
- Conhecimentos e habilidades relacionados
- Knowledge da empresa
- Por que o Prisma associou assim?
- Corrigir associação
Evitar termos que indiquem verdade absoluta quando houver apenas relação de fonte.
Um conceito Prisma pode reconhecer múltiplas formas observadas para a mesma ideia profissional.
O alias não apaga a forma observada.
Exemplo:
```
"Developer"
"Desenvolvedor de software"
"Software developer"
```
podem eventualmente convergir para o mesmo conceito quando as evidências/regras sustentarem.
Não faça equivalência apenas por similaridade textual superficial.
Uma equivalência entre ocupação CBO e ocupação ESCO/O*NET é uma relação do Prisma.
Ela deve ser versionada e explicável.
Se a equivalência for somente aproximada/relacionada, não apresente como igualdade perfeita.
Modele graus/tipos relacionais determinísticos somente se já houver base conceitual e necessidade. Não crie score probabilístico.
O Prisma precisa oferecer grupos de leitura para conhecimentos/habilidades, mas esses grupos devem nascer do que as fontes realmente fornecem e da camada canônica existente.
Não declarar que CBO, ESCO e O*NET compartilham formalmente uma mesma ontologia CHA se isso não estiver demonstrado pelos dados.
Uma solução aceitável pode diferenciar, por exemplo:
- conhecimentos;
- habilidades/skills;
- competências;
- atividades;
- tecnologias/ferramentas;
- atributos profissionais;
mas o conjunto final deve ser definido após inspeção dos schemas e reutilizando conceitos existentes.
A UX pode consolidar grupos próximos, desde que o detalhe preserve a origem semântica.
M7.1 não redesenha matching.
A implementação deve rodar a regressão do matching vigente e provar que:
- grupos A/B/C continuam com o mesmo significado;
- fórmula e pesos do Prisma Score não mudaram;
- requisitos históricos continuam legíveis;
- snapshots históricos continuam aceitos conforme contratos vigentes;
- novos metadados taxonômicos não fazem Pessoa entrar em matching sem a evidência exigida pelas regras atuais.
Se for necessário versionar algum snapshot de Posição somente para carregar a nova proveniência, documente compatibilidade e migração de leitura. Não mude significado histórico.
Toda mutação deve respeitar os papéis e permissões atuais.
Não conceda capacidade nova a member, recruiter, admin, owner ou super apenas por conveniência.
Confirme no domínio quem atualmente pode:
- criar/editar Posição;
- editar requisitos;
- publicar Knowledge da empresa;
- corrigir associação;
- promover proposta global.
Use RLS/RPC/server boundary conforme owner vigente.
Inclua testes negativos para:
- anon;
- usuário autenticado fora da organização;
- papel sem permissão;
- acesso cross-tenant;
- tentativa de alterar Knowledge Global via endpoint organization-owned.
Se a solução exigir mudança persistida:
1. preferir extensão do modelo atual;
2. manter contratos históricos legíveis;
3. versionar mudanças semânticas;
4. migrations forward-only e idempotência/segurança conforme padrão do repositório;
5. não reescrever silenciosamente Posições históricas;
6. não materializar equivalências globais sem governança;
7. registrar source snapshot/version nos vínculos;
8. preservar tenant ownership onde aplicável.
Qualquer migração que toque RLS, PII, contratos ou matching é trabalho sensível e exige testes negativos.
A implementação pode ser feita em etapas internas dentro deste único movimento:
- mapear capacidades atuais;
- identificar o que já existe de Professional Concept;
- mapear campos reais de CBO/ESCO/O*NET;
- confirmar fluxo atual de resolução de Posição;
- identificar lacunas reais.
- estender o conceito Prisma necessário;
- preservar source links/versionamento;
- garantir alias/proveniência;
- suportar status resolvido/ambíguo/insuficiente.
- integrar criação/edição;
- auto-associação explicável quando segura;
- intervenção humana quando ambígua;
- correção auditável.
- ler relações das fontes;
- consolidar sem perder origem;
- projetar agrupadores;
- disponibilizar seleção para requisitos.
- reutilizar overlay;
- associar item complementar;
- preservar origem;
- impedir publicação global automática.
- bloco de referência ocupacional;
- agrupamentos;
- drawer “por que”;
- correção;
- responsividade/acessibilidade.
- testes;
- segurança;
- matching;
- documentação;
- Context Pack;
- versão;
- AoT.
Essa sequência é orientação de execução, não autorização para reinterpretar os requisitos.
Existe evidência em código/documentação de que a solução estendeu Knowledge/Professional Concept vigente, sem uma segunda arquitetura paralela.
Relaciona-se a D-01.
Criar/editar uma Posição com um título válido mantém exatamente o nome informado para exibição de negócio, mesmo após normalização.
Relaciona-se a D-04.
Com fixture/registro derivado dos snapshots publicados, uma Posição não ambígua consegue associar um conceito Prisma e as referências oficiais realmente existentes.
Não exigir referência nas três fontes se os dados não sustentarem.
Relaciona-se a D-05, D-09 e D-31.
Uma associação automática segura:
- aparece na tela;
- informa que foi normalizada;
- possui “por quê”;
- possui ação de correção;
- registra método/versão.
Relaciona-se a D-06, D-16, D-19 e D-20.
Teste controlado com termo ambíguo deve terminar em estado que exige decisão humana e não persistir escolha arbitrária como definitiva.
Relaciona-se a D-07.
Termo sem correspondência suficiente permanece preservado e entra no fluxo de resolução/manual/Inbox aplicável, sem ocupação fabricada.
Relaciona-se a D-08.
Para item consolidado, a interface/detalhe e a persistência permitem identificar cada fonte real que o sustenta e sua versão.
Relaciona-se a D-09, D-10 e D-21.
A normalização pode trazer conhecimentos/habilidades, mas nenhum deles é persistido como required/desired sem ação explícita do usuário.
Relaciona-se a D-11 e D-12.
Ao selecionar item sugerido, ele entra no mesmo modelo/versionamento de requisitos já utilizado pela Posição.
Relaciona-se a D-12 e D-15.
Nenhum novo score, nível, senioridade ou proficiência é derivado automaticamente.
Relaciona-se a D-13 e P-11.
Criar/reutilizar um item organization-owned:
- aparece como origem da empresa;
- funciona apenas no tenant autorizado;
- não altera snapshot oficial;
- não altera Knowledge Global automaticamente.
Relaciona-se a D-14, D-17 e D-28.
Corrigir a associação de uma Posição registra a mudança de modo rastreável e altera a projeção atual sem apagar o histórico necessário.
Relaciona-se a D-16 e D-30.
Teste/prova demonstra que feedback/correção organization-owned não publica mudança Global automaticamente.
Relaciona-se a D-17.
A ação “Por que o Prisma associou assim?” mostra o conjunto aplicável definido em D-20, sem expor raciocínio privado.
Fluxos principais funcionam em desktop e mobile, com teclado/foco e padrões da UX compartilhada.
Relaciona-se a D-22.
Nenhum dado ou relação criada por M7.1 é gravado como competência/evidência de Pessoa.
Relaciona-se a D-23 e P-13.
Suites relevantes confirmam os contratos vigentes de matching/score e leitura de snapshots históricos.
Relaciona-se a D-25.
Testes negativos cobrem acesso cross-tenant e mutações indevidas de Knowledge.
Relaciona-se a D-28.
Código, configuração e testes comprovam que M7.1 não introduziu Lominger, web research, fonte ocupacional externa, embedding ou novo provider.
Relaciona-se a D-02 e P-01 a P-04.
Prova de arquitetura/execução demonstra que o movimento não pré-populou uma nova ontologia completa. Conceitos/relações Prisma são criados/reutilizados conforme necessidade e governança.
Relaciona-se a D-03 e P-05.
Documentação proprietária, estado factual aplicável e artefatos gerados são atualizados conforme a regra de mudança material.
Executar:
```
pnpm run generate:prisma-context
pnpm run check:prisma-context
```
Cada D-* e P-* aplicável deve aparecer no AoT com:
- implementação;
- teste;
- evidência;
- status.
Nenhum D-* tecnicamente verificável pode ser declarado PASS sem evidência.
Não limitar-se a estes se o impacto real exigir mais.
- resolução de alias conhecido;
- associação com uma única fonte;
- associação com múltiplas fontes;
- ausência em uma das três fontes;
- ambiguidade;
- não encontrado;
- deduplicação;
- preservação de proveniência;
- versionamento de source link;
- Knowledge Organization vs Global.
- criação;
- edição;
- normalização;
- correção;
- nova versão;
- requisitos required/desired;
- remoção/substituição de associação conforme contrato.
- estado carregando;
- resolvido;
- ambíguo;
- insuficiente;
- erro recuperável;
- “por que”;
- corrigir associação;
- adicionar complemento;
- selecionar requisito;
- mobile;
- teclado/foco.
- anon bloqueado;
- usuário sem membership;
- cross-tenant;
- papel sem autoridade;
- tentativa de alteração Global via operação Organization.
- Posições existentes;
- requisitos históricos;
- matching A/B/C;
- Prisma Score;
- M6.2, quando depender do snapshot de Posição;
- Knowledge Inbox;
- Knowledge Global/Organization;
- release registry.
Não utilizar PII real.
Não usar currículo real.
Criar fixtures sintéticas quando necessário.
Pode usar nomes de cargo genéricos como:
- Desenvolvedor de software;
- Analista financeiro;
- Coordenador de logística.
Entretanto, códigos CBO/ESCO/O*NET usados como assertiva em teste devem vir das fontes publicadas atuais ou de fixture explicitamente versionada derivada delas.
Nunca copiar códigos ilustrativos das imagens.
Como a mudança é material, atualizar os owners correspondentes.
No mínimo, avaliar necessidade de atualização em:
- produto/linguagem de Posições;
- arquitetura de Professional Concept;
- arquitetura de Posições;
- contratos;
- Knowledge;
- AI/retrieval, somente se realmente afetado;
- segurança;
- QA;
- current state após prova real;
- versionamento/release.
Não editar manualmente:
- FONTE_GPT_PRISMA.md;
- TUDO_SOBRE_PRISMA.md.
Gerá-los pelos comandos oficiais.
Criar/atualizar Agreement Contract e AoT nos caminhos de QA seguindo os templates vigentes.
O nome do movimento é:
M7.1 — Taxonomia Profissional e Inteligência de Posições
O número do movimento não determina automaticamente a versão pública do produto.
Aplicar docs/architecture/versioning.md e o release registry vigente para decidir a versão.
Não incrementar por commit, correção mecânica ou mera documentação.
Ao finalizar, entregar um resumo objetivo contendo:
1. comportamento implementado;
2. contratos/versões alterados;
3. migrations criadas/aplicadas localmente ou em QA autorizado;
4. principais arquivos modificados;
5. testes executados e resultados;
6. provas negativas de segurança;
7. regressão de matching;
8. documentação atualizada;
9. status de cada requisito no AoT;
10. desvios do contrato, se houver;
11. pendências/bloqueios reais;
12. commit e push conforme autorização vigente.
Não declarar conclusão se houver D-* obrigatório em FAIL, PARTIAL, BLOCKED ou NOT TESTED quando a prova for tecnicamente possível.
Antes da primeira alteração material, responda no terminal/registro de execução com uma síntese curta contendo:
- quais D-* serão implementados;
- quais P-* não podem ocorrer;
- o que está fora de escopo;
- onde existe autonomia de engenharia;
- qualquer conflito factual encontrado no código/documentação.
Essa declaração não pede nova aprovação se não existir Q-* material.
Se não houver conflito, prossiga até a entrega completa do M7.1 dentro das autorizações vigentes.
Ao concluir o M7.1, a Posição deixa de ser apenas um conjunto de textos e requisitos isolados.
Ela passa a possuir uma referência profissional explicável:
```
Posição da empresa
        ↓
Conceito profissional Prisma
        ↓
CBO + ESCO + O*NET
        ↓
conhecimentos/habilidades relacionados
        ↓
seleção humana dos requisitos reais
        +
Knowledge complementar da organização
```
O Prisma passa a ter uma linguagem profissional comum, progressiva e rastreável para Posições.
Essa linguagem será a base consumida posteriormente pelo M7.2 para representar aquilo que está evidenciado na Pessoa.
O M7.1 não compara Pessoa e Posição. Essa junção continua pertencendo ao matching.
