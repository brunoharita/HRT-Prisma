# ADR-027: Fronteira pública tokenizada para execução de assessments

- Status: accepted
- Date: 2026-09-01
- Owners: architecture, security, product, QA

## Context

O M5.1B permite que uma Pessoa execute uma verificação sem receber conta, membership ou acesso ao App Shell. Essa é a primeira fronteira pública do Prisma para dados de avaliação profissional.

## Decision

O acesso externo será mediado pela Edge Function `assessment-access`, configurada sem validação JWT da plataforma porque a Pessoa não é Usuário. A função exige token opaco criptograficamente aleatório, persiste somente SHA-256, aplica CORS explícito e rate limit em duas camadas e chama uma única RPC transacional executável apenas por `service_role`.

`anon` e `authenticated` não recebem DML direto nas tabelas de convite, tentativa, questão materializada, resposta, evento, métrica, integridade, avaliação ou evidência. A Edge Function nunca retorna answer key, rubrica interna, dificuldade, tempo esperado ou IDs enumeráveis fora do convite.

A emissão pelo operador usa a mesma Edge Function, mas exige sessão Supabase e delega a autorização à RPC `issue_m51b_invitation`, que valida tenant e papel com `private.require_document_reviewer`. Sem provider aprovado, o Prisma emite e exibe o link uma única vez, sem afirmar que e-mail ou WhatsApp foi enviado.

## Consequences

- Pessoa permanece separada de Usuário e não acessa RLS diretamente.
- Token bruto não pode ser recuperado do banco e reemissão exige novo token.
- A função usa secret key somente no runtime server-side.
- O rollout é restrito a local e Prisma-QA com dados sintéticos até decisão de base legal, retenção, hosting e privacidade.
- CORS atual libera apenas as origens locais documentadas do Prisma; hosting futuro exige revisão explícita.

## Validation

Testes devem provar token inválido, expirado e revogado; replay de início, autosave e submit; tentativa cruzada; questão de outra tentativa; ausência de answer key; RLS e grants; CORS; rate limit; resultado conforme policy; e criação única de Evidência Demonstrada.

## References

- `supabase/functions/assessment-access/index.ts`
- `supabase/migrations/20260901115938_m51b_verification_execution.sql`
- `docs/security/competency-verification-security.md`
- `docs/qa/competency-verification-test-plan.md`
