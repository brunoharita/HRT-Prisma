# Execução — Prisma v2.0.2: evidências da importação

Versão 1.0.0. Fonte integral congelada: `docs/qa/agreement-import-evidence-v202.md` 1.0.0, aprovado pela instrução de Bruno em 2026-10-03. Ler o contrato completo: todos os D-01 a D-06, P-01 a P-03, F-01/F-02, A-01/A-02 e CA-D01 a CA-D06 são obrigatórios, sem substituição.

Executar no baseline isolado `codex/fix-import-evidence-v202`, preservando material não rastreado. Reutilizar Parser/cache, RPC privada de persistência e auditoria existentes. Corrigir a compatibilidade no adaptador e servidor antes de expor a web; versionar o adaptador aditivo sem invalidar o cache/prompt/modelo. Validar em PostgreSQL local descartável as RPCs reais com fixtures sintéticas e rollback; nenhuma aprovação humana fabricada. Validar estados/render da tela de importação, proteção de dados e recuperação da fonte/cache.

Atualizar owner docs, v2.0.2 e Context Pack; obter plano do diff committed, deduplicar verificações, revisar diff e fechar AoT pelo template. Commit/push/CI, promoção fast-forward para main, migration pelo conector autorizado, Parser/web seletivos, smoke e sincronização estão autorizados. Não executar `db push` geral, suíte local integral, nova inferência paga ou reprocessamento alheio. Uma nova decisão material interrompe somente a parte afetada.
