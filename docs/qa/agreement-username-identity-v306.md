# Username e e-mail compartilhado — acordo e execução 1.0.1

Bruno aprovou no chat de 17/10/2026 a proposta de username único com e-mail de contato repetível e autorizou implementação, integração em main e nova versão. Baseline 6f128509f1aca4134bda2e51765cb0ea6b10fc26 / runtime 3.0.5. Entrega 3.0.6, contrato operator-identity 2.0.0. Supersede somente a unicidade do e-mail e seu uso como identidade de produto nos contratos anteriores; IDs internos continuam sendo UUIDs.

- D-01: username global normalizado e único; aceitar o mesmo e-mail de contato em dois ou mais usuários distintos, inclusive grupos diferentes; não compartilhar identidade Auth, senha, sessão, papel ou escopo por e-mail.
- D-02: manter Supabase Auth. Novas contas recebem endereço técnico aleatório estável e exclusivo, separado do contato; login resolve username e identidade Auth por ID no servidor, conferindo o ID da sessão emitida. Endereço técnico nunca é destino de mensagem.
- D-03: ativação e recuperação usam links nativos de uso único do Auth enviados ao contato da conta solicitada. Recuperação pública exige username e retorna resposta neutra; não escolhe conta por e-mail compartilhado. Mensagem identifica username e finalidade. Remetente/provedor existentes, destino e redirect controlados pelo servidor; limite por conta, recibo operacional e ausência de tokens em logs/artefatos.
- D-04: preservar usuários existentes, IDs, senhas, vínculos, permissões e histórico, sem reset ou migração Auth em massa. Identidades legadas são resolvidas pelo Auth ID; alteração futura de contato converte endereço Auth legado para técnico via API oficial, de modo idempotente; falha de persistência preserva contato, ID e senha, mantendo o alias interno convertido e sem restaurar endereço Auth antigo. E-mail de contato não concede autoridade. Caixa compartilhada permite recuperar todas as contas a ela associadas, consequência apresentada na proposta aprovada.
- D-05: publicar migração, três Edge Functions afetadas e web, preservando JWT/configurações Auth/serviços adjacentes e ativos anteriores; sincronizar main/GitHub/VPS e comprovar CI, smoke e rollback.
- P-01: jamais resolver login/recuperação por primeira ocorrência de e-mail ou reutilizar Auth ID por e-mail; sessões/tokens de A não podem alterar B.
- P-02: não usar senha própria/armazenamento de senha, mudar RLS/perfis/planos, enviar mensagens a contas reais como teste, expor segredos/tokens ou remover histórico. Não criar fornecedor/destino/plano pago novo.
- F-01: SSO/MFA, troca de provedor Auth, fusão de contas, seleção de contas por e-mail, redefinição em massa, auditoria global ou redesign.
- A-01: adaptar primitivas oficiais generateLink/createUser/getUserById, transporte HTTPS existente, utilitário compartilhado de Edge e migração versionada; nenhuma dependência nova. Configuração de envio pode reutilizar a credencial protegida já instalada sem ler/expor seu valor em ferramentas ou alterar a fila de avaliações.
- CA-01: SQL local aceita contato duplicado e rejeita username/identidade duplicados; prova grants/RLS, limites concorrentes e preservação de IDs/escopos/histórico.
- CA-02: handlers reais com transportes sintéticos provam cadastro manual/ativação, login A/B com mesmo contato e senhas independentes, recuperação/primeiro acesso de A sem atingir B, negativos de identidade, status, escopo, complexidade, entrega/timeout e compensação.
- CA-03: browser no fluxo real com transporte sintético prova contato duplicado, Owner canônico, mínimo8/feedback/locks e mensagem de recuperação por username em desktop/mobile; tipos/build/targeted tests/contexto/CI PASS. Nenhuma credencial em fonte/evidência.
- CA-04: migração e fontes Edge conferidas no Prisma correto; web versão/SHA/rotas/assets e bloqueios anônimos, rollback retido, cinco serviços adjacentes preservados; evidência real de entrega humana permanece distinta de testes sintéticos.

## Mapa de impacto e validação mínima

| Área/capacidade | Relação | Baseline / prova proporcional |
| --- | --- | --- |
| Cadastro/edição de usuário e Owner | direct | 3.0.5; handlers, SQL e browser, locks/compensação/escopo |
| Login, ativação, recuperação, primeiro acesso | critical_transversal | três Edges atuais; testes de pares A/B, status, ID, senha e retorno neutro; sessão nativa preservada |
| Contato/índices/auditoria operacional | direct | índice e-mail único anterior; migration local com grants/negativos/concorrência e metadados antes/depois |
| Credencial/provedor de envio existente | plausible_indirect | configuração criptografada existente; somente getter protegido reutilizado, nenhuma fila/segredo alterado; teste sem destinatário real |
| Autorização/memberships/histórico | critical_transversal | Auth UUID mantém autoridade; regressão multiempresa e ausência de mutação em massa |
| Matching/IA/Tokens/Pessoas/outros serviços | no_impact_identified | não consomem contato como identidade; IDs e políticas permanecem; smoke seletivo/contêineres |

Risco D/E: boundary de identidade e compatibilidade documentado em ADR-086. Sem Q material pendente. Execução incorpora integralmente D/P/F/A/CA acima. Conclusão exige todos os D/P aplicáveis PASS, documentação/contexto, CI e publicação seletiva; testes humanos de e-mail não serão inventados nem substituídos por fixture. Sem suíte integral local.

Revisão1.0.1 esclarece a autonomia de compatibilidade de D-04: conversão interna monotônica elimina rollback de endereço roteável em corrida entre edições. Não altera o resultado aprovado (contato/ID/senha preservados em falha), autoridade, escopo, destino ou necessidade de coordenação humana. Não há migração Auth em massa.
