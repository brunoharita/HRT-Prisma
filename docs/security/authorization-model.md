# Modelo de autorização

## V3M0 — tenant-authorization2.0.0

Bruno17/10/2026 definiu quatro perfis e autorizou execução com parâmetros delegados. Admin legado converge para Recruiter; alias/enum/histórico preservados. Grupo não compartilha dados. `organization_administration`1.0.0 exige versão, ator ativo, escopo vivo, revisão e locks; gravação administrativa/auditoria atômicas. `save_platform_user_v3` exclusivo service_role revalida ator/escopo e persiste usuário/memberships/auditoria juntos; Edge verifica a sessão e compensa somente identidade recém-criada que falhou. Nenhum privilégio por metadata editável.

Plano/capacidade não concedem autoridade; tabela privada de configuração sem grants de cliente e com RLS. Principal/Owner/limite/versão verificados no servidor. Um Owner ativo ou pendente por grupo, sem troca por edição genérica; comum admite múltiplos vínculos do grupo, empresa padrão resolvida no servidor e sem seletor. Vínculo local não apaga nem revela empresas alheias ao escopo do Recruiter. Super mantém autoridade global inclusive consulta das empresas inativas; demais perfis não operam empresa/grupo inativo. Portais emitidos e liquidação mantêm contratos próprios. Acordo/ADR-085 e AoT V3M0 registram provas e rollout; referências anteriores abaixo são históricas quando divergirem deste delta.

## Acompanhamento Pessoa–Posição v2.2.0

Papéis existentes de Posições: super_admin ativo autorizado ou owner/admin/recruiter da organização, confirmados no servidor por auth.uid(), platform_users e organization_memberships. Member não recebe acesso. Responsável deve ser operador ativo autorizado da organização; atribuição não concede papel. As três tabelas têm organização, FKs compostas, RLS e nenhum grant direto a anon/authenticated/service_role. Somente RPCs SECURITY DEFINER com search_path vazio e checagem viva. Payload aceita campos da ação, nunca score. Revisões/versões obsoletas são recusadas; histórico obrigatório atômico. Só idade derivada sai do servidor, sem nascimento/contato/currículo integral. Notas não são publicadas no Perfil/Knowledge. Negativos e evidência de ambiente no AoT2.2.0.

## Estado

Foundation, M2-A, M2-B, M2-C e M5 estão ativos no Prisma-QA. `platform_users`, hierarquia `Grupo -> Empresa`, username, recuperação, gestão de usuários, ingestão, revisão com evidência espacial e Storage privado são aplicados no boundary correspondente e negam acesso quando sessão, status, papel ou tenant não são confirmados.

Publicação de perfil usa somente `publish_profile_review` para clientes autenticados. A primitiva `approve_profile_review` não possui grant para `authenticated`; o wrapper autorizado valida tenant e papel, preserva omissões, registra remoções explícitas em ledger RLS e promove a versão na mesma transação.

## Papéis

| Perfil | Escopo | Resumo |
| --- | --- | --- |
| Super Admin | plataforma inteira | controla todos os grupos e empresas; único com autoridade global |
| Owner | um grupo | controla todas as empresas do grupo e administra usuários/configurações do próprio grupo |
| Recruiter | uma ou mais empresas de um único grupo | administrador das empresas explicitamente vinculadas; administra Recruiters/comuns no escopo e cria empresas dentro do plano |
| Usuário comum (`member`) | vínculos no mesmo grupo, operação pela empresa padrão | somente funcionalidades comuns, sem gestão de papéis/escopos ou seletor de empresa |

## Enforcement

