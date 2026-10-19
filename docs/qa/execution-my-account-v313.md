# Execução — Meu cadastro, v1.0.0

Implementar integralmente `docs/qa/agreement-my-account-v313.md` v1.0.0, D01–D07/P01–P03/F01/A01/CA01–CA07. A autorização explícita de Bruno aprova a proposta anterior e supersede o bloqueio de username proposto para não Owners; Owner permanece imutável. Nenhuma nova aprovação administrativa é necessária.

Reutilizar Supabase Auth, operatorIdentity, validações shared, auditoria de usuário, transporte Resend/configuração protegida e componentes/navigation guard Prisma. A confirmação nativa de e-mail Auth não serve ao contato compartilhável do ADR-086; adaptar o envio existente com código temporário vinculado à conta/sessão, sem alterar o fornecedor ou o login técnico.

Mínimo suficiente: handlers reais com fetch falso, PostgreSQL local descartável com negativos/replay/concorrência e regressão de identidade/Owner, tipos/build, browser determinístico desktop/celular, Context Pack/ledger/CI. Não executar suíte integral local nem testes com credenciais/usuários reais. Publicar somente superfícies do plano; concluir após smoke e sincronização.
