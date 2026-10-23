# AoT — acompanhamento de desempenho dos candidatos

Contrato congelado: `docs/qa/agreement-process-assessment-performance.md`v1.0.0. Baseline829c84436a9566b8755be74cb72fdb3b075afbeb; branchcodex/process-assessment-performance. Pedido23/10/2026. Versão3.1.3 preservada; sem mudança nos contratos de Score/correção/processo.

## Mapa de impacto e preservação

| Capacidade / relação | Baseline e impacto | Regressão / evidência | Status |
| --- | --- | --- | --- |
| Lista e ordenação / direct | Tabela mostrava apenas Pessoa/estado/ação, sem medidas; dados de correção já presentes | Helper valida concluído/correção/denominador; UI com seis candidatos, empates, zero e pendentes | PASS local |
| Nota Prisma / direct | Serviço de acompanhamento já expõe score salvo e metadados; uma consulta extra por atualização, sem N+1 | Reuso get_position_follow_up_process pelo serviço existente; estado/proveniência e falha opcional | PASS local |
| Tenant/Posição/processo / critical_transversal | Mesma organização/Posição e processo explícito, backend existente mantém autorização | Browser registra parâmetros e recusa processo incompatível; contexto React elimina resposta antiga | PASS na fronteira cliente; RLS inalterada |
| Resultado/modal/envio/cancelamento/histórico / plausible_indirect | Ações existentes devem continuar, envio sai da região principal para details |65browser1448/768/390/320: resultado correto, limites de envio, retomada/cancelamento explícitos e histórico somente leitura | PASS local |
| Configuração/convites/prazos / plausible_indirect | Fora do componente substituído; relógio existente continua fornecendo estado | Node assessmentInvitations/processAssessment;32browser integrados de montagem/modal em4viewports | PASS local |
| Banco/IA/Score/contratação / no_impact_identified | Diff só apresentação/helpers/testes; sem mutação, nova IA, fórmula ou autoridade | Mocks recusam rede e registram apenas load/score_load até ação humana; sem SQL/Edge/worker no diff | PASS local/diff |

Baseline mínimo: código/SHA acima e screenshot do problema (contraexemplo). QA local usa serviços sintéticos na página real; nenhum dado pessoal fornecido virou fixture. Novas dependências: import .js mecânico em processAssessmentData para o helper tipado também compilar em NodeNext; sem alteração de shape/runtime. Não houve reclassificação de relações.

## Acordos → implementação → teste/evidência

| ID | Implementação | Evidência | Status |
| --- | --- | --- | --- |
| D-01 | ProcessAssessmentResults mostra métricas, acertos/total, estado e resultado existente |17Node dirigidos e65browser, dados distintos para Score/avaliação; bundle produtivo confirmado | PASS |
| D-02 | assessmentResultRows ordena proporções exatas; nome/ID estabilizam empates; ausentes depois de zero | Helper não modifica entrada; malformado/parcial/contexto incompatível permanece indisponível | PASS |
| D-03 | Consulta opcional existente, valida processo, cancela aplicação visual de resposta antiga; metadados preservados | Falha não bloqueia resultado; prova de parâmetros/processo; zero IA/escrita até ação humana | PASS na fronteira afetada |
| D-04 | Tabela desktop/cartões mobile, resumo de quantidades e details de envios; callbacks mantidos |4viewports, sem overflow; modal, retomada, cancelamento e histórico; CSS e SHA produtivos | PASS |
| P-01 / P-02 | Nenhuma composição de notas, pontuação de atividade ou decisão automática; leituras apenas | Testes negativos e registro de chamadas; sem backend/schema/RLS/IA no diff | PASS |
| F-01 | Preparação/correção/portal mantidos; nenhuma alteração comercial ou de instrumento |32checks de regressão integrada e diff, somente web publicada | PASS |

## Visual

Referência do usuário é contraexemplo, não alvo visual normativo. Mesmo estado/dados sintéticos nos quatro viewports: `docs/qa/evidence/process-assessment-performance/results-1448.png`, results-768/390/320 e page correspondentes. Desktop mantém o cartão e compara métricas por coluna; mobile usa cartões na mesma ordem, sem coluna escondida. Informações em texto escuro, ações azuis, barras neutras. Inspeção inicial identificou corte do título mobile e sobreposição externa no recorte; título passou a quebrar linha. Somente nos recortes results-* a captura oculta temporariamente skip-link e botão flutuante de navegação, externos ao cartão. Page-* conserva o shell completo sem esse estilo de captura. Nenhum estilo de produção da navegação foi alterado.

## Validação e limites

Primeiro typecheck identificou import ainda usado pela lista de convites e extensão de import necessária no helper NodeNext; ambos corrigidos. Tipos web/root,17Node e build web PASS. Browser65checks da nova lista e32da integração existente PASS com página/modal reais e serviços sintéticos. Regressão existente foi preservada neste movimento em evidence/process-assessment-performance/regression; suas capturas históricas originais foram restauradas após o runner. Ajuste final de título/warning repetiu somente helper/browser/build afetados, sem contar novamente os mesmos testes. Build emite avisos preexistentes de tamanho de chunk/import dinâmico. Contextos/checker/lint2015arquivos/foundation e ledger PASS em snapshot rastreado, excluindo rascunhos alheios. Dispatcher deduplicado: pnpm test genérico substituído localmente pelos17Node/97browser; CI manteve seus gates completos. Sem avaliação autenticada de humano real, IA paga ou envio real.

## Publicação, preservação e encerramento

SHA funcional7a905c140c7534e789caa6e72571704781d349a9, main por fast-forward, CI branch40017264584/main40017642362 SUCCESS. Plano exige somente web, sem migration, Edge, Parser, gateway, mail ou Synthesis. Web6fe0728579a0 running/restarts0, imagem6128874ace2f, entryindex-DfAMsaHX.js. Rollback prisma-web:rollback-before-7a905c140c75 conserva efc8034d3485. Seis outros contêineres (incluindo Horus) mantiveram IDs e tags de imagem.22checks públicos confirmam rotas, assets novos/anteriores, SHA, versão3.1.3, componente e CSS responsivo. Evidências mínimas: production.json, public-smoke.json, runtime-before/after.txt e release-plan.json no diretório deste movimento.

Guard local recusou a primeira tentativa por saídas próprias do runner de regressão, antes de qualquer publicação. Só essas saídas próprias foram arquivadas/restauradas; nova tentativa passou com árvore limpa e o mesmo SHA validado. O primeiro HEAD após recriação retornou404 transitório, encerrando o dispatcher antes de gravar recibo final. Verificações independentes seguintes confirmaram disponibilidade, assets, container e rollback sem novo build/deploy. Não remover órfãos, serviços ou metadados alheios por avisos do Compose/Git.

Fechamento apenas documental/contextos e evidências sincroniza Git/GitHub/VPS sem reconstruir runtime nem repetir testes válidos. Nenhum desvio do acordo identificado; nenhuma relação reclassificada além do import mecânico documentado. D-01..04/P-01..02 comprovados nas fronteiras exigidas e F-01 preservado. Limites de QA sintético e smoke público não são prova de jornada autenticada humana ou calibração empírica.
