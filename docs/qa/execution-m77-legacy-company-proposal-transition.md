# Execução M7.7 — transição de proposta legada da empresa

Contrato congelado: `docs/qa/agreement-m77-legacy-company-proposal-transition.md` 1.0.0. Ler o acordo integralmente. Implementar D-01 a D-05 e CA-01 a CA-04; impedir P-01 a P-04; preservar F-01 a F-03; aplicar A-01 e A-02.

O único registro identificado na inspeção read-only de produção é a proposta `8415c9fa-3986-419c-be32-b2e47209637f`, da organização Prisma, com termo e label “Transformação operacional”, `scope=organization`, `status=awaiting_human_review` e nenhum conceito/alias exato publicado. O ID identifica o alvo operacional, não deve virar regra hard-coded de produto. Antes da ação, reconfirmar seu estado. Processar a decisão do PO por sessão autenticada, nunca por SQL privilegiado com ator simulado. Reutilizar aprovação e enfileiramento existentes em uma transação; revisar negativos, rollback, diff, CI, release plan e resultado real. Nenhuma decisão Global é delegada ao agente.
