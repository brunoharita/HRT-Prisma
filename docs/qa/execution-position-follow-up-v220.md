# Execução — Acompanhamento Pessoa–Posição v2.2.0
Referência integral congelada: docs/qa/agreement-position-follow-up-v220.md versão1.0.0. Ler integralmente. Autoridade Bruno 08/10/2026, implementação/main/publicação2.2.0.
Implementar todos D-01–D-12, D-UX-01/02; preservar P-01–P-04/P-UX-01; F-01/02 excluídos; A-01–A-03 delegados; atender todos CA incluindo visuais/negativos. Nenhuma reinterpretação autorizada.
Sequência: baseline/contrato/mapa -> implementação local -> negativos SQL e regressão dirigida/browser/visual -> plano committed diff -> commit/push/CI -> banco remoto único necessário -> main/frontend -> smoke/sincronização -> AoT.
Branch técnica isolada integra main conforme contrato. Não rodar suíte integral local; dispatcher deduplicado e validações afetadas.
