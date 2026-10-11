# AoT — Foco operacional v2.4.1

Acordo congelado: agreement-operational-focus-v241.md v1.0.0, decisão de Bruno11/10/2026. Mapa prévio e execução no mesmo contrato. Baseline main/origin a085c6eb9ca1ac276569a8b5cdce547038daa062, v2.4.0. Risco C, somente apresentação web/documentação. Não há novo domínio, escritor, schema, serviço ou destino.

## Acordos → implementação → teste → evidência

Evidências em `docs/qa/evidence/operational-focus-v241/`. As fixtures usam componentes reais e dados/transportes sintéticos; não provam jornadas autenticadas com candidatos reais.

| ID | Implementação | Prova local | Status |
| --- | --- | --- | --- |
| D-01 | HomePage sem aviso M8, ajuda com linguagem de produto | operational-checks; ausência e ajuda por teclado | PASS |
| D-02 | KnowledgeSourceMonitor em Fontes, mesma autoridade, resolução para revisão existente | source-checks; erro/loading/retry, nenhuma publicação passiva | PASS |
| D-03 | Como o Prisma trabalha → Drawer | operational-checks; ajuda acessível sem escrita | PASS |
| D-04 | PersonProfessionalEvidenceMap/PersonWorkspacePage, acessos compactos | regression-person, 15 cenários; pendências/falhas/evidências preservadas | PASS |
| D-05 | CandidateMatchCard, tags compactas + Entender a análise | regression-people 106checks, perfil/relação/curadoria/inclusão | PASS |
| D-06 | Outras ações → Recalcular score | regression-score; explícito, só Pessoa escolhida, resultado anterior em loading/falha | PASS |
| D-07 | pf-metrics, contadores compactos | detail/checks e before/after; mesmos4/1/0, mobile sem overflow | PASS |
| D-08 | FollowUpDetail: resumo/alertas → formulários → análise secundaria | detail/checks; consulta preserva rascunho/score | PASS |
| D-09 | FollowUpHistory, antes/depois legíveis + snapshots expansíveis | detail/checks; autor/data/campos, nomes de responsáveis e JSON preservados | PASS |
| D-10 | DocumentDetailPage, Detalhes técnicos e histórico | operational-checks; revisão imediata e ID/tentativas/auditoria acessíveis | PASS |
| D-11 | DocumentOperationsPage, Entender os estados | operational-checks; legenda/contagens/filtros sem escrita passiva | PASS |
| D-12 | ProcessAssessmentPage, histórico recolhido com quantidade | regression-process 64checks, 1448/768/390/320, consulta mantida | PASS |
| D-13 | VerificationOperationsPage, Método e histórico | operational-checks; resultado/limitações imediatos, método/timeline acessíveis | PASS |
| D-14 | AssessmentItemBankPage, Origem e detalhes técnicos | operational-checks; similaridade primária, diagnóstico secundário, aprovação explícita | PASS |
| D-15 | Sem navegação/abas vazias de Settings | operational-checks; sem editor fictício/abas indisponíveis | PASS |
| D-16 | KnowledgeStructure, ajuda contextual, /settings compatível | operational-checks/operationalFocus.test; mesma autoridade, negativos member/recruiter/anônimo | PASS |
| D-17 | Fontes por fato, pendências, conflitos, atividade por questão e revisão mantidas | regression-person/people/process/follow-up/score; revisão própria do diff | PASS |
| D-18 | Responsive/loading/rascunhos/navegação, release2.4.1 | provas locais PASS; integração/publicação/smoke pendentes | PARTIAL |
| P-01 | Domínio, serviços, auth/tenant e dados sem alteração | diff/plan; escritores/handlers preservados e papéis negativos | PASS |
| P-02 | Consulta não inicia IA/envio/recálculo/publicação | tráfego externo bloqueado e chamadas sintéticas verificadas; pendências imediatas | PASS |
| P-03 | Sem dependências/custos/novos destinos/arquivos alheios | package/lock/services/migrations fora do diff, untracked alheios preservados | PASS |

## Mapa de impacto e preservação

