# ADR-014: Knowledge Agent e política de fontes confiáveis

- Status: accepted
- Data: 2026-08-26
- Owners: AI, security, operations

## Decisão

Pesquisa externa é server-side, assíncrona ao intake e limitada a termo profissional sanitizado. `KnowledgeResearchProvider` isola fornecedor. Uma fonte oficial é suficiente; sem fonte primária, duas secundárias independentes e aprovadas são exigidas. O agente produz proposta estruturada, mas nunca publica.

OpenAI Responses API é o adapter inicial implementado e permanece bloqueado de forma fechada enquanto configuração, opt-in ou credencial obrigatória estiver ausente. Domínios, schema, budgets e no-PII são validados antes de persistir. Conteúdo web é input não confiável.

Em 2026-09-04, o mesmo boundary foi estendido com o modo contextual de Vagas. O modo recebe somente pergunta, título, área, idioma e data; não recebe Perfil, Pessoa, currículo, nome da organização ou descrição interna. Ele retorna síntese, recomendação, ressalvas e fontes, sem criar ou publicar Knowledge. Respostas idênticas podem ser reutilizadas por 24 horas dentro do mesmo tenant. O modelo econômico configurado em QA é `gpt-5.6-luna`; `OPENAI_API_KEY` foi cadastrada no cofre e uma chamada viva concluiu com fontes pós-validadas e ledger metadata-only.

## Evidência

`supabase/functions/knowledge-agent/index.ts`, `src/ai/knowledgeResearch.ts` e `docs/ai/professional-concept-agent.md`.
