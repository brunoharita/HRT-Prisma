# ADR-024: Person, document, and current-profile state boundary

- Status: accepted
- Date: 2026-08-30
- Owners: Product, Engineering, Security, QA

## Context

Pessoa, documento importado, tentativa de processamento, revisão humana e perfil profissional já são entidades separadas no modelo persistido. A interface, porém, reutilizava `people.profile_state` como estado principal da Pessoa e mostrava, na central documental, somente o perfil produzido pelo próprio documento. Uma importação parcial ou uma tentativa com erro podia, assim, parecer uma falha da Pessoa ou uma perda do perfil vigente.

## Problem

Definir uma representação e uma navegação únicas que preservem a Pessoa e o perfil atual enquanto uma nova fonte documental passa por processamento e revisão, inclusive quando a extração é parcial ou falha tecnicamente.

## Decision

- A Pessoa é a raiz estável de navegação. Nome e ação `Abrir` levam à Central da Pessoa; edição é sempre uma ação explícita.
- O perfil atual é a única linha de `professional_profiles` da Pessoa com `superseded_at is null`. Sua apresentação não deriva do estado da última importação.
- A situação operacional deriva do documento, de `review_state` e da tentativa mais recente por meio do contrato local `document-presentation` 1.1.0.
- `ready_for_review` e `in_review` significam `Requer revisão`; somente estados `failed_*` da tentativa significam `Falha técnica`.
- Documento vN e Perfil vN permanecem versões independentes. Documento preservado sem aprovação comunica `Nenhuma nova versão criada`.
- Extração parcial não bloqueia a abertura da revisão. Experiência ausente recebe recuperação assistida por seleção espacial ou inclusão manual no workspace M5.
- Na Central da Pessoa, `Ver documento` abre o mesmo workspace M5 com o currículo original à esquerda e os campos extraídos e revisados à direita, em modo estritamente somente leitura. Metadados, tentativas e auditoria permanecem acessíveis por `Detalhes técnicos`.
- Descartar uma importação significa invalidar sua pendência de revisão de forma auditável. A RPC `invalidate_document_review` preserva documento, tentativa, revisão, eventos e perfil atual; não executa `DELETE` e falha fechada quando `status` ou `review_state` indica aprovação ou quando o documento ainda não está vinculado a uma Pessoa.

## Alternatives considered

- Manter `people.profile_state` e apenas trocar badges: rejeitado porque preservaria a mistura entre entidade e operação.
- Criar novas tabelas de estado de UX: rejeitado porque documento, tentativa, revisão e perfil já contêm os fatos necessários.
- Apagar o documento descartado: rejeitado por quebrar proveniência, auditoria e retenção de evidência.
- Tornar reprocessamento a ação principal: rejeitado porque uma nova tentativa pode repetir a mesma limitação de reconhecimento e não substitui revisão humana.

## Reasons for the choice

O modelo composto usa fontes autoritativas já existentes, mantém a semântica M2-B/M2-C/M5, evita schema paralelo e oferece uma saída rastreável para toda pendência exibida.

## Positive consequences

- Falha ou pendência documental não contamina a identidade da Pessoa nem o perfil vigente.
- Ação principal e próximo passo passam a ser explicáveis.
- Navegação converge na Central da Pessoa e reduz saltos para formulários técnicos.
- Consulta documental preserva o contexto visual da revisão sem expor ações de edição, salvamento, seleção de evidência ou aprovação.
- Revisão parcial continua evidence-first e recuperável.

## Negative consequences

- Listagens precisam compor Pessoas, documentos, tentativas e perfis atuais.
- O descarte de uma importação revisável inicia ou reutiliza uma revisão antes de invalidá-la, para manter uma trilha formal.
- O estado `people.profile_state` continua existindo por compatibilidade, mas não é autoridade visual do perfil atual.

## Risks

- Consulta composta pode aumentar o volume lido em organizações muito grandes.
- Clientes antigos podem continuar interpretando `people.profile_state` como estado completo da Pessoa.
- Corrida entre início, aprovação e invalidação de revisão pode produzir conflito operacional.

## Mitigation

- Consultas permanecem tenant-scoped e agrupadas, sem N+1.
- A RPC bloqueia a revisão draft antes do documento, rejeita documento aprovado e exige estado falho ou revisável.
- Operações são idempotentes, autorizadas por `private.require_document_reviewer` e registradas em `document_operations` e `person_ingestion_events`.

## Technical impact

Novo view model local, composição adicional em `personIngestionService`, reorganização das quatro telas e uma RPC aditiva. Auth, sessão, papéis, RLS, tabelas e enums permanecem inalterados.

## Data impact

Nenhuma tabela, coluna ou enum novo. Invalidação atualiza somente `profile_reviews.state/invalidated_at` quando existe revisão e `documents.review_state`; histórico e dados-fonte são retidos.

## Security and LGPD impact

As leituras continuam filtradas por `organization_id` e RLS. A mutação é `SECURITY DEFINER` com `search_path` vazio, autorização interna, privilégio mínimo e sem conteúdo integral do documento no evento.

## AI impact

Nenhum prompt, modelo, score, inferência ou extração muda. Ausência de reconhecimento continua sendo pendência diagnóstica, nunca fato negativo sobre a Pessoa.

## Compatibility

Documentos e revisões históricos permanecem legíveis. O estado `invalidated` existente passa a ter uma operação pública controlada. Clientes que não conhecem `document-presentation` podem continuar lendo os estados persistidos, mas não devem condensá-los no estado da Pessoa.

## Validation strategy

Testes determinísticos cobrem perfil v1 preservado com documento v2 em revisão, processamento concluído, falha técnica, ausência de importação, navegação para a Central da Pessoa, visualização documental M5 sem mutações, recuperação de experiência ausente e invariantes da RPC. QA conectado deve provar autorização, preservação de perfil, ausência de `DELETE`, idempotência e remoção da pendência ativa.

## Review criterion

Reavaliar se o volume de Pessoas exigir paginação server-side, se o processamento passar a ser assíncrono em outro serviço ou se múltiplas importações simultâneas precisarem de prioridade explícita.

## Replacement criterion

Substituir somente por um contrato versionado que mantenha Pessoa, documento, tentativa, revisão e perfil como entidades rastreáveis e preserve compatibilidade histórica.

## References

- `docs/architecture/document-review-contract.md`
- `web/src/domain/documentPresentation.ts`
- `web/src/infrastructure/supabase/personIngestionService.ts`
- `supabase/migrations/20260831022615_invalidate_document_review.sql`
- `supabase/migrations/20260831025456_invalidate_document_review_approved_guard.sql`
- `tests/documentPresentation.test.ts`
- ADR-011, ADR-016 e ADR-023

## Change history

- 2026-08-30: accepted with local implementation and QA validation pending.
- 2026-08-31: `document-presentation` 1.1.0 separa visualização curricular M5, somente leitura, de detalhes técnicos.
