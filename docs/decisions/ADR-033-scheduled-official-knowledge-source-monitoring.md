# ADR-033: Monitoramento agendado das fontes oficiais de Knowledge

Status: accepted
Data: 2026-09-03

## Contexto

CBO, ESCO e O*NET mudam fora do Prisma. O catálogo M4 e a ingestão M5.2 preservavam versão e publicação, mas dependiam de uma pessoa para perceber uma nova versão. Isso permitia que uma base continuasse tecnicamente válida e, ainda assim, ficasse desatualizada sem sinal operacional.

## Decisão

Estender `knowledge_sources` e `knowledge_source_versions`, sem criar um catálogo paralelo. `knowledge-source-monitor-1.0.1` consulta somente endpoints oficiais allowlisted: página e CSVs da CBO, página de download da ESCO, página corrente e arquivo histórico do O*NET. O monitor registra versão, data, fingerprint, última checagem, próxima execução, estado e evidência append-only em `knowledge_source_checks`.

Cada fonte vence no primeiro dia do mês às 01:00 em `America/Sao_Paulo`. Um cron horário é somente o scanner de vencimento, o que mantém o horário operacional pela timezone IANA e permite retentativas em 6h, 24h e 72h sem criar agendamentos mutáveis por fonte. Sem vencimento, nenhuma fonte externa é consultada.

O cron chama uma Edge Function sem JWT público, mas com segredo aleatório gerado e mantido no Vault. A função valida o segredo por RPC acessível somente a `service_role`. Chamadas sem segredo falham antes de qualquer fetch. Usuários autenticados podem ler o resumo aprovado; somente Super Admin lê o ledger e nenhum cliente autenticado escreve nele.

Detecção não é publicação. Uma versão nova entra apenas como `catalogued`, com a evidência do monitor, e recebe `update_available` ou `action_required`. Download completo, licença, validação estrutural, staging, diff e publicação continuam seguindo o gate M5.2. A ESCO permanece condicionada ao aceite e ao link por e-mail do portal. O O*NET permanece catalogado até existir importer aprovado. A Home mostra o estado operacional, versão, data da versão e última checagem das três fontes.

## Alternativas consideradas

- Polling no navegador: rejeitado porque depende de alguém abrir a aplicação e expõe coordenação ao cliente.
- GitHub Actions: não escolhido porque adicionaria outro scheduler, secrets e uma fronteira operacional sem necessidade; Supabase Cron, Vault, Postgres e Edge Functions já são a plataforma aceita.
- Um cron mensal fixo em UTC: rejeitado porque não preserva semanticamente `America/Sao_Paulo` nem suporta a política de retentativas.
- Publicação automática: rejeitada porque versão detectada não prova pacote íntegro, licença adequada, diff revisado ou compatibilidade semântica.

## Consequências

A defasagem fica visível e auditável sem criar ações humanas rotineiras. Uma alteração externa não substitui a versão publicada nem reinterpreta Perfis. O scanner horário gera uma chamada interna leve, mas só realiza fetch quando há fonte vencida. Mudança de HTML oficial pode produzir `validation_failed`, preservar a versão ativa e acionar retentativa, em vez de aceitar um resultado ambíguo.

## Evidência

- Migrations `20260903161003` e `20260903163053`.
- `supabase/functions/knowledge-source-monitor/index.ts`.
- `src/knowledge/sourceMonitoring.ts`.
- `tests/knowledgeSourceMonitoring.test.ts`.
- `docs/qa/source-monitoring-evidence.md`.
