# M5.5: exclusão definitiva de Pessoa

## Escopo e ambiente

Implementação local e no projeto `Prisma-QA` (`ioldpnqqvobprjiontre`). Produção, hosting, exclusão em massa, portabilidade, retenção automática e portal completo permanecem fora de escopo. As migrations `20260909175124`, `20260909184831`, `20260909184943` e `20260911153000` e a Edge Function `person-data-deletion` v1 estão ativas apenas em QA.

A migration `20260911153000_person_deletion_learning_metadata_shape` permite que casos de aprendizado aprovados ou rejeitados sobrevivam como metadata-only quando a revisão da Pessoa é purgada. Isso evita que a restrição de forma do aprendizado impeça a conclusão da exclusão definitiva; casos candidatos continuam sendo removidos.

## Decisão e reuso

O fluxo reutiliza o padrão de saga e remoção de Storage de `delete_document`, locks e feedback operacional existentes, a infraestrutura criptográfica HMAC já usada em boundaries públicos, o design system e `Modal.confirm`. Um ledger novo foi necessário porque a operação precisa sobreviver à remoção de `people` e não pode depender de Documento, assessment ou usuário da plataforma. Administração e titularidade convergem para a mesma saga; somente o ator e a credencial de entrada diferem.

## Inventário real de dependências

| Família | Recursos reais | Tratamento |
| --- | --- | --- |
| Pessoa e PII | `people`, `person_private_data` | excluir após lock e purga |
| Currículo e ingestão | `documents`, objetos `person-documents`, `document_processing_attempts`, `document_page_extractions`, `extraction_drafts`, `resume_intakes`, `person_ingestion_events`, `document_operations` | excluir; Storage antes da finalização; intake não vinculado permanece |
| Revisão e evidência | `profile_reviews`, revisions/changes, `spatial_evidence_regions`, links/refinements/events, learning cases/adaptation events dependentes | excluir por dependência individual; histórico metadata-only compartilhável permanece apenas quando desacoplado |
| Perfil | `professional_profiles`, `evidence`, `inferences`, `inference_evidence`, `profile_competencies`, publication decisions/removals | excluir todas as versões e derivados individuais |
| Matching e Vagas | `match_evaluations`, referências de posição | excluir avaliações; desocupar posição; preservar `vacancies` e versões |
| M5.1 | needs, prepared assessments, invitations, access requests, attempts, question instances, responses, events, metrics, integrity, evaluations, demonstrated evidence e audit dependente | cancelar/revogar e excluir agregado individual; preservar definitions, blueprints, rubrics e Item Bank |
| Knowledge | observations, inbox references e reinterpretation impacts/jobs ligados à Pessoa | excluir ou desacoplar a proveniência individual; preservar conceitos, termos, aliases, relações, sources e versões |
| Merge | `people.merged_into_person_id`, redirecionamentos e artefatos já movidos | remover referências ao alvo excluído sem atravessar para outra Pessoa; preservar o outro agregado |
| Autoridade pública | `person_self_service_capabilities` | revogar ao iniciar, consumir no uso e excluir na purga |
| Auditoria mínima | `person_deletion_operations` | preservar desacoplada, sem FK para `people`, contato ou conteúdo profissional |
| Projeções | busca, Central, comparação e matching derivados das tabelas acima | deixam de resolver a Pessoa após zero resíduos; não há cache persistido adicional |

## Evidência executada

- Suíte local específica integrada ao runner: 288 testes aprovados, incluindo oito contratos M5.5.
- Prisma-QA, fixture rica em transação revertida: falha parcial de Storage manteve `purging`; mutação concorrente foi negada; retomada removeu o agregado e terminou com zero resíduos; merge foi desacoplado; auditoria manteve nome e ator; Knowledge, Item Bank e usuários da plataforma permaneceram; recadastro com mesma identidade criou novo UUID e nenhum artefato antigo reapareceu.
- Prisma-QA, matriz de autoridade revertida: Owner e Admin apenas no escopo, Recruiter e Member negados, Super Admin global autorizado.
- Prisma-QA, titularidade revertida: capability exclusiva aceita somente a própria Pessoa; payload não altera alvo; token de assessment, revogação e replay são negados; ator `self` permanece sem `platform_user_id`.
- Catálogo remoto: RLS ativo; `anon` sem leitura; `authenticated` sem DELETE; emissão e finalização de titularidade reservadas ao `service_role`; `authenticated` inicia somente a operação administrativa validada no backend.
- Smoke visual seguro: estado inválido genérico em desktop e `390x844`; fluxo válido foi aprovado em desktop, painel de tablet e `390x844`, com contexto mínimo, categorias refluindo sem overflow e CTA dentro do viewport. Uma sessão Super Admin do Prisma-QA confirmou que `Arquivar Pessoa`, emissão de Meus dados e `Excluir Pessoa definitivamente` estão separados; o modal administrativo mostrou uma única confirmação categorizada, sem digitação ou justificativa. As confirmações administrativa e de titularidade foram canceladas sem executar exclusão.
- Reset local completo foi tentado, mas migrations históricas anteriores ao M5.5 falham no PostgreSQL 17 por `min(uuid)` e, após diagnóstico isolado, por tentativa histórica de remover `membership_role` ainda dependente. Nenhuma migration histórica foi alterada. O schema QA vigente recebeu as migrations forward-only e todas as provas conectadas passaram.

