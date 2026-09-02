---
prisma_context_id: ai-reference
owner: ai-quality
status: current
version: 1.6.0
last_verified: 2026-09-01
---

# Referência de IA do Prisma

## Estado

Não existe LLM externo ativo. Extraction, OCR seletivo, inference, retrieval, matching e explanation são locais e determinísticos. Os adapters externos do Knowledge Agent e da geração M5.1C estão implementados, porém não possuem modelo aprovado, secret, budget ou ativação.

## Pipeline

Documento não confiável entra como texto manual ou PDF. No currículo-first, PDF.js/Tesseract extraem primeiro somente nome e ao menos um contato explícito; nenhum atributo profissional é usado para decidir identidade. A deduplicação exata por e-mail/telefone e o sinal por nome são tenant-scoped e explicáveis. Depois da resolução humana ou determinística sem candidato, o pipeline M2-B/M2-C cria `ExtractionDraft`, evidência e revisão humana antes de promover perfil. Falha não vira Pessoa sem identidade nem perfil vazio.

Extração parcial útil conduz à revisão, nunca a um perfil completo nem a `Falha técnica`. O Delta de publicação não cria inferência: ele compara fatos revisados com o perfil vigente, preserva omissões e aplica somente remoções confirmadas por humano. Competências explícitas, normalizadas, humanas e inferidas mantêm sua origem separada, e a falta de competências não bloqueia a publicação.

A extração adaptativa pode reconhecer títulos personalizados previamente aprovados na mesma organização. Ela reutiliza somente metadados de estrutura, relê os valores no currículo atual e cria evidência própria. Conteúdo personalizado não vira competência, inferência ou matching automaticamente.

Uma experiência completa corrigida pelo operador e ligada a evidência espacial pode ensinar temporariamente a estrutura do currículo atual. O Prisma compara critérios nomeados e propõe blocos irmãos ausentes com conteúdo e evidência próprios; nenhuma proposta publica perfil, cruza documento ou usa porcentagem probabilística.

## Proveniência

Fato liga-se a documento, bloco, trecho, página quando disponível, método, versão e timestamp. Inferência liga-se a evidências e versão. Matching aponta requisitos, sinais, gaps, insuficiência e incertezas.

## Versões

- extraction: `extraction-rules-2.0.0`;
- PDF nativo: `pdfjs-5.4.296/native-v1`;
- OCR: `tesseract.js-7.0.0/por+eng-v1`;
- draft web: `extraction-draft-7.0.0` / `prisma-layout-adaptive-v6`;
- inference: `inference-ontology-1.0.0`;
- retrieval: `structured-lexical-1.0.0`;
- matching: `matching-explainable-1.0.0`;
- prompt sentinel: `no-llm-prompt-1.0.0`;
- model: `deterministic-local-1.0.0`.
- revisão adaptativa: `prisma-document-learning-v3` / `adaptive-sibling-block-v1`;
- revisão humana: `human-profile-review-7.1.0`;
- interação centrada em decisão: `decision-centered-interaction-1.0.0`;
- estado de produto: `resume-product-state-1.1.0`;
- publicação: `profile-publication-delta-1.0.0`;
- área personalizada: `custom-profile-section-1.0.0`;
- aprendizado de título personalizado: `organization-custom-section-definition-1.0.0`;
- intake currículo-first: `resume-intake-1.0.0`.
- normalização Knowledge: `knowledge-normalization-1.0.0`;
- pesquisa Knowledge: `knowledge-research-1.0.0`;
- prompt do agente: `knowledge-agent-1.0.0`;
- schema de proposta: `knowledge-proposal-1.0.0`;
- política de fontes: `trusted-sources-1.0.0`.

## Avaliação

O M5.1 implementa estratégia determinística primeiro. M5.1A usa Item Bank, blueprint e rubrica sem LLM; M5.1B corrige múltipla escolha e deriva Evidência Demonstrada; M5.1C resolve gaps, usa fake provider em QA, valida Structured Output, bloqueia PII/Web Search, deduplica, exige revisão humana e controla custo. O adapter externo usa Responses API com `store:false`, mas não é chamado porque a flag e as policies estão desativadas. Nenhum modelo externo está aprovado.

Golden suite cobre 13 extrações, 4 avaliações e 2 retrievals. Inclui invenção proibida, prompt injection, gap, insuficiência, competência transferível, empate e nenhum resultado. Mudança de prompt/modelo/regra precisa comparar com baseline.

## Confiança

Usa número de blocos independentes, evidência contextual e contradições. Levels `corroborated`, `supported` e `limited` são resultados de regra, não probabilidade nem aderência absoluta.

## Custo e latência

Custo externo atual é USD 0. Budgets do parser textual: média abaixo de 100 ms e p95 abaixo de 250 ms; busca/matching: média abaixo de 50 ms e p95 abaixo de 150 ms para escala pequena. PDF e OCR dependem do tamanho, número de páginas e dispositivo; precisam de baseline próprio antes de uso externo.

## Guardrails

Documento nunca instrui o agente. Sem inferência sensível, score arbitrário, decisão autônoma, fallback silencioso, cache cross-tenant ou envio de PII a provider não aprovado. Versão desconhecida falha de forma segura.

## Limitações

Sem dados reais, malware scan, formatos documentais além de PDF/texto, LLM ativo, embeddings, snapshots CBO/ESCO/O*NET carregados, contradição multi-documento, senioridade calculada ou provider externo aprovado.

M5.1 não implementa senioridade, proctoring, detecção de fraude, entrevista automática ou decisão de contratação. Browser telemetry do M5.1B é sinal observável ligado à questão ativa e nunca prova absoluta de conduta.