- Organização, grupo, perfil e status vêm de `platform_users`, `organization_groups`, `organizations` e `organization_memberships`, não de metadata editável pelo usuário.
- O shell web valida identidade com `supabase.auth.getClaims()`, consulta o operador autenticado via `platform_users` e resolve as empresas visíveis com `organization_memberships` e RLS.
- Políticas usam `TO authenticated`, status ativo e predicado de tenant/escopo.
- `anon` não possui grants.
- Username e recuperação de acesso passam por Edge Functions server-side para não expor resolução `username -> email` no browser.
- `member` não lê `person_private_data` nem `documents`.
- UPDATE exige `USING` e `WITH CHECK` quando aplicável.
- RPC privilegiada pública usa `security definer` somente quando há checagem explícita de ator, organização, papel e estado, `search_path` fixo e DML direto revogado.
- O event trigger opcional `public.rls_auto_enable()` preserva execução apenas para papéis privilegiados; `PUBLIC`, `anon` e `authenticated` não recebem `EXECUTE`.
- As queries web de domínio filtram explicitamente `organization_id` mesmo sob RLS para previsibilidade e performance.
- Intake de currículo, identificação de duplicidade e resolução são permitidos apenas a Super Admin, Owner, Admin e Recruiter no escopo confirmado. `Member`, sessão sem membership e tenant divergente falham fechados.
- Correspondências de identidade são consultadas dentro da organização pela RPC; a UI não recebe indicação de Pessoa existente em outro tenant.
- Regiões, vínculos e eventos M5 são legíveis somente por Super Admin, Owner, Admin e Recruiter autorizados. `authenticated` não possui DML direto; `record_profile_review_evidence` valida escopo, estado, lock, versão e coordenadas antes de qualquer mutação.
- Aceites adaptativos usam `apply_profile_review_adaptive_suggestions`, que exige sessão revisora, tenant, review aberto, lock e payload metadata-only. Eventos, casos e padrões têm RLS; DML direto permanece revogado e padrão só é promovido pela aprovação integral.
- Vagas, versões, requisitos, relações locais e avaliações M5.4 são legíveis apenas por Super Admin, Owner, Admin e Recruiter no escopo confirmado. `save_vacancy_definition` valida tenant e papel em `security definer` com `search_path` vazio; `member`, `anon`, referências cross-tenant e DML direto das tabelas versionadas falham fechados.
- A pesquisa Web contextual de Vagas exige sessão ativa, Super Admin ou membership Owner, Admin ou Recruiter na organização informada e `allow_external_knowledge_enrichment = true`. O ledger possui RLS para os mesmos papéis; `anon`, Member, cross-tenant e DML direto falham fechados.
- A exclusão definitiva de outra Pessoa exige Super Admin, Owner ou Recruiter no escopo resolvido no backend (V3M0). Usuário comum é negado. A própria Pessoa usa capability separada da conta de operador e de assessment, vinculada a tenant, Pessoa, finalidade e versão, armazenada por hash, curta, revogável e de uso único. `anon` e `authenticated` não recebem DML direto no ledger, plano de Storage ou capabilities; autoatendimento e finalização pertencem ao boundary `service_role` da Edge Function.

## Evidência conectada em QA

Em 2026-08-24, QA confirma foundation, corte de papéis M2-A, Edge Functions de login/recuperação/usuários, M2-B e M2-C. A sessão `harita.super` foi validada como Super Admin. Operações sintéticas comprovaram versões concorrentes 1/2/3, retry vinculado, revisão, aprovação atômica e replay idempotente. Owner, Admin e Recruiter revisaram no próprio escopo; Member recebeu zero documentos e não iniciou revisão.

Em 2026-08-27, uma transação revertida confirmou a mutação M5 para Admin. Coordenada fora do contrato e sessão Member falharam antes de persistir. As três tabelas M5 mantêm RLS e somente leitura direta para papéis revisores.

Em 2026-08-28, transações revertidas no Prisma-QA confirmaram negação sem JWT, aceite adaptativo atômico, replay idempotente, incremento de lock e promoção de padrão somente depois de `approve_profile_review`. Nenhum evento ou padrão de teste permaneceu no banco.

## Fail-closed

No Cadastrar Owner contextual3.0.1, os quatro campos bloqueados também são validados antes de provisionar Auth. As RPCs novas são service-only; Edge extrai o ator da sessão verificada e consulta grupo/primeira empresa/username no banco. A persistência revalida contexto sob o mesmo lock de grupo, recusa identidade já cadastrada e audita atomicamente antes de concluir. Rotas/IDs enviados pelo cliente são seletores não confiáveis, nunca prova de autoridade. Falha posterior compensa exclusivamente a identidade criada por aquela solicitação. Nenhuma alteração dos dados de Owners anteriores ou exceção às permissões genéricas. Contrato owner-onboarding-1.0.0.