## Critérios de aceite

| Critério | Resultado | Evidência |
| --- | --- | --- |
| CA-001 autoridade | PASS | matrizes administrativa e de capability em QA, com rollback |
| CA-002 UX administrativa | PASS | smoke autenticado, teste estático, typecheck e build; ação crítica e modal único |
| CA-003 UX titular | PASS | smoke público válido/inválido e prova de replay em QA |
| CA-004 purga integral | PASS | fixture rica, verificador de resíduos e rollback |
| CA-005 Storage | PASS | pendência impede conclusão, retry é idempotente, ownership é validado e Edge remove/lista antes de marcar; objeto físico sintético não foi persistido para o smoke |
| CA-006 Knowledge | PASS | contagens antes/depois e proveniência individual removida |
| CA-007 auditoria | PASS | ledger consultável sem FK de Pessoa, com snapshot mínimo |
| CA-008 concorrência | PASS | estado `deleting`, guards diretos e indiretos, teste conectado e regressão estática de todas as fronteiras |
| CA-009 idempotência | PASS | mesma chave/operação, retry e conclusão coerentes |
| CA-010 recadastro | PASS | novo UUID e histórico vazio em QA |
| CA-011 tenant isolation | PASS | autoridade escopada, referências compostas e fixture equivalente preservada |
| CA-012 busca e matching | PASS | zero agregado e zero avaliação/projeção persistida após purge |
| CA-013 integridade | PASS | verificador determinístico, constraints e consulta de grants/RLS |
| CA-014 responsividade | PASS | desktop, painel de tablet e `390x844`; sem overflow, CTA cortado ou modal técnico |
| CA-015 gate | PASS | `pnpm run validate`: lint 373 arquivos, foundation, Context Pack, dois typechecks, build web, 288 testes, 19 golden e `VERTICAL_SLICE_OK` |

## AoT: requisitos DEVE

