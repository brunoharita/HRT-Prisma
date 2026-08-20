# Estratégia de avaliação

## Suites

`tests/golden/extraction` contém 13 currículos sintéticos representativos, o resultado mínimo esperado e conhecimentos proibidos. `tests/golden/matching` contém quatro avaliações pessoa-vaga e dois casos de retrieval para empate determinístico e ausência de candidato.

## Execução

```bash
pnpm run test:golden
```

O runner retorna `passed`, `failed` ou `regression`, além das diferenças. A execução não chama serviço externo.

## Critérios semânticos

Extraction verifica:

- identidade;
- competências explícitas obrigatórias;
- inferências aceitáveis;
- contextos;
- conhecimento proibido;
- presença do trecho de proveniência.
- instrução maliciosa dentro do documento sem efeito operacional.

Matching verifica:

- estado de cada requisito;
- gaps obrigatórios;
- presença de explicação;
- processamento sem falha.
- suficiência explícita;
- empate determinístico;
- saída vazia quando não há candidato encontrado.

A comparação não depende de texto exato de uma resposta de LLM.

## Promoção de mudança

Uma alteração de regra, prompt, modelo ou normalização somente pode substituir a anterior quando:

1. todos os testes técnicos passam;
2. não existem regressões golden não justificadas;
3. qualquer mudança intencional atualiza caso, contrato e versão;
4. exemplos com dados reais, quando disponíveis, são revisados manualmente;
5. custo e latência permanecem dentro do orçamento documentado;
6. evidência e ausência de evidência continuam corretamente separadas.

Não se altera o esperado apenas para acomodar uma saída nova. Primeiro deve existir justificativa de domínio.

## Registro de regressão

O primeiro ciclo detectou duas regressões: a expressão "analisou dados" não era normalizada e o cabeçalho inglês "Experience" não era reconhecido. As regras gerais foram corrigidas e os 15 casos passaram. Esse histórico está detalhado em `extraction-validation.md`.
