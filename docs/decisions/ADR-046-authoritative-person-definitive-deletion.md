# ADR-046: Exclusão definitiva autoritativa de Pessoa

- Status: accepted
- Date: 2026-09-09
- Owners: product, security and data engineering

## Context

Arquivar Pessoa é reversível, enquanto o titular ou um administrador autorizado precisa poder eliminar definitivamente o agregado individual. O domínio atual distribui dependências entre PostgreSQL, Storage, Perfil, revisão, matching, M5.1, Knowledge e merge. Uma sequência de exclusões no navegador não preservaria autoridade, idempotência, retomada nem verificação de resíduos.

## Decision

Adotar uma única saga autoritativa `person-definitive-deletion-1.0.0` para exclusão administrativa e autoexclusão. A operação possui ledger desacoplado de `people`, snapshot mínimo do nome, chave idempotente, preflight, lock `deleting`, plano de Storage, purga SQL ordenada e verificação determinística antes de `completed`.

Administradores entram pela Edge Function `person-data-deletion` com sessão autenticada. O titular entra pela mesma função usando uma capability exclusiva `person-data-self-service-1.0.0`, curta, revogável, de uso único, armazenada por hash e emitida somente após confirmação operacional de prova fora de banda. O token não recebe `person_id` do cliente e não compartilha autoridade com assessments.

O ledger mínimo preserva nome, organização, ator, data, operação e resultado. Não preserva contato, currículo, respostas, evidência textual ou payload profissional. Knowledge, Vagas, Item Bank e usuários da plataforma permanecem; proveniências individuais são removidas ou desacopladas.

## Alternatives considered

- Estender `document_operations`: rejeitado porque a exclusão de Pessoa precisa sobreviver à remoção do Documento e possui ator de titularidade distinto.
- Usar cascata genérica a partir de `people`: rejeitado porque Storage, recursos compartilhados, merge, auditoria e locks exigem decisões explícitas.
- Criar pipeline separado para o titular: rejeitado porque duplicaria regras de purga e verificação.
- Introduzir serviço externo de identidade ou e-mail: rejeitado para este movimento; a emissão depende de prova fora de banda confirmada pelo operador e não cria custo ou provider.

## Consequences

Positivas: autoridade server-side, bloqueio imediato, replay seguro, retomada de falha de Storage, auditoria mínima e uma única semântica de purga. Negativas: a etapa de Storage exige coordenação por Edge Function e a prova de titularidade continua operacional, não um portal completo.

## Security and LGPD impact

`anon` e `authenticated` não recebem DML direto nas tabelas da saga. Somente `service_role` executa a fronteira de autoatendimento e a finalização. Super Admin, Owner e Admin são validados no backend; Recruiter e Member são negados. A capability é HMAC, single-purpose, tenant/person scoped, curta, revogável e consumida antes da purga. CORS aceita somente origens locais configuradas.

## Compatibility

Perfis e documentos históricos são removidos pelo grafo relacional real, sem exigir shape recente ou backfill. A mesma identidade pode ser cadastrada no futuro com novo `person_id`; o ledger antigo não participa de deduplicação.

## Validation strategy

Testes determinísticos, prova SQL transacional rica em Prisma-QA, matriz de papéis, autoexclusão e replay, grants/RLS, falha parcial de Storage, preservação de Knowledge/Item Bank/Usuários, recadastro e smoke visual seguro. Produção fica fora de escopo.

## References

- `supabase/migrations/20260909175124_person_definitive_deletion.sql`
- `supabase/functions/person-data-deletion/index.ts`
- `docs/qa/person-definitive-deletion.md`
- `tests/personDefinitiveDeletion.test.ts`

## Change history

- 2026-09-09: accepted and active in Prisma-QA; no production rollout.
