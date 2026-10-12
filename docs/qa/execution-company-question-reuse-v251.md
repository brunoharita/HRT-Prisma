# Execução 2.5.1

Contrato congelado integral: `docs/qa/agreement-company-question-reuse-v251.md` v1.0.0. Ler integralmente antes de implementar. D-01..D-08, P-01..P-06, F-01..F-04, A-01..A-03 e CA-01..CA-04 são vinculantes, sem reinterpretação. Preservar invariantes/autoridade dos contratos existentes fora das supersessões explícitas. Mapa prévio em `impact-company-question-reuse-v251.md`; fechamento no AoT da mesma entrega.

Reusar gravação privada existente, adicionar migration compatível e wrappers/integração mínima. Backfill somente de aprovação persistida. QA local isolado antes de produção; verificar live baseline e preservar snapshots. Checks dirigidos, sem suíte integral local por hábito; CI existente permanece. Commit/plano por diff; publicar somente migration/web/documentação e eventual Edge demonstravelmente exigida. Recuperação não usa IA nem cria convite/decisão. Standing authorization cobre integração/main/produção desta melhoria. Persistir até smoke/sincronização.
