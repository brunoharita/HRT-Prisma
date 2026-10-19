# Acordo e execução — preservação do primeiro acesso, v1.0.0

Autoridade: relato de Bruno em19/10/2026 identifica como erro a ativação do usuário pendente após edição de grupo/empresa. Restauração delimitada da regra já aprovada de primeiro acesso (ADR086 e lifecycle3.0.7). Baseline895120b5ce2eeb979c9e4c5607ac906baf7b23e3. RiscoD; correção mantém versão3.1.3, sem nova entrega funcional no registry.

- D01: editar dados/perfil/grupo/empresas preserva primeiro acesso pendente. A habilitação administrativa não equivale à conclusão do primeiro acesso. Mostrar essa distinção no formulário compacto existente.
- D02: a persistência decide o status sob lock da conta, preservando pendência inclusive com payload active/obsoleto. Inativação continua possível; reabilitar uma ativação ainda incompleta retorna a pendente. Bloqueado permanece bloqueado; o editor genérico não o desbloqueia.
- D03: conclusão explícita pelo fluxo existente mantém sua autoridade para ativar e auditar; preservar Owner/ativação de grupo/empresa, permissões, isolamento, identidade, senha e recuperação. Contas ativas legadas sem timestamp não são reclassificadas.
- D04: reparar somente o caso relatado, condicionado à auditoria que comprova pending→active na edição e à ausência de conclusão posterior, com CAS/auditoria. Preservar grupo/empresa escolhidos, credenciais e histórico. Sem backfill genérico.
- P01: edição administrativa concluir primeiro acesso, inferir acesso humano ou limpar must_change_password; conceder autoridade fora do grupo ou ativar Owner/grupo antes da hora.
- P02: novas chamadas de IA, mensagens de teste, mudar senha/identidade, apagar histórico ou alterar contas não comprovadamente afetadas.
- F01: redesenho da gestão, novos estados, revisão comercial ou recuperação de outros registros.
- A01: reutilizar RPC save_platform_user_v3, lock e auditoria existentes; migração aditiva com substituição exata verificada, componentes e harnesses locais. Sem nova dependência ou arquitetura.

CA01/D01: formulário real pendente em desktop/celular, edição e payload administrativo habilitado sem alegar conclusão. CA02/D02/P01: PostgreSQL real testa edição entre grupos, payload adulterado, inactive→pending, blocked, preservação active legado e corrida com conclusão. CA03/D03: regressões de identidade/Owner e Auth Edges sintéticas, conclusão auditada e isolamento negativo. CA04/D04/P02: CAS só após prova do incidente, recibo mínimo e snapshot dos vínculos/credenciais antes/depois. CI obrigatória, main, rollout por superfícies e smoke sem e-mail/IA; registrar limites no AoT.

Execução: implementar D01–D04 sem violar P01/P02; F01 excluído e A01 restrito ao como. Validação mínima: tipos/build web/root, Node dirigidos, Edge/Auth offline, PostgreSQL integrado com casos negativos e preservação, UI real; contexto em snapshot rastreado para excluir rascunhos preexistentes. Rollback: conservar esquema/histórico e correção do caso; restaurar fontes/imagem consumidoras sem down destrutivo. Não há decisão material pendente.
