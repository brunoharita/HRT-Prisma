---
owner: architecture
status: partially_implemented
version: 0.2.0
last_verified: 2026-09-01
---

# Arquitetura do M5.1 - Verificação de Competências

## Estado

Este documento descreve a arquitetura do plano completo M5.1 e a fatia M5.1A já implementada localmente. O M5.1A possui migration, tabelas, RLS, RPCs, contratos determinísticos, testes e UI interna de preparação. Não existem ainda convite, tentativa, resposta da Pessoa, correção, telemetria de execução, integridade, Evidência Demonstrada, reavaliação pós-assessment, Edge Function ou produção separada.

## Bounded context

O M5.1 pertence ao domínio de Talent Intelligence e se conecta a Pessoa, Perfil profissional, Knowledge, Vaga, Matching, evidências e auditoria. Ele não cria decisão de contratação, não consolida senioridade e não transforma Pessoa em Usuário.

## Agregados planejados

| Agregado | Responsabilidade | Escopo |
| --- | --- | --- |
| Verification Need | lacuna de evidência para Pessoa, competência e necessidade profissional | tenant |
| Verification Policy | regra organizacional de suficiência e obrigatoriedade | tenant |
| Verification Definition | contrato versionado de como demonstrar uma competência | global ou tenant, conforme origem |
| Assessment Blueprint | cobertura exigida para uma verificação | global ou tenant |
| Assessment Instance | composição entregue a uma Pessoa | tenant |
| Assessment Attempt | execução, respostas, tempo e eventos | tenant |
| Demonstrated Evidence | evidência resultante, separada do Perfil factual | tenant |
| Global Assessment Item Bank | acervo compartilhado governado pelo Prisma | global |
| Organization Assessment Item Bank | acervo privado da organização | tenant |

## Implementação M5.1A

Arquivos principais:

| Camada | Implementação |
| --- | --- |
| Domínio puro | `src/domain/competencyVerification.ts` |
| Matching | `src/ai/matching.ts` expõe `verificationSufficiency` quando requisito traz nível, criticidade e policy |
| Schema | `supabase/migrations/20260901082542_m51a_verification_intelligence.sql` e hardening `20260901111841_m51a_grant_hardening.sql` |
| Web service | `web/src/infrastructure/supabase/competencyVerificationService.ts` |
| UI | `web/src/pages/CompetencyVerificationPage.tsx` e rota `/matching` |
| Testes | `tests/competencyVerification.test.ts` |

Tabelas implementadas:

- `verification_definitions`
- `verification_policies`
- `verification_needs`
- `assessment_blueprints`
- `assessment_rubrics`
- `assessment_item_families`
- `assessment_items`
- `prepared_assessments`
- `verification_audit_events`

RPCs implementadas:

- `ensure_m51a_demo_need(p_organization_id uuid)`: cria ou atualiza uma necessidade demonstrativa para a organização ativa a partir de Pessoa, Vaga e Requisito existentes, sob autorização de reviewer.
- `load_m51a_verification_workspace(p_organization_id uuid)`: carrega necessidades, definições, blueprints, rubricas, resumo do Item Bank e preparações existentes.
- `prepare_m51a_assessment(p_need_id uuid, p_definition_id uuid, p_blueprint_id uuid, p_status text, p_idempotency_key text)`: compõe instrumento deterministicamente a partir do blueprint e grava rascunho ou preparação.

Todas as tabelas públicas novas têm RLS habilitado, grants explícitos para `authenticated` e revogação de `anon`. As RPCs `security definer` usam `set search_path = ''`, chamam `private.require_document_reviewer(...)` antes de mutações tenant-owned e registram auditoria metadata-only.

O hardening M5.1A garante que `verification_needs`, `prepared_assessments` e `verification_audit_events` tenham apenas leitura direta para `authenticated`; criação e alteração de necessidades e preparações passam pelas RPCs autorizadas.

## Escopo global e organizacional

Knowledge Global e Organization overlay continuam separados. A mesma regra vale para avaliação:

| Domínio | Global | Organização |
| --- | --- | --- |
| Knowledge | conceitos e relações canônicas | especialização tenant-owned |
| Verification Definition | capacidade verificável e dimensões gerais | especializações aprovadas da organização |
| Item Bank | itens compartilháveis e governados | itens privados, sem promoção automática |
| Policy | não aplicável como regra de cliente | suficiência exigida pela organização |

Item de organização nunca é promovido automaticamente para o banco global por propriedade intelectual, confidencialidade, qualidade ainda não validada e risco de vazamento entre tenants.

## Contratos conceituais

### Verification Need

Campos mínimos planejados:

```text
organization_id
person_id
professional_need_type
professional_need_id
competency_concept_id
expected_level
criticality
available_evidence_refs[]
insufficient_evidence_explanation
applied_policy_id?
state
reason_codes[]
created_by
created_at
updated_at
version
```

### Verification Definition

Define se uma competência é verificável, dimensões mensuráveis, dimensões por nível, modalidades adequadas, níveis verificáveis, dimensões obrigatórias, sinais de demonstração suficiente e limites metodológicos.

Exemplo para SQL: seleção e filtragem, joins, agregações, subqueries, CTE, window functions, manipulação de dados, otimização, plano de execução e interpretação do resultado.

