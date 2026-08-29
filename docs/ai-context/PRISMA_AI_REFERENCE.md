---
prisma_context_id: ai-reference
owner: ai-quality
status: current
version: 1.5.0
last_verified: 2026-08-28
---

# Referência de IA do Prisma

## Estado

Não existe LLM externo ativo. Extraction, OCR seletivo, inference, retrieval, matching e explanation são locais e determinísticos. O adapter OpenAI do Knowledge Agent está implementado, porém não possui modelo aprovado, secret, budget ou ativação.

## Pipeline

Documento não confiável entra como texto manual ou PDF. No currículo-first, PDF.js/Tesseract extraem primeiro somente nome e ao menos um contato explícito; nenhum atributo profissional é usado para decidir identidade. A deduplicação exata por e-mail/telefone e o sinal por nome são tenant-scoped e explicáveis. Depois da resolução humana ou determinística sem candidato, o pipeline M2-B/M2-C cria `ExtractionDraft`, evidência e revisão humana antes de promover perfil. Falha não vira Pessoa sem identidade nem perfil vazio.

A extração adaptativa pode reconhecer títulos personalizados previamente aprovados na mesma organização. Ela reutiliza somente metadados de estrutura, relê os valores no currículo atual e cria evidência própria. Conteúdo personalizado não vira competência, inferência ou matching automaticamente.

## Proveniência

Fato liga-se a documento, bloco, trecho, página quando disponível, método, versão e timestamp. Inferência liga-se a evidências e versão. Matching aponta requisitos, sinais, gaps, insuficiência e incertezas.

## Versões

- extraction: `extraction-rules-1.0.0`;
- PDF nativo: `pdfjs-5.4.296/native-v1`;
- OCR: `tesseract.js-7.0.0/por+eng-v1`;
- draft web: `extraction-draft-3.1.0` / `prisma-layout-adaptive-v2.1`;
- inference: `inference-ontology-1.0.0`;
- retrieval: `structured-lexical-1.0.0`;
- matching: `matching-explainable-1.0.0`;
- prompt sentinel: `no-llm-prompt-1.0.0`;
- model: `deterministic-local-1.0.0`.
- revisão humana: `human-profile-review-2.1.0`;
- área personalizada: `custom-profile-section-1.0.0`;
- aprendizado de título personalizado: `organization-custom-section-definition-1.0.0`;
- intake currículo-first: `resume-intake-1.0.0`.
- normalização Knowledge: `knowledge-normalization-1.0.0`;
- pesquisa Knowledge: `knowledge-research-1.0.0`;
- prompt do agente: `knowledge-agent-1.0.0`;
- schema de proposta: `knowledge-proposal-1.0.0`;
- política de fontes: `trusted-sources-1.0.0`.

## Avaliação

Golden suite cobre 13 extrações, 4 avaliações e 2 retrievals. Inclui invenção proibida, prompt injection, gap, insuficiência, competência transferível, empate e nenhum resultado. Mudança de prompt/modelo/regra precisa comparar com baseline.

## Confiança

Usa número de blocos independentes, evidência contextual e contradições. Levels `corroborated`, `supported` e `limited` são resultados de regra, não probabilidade nem aderência absoluta.

## Custo e latência

Custo externo atual é USD 0. Budgets do parser textual: média abaixo de 100 ms e p95 abaixo de 250 ms; busca/matching: média abaixo de 50 ms e p95 abaixo de 150 ms para escala pequena. PDF e OCR dependem do tamanho, número de páginas e dispositivo; precisam de baseline próprio antes de uso externo.

## Guardrails

Documento nunca instrui o agente. Sem inferência sensível, score arbitrário, decisão autônoma, fallback silencioso, cache cross-tenant ou envio de PII a provider não aprovado. Versão desconhecida falha de forma segura.

## Limitações

Sem dados reais, malware scan, formatos documentais além de PDF/texto, LLM ativo, embeddings, snapshots CBO/ESCO/O*NET carregados, contradição multi-documento, senioridade calculada ou provider externo aprovado.
