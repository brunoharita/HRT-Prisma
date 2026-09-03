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
| M5.1 Verificação de Competências | `verification_*`, `assessment_*`, `competency_demonstrated_evidence` | preparação, execução, ledger factual, avaliação versionada e evidência independente |
| Normalização Knowledge M5.2 | `knowledge_source_versions`, `knowledge_source_stage_records`, `knowledge_concepts`, `knowledge_terms`, `knowledge_relations`, `knowledge_external_mappings`, `knowledge_observations`, `knowledge_inbox` | snapshot oficial imutável, staging/diff, termo literal, conceito resolvido, ambiguidade e decisão humana |
| Monitoramento de fontes Knowledge | `knowledge_sources`, `knowledge_source_versions`, `knowledge_source_checks` | resumo corrente, versão detectada, data, fingerprint, execução idempotente, evidência append-only e publicação humana preservada |
| Telemetria | `ai_usage_events` | Custo, latência, versão e erro |
| Auditoria de usuários | `platform_user_audit_events` | Senha e tokens nunca entram no log material |
| Timeline de ingestão | `person_ingestion_events` | Mudanças de documento, tentativa e perfil sem copiar o conteúdo integral |

## Isolamento estrutural

Tabelas pai expõem `unique (organization_id, id)`. Relações críticas usam foreign keys compostas com `organization_id`, impedindo referências cruzadas mesmo diante de erro de aplicação. Em `M2-A`, `organizations.group_id` formaliza a hierarquia `Plataforma -> Grupo -> Empresa`, enquanto `platform_users` separa o operador autenticável da entidade `people`.

RLS está habilitado em toda tabela pública. Políticas usam `TO authenticated`, `platform_users.status`, `organization_memberships` e helpers privados com `search_path` vazio. `anon` não recebe acesso. O boundary de Auth admin, username e mutações de usuário permanece server-side em Edge Functions.

## Documento e falhas

Estados de documento implementados: `pending`, `received`, `processing`, `processed`, `ready_for_review`, `in_review`, `approved`, `failed`, `extraction_failed`, `needs_manual_review`, `unsupported_format`. O processamento registra validação, extração nativa, OCR seletivo, estruturação, revisão, aprovação e falhas específicas em tentativas imutáveis. Falhas registram categoria, motivo, mensagem técnica sanitizável, versão e possibilidade de reprocessamento.

`document_operations` impede replay divergente e devolve o resultado anterior para a mesma chave/fingerprint. Locks por pessoa/documento serializam versões. A revisão mantém histórico imutável de alterações e somente `publish_profile_review`, pela comparação Delta, é executável pelo cliente para promover uma nova versão de perfil. `approve_profile_review` permanece uma primitiva interna sem grant a `authenticated`.

`profile_publication_removals` é o ledger imutável das únicas perdas de conhecimento autorizadas. Cada linha identifica organização, revisão, campo, valor anterior, motivo e ator. Omissões nunca criam linha e são mescladas do perfil-base para a nova versão. RLS permite leitura apenas a papéis revisores e DML direto permanece revogado.

`spatial_evidence_regions` exige `organization_id`, documento, versão, review, página e coordenadas `x/y/width/height` entre 0 e 1, inclusive os limites somados. `profile_review_evidence_links` referencia exatamente uma evidência original ou uma região espacial. `profile_review_evidence_events` é append-only. A RPC M5 cria região, vínculo, revisão e evento atomicamente; evidências históricas anteriores permanecem válidas sem coordenadas.

Experiências e formações novas carregam `id` estável e `source`. Vínculos de evidência, refinamentos e sugestões adaptativas usam esse ID, de modo que inserir ou remover outro item não desloca o registro semântico. Caminhos numéricos permanecem válidos apenas para compatibilidade histórica. O banco valida novas extrações e cada atualização do rascunho, exigindo nome, contato efetivo e conteúdo profissional material sem promover PII ao perfil.

Formação permanece no mesmo array JSONB `education` e passa a carregar curso, instituição, período, nível, qualificação, situação, origem por dimensão, motivos, versão, confirmação e snapshot do classificador. O schema aceita registros históricos sem esses campos em leitura, mas exige o contrato atual em novas extrações e salvamentos. `professional_profiles` rejeita classificação presente e ainda não confirmada. `person_ingestion_events` recebe apenas metadados da mudança acadêmica, sem duplicar texto ou evidência.