| Agreement | Implementation | Test/Evidence | Status |
| --- | --- | --- | --- |
| D-001 papéis administrativos | `private.person_deletion_actor_kind` | matriz QA | PASS |
| D-002 autoexclusão | capability exclusiva e Edge Function | self-service QA | PASS |
| D-003 Recruiter/Member negados | backend fail-closed | matriz QA negativa | PASS |
| D-004 arquivar diferente de excluir | ações e textos separados | teste de UI | PASS |
| D-005 ação em área crítica | menu secundário e bloco crítico | teste de UI | PASS |
| D-006 confirmação única | `Modal.confirm` com categorias e irreversibilidade | teste e smoke | PASS |
| D-007 preflight invisível | RPC de preview e resumo categorizado | QA e UI | PASS |
| D-008 lock imediato | `operational_status=deleting` e guards | QA concorrente e SQL estático | PASS |
| D-009 operação única/retomável | ledger, idempotency key e saga | retry QA | PASS |
| D-010 inventário real | matriz desta página e grafo SQL/código | revisão da migration | PASS |
| D-011 eliminar agregado individual | purge explícita por famílias | fixture rica QA | PASS |
| D-012 preservar compartilhados | snapshots antes/depois | QA Knowledge/Item Bank | PASS |
| D-013 auditoria com nome | ledger desacoplado | QA pós-purga | PASS |
| D-014 auditoria não bloqueia | FKs dependentes removidas/desacopladas | zero resíduos QA | PASS |
| D-015 Storage limpo antes de concluir | plano, remove/list, mark e retry | falha parcial QA e contrato Edge | PASS |
| D-016 concorrência protegida | triggers de referências diretas e filhos M5.1 | QA e regressão SQL | PASS |
| D-017 capabilities revogadas | revoke/consume e bloqueio de emissão | QA replay | PASS |
| D-018 sem enumeração | resposta genérica, hash, TTL e rate limit | self-service QA e smoke inválido | PASS |
| D-019 mesmo pipeline | `private.begin_person_definitive_deletion` | admin/self usam o mesmo núcleo | PASS |
| D-020 novo cadastro permitido | sem tombstone de identidade | recadastro QA | PASS |
| D-021 tenant-scoped | organization em ledger, capability e FKs | matriz QA | PASS |
| D-022 merge explícito | referências desacopladas sem travessia | fixture merge QA | PASS |
| D-023 feedback simples | códigos sanitizados no service | testes e smoke | PASS |
| D-024 resultado administrativo | remoção da Central e retorno a Pessoas | UI e zero projeções | PASS |
| D-025 resultado do titular | capability consumida e página final mínima | self QA e UI | PASS |
| D-026 verificação automática | residual query e invariantes compartilhadas | QA | PASS |
| D-027 resíduo bloqueia conclusão | `person_deletion_residue_detected`/Storage pending | falha parcial QA | PASS |
| D-028 reuse-first | saga documental, tokens, feedback e modal reaproveitados | ADR-046 | PASS |
| D-029 integridade/grants | RLS e boundaries server-side | catálogo remoto | PASS |
| D-030 histórico compatível | purga relacional sem leitura de shape | fixture rica | PASS |
| D-031 docs/estado/contexto | owner docs, ADR, QA e Context Pack | geração/check e gate completo aprovados | PASS |
| D-032 AoT obrigatório | esta matriz D/P | revisão final | PASS |

## AoT: comportamentos PROIBIDOS

| Agreement | Implementation/Test/Evidence | Status |
| --- | --- | --- |
| P-001 sem deletes no frontend | frontend chama uma Edge Function | PASS |
| P-002 sem DELETE amplo | grants remotos negam `anon/authenticated` | PASS |
| P-003 sem cascade genérica | ordem explícita; cascatas somente em filhos exclusivos | PASS |
| P-004 não apagar compartilhados | contagens QA preservadas | PASS |
| P-005 sem soft-delete substitutivo | `people` removida; ledger desacoplado | PASS |
| P-006 sem suppression por contato/hash | capability expira e é eliminada | PASS |
| P-007 sem restauração futura | teste de recadastro | PASS |
| P-008 nome auditado não deduplica | ledger fora do resolvedor | PASS |
| P-009 sem inferir Usuário/Pessoa | ator self não possui usuário | PASS |
| P-010 sem promover Pessoa a Usuário | nenhuma escrita em `platform_users` | PASS |
| P-011 assessment não autoriza | token distinto rejeitado | PASS |
| P-012 Recruiter/Member não excluem | matriz negativa QA | PASS |
| P-013 sem travessia de tenant | escopo composto e teste cross-tenant | PASS |
| P-014 sem burocracia adicional | modal único, sem digitação/checklist/justificativa | PASS |
| P-015 sem falso sucesso parcial | estado `failed_retryable`/`purging` | PASS |
| P-016 sem concluir com Storage pendente | finalize bloqueia | PASS |
| P-017 sem órfãos | constraints e residual verifier | PASS |
| P-018 sem token ativo | revogação/consumo e zero residual | PASS |
| P-019 sem reaparecer | zero Pessoa, Perfil e matching | PASS |
| P-020 Vaga preservada | fixture QA | PASS |
| P-021 Usuário preservado | contagem QA | PASS |
| P-022 auditoria mínima preservada | ledger QA | PASS |
| P-023 sem PII no novo ledger | schema e payload mínimo | PASS |
| P-024 sem detalhes técnicos na UI | sanitização e testes | PASS |
| P-025 sem provider/custo novo | nenhuma dependência ou serviço externo | PASS |
| P-026 sem produção | somente local e Prisma-QA | PASS |

## Resíduos e limitações reais

- O reset local integral permanece bloqueado por incompatibilidades de migrations históricas anteriores ao M5.5 no PostgreSQL 17. A validação forward-only no Prisma-QA é positiva.
- Backups gerenciados e retenção jurídica não pertencem a este movimento.
