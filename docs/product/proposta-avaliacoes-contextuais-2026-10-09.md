# Proposta — Avaliações contextuais a partir do acompanhamento

Data: 09/10/2026. Estado: decisões expressas registradas e proposta visual para discussão; não é execução, publicação ou liberação para candidatos reais. Referência visual: Perfil recente do Prisma e sidebar vigente. Telas propostas, dados ilustrativos de Ana Martins/Desenvolvedor backend. A geração das imagens usa image_gen integrado. Prompts integrais e imagens ficam na pasta de mesmo nome, junto deste documento.

## Imagens salvas

- [Configuração e questões](proposta-avaliacoes-contextuais-2026-10-09/01-configuracao-e-questoes.png): configuração do teste e composição banco/IA/misto.
- [Revisão e convite](proposta-avaliacoes-contextuais-2026-10-09/02-revisao-e-convite.png): aprovação humana e convite por e-mail.
- [Realização e resultados](proposta-avaliacoes-contextuais-2026-10-09/03-realizacao-e-resultados.png): portal do candidato e consulta por questão.

Cada imagem reúne dois estados da jornada, com dados fictícios. Os prompts iniciais e os refinamentos estão em `prompts.json` e `refinamentos.json` na mesma pasta das imagens. Não constituem evidência de funcionalidade implementada.

## Definições expressas de Bruno

- D-01: avaliação opcional, iniciada por humano para candidato e Posição, com requisitos selecionados, preservando o contexto e as versões.
- D-02: três modos de composição: questões do banco, novas questões por IA, ou misto. No misto o usuário seleciona no banco e pede IA para completar as lacunas; no modo banco insuficiente, oferecer mudança explícita para misto, nunca chamar IA sem solicitação.
- D-03: toda questão é múltipla escolha, exatamente cinco alternativas e exatamente uma correta. Questões incompatíveis não entram na avaliação. Gabarito nunca é exposto ao candidato durante a tentativa.
- D-04: dificuldade do teste escolhida pelo usuário de 1 a 5; categorias das questões são fácil/média/difícil, independentes do nível de competência e do Score Prisma.

| Nível do teste | Nome proposto | Fáceis | Médias | Difíceis |
| --- | --- | --- | --- | --- |
| 1 | Muito fácil | 60% | 30% | 10% |
| 2 | Fácil | 40% | 40% | 20% |
| 3 | Moderado | 30% | 40% | 30% |
| 4 | Difícil | 20% | 40% | 40% |
| 5 | Muito difícil | 10% | 30% | 60% |

- D-05: distribuições parametrizadas e versionadas no sistema, sem tela de edição agora. Instrumento/tentativa preservam o snapshot dos parâmetros usados; alterações futuras não reescrevem avaliações anteriores.
- D-06: convite por e-mail. Preencher endereço cadastrado por padrão; permitir endereço específico para o convite sem atualizar cadastro. Gravar destinatário efetivamente utilizado e autor da alteração no escopo autorizado do convite. Envio somente após ação humana explícita.
- D-07: registrar por questão saídas de foco, tempo de mouse parado antes de responder, ajustes observáveis de zoom e sinais de captura disponibilizados pelo navegador; consulta posterior pelo usuário Prisma autorizado. Não atribuir evento a outra questão, nem distribuir apenas totais globais.

## Proposta prática de telas e sequência (pontos 3 a 10)

