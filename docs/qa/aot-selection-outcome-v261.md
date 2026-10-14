# AoT — encerramento e histórico v2.6.1

Contrato: `agreement-selection-outcome-v261.md` versão1.0.0; execução correspondente integral. Baseline453747131f82d537ae1f2591b6d3e450cfb6fefb. Conclusões somente após prova.

## Matriz de Acordos

| ID | Implementação | Teste/evidência | Status | Ambiente/limite |
| --- | --- | --- | --- | --- |
| D-01 | Core RPC, resultado separado no processo, modal único | SQL escolhido/ninguém/vazio/contrato/participante/revisão/auditoria, disputa3, guards dupla ativação | PASS | Local SQL/QA sintético |
| D-02 | CloseSelectionProcessModal nos dois acessos, reabertura conserva auditoria; resposta incerta reconciliada por leitura | browser/results.json e guards.json, SQL reabertura/ciclos/eventos | PASS | Ambos acessos; nenhum escritor novo de atividade |
| D-03 | selectionResultLabel, resumo/cartões/Lista/detalhe, ausência legada explícita | Node/SQL legado/proceed e renders chosen/unknown | PASS | Nenhuma equivalência escolha/nota/contratação |
| D-04 | Projeção history por empresa/Pessoa, paginação e expansão no Histórico do Perfil | Browser histórico/teste/questões/registros/legado/erro/paginação; SQL/RPC; contratos de escopo | PASS | Provas individuais sem ciclo permanecem separadas |
| D-05 | Vínculo/ação/identificação só com ativo confirmado; gestor genérico sem vínculo encerrado | Browser ativo/chosen/none/legado1448/390/320, erro com cache, discovery32 | PASS | Perfil/Score/comparação conservados |
| D-06 | Campos aditivos/FK composta, entradas e provas intactas; erasure remove referência pessoal | SQL snapshots e erasure, tipos/build e Node | PASS | Dados sintéticos; nenhum DML de negócio produtivo |
| D-07 | Pendente | CA-03 | NOT TESTED | CI/produção/sync |

## Proibições e mapa de preservação

Mapa final igual ao inicial em agreement-selection-outcome-v261.md, sem novas dependências ou reclassificações.

| Capacidade / proibição | Relação | Prova proporcional | Status |
| --- | --- | --- | --- |
| P-01: resultado humano, tenant/papel/versão/sem decisão automática | critical_transversal | SQL negativos, contrato e revisão; sem writer de Score/Perfil/ocupação, snapshots iguais | PASS |
| P-02: sem gravação de negócio por consulta/cancelar e histórico preservado | direct | Browser chamadas e SQL auditoria/ciclos; consulta da prova mantém auditoria obrigatória existente | PASS |
| P-UX-01: arquitetura e controles conservados | direct | before/after e comparação descoberta32; modal único, cards/Lista/Kanban e detalhes originais | PASS |
| Encerramento/resultado/reabertura | direct |159SQLtotal (120baseline +39novos), disputa real3 e dois acessos browser | PASS |
| Descoberta/acesso ativo | direct |117browser inclui matriz ativo/encerrado/legado, guards de erro/cache e32preservação | PASS |
| Histórico do Perfil/processo | direct | Browser progressivo/paginação/falha/legado, Node e SQL com IDs exatos | PASS |
| Provas/convites/respostas/resultados | plausible_indirect | Writers intactos e snapshots completos; resultado original abre questões/respostas/registros | PASS |
| Auth/tenant/erasure | critical_transversal | Private authorize reutilizado, negativos de papel/tenant/anon/worker, FK composta e identidade apagada | PASS |
| Score/Perfil/ocupação/comercial/IA | no_impact_identified | Sem escritores alterados, snapshots, nenhuma chamada externa no browser | PASS |
| Parser/Synthesis/gateway/mail | no_impact_identified | Sem arquivo/contrato desses serviços alterado; plano e preservação produtiva pendentes | NOT TESTED |

F-01/F-02 preservados no diff: sem novos estados de processo, coleta, prova, contratação, IA, preço, expurgo ou backfill. PASS local; publicação pendente.

## Fidelidade visual

Screenshot do relato anterior é referência de preservação da descoberta, dados pessoais ilustrativos. Baseline4537471 com mesmas fixtures/viewports1448/390 em before-management/follow-up/discovery/profile. Depois: chosen-management/follow-up, close-final, after-profile e after-discovery em evidence/selection-outcome-v261/browser;320px sem overflow. Gestão e acompanhamento conservam arquitetura v260. Perfil acrescenta seção Processos seletivos no Histórico, com ciclos fechados inicialmente e dados progressivos. Título curto evita truncamento no celular. Descoberta32 comprova texto/geometria ativos idênticos e preservação do restante exceto remoções aprovadas/contração vertical natural. Modal tem duas opções, sem escolha antecipada e controles acessíveis. PASS nos estados/dados equivalentes; sem redesenho material.

## Desvios / alterações autorizadas

Nenhum desvio do acordo humano. Redação de P-02 explicita decisões/dados de negócio e preserva a auditoria obrigatória de consulta já existente, conforme AGENTS e contrato da prova; não muda regra aprovada. Renders usam dados sintéticos. Campo de entrevista agendada não é apresentado como entrevista realizada.

Falhas de QA resolvidas: fixture adicionava Perfil após baseline de comparação (corrigida a preparação, sem writer do produto alterado); runner de rotas precisava de build; fixture de serviços antiga omitia decoder e questões usavam tenant diferente (preservados decoder/guard reais); seletores precisaram expandir questão/usar fechamento contextual; caso empty compartilhado zerava fixture antes da montagem (caso isolado). Source foi estabilizado; repetições focaram os cenários afetados. Capturas intermediárias não são evidência normativa do render final.

## Validação final / Git / QA / produção

QA local:159SQL e3disputas reais com limpeza do banco descartável;38Node dirigidos,117browser/13guards e32preservação. Tipos/build web e build dos testes PASS; lint/contexto e CI finais pendentes. Sem suíte integral local, LLM externo ou banco produtivo como fixture. Evidências em evidence/selection-outcome-v261. Leitura de resultado reutiliza auditoria existente de consulta; não é decisão/gravação de negócio por leitura. Jornada produtiva autenticada NOT TESTED.
