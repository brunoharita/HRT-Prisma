# ADR-087: Responsável e suspensão do grupo

- Status: accepted por Bruno17/10/2026; implementação e rollout no AoT owner-lifecycle-v307.
- Acordo owner-lifecycle-v3071.0.0; owner-lifecycle1.0.0 e organization-administration1.2.0.

Reutilizar status efetivo de organization_groups nos gates existentes mantém RLS/RPC/Storage consistentes para sessões antigas. Guardar separadamente situação administrativa desejada, responsável designado e motivo da suspensão em organization_group_settings permite retirar somente o bloqueio por ausência de Owner. Empresas mantêm seus status individuais; grupo administrativamente inativo não volta por troca/retomada do responsável. Reescrever todos os consumidores de status como um overlay de frontend seria mais arriscado e não seria autoridade suficiente.

Reconciliação idempotente ocorre após gravações atômicas de cadastro/primeiro acesso e ações de Owner; salvaguarda transacional cobre transições legadas. Substituição é uma transação com lock do grupo/revisão e Owner esperado; candidato ativo é escolhido pelo humano no mesmo grupo. Credenciais e identidade não são transferidas, username não é renomeado e autoria histórica permanece. Memberships existentes dos demais usuários permanecem; novo Owner recebe escopo de todas as empresas por mecanismo já existente.

Ativação inicial é determinística apenas para grupo/única primeira empresa em preparação e Owner ativo já designado. Regularizar cadastros iniciais prontos na migração executa a regra aprovada com auditoria sistêmica, sem inventar pessoa/ativação de conta. Sem backfill de inativos. Primeiro acesso pendente aguarda conclusão; suspensão de Owner pendente não autoriza ignorar sua ativação ao reativá-lo.

Interface reutiliza modais/serviço e revalidação de sessão já existentes; backend nega operação imediatamente por estado vivo, UI reconsulta em foco/retorno e30s visível. Não promete apagar dados que já foram vistos ou invalidar capabilities públicas previamente emitidas, que mantêm seus contratos.

Rollback da web anterior preserva backend novo e metadados de suspensão; clientes antigos não podem editar situação de grupo suspenso sem atualizar contrato. Não retirar gates ou restaurar schema antigo depois de transações do ciclo. Corrigir adiante preservando motivos/status/autoria. Migração inicial/auditoria e evidências determinam estado operacional, não este ADR.
