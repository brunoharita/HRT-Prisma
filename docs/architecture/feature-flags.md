# Feature flags

## Estado atual

O Knowledge Agent introduz a primeira ativação sensível server-side. `KNOWLEDGE_AGENT_ENABLED` só ativa pesquisa quando vale exatamente `true`; ausência, valor desconhecido, modelo ausente, secret ausente ou caps iguais a zero mantêm a chamada externa bloqueada. Structured ingestion, normalization e automação de reinterpretação permanecem dependentes do rollout real de schema/configuração e não de controles visuais no frontend.

## Regra para adoção futura

Uma flag só deve ser criada quando reduzir risco real de ativação, rollback ou exposição por tenant. Toda flag material deverá possuir owner, tipo, default fail-closed, ambientes, audience, data de expiração, comportamento desconhecido, auditoria, rollback e teste dos dois estados.

Flags não substituem autorização, RLS, migration, contrato ou aprovação de produção. Configuração ausente ou valor desconhecido deve manter capability sensível desativada.

## Proibições

- Não usar flag frontend para conceder acesso.
- Não deixar flag temporária sem expiração.
- Não reutilizar o mesmo nome com semântica diferente.
- Não declarar uma capability ativa apenas porque o código protegido por flag foi publicado.
