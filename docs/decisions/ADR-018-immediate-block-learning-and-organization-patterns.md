# ADR-018: Aprendizado imediato por bloco e padrões organizacionais controlados

- Status: accepted
- Data: 2026-08-28
- Owners: AI, application, data, security, product

## Contexto

A primeira versão adaptativa reinterpretava somente o campo corrigido a partir dos valores estruturados. Quando uma extração anterior já havia separado `Nov/12 - Abr/18` entre cargo e empresa, o separador desaparecia e nenhuma sugestão era produzida. Corrigir período não corrigia empresa ou descrição, aceitar sugestões deixava um rascunho local não salvo e a interface bloqueava a criação de nova evidência.

Esse comportamento não atendia ao objetivo de aprender imediatamente com cada revisão nem protegia o sistema contra a repetição do mesmo erro em novas importações.

## Decisão

- A correção humana confirmada por evidência volta à fonte original e relê o bloco completo da experiência. Valores estruturados incorretos não são usados como fonte de verdade.
- O bloco combina cargo, empresa, período e descrição, preservando um vínculo de evidência por campo. Cargos subordinados dentro de uma permanência na mesma empresa permanecem no mesmo bloco até que exista um contrato hierárquico próprio.
- O runtime localiza registros irmãos pelo conteúdo e pela ordem do documento, reinterpreta cada irmão separadamente e nunca replica o valor corrigido.
- Uma proposta somente é criada quando a fonte original reproduz a transformação confirmada no campo de origem. Campo já alterado por outra decisão humana nunca é sobrescrito.
- Registros sem bloco inequívoco permanecem sem proposta e recebem explicação visível. Ausência de proposta não é avaliação negativa.
- Sugestões são agrupadas por experiência e campo. O revisor pode aceitar um subconjunto, ignorar o conjunto ou retornar à fonte.
- O aceite chama `apply_profile_review_adaptive_suggestions`, que salva dados, revisão, mudanças, evento adaptativo e casos de aprendizado na mesma transação e com lock otimista. O frontend recarrega o rascunho sincronizado, mantendo a seleção de nova evidência disponível.
- `profile_review_adaptation_events` é append-only e armazena somente metadados limitados: caminhos de campo, página, método e código de justificativa. Valores, trechos e currículo integral não são duplicados.
- Casos aceitos continuam `candidate` durante o rascunho. Somente a aprovação integral da revisão os promove e atualiza `organization_extraction_patterns` no mesmo tenant.
- Padrões organizacionais são sinais estruturais versionados e contados, não templates executáveis. O parser aceita apenas chaves conhecidas da versão vigente e falha fechado para versão desconhecida.

## Consequências

Uma correção melhora imediatamente os registros ainda não revisados do mesmo documento. Depois da aprovação, o padrão estrutural passa a orientar a primeira extração de currículos futuros da organização, sem transformar uma correção isolada em regra global autônoma.

O contrato de perfil continua plano. Permanências com vários cargos são preservadas em um bloco com os cargos subordinados na descrição. Uma futura normalização hierárquica exigirá nova versão de perfil e ADR próprio.

## Segurança e privacidade

- RLS e `organization_id` isolam eventos, casos e padrões.
- A RPC exige sessão e papel de revisor por `private.require_document_reviewer`.
- DML direto permanece revogado.
- Payload adaptativo rejeita propriedades além de `fieldPath`, `pageNumber`, `evidenceMethod` e `rationaleCode`.
- Padrões não carregam valores pessoais nem texto de currículo.
- Idempotência, fingerprint e lock impedem replay divergente e edição concorrente silenciosa.

## Compatibilidade e versão

- `adaptive-resume-extraction`: 2.0.0.
- `extraction-draft`: 3.0.0.
- `person-ingestion`: 5.0.0.
- `human-profile-review`: 2.0.0.
- método de revisão: `prisma-document-learning-v2`.
- estruturação: `prisma-layout-adaptive-v2`.

Revisões antigas continuam legíveis. Quando `layout_blocks` está vazio, o mecanismo relê o texto de página e não inventa coordenadas. Padrões de versão desconhecida não são consumidos.

## Validação

- caso HRT sanitizado com empresa em linha posterior;
- recuperação de período que havia sido dividido entre cargo e empresa;
- agrupamento de permanência com cargos subordinados;
- preservação de campo já revisado manualmente;
- registro sem bloco seguro explicado e não alterado;
- aceite parcial e persistência atômica;
- teste conectado com rollback para autorização, lock, idempotência, evento, caso e promoção pós-aprovação;
- RLS, grants, advisors, typecheck, build, regressão e golden suite.

## Referências

- `web/src/domain/adaptiveResumeExtraction.ts`
- `web/src/components/review/AdaptiveSuggestionPanel.tsx`
- `web/src/pages/ProfileReviewPage.tsx`
- `supabase/migrations/20260828111135_adaptive_review_learning_v2.sql`
- `supabase/migrations/20260828112737_adaptive_review_learning_v2_rpc_fix.sql`
- `supabase/migrations/20260828115300_adaptive_review_learning_v2_fk_indexes.sql`
- ADR-003, ADR-004, ADR-011, ADR-016 e ADR-017
