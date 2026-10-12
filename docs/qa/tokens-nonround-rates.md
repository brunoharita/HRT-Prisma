# Tokens Prisma — tarifas não redondas

Agreement/Execution 1.0.0, aprovado pelo pedido explícito de Bruno em 12/10/2026. Delta do acordo `tokens-prisma-v240.md`: supersede apenas as quantidades iniciais de D-04; regras de saldo, ciclo, pacote, autoridade e UX continuam. Baseline main/origin/VPS `65c555f2cf44e12f0c87d6c21202f33b1f1b26ac`, app v2.5.1. Supabase produtivo ioldpnqqvobprjiontre ACTIVE_HEALTHY, tarifas atuais 2.000/10.000/5.000; sem tarifas futuras. PostgreSQL17 local descartável 127.0.0.1:55479/import_evidence_v202, vazio, verificado. Risco D limitado à atualização versionada de dados comerciais.

## Agreement

- D-01: novas tarifas fixas inteiras não múltiplas de dez: questão 2.347, Parser IA 14.785, síntese 6.193. Aplicam a novas cotações por ambos os geradores de questões e demais consumidores da mesma tabela.
- D-02: criar três novas versões na tabela existente, sem alterar versões antigas, cotações/reservas/consumos emitidos. Cotação anterior conserva sua quantidade até expirar; reserva anterior conserva o débito combinado. Preservar franquias, saldos, pacotes/preços, pedidos e dados humanos.
- D-03: informar números reais da tarifa, com separador pt-BR, em texto discreto e tabela de consumo; quantidade do lote usa multiplicação exata. Tarifa é crédito comercial Prisma; nunca número aleatório/medição técnica fabricada.
- D-04: validar localmente números/cotação/reserva/débito/replay e negativos de acesso; conferir render responsivo e ativação remota, Context Pack/AoT/ledger e main/VPS. Não usar chamadas pagas nem pedidos reais para teste.
- P-01: não editar migrations históricas, esconder tabela, mudar wrappers/grants/RLS ou charge retrospectivo.
- P-02: não simular tokens do fornecedor; preservar cache/banco/reuso gratuito e autoridade humana/Score/Perfil/Posição.
- F-01: alterar pacotes/franquia/preços, distribuição aleatória de tarifas, providers/prompts, layout, infraestrutura ou mecanismos de cobrança.
- A-01: seleção das quantidades concretas acima, migration aditiva e evidência proporcional reutilizando a tabela e componentes existentes. Não exige ADR novo: ADR-083 já prevê tarifas versionadas/configuráveis.
- Q: nenhum.
- CA-01: três tarifas ativas novas e divisibilidade negativa por dez; UI exibe 2.347/14.785/6.193 e lote20=46.940.
- CA-02: versões/cotações/reservas antigas iguais antes/depois; liquidação/replay pelo valor antigo; nova cotação/reserva/débito pelo valor novo. Hashes remotos preservados, três linhas novas apenas.
- CA-03/04: SQL negativo e comercial dirigido, render1448/390, CI/plano/migration/fingerprint/grants/runtime/sincronização e AoT com limites.

## Mapa de Impacto e Preservação GOV-01

| Área | Relação | Baseline/capacidade | Prova proporcional |
| --- | --- | --- | --- |
| Tarifas/quotes/reservas/ledger | direct | Tarifas atuais verificadas; wrappers inalterados | SQL de migração, freeze/reserve/settle/replay/isolamento; hashes remotos |
| Geração avaliação e Banco de questões | direct | Ambos usam position_assessment_items/cotação e reserve existentes | Rastreio dos wrappers, quote20 e reserva pelo total exato; sem novo código consumidor |
| Parser/síntese | direct | Ambos usam tarifas centrais | Quote/reserva dos três tipos; hint render; sem provider |
| Informação UI/gestão | direct | Componentes leem dados RPC, formatTokens pt-BR | Render com transporte sintético nos2viewports; nenhum layout/bundle produtivo muda |
| Auth/tenant/RLS | critical_transversal | Permissões existentes | Negativas local e grants/bodyhash remoto iguais |
| Pacotes/saldos/pedidos/ciclo/dados humanos | critical_transversal | Estado produtivo agregado capturado | Hashes antes/depois; nenhuma atualização dessas tabelas |
| Cache/banco/reuso/Score/matching/Knowledge | plausible_indirect | Sem alteração de rotinas ou código | Diff restrito a INSERT de tarifas; wrappers/bodyhash preservados |
| Serviços/Edge/web/portal/mail | no_impact_identified | Nova configuração SQL consumida pela UI existente | Plano exige somente database/docs; IDs/imagens/restarts iguais, nenhum rebuild/restart |

## Execution congelado

Implementar integralmente D/P/F/A/CA acima. Reutilizar tabela/RPC e componentes, adicionar versões sem UPDATE/DELETE de tarifas. Publicação já autorizada no pedido e AGENTS§7. Versão de configuração `prisma-token-tariffs-2026-10-12`; envelopes prisma-tokens-1.0.0/quote-1.0.0 e app v2.5.1 permanecem porque não há alteração de protocolo ou bundle. Não reabrir escritores antigos nem retroagir saldo. AoT em `aot-tokens-nonround-rates.md`.
