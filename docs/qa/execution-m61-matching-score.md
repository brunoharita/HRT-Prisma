# Prompt de execução — M6.1 Pontuação de matching

Versão 1.1.0. Contrato normativo integral: `docs/qa/agreement-m61-matching-score.md` 1.1.0. Movimento autorizado pelo Product Owner em 2026-09-13.

Implementar D-001 a D-026 e provar P-001 a P-016 sem ampliar F-001 a F-012. A autonomia A-001 a A-008 cobre encaixe técnico, extensão compatível do resultado existente, função pura, componentes compartilhados, testes, relatório sombra e versionamento.

O adendo aprovado implementa D-027 a D-029 e prova P-017/P-018: inclusão manual sincroniza apresentação e valor `required`; rascunho assistido exige classificação; frontend e `save_vacancy_definition` rejeitam nova versão com `unclassified`; leitura histórica permanece compatível. Aplicar migration forward-only no Prisma-QA e criar a nova versão da Posição `Analista de Marketing` classificando como obrigatórios apenas `RD Station`, `2 anos de experiência comprovada na área` e `Office`, preservando os dois desejáveis.

Ordem de execução: diagnóstico do matching 2.3.0; domínio puro; integração posterior à descoberta; agrupamento e ordenação; UI com progressive disclosure; relatório sombra; validações proporcionais de risco D; documentação, Context Pack e AoT.

Não criar persistência/cache de score, chamada de IA, round trip de banco dentro do cálculo, provider, cutoff, faixa semântica ou produção. A única migration autorizada protege a RPC existente e avança `vacancy-definition` para 1.2.0 sem reescrever snapshots históricos. Evidência Demonstrada é carregada na fronteira tenant-scoped e consumida somente por vínculo exato e versões reconhecidas. O cálculo não recebe PII.

Fechar em `docs/qa/aot-m61-matching-score.md`, distinguindo prova local, QA, smoke visual e produção.
