# Evidência local de extração adaptativa

Data: 2026-08-28. Ambientes: checkout local na branch `codex/adaptive-resume-extraction` e banco Prisma-QA. Não existe ambiente de produção separado.

## Escopo validado

- geometria e ênfase do PDF preservadas por linha;
- cargo, descritor de atuação, período `Jan/25 - Atual` e empresa na linha seguinte separados corretamente em fixture sintética;
- evidência espacial gerada por campo quando existem coordenadas reais;
- clique na superfície extraída prioriza evidência original e clique na revisada prioriza evidência humana;
- exclusão de evidência humana é auditável e evidência original é protegida;
- correção pode gerar sugestões para experiências irmãs, sem copiar o valor corrigido;
- correção aprovada vira caso de avaliação tenant-scoped, não mudança automática de regra ou modelo.

## Limites

- nenhum currículo real foi enviado a provider externo;
- nenhum LLM está ativado;
- OCR de página continua local e não produz geometria de palavras neste movimento;
- smoke visual autenticado e mensuração em currículos reais autorizados permanecem pendentes; o frontend não possui hosting remoto.
- `supabase start` não conseguiu recriar a baseline local porque migrations históricas anteriores ao M2-A tentam `min(uuid)` e removem o enum `membership_role` ainda referenciado no PostgreSQL 17. A migration nova foi validada e aplicada sobre o baseline real do Prisma-QA; os arquivos históricos não foram reescritos.

## Evidência Prisma-QA

- projeto confirmado: `Prisma-QA`, região `sa-east-1`, PostgreSQL `17.6.1.155`;
- migration remota `20260828055309_adaptive_resume_extraction` aplicada;
- colunas `layout_blocks` e `field_evidence` presentes;
- RLS ativo em `extraction_learning_cases`;
- `anon` sem execução de `retire_profile_review_evidence` e `authenticated` com execução controlada;
- chamada sob role `authenticated` sem JWT foi negada por `private.require_document_reviewer` com SQLSTATE `42501`;
- trigger imutável de eventos preservado;
- advisors não apontaram RLS ausente nem foreign key sem índice para a nova tabela. O advisor registra como avisos esperados as RPCs `security definer` expostas a `authenticated`, protegidas internamente por papel/tenant, e o índice novo ainda sem uso.

## Comandos

`CI=true pnpm run validate` foi aprovado localmente em 2026-08-28:

- lint, foundation e Context Pack aprovados;
- typecheck raiz e web aprovados;
- build web aprovado;
- 61 testes técnicos aprovados;
- 19 casos golden aprovados, sem regressão;
- demonstração vertical `VERTICAL_SLICE_OK`.

O build mantém o aviso já conhecido de chunk Ant Design acima de 900 kB. Não houve falha funcional nem nova dependência.
