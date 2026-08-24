# Modelo de dados

## Estado

O modelo existe em TypeScript e em migrations PostgreSQL/Supabase. Foundation, M2-A e M2-B estão ativos no Prisma-QA. Não existe schema de produção provisionado.

## Agregados

| Agregado | Tabelas | Regra |
| --- | --- | --- |
| Tenant e acesso | `organization_groups`, `organizations`, `organization_memberships`, `platform_users` | Grupo delimita autoridade; empresa delimita dados; usuário opera o sistema |
| Organização | `organization_units`, `job_roles`, `positions`, `vacancies` | Papel, posição e vaga são distintos |
| Pessoa | `people`, `person_private_data` | PII privada separada da identidade profissional |
| Documento | `documents`, `document_processing_attempts`, `document_page_extractions`, `extraction_drafts` | Fonte versionada, checksum, método por página, tentativa e draft validado |
| Conhecimento | `professional_profiles`, `evidence`, `inferences`, `inference_evidence` | Fato e inferência não se confundem |
| Competências | `competencies`, `profile_competencies`, `vacancy_requirements` | Sinal explícito ou inferido |
| Avaliação | `match_evaluations` | Contextual e versionada |
| Telemetria | `ai_usage_events` | Custo, latência, versão e erro |
| Auditoria de usuários | `platform_user_audit_events` | Senha e tokens nunca entram no log material |
| Timeline de ingestão | `person_ingestion_events` | Mudanças de documento, tentativa e perfil sem copiar o conteúdo integral |

## Isolamento estrutural

Tabelas pai expõem `unique (organization_id, id)`. Relações críticas usam foreign keys compostas com `organization_id`, impedindo referências cruzadas mesmo diante de erro de aplicação. Em `M2-A`, `organizations.group_id` formaliza a hierarquia `Plataforma -> Grupo -> Empresa`, enquanto `platform_users` separa o operador autenticável da entidade `people`.

RLS está habilitado em toda tabela pública. Políticas usam `TO authenticated`, `platform_users.status`, `organization_memberships` e helpers privados com `search_path` vazio. `anon` não recebe acesso. O boundary de Auth admin, username e mutações de usuário permanece server-side em Edge Functions.

## Documento e falhas

Estados de documento implementados: `pending`, `processing`, `processed`, `extraction_failed`, `needs_manual_review`, `unsupported_format`. O processamento M2-B registra `uploaded`, validação, extração nativa, OCR seletivo, estruturação, conclusão e falhas específicas em tentativas imutáveis. Falhas registram categoria, motivo, mensagem técnica sanitizável, versão e possibilidade de reprocessamento.

`ocr_required` é um estado técnico implementado. `partially_extracted`, `duplicate_document` e `corrupted_document` continuam planejados e não devem ser emitidos.

O PDF original fica no bucket privado `person-documents`, limitado a 15 MB e MIME PDF. Registros anteriores ao M2-B sem objeto de Storage são marcados exclusivamente pela migração como `is_legacy_unstored`; um trigger impede novos registros com esse bypass.

## JSONB

Identidade, autorização e relações permanecem normalizadas. Partes evolutivas de perfil e avaliação usam JSONB junto com tabelas relacionais de evidência, inferência e competência. JSONB não pode esconder authority, tenant, versão ou proveniência material.

## Retenção e exclusão

Cascade existe para agregados técnicos, mas política legal de retenção ainda não está definida. Antes do piloto real, exclusão, anonimização, exportação e preservação de auditoria devem possuir fluxo e teste próprios.