| Capacidade | Relação | Baseline e regressão | Evidência/status |
| --- | --- | --- | --- |
| Home/Knowledge/estrutura | direct | componentes/fontes/papéis anteriores; novo acesso + retry e revisão explícitos | operational/source-checks, PASS |
| Pessoa/documentos/histórico | direct | Pessoa≠Documento≠Tentativa; perfil vigente, pendências e falhas | regression-person, PASS |
| Descoberta/acompanhamento | direct | score salvo, alça/filtros/entrevista/decisão/inclusão/rascunho | 106checks people +34 follow-up +54 score +30 detail, PASS |
| Documento/processamento | direct | diagnóstico/revisão/recuperação mantendo callbacks | operational-checks e regression-person, PASS |
| Provas/Verificações/Banco | direct | regras de preparação, revisão, envio, resultados e limites | 64checks process +operational, PASS |
| Shell/shared CSS | plausible_indirect | 18combinações de páginas/tamanhos +3Pessoa; menu/esc/overflow/destaques | regression-shell, PASS |
| Tokens Prisma | plausible_indirect | shell/quote/solicitação/falha preservados | regression-tokens13checks mobile, PASS |
| Acesso/loading/navegação | critical_transversal | roles negativos, callbacks, guardas e loading | Node e fixtures, PASS local; smoke produtivo pendente |
| Banco/Edge/Parser/Synthesis/mail | no_impact_identified | nenhum diff nessas camadas, nenhuma mutação real; identidade/estado remoto ainda a verificar | PARTIAL operacional |

## Validação e limites

- Types web, build web e compilação raiz PASS. Avisos de tamanho de chunks/dynamic import preexistentes não alteram resultado.
- Node dirigido PASS: 20testes de follow-up/navegação/loading/rotas/alias, mais5 de registro de versão. 114checks operacionais e30 de detalhe; 15cenários de Pessoa, 106checks descoberta, 34acompanhamento, 64avaliação, 54score, 21combinações shell e13Tokens. Contexto/checker/lint/foundation PASS em snapshot revisado.
- Global lint encontrou whitespace em `output/pa-concurrency-baseline.sql` alheio/untracked. Não foi alterado. Lint do snapshot revisado PASS (1361arquivos); CI em checkout limpo será registrado; não declarar global lint local PASS.
- Ajustes das fixtures antigas acompanharam acessos agora compactados e estado já-em-acompanhamento. Asserções de regras foram mantidas. Corrigidos locators com nomes de ícones e espera de fechamento/animação antes de novas ações.
- Context Pack deve ser gerado/conferido numa cópia determinística dos arquivos revisados, excluindo documentos locais alheios não versionados. Isso evita incorporá-los ou criar divergência em CI. Nenhum arquivo alheio será movido/apagado.
- Jornada real autenticada e operações reais de IA/envio/publicação de fontes: NOT TESTED e fora da necessidade desta reorganização.
- F-01/F-02 preservados: sem nova regra de taxonomia, cobrança, auth, backend, integração, dado pessoal ou funcionalidade planejada.

## Comparação visual

Screenshots fornecidos são contraexemplos, não alvo normativo novo. Baseline e resultado com mesmas fixtures e viewports1448/390: before/home/person/follow-up e after/comparison-*. Inspeção: Home sem bloco técnico permanente; Pessoa com pendências imediatas e rail compacto; acompanhamento reduz faixa de indicadores e mantém identificação, seleção e colunas. Detalhe prioriza operação, análise/histórico separados. Evidências de detalhe1448/390/320 e demais telas em after/. Sem substituição da composição guiada4A. No celular, indicadores refluem em linhas e leitura permanece vertical; rolagem horizontal do Kanban desktop é local e já existia.

## Desvios e decisões

Nenhuma decisão de produto adicional. Alinhamento de radios e ícones corrigido no escopo de apresentação dos formulários/indicadores. Sem escolha humana automática. As expansões não gravam dados; autor/data/valores técnicos completos preservados no histórico.

## Git / QA / produção

Branch codex/operational-focus-v241. Commit, CI, plano, produção, rollback, smoke e sincronização pendentes. Não declarar a publicação concluída até essa prova.
