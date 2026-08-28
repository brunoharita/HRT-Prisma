# Evidência de extração adaptativa v2

Data: 2026-08-28. Ambientes: checkout local na branch `codex/adaptive-review-learning-v2` e banco Prisma-QA. Não existe ambiente de produção separado.

## Escopo validado

- geometria e ênfase do PDF preservadas por linha;
- cargo, descritor de atuação, período `Jan/25 - Atual` e empresa na linha seguinte separados corretamente em fixture sintética;
- evidência espacial gerada por campo quando existem coordenadas reais;
- clique na superfície extraída prioriza evidência original e clique na revisada prioriza evidência humana;
- exclusão de evidência humana é auditável e evidência original é protegida;
- correção pode gerar sugestões para experiências irmãs, sem copiar o valor corrigido;
- correção aprovada vira caso de avaliação tenant-scoped, não mudança automática de regra ou modelo.
- correção confirmada relê o bloco completo de cada experiência irmã diretamente da fonte, inclusive quando a estrutura antiga perdeu o separador do período;
- cargo, empresa, período e descrição são propostos e aceitos separadamente, sem sobrescrever campo já revisado;
- permanências com cargos subordinados são preservadas como um bloco no contrato plano atual;
- aceite parcial salva revisão, evento e casos na mesma transação, recarrega o rascunho sincronizado e não bloqueia nova evidência;
- padrão organizacional metadata-only nasce somente após aprovação integral e pode orientar a primeira extração futura do mesmo tenant.

## Limites

- nenhum currículo real foi enviado a provider externo;
- nenhum LLM está ativado;
- OCR de página continua local e não produz geometria de palavras neste movimento;
- smoke visual autenticado e mensuração em lote de currículos reais autorizados permanecem pendentes; o frontend não possui hosting remoto e o navegador disponível não tinha sessão autenticada.
- `supabase start` não conseguiu recriar a baseline local porque migrations históricas anteriores ao M2-A tentam `min(uuid)` e removem o enum `membership_role` ainda referenciado no PostgreSQL 17. A migration nova foi validada e aplicada sobre o baseline real do Prisma-QA; os arquivos históricos não foram reescritos.

## Evidência Prisma-QA

- projeto confirmado: `Prisma-QA`, região `sa-east-1`, PostgreSQL `17.6.1.155`;
- migration remota `20260828055309_adaptive_resume_extraction` aplicada;
- migrations remotas `adaptive_review_learning_v2` e `adaptive_review_learning_v2_rpc_fix` aplicadas;
- migration remota `adaptive_review_learning_v2_fk_indexes` aplicada após o advisor apontar duas foreign keys sem cobertura;
- colunas `layout_blocks` e `field_evidence` presentes;
- RLS ativo em `extraction_learning_cases`;
- `anon` sem execução de `retire_profile_review_evidence` e `authenticated` com execução controlada;
- chamada sob role `authenticated` sem JWT foi negada por `private.require_document_reviewer` com SQLSTATE `42501`;
- trigger imutável de eventos preservado;
- após a correção, advisors não apontam RLS ausente nem foreign key adaptativa sem índice. O advisor registra como avisos esperados a RPC `security definer` exposta a `authenticated`, protegida internamente por papel/tenant, e os índices novos ainda sem uso porque as tabelas estão vazias;
- `profile_review_adaptation_events` e `organization_extraction_patterns` mantêm RLS e não aceitam DML direto do cliente;
- sessão `authenticated` sem JWT foi negada com SQLSTATE `42501`;
- transação autorizada com rollback comprovou revisão, evento, caso candidato, incremento de lock e replay idempotente;
- segunda transação com rollback comprovou que o padrão não é promovido no rascunho e só aparece após `approve_profile_review`;
- contagem final de registros de teste: zero eventos adaptativos e zero padrões organizacionais.

## Comandos

`CI=true pnpm run validate` foi aprovado nesta branch:

- lint, foundation e Context Pack aprovados;
- typecheck raiz e web aprovados;
- build web aprovado;
- 68 testes técnicos, incluindo 9 regressões específicas da extração adaptativa v2 e 2 regressões de contenção espacial estrita;
- 19 casos golden aprovados, sem regressão;
- demonstração vertical `VERTICAL_SLICE_OK`.

O build mantém o aviso já conhecido de chunk Ant Design acima de 900 kB. Não houve falha funcional nem nova dependência.
