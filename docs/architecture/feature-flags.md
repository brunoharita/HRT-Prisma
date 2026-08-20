# Feature flags

## Estado atual

Não existe mecanismo de feature flags no runtime atual e nenhuma capability depende de flag. Esta ausência é intencional: não há ambientes remotos ou rollout parcial que justifiquem infraestrutura adicional.

## Regra para adoção futura

Uma flag só deve ser criada quando reduzir risco real de ativação, rollback ou exposição por tenant. Toda flag material deverá possuir owner, tipo, default fail-closed, ambientes, audience, data de expiração, comportamento desconhecido, auditoria, rollback e teste dos dois estados.

Flags não substituem autorização, RLS, migration, contrato ou aprovação de produção. Configuração ausente ou valor desconhecido deve manter capability sensível desativada.

## Proibições

- Não usar flag frontend para conceder acesso.
- Não deixar flag temporária sem expiração.
- Não reutilizar o mesmo nome com semântica diferente.
- Não declarar uma capability ativa apenas porque o código protegido por flag foi publicado.
