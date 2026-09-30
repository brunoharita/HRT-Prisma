# Contrato de matching

## Escopo

Uma avaliação compara uma pessoa com uma vaga específica. Ela não altera o perfil permanente e não decide contratação ou rejeição.

## Interpretação universal M8.6

Toda Posição com título pode usar a mesma leitura profissional, independentemente da profissão. O servidor preserva a ordem `Knowledge Global/Empresa e decisões humanas autorizadas -> IA somente como último recurso -> revisão humana`; uma resposta interna segura não é substituída por pesquisa. Título incompatível não é veto lexical. Perfis publicados sem conteúdo profissional utilizável não entram no fluxo e não consomem IA, sem que isso seja tratado como incapacidade.

`semantic-triage-2.0.0` altera somente a ativação da IA, não o contrato de uma resposta válida: a descoberta interna examina todos os Perfis utilizáveis e todas as experiências; a IA é reservada a relações ocupacionais plausíveis ainda indefinidas, independentemente do grupo preliminar. Mesma/equivalente/relacionada referência aprovada e decisão humana confirmada são respostas internas suficientes para esta triagem. Possível relação entre títulos profissionais ou experiência direta na área nomeada da Posição sem resolução ocupacional permanece pendente para interpretação. Área declarada, setor, ferramenta e requisito isolados não acionam IA. O servidor recompõe essa decisão em fontes autorizadas antes de cache/provedor/snapshot; a falha conserva o match pré-IA. Esta política substitui a cobertura automática anterior do D-03 M8.6, não a descoberta ampla. Positivos fora desse detector conservador exigem medição de falsos negativos e curadoria, não conclusão de irrelevância.

As relações semânticas são `direct`, `equivalent`, `related`, `entry_potential`, `context`, `other` e `unclear`, projetadas respectivamente nos Grupos A, B ou C sem confundir ausência de prova com prova negativa. Híbridos exigem evidência dos dois componentes centrais para relação integral; uma só parte permanece parcial/relacionada. Senioridade só é comparada quando os níveis estão explicitamente marcados, com penalização simétrica por subqualificação e sobrequalificação. A Posição versiona `experiencePolicy` como `not_required`, `required` ou `unspecified`; somente a primeira remove duração/recência do denominador.

Uma decisão humana confirmada pode gerar uma proposta tenant-scoped na Inbox existente da Knowledge com termo original, relação, evidência e versões. A proposta não publica alias ou relação global automaticamente.

Quando uma tentativa de interpretação por IA não produz leitura válida, a busca conserva integralmente o matching determinístico calculado antes da tentativa. Busca e comparação identificam os Perfis afetados e explicam a causa pública efetivamente conhecida, o efeito nos resultados e a ação disponível, sem chamar toda indeterminação de discordância nem atribuir falha interna ao provedor. Causa desconhecida é declarada desconhecida. Grupo, score, relações e evidências anteriores permanecem; a falha não constitui classificação semântica ou fato negativo sobre a Pessoa. O ajuste original de fallback não alterou o contrato persistido nem a rubrica de uma resposta válida; a política de acionamento posterior é a triagem seletiva descrita acima. Acordos específicos: `docs/qa/agreement-matching-ai-failure-fallback.md` v1.0.0 e `docs/qa/agreement-matching-causal-notices.md` v1.0.0.

## Saída por requisito

| Estado | Regra |
| --- | --- |
| `met` | O termo genérico aparece de forma explícita, delimitada e não negada em conteúdo profissional, ou há equivalência canônica publicada |
| `partially_met` | Há correspondência textual parcial ou o termo aparece sem comprovar o nível exigido; exige revisão humana |
| `related_signal` | Há uma relação específica e rastreável que orienta a análise, mas não comprova o requisito |
| `no_evidence` | Nenhuma evidência foi identificada; não significa ausência |

O resultado agrega requisitos atendidos, parcialmente atendidos, sinais relacionados, sem evidência, gaps obrigatórios, evidências e incertezas. A categoria organiza a Vaga e preserva a proveniência, mas não limita a recuperação: o termo do requisito é procurado em todo o conteúdo profissional publicado. A descrição da Vaga continua fora da evidência da Pessoa.

Termos explícitos usam limite lexical: `SAP` conecta `migração para SAP` e `SAP EWM`, mas não `sapatos`. Frases negadas como `sem experiência com SAP` ou `nunca utilizei SAP` não são evidência positiva. Se a Vaga exigir nível, duração ou senioridade, a presença do termo isolado prova a conexão, não o grau; o atendimento integral exige que esse qualificador também esteja explícito ou seja sustentado por Evidência Demonstrada válida.

## Descoberta orientada pela trajetória

A descoberta separa três leituras: trajetória profissional, proximidade do cargo e aderência detalhada por requisito. A área continua observável quando o valor informado na Posição aparece em `areasOfExpertise` ou em cargo, descrição ou evidência de uma experiência do Perfil publicado, mas a descrição isolada não basta para tornar a trajetória diretamente compatível. O resumo livre não cria relação de área.

