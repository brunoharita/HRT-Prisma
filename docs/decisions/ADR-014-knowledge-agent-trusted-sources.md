# ADR-014: Knowledge Agent e política de fontes confiáveis

- Status: accepted
- Data: 2026-08-26
- Owners: AI, security, operations

## Decisão

Pesquisa externa é server-side, assíncrona ao intake e limitada a termo profissional sanitizado. `KnowledgeResearchProvider` isola fornecedor. Uma fonte oficial é suficiente; sem fonte primária, duas secundárias independentes e aprovadas são exigidas. O agente produz proposta estruturada, mas nunca publica.

OpenAI Responses API é o adapter inicial implementado, desativado por padrão. Domínios, schema, budgets e no-PII são validados antes de persistir. Conteúdo web é input não confiável.

## Evidência

`supabase/functions/knowledge-agent/index.ts`, `src/ai/knowledgeResearch.ts` e `docs/ai/professional-concept-agent.md`.
