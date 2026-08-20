# Contrato de matching

## Escopo

Uma avaliação compara uma pessoa com uma vaga específica. Ela não altera o perfil permanente e não decide contratação ou rejeição.

## Saída por requisito

| Estado | Regra |
| --- | --- |
| `met` | A competência requerida está explicitamente sustentada no perfil |
| `partially_met` | Existe inferência rastreável ou competência transferível configurada |
| `no_evidence` | Nenhuma evidência foi identificada; não significa ausência |

O resultado agrega requisitos atendidos, parcialmente atendidos, sem evidência, gaps obrigatórios, competências transferíveis, evidências, inferências e incertezas.

## Suficiência

`sufficient_evidence` significa que nenhum requisito obrigatório ficou sem evidência, embora requisitos parciais ainda exijam validação humana. `insufficient_evidence` significa que ao menos um requisito obrigatório recebeu `no_evidence`. O sistema deve poder retornar explicitamente que nenhum candidato possui evidência suficiente; não preencher artificialmente a lista.

## Metodologia de confiança

A confiança não vem de uma opinião do modelo. `explainConfidence` calcula critérios observáveis:

1. blocos independentes de evidência, identificados por documento e bloco;
2. evidências ligadas a experiência ou contexto profissional;
3. contradições identificadas.

Regras iniciais:

- `corroborated`: duas ou mais evidências independentes, ao menos uma contextual e nenhuma contradição;
- `supported`: ao menos uma evidência contextual ou duas independentes, sem contradição;
- `limited`: evidência única e genérica, ausência de evidência ou presença de contradição.

Cada resultado inclui as contagens e os motivos que determinaram o nível. Esses termos não equivalem a alta, média ou baixa aderência e não representam probabilidade.

## Gaps

Gap é criado somente quando um requisito marcado como obrigatório recebe `no_evidence`. A mensagem usa "sem evidência identificada". Requisitos desejáveis sem evidência permanecem visíveis, mas não viram gap obrigatório.

## Competências transferíveis

Competências transferíveis são declaradas na vaga. O mecanismo não inventa adjacências durante a avaliação. Elas geram `partially_met` e exigem validação humana.

## Versionamento

Toda avaliação persiste `matchingVersion`. Uma futura avaliação com LLM também deverá persistir `promptVersion` e `modelVersion`.
