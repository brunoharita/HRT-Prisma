# Contrato de matching

## Escopo

Uma avaliação compara uma pessoa com uma vaga específica. Ela não altera o perfil permanente e não decide contratação ou rejeição.

## Saída por requisito

| Estado | Regra |
| --- | --- |
| `met` | Há igualdade textual ou canônica publicada na dimensão correspondente do Perfil |
| `partially_met` | Há correspondência textual parcial na mesma dimensão ou competência transferível declarada; exige revisão humana |
| `related_signal` | Há uma relação específica e rastreável que orienta a análise, mas não comprova o requisito |
| `no_evidence` | Nenhuma evidência foi identificada; não significa ausência |

O resultado agrega requisitos atendidos, parcialmente atendidos, sinais relacionados, sem evidência, gaps obrigatórios, evidências e incertezas. Cada requisito consulta somente a dimensão canônica correspondente. Sobre a posição, responsabilidades e resultados são narrativos e não comprovam requisitos.

## Descoberta ocupacional

A descoberta da posição é separada da aderência detalhada. Ela usa, nesta ordem, a mesma referência oficial, referência equivalente publicada, relação ocupacional publicada e possível relação textual entre o título da Vaga, o título profissional e cargos das experiências. A última hipótese nunca vira equivalência automática. O operador pode confirmar ou descartar a relação; essa decisão fica auditada, altera apenas a ordenação e nunca muda o Perfil, a Vaga ou a Knowledge.

Todos os Perfis publicados acessíveis são analisados, inclusive quando não há requisito detalhado ou quando requisitos ainda aguardam classificação. O resultado exibe somente quem possui ao menos uma relação ocupacional, evidência direta, evidência parcial, sinal relacionado ou confirmação humana anterior. Zero sinal não é convertido em ausência profissional, mas também não gera resultado.

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

## Normalização conceitual M5.2

Busca e matching podem consumir `concept_id` apenas de observações `resolved` ligadas ao Perfil vigente. O texto original e sua evidência continuam sendo o fato; o conceito é uma resolução versionada. `ambiguous` e `unresolved` não satisfazem requisitos. Prefixo e substring na dimensão correta podem gerar somente `partially_met`; relações `is_a/related_to` permanecem `related_signal`. A ausência de resolução não é ausência da competência e não bloqueia o Perfil.