A proximidade do cargo usa, nesta ordem, a mesma referência oficial, referência equivalente publicada, relação ocupacional publicada e possível relação textual entre o título da Posição, o título profissional e cargos das experiências. A relação textual exige igualdade, inclusão ou dois ou mais termos ocupacionais comuns. Um termo de área isolado, como `marketing`, não transforma `Analista de Marketing` e `Assistente de Marketing` em cargos equivalentes. O operador pode confirmar ou descartar a relação; essa decisão fica auditada, funciona como desempate depois do score e nunca muda o Perfil, a Posição ou a Knowledge.

Todos os Perfis publicados acessíveis e com conteúdo profissional utilizável são analisados, inclusive quando não há requisito detalhado ou quando requisitos ainda aguardam classificação. `vacancy-matching-explainable-5.1.0` classifica a descoberta antes do score:

- Grupo A: experiência direta na área ou função equivalente, sustentada por cargo/ocupação e histórico profissional;
- Grupo B: trajetória adjacente ou transferível; em Posição explicitamente de entrada, formação, projetos ou conhecimentos podem sustentar potencial de entrada;
- Grupo C: somente termos, ferramentas ou outros sinais contextuais, sem trajetória relacionada suficiente.

Somente A e B recebem Prisma Score comparável. C permanece visível e recolhido por padrão para não apagar conexões úteis, mas não concorre no ranking principal. Zero sinal não é convertido em ausência profissional e não gera resultado. A classificação não decide contratação e a confirmação humana permanece auditada.

Na versão 5.1.0, uma ocupação observada pode sustentar área relacionada quando vinculada a referência/alias publicado da Knowledge. Essa ponte rende 8 pontos de área e relação funcional relacionada, não equivalência nem especialização da Posição. O vínculo textual aproximado continua apenas possível; mesma referência ou equivalência publicada só define função direta quando a referência canônica corresponde ao título específico da Posição. Área ampla, por si só, fica contextual quando não descreve o núcleo do título; Posições sem título usam a área como núcleo disponível. A experiência que sustentou a relação ocupacional prevalece sobre atuação apenas na área ampla ao selecionar períodos. Falha de IA exibe explicitamente o cálculo pré-IA e sua versão, sem chamá-lo de última leitura semântica.

## Score Prisma de matching

`matching-score-1.4.0` é uma projeção determinística do matching resolvido, disponível somente para os Grupos A e B. Os pesos são área 10, função 25, obrigatórios 35, desejáveis 10, duração da experiência relacionada 10 e recência da experiência relacionada 10. As dimensões são independentes: não há multiplicador, bônus cruzado, veto, prioridade automática ou desempate novo. Dimensão não definida pela Posição fica fora do denominador; os requisitos de cada categoria dividem seu peso igualmente e creditam 100%, 50%, 25% ou 0% para `met`, `partially_met`, `related_signal` ou `no_evidence`. No Grupo C, a conexão por requisito continua rastreável, mas o número agregado retorna indisponível por falta de elegibilidade competitiva da trajetória.

Desde `vacancy-definition-1.2.0`, `unclassified` existe somente durante a preparação de um rascunho assistido. Um requisito incluído manualmente nasce de forma coerente como `required`; qualquer rascunho com requisito ainda não classificado deve exigir a decisão entre obrigatório e desejável antes de salvar. A RPC rejeita novas versões com `unclassified`. Versões históricas permanecem legíveis, e o matching continua explicando suas pendências sem inventar importância.

Área por experiência explícita vale 10; declaração ou relação ocupacional de área sem experiência diretamente vinculada suficiente vale 8. Função vale 25/21,25/15/10/0 para mesma função, equivalente, relacionada, contexto profissional corroborado ou nenhuma relação, com ajuste explícito de senioridade escalado na mesma proporção. Senioridade desconhecida nunca é inventada.

As dimensões temporais usam somente experiências já reconhecidas como relacionadas pela avaliação determinística ou, no fluxo semântico, como `backend_execution` ou `software_execution`. Liderança, análise de sistemas, familiaridade com ferramenta, título isolado e contexto comercial não provam execução de programação. Duração soma meses ocupados depois de unir sobreposições, sem dupla contagem: 0 ponto para menos de 12 meses, 3 para 12–<24, 5 para 24–<36, 7 para 36–<60 e 10 para 60 ou mais. Recência vale 10 para atuação atual ou encerrada há menos de 6 meses, 7 para 6–<12, 5 para 12–<18, 3 para 18–<24 e 0 para 24 meses ou mais.

A data de referência é civil, explícita no cálculo e persistida no fingerprint. Datas parciais, inválidas, contraditórias, invertidas ou com faixa temporal indeterminável deixam a dimensão como `Não determinado`; não viram zero factual. O score fica indisponível quando uma dimensão temporal aplicável não pode ser determinada. O detalhe exibe pontos, máximos, estado, explicação, evidência relacionada e data de referência.

