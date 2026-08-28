# Modelo de autorização

## Estado

Foundation, M2-A, M2-B, M2-C e M5 estão ativos no Prisma-QA. `platform_users`, hierarquia `Grupo -> Empresa`, username, recuperação, gestão de usuários, ingestão, revisão com evidência espacial e Storage privado são aplicados no boundary correspondente e negam acesso quando sessão, status, papel ou tenant não são confirmados.

## Papéis

| Perfil | Escopo | Resumo |
| --- | --- | --- |
| Super Admin | plataforma inteira | controla todos os grupos e empresas; único com autoridade global |
| Owner | um grupo | controla todas as empresas do grupo e administra usuários/configurações do próprio grupo |
| Admin | uma ou mais empresas de um único grupo | administra somente seu subconjunto explícito de empresas |
| Recruiter | uma ou mais empresas de um único grupo | opera Talent Intelligence no próprio escopo sem administrar usuários |
| Member | uma empresa | atua operacionalmente na empresa atribuída, sem administrar papéis ou escopos |

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

## Evidência conectada em QA

Em 2026-08-24, QA confirma foundation, corte de papéis M2-A, Edge Functions de login/recuperação/usuários, M2-B e M2-C. A sessão `harita.super` foi validada como Super Admin. Operações sintéticas comprovaram versões concorrentes 1/2/3, retry vinculado, revisão, aprovação atômica e replay idempotente. Owner, Admin e Recruiter revisaram no próprio escopo; Member recebeu zero documentos e não iniciou revisão.

Em 2026-08-27, uma transação revertida confirmou a mutação M5 para Admin. Coordenada fora do contrato e sessão Member falharam antes de persistir. As três tabelas M5 mantêm RLS e somente leitura direta para papéis revisores.

Em 2026-08-28, transações revertidas no Prisma-QA confirmaram negação sem JWT, aceite adaptativo atômico, replay idempotente, incremento de lock e promoção de padrão somente depois de `approve_profile_review`. Nenhum evento ou padrão de teste permaneceu no banco.

## Fail-closed

Usuário sem sessão, membership, tenant, papel conhecido ou versão de política compatível recebe negação. Falha de serviço de autorização ou de carregamento de memberships não concede acesso. Service/secret key nunca vai para frontend e não é fallback de usuário.

## Operações privilegiadas

Provisionamento inicial, login por username, recuperação de acesso, alteração de perfil/escopo, exclusão, retenção e exportação em massa exigem endpoint backend, checagem explícita, auditoria e proteção contra replay. `security definer` não é solução genérica de permissão; no M2-C/M5 ele é uma exceção controlada para transações compostas com DML direto revogado.

## Testes obrigatórios antes de QA

- dois tenants, mesmos IDs lógicos e nenhum vazamento;
- cada perfil em cada tabela/ação;
- usuário autenticado sem membership;
- tentativa de trocar `organization_id` em update;
- documento e PII negados a `member`;
- membership stale ou removida;
- função privada não executável por anon/public;
- grants da Data API e RLS testados separadamente.
