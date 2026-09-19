# Contrato de Acordos — Publicação eficiente por impacto

## Objetivo

- Versão do contrato: 1.0.0.
- Fonte da decisão: aprovação do Product Owner em 2026-09-18 para implementar integralmente o fluxo proposto de Git, Supabase, VPS e adaptação do processo de prompts no Projeto do ChatGPT.
- Delta: cria governança e automação operacional; não altera comportamento funcional do produto.

## DEVE — Inegociável

- D-01 — Classificar cada movimento somente pelas superfícies diretamente presentes no diff ou exigidas por dependência demonstrável.
- D-02 — Selecionar validações e destinos entre Git, banco, Edge Functions e web sem republicar superfícies não afetadas.
- D-03 — Disponibilizar comandos reproduzíveis `plan`, `validate`, `publish` e `verify`, com publicação mutável exigindo SHA completo e opção explícita de execução.
- D-04 — Publicar um commit coerente e promover exatamente o SHA validado, sem commits ou pushes intermediários desnecessários.
- D-05 — Manter registro verificável das divergências do ledger Supabase e aplicar apenas migrations novas revisadas enquanto o histórico não for integralmente equivalente.
- D-06 — Produzir um único comprovante compacto por release, separando Git, Supabase, Edge Functions, web, validações e limites.
- D-07 — Entregar uma rotina específica para construir prompts maiores no Projeto do ChatGPT a partir da fonte compacta gerada, sem enviar o repositório inteiro como contexto padrão.

## PROIBIDO

- P-01 — Incluir melhoria adjacente, arquivo alheio, teste ou destino sem relação direta e necessária com o movimento.
- P-02 — Force-push, reescrita de histórico Git, alteração retroativa de migration aplicada ou reparo do ledger sem prova de equivalência.
- P-03 — `supabase db push` geral enquanto `cliDbPushAllowed` estiver falso; republicação de todas as Edge Functions por padrão.
- P-04 — Reconstruir VPS, gateway, workers ou frontend quando a superfície correspondente não mudou.
- P-05 — Gravar secrets, tokens, chaves ou dados pessoais em Git, recibos, logs ou prompts.

## FORA DE ESCOPO

- F-01 — Criar um segundo ambiente remoto ou branch paga do Supabase.
- F-02 — Alterar regras funcionais, schema, RLS, Auth, dados ou runtime do Prisma.
- F-03 — Apagar, renomear em massa ou reaplicar migrations históricas para fazer o CLI aparentar alinhamento.
- F-04 — Automatizar decisões humanas de produto, risco, rollback ou aceite.

## AUTONOMIA DE ENGENHARIA

- A-01 — Estrutura interna dos scripts, formato JSON do mapa/recibo e seleção de APIs nativas de Node e Git.
- A-02 — Organização documental e testes negativos necessários para provar fail-closed.

## PENDÊNCIAS

- Nenhuma decisão material pendente para esta versão.

## CRITÉRIOS DE ACEITE

- CA-D01/D02 — Diffs sintéticos de docs, web, migration e função geram rotas distintas e não acionam destinos alheios.
- CA-D03/D04 — Publicação sem SHA, em `main`, com worktree rastreado sujo ou caminho desconhecido falha antes de mutar o remoto.
- CA-D05 — Auditoria local cobre todas as migrations conhecidas, registra divergências e mantém o push geral bloqueado.
- CA-D06 — `--receipt` produz um único JSON estruturado.
- CA-D07 — Runbook informa fonte, instrução de projeto, abertura de chat por movimento e prompt mínimo.

## ESTADO

- `agreed`

## APROVAÇÃO

- Product Owner: Bruno.
- Data: 2026-09-18.
- Evidência de aprovação: “pode implementar tudo”.
- Referência para execução: versão 1.0.0 deste contrato.
