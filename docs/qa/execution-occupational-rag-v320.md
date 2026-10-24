# Execução do RAG ocupacional 3.2.0

Contrato congelado: [agreement-occupational-rag-v320.md](agreement-occupational-rag-v320.md), versão 1.0.0, integralmente aplicável. Autoridade: aprovação explícita de Bruno em 24/10/2026, incluindo produção e versão 3.2.0.

Implementar D-01 a D-08 e D-UX-01, preservando P-01 a P-03 e P-UX-01. F-01 permanece excluído; A-01/A-02 delegam a seleção validada dos modelos e a engenharia, sem alterar a autoridade humana. Não há pendência de comportamento.

Executar no branch isolado `codex/occupational-rag-v320` a partir de `6b434a6c12853a3a824f68bc9cd5783ff66e6bdf`. Reutilizar filas, curadoria, persistência e histórico existentes; alterações aditivas somente. Recuperação lexical com expansão e reranking semântico é candidata, nunca equivalência publicada. Gerar somente propostas pendentes. Aprovação local alimenta automaticamente a contribuição global sanitizada. Preservar entradas originais, edições, fontes, autoria e versões.

Gates mínimos: PoC real sintética dos modelos gratuitos (qualidade, JSON, memória/CPU/latência); testes determinísticos domínio/worker; SQL PostgreSQL com dependências reais, RLS e negativos; regressão dirigida de curadoria, publicação e filas; render das três telas e mobile frente às referências; typecheck/build, lint e checks afetados; CI obrigatória. Não executar suíte integral local. Atualizar ADR, documentação proprietária, mapa/AoT e Context Pack. Publicar somente superfícies determinadas pelo diff, com migração seletiva, rollback de ativação, smoke e sincronização.

Conclusão exige todos os D-* comprovados; registrar limitações e falhas de benchmark sem convertê-las em aprovação. Não criar dados sintéticos em produção nem reprocessar pessoas históricas.