O leitor compartilhado `resume-dates-1.1.0` aceita anos com dois ou quatro dígitos: `00–50 → 2000–2050`, `51–99 → 1951–1999`, conforme aprovação de 2026-09-27. Regra fixa, a revisar em 2050, sem deslocamento automático pelo relógio. A inferência do século não reduz a precisão mensal documentada; somente o ano abreviado é expandido. Períodos apenas anuais continuam sujeitos à estabilidade da faixa. As evidências mostram o texto original, a interpretação e a versão do leitor, que também entra no fingerprint. Web e snapshot Edge reutilizam o mesmo domínio gerado. Exemplo: `Jun/08 - Nov/12` equivale a junho/2008 até novembro/2012, 54 meses inclusivos, duração 7/10 e recência 0/10 em 2026-09-27. Snapshots antigos e perfis publicados não são reescritos.

Cobertura usa o mesmo denominador, mas conta pontos avaliados com evidência suficiente independentemente do valor obtido. Falta de evidência não cobre e credita zero; relação avaliada como inexistente cobre e credita zero. Consequentemente, `score <= cobertura`. Cobertura abaixo de 60%, requisito `unclassified` ou dependência material torna o score provisório. O valor continua ordenando dentro do respectivo grupo, com o estado provisório sempre visível; score indisponível fica depois dos valores numéricos.

O cálculo é puro, local, sem IA ou I/O. Condições operacionais e atributos pessoais/sensíveis não entram no input. Evidência Demonstrada vigente e de versão reconhecida pode fortalecer somente o requisito de vínculo exato, sem bônus. Breakdown, versões, data de referência e fingerprint permitem reprodução.

## Suficiência

`sufficient_evidence` significa que nenhum requisito obrigatório ficou sem evidência, embora requisitos parciais ainda exijam validação humana. `insufficient_evidence` significa que ao menos um requisito obrigatório recebeu `no_evidence`. O sistema deve poder retornar explicitamente que nenhum candidato possui evidência suficiente; não preencher artificialmente a lista.

## Metodologia de confiança

A confiança não vem de uma opinião do modelo. `explainConfidence` calcula critérios observáveis:

1. origens independentes de evidência, identificadas pelo campo e registro observável;
2. evidências ligadas a título ou experiência profissional;
3. necessidade de revisão de contradições.

Regras iniciais:

- `corroborated`: duas ou mais evidências independentes, ao menos uma em título ou experiência profissional;
- `supported`: ao menos uma evidência profissional contextual ou duas independentes;
- `limited`: evidência única e genérica ou ausência de evidência.

Cada resultado inclui contagens, motivos e proveniência expansível. Contradições não são concluídas automaticamente. Esses termos não equivalem a alta, média ou baixa aderência e não representam probabilidade ou score.

## Gaps

Gap é criado somente quando um requisito marcado como obrigatório recebe `no_evidence`. A mensagem usa "sem evidência identificada". Requisitos desejáveis sem evidência permanecem visíveis, mas não viram gap obrigatório.

## Competências transferíveis

Competências transferíveis são declaradas na vaga. O mecanismo não inventa adjacências durante a avaliação. Elas geram `partially_met` e exigem validação humana.

## Versionamento

Toda avaliação persiste `matchingVersion`. Uma futura avaliação com LLM também deverá persistir `promptVersion` e `modelVersion`.

A separação entre área profissional e proximidade do cargo nasceu em `vacancy-matching-explainable-2.3.0`, registrada no ADR-051. O M6.1 avançou o contrato para 3.0.0 e adicionou `matching-score-1.0.0`, conforme ADR-052. A decisão de 2026-09-14 avançou o matching para `vacancy-matching-explainable-4.0.0`: categorias deixaram de ser barreiras e permaneceram como organização/proveniência, conforme ADR-053. A decisão posterior do mesmo dia avançou o score para `matching-score-1.1.0`, conforme ADR-055. O ADR-057 avança para `vacancy-matching-explainable-5.0.0` e `matching-score-1.2.0`: trajetória define A/B/C e sinais sem trajetória deixam de produzir score comparável. O M8.4, em `matching-score-1.4.0` e ADR-074, adiciona duração e recência como dimensões independentes, com referência civil explícita, sem reescrever snapshots históricos.

O M6.2 não altera fórmula ou pesos. Uma ação humana pode usar o `match_evaluations.id` e o requisito da mesma versão da Posição para criar uma necessidade contextual. A fronteira aceita snapshots determinísticos 4.0.0, 5.0.0 e 5.1.0, além dos semânticos 6.0.0 e 7.0.0; rejeita versão desconhecida. O snapshot preserva o item avaliado, suas evidências, a versão do matching, a versão do score e o fingerprint. Evidência Demonstrada posterior continua afetando somente a competência/requisito exatos, sem bônus genérico.

## Normalização conceitual M5.2

Busca e matching podem consumir `concept_id` apenas de observações `resolved` ligadas ao Perfil vigente. O texto original e sua evidência continuam sendo o fato; o conceito é uma resolução versionada. `ambiguous` e `unresolved` não satisfazem equivalência canônica, mas o termo original explícito continua elegível como evidência textual. Correspondência parcial permanece `partially_met`; relações `is_a/related_to` permanecem `related_signal`. A ausência de resolução não é ausência da competência e não bloqueia o Perfil.
