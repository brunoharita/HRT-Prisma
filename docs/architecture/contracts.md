# Catálogo de contratos

## Política

Cada contrato material possui nome, owner, versão, consumidores, status, compatibilidade, evidência de implementação, ambiente e política para versão desconhecida.

| Contrato | Owner | Versão | Consumidores | Status | Evidência | Ambiente | Versão desconhecida |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `professional-profile` | AI/domain | 4.0.0 | review, retrieval, matching, repository | publicação Delta ativa em QA; runtime web local | perfil versionado, PII excluída e omissões preservadas na promoção | local/QA | bloquear |
| `document-processing-state` | application | 2.3.0 | importer, repository, operations, review | schema e recuperação parcial ativos em QA; apresentação web local | estados técnicos alimentam um estado de produto único | local/QA | bloquear sem páginas preservadas |
| `document-presentation` | application/UI | 2.0.0 | Pessoas, processamento, Central da Pessoa, revisão | implementado localmente | jornada de seis etapas, tentativa revisável e perfil atual | local | falhar fechado sem tentativa recuperável |
| `resume-product-state` | product/application | 1.0.0 | importação, análise, Pessoas, Central da Pessoa | implementado localmente | sete estados canônicos derivados sem contaminar a Pessoa | local | falhar fechado como falha técnica |
| `profile-publication-delta` | product/application/data | 1.0.0 | revisão, publicação, Central da Pessoa | schema ativo em QA; runtime web local | omissões preservadas e remoções explícitas auditadas | local/QA | bloquear publicação |
| `extraction-provider` | AI | 1.0.0 | `processResume` | implementado | `ExtractionProvider` | local | rejeitar resposta |
| `extraction-rules` | AI | 1.0.0 | provider local | implementado | `extraction-rules-1.0.0` | local | revisão/reprocessamento |
| `adaptive-resume-extraction` | AI/application | 4.0.0 | ingestão M2-B e revisão | persistência ativa em QA; runtime web local | geometria, blocos profissionais, resumo documental e IDs estáveis | local/QA | exigir revisão/reprocessamento |
| `inference-ontology` | AI/domain | 1.0.0 | profile, search, matching | implementado | `inference-ontology-1.0.0` | local | bloquear inferência |
| `structured-retrieval` | AI | 1.0.0 | search | implementado | `structured-lexical-1.0.0` | local | bloquear consulta |
| `explainable-matching` | AI/domain | 1.0.0 | vacancy evaluation | implementado | `matching-explainable-1.0.0` | local | bloquear avaliação |
| `prompt-selection` | AI | 1.0.0 | extraction provider | implementado sem LLM | `no-llm-prompt-1.0.0` | local | bloquear processamento |
| `model-selection` | AI/operations | 1.0.0 | extraction provider | implementado localmente | `deterministic-local-1.0.0` | local | bloquear processamento |
| `confidence-method` | AI/QA | 1.0.0 | search, matching | implementado | `explainConfidence` | local | não exibir confiança |
| `tenant-authorization` | security/data | 1.0.0 | Supabase Data API/web | ativo em QA | RLS migration e testes conectados | QA | negar acesso |
| `web-domain-read` | product-engineering | 1.0.0 | Home, Pessoas, perfil | ativo em QA | `PrismaDataRepository` | local/QA | bloquear consulta |
| `platform-user-access` | security/product | 2.0.0 | App Shell, Usuários, Edge Functions | implementado localmente | migration `20260824113000_m2_users_people`, `platform-users` function, UI `UsersPage` | local | bloquear operação |
| `username-auth-boundary` | security/operations | 1.0.0 | sign-in, password recovery | implementado localmente | `operator-sign-in`, `operator-password-reset` | local | falha neutra |
| `person-ingestion` | application/data | 8.0.0 | intake, Pessoas, documentos, perfil | publicação Delta ativa em QA; runtime web local | jornada completa, recuperação parcial e publicação omission-safe | local/QA | bloquear sem fonte recuperável |
| `resume-intake` | application/data/security | 1.0.0 | Home, Pessoas, importador | implementado localmente | `resume_intakes` e cinco RPCs controladas | local | bloquear criação/vínculo |
| `human-profile-review` | application/domain | 5.0.0 | revisão, Delta, perfil, auditoria | publicação Delta ativa em QA; runtime web local | revisão não publica diretamente; Delta é a autoridade final | local/QA | bloquear promoção inválida |
| `spatial-evidence` | application/data | 1.2.0 | PDF viewer, revisão, auditoria | schema ativo em QA; web local | região bruta, texto efetivo, máscara por caractere ou símbolo e decisões imutáveis | local/QA | bloquear mutação |
| `document-operation-idempotency` | application/data | 1.1.0 | cadastro, retry, persistência, aprovação e invalidação | base e invalidação ativas em QA | `document_operations`, fingerprints, locks e descarte auditável | local/QA | rejeitar conflito |
| `pdf-native-extraction` | AI/application | 2.0.0 | ingestão PDF | implementado localmente | `pdfjs-5.4.296/layout-v2` | local | exigir revisão/reprocessamento |
| `selective-ocr` | AI/application | 1.0.0 | páginas sem texto nativo suficiente | ativo localmente | `tesseract.js-7.0.0/por+eng-v1` | local | falhar sem perfil |
| `extraction-draft` | AI/domain | 5.0.0 | evidência e geração de perfil | schema ativo em QA; runtime web local | `prisma-layout-adaptive-v4` | local/QA | bloquear promoção |
| `structured-resume-summary` | AI/domain/security | 1.0.0 | extração, revisão, Pessoas e perfil | schema ativo em QA; runtime web local | campos explícitos, IDs estáveis de resultados e fronteira privada de PII | local/QA | bloquear promoção |
| `review-field-lifecycle` | application/domain/data | 1.0.0 | revisão, evidência, extração e aprovação | schema ativo em QA; runtime web local | IDs estáveis, compatibilidade numérica, descarte de vazios e gates de salvamento | local/QA | bloquear escrita |
| `extraction-learning-case` | AI/data | 1.0.0 | avaliação e promoção de extração | ativo em QA | referências auditáveis a correções aprovadas | local/QA | bloquear aprendizado automático |
| `organization-extraction-pattern` | AI/data | 1.0.0 | primeira extração de currículos futuros | ativo em QA, consumo no runtime local | sinal estrutural tenant-scoped sem valores pessoais | local/QA | ignorar versão desconhecida |
| `custom-profile-section` | AI/domain | 1.0.0 | extração, revisão, perfil | schema ativo em QA; web local | estrutura limitada e evidência por item | local/QA | bloquear promoção |
| `organization-custom-section-definition` | AI/data | 1.0.0 | primeira extração de currículos futuros | ativo em QA; consumo web local | metadados de título/formato pós-aprovação, sem conteúdo pessoal | local/QA | ignorar versão desconhecida |
| `ai-usage-event` | operations/AI | 1.0.0 | observability | implementado | `ProcessingEvent`, table | local/migration | não agregar métricas |
| `prisma-context-pack` | governance | 1.0.0 | authorized AIs | implementado | checker/generator | repository | checker falha |
| `knowledge-normalization` | domain/data | 1.0.0 | intake, profile, search | implementado localmente | `knowledge-normalization-1.0.0`, migration M4 | local | preservar observado e enviar à Inbox |
| `knowledge-research` | AI/security | 1.0.0 | Knowledge Agent | implementado, desativado | `knowledge-research-1.0.0` | local | não chamar provider |
| `knowledge-proposal` | AI/data | 1.0.0 | agent, aprovação | implementado localmente | JSON Schema e `knowledge_proposals` | local | rejeitar output |
| `trusted-source-policy` | security/AI | 1.0.0 | agent, source catalogue | implementado localmente | `trusted-sources-1.0.0` | local | rejeitar fonte |
| `knowledge-reinterpretation` | application/domain | 1.0.0 | impacts, M2-C | implementado localmente | jobs, draft e profile version metadata | local | manter impacto pendente |
| `competency-verification-plan` | product/architecture/AI/security/QA | 0.3.0 | M5.1A e M5.1B | parcialmente implementado | preparação e execução sintética local | local | bloquear escopo não implementado |
| `assessment-invitation` | application/security/data | 1.0.0 | operador, boundary público | implementado localmente | token SHA-256, expiração, revogação e emissão sem delivery fictício | local | negar acesso |
| `assessment-attempt` | application/data | 1.0.0 | Pessoa, avaliação, QA | implementado localmente | tentativa única, lock, snapshots e estados reais | local | bloquear mutação |
| `assessment-event` | application/data/security | 1.0.0 | métricas e integridade | implementado localmente | ledger append-only com questão ativa e sessão lógica | local | rejeitar evento |
| `assessment-integrity-analysis` | domain/data/QA | 1.0.0 | avaliação e operador | implementado localmente | flags determinísticas sem antifraud score | local | tornar inconclusivo |
| `demonstrated-evidence` | domain/data/matching | 1.0.0 | Need, matching e perfil | implementado localmente | evidência independente, resultado bruto e versões preservados | local | não promover evidência |
| `participant-result-visibility` | product/security | 1.0.0 | superfície pública | implementado localmente | `completion_only`, `summary`, `detailed`, default fechado | local | `completion_only` |

## Evidência não é rollout

Tipos TypeScript provam contrato de código local. Migration prova intenção executável de schema. Somente evidência de ambiente comprova ativação. O catálogo deve ser atualizado junto com qualquer mudança material.

## Eventos e APIs

Não existe API HTTP nem event bus no estado atual. O M2-C persiste eventos operacionais/auditoria no banco, mas eles não constituem um barramento público. Nenhum consumidor externo deve assumir sua existência.

O M5.1B autoriza somente execução sintética local/QA pela fronteira tokenizada. Não autoriza Pessoas reais, provider externo, produção, geração por IA, proctoring, certificação ou decisão automática.
