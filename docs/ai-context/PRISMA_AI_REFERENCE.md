---
prisma_context_id: ai-reference
owner: ai-quality
status: current
version: 2.1.0
last_verified: 2026-09-14
---

# Referência de IA do Prisma

## Estado

Extração determinística, OCR seletivo, inferência, retrieval, matching, score e explanation permanecem locais. Knowledge research para conceitos, mercado de Posições e resolução ocupacional usa uma fronteira OpenAI server-side ativa e validada no Prisma-QA, com dados mínimos, fontes/allowlists e auditoria. O Parser IA M5.7 usa OpenAI somente em runtime DEV loopback e sob ação autorizada; não possui cutover ou serviço multiusuário. A geração externa de itens M5.1C está implantada, mas continua desativada; o provider fake permanece ativo em QA.

## Pipeline

Documento não confiável entra como texto manual ou PDF. No currículo-first, PDF.js/Tesseract extraem primeiro somente nome e ao menos um contato explícito; nenhum atributo profissional é usado para decidir identidade. A deduplicação exata por e-mail/telefone e o sinal por nome são tenant-scoped e explicáveis. Depois da resolução humana ou determinística sem candidato, o pipeline M2-B/M2-C cria `ExtractionDraft`, evidência e revisão humana antes de promover perfil. Falha não vira Pessoa sem identidade nem perfil vazio.

Extração parcial útil conduz à revisão, nunca a um perfil completo nem a `Falha técnica`. O Delta de publicação não cria inferência: ele compara fatos revisados com o perfil vigente, preserva omissões e aplica somente remoções confirmadas por humano. Competências explícitas, normalizadas, humanas e inferidas mantêm sua origem separada, e a falta de competências não bloqueia a publicação.

A extração adaptativa pode reconhecer títulos personalizados previamente aprovados na mesma organização. Ela reutiliza somente metadados de estrutura, relê os valores no currículo atual e cria evidência própria. Conteúdo personalizado não vira competência, inferência ou matching automaticamente.

O resumo profissional é um fato textual opcional separado de objetivo e posicionamento. Ele exige seção explícita em português ou inglês, aceita cabeçalho e conteúdo fundidos pelo PDF e termina no próximo cabeçalho conhecido. Sem seção segura, permanece nulo e aparece em `notIdentified`; o Prisma não sintetiza um resumo a partir de experiências.

Um registro completo de experiência, formação, curso ou certificação corrigido pelo operador e ligado a evidência espacial pode ensinar temporariamente a estrutura do currículo atual. O Prisma resolve qualquer seleção dentro do bloco, compara topologia relativa e critérios nomeados e propõe irmãos ausentes em outra coluna, página ou altura com conteúdo e evidência próprios; nenhuma proposta publica perfil, cruza documento ou usa porcentagem probabilística.

## Proveniência

Fato liga-se a documento, bloco, trecho, página quando disponível, método, versão e timestamp. Inferência liga-se a evidências e versão. Matching aponta requisitos, sinais, gaps, insuficiência e incertezas.

## Versões

