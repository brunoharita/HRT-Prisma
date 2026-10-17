# Execução V3M0

Implementar integralmente `docs/qa/agreement-v3m0-multiempresa.md` versão1.0.0, lida por completo: D-01..07/P-01..03/F-01/A-01/CA-01..03/mapa. Fonte: Bruno17/10/2026 autorizou execução e delegou parâmetros. Sem3.0.0 implícita; entrega2.9.0.

Reutilizar organization_groups/organizations/organization_memberships/platform_users, Supabase Auth, Edge platform-users, helpers/RLS e AntD/App Shell. Migração aditiva compatível, sem reescrever histórico. Não criar fornecedor de identidade, banco por empresa, cobrança automática ou carteira por grupo. Codificar as escolhas provisórias do acordo como configurações auditáveis; manter recursos atuais e preços de Tokens.

Local -> SQL descartável/negativos/browser/contratos afetados -> tipos/build/lint/contextos -> CI -> migration seletiva -> Edge afetadas -> web -> smoke e sincronização. Não usar produção para mutações de teste. Se encontrar conflito de Owner/dados/contrato, parar somente a operação afetada, sem escolher pessoas nem remover registros. AoT usa template e distingue comportamento novo, preservação e limites.
