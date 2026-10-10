# AoT — Pessoas compactas v2.3.4

Contrato `agreement-people-compact-v234.md` v1.0.0 e execução integral; mapa `impact-people-compact-v234.md`. Bruno aprovou a primeira proposta e main/produção 2.3.4 em 10/10/2026. Baseline `220b5034d951a83b9d353596604da5cdd856ff7c`; branch `codex/people-compact-v234`. Entrega funcional `07ab17334d7c8a499d989cb31360670918acddb1` integrada em main/origin e publicada na VPS. CI e smoke posteriores PASS; fechamento documental separado não reconstrói o runtime.

## Matriz de Acordos

| ID | Acordo / implementação | Teste | Evidência | Status | Ambiente / limitação |
| --- | --- | --- | --- | --- | --- |
| D-UX-01 | CandidateMatchCard compacto, toolbar, requisitos/expansões; primeiro aberto, demais recolhidos | geometria/topologia/conteúdo e renders equivalentes | baseline/browser/visual-results e after-* | PASS | UI real, dados sintéticos |
| D-UX-02 | uma coluna mobile, avatar/ações/textos legíveis e detalhes completos |1536/1448/768/390/320, overflow/avatar/expansão |71checks visual-results | PASS | viewport e fixtures locais |
| D-03 | usePositionFollowUpMemberships, consulta agregada do ciclo atual, selo/abertura | atual/arquivado/reentrada/focus/scope race; uma leitura |91checks browser-results | PASS | sem consulta a Pessoa real |
| D-04 | desconhecido bloqueia inclusão, conteúdo preservado, retry/closed/add e IDs explícitos | loading/failure/retry/add failure/success, current ID/tenant | browser-results | PASS | mocks no lugar do transporte remoto |
| D-05 | seleção/Perfil/cálculo/recalcular/relação/curadoria/divergências e navegação preservados |96Node dirigidos, callbacks/browser, comparação e drawer | browser-results/action-results, testes descritos abaixo | PASS | sem decisão ou recálculo produtivo |
| D-06 | registry 2.3.4, 3 pulado; web-only/CI/main/VPS/rollback | tipos/build/CI, SHA/assets/versão/saúde/rollback | release-plan/dry-run/verify/recovery, ci-branch/main, production-after/public-browser | PASS | runtime funcional 07ab173, produção pública; tela autenticada real não testada |

## Proibições verificadas

| ID | Negativo / evidência | Status |
| --- | --- | --- |
| P-01 | matching/score/domain/SQL sem alteração,96regressões; ausência permanece sem evidência; Pessoa acompanhada continua na lista | PASS |
| P-02 | read agregado sem write/IA, role member sem RPC, outro tenant/Posição e retorno tardio ignorado, writer recebe ciclo atual | PASS |
| P-UX-03 | cards em uma coluna, nenhuma grade/painel lateral, todos os requisitos acessíveis, overflow/avatar/controle em5larguras | PASS |

## Mapa de Impacto e Preservação

Mapa inicial lido antes da implementação. Descoberta: o novo Alert com retry longo comprimía conteúdo no celular; passou a direct e recebeu CSS exclusivo e regressão de falha. Sem novas dependências ou destinos. Consulta não faz leitura por Pessoa; não altera RPC, grant/RLS ou dados.

| Capacidade / área | Relação | Baseline / regressão | Evidência | Status |
| --- | --- | --- | --- | --- |
| Cards/score/requisitos/relação/loading/mobile | direct | UI real before/after, conteúdos completos e handlers;34%menos altura do primeiro card1448 e49%menos390 | PNGs/JSON e fonte | PASS |
| Estado/inclusão por ciclo | direct | legado added local substituído por leitura persistida; negativos/closed/add/ID/focus | browser-results | PASS |
| Tenant/papéis/concorrência | critical_transversal | guardas anteriores mantidas; member sem consulta, scope race e ID explícito | mocks/rotas/diff | PASS |
| Perfil/comparação/navegação | plausible_indirect | CSS restrito ao card; comparação1448/390, handlers e20regressões compartilhadas | compare-PNG/JSON/action-results/Node | PASS |
| Matching/IA/fatos/scorepersistido | no_impact_identified | sem fórmula/contrato/persistência nova; snapshots e51domínio/registry | testes/diff/plano | PASS |
| Prova/portal/convites/DB/Edge | no_impact_identified | chamadas de follow-up existentes, nenhum envio/migration/backend modificado | diff/tipos/plano | PASS |
| Workers/Mail/Gateway/Traefik | no_impact_identified | mesmos IDs/imagens/restarts/status/health após rollout; experimento já unhealthy | production-before.txt/production-after.json | PASS |
| Contextos/registry/release | direct | 2.3.4, pulada 3; checks/CI/smoke concluídos | recibos e CI | PASS |

### Novidade e preservação

Nova composição visual e estado agregado do acompanhamento atual. Capacidades funcionais anteriores continuam por ações explícitas. Fixtures usam Diego e exemplos exclusivamente sintéticos; nenhum dado produtivo foi exportado ou modificado para teste. Leitura real autenticada, entrega de convite e qualidade de matching permanecem NOT TESTED. Não é evidência de equidade ou capacidade do candidato.