- extraction: `extraction-rules-2.0.0`;
- PDF nativo: `pdfjs-5.4.296/native-v1`;
- OCR: `tesseract.js-7.0.0/por+eng-v1`, com worker, core WASM e dados `por+eng` carregados de assets locais do bundle web; evidência espacial OCR persiste somente com o método compatível `tesseract-layout-v1`;
- draft web: `extraction-draft-8.2.0` / `prisma-layout-adaptive-v10`;
- inference: `inference-ontology-1.0.0`;
- retrieval: `structured-lexical-1.0.0`;
- matching do vertical slice base: `matching-explainable-1.0.0`;
- matching de Posições: `vacancy-matching-explainable-4.0.0`;
- Prisma Score: `matching-score-1.1.0`;
- prompt sentinel: `no-llm-prompt-1.0.0`;
- model local base: `deterministic-local-2.0.0`;
- revisão adaptativa: `adaptive-resume-extraction-7.2.0` / `prisma-document-learning-v4` / `generic-record-pattern-v1` / `relative-record-signature-v1`;
- revisão humana: `human-profile-review-7.2.0`;
- interação centrada em decisão: `decision-centered-interaction-1.0.0`;
- segmentação de competências: `competency-list-segmentation-1.0.0` / `competency-list-spatial-v1`;
- resumo estruturado: `structured-resume-summary-1.1.0` / `adaptive-resume-extraction-7.1.0`;
- estado de produto: `resume-product-state-1.1.0`;
- publicação: `profile-publication-delta-1.1.0`;
- feedback operacional: `operation-feedback-2.0.0`;
- área personalizada: `custom-profile-section-1.0.0`;
- aprendizado de título personalizado: `organization-custom-section-definition-1.0.0`;
- intake currículo-first: `resume-intake-1.0.0`.
- normalização Knowledge: `knowledge-normalization-2.0.0`;
- ingestão de fonte Knowledge: `knowledge-source-ingestion-1.0.0`, manifesto `1.0.0`;
- monitoramento de fonte Knowledge: `knowledge-source-monitor-1.0.1`;
- pesquisa Knowledge: `knowledge-research-1.0.0`;
- prompt do agente: `knowledge-agent-1.0.0`;
- schema de proposta: `knowledge-proposal-1.0.0`;
- política de fontes: `trusted-sources-1.0.0`.

## Avaliação

O M5.1 implementa estratégia determinística primeiro. M5.1A usa Item Bank, blueprint e rubrica sem LLM; M5.1B corrige múltipla escolha e deriva Evidência Demonstrada; M5.1C resolve gaps, usa fake provider em QA, valida Structured Output, bloqueia PII/Web Search, deduplica, exige revisão humana e controla custo. Falhas conhecidas dessas superfícies são traduzidas em linguagem natural com a ação exata esperada, e mensagens remotas desconhecidas são sanitizadas como responsabilidade interna do Prisma. O adapter externo usa Responses API com `store:false`, mas não é chamado porque a flag e as policies estão desativadas. Nenhum modelo externo está aprovado.

A golden suite corrente possui 23 casos e cobre extração, matching, score, invenção proibida, prompt injection, gap, insuficiência, competência transferível, empate e nenhum resultado. Mudança de prompt, modelo ou regra precisa comparar com o baseline aplicável.

## Confiança

Usa número de blocos independentes, evidência contextual e contradições. Levels `corroborated`, `supported` e `limited` são resultados de regra, não probabilidade nem aderência absoluta.

## Custo e latência

Knowledge research e os testes autorizados do Parser IA podem gerar custo externo dentro dos budgets e caps server-side aprovados para cada fronteira. A geração de itens externa permanece com custo zero por estar desativada. Budgets do parser textual determinístico: média abaixo de 100 ms e p95 abaixo de 250 ms; busca/matching local: média abaixo de 50 ms e p95 abaixo de 150 ms para escala pequena. PDF e OCR dependem do tamanho, número de páginas e dispositivo; precisam de baseline próprio antes de uso externo.

## Guardrails

Documento nunca instrui o agente. Sem inferência sensível, score arbitrário, decisão autônoma, fallback silencioso, cache cross-tenant ou envio de PII a provider não aprovado. Versão desconhecida falha de forma segura.

## Limitações

Sem validação ampla com dados reais de clientes, malware scan, formatos documentais além de PDF/texto, embeddings, contradição multi-documento, senioridade calculada ou provider externo para geração de itens aprovado. CBO, ESCO e O*NET estão publicadas e correntes no Prisma-QA; relações ocupacionais e taxonômicas nunca se tornam evidência de competência de uma Pessoa.

M5.1 não implementa senioridade, proctoring, detecção de fraude, entrevista automática ou decisão de contratação. Browser telemetry do M5.1B é sinal observável ligado à questão ativa e nunca prova absoluta de conduta.
