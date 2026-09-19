# AoT — M7.7, proposta legada “Transformação operacional”

Contrato: `agreement-m77-legacy-company-proposal-transition.md` 1.0.0. Alvo operacional: proposta `8415c9fa-3986-419c-be32-b2e47209637f`, organização Prisma `5dcad29a-1dd2-4c12-9adb-8015a79bea4e`.

## Acordos → implementação → teste → evidência

| ID | Implementação | Teste / evidência | Status |
| --- | --- | --- | --- |
| D-01 | RPC exige Super Admin autenticado, empresa, estado, tipo, payload original e motivo | `bruno.harita`/Super Admin, empresa Prisma, acionou somente a proposta alvo; motivo persistido e ator confirmado | PASS |
| D-02 | RPC reutiliza `approve_knowledge_proposal`, que ignora alias canônico redundante, e atualiza Inbox/observações vinculadas | Conceito local `ac3de3c2-ea84-4595-a65d-b615723cae93` aprovado; um termo canônico; Inbox aprovada; zero observações vinculadas | PASS |
| D-03 | Mesmo bloco transacional chama `m77_enqueue_global_contribution`; retry lê IDs existentes | Uma contribuição `4b2c6be1-5993-4f98-8fb0-5e3816071e3f`, `awaiting_human_review`, origem vinculada; ramo de retry revisado, sem repetição de escrita em produção | PASS |
| D-04 | UI distingue ação local legada da fila Global e filtra empresa ativa | Testes de visibilidade, typecheck/build; smoke autenticado mostrou card local, ação, desaparecimento local e contribuição Global; rótulo final corrigido para “Pendente de revisão” | PASS |
| D-05 | Consulta posterior deve provar local aprovado, Global pendente e auditorias | Consultas read-only: original `approved`, conceito local aprovado, um approval, ator/motivo e payload íntegros, Global pendente e `published_concept_id` nulo | PASS |

| ID | Guarda / fora de escopo | Evidência | Status |
| --- | --- | --- | --- |
| P-01 | Sem decisão/IA Global automática | RPC chama só enfileiramento; revisão de diff | PASS |
| P-02 | Sem simular JWT por SQL | RPC usa `auth.uid()` via `require_knowledge_admin`; ação prevista por sessão real | PASS |
| P-03 | Sem outras propostas/empresas/Perfis ou duplicata | Identidade e empresa validadas; uma contribuição vinculada; zero observações vinculadas e nenhuma reinterpretação acionada | PASS |
| P-04 | Sem acesso owner/admin | `require_knowledge_admin(null)` exige Super Admin; grant `anon` negado, UI filtra outros papéis; sem sessão não-Super Admin usada em produção | PASS |
| F-01–F-03 | Sem conversão em massa, taxonomia nova ou decisão Global | Diff e escopo da migration | PASS |

## Validação e rollout

- `pnpm run typecheck:web`, `pnpm run build:web`, `pnpm run build`: PASS.
- Nove testes dirigidos de M7.7/visibilidade/transição: PASS; o rótulo pendente recebeu asserção adicional.
- `pnpm run generate:prisma-context` e `pnpm run check:prisma-context`: PASS.
- CI da primeira revisão (`35456611464`) falhou em um teste do Context Pack compacto por perda da referência textual `Prisma v1.7.6`; a fonte canônica foi ajustada, os artefatos regenerados e o CI seguinte `35456787469` PASS.
- CI do SHA `e8aca96` passou foundation, ledger e deploy script, mas o audit de dependências falhou duas vezes exclusivamente por `503` de manutenção do registry npm; não houve mudança de dependências desde o SHA com audit aprovado. A falha externa não foi registrada como PASS.
- Não há QA remota separada. A migration local `20260919164100` foi aplicada no projeto de produção sob a versão remota `20260919170313`; `anon` não executa a RPC, `authenticated` recebe apenas a entrada que verifica Super Admin.
- `main`/GitHub e a VPS avançaram a `e8aca96`. O smoke imediato do publicador recebeu `502` na janela de recriação; inspeção posterior confirmou `prisma-web` em execução e HTTPS `200`. O smoke autenticado executou o único caso real.
- Sem referência visual normativa para esta ação; foram reutilizados os componentes de `Conhecimento > Propostas`.

## Desvios e limite

Nenhum desvio conhecido do acordo. O resultado de dados solicitado está confirmado em produção: organização Prisma aprovada, Global pendente, sem aprovação Global. Não foi criado teste sintético nem acionado retry para não introduzir escrita real desnecessária. O audit externo do CI permaneceu indisponível (`503`) no SHA de publicação; o gate de código/ledger passou, e o SHA imediatamente anterior teve audit aprovado sem mudança de dependências.
