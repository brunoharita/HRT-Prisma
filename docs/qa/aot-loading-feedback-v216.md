# AoT — carregamento visível v2.1.6

Acordo integral `agreement-loading-feedback-v216.md` 1.0.0 e execução correspondente. Baseline main/origin/VPS `bb223ce6`, web v2.1.4 `d980fc6` imagem13e5dd5a. Autoridade: solicitação explícita de Bruno em07/10/2026 para revisar todas as páginas, implementar main, publicar2.1.6 e memorizar. Sem referência visual nova normativa; preservada arquitetura visual v2.1.1.

## Matriz de Acordos

| ID | Implementação | Teste / Evidência | Status |
| --- | --- | --- | --- |
| D-01 | Estados de páginas/componentes e consultas auxiliares, aviso compartilhado | Inventário30 páginas; browser30 páginas + acesso e consultas reais com adapters sintéticos | PASS |
| D-02 | Skeletons e controles anteriores + aviso sem captura de input, conteúdo anterior preservado | Browser: edição durante espera, conteúdo/score anterior, atualização/falha/reabertura | PASS |
| D-03 | Donos independentes, tarefas com tokens, finally/desmontagem/visibilidade | Unitários3 e browser: concorrência mesma/diferente operação, falha, fechamento de modal e desmontagem | PASS |
| D-04 | Português, role/status/live/busy, layout320/390/1280, progresso sem percentual inventado | Browser e renders320/390/1280, sem overflow; estados reais, percentuais anteriores preservados | PASS |
| D-05 | Owner UX, nota de memória gravada, registry2.1.6, entrega web planejada | Memória confirmada; publicação pendente | PARTIAL |
| P-01–02 | Observação explícita de UI; sem rede/cálculo/IA no indicador, sem bloqueio global | Revisão diff, cobertura de fonte e browser score6 cenários: leitura/revisão/recálculo/falha/comparação sem alterar outra Pessoa | PASS |

## Mapa de impacto e preservação

Mapa integral prévio em `execution-loading-feedback-v216.md`; permanece vigente. Novidade: feedback contínuo de operações existentes. Preservação: conteúdo, rascunhos, escolha humana, score persistido, navegação, autorização e evidência. Mudanças diretas: componentes de apresentação e registro de tarefas; owner docs, testes e versão. Sem mudança de fonte/serviço, fórmula, SQL, Edge ou infraestrutura. Baseline verificado via SSH somente leitura: repositório/remoto corretos, containers running0 e imagem web13e5dd5a; Parser/Synthesis/gateway IDs/imagens anteriores preservados.

## Evidência de fidelidade visual e limites

Renders em `docs/qa/evidence/loading-feedback-v216/`, componentes reais com serviços sintéticos controlados. Não representam jornada autenticada real nem mutação de Pessoa; nenhuma IA paga. Sem novo alvo normativo: comparação estrutural mantém tela aprovada, acrescenta aviso pequeno e não bloqueante. Teste funcional não substitui render. Cobertura de fonte é guarda futura, não prova isolada de comportamento.

## Validação e publicação

Local: tipos/build web, build raiz,45 testes Node dirigidos,21 testes tooling (incluindo guarda de cobertura), lint/foundation e Context Pack PASS.40 cenários browser distintos:30 páginas,3 cenários de concorrência/continuidade320/390/1280,1 acesso com falha sintética e6 de preservação do score. Nenhuma chamada externa, erro de runtime ou overflow nos cenários aplicáveis. Rodada adicional3 cenários de concorrência repetida para ajuste de limpeza, sem contagem duplicada. Testes executam componentes/transporte de score reais com adapters sintéticos; não provam jornada de usuário real ou qualidade profissional de pontuação. Sem banco/IA pagos ou mutação real.

Suíte integral não executada; o comando genérico pnpm test sugerido pelo dispatcher foi substituído pelos módulos diretamente afetados e regressão comprovadamente necessária. CI obrigatório continua seu fluxo normal. Context Pack gerado/conferido em cópia dos rastreados e arquivos próprios preparados: arquivos alheios não rastreados não entram no export. Plano preliminar: somente web+documentação/testes, banco/Edge/Parser/Synthesis excluídos.45 testes dirigidos e21 tooling registrados em arquivos de evidência. Avisos de chunk/dynamic import existentes no build não impedem compilação.

Falhas iniciais do harness (lançamento Vite, factory sintética e fechamento do modal sem vínculo de visibilidade) foram diagnosticadas e corrigidas antes da evidência final; não contadas como PASS. Revisão descobriu guarda necessária em modais mantidos montados: classificação, fontes e busca associam indicador à visibilidade. Falha excepcional de acesso/senha e término da criação de revisão também encerram feedback, preservando regras anteriores. Publicação pendente. Desvios materiais: nenhum identificado; fechar somente após smoke e sincronização.
