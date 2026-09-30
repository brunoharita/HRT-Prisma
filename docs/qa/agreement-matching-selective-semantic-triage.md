# Acordo — triagem ocupacional seletiva antes da IA

Versão: 1.0.0. Estado: `agreed` pela decisão de Bruno nesta conversa, após a explicação do fluxo com os sete Perfis e a escala de 100. Este acordo substitui **somente** a cobertura automática de IA para todo Perfil utilizável em D-03/CA-03 de `agreement-m86-universal-professional-matching.md`; preserva a descoberta interna ampla e os demais D/P/CA daquele acordo. Substitui o gate estrito A/B de `agreement-m83-triage-before-ai.md` pela pendência ocupacional plausível independente do grupo preliminar. Mantém integralmente os acordos de preservação após falha e de consistência do reconhecimento.

## DEVE

- **D-01 — Busca interna ampla.** Examinar todas as experiências e demais evidências profissionais publicadas dos Perfis autorizados da empresa para a versão da Posição. Perfil sem conteúdo profissional utilizável fica fora da Posição e não consome IA, sem conclusão de incapacidade.
- **D-02 — Knowledge primeiro.** Reutilizar referência, alias, relações e decisões humanas aprovadas, com origem/versão/tenant. Relação ocupacional suficiente é resolvida internamente sem IA; requisitos, área ampla e ferramentas isoladas não viram equivalência ocupacional.
- **D-03 — Fila seletiva.** Somente uma relação **profissional plausível e ainda indefinida** pode acionar IA. A elegibilidade considera evidência atribuível de qualquer experiência, não só cargo atual, grupo preliminar, score ou nome. C somente contextual e relação internamente resolvida não acionam IA. Sinal profissional plausível não resolvido permanece identificado como pendente, mesmo se a classificação preliminar fosse C.
- **D-04 — Autoridade no servidor.** A Edge recompõe a triagem a partir das fontes autorizadas e versões consistentes antes de ler cache ou acionar provedor. O cliente não escolhe grupo, elegibilidade, texto, versão ou Pessoa arbitrária.
- **D-05 — Resultado progressivo.** A busca mostra a classificação interna e suas evidências assim que prontas; as interpretações atualizam apenas os respectivos Perfis, sem esperar pelo mais lento. Progresso, pendência e falha são explícitos; navegação, comparação e ações humanas continuam disponíveis.
- **D-06 — Preservação.** Falha, divergência, timeout, resposta inválida ou abortamento não apagam grupo, score, relações, requisitos, evidências ou decisão humana calculados antes da IA. Resposta válida mantém a interpretação versionada existente.
- **D-07 — Escala verificável.** Uma amostra sintética de pelo menos 100 Perfis demonstra que todos passam pela etapa interna, apenas pendências plausíveis chegam à IA, a primeira lista aparece antes de sua conclusão, e a quantidade de chamadas é contada sem alegar prazo/qualidade universal não medidos.

## PROIBIDO

- **P-01.** Veto lexical, top-K, corte de score ou uma única família fixa como critério de exclusão de Pessoa; ausência de correspondência não é incapacidade.
- **P-02.** Enviar à IA Perfis somente contextuais ou resolvidos internamente, inclusive por chamada direta, cache ou snapshot na Edge; aceitar grupo enviado pelo browser como autoridade.
- **P-03.** Converter falha em zero/C, inventar equivalência, especialização, senioridade, requisito ou decisão humana; alterar pesos ou critérios do Prisma Score.
- **P-04.** Misturar tenants/versões, enviar currículo integral, expor PII/segredos em telemetria, publicar regra global ou reescrever snapshots históricos.

## FORA DE ESCOPO

- **F-01.** Exigir classificação manual na publicação do Perfil, criar múltiplos Perfis cadastrais, nova taxonomia/base, embeddings ou reprocessamento retroativo.
- **F-02.** Alterar o prompt/modelo/número de leituras, requisitos da Posição, pesos, curadoria, decisão automática de contratação ou dados reais de Pessoas.

## AUTONOMIA

- **A-01.** Engenharia define o detector conservador de pendência ocupacional, o estado transitório de UI, controle de concorrência e versão de ativação, reutilizando domínio, Knowledge, RPC autenticada e runtime gerado.
- **A-02.** Engenharia escolhe fixtures sintéticas e regressão proporcional, mas não pode apresentar o corpus limitado como prova de cobertura universal.

## CRITÉRIOS DE ACEITE

- **CA-01 / D-01–D-03.** Desenvolvedor/programador e trajetórias mistas entram na triagem por experiência histórica; venda de tecnologia, marketing, ferramenta isolada, área ampla isolada e domínio distinto não acionam IA. Relação Knowledge suficiente também não chama provedor.
- **CA-02 / D-03–D-04.** Uma pendência ocupacional plausível não fica escondida como C definitivo; Edge rejeita no servidor C/contextual/resolvido antes de service/cache/provedor e ignora tentativa de forjar grupo, tenant ou versão.
- **CA-03 / D-05–D-06.** Primeira lista e resumo chegam antes da conclusão semântica; cada resultado atualiza isoladamente; falha preserva integralmente o match inicial e aviso visível. Comparação e decisões humanas permanecem funcionais.
- **CA-04 / D-07.** Corpus sintético de 100 Perfis mede universos, elegíveis, chamadas, progresso e tempo local até a lista inicial, com positivos críticos e negativos não mascarados por média; execução sem LLM ou banco real.
- **CA-05.** Testes dirigidos web/Edge, runtime gerado, tipos/build, segurança/versões/snapshots, Context Pack, AoT, release plan e smoke proporcional. QA antes de produção; produção não é ambiente de teste.

## Mapa de impacto inicial

Baseline: `main` em `77068e969cf73bb01ee45f3c91e69b318b920b67`; quatro itens não rastreados preexistentes preservados. A busca atual só entrega a lista após toda a IA; Edge admite qualquer Perfil com conteúdo profissional utilizável. Nenhum SLA medido para 100 Perfis.

| Área | Relação | Capacidade a preservar / regressão |
| --- | --- | --- |
| Descoberta e triagem compartilhada | direct | Todos os Perfis utilizáveis examinados; Knowledge-first; positivos/negativos ocupacionais |
| Busca, progresso e comparação | direct | Baseline inicial, atualização isolada, aviso de falha, seleção/decisões |
| Edge, auth, cache e snapshot | critical_transversal | Recomputar elegibilidade com fontes autorizadas; tenant, versões, nenhuma chamada para fora da fila |
| Score, requisitos e grupos | plausible_indirect | Mesmos pesos, evidências e resultado em falha; nenhuma promoção por ferramenta/área genérica |
| Parser, publicação de Perfil e Knowledge | no_impact_identified | Nenhuma escrita ou alteração de fonte; diff sem reprocessamento |
| Release | direct | Somente superfícies do diff, QA/smoke, SHA único e rollback |