1. Configuração: abrir Criar avaliação no detalhe do acompanhamento; mostrar candidato/Posição e versão, selecionar requisitos, quantidade, duração e dificuldade. Exemplo ilustrativo: 20 questões, 40 minutos, nível3, 6 fáceis/8 médias/6 difíceis. Ler não cria avaliação; salvar rascunho ou avançar explicitamente cria contexto tenant-scoped e registra escolhas.
2. Questões: selecionar Banco/IA/Misto. Banco lista perguntas elegíveis com busca e filtros. Misto mostra seleção e déficit por assunto e dificuldade: 12 do banco (4/5/3) +8 novas (2/3/3) completam6/8/6. Nada é completado silenciosamente. Carregar banco não consome LLM; geração explícita registra pedido, quantidade, custo/consumo, versões do método e propostas. Não enviar currículo integral ou respostas privadas para gerar perguntas gerais.
3. Revisão: humano confere questão, cinco opções, uma correta, explicação, assunto, dificuldade e origem. Editar/substituir e aprovar antes de disponibilizar. Itens novos aprovados podem ser salvos no banco privado para reutilização; itens globais exigem autoridade própria. Sugestão visual: seleção explícita para salvar no banco da empresa; não presumir promoção global.
4. Revisão final: conferir todos os itens, cobertura, distribuição, duração e regras. Não avançar com gabarito inválido, item pendente ou distribuição incompatível. Gravar composição, versões e autoria; instância imutável por tentativa preserva enunciados/opções/gabarito da aplicação.
5. Convite: preencher e-mail cadastrado, permitir alteração local, revisar mensagem/prazo e clicar Enviar convite por e-mail. Preparar convite seguro, enfileirar envio com proteção contra duplicidade e registrar estados separados de solicitado/na fila/enviado/falhou; entrega/abertura somente com evidência disponível. Exemplo de7dias é ilustrativo. Transporte/provedor existente deve ser descoberto antes de escolher integração nova; nenhum e-mail enviado nesta proposta.
6. Candidato: link pessoal com validade, sem conta de usuário Prisma; instruções e ciência da coleta antes de iniciar. Uma questão por vez, cinco alternativas sem gabarito, autosave e sinal de sincronização; revisão/navegação conforme regra. Permanecer na janela é instrução; navegador não garante impedir troca de janela nem observar outro aparelho.
7. Envio: candidato confirma submissão; backend transacional corrige objetivas sem LLM, preserva respostas/tentativa e gera resultado e evidência demonstrada por requisito. Falha/duplicidade não perdem respostas nem produzem resultado parcial como completo. Resposta correta e explicação só aparecem a quem tiver permissão e conforme política de divulgação.
8. Resultado do recrutador: resumo, perguntas/respostas, gabaritos e Atividade por questão. Tabela mostra contagem/duração fora de foco, mouse parado, sinais de zoom e atalhos de captura; detalhe traz timeline da questão e qualidade/limites da observação. Humano escolhe o próximo passo no acompanhamento. Não alterar etapa automaticamente nem converter acertos em bônus genérico no Score.

## Persistência e reutilização propostas

- Banco: pergunta, cinco alternativas, identificador da correta, justificativa, requisito/competência/dimensão, dificuldade, idioma, autoria/origem, versão, status de revisão, família/fingerprint para duplicatas, escopo empresa/global. IA: pedido/proposta/revisão, modelo/método/prompt/schema, consumo e custo quando disponível. Reuso somente de versões aprovadas e elegíveis, sem duplicar a pergunta por cada vaga.
- Instrumento: candidato/Posição/requisitos e versões, configuração, distribuição1–5 e parâmetros versionados, composição e versões dos itens/rubrica, revisores e histórico. Adequação ao requisito exato, sem identidade apenas por palavra/assunto.
- Aplicação: convite/destinatário efetivo/prazo/estado de envio, token protegido, tentativa, respostas versionadas, submissão/correção, evidência demonstrada e eventos por questão. Respostas individuais são privadas e separadas do gabarito reutilizável.
- Métricas de uso podem subsidiar revisão de qualidade; calibração real depende de política e dados adequados. Eventos de comportamento não alteram gabarito, resultado bruto, contratação ou Score automaticamente.

## Telemetria: requisito desejado e capacidade técnica

