# Mínimo de senha8 — acordo e execução1.0.1

Bruno decidiu no chat17/10/2026: mínimo de8caracteres. Supersede somente o limite12 da política anterior e a proibição de alterá-lo no P-01 do acordo password-feedback-v304; demais condições permanecem. Baseline9a456e4d4a097022fe1292654c488273c6357458/runtime3.0.4 0c4af48bc0d81a55f731f96d385c006c1749dc6d. Entrega3.0.5, política password-policy1.1.0.

- D-01: aceitar a partir de8caracteres e recusar7ou menos; preservar maiúscula/minúscula/número/especial/confirmação e demais gates atuais.
- D-02: mínimo8 no cadastro genérico/Owner, troca/primeiro acesso e Edge platform-users; Auth hospedado permanece com mínimo6 informado por Bruno, compatível com senhas8; rótulos/feedback imediatos coerentes. Campo canônico/cores/checks3.0.4 preservados.
- P-01: não alterar senha existente, contas reais, escopos, JWT, permissões, outros parâmetros Auth, fluxo de recuperação/e-mail ou geração automática. Nenhuma credencial em fonte/log/evidência; senha sintética única somente em memória.
- F-01: nova política de complexidade, auditoria global de segurança, migrações/RLS, mudança de providers e redesign de telas.
- A-01: constante compartilhada web para regra/rótulos, ajuste equivalente na Edge/config.toml; testes de fronteira com funções/handlers/formulários reais e transportes sintéticos. Sem lib nova.
- CA-01: fronteiras7/8/11/12e negativos de cada condição em Node/Edge real; servidor não provisiona abaixo8ou com regra faltante;8válida chega à persistência/compensação atuais.
- CA-02: browser Owner/genérico e troca de senha com7pendente/8atendido, foco/cores/checks/confirmação/locks, submit8sintético e fluxos automáticos preservados; tipos/build/checks/contexto/CI.
- CA-03: publicar somente Edge platform-users e web, mantendo verify_jwt; conferir fontes/versão/SHA/rotas/assets/rollback/serviços e registrar Auth mínimo6 informado por Bruno, sem alteração hospedada. Sincronizar e registrar limites no AoT.

## Mapa de impacto e mínimo suficiente

| Área | Relação | Baseline / prova |
| --- | --- | --- |
| Cadastro/Owner/feedback/política web | direct |3.0.4; Node fronteiras e browser em1448/390/320 |
| Troca/primeiro acesso | direct |Mesmo helper, mínimo12anterior; browser8e submit sintético, sem senha humana |
| Edge/Auth | critical_transversal |Edge atual e config.toml12; Deno negativos/handler; Auth hospedado6 informado pelo usuário, sem leitura direta |
| Conta/escopos/canonicalidade/e-mail | plausible_indirect |Handlers inalterados fora do mínimo; suíte Edge Owner/admin e browser anterior |
| RLS/banco/outros serviços | no_impact_identified |Nenhuma lógica/dados/migration muda; plano seletivo e demais contêineres |

ClasseD por validação de credencial. Bruno confirmou no chat17/10/2026 que o Auth já está em6 e esclareceu que deseja o requisito do Prisma em8, substituindo12. Esta revisão supersede D-02/CA-03 da1.0.0 somente quanto à exigência operacional de Auth hospedado8: publicação autorizada com piso hospedado6 compatível, preservado. Não há Q pendente. O config.toml expressa a configuração local8, sem provar configuração hospedada. Troca/primeiro acesso continuam com validação web8 e chamada direta ao Auth; a API nativa hospedada mantém seu piso6 existente. Não alegar que essa API exige8. Execução incorpora integralmente este acordo; sem validate integral local ou testes com contas reais.