## Fora de escopo preservado

F-01: nenhum backend/schema/Edge/modelo/billing/aviso de candidato novo, nenhum envio real, nenhum redesenho de outra página. Diff e plano restritos a web/documentação/testes. Deploy somente prisma-web; serviços preservados. PASS.

## Evidência de fidelidade visual

| Referência / viewport | Estado / dados equivalentes | Render | Comparação estrutural / diferenças | Status |
| --- | --- | --- | --- | --- |
| approved-reference.png, artboard1536x1024 desktop+mobile | Diego62/100, cobertura62%,2atendidos/11sem evidência e vínculo atual; exemplos adicionais | after-1536/1448-viewport, after-390-viewport e completos | Uma coluna, cabeçalho identidade/status/score, toolbar, resumo, explicação e revisão separadas. Demais cards recolhidos. Mesmos tokens e ordem; inspeção manual dos renders | PASS |
| mobile390/320 e tablet768 | mesma fixture | after-* e visual-results | Reorganização sem corte, avatar/checkbox/score/status e ações preservados; lista completa expansível | PASS |

Decoração, textos/menus ilustrativos da imagem e selos de revisão refletem os dados efetivamente fornecidos pela fixture, sem inventar revisão humana. A shell e a seta global pertencem à integração existente, não são substituídas pelo menu desenhado no mockup. Aviso de triagem anterior passa a expansão compacta com conteúdo preservado. Diferenças são adaptação de A-UX-01, sem mudança material de topologia. Altura medida do primeiro card:1448px viewport1106,5→728,55CSSpx;390viewport2604,69→1323CSSpx. Novidade/preservação não dependem de identidade de pixels.

## Desvios do contrato

CI inicial 38073319429 falhou em quatro asserções de apresentação anterior e revelou a remoção indevida da descrição de ausência de evidência. Descrição restaurada; asserções de título/classe/botão atualizadas conforme D-UX-01/A-UX-01; 22 testes afetados e 71 checks de render PASS. CI do SHA corrigido PASS. Nenhum desvio material residual identificado nos D/P/F/A. D-UX-01/02 supersedem a antiga localização dentro do Score e o título longo conforme acordo; dados/proveniência/gates e explicação de ausência preservados.

O dispatcher concluiu integração, build e recriação, mas falhou no HEAD imediato (404 transitório; probe remoto 22, comando local 1). Não gerou recibo de publish bem-sucedido. Verificação independente após estabilização confirmou runtime correto, assets e rollback, sem rebuild adicional. `release-recovery.json` registra a diferença entre falha do probe imediato e resultado operacional comprovado.

## Mudanças autorizadas durante a execução

Nenhuma decisão adicional do Product Owner. CSS scoped do Alert/avatares, uma consulta agregada e IDs explícitos exercem autonomia técnica previamente delegada.

## Validação final

Local: build root, tipos web e build web PASS; 96 Node dirigidos (51 vacancyIntelligence/positionFollowUp/productRelease, 3 rotas, 20 navigationHistory/stableMatching/trajectoryReviewModal/uxFoundation, 22 matchingEvidenceLabel/matchingScore). 91 checks funcionais/negativos de navegador PASS; 71 checks de render/estrutura finais PASS após ajuste visual mobile. Cinco checks adicionais do drawer/comparação PASS em action-results. Nenhuma chamada IA, dado real ou email. Contextos gerados/checker, lint e foundation PASS em snapshot do index selecionado, sem arquivos particulares não rastreados. CI branch [38073841820](https://github.com/brunoharita/HRT-Prisma/actions/runs/38073841820) e main [38073933687](https://github.com/brunoharita/HRT-Prisma/actions/runs/38073933687) PASS, incluindo gates da fundação, ledger, deploy seletivo e dependências. Avisos de bundle/import dinâmico preexistentes permanecem.

Produção: 19 verificações operacionais e 18 HTTP200 PASS; versão v2.3.4 visível no login real em Edge, sem erro de página/autenticação/mutação. Checkout e runtime SHA funcional confirmados. Arquivos anteriores preservados para abas abertas; imagem de rollback `prisma-web:rollback-before-07ab17334d7c` corresponde ao baseline. Metadados de seis containers adjacentes idênticos. HTTP200 de rotas protegidas comprova o fallback SPA, não a leitura autenticada de Pessoas.

## Git / QA / ambiente

QA local via Vite5711 e Edge headless; baseline exato220b503 via transform de leitura em5712, mesmos dados/viewport. VPS `srv1038882`, `/opt/prisma`, destino oficial `https://prisma.hrtsolutions.com.br`; serviços originais conferidos antes/depois. Experimento paddle-vl-llama-test já estava unhealthy, não é regressão deste movimento. Arquivos privados/não rastreados alheios preservados. Registro de sincronização funcional: release-verify e production-after. Fechamento documental integra por fast-forward e sincroniza checkout VPS sem novo deploy; SHA de runtime continua 07ab173.

## Conclusão

Todos os D/P aplicáveis PASS nos limites descritos. v2.3.4 funcional em main/origin/produção com rollback e smoke comprovados. Leitura autenticada do Diego real continua NOT TESTED; não se fabricou decisão humana nem dado produtivo para validação.
