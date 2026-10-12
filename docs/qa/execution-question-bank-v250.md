# Execução V2M5 - Banco de questões 2.5.0

Contrato integral congelado: docs/qa/agreement-question-bank-v250.md v1.0.0.

PROMPT DE EXECUÇÃO
1. Leia AGENTS completo e os donos relevantes, verifique baseline/git e preserve untracked. Comunique entendimento conciso dos D/P/F/A sem reabrir aprovação.
2. Persistir o acordo acima, Execution Prompt fiel e Mapa de Impacto antes de implementação. Mapear direct/plausible_indirect/critical_transversal/no_impact_identified, capacidades protegidas, baseline por ambiente/SHA, regressão, rollback e AoT. Descobertas atualizam mapa. Não criar microtarefas separadas para commit/test/deploy deste objetivo.
3. Inicie branch codex/ isolada conhecida; local primeiro. Só use worktree se reduz colisão, conforme AGENTS. Este thread foi criado no projeto local canônico, não no antigo projeto “Prisma 2”.
4. Inventarie capacidades reais que serão reaproveitadas: conteúdo seguro de questão, família/versão, autoridades backend, processo de geração/contextual/consumo, cobertura e governança. Não confunda endpoint existir com configuração/ativação verificada.
5. Implemente o escopo completo com diferenças históricas preservadas. Serviços, contratos e schemas apenas quando necessários. Carregamento, draft preservation e permissões exigem teste, não apenas CSS.
6. Use pnpm e dispatcher/release plan para checks dirigidos deduplicados. Não rodar pnpm validate/suite local integral por hábito; obter aprovação fundamentada se realmente necessário. D sensível requer negativos e QA-first com evidência. Não subdelegar automaticamente: só subagentes quando autorizado/instruído.
7. Capture prova visual e functional regressions com fixtures não pessoais. Provar casos sem dados/reais identificados/longos/origem privada/global/permissão reduzida e contexto de retorno. Sem produção real mutation só para teste.
8. Atualize docs donos, PRISMA_CURRENT_STATE, version metadata 2.5.0, Context Pack e exports pelos geradores. Se untracked contaminarem o gerador, use checkout temporário controlado do snapshot da tarefa sem removê-los; gere exatamente fontes finais e check.
9. Faça own-diff review, coherent commit/push/integrate main em origin verificado. release:plan define superfícies; publique um SHA validado explícito com --execute e standing authorization. Frontend/DB/Edge apenas se exigidos pelo plano, migrations forward, compatibilidade e rollback. Attach PR se criar.
10. Smoke produção após estabilização, assets/rotas/health/versão/SHA; preserve rollback e serviços não afetados. 404 temporário de recreate não é fracasso final nem justifica reconstruir sem diagnóstico.
11. AoT com PASS/FAIL/PARTIAL/BLOCKED/NOT TESTED, novo comportamento vs preservação, desvios e provas. Final conciso PT-BR com release/SHA/surfaces/testes e limites. Persistir até conclusão; não parar no plano.
