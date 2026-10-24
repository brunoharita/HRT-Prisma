# AoT — auditoria RAG / Gerente de Estoque

Acordo/execução: `agreement-position-rag-audit-fix.md` 1.0.0. Baseline b1c7f21dd37932e7d5cf27df885c4d4d6ed78b67. Versão pública 3.2.1 preservada.

| Requisito | Implementação e evidência | Status |
| --- | --- | --- |
| D-01 | Removido campo não declarado da abertura de auditoria; 10 testes do worker e integração dos envelopes reais no PostgreSQL local | PASS |
| D-02 | Referências CBO publicadas existentes; execução real após implantação ainda pendente | NOT TESTED |
| D-03 | Nenhuma API de aprovação/associação invocada; hashes baseline de 23 versões, 12 aprovações e 30.257 conceitos registrados; comparação final pendente | PARTIAL |
| D-04 | CI/publicação/smoke/sincronização pendentes | NOT TESTED |
| P-01 | Sem novo armazenamento, fonte inventada, chamada paga ou enfraquecimento da auditoria. Campos extras negados pelo SQL | PASS |

Mapa e regressão: direct worker/auditoria, 10 testes; integração com PostgreSQL17 local descartável 127.0.0.1:55479, 50 assertions incluindo tenant, dedupe, lease, decisões e payloads reais; 43 testes de síntese, auditoria compartilhada e entrega de avaliações PASS. Primeiro teste de harness falhou porque a consulta auxiliar tentou ler tabela de auditoria como anon; corrigida a captura pelo retorno público permitido, sem alterar produto ou grants. Evidência `evidence/position-rag-audit-fix/sql.txt`. Sem suíte integral local. CI obrigatório preservado.
