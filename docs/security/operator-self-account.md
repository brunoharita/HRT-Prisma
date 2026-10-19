# Meu cadastro — operator-self-account-1.0.0

Entrega3.1.3; acordo/execução/AoT my-account-v3131.0.0. Operador é distinto de Pessoa/Perfil. Menu abre `/my-account` para quatro perfis ativos, sem autoridade administrativa/membership obrigatório. Primeiro acesso permanece no fluxo obrigatório existente.

Correção administrativa de19/10/2026: `save_platform_user_v3` deriva o status efetivo sob lock do registro. Habilitar ou transferir conta pendente mantém `pending_first_access`; inativar continua permitido e reabilitar uma ativação incompleta retorna a pendente. Conta bloqueada não é desbloqueada pelo editor genérico. O payload administrativo active não comprova primeiro acesso nem pode limpar `must_change_password`. `complete_first_access_v307` permanece responsável pela conclusão explícita e auditoria. Contas legadas ativas sem timestamp não recebem backfill. Formulário identifica a pendência, mantendo composição/densidade. Acordo/AoT `first-access-preservation` registram provas e reparo delimitado do incidente.

## Autoridade e dados básicos

Edge operator-self-service verifica JWT pelo Auth e extrai session_id só do token validado. RPC operator_self_account_v313 é service-only: verifica sessão em auth.sessions/not_after, usuário ativo, primeiro acesso concluído e perfil conhecido. Nenhum alvo vem do navegador. Payload tem whitelist/limite16KiB. Nome/celular/username usam validações shared e constraints existentes; username é único global. Owner conserva exatamente o username criado, protegido por trigger, handlers e UI, inclusive na administração. Não recalcular usernames históricos ou na substituição já aprovada.

Revisão MD5 do registro evita sobrescrita concorrente; não é autenticador. Dados básicos e auditoria são transacionais, sem reescrever memberships, perfil, grupo ou status. O shell recarrega a identificação após salvar. E-mail continua compartilhável conforme ADR086; nenhuma autoridade é agrupada por contato.

## Contato confirmado

Confirmação nativa do e-mail Auth alteraria uma credencial técnica exclusiva, incompatível com o contato compartilhável. Adaptar o transporte Resend/configuração protegida existentes permite confirmar o contato sem novo fornecedor/segredo/biblioteca. Contas legadas convertem o endereço Auth monotonicamente para alias técnico pela API oficial, preservando UUID/senha e contato atual até confirmação.

Solicitar exige senha atual validada em cliente Auth efêmero, cuja sessão é encerrada com scope local. Tokens dessa reautenticação não retornam ao navegador. Limite de cinco tentativas sensíveis por15 minutos. Código aleatório uniforme de oito dígitos,15 minutos/cinco erros/uso único; solicitação uma por60 segundos e três por hora. Banco conserva SHA256 vinculado a request/conta; leitura não retorna código/hash. Novo pedido cancela anterior; cancelamento explícito. Recibo accepted/failed/unknown distingue aceitação de entrega na caixa; timeout não provoca retry automático.

Confirmação vincula conta/sessão/pedido e preserva contador de erros mesmo quando rejeita. Sucesso é idempotente. Contato alterado concorrentemente pela administração invalida o pedido antigo. E-mail anterior continua fonte de recuperação até confirmação transacional auditada. Auditoria sob ACL existente conserva contatos anterior/novo, nunca código/token/senha. Recuperação pública continua por username.

## Senha e sessões

Senha atual obrigatória; nova/confirmada seguem política compartilhada de oito caracteres, maiúscula/minúscula/número/especial e requisitos reativos vermelho/verde+check. API oficial faz hashing. Atualização administrativa de senha do Auth revoga sessões: tela informa antes e volta ao login com mensagem depois.

Intent privado/auditado antecede Auth. finish_operator_self_password_v313 finaliza apenas intent password/verified recente vinculado à mesma conta/sessão, mesmo após revogação nativa. Service-only, cinco minutos, recibo imutável; não lê cadastro nem altera usuário/autoridade. Se resultado se perde, permanece unknown. Atualização confirmada com auditoria final indisponível distingue changed de unknown e exige novo login sem alegar que a senha permaneceu igual. Falhas não recebem sucesso inventado.

Fontes oficiais verificadas18/10/2026: [API administrativa](https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid), [signOut local](https://supabase.com/docs/reference/javascript/auth-signout), [UpdatePassword/revogação](https://github.com/supabase/auth/blob/master/internal/models/user.go), [adminUserUpdate](https://github.com/supabase/auth/blob/master/internal/api/admin.go). Fundamentam a integração, sem substituir evidência hospedada. Testes usam transportes falsos, Auth.sessions compatível e PostgreSQL real. Nenhum teste com senha/contato de usuário real ou envio externo.

## Rollout e rollback

Migração aditiva antes das duas Edges (operator-self-service nova e platform-users com guard Owner) e web. Confirmar JWT, grants/RLS, fontes/SHA/versão. Não publicar Parser/Synthesis/Knowledge/IA. Rollback restaura consumidores e mantém tabelas, trigger Owner e histórico, sem down destrutivo. AoT registra limites; mocks não provam entrega real ou jornada humana autenticada.
