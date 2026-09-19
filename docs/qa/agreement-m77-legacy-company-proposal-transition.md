# Acordo M7.7 — transição de proposta legada da empresa

Versão 1.0.0. Decisão do Product Owner em 2026-09-19: processar a proposta existente de “Transformação operacional” da organização Prisma para que o conceito fique aprovado na Knowledge da empresa e uma contribuição separada permaneça pendente de decisão na Knowledge Global. Este acordo complementa, sem substituir, `agreement-m77-knowledge-company-global-governance.md` 1.0.0 e ADR-069.

## DEVE

- D-01 — Selecionar a proposta legada por identidade e empresa ativa, exigir sessão autenticada de Super Admin, estado `awaiting_human_review`, escopo `organization`, tipo `create` e payload original íntegro. A ação exige motivo humano explícito.
- D-02 — Em uma transação, aprovar a proposta original na organização Prisma com o texto, tipo e descrição já propostos, preservando o payload, ator, versão e auditoria. Publicar aliases distintos sem repetir o termo canônico como alias. Tornar o conceito local utilizável e atualizar somente a Inbox/observações vinculadas da mesma organização pelo fluxo M7.7 existente.
- D-03 — Na mesma transação, enfileirar contribuição Global sanitizada, vinculada ao conceito e à organização de origem, ainda `awaiting_human_review`. Repetição da mesma ação não cria segundo conceito nem contribuição.
- D-04 — Oferecer somente ao Super Admin uma ação explícita para propostas legadas pendentes da empresa ativa. Depois da transição, a proposta local aprovada sai da fila de recuperação e a contribuição Global aparece na fila de revisão existente.
- D-05 — Comprovar no registro específico o estado local aprovado, a contribuição Global pendente e os vínculos/auditorias, sem executar decisão Global.

## PROIBIDO

- P-01 — Não aprovar automaticamente na Global, inferir equivalência, executar IA externa ou fabricar decisão humana.
- P-02 — Não usar SQL privilegiado para simular `auth.uid()` ou contornar a autorização server-side; a transição deve partir da sessão real do operador.
- P-03 — Não alterar outra proposta, organização, Perfil ou histórico, nem criar conceito duplicado por retry.
- P-04 — Não expor a fila legada a `owner`, `admin` ou outra empresa; a autorização não depende apenas do frontend.

## FORA DE ESCOPO

- F-01 — Conversão em massa de propostas históricas e reinterpretação retroativa de Perfis.
- F-02 — Redesenho da taxonomia, matching, mecanismo de propostas Globais ou curadoria de competências.
- F-03 — Aprovação, rejeição ou adiamento da contribuição Global.

## AUTONOMIA

- A-01 — Reutilizar `approve_knowledge_proposal`, `m77_enqueue_global_contribution`, políticas e componentes existentes; acrescentar somente a transição e a apresentação necessárias para o registro legado.
- A-02 — Definir o texto da ação, validações de payload e testes negativos sem mudar a semântica acordada.

## PENDENTE

Nenhuma decisão material adicional. O motivo da ação deve registrar a decisão expressa nesta tarefa, sem reinterpretar a descrição proposta.

## CRITÉRIOS DE ACEITE

- CA-01 (D-01/P-02/P-04) — Super Admin autenticado e empresa coincidente conseguem agir; ausência de sessão, papel inadequado, empresa divergente, status/tipo inválido ou motivo insuficiente falham sem escrita.
- CA-02 (D-02/D-03/P-01/P-03) — A proposta original e a Inbox ficam aprovadas; há um conceito local e uma contribuição Global pendente com origem correta. Não há conceito Global publicado nem duplicata após retry.
- CA-03 (D-04) — A tela mostra apenas pendências legadas da empresa ativa para Super Admin; a ação é distinta de “Aprovar” Global e a lista se atualiza após a transição.
- CA-04 (D-05) — Testes dirigidos, CI, inspeção do diff, aplicação versionada, smoke autenticado e consulta read-only posterior registram o estado e os limites no AoT.
