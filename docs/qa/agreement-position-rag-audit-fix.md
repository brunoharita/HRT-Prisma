# Acordo e execução — correção operacional do reconhecimento 3.2.1

Versão 1.0.0, agreed pela solicitação explícita de Bruno em 2026-10-24. Baseline b1c7f21dd37932e7d5cf27df885c4d4d6ed78b67. Delta do acordo position-rag-v321 1.0.0; contratos e UX preservados.

- D-01: corrigir a falha real do reconhecimento de Gerente de Estoque reutilizando RAG/Knowledge e modelos gratuitos existentes.
- D-02: validar o contexto real e exibir ao menos uma referência oficial fundamentada disponível nas bibliotecas, com origem e justificativa; similaridade não estabelece equivalência.
- D-03: manter associação, versões da posição, histórico, aprovações e decisões humanas intactos; qualquer proposta gerada permanece pendente, sem aprovação ou aplicação.
- D-04: publicar a correção na mesma versão 3.2.1, com CI, smoke e sincronização.
- P-01: inventar referência/código, forçar equivalência, contornar auditoria/autorização, novo catálogo/tabela, chamada paga ou aprovação implícita.
- F-01: backfill, alteração de Score/matching, redesign e integração de busca externa, desnecessária se referências oficiais já publicadas atenderem.
- A-01: correção de integração, testes negativos e evidência proporcional delegados. Nenhuma decisão material pendente.
- CA-01: envelopes reais do worker aceitos pelo PostgreSQL local e campos extras rejeitados; pipeline real apresenta candidatos oficiais; associação/aprovações inalteradas antes/depois; CI e runtime publicado verificados.

## Mapa de impacto e execução congelada

Classe D, reutilização da decisão ADR-089. `direct`: worker ocupacional e metadados de auditoria; baseline produção falha RAG_AUDIT_UNAVAILABLE antes de pesquisa, em 212 ms. `critical_transversal`: fronteira de auditoria/tenant, contratos PostgreSQL e credenciais privados preservados; sem alteração de grants ou SQL de produção. `plausible_indirect`: síntese de perfil e entrega de avaliações compartilham processo; exigir testes direcionados existentes, health e ausência de alteração dos módulos. `no_impact_identified`: frontend, associação/versionamento, Knowledge aprovada, Score e Horus, porque somente envelope de abertura de auditoria do worker muda, sem funções de decisão ou persistência desses domínios.

Executar D-01..04; impedir P-01; manter F-01; A-01 governa implementação. Validação mínima: testes do worker e auditoria, integração SQL local com envelopes capturados do worker, testes do processo compartilhado, CI obrigatório, execução autorizada do mesmo Inbox real e comparação de hashes de posições/aprovações. Encerrar com AoT e publicação apenas do worker, sem rebuild do web/modelos intactos. Rollback pela imagem anterior, sem apagar fila/histórico.

Revisão do mapa após execução real: `direct` inclui também `search_occupational_rag_candidates`, que excedeu statement_timeout após expansão lexical bem-sucedida. D-01 já autoriza corrigir a consulta; sem nova decisão de produto. Migração substitui consultas correlacionadas de aliases por uma agregação e verifica elegibilidade após filtro lexical, preservando filtros, limites, termos e fontes. Regressão exige comparação antiga/nova, volume sintético, negativos anteriores e execução real. Plano de publicação passa a incluir exclusivamente essa função de banco, além do worker já corrigido. Rollback da função pela definição anterior, sem apagar dados. Não elevar timeouts nem retirar gates.
