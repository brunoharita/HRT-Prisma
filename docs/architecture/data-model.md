# Modelo de dados

## Estado

O modelo existe em TypeScript e em migrations PostgreSQL/Supabase. A migration inicial e o hardening posterior estão ativos no Prisma-QA. Não existe schema de produção provisionado.

## Agregados

| Agregado | Tabelas | Regra |
| --- | --- | --- |
| Tenant e acesso | `organizations`, `organization_memberships` | Organização é limite de autorização |
| Organização | `organization_units`, `job_roles`, `positions`, `vacancies` | Papel, posição e vaga são distintos |
| Pessoa | `people`, `person_private_data` | PII privada separada da identidade profissional |
| Documento | `documents` | Fonte, checksum, status e falha; sem texto bruto na tabela |
| Conhecimento | `professional_profiles`, `evidence`, `inferences`, `inference_evidence` | Fato e inferência não se confundem |
| Competências | `competencies`, `profile_competencies`, `vacancy_requirements` | Sinal explícito ou inferido |
| Avaliação | `match_evaluations` | Contextual e versionada |
| Telemetria | `ai_usage_events` | Custo, latência, versão e erro |

## Isolamento estrutural

Tabelas pai expõem `unique (organization_id, id)`. Relações críticas usam foreign keys compostas com `organization_id`, impedindo referências cruzadas mesmo diante de erro de aplicação. Índices cobrem tenant, membership, status e acessos esperados.

RLS está habilitado em toda tabela pública. Políticas usam `TO authenticated` e autorização por `organization_memberships`. `anon` não recebe acesso. A função auxiliar de papel fica no schema privado, possui `search_path` vazio, revoga execução pública e checa `auth.uid()`.

## Documento e falhas

Estados implementados: `pending`, `processing`, `processed`, `extraction_failed`, `needs_manual_review`, `unsupported_format`. Falhas registram categoria, motivo, mensagem técnica sanitizável, versão e possibilidade de reprocessamento.

Estados planejados sujeitos a evidência: `ocr_required`, `partially_extracted`, `duplicate_document`, `corrupted_document`. Não devem ser adicionados sem contrato de comportamento e teste.

## JSONB

Identidade, autorização e relações permanecem normalizadas. Partes evolutivas de perfil e avaliação usam JSONB junto com tabelas relacionais de evidência, inferência e competência. JSONB não pode esconder authority, tenant, versão ou proveniência material.

## Retenção e exclusão

Cascade existe para agregados técnicos, mas política legal de retenção ainda não está definida. Antes do piloto real, exclusão, anonimização, exportação e preservação de auditoria devem possuir fluxo e teste próprios.
