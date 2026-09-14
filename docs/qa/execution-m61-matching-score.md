# Prompt de execução — M6.1 Pontuação de matching

Versão 1.0.1. Contrato normativo integral: `docs/qa/agreement-m61-matching-score.md` 1.0.1. Movimento autorizado pelo Product Owner em 2026-09-13.

Implementar D-001 a D-026 e provar P-001 a P-016 sem ampliar F-001 a F-012. A autonomia A-001 a A-008 cobre encaixe técnico, extensão compatível do resultado existente, função pura, componentes compartilhados, testes, relatório sombra e versionamento.

Ordem de execução: diagnóstico do matching 2.3.0; domínio puro; integração posterior à descoberta; agrupamento e ordenação; UI com progressive disclosure; relatório sombra; validações proporcionais de risco D; documentação, Context Pack e AoT.

Não criar migration, persistência/cache de score, chamada de IA, round trip de banco dentro do cálculo, provider, cutoff, faixa semântica ou produção. Evidência Demonstrada é carregada na fronteira tenant-scoped e consumida somente por vínculo exato e versões reconhecidas. O cálculo não recebe PII.

Fechar em `docs/qa/aot-m61-matching-score.md`, distinguindo prova local, QA, smoke visual e produção.
