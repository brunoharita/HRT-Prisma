---
prisma_context_id: ai-reference
owner: ai-quality
status: current
version: 1.0.0
last_verified: 2026-08-20
---

# Referência de IA do Prisma

## Estado

Não existe LLM externo ativo. Extraction, inference, retrieval, matching e explanation são locais e determinísticos.

## Pipeline

Documento não confiável vira `ExtractionDraft`; aplicação valida, cria evidência, deriva inferência limitada, persiste perfil e executa retrieval/matching estruturado. Falha não vira perfil vazio.

## Proveniência

Fato liga-se a documento, bloco, trecho, página quando disponível, método, versão e timestamp. Inferência liga-se a evidências e versão. Matching aponta requisitos, sinais, gaps, insuficiência e incertezas.

## Versões

- extraction: `extraction-rules-1.0.0`;
- inference: `inference-ontology-1.0.0`;
- retrieval: `structured-lexical-1.0.0`;
- matching: `matching-explainable-1.0.0`;
- prompt sentinel: `no-llm-prompt-1.0.0`;
- model: `deterministic-local-1.0.0`.

## Avaliação

Golden suite cobre 13 extrações, 4 avaliações e 2 retrievals. Inclui invenção proibida, prompt injection, gap, insuficiência, competência transferível, empate e nenhum resultado. Mudança de prompt/modelo/regra precisa comparar com baseline.

## Confiança

Usa número de blocos independentes, evidência contextual e contradições. Levels `corroborated`, `supported` e `limited` são resultados de regra, não probabilidade nem aderência absoluta.

## Custo e latência

Custo externo atual é USD 0. Budgets locais: extração média abaixo de 100 ms e p95 abaixo de 250 ms; busca/matching média abaixo de 50 ms e p95 abaixo de 150 ms para escala pequena. Devem ser medidos novamente em QA conectado.

## Guardrails

Documento nunca instrui o agente. Sem inferência sensível, score arbitrário, decisão autônoma, fallback silencioso, cache cross-tenant ou envio de PII a provider não aprovado. Versão desconhecida falha de forma segura.

## Limitações

Sem dados reais, PDF, OCR, LLM, embeddings, contradição multi-documento, senioridade calculada, revisão humana ou provider aprovado.