### Assessment Blueprint

Define competência, versão, nível-alvo, modalidade, duração, dimensões, cobertura mínima, distribuição de dificuldade, quantidade de itens, critérios mínimos, rubrica, navegação, tentativas, randomização e itens ou famílias obrigatórias/proibidas.

### Item

Item deve possuir competência, dimensão, nível-alvo, dificuldade, modalidade, tipo, idioma, tempo esperado, objetivo, família, variante, rubrica, versão, origem, status, calibração, exposição, recência e validade tecnológica.

### Demonstrated Evidence

Evidência demonstrada deve registrar necessidade, assessment, tentativa, definição, blueprint, item versions, rubrica, resultado bruto, interpretação, cobertura, integridade, confiança explicável, limitações, ator/método e timestamp.

## Nível, dificuldade e resultado

São contratos independentes:

| Conceito | Exemplo | Regra |
| --- | --- | --- |
| Nível-alvo da competência | avançado | domínio que se pretende observar |
| Dificuldade do item | alta | dificuldade daquela questão ou tarefa |
| Nível demonstrado | intermediário | interpretação da tentativa conforme rubrica e cobertura |

Não usar senioridade como label primário de item. Rótulos por senioridade devem ser evitados; preferir competência SQL, nível-alvo avançado, dimensão window functions, dificuldade alta.

## Fluxo arquitetural

```mermaid
flowchart TD
  A[Necessidade profissional] --> B[Requisito]
  B --> C[Competencia normalizada]
  C --> D[Pessoa encontrada]
  D --> E[Evidencias existentes]
  E --> F[Evidence Sufficiency Engine]
  F --> G[Verification Need]
  G --> H[Assessment Blueprint]
  H --> I[Assessment Composer]
  I --> J[Assessment Instance]
  J --> K[Attempt]
  K --> L[Rubric Evaluation]
  L --> M[Demonstrated Evidence]
  M --> N[Reavaliacao do Matching]
```

## Item Bank e Composer

O Assessment Composer deve usar blueprint, competência, dimensão, nível, dificuldade, modalidade, idioma, calibração, exposição recente, itens já recebidos pela Pessoa, cooldown, família, política da organização, qualidade e versão.

Randomização pura não é suficiente. Dois assessments podem ter itens diferentes e ainda serem equivalentes se preservarem definição, blueprint, distribuição, rubrica e qualidade.

Fluxo de cold start:

```text
assessment solicitado -> blueprint -> busca no Item Bank
  -> cobertura suficiente? -> compor assessment
  -> lacuna? -> gerar somente itens faltantes
  -> revisao humana -> aprovar -> uso controlado
  -> calibracao posterior
```

## Eventos planejados

Eventos devem ser append-only e metadata-only quando possível: `verification_need_created`, `sufficiency_evaluated`, `verification_requested`, `assessment_prepared`, `invite_sent`, `attempt_started`, `item_presented`, `answer_saved`, `page_hidden`, `page_visible`, `focus_lost`, `focus_returned`, `attempt_completed`, `attempt_expired`, `attempt_marked_inconclusive`, `rubric_evaluated`, `demonstrated_evidence_recorded`, `matching_reevaluated`.

Eventos de browser são sinais observáveis. Eles não provam consulta externa, fraude ou intenção. Qualquer interpretação precisa ser versionada, testável e ligada à questão ativa.

## Integridade e confiança

Integridade não altera resultado bruto. Ela produz flags determinísticas e explicáveis. Nenhum evento isolado gera acusação. Incidentes técnicos, conexão ruim, tecnologia assistiva e pausa autorizada precisam ser diferenciados de comportamento observado.

Confiança deve considerar cobertura, qualidade metodológica, integridade da execução, recência, divergência, calibração e limites da modalidade. Não é score arbitrário.

## Persistência futura

PostgreSQL/Supabase continua o contrato de produção planejado. Qualquer futura migration deve preservar `organization_id`, FKs compostas, RLS em tabelas expostas, grants mínimos, DML direto revogado em tabelas críticas, RPCs idempotentes quando houver transação composta e falha segura para versão desconhecida.

Pessoa pode receber convite sem se tornar Usuário operacional. O acesso ao assessment deve ser tokenizado, limitado, auditável e separado de `platform_users`.

No M5.1A, `prepared_assessments` é apenas preparação interna. Ele não autoriza execução, não gera link e não cria sessão para Pessoa.

## Relação com contratos existentes

- `professional-profile`: não é sobrescrito por evidência demonstrada.
- `explainable-matching`: passa a poder consumir evidência demonstrada como camada adicional.
- `knowledge-normalization`: identifica o conceito de competência, mas não define política de suficiência.
- `tenant-authorization`: continua falhando fechado para operador.
- `document-operation-idempotency`: serve como padrão para chaves e replay seguro.

## Critérios de decomposição futura

Implementação deve ser separada em movimentos menores: contratos e versões, schema/RLS, Verification Definition, Policy, Sufficiency Engine, Item Bank, Composer, tentativa, rubrica, evidência demonstrada, matching, UX operador, UX Pessoa, QA e Context Pack.
