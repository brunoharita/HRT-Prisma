# ADR-012: Intake currículo-first antes da resolução de Pessoa

- Status: accepted
- Data: 2026-08-26
- Owners: product, application, data, security

## Contexto

O fluxo M2-B exige Pessoa antes de registrar documento, enquanto a porta de entrada principal do Prisma deve começar pelo currículo. Criar uma Pessoa antes de validar identidade produz cadastros sem base suficiente; relaxar as relações do pipeline M2-B/M2-C criaria estados ambíguos e duplicaria contratos maduros.

## Decisão

- `resume_intakes` representa a operação tenant-scoped entre o PDF recebido e a resolução da Pessoa.
- O PDF permanece no bucket privado `person-documents`, sob caminho iniciado por `organization_id`, antes de existir Pessoa.
- Extração determinística identifica somente nome, e-mail e telefone explícitos. Nome sem contato ou ausência de nome exige complemento humano.
- E-mail e telefone normalizados são correspondências fortes; nome normalizado é apenas sinal possível. Toda busca é limitada à organização.
- `start_resume_intake`, `identify_resume_intake`, `resolve_resume_intake`, `complete_resume_intake` e `fail_resume_intake` verificam sessão, tenant e papéis permitidos.
- A criação ou vinculação de Pessoa e o registro do documento acontecem na mesma transação, sob lock do intake e da Pessoa. Uma decisão concluída não pode ser substituída por outra.
- Depois da resolução, o documento converge para `persist_person_extraction` e para toda a fronteira M2-C de revisão, versão e aprovação. Não existe parser, OCR, evidência ou perfil paralelo.
- `Member` permanece sem acesso a currículo bruto, intake ou revisão.

## Consequências

Currículo passa a poder originar uma Pessoa sem criar cadastro prematuro. Retries da mesma intenção reutilizam o intake; decisões concorrentes produzem uma única resolução. O staging adiciona estado operacional e auditoria, mas não persiste texto integral do currículo nem expõe correspondências de outro tenant.

O contrato `person-ingestion` avança para `3.0.0`. Contratos de perfil, evidência e revisão permanecem compatíveis porque o pipeline pós-resolução não muda.

## Alternativas rejeitadas

- Tornar todas as tabelas M2-B independentes de Pessoa. Rejeitada por ampliar estados inválidos e enfraquecer relações existentes.
- Criar Pessoa provisória antes da identificação. Rejeitada por produzir Pessoa fantasma.
- Deduplicar com LLM, embeddings ou merge automático. Rejeitada por falta de necessidade, explicabilidade e autoridade humana.

## Evidência

- Migration `20260826114333_curriculum_first_resume_intake.sql`.
- Domínio `src/domain/resumeIdentity.ts`.
- UI `ResumeImportPage.tsx` e adapter `personIngestionService.ts`.
- Testes `tests/curriculumFirstIntake.test.ts` e validação conectada registrada em QA.

## Rollback

Desativar a rota de importação e revogar execução das cinco RPCs por forward fix. Preservar intakes, documentos, Pessoas, eventos e decisões já registradas; remoção destrutiva não faz parte do rollback.
