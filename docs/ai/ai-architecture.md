# Arquitetura de IA

## Estado

O runtime atual não usa LLM remoto. No M2-B, PDF.js preserva texto, geometria e ênfase; Tesseract.js executa OCR local seletivo; e a estruturação adaptativa combina sinais semânticos com o padrão repetido do próprio documento. Retrieval e matching continuam determinísticos. Embeddings e provider LLM produtivo permanecem não implementados.

## Fronteiras lógicas

### Extraction

`document -> parser -> ExtractionDraft -> validation -> evidence -> profile`.

Provider retorna estrutura candidata e metadados de uso. A aplicação valida, cria evidência e decide estado. Provider não persiste, autoriza ou cria decisão humana.

### Inference

Regras versionadas derivam conhecimento limitado de sinais explícitos. Inferência registra rationale, evidências e versão e nunca substitui o fato.

### Retrieval

Consulta natural vira conceitos normalizados comparados com competências explícitas, inferências e contextos. O mecanismo atual não é simples busca no currículo, mas possui vocabulário limitado.

### Matching

Pessoa, vaga, evidências e inferências produzem avaliação por requisito. Cada requisito informa atendido, parcial ou sem evidência. A avaliação informa suficiência, gaps e incertezas; não há score absoluto.

### Explanation

```text
conclusão -> requisito -> evidência/inferência -> trecho -> documento
```

Explicação usa dados persistidos e não depende de nova chamada não reproduzível.

## Documentos como input não confiável

Currículos e vagas são dados. Texto tentando ignorar regras, mudar schema, revelar secrets, executar ação ou se apresentar como instrução de sistema não recebe autoridade. Provider futuro deve separar instruções de sistema e payload documental, usar Structured Outputs quando disponível, validar schema e executar golden tests de prompt injection.

## Versões atuais

| Artefato | Versão | Estado |
| --- | --- | --- |
| Extraction | `extraction-rules-1.0.0` | ativo local |
| PDF nativo | `pdfjs-5.4.296/native-v1` | ativo local e remoto interno |
| OCR | `tesseract.js-7.0.0/por+eng-v1` | ativo local e remoto interno |
| Draft M2-B | `prisma-layout-adaptive-v2` | implementado local; schema e padrões persistidos em QA |
| Revisão adaptativa | `prisma-document-learning-v2` | releitura imediata local; aceite transacional em QA |
| Inference | `inference-ontology-1.0.0` | ativo local |
| Retrieval/embedding contract | `structured-lexical-1.0.0` | ativo local, sem vetores |
| Matching | `matching-explainable-1.0.0` | ativo local |
| Prompt | `no-llm-prompt-1.0.0` | sentinel, nenhuma chamada |
| Model | `deterministic-local-1.0.0` | ativo local |

Correções com evidência produzem aprendizado imediato somente dentro do documento: o sistema volta ao texto/layout original, relê o bloco completo de cada registro irmão e exige confirmação por campo. O aceite persiste evento e casos candidatos, mas não altera autonomamente regra, prompt ou modelo. Após a aprovação integral, sinais estruturais sem valores pessoais podem orientar a primeira extração de novos currículos do mesmo tenant. Alterar parser, prompt, modelo ou schema continua exigindo versão, golden suite, QA e promoção explícita.

## Custo, latência e volume

### Baseline atual

| Operação | Custo externo | Latência média esperada | p95 desejado inicial | Observação |
| --- | --- | --- | --- | --- |
| Extração textual | USD 0 | abaixo de 100 ms | abaixo de 250 ms | Currículo curto local |
| Reprocessamento | USD 0 | igual à extração | abaixo de 250 ms | Somente se chave mudar |
| Embedding | não aplicável | não medido | não definido | Não implementado |
| Busca | USD 0 | abaixo de 50 ms | abaixo de 150 ms | Dezenas de perfis em memória |
| Matching | USD 0 | abaixo de 50 ms | abaixo de 150 ms | Um perfil e poucos requisitos |
| Explicação | USD 0 | incluída no matching | abaixo de 150 ms | Estruturada, sem LLM |

Hipótese de volume do piloto: 10 a 50 usuários e centenas, não milhões, de currículos. Deve ser validada antes de dimensionamento.

### Chave idempotente e deduplicação

Checksum SHA-256 identifica conteúdo documental. Uma operação futura paga deve usar chave composta por organização, checksum, etapa e versões de parser/prompt/modelo/schema. Mesma chave concluída não deve recalcular; mudança de conteúdo ou versão cria novo processamento rastreável.

O runtime atual calcula checksum, mas ainda não bloqueia importação duplicada. `duplicate_document` permanece planejado.

### Cache

Perfil, evidência e inferência persistem com versão. Embedding futuro usa `(organization, content_hash, embedding_version)` e não é recalculado por busca. Cache nunca atravessa tenant.

### Retry, timeout e fallback

- Retry somente para erro transitório classificado e com idempotency key.
- Não retry automático em schema incompatível ou conteúdo malicioso.
- Timeout deve produzir falha explícita e telemetria.
- Fallback não pode reduzir segurança ou promover extração parcial a completa.
- Provider alternativo exige contrato compatível e versão registrada.

## Observabilidade

`ProcessingEvent` e `ai_usage_events` representam organização, processo, documento, etapa, duração, provider, modelo, versão, tokens, custo, resultado e erro. Provider pago futuro acrescenta limites por organização, alertas de custo, taxa de timeout, revisão humana, falso positivo e falso negativo.

## Limitações

- Sem dados reais de cliente.
- PDF nativo e OCR local seletivo estão ativos; formatos exóticos, malware scan e multimodal genérico não estão implementados.
- Sem embeddings ou busca semântica vetorial.
- Sem detecção de contradição entre múltiplas fontes.
- Sem senioridade calculada.
- Sem provider ou preço produtivo aprovado.