A ponte temporária Paddle (`paddle-hosted-transport-1.0.0`, ADR-058) valida a sessão via Supabase Auth e consulta operador ativo, organização e membership via REST/RLS com o token do usuário. Só Super Admin/Owner/Admin/Recruiter no escopo podem encaminhar documentos. Origem/versão/tenant ausentes ou desconhecidos falham fechados; a flag de rollout não concede autoridade. Não há chave privilegiada, novo grant ou migration. O gateway escuta socket Unix privado e os workers/túneis ficam em loopback. O corpo não é registrado ou persistido pelo gateway.

Usuário sem sessão, membership, tenant, papel conhecido ou versão de política compatível recebe negação. Falha de serviço de autorização ou de carregamento de memberships não concede acesso. Service/secret key nunca vai para frontend e não é fallback de usuário.

## Operações privilegiadas

Provisionamento inicial, login por username, recuperação de acesso, alteração de perfil/escopo, exclusão, retenção e exportação em massa exigem endpoint backend, checagem explícita, auditoria e proteção contra replay. `security definer` não é solução genérica de permissão; no M2-C/M5 ele é uma exceção controlada para transações compostas com DML direto revogado.

No M5.2, somente `service_role` executa staging, validação, diff e publicação de source versions. A publicação também exige o UUID de um Super Admin ativo e registra sua autoria no change set. `authenticated` pode ler staging apenas quando Super Admin e não possui INSERT. Decisões de alias/proposta exigem o administrador Knowledge apropriado e validam tenant; um alias Organization nunca é visível fora de sua organização.

## Testes obrigatórios antes de QA

- dois tenants, mesmos IDs lógicos e nenhum vazamento;
- cada perfil em cada tabela/ação;
- usuário autenticado sem membership;
- tentativa de trocar `organization_id` em update;
- documento e PII negados a `member`;
- membership stale ou removida;
- função privada não executável por anon/public;
- grants da Data API e RLS testados separadamente.

Ordenação3.0.3: organization-administration1.1.0 aceita1.0.0 e projeta apenas createdAt/updatedAt dos mesmos grupos/empresas já visíveis. Função preserva integralmente ator, filtros, locks, mutações, search_path e ACL fora das três substituições aditivas verificadas. Sem grant novo, acesso comum, RLS ou escrita de datas/histórico.

password-policy1.1.0 (3.0.5): mínimo8por decisão explícita de Bruno17/10/2026, mantendo complexidade/confirmação/gates atuais. Cadastro/Owner validam no cliente e Edge; troca/primeiro acesso usam cliente e Supabase Auth. config.toml local não comprova política hospedada; Bruno confirmou Auth hospedado6, compatível com8 e preservado. A API nativa mantém seu piso6 existente; troca/primeiro acesso exigem8 no cliente antes da chamada direta ao Auth. Cadastro/Owner também exigem8 na Edge. Esta entrega não endurece a API nativa hospedada; ver acordo1.0.1/AoT password-minimum-v305. Nenhuma conta existente é alterada por reduzir o limite.

## operator-identity2.0.0

Contato de e-mail deixa de ser único; username global e Auth UUID continuam exclusivos. Autorização permanece por Auth UUID e memberships, nunca pelo contato/alias/metadata. Login resolve Auth por UUID e confere ID da sessão; recuperação pública apenas username e resposta neutra. generateLink recovery oficial por Auth identity, envio ao contato autorizado da conta, username na mensagem, redirect fixo e claim/limite/recibo privado sem token. Getter de configuração de envio exclusivo service_role; cliente não obtém segredo ou lookup de endereço técnico. Contas legadas operam sem backfill; mudança de contato converte endereço Auth via API idempotente. E-mail compartilhado permite recuperação das contas a quem controla a caixa. RLS/perfis/planos e mínimo8 permanecem; versões/JWT/rollout e limitações humanas no AoT username-identity-v306.
