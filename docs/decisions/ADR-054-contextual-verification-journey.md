# ADR-054 — Jornada contextual de verificação

- Status: aceito
- Data: 2026-09-14

## Contexto

O M5.1 implementou preparação e execução, mas a caixa de necessidades ainda podia criar uma fixture ao ler e a interface não preservava de ponta a ponta o requisito que originou a verificação. Controles sem escolha e ações sem resposta enfraqueciam a confiança.

## Decisão

A origem autoritativa passa a ser uma ação humana sobre um requisito dentro de uma avaliação de matching persistida e versionada. Uma RPC tenant-scoped valida avaliação, versão e requisito, copia o snapshot de evidência e cria ou reutiliza a necessidade exata. Loaders não escrevem. Preparação, convite, monitor e resultado projetam o mesmo contexto e sua linha do tempo. Evidência Demonstrada continua independente e só afeta a mesma competência/requisito versionado.

## Consequências

O fluxo fica reproduzível e auditável sem arquitetura paralela. Necessidades sintéticas antigas continuam legíveis, mas nenhuma nova é criada por leitura. Requisitos sem Definition/Item Bank compatível ficam explicitamente indisponíveis. Produção e avaliação de Pessoas reais continuam bloqueadas.

## Contratos

- `m62-contextual-verification-journey-1.0.0`
- `m62-evidence-sufficiency-1.0.0`
- `m62-contextual-verification-policy-1.0.0`
