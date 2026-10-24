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

Primeira publicação: worker d8160831d328484e3840d1048fcfafa3ab98196d, CI branch40140413151/main40140527697 SUCCESS; imagem b47540259c7a saudável e sete serviços adjacentes intactos. Web3.2.1/17smokes PASS, sem rebuild. A primeira invocação do deploy foi rejeitada pelo guard de SHA digitado incorretamente, antes de modificar runtime; corrigido com SHA verificado. Retomado o Inbox real existente: auditoria e expansão lexical concluídas (116371ms); PostgreSQL cancelou a recuperação por statement_timeout, execução registrada com erro preservado. D-01 permanece PARTIAL até conclusão real.

Migração de busca: agregação de aliases em lote, filtro textual antes das consultas de fontes; mantém autorização/lease/tenant/versão publicada/40 candidatos. Comparação antiga/nova em cinco buscas, mil cargos sintéticos com limite3s e suite original/negativos PASS (57assertions). Nova superfície direct banco explicitada no mapa antes da implementação SQL; sem aumento de timeout ou grants. Evidência SQL atualizada; publicação seletiva da função pendente.
