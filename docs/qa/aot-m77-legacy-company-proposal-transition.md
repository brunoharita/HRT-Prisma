# AoT — M7.7, proposta legada “Transformação operacional”

Contrato: `agreement-m77-legacy-company-proposal-transition.md` 1.0.0. Alvo operacional: proposta `8415c9fa-3986-419c-be32-b2e47209637f`, organização Prisma `5dcad29a-1dd2-4c12-9adb-8015a79bea4e`.

## Acordos → implementação → teste → evidência

| ID | Implementação | Teste / evidência | Status |
| --- | --- | --- | --- |
| D-01 | RPC exige Super Admin autenticado, empresa, estado, tipo, payload original e motivo | Teste dirigido e revisão da migration; execução real pendente | PARTIAL |
| D-02 | RPC reutiliza `approve_knowledge_proposal`, que ignora alias canônico redundante, e atualiza Inbox/observações vinculadas | Teste dirigido e revisão de schema; estado real pendente | PARTIAL |
| D-03 | Mesmo bloco transacional chama `m77_enqueue_global_contribution`; retry lê IDs existentes | Teste dirigido; confirmação real e retry sem escrita de teste pendentes | PARTIAL |
| D-04 | UI distingue ação local legada da fila Global e filtra empresa ativa | Testes de visibilidade, typecheck e build web PASS; smoke pendente | PARTIAL |
| D-05 | Consulta posterior deve provar local aprovado, Global pendente e auditorias | Pendente de execução autenticada | NOT TESTED |

| ID | Guarda / fora de escopo | Evidência | Status |
| --- | --- | --- | --- |
| P-01 | Sem decisão/IA Global automática | RPC chama só enfileiramento; revisão de diff | PASS |
| P-02 | Sem simular JWT por SQL | RPC usa `auth.uid()` via `require_knowledge_admin`; ação prevista por sessão real | PASS |
| P-03 | Sem outras propostas/empresas/Perfis ou duplicata | Filtros de identidade, empresa e status; prova real pendente | PARTIAL |
| P-04 | Sem acesso owner/admin | Autorização Super Admin na RPC e filtro UI; negativo transacional pendente | PARTIAL |
| F-01–F-03 | Sem conversão em massa, taxonomia nova ou decisão Global | Diff e escopo da migration | PASS |

## Validação e rollout

- `pnpm run typecheck:web`, `pnpm run build:web`, `pnpm run build`: PASS.
- Nove testes dirigidos de M7.7/visibilidade/transição: PASS.
- `pnpm run generate:prisma-context` e `pnpm run check:prisma-context`: PASS.
- CI da primeira revisão (`35456611464`) falhou em um teste do Context Pack compacto por perda da referência textual `Prisma v1.7.6` no recorte; a fonte canônica foi ajustada, os artefatos regenerados e `tests/tooling/prismaContext.test.mjs` passou. A nova execução de CI ainda é necessária.
- Não há QA remota separada. CI corrigido `35456787469` PASS. A migration local `20260919164100` foi aplicada no projeto de produção sob a versão remota `20260919170313`; apenas funções foram instaladas, sem alterar o registro. `anon` não executa a RPC, `authenticated` recebe apenas a entrada que verifica Super Admin. Smoke autenticado e verificação read-only do alvo são pendentes.
- Sem referência visual normativa para esta ação; foram reutilizados os componentes de `Conhecimento > Propostas`.

## Desvios e limite

Nenhum desvio conhecido do acordo. Não declarar o resultado solicitado como concluído antes de confirmar a mutação real e a contribuição Global pendente.