Todo evento precisa de organização, aplicação/tentativa, instância e versão da questão, tipo, sequência/idempotência, instante do cliente e recebimento no servidor, valores mínimos pertinentes, origem/método e versão, suporte/limitação. Consultas autorizadas por organização; sem histórico geral de teclas, coordenadas completas de mouse, clipboard ou imagens da tela. Buffer com reenvio/deduplicação e períodos sem coleta/sincronização explicitamente marcados; ausência de evento não vira zero confirmado.

| Informação | Registro proposto | Limite obrigatório |
| --- | --- | --- |
| Saídas de foco | episódios de janela inativa/aba oculta, início/fim/duração, questão ativa; deduplicar blur+visibilitychange para não contar duas vezes | não identifica qual app/site foi aberto nem comprova pesquisa; foco de campo não é saída da janela |
| Mouse parado | total e maior intervalo sem movimento, antes da primeira alternativa marcada, somente enquanto questão/janela ativas; reaberturas e mudanças de resposta separadas | janela fora de foco separada; leitura, teclado e tecnologias assistivas podem produzir imobilidade legítima; sem mouse/touch exclusivo é não aplicável |
| Zoom | mudança observável, estado anterior/posterior, questão ativa, método e suporte | zoom de página, pinch e mudança de monitor/escala exigem diferenciação; não somar resize genérico como zoom nem punir acessibilidade |
| Captura | eventos de atalhos reconhecidos efetivamente entregues pelo navegador, identificados como sinais e não capturas confirmadas | navegador não observa universalmente Ferramenta de Captura, software do SO, gravação externa ou câmera; não afirmar total de prints nem captura bem-sucedida |

Fontes técnicas: [Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API), [devicePixelRatio](https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio), [VisualViewport](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport), [UI Events](https://www.w3.org/TR/uievents/), [KeyboardEvent code values](https://www.w3.org/TR/uievents-code/). Inferência de engenharia: essas APIs dão sinais da página, não uma auditoria de todas as operações de captura do sistema operacional.

## Pendências antes de contrato congelado e implementação

- Q-01: captura universal solicitada não é tecnicamente garantível na aplicação web comum. A proposta oferece sinais parciais com indicação de suporte. Qualquer agente nativo/extensão/proctoring seria decisão nova, fora desta proposta.
- Q-02: quando a quantidade de questões não permitir percentuais exatos, a proposta é apresentar ajuste explícito de quantidade para múltiplo de10, sem arredondar silenciosamente. Os mockups usam20 e não decidem arredondamento. Regra final depende de decisão do produto.
- Q-03: definição precisa de mouse parado proposta acima (total/maior intervalo, até primeira resposta e apenas foco ativo) precisa de aceite; não presumir que “parado” equivale a pesquisa.
- Q-04: provedor e identidade remetente, retenção/base de tratamento, política de resultado ao candidato, limites/custo/modelo da IA, cancelamento/retomada/reaplicação e integração ao Score vigente precisam ser confirmados antes de uso real. Catálogo atual é interno/sintético; geração real por IA desativada. Não escolher novos fornecedores nem liberar candidatos reais neste registro.

P-01: não usar telemetria como prova automática de fraude, incapacidade ou motivo automático de rejeição; não inventar ausência de evento/percentual/progresso nem apagar divergências.
F-01: implementação, produção, envio efetivo de e-mails, chamadas de geração de avaliações do produto, edição de cadastro de Pessoas e tela de administração das distribuições. Os mockups solicitados usam a ferramenta de imagens, separada da IA futura do produto.

## Fidelidade visual proposta

Referências do Perfil/sidebar são normativas para linguagem visual, não conteúdo pessoal. Fluxo proposto usa cabeçalho com contexto, etapas Configuração/Questões/Revisão/Convite, formulário principal2/3 e sidebar contextual1/3; card branco, borda fina, destaques azul-claro, ícones centrados. Portal do candidato remove navegação administrativa; resultado volta ao shell e oferece tabela/timeline por questão. Propostas ainda aguardam validação visual do Product Owner. Não há prompt final de implementação enquanto Qs materiais estiverem abertas.
