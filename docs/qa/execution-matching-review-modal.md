# Execução — modal de revisão de divergências v1.0.0

Fonte integral: `docs/qa/agreement-matching-review-modal.md` v1.0.0, aprovado por Bruno em 2026-10-01. Implementar D-01 a D-04 e demonstrar P-01 a P-03 e CA-01 a CA-04, preservando F-01. A-01 delega somente componentes e apresentação.

Reutilizar `TrajectoryConflictReview`, a API de revisão e as categorias estruturadas existentes. Substituir a expansão no cartão por modal responsivo, mostrar as duas leituras e a pergunta humana por item, tornar as três escolhas fechadas visíveis, manter os estados antigos e a checagem explícita. Validar somente a superfície afetada, registrar AoT e publicar as superfícies indicadas pelo plano de release. Não usar IA ou dados pessoais reais para smoke.
