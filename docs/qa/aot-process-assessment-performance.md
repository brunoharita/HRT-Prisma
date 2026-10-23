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
| D-01 | ProcessAssessmentResults mostra métricas, acertos/total, estado e resultado existente |17Node dirigidos e65browser, dados distintos para Score/avaliação | PASS local |
| D-02 | assessmentResultRows ordena proporções exatas; nome/ID estabilizam empates; ausentes depois de zero | Helper não modifica entrada; malformado/parcial/contexto incompatível permanece indisponível | PASS local |
| D-03 | Consulta opcional existente, valida processo, cancela aplicação visual de resposta antiga; metadados preservados | Falha não bloqueia resultado; prova de parâmetros/processo; zero IA/escrita até ação humana | PASS local |
| D-04 | Tabela desktop/cartões mobile, resumo de quantidades e details de envios; callbacks mantidos |4viewports, sem overflow; modal, retomada, cancelamento e histórico | PASS local |
| P-01 / P-02 | Nenhuma composição de notas, pontuação de atividade ou decisão automática; leituras apenas | Testes negativos e registro de chamadas; sem backend/schema/RLS/IA no diff | PASS local |
| F-01 | Preparação/correção/portal mantidos; nenhuma alteração comercial ou de instrumento |32checks de regressão integrada e diff | PASS local |

## Visual

Referência do usuário é contraexemplo, não alvo visual normativo. Mesmo estado/dados sintéticos nos quatro viewports: `docs/qa/evidence/process-assessment-performance/results-1448.png`, results-768/390/320 e page correspondentes. Desktop mantém o cartão e compara métricas por coluna; mobile usa cartões na mesma ordem, sem coluna escondida. Informações em texto escuro, ações azuis, barras neutras. Inspeção inicial identificou corte do título mobile e sobreposição externa no recorte; título passou a quebrar linha. Somente nos recortes results-* a captura oculta temporariamente skip-link e botão flutuante de navegação, externos ao cartão. Page-* conserva o shell completo sem esse estilo de captura. Nenhum estilo de produção da navegação foi alterado.

## Validação e limites

Primeiro typecheck identificou import ainda usado pela lista de convites e extensão de import necessária no helper NodeNext; ambos corrigidos. Tipos web/root,17Node e build web PASS. Browser65checks da nova lista e32da integração existente PASS com página/modal reais e serviços sintéticos. Ajuste final de título/warning repetiu somente helper/browser/build afetados, sem contar novamente os mesmos testes. Build emite avisos preexistentes de tamanho de chunk/import dinâmico. Sem suíte integral local; dispatcher será deduplicado contra os checks dirigidos. Sem avaliação autenticada de humano real, IA paga ou envio real. Publicação/CI/contextos/smoke/sincronização pendentes. Contrato e fontes evoluem juntos; completar status depois da evidência operacional, sem inventar PASS produtivo.
