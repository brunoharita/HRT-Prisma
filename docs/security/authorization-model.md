# Modelo de autorização

## Estado

Papéis e políticas estão modelados na migration. O shell web local agora valida sessão com Supabase Auth e aplica route guards no browser. A autorização material continua no banco e a UI nunca é a única barreira.

## Papéis

| Ação | Admin | Recruiter/Talent | Hiring Manager/Search |
| --- | --- | --- | --- |
| Importar/cadastrar currículo | sim | sim | não |
| Ver documento bruto | sim | sim, por necessidade | não |
| Ver contato e PII completa | sim | sim, por necessidade | não |
| Ver perfil profissional estruturado | sim | sim | sim, dados necessários |
| Buscar pessoas | sim | sim | sim |
| Ver matching explicado | sim | sim | sim |
| Cadastrar vaga | sim | sim | não no contrato atual |
| Alterar critérios de vaga | sim | sim | não no contrato atual |
| Administrar organização e usuários | sim | não | não |
| Configurar provider/prompt/modelo | sim, fluxo controlado | não | não |
| Consultar auditoria | sim | limitado à operação, planejado | não |

## Enforcement

- Organização e papel vêm de `organization_memberships`, não de metadata editável pelo usuário.
- O shell web valida identidade com `supabase.auth.getClaims()` e consulta `organization_memberships` com chave publicável e RLS.
- Políticas usam `TO authenticated` com predicado de tenant e papel.
- `anon` não possui grants.
- Hiring manager não possui política de leitura para `documents` ou `person_private_data`.
- UPDATE exige `USING` e `WITH CHECK` quando aplicável.
- Função privilegiada fica em schema privado e tem execução restrita.
- Queries futuras devem filtrar explicitamente `organization_id` mesmo sob RLS para previsibilidade e performance.

## Fail-closed

Usuário sem sessão, membership, tenant, papel conhecido ou versão de política compatível recebe negação. Falha de serviço de autorização ou de carregamento de memberships não concede acesso. Service/secret key nunca vai para frontend e não é fallback de usuário.

## Operações privilegiadas

Provisionamento inicial, configuração de IA, exportação em massa, exclusão, retenção e alteração de membership exigem endpoint backend, checagem explícita, auditoria e proteção contra replay. `security definer` não é solução genérica de permissão.

## Testes obrigatórios antes de QA

- dois tenants, mesmos IDs lógicos e nenhum vazamento;
- cada papel em cada tabela/ação;
- usuário autenticado sem membership;
- tentativa de trocar `organization_id` em update;
- documento e PII negados a hiring manager;
- membership stale ou removida;
- função privada não executável por anon/public;
- grants da Data API e RLS testados separadamente.
