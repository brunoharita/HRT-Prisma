# AoT — classificação publicada no Conhecimento

Acordo/execução knowledge-published-classification1.0.0, classe C, baseline84741a1cef3a664f796e2c2ef096a9e5a87ce8a8. Versão pública3.2.0 preservada. Referências do usuário são exemplos do defeito: cartão aprovado com seletor vazio/editável e sem continuação; preservar composição, densidade e ações dos cartões pendentes.

## Mapa de impacto anterior à implementação

| Área / capacidade | Relação | Baseline e regressão proporcional |
| --- | --- | --- |
| Propostas/consulta de classificação | direct | original sem subgroup, conceito aprovado com H4; consultar somente identidades visíveis e ler fonte vigente |
| Aprovação pendente/global/legado | plausible_indirect | seletor, guia, classificação obrigatória, motivo opcional e ações existentes; testes de UI/contrato |
| Auth/RLS/histórico | critical_transversal | nenhuma nova permissão/escrita; consulta no cliente com RLS vigente, zero reaprovação/histórico alterado |
| RAG/áreas/Score/IA/banco | no_impact_identified | renderer separado, nenhuma alteração de handlers/fontes desses fluxos; plano exclui backend/migrations/modelos |
| Web/hospedagem | direct | fonte funcional/CI/smoke e comparação de estados desktop/mobile |

Validação mínima: fixture fiel ao defeito, approved current/missing/unavailable e pending com seleção/ações, histórico sem edição; teste do leitor limitado e sem escrita; typecheck/build, contexto/lint em snapshot rastreado, regressão dirigida e CI obrigatório. Terminar após release web, smoke e sync, sem decisões reais ou pesquisa por IA.

Revisão proporcional do mapa: aviso novo de classificação usa grid próprio para manter mensagem e retry legíveis a 320 px. Somente esta classe de aviso é afetada; não altera estilos globais de outros avisos ou ações pendentes. Regressão desktop/mobile e build cobrem o ajuste.

## Acordos → implementação → teste → evidência

| ID | Implementação / evidência | Status |
| --- | --- | --- |
| D-01 | DTO publicado e leitor canônico por conceito; `knowledgePublishedClassification.test.ts` e browser reproduzem original sem subgroup com H4/v1; versão salva sem seletor | PASS |
| D-02 | Condição pending mantém handlers anteriores; browser comprova selecionar sem gravar, liberação e aprovação explícita, certificação bloqueada/ocupação sem subgrupo; regressão decisões globais | PASS |
| D-03/P-01 | Somente SELECT autenticado na tabela original/RLS M8.1; leitor em lotes de 100/dedupe/erro isolado/missing distinto; histórico e original preservados; retry sem escrita | PASS |
| F-01 | Sem reclassificação ou mudança de histórico, schema ou modelos; plano somente web | PASS |
| CA-01 | 29 testes únicos dirigidos, 69 verificações browser, tipos/build/contexto/lint, CI branch/main e publicação/smoke abaixo | PASS |

## Diagnóstico confirmado

Produção somente leitura: Transformação operacional aprovada tanto local quanto globalmente; conceito global possui classificação vigente H4/v1. Propostas originais não possuem subgroup_id. Frontend sempre renderiza seletor para não ocupações, mas ações só existem quando pending. Não houve decisão humana ou dado faltante a corrigir no banco.

## Publicação / limites

Local: 12 testes dirigidos de classificação/visibilidade/governança/decisões, 3 de avisos acionáveis e 14 de erros de operação PASS; 39 verificações browser novas e 30 de decisões globais PASS em 1448/390/320 px, types root/web e build PASS. Lint e contexto em snapshot rastreado PASS; CI obrigatório também PASS. `evidence/knowledge-published-classification/browser.json` e `classification-{1448,390,320}.png` registram estados sintéticos. As falhas iniciais foram seletor ambíguo do teste e, a 320 px, texto de aviso comprimido pela ação; seletor por teclado e grid restrito ao aviso resolveram cada causa, seguido de rodada final completa PASS. Sem exceções runtime; avisos preexistentes de depreciação AntD/bundle permanecem.

Referências do usuário são exemplos do defeito, sem redesign normativo. Mantidos grid de cartões, hierarquia, seleção/guia/ações pendentes; mudança intencional no aprovado: classificação salva em consulta. Comparação renderizada de estados equivalentes em desktop/mobile confirmou continuação apenas no pending e H4/v1 no approved. Credencial histórica continua bloqueada; aviso legado não foi redesenhado.

Sem QA remoto separado: QA local determinístico com componentes reais e adapters sintéticos, banco produtivo somente leitura para diagnóstico. Jornada humana autenticada em produção NOT TESTED; não se executam aprovações reais para testar. Nenhuma divergência de contrato identificada.

CI inicial 40132232245 bloqueou o SHA bddc7a9 na regra de tradução de erros dos serviços: embora capturado pelo leitor opcional, o erro bruto não deve atravessar a fronteira Supabase. Consulta corrigida para `supabaseOperationError`; 14 testes `reviewOperationErrors` e os 4 do leitor passaram após o ajuste. Não houve promoção/publicação do SHA reprovado; novo CI deve aprovar o SHA corrigido antes do rollout.

Publicada em 24/10/2026, SHA funcional `303de238ff900bab5dd11eca85292545273452d0`, CI branch `40132562112` e main `40132702692` SUCCESS. Dispatcher publicou somente web, sem destinos remanescentes; imagem `sha256:eded254fbc16301758a721e5f4b3c3f0ebf7e6b6a2161fc24cc595deafd3e955`, running/zero reinícios, início `2026-10-24T21:07:13.187434296Z`. Rollback anterior `715691bf388f` retido. Sem erro no deploy; 17 checks públicos de rotas/assets novos e anteriores/SHA/versão 3.2.0/renderer e CSS PASS, login público visível sem exceções. Os sete serviços adjacentes (inclusive worker, modelo privado, Parser, gateway, mail, Traefik e Horus) preservam exatamente imagem/início/reinícios. Recibo `evidence/knowledge-published-classification/production.json` e imagem `production-login.png`.

Main/origin/VPS alinhados ao SHA funcional no smoke. Fechamento documental posterior sincroniza as fontes por fast-forward e mantém esse runtime; plano documental exclui rebuild, migrações e backend, mantendo CI obrigatório. Preservados todos os rascunhos não rastreados existentes. Dois locks vazios inativos foram preservados em tmp após conferir ausência de escritor Git; nenhum processo/lock ativo removido. Avisos preexistentes da manutenção automática de worktrees não bloquearam commits e não motivaram limpeza. Nenhum dado pessoal transferido ou decisão humana executada nesta correção.
