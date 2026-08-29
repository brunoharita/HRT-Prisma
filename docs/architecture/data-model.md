# Modelo de dados

## Estado

O modelo existe em TypeScript e em migrations PostgreSQL/Supabase. Foundation, M2-A, M2-B, M2-C e M5 estão ativos no Prisma-QA. Não existe schema de produção separado provisionado.

## Agregados

| Agregado | Tabelas | Regra |
| --- | --- | --- |
| Tenant e acesso | `organization_groups`, `organizations`, `organization_memberships`, `platform_users` | Grupo delimita autoridade; empresa delimita dados; usuário opera o sistema |
| Organização | `organization_units`, `job_roles`, `positions`, `vacancies` | Papel, posição e vaga são distintos |
| Pessoa | `people`, `person_private_data` | PII privada separada da identidade profissional |
| Documento | `documents`, `document_processing_attempts`, `document_page_extractions`, `extraction_drafts`, `document_operations` | Fonte versionada, layout visual, evidência por campo, tentativa e idempotência |
| Intake currículo-first | `resume_intakes` | PDF tenant-scoped, identidade mínima e resolução única antes do documento M2-B |
| Revisão humana | `profile_reviews`, `profile_review_revisions`, `profile_review_changes` | Rascunho, lock otimista, decisão por campo e aprovação rastreável |
| Evidência espacial | `spatial_evidence_regions`, `profile_review_evidence_links`, `profile_review_evidence_refinements`, `profile_review_evidence_events` | Região normalizada, texto bruto e efetivo, máscara entre campos irmãos, vínculo por campo, substituição não destrutiva e histórico imutável |
| Aprendizado de extração | `extraction_learning_cases` | referência tenant-scoped a correção humana ou aceite adaptativo candidato e aprovado para avaliação |
| Evento adaptativo | `profile_review_adaptation_events` | ledger append-only do padrão confirmado e dos campos aceitos, sem duplicar valores ou texto integral |
| Padrão organizacional | `organization_extraction_patterns` | sinal estrutural versionado promovido somente após aprovação integral da revisão |
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

Estados de documento implementados: `pending`, `received`, `processing`, `processed`, `ready_for_review`, `in_review`, `approved`, `failed`, `extraction_failed`, `needs_manual_review`, `unsupported_format`. O processamento registra validação, extração nativa, OCR seletivo, estruturação, revisão, aprovação e falhas específicas em tentativas imutáveis. Falhas registram categoria, motivo, mensagem técnica sanitizável, versão e possibilidade de reprocessamento.

`document_operations` impede replay divergente e devolve o resultado anterior para a mesma chave/fingerprint. Locks por pessoa/documento serializam versões. A revisão mantém histórico imutável de alterações e somente `approve_profile_review` promove uma nova versão de perfil, com uma única versão atual por pessoa.

`spatial_evidence_regions` exige `organization_id`, documento, versão, review, página e coordenadas `x/y/width/height` entre 0 e 1, inclusive os limites somados. `profile_review_evidence_links` referencia exatamente uma evidência original ou uma região espacial. `profile_review_evidence_events` é append-only. A RPC M5 cria região, vínculo, revisão e evento atomicamente; evidências históricas anteriores permanecem válidas sem coordenadas.

Em `spatial-evidence` 1.2.0, `raw_selected_text` preserva o conteúdo do retângulo e `selected_text` preserva o conteúdo efetivamente vinculado. `profile_review_evidence_refinements` registra, de forma append-only, se cada região espacial sobreposta de um campo irmão foi excluída ou reincluída. O banco rejeita refinamento entre registros, páginas, documentos, versões ou tenants diferentes e mantém DML direto revogado.

`document_page_extractions.layout_blocks` preserva linhas visuais normalizadas e `field_evidence` preserva descritores mínimos por campo. Ao abrir a revisão, somente coordenadas realmente extraídas geram regiões `source=system`. `extraction_learning_cases` referencia eventos humanos sem duplicar texto integral e só é promovida a caso aprovado quando a revisão é aprovada.

`resume_intakes` nasce com `organization_id`, chave idempotente, checksum e caminho privado. E-mail e telefone normalizados suportam correspondência forte; nome normalizado é apenas sinal possível. `resolve_resume_intake` bloqueia a operação, cria ou vincula a Pessoa e registra o documento na mesma transação. Somente depois o fluxo entra nas tentativas, drafts, evidências e revisão M2-B/M2-C.

`ocr_required` é um estado técnico implementado. `partially_extracted`, `duplicate_document` e `corrupted_document` continuam planejados e não devem ser emitidos.

O PDF original fica no bucket privado `person-documents`, limitado a 15 MB e MIME PDF. Registros anteriores ao M2-B sem objeto de Storage são marcados exclusivamente pela migração como `is_legacy_unstored`; um trigger impede novos registros com esse bypass.

## JSONB

Identidade, autorização e relações permanecem normalizadas. Partes evolutivas de perfil e avaliação usam JSONB junto com tabelas relacionais de evidência, inferência e competência. JSONB não pode esconder authority, tenant, versão ou proveniência material.

## Retenção e exclusão

Cascade existe para agregados técnicos, mas política legal de retenção ainda não está definida. Antes do piloto real, exclusão, anonimização, exportação e preservação de auditoria devem possuir fluxo e teste próprios.
