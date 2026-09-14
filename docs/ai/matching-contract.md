# Contrato de matching

## Escopo

Uma avaliação compara uma pessoa com uma vaga específica. Ela não altera o perfil permanente e não decide contratação ou rejeição.

## Saída por requisito

| Estado | Regra |
| --- | --- |
| `met` | O termo genérico aparece de forma explícita, delimitada e não negada em conteúdo profissional, ou há equivalência canônica publicada |
| `partially_met` | Há correspondência textual parcial ou o termo aparece sem comprovar o nível exigido; exige revisão humana |
| `related_signal` | Há uma relação específica e rastreável que orienta a análise, mas não comprova o requisito |
| `no_evidence` | Nenhuma evidência foi identificada; não significa ausência |

O resultado agrega requisitos atendidos, parcialmente atendidos, sinais relacionados, sem evidência, gaps obrigatórios, evidências e incertezas. A categoria organiza a Vaga e preserva a proveniência, mas não limita a recuperação: o termo do requisito é procurado em todo o conteúdo profissional publicado. A descrição da Vaga continua fora da evidência da Pessoa.

Termos explícitos usam limite lexical: `SAP` conecta `migração para SAP` e `SAP EWM`, mas não `sapatos`. Frases negadas como `sem experiência com SAP` ou `nunca utilizei SAP` não são evidência positiva. Se a Vaga exigir nível, duração ou senioridade, a presença do termo isolado prova a conexão, não o grau; o atendimento integral exige que esse qualificador também esteja explícito ou seja sustentado por Evidência Demonstrada válida.

## Descoberta por área, cargo e requisitos

A descoberta separa três leituras: experiência na área profissional, proximidade do cargo e aderência detalhada por requisito. A área é um sinal de entrada quando o valor informado na Posição aparece explicitamente em `areasOfExpertise` ou em cargo, descrição ou evidência de uma experiência do Perfil publicado. O resumo livre não cria relação de área.

A proximidade do cargo usa, nesta ordem, a mesma referência oficial, referência equivalente publicada, relação ocupacional publicada e possível relação textual entre o título da Posição, o título profissional e cargos das experiências. A relação textual exige igualdade, inclusão ou dois ou mais termos ocupacionais comuns. Um termo de área isolado, como `marketing`, não transforma `Analista de Marketing` e `Assistente de Marketing` em cargos equivalentes. O operador pode confirmar ou descartar a relação; essa decisão fica auditada, altera apenas a ordenação e nunca muda o Perfil, a Posição ou a Knowledge.

Todos os Perfis publicados acessíveis são analisados, inclusive quando não há requisito detalhado ou quando requisitos ainda aguardam classificação. O resultado exibe quem possui ao menos experiência explícita na área, relação ocupacional, evidência direta, evidência parcial, sinal relacionado ou confirmação humana anterior. O score é calculado somente depois dessa descoberta e nunca remove um resultado. Zero sinal não é convertido em ausência profissional, mas também não gera resultado.

## Score Prisma de matching

`matching-score-1.0.0` é uma projeção determinística do matching resolvido. Os pesos nominais são área 30, função 20, obrigatórios 35 e desejáveis 15. Dimensão não definida pela Posição fica fora do denominador; os requisitos de cada categoria dividem seu peso igualmente e creditam 100%, 50%, 25% ou 0% para `met`, `partially_met`, `related_signal` ou `no_evidence`.

Desde `vacancy-definition-1.2.0`, `unclassified` existe somente durante a preparação de um rascunho assistido. Um requisito incluído manualmente nasce de forma coerente como `required`; qualquer rascunho com requisito ainda não classificado deve exigir a decisão entre obrigatório e desejável antes de salvar. A RPC rejeita novas versões com `unclassified`. Versões históricas permanecem legíveis, e o matching continua explicando suas pendências sem inventar importância.

Área por experiência explícita vale 30; declaração de área sem experiência vinculada suficiente vale 24. Função vale 20/17/12/8/0 para mesma função, equivalente, relacionada, contexto profissional corroborado ou nenhuma relação, com ajuste explícito de senioridade 0/-1/-4. Senioridade desconhecida nunca é inventada.

Cobertura usa o mesmo denominador, mas conta pontos avaliados com evidência suficiente independentemente do valor obtido. Falta de evidência não cobre e credita zero; relação avaliada como inexistente cobre e credita zero. Consequentemente, `score <= cobertura`. Cobertura abaixo de 60%, requisito `unclassified` ou dependência material torna o score provisório e impede ordenação por ele.

O cálculo é puro, local, sem IA ou I/O. Condições operacionais e atributos pessoais/sensíveis não entram no input. Evidência Demonstrada vigente e de versão reconhecida pode fortalecer somente o requisito de vínculo exato, sem bônus. Breakdown, versões e fingerprint permitem reprodução.

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

A separação entre área profissional e proximidade do cargo nasceu em `vacancy-matching-explainable-2.3.0`, registrada no ADR-051. O M6.1 avançou o contrato para 3.0.0 e adicionou `matching-score-1.0.0`, conforme ADR-052. A decisão de 2026-09-14 avança o matching para `vacancy-matching-explainable-4.0.0`: categorias deixam de ser barreiras e permanecem como organização/proveniência, conforme ADR-053.

O M6.2 não altera fórmula ou pesos. Uma ação humana pode usar o `match_evaluations.id` e o requisito da mesma versão da Posição para criar uma necessidade contextual. O snapshot preserva o item avaliado, suas evidências, a versão do matching, a versão do score e o fingerprint. Evidência Demonstrada posterior continua afetando somente a competência/requisito exatos, sem bônus genérico.

## Normalização conceitual M5.2

Busca e matching podem consumir `concept_id` apenas de observações `resolved` ligadas ao Perfil vigente. O texto original e sua evidência continuam sendo o fato; o conceito é uma resolução versionada. `ambiguous` e `unresolved` não satisfazem equivalência canônica, mas o termo original explícito continua elegível como evidência textual. Correspondência parcial permanece `partially_met`; relações `is_a/related_to` permanecem `related_signal`. A ausência de resolução não é ausência da competência e não bloqueia o Perfil.
