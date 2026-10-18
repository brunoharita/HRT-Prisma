# Execução — medição de IA, v1.0.0

Executar integralmente `docs/qa/agreement-ai-cost-metering-v312.md` v1.0.0, incluindo D-01–D-07, P-01–P-04, F-01–F-03, A-01–A-02 e CA-01–CA-07. A aprovação é o pedido de implementação de Bruno em 18/10/2026; este documento não abre nova decisão de produto.

Reutilizar ai_requests/ai_usage_events, reservas/alocações existentes, worker boundary e Gestão de Tokens. Nenhuma chamada live de IA ou mutação de dados humanos para provar o funcionamento. Classificação D, branch codex/ai-action-cost-metering. Consulta financeira somente explicita o que é calculado/parcial/desconhecido; não conectar nova conta administrativa. Entrega 3.1.2. Rollout: banco aditivo -> quatro funções Edge afetadas -> Parser e Synthesis -> web; confirmar o release plan do diff antes de publicar.

Mínimo suficiente: calculadora/transporte com fixtures; SQL local integrado ao baseline de Tokens com negativos de autoridade, tenant e replay; testes dirigidos dos consumidores; tipos/build; UI determinística da consulta; Context Pack e CI obrigatória. Não executar suite integral local. Encerrar após evidência, publicação, smoke e sincronização, sem repetir cenários válidos sem nova alteração.
