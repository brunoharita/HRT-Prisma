# Execution Prompt — M6.2 Jornada contextual de verificação

Implementar integralmente o contrato congelado `docs/qa/agreement-m62-verification-journey.md` versão 1.0.0.

Preservar M6.1.1, `vacancy-matching-explainable-4.0.0`, `matching-score-1.0.0`, decisões humanas, RLS, isolamento multi-tenant e todo histórico. Criar a necessidade somente por RPC autorizada a partir do `match_evaluations.id` e do requisito pertencente à mesma versão imutável da Posição. Fazer loaders apenas de leitura. Usar prévias seguras e estados explícitos; não expor itens nem simular delivery. Validar localmente, aplicar somente a migration revisada no Prisma-QA, executar prova SQL negativa e smoke autenticado. Não tocar produção.

Fechar com `docs/qa/aot-m62-verification-journey.md`, relacionando D-001 a D-014 e P-001 a P-006 a implementação, teste e evidência.
