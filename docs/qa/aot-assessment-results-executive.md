# AoT — Resultado executivo da avaliação 2.5.4

Contrato: `docs/qa/agreement-assessment-results-executive.md`, versão1.0.0, aprovado pelo pedido de implementação/publicação desta conversa. Baseline5d6f8066a75f7c710a150f92116771e07a56a987. Classes C/UX integrada; backend e método IA não mudam.

## Matriz de acordos

| ID | Implementação | Teste/evidência | Status / limite |
| --- | --- | --- | --- |
| D-01/UX01 | AssessmentResultView, modal/contexto, acertos persistidos/elapsed/registros | 4 unit novos e 80 checks browser, 32 integração | PASS (fixtures) |
| D-02/UX02 | shared/assessmentResultAnalysis, seletor/grupos/filtros | 24 Node/tooling dirigidos (4 novos), grupos desiguais/ausência/zero/join, 80 browser | PASS |
| D-03/UX03 | abas, questões, AssessmentActivity com seleção e snapshot | 80 novos/68 atividade/35 conteúdo, filtros/números/snapshot e reset | PASS |
| D-04 | AssessmentActivityAnalysis compacta, mesma infraestrutura/quotes/reservas | 68 atividade/35 conteúdo, cache/cancelar/saldo/uncerto/legado, sem geração/cotação implícita | PASS |
| D-05/UX04 | CSS claro responsivo/nativo Ant Design/feedback existente | referência/overview 1448/768/390/320, teclado, fusos, 80+32 browser sem overflow | PASS |
| D-06 | versão2.5.4, owner docs/contexto, release web-only | tipos/build locais PASS; CI/publicação/rollback/smoke/sync pendentes | PARTIAL |

## Proibições e fora de escopo

P-01/P-02/F-01 PASS local: diff não altera migration/Edge/coleta/tarifa/persistência/Score/Perfil/matching/etapas; 4 unit e browser verificam ausência/zero/tempo indisponível, empresa divergente sem consulta, IDs e versão dos eventos, sem escrita ou análise/cotação por filtros. Portal82 mantém revisão/envio explícitos. Contratos/métodos persistidos permanecem intactos.

## Mapa de impacto e preservação

Mapa prévio permanece o do acordo: resultados/atividade direct; preparação/processo plausible_indirect; tenant/custo/release critical_transversal; portal/coleta e outros domínios no_impact_identified. Regressão obrigatória dirigida, sem suíte completa local automática. Dependências descobertas: reaproveitamento do consumidor legado da atividade e reset de evidência deve sincronizar o escopo externo, evitando rótulo de snapshot sobre dados atuais. Sem destino extra de release.

## Fidelidade visual

Referência HTML normativa e fixture visual: Pessoa exemplo, backend,12/20,18min40s,20/20registros; cinco assuntos4questões,9episódios/6questões/92s,mouse70s e2alterações. Comparação visual em1448/768/390/320 realizada, capturas browser/reference-* e overview-* preservadas. Composição/ordem/hierarquia/cores/agrupamentos reconhecíveis; três indicadores, faixa e dois painéis, coluna no celular. Ícones locais Ant Design substituem Lucide da referência pela autonomia permitida. Conteúdo de análise real deve conservar limites/data/escopo/cache, não copiar textos simulados. Diferenças menores delegadas por A-UX-01: ícone em vez de iniciais ilustrativas, rótulo Concluído do sistema, controles nativos Ant Design, faixa IA mais alta para estado/escopo e acesso extra aos sinais/metadados existentes. A largura menor da fixture móvel decorre do padding do contêiner de teste; o modal real em integration/modal-* usa o padding18 aprovado, conserva fechar por Escape e ausência de overflow. Sem substituição estrutural.

## Validação final e ambiente

Local: 24 Node/tooling (4 novos), 80 browser executivo, 68 regressões atividade, 35 conteúdo, 32 integração processo/modal e 82 portal: 297 checks browser PASS. Typecheck web/build PASS (warnings já existentes de chunk/dynamic-import). Fixtures sintéticas locais, sem candidato real, IA paga ou mutação de produção. Baseline VPS confirmado srv1038882,/opt/prisma main5d6f806, runtimewebac528482 running/restart0; demais nove instâncias inventariadas para comparar após rollout. QA frontend local com cliente sintético sem saída externa. Jornada autenticada real NOT TESTED; não é inferida de fixtures/public smoke.

## Desvios / conclusão

Validação de contexto/lint/foundation será feita no snapshot rastreado exato: o gerador do checkout original também inclui Markdown de propostas não rastreadas em docs, enquanto o checker recusa as cópias TUDO_SOBRE_PRISMA (1)/(2). Regenerar os dois exports no snapshot evita publicar rascunhos alheios; nenhum arquivo alheio é movido/removido. Dispatcher é roteador: seu pnpm test amplo é substituído pelos testes afetados já comprovados, conforme AGENTS; o workflow CI existente permanece obrigatório. Travas index.lock vazias abandonadas, sem processo Git e sem handle aberto, são removidas somente depois de verificação; nunca se altera índice/dados para contornar uma trava ativa.

Escopo funcional local concluído, rollout ainda pendente. Um teste inicial selecionava detalhe técnico oculto na tabela; foi restringido ao detalhe aberto e acionado por teclado. Falhas durante edição/HMR foram rerodadas com fonte estável. Correções materiais locais: quebra de links longos/snapshot em320/390, abas compactas320 e título acessível nativo da modal; nunca usar click forçado como prova. Análises/campos técnicos/legado seguem disponíveis. Checker de contexto no checkout original encontrou duas cópias não rastreadas preexistentes TUDO_SOBRE_PRISMA (1)/(2). Elas não foram removidas ou movidas; validação deve executar no snapshot exato rastreado do release. Todos os arquivos alheios preservados. Evidências históricas de conteúdo foram restauradas ao baseline depois de copiar a regressão atual para seu diretório; o runner passou a aceitar PRISMA_EVIDENCE_DIR. Nenhuma outra mudança de autoridade/escopo foi requerida.

CI inicial38492164447 falhou em duas verificações diretamente relacionadas: versão ainda esperada2.5.3 e aviso novo de contexto sem ação. Corrigidos teste oficial para2.5.4 com preservação de2.5.3 e botão Atualizar consulta (callback de carga autorizado no processo/histórico; fallback explícito de reload em uso isolado).3tooling de avisos e21Node dirigidos PASS no snapshot rastreado; arquivo ProcessAssessmentPage (1).tsx não rastreado explica falhas locais alheias no scanner e permanece intacto. Gate e publicação serão repetidos no novo SHA.
