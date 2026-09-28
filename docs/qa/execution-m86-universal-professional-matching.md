# Prompt de Execução — M8.6 Matching profissional universal

Executar integralmente `docs/qa/agreement-m86-universal-professional-matching.md` versão `1.0.0` nesta revisão. O acordo está congelado pelo Product Owner nesta conversa. Implementar somente seus D-*, P-*, F-* e A-*; reutilizar o pipeline, Knowledge, cache, snapshots, server-side authority e runtime gerado existentes.

Entregar em uma mudança coerente: generalização do interpretador e do prompt; fallback Knowledge-first/IA-last; descoberta sem veto lexical com exclusão apenas de Perfil sem conteúdo profissional utilizável; grupos e cálculo determinísticos; híbridos; política de duração/recência e senioridade; proposta tenant-scoped de aprendizado pelo fluxo existente; documentação, testes e evidências.

Não criar taxonomia paralela, não reprocessar históricos, não pesquisar Pessoas externamente, não publicar aprendizado automaticamente e não tratar falha/ausência como incapacidade ou zero.

Validar antes de liberar: corpus sintético separado da calibração; positivos/negativos e invariância de nomenclatura; testes de autoridade/tenant/cache/snapshot/citações; build, typecheck, lint, runtime gerado, release plan e smoke proporcional. Atualizar Context Pack e AoT com PASS/PARTIAL/BLOCKED real. Se qualquer CA crítica falhar, não declarar M8.6 concluído nem publicar a ativação como validada.