Em `spatial-evidence` 1.2.0, `raw_selected_text` preserva o conteúdo do retângulo e `selected_text` preserva o conteúdo efetivamente vinculado. `profile_review_evidence_refinements` registra, de forma append-only, se cada região espacial sobreposta de um campo irmão foi excluída ou reincluída. O banco rejeita refinamento entre registros, páginas, documentos, versões ou tenants diferentes e mantém DML direto revogado.

`document_page_extractions.layout_blocks` preserva linhas visuais normalizadas e `field_evidence` preserva descritores mínimos por campo. Ao abrir a revisão, somente coordenadas realmente extraídas geram regiões `source=system`. `extraction_learning_cases` referencia eventos humanos sem duplicar texto integral e só é promovida a caso aprovado quando a revisão é aprovada.

O resumo estruturado permanece integral no draft privado de revisão para permitir comparação e evidência. `approve_profile_review` separa o payload atomicamente: `identity.fullName` atualiza `people`, `contact` atualiza `person_private_data` e somente posicionamento, objetivo, resumo, resultados e demais fatos seguem para `professional_profiles.profile_data`. A constraint do perfil rejeita `identity` e `contact`; valores privados ausentes nunca apagam contato canônico existente.

`resume_intakes` nasce com `organization_id`, chave idempotente, checksum e caminho privado. E-mail e telefone normalizados suportam correspondência forte; nome normalizado é apenas sinal possível. `resolve_resume_intake` bloqueia a operação, cria ou vincula a Pessoa e registra o documento na mesma transação. Somente depois o fluxo entra nas tentativas, drafts, evidências e revisão M2-B/M2-C.

`ocr_required` é um estado técnico implementado. `partially_extracted`, `duplicate_document` e `corrupted_document` continuam planejados e não devem ser emitidos.

O PDF original fica no bucket privado `person-documents`, limitado a 15 MB e MIME PDF. Registros anteriores ao M2-B sem objeto de Storage são marcados exclusivamente pela migração como `is_legacy_unstored`; um trigger impede novos registros com esse bypass.

## JSONB

Identidade, autorização e relações permanecem normalizadas. Partes evolutivas de perfil e avaliação usam JSONB junto com tabelas relacionais de evidência, inferência e competência. JSONB não pode esconder authority, tenant, versão ou proveniência material.

`knowledge_source_versions.is_current` identifica a única versão publicada ativa de cada fonte; manifestos registram arquivo, tamanho, encoding, contagem e checksum. Termos e relações apontam à versão de origem. `knowledge_observations` pode referenciar evidência M2 ou review M5, preserva texto literal, perfil, método e versão resolutora. `resolved` exige conceito; `ambiguous` e `unresolved` proíbem conceito. `knowledge_inbox.observation_ids` liga a decisão humana às ocorrências sem copiar currículo integral.

`knowledge_sources` também registra o estado resumido da checagem oficial, sem confundi-lo com publicação. `knowledge_source_checks` é append-only, possui RLS e expõe leitura apenas a Super Admin. A Edge Function escreve por uma RPC `service_role` idempotente; um resultado detectado pode catalogar uma source version, mas não altera `is_current`.

## M5.1 implementado localmente

O M5.1 é aditivo ao modelo atual. Verification Needs, Policies, Invitations, Attempts, Responses, Events, Metrics, Evaluations e Demonstrated Evidence são tenant-owned e carregam `organization_id`. Verification Definitions, blueprints e itens podem ter origem global ou organizacional, preservando a separação entre acervo compartilhado Prisma e acervo privado da organização.

Question Instances preservam exatamente definition, blueprint, item, opções, ordem, answer key interna, rubrica e versões usadas na tentativa. Evidência demonstrada é uma camada independente e não sobrescreve `profile_competencies`, evidências documentais ou inferências existentes.

## Retenção e exclusão

Cascade existe para agregados técnicos, mas política legal de retenção ainda não está definida. Antes do piloto real, exclusão, anonimização, exportação e preservação de auditoria devem possuir fluxo e teste próprios.
