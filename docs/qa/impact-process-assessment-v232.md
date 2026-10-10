# Mapa de impacto e preservação — v2.3.2

Risco D/E: unidade persistida de prova e ciclo de processo, confiança/tenant/PII/token/IA/e-mail. Baseline main b4e0923c382eae518ac19cbf29c0d715d5f50aed, frontend2.3.1 funcional96c912d8eeb6ebc40722fe5970dc4bf80082ac90. Supabase Prisma ioldpnqqvobprjiontre ACTIVE_HEALTHY/PostgreSQL17 verificado; um processo/uma avaliação/zero aplicações/entregas (consulta agregada10/10), sem ler PII. QA descartável local import_evidence_v202/127.0.0.1:55479/PostgreSQL17, people vazio, nenhuma position_assessments verificados. Não há QA remoto separado.

| Área | Relação | Capacidades a preservar / regressão |
| --- | --- | --- |
| Processo/avaliação/shared snapshot/banco | direct | Histórico individual, versões/aprovação, cobertura/distribuição; SQL antes/depois e algoritmo dirigido |
| UI acompanhamento/prova/config/revisão/envio/resultados | direct | Lista/Kanban/filtros/revisão/rascunho/seta/loading; QA sintético desktop/mobile |
| Tenant/roles/concorrência/token/erasure | critical_transversal | RPC-only/RLS/live auth; negativos lote/processo/escopo, freeze/replay, cascatas pessoais sem apagar prova comum |
| Portal/correção/atividade/outbox | direct | Token pessoal/autosave/submit/eventos/lease/idempotência/sem gabarito; SQL/Edge/transporte dirigidos |
| IA/histórico/custo | direct | Reusar geração explícita e ledger; limite/reserva/replay/sem PII; negativos/fixtures sem provider pago |
| Pessoa/Score/Posição/matching/revisão | plausible_indirect | Sem efeito por montar/enviar/submeter; SQL before/after e regressão dos consumidores efetivamente afetados |
| Parser/Synthesis/Mail/Gateway/Traefik/Paddle | no_impact_identified | Sem mudança de runtime ou prompts próprios; plano seletivo, IDs/imagens/restarts/controles remotos antes/depois |

Nova descoberta revisa mapa e prova antes do fechamento. Sem suíte integral local por padrão; CI configurado do repositório permanece obrigatório. Baseline operacional será capturado antes do rollout; nenhuma alegação de candidato real ou justiça empírica a partir de fixture.
