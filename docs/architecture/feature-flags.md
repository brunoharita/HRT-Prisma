# Feature flags

## Estado atual

O Knowledge Agent introduz a primeira ativação sensível server-side. `KNOWLEDGE_AGENT_ENABLED` só ativa pesquisa quando vale exatamente `true`; ausência, valor desconhecido, modelo ausente, secret ausente ou caps iguais a zero mantêm a chamada externa bloqueada. Em Prisma-QA, flag, modelo e caps estão configurados para o modo contextual de Vagas, mas a ausência de `OPENAI_API_KEY` mantém o provider bloqueado. Structured ingestion, normalization e automação de reinterpretação permanecem dependentes do rollout real de schema/configuração e não de controles visuais no frontend.

O M5.1C adiciona `M51C_AI_ITEM_GENERATION_ENABLED`. Ela é server-side, tem default `false` e somente libera a boundary depois de JWT, policy tenant-scoped, provider, modelo, secret, estimativa, teto por pedido, limite diário, cooldown e orçamento. Valor ausente ou diferente de `true` bloqueia a chamada externa sem afetar o uso do Item Bank existente. Owner: AI/operations/security. Audience: operadores autorizados. Rollback: definir `false`; requisições existentes e ledger são preservados.

## Regra para adoção futura

Uma flag só deve ser criada quando reduzir risco real de ativação, rollback ou exposição por tenant. Toda flag material deverá possuir owner, tipo, default fail-closed, ambientes, audience, data de expiração, comportamento desconhecido, auditoria, rollback e teste dos dois estados.

Flags não substituem autorização, RLS, migration, contrato ou aprovação de produção. Configuração ausente ou valor desconhecido deve manter capability sensível desativada.

## Proibições

- Não usar flag frontend para conceder acesso.
- Não deixar flag temporária sem expiração.
- Não reutilizar o mesmo nome com semântica diferente.
- Não declarar uma capability ativa apenas porque o código protegido por flag foi publicado.
