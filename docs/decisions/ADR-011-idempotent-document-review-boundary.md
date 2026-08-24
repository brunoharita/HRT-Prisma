# ADR-011: Fronteira idempotente de documentos e revisão humana

- Status: accepted
- Data: 2026-08-24
- Owners: application, data, security

## Contexto

O M2-C precisa registrar documentos, tentativas, revisões e aprovação de perfil sem duplicar versões em retry ou concorrência. A UI e mutações diretas não podem decidir números de versão, substituir evidências nem promover um perfil parcialmente aprovado.

## Decisão

- Operações compostas usam RPCs PostgreSQL idempotentes com `organization_id`, ator, chave de operação e fingerprint do payload.
- `document_operations` registra resultado e replay seguro; locks por pessoa/documento serializam alocação de versões e tentativas.
- Revisões usam estado explícito, revisões imutáveis e alterações por campo; salvar rascunho não altera o perfil vigente.
- Aprovação cria uma nova versão de `professional_profiles`, encerra a revisão e troca o perfil atual na mesma transação.
- As RPCs críticas são `security definer` com `search_path` fixo, checagem explícita de sessão, tenant, papel e status. DML direto nas tabelas críticas é revogado de `authenticated`.
- `Member` não acessa documento bruto nem revisão. Super Admin, Owner, Admin e Recruiter atuam apenas no escopo autorizado.
- Eventos de auditoria persistem referências operacionais, nunca texto integral do currículo ou payload completo do perfil.

## Consequências

Retries podem devolver o mesmo resultado sem criar novas versões. Conflitos reais retornam erro de domínio e exigem refresh/revisão. O banco, não o frontend, é a autoridade para versionamento, autorização e promoção do perfil.

As seis RPCs públicas do movimento aparecem como `security definer` no advisor. Esse uso é intencional e controlado pelos checks internos e pela revogação de DML; qualquer nova RPC privilegiada exige revisão equivalente.

## Evidência

- Migration `20260824190000_m2c_document_reliability_review.sql` e forward fixes `20260824220000` a `20260824225000`.
- Testes `tests/m2DocumentReliabilityReview.test.ts`.
- Validação conectada `scripts/validate-m2c-connected.mjs` no Prisma-QA.
- Contrato proprietário `docs/architecture/document-review-contract.md`.

## Rollback

Desativar as rotas de revisão e aplicar forward fix que revogue as RPCs. Não apagar operações, revisões, alterações, perfis ou auditoria já persistidos.
