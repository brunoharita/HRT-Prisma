# Execução — revisão humana de divergências v1.0.0

Fonte integral: `docs/qa/agreement-matching-human-conflicts.md` v1.0.0, aprovado por Bruno em 2026-09-30. Ler o acordo completo antes da implementação. Implementar D-01 a D-05, provar P-01 a P-03 e CA-01 a CA-04. Preservar F-01; A-01 delega somente armazenamento e apresentação compatíveis com o repositório.

Sequência: (1) projetar revisão auditável e controle de autoridade reutilizando o cache/Edge; (2) expor no detalhe de matching até cinco conflitos com suas evidências e ação humana; (3) recalcular pelo motor compartilhado após decisão íntegra; (4) testes negativos, QA, publicação seletiva e AoT. Nenhuma chamada paga a dados reais é necessária como teste.
