# Acordo — Acompanhamento Pessoa–Posição v2.2.0
Versão 1.0.0. Estado: agreed. Product Owner Bruno, 08/10/2026.
Autoridade: decisão nesta conversa de implementar exatamente a proposta Lista/Kanban e refinamentos de arraste/cartões/score sem denominador, integrar main e publicar v2.2.0.
Este contrato consolida a conversa e substitui rótulos de proposta e trechos superados dos artefatos ilustrativos.

## DEVE
- D-01: Posições > Posição > Acompanhamento, alternância Lista/Kanban do mesmo conjunto, preservando busca/filtros/contexto; manter Visão geral, Pessoas encontradas e Histórico. Sem módulo global novo.
- D-02: inclusão humana explícita na descoberta por Adicionar à avaliação, independente da seleção de comparação; repetir inclusão não duplica. Cadastro da Pessoa reutilizado, identidade do processo e etapas por Pessoa/Posição, sem transformar cadastro de Posição automaticamente em recrutamento. Entradas/retornos na Posição, descoberta e Pessoa.
- D-03: Lista com Pessoa, etapa, próxima ação, responsável, prazo e detalhe; busca por nome/ação, filtros etapa/responsável/prazo inclusive ausentes, ordem nome/prazo; indicadores factuais com escopo explícito.
- D-04: Kanban com Aguardando avaliação, Em avaliação, Entrevistas (aguardando/agendada), Decisão (aguardando/registrada), Concluídos consultável. Descoberta não é fase.
- D-05: arraste pela alça, placeholder/origem e realce de destino, Escape cancela, Mover etapa por botão/teclado, salvamento visível por cartão, falha preserva confirmado e concorrência não sobrescreve. Movimentos comuns sem confirmação redundante.
- D-06: cartões com nome completo, título publicado, idade apenas de dado disponível/autorizado e Score Prisma destacado em azul, somente numeral sem /100 ou porcentagem. Provisório/indisponível identificado, sem substituir por zero; acesso a score/cobertura. Ação/prazo/responsável ficam no detalhe/Lista, não na frente compacta.
- D-07: detalhe lateral desktop/tela completa mobile com evidências/fontes/Perfil, versões, próxima ação, responsável, prazo, anotações internas, entrevista, decisão e histórico autor/data; rascunho protegido e retorno contextual.
- D-08: entrevista opcional; mover para Entrevistas significa aguardando, nunca agendamento inventado. Agendar/reagendar/cancelar explicitamente com data/hora/fuso/participantes e histórico, sem convites/mensagens.
- D-09: decisão humana separada sem preseleção, justificativa obrigatória, prosseguir/não prosseguir neste processo; mover a Decisão só aguarda. Encerramento sem conclusão distinto de decisão negativa; encerramento/reabertura explícitos por Pessoa/processo, sem mudar ocupação ou outras Pessoas.
- D-10: acesso/Lista/Kanban/andamento/anotação/entrevista/decisão operacional não recalculam score. Dependências relevantes seguem acordo stable-score-v214 1.0.0, sem política nova. Versões consultadas e alterações posteriores identificadas; anterior e histórico preservados.
- D-11: autorização servidor e tenant em cada registro. Reutilizar acesso de Posições: super_admin autorizado existente, owner/admin/recruiter da organização; member não ganha acesso pela funcionalidade. Atribuição de responsável não concede permissão. Leituras minimizadas, sem gravar score do navegador, histórico transacional obrigatório.
- D-12: estados vazio/filtro/carregamento/erro e concorrência proporcionais; acessibilidade teclado/foco/texto; Lista mobile em cartões, Kanban mobile seletor de fase, detalhe full-screen. Context Pack/documentação/AoT, versão2.2.0, main/origin/produção/smoke/sincronização e rollback.

## PROIBIDO
- P-01: inclusão/candidatura/interesse/contratação/rejeição automática, corte por score, data/score/idade inventados.
- P-02: promover notas/decisões de processo a Perfil/Knowledge, duplicar Pessoa, propagar decisão entre tenants/Posições, mudar ocupação.
- P-03: recalcular por movimento/acesso/relógio, alterar fórmula/prompt/modelo, descartar resultado válido em falha, aceitar pontuação do cliente.
- P-04: sobrescrever concorrência, apagar histórico, expor PII desnecessária ou ampliar acesso pelo frontend/responsável.
- P-UX-01: alterar topologia aprovada, remover arraste, reduzir texto/nomes para caber, acrescentar denominador do score, substituir mobile por quadro miniaturizado.

## FORA DE ESCOPO
- F-01: notificações, mensagens/convites, candidatura pública, integração calendário, contratação automática, nova IA/fonte externa, curadoria real, backfill histórico.
- F-02: alterações em Parser/Synthesis/Knowledge/fórmula ou redesign global da Pessoa.

## AUTONOMIA
- A-01: componentes existentes, API nativa HTML Drag and Drop com alternativa acessível/mobile, sem dependência nova; RPCs transacionais/optimistic concurrency, tabelas próprias de acompanhamento, reutilização de snapshots estáveis.
- A-02: tokens/componentes da comunicação visual v2.1.1, acabamento responsivo, nomes internos, detalhes técnicos/testes; sem mudança dos comportamentos acima.
- A-03: iniciar processo por primeira inclusão explícita, identificá-lo; encerrado preserva leitura e reabertura explícita. Responsável opcional deve ser operador ativo autorizado da organização. Datas/versões validadas.

## PENDÊNCIAS
Nenhuma para o escopo aprovado. Matriz reaproveita autorização já existente de Posições; não introduz papel novo.

## ACEITE
Cada D-01–D-12 exige implementação, teste dirigido e evidência identificada no AoT; prova negativa para P-01–P-04.
- CA-01/02: navegar descoberta/inclusão/lista/quadro/Pessoa/retorno, seleção comparação independente e inclusão idempotente; mesma Pessoa em duas Posições.
- CA-03/04: filtros/ordem/contadores, quatro colunas, fases específicas e concluídos; nenhuma descoberta automática no quadro.
- CA-05/06: browser arraste real/Escape/teclado/falha/conflito, numeral/idade opcional/título/nome íntegros, score intacto.
- CA-07/08: detalhe/fonte/versão/rascunho; agendar/reagendar/cancelar com validação/histórico e ausência de envio.
- CA-09/10: decisão sem preseleção, negativos de justificativa/autoridade, encerramento/reabertura sem colaterais, snapshots antes/depois inalterados por operações de processo.
- CA-11: SQL local sintético RLS/grants/auth/tenant/papel/versão/conflito/rollback atômico, sem produção como alvo de teste.
- CA-12: tipos/build/testes dirigidos, comparação visual equivalente desktop/mobile, smoke pós-publicação e AoT com limites.

## Mapa de impacto inicial
Baseline local main 8b34391ca904bcac8f66283cf3b91a95f06a462c, v2.1.7. Rastreados limpos; arquivos alheios não rastreados preservados.
| Área | Relação | Capacidade protegida / evidência proporcional |
| --- | --- | --- |
| Posição/descoberta/acompanhamento | direct | descoberta/comparação atuais; novos UI/fluxos com browser real sintético |
| Banco/RPCs/histórico | direct | processos/entradas isolados, SQL transacional negativo e concorrência local |
| Auth/tenant/PII | critical_transversal | papéis existentes e mínimo de idade; negativos/RLS/grants, smoke não destrutivo |
| Score estável/Perfil/fontes | plausible_indirect | somente leitura/referências, nenhuma mutação no motor; regressão score + SQL snapshot invariance |
| Pessoa/navigation/visual | plausible_indirect | perfil vigente/ações/72-28 preservados, retorno e smoke dirigido |
| Parser/Synthesis/Knowledge | no_impact_identified | acompanhamento não toca insumos/serviços; diff/plano e identidade/saúde no deploy |
| Versão/release/contexto | direct | registry2.2.0, generator/checker/CI/publicação dos destinos classificados |

## Fidelidade visual
Alvos normativos: docs/qa/references/position-follow-up-v220/kanban.png e drag.png (cópias dos mockups finais sem denominador). Conteúdo fictício é ilustrativo.
D-UX-01: shell navy, ícone/título destacados, abas locais, três indicadores, toolbar/busca/filtros/Lista-Kanban; quadro quatro colunas, cartões compactos score azul, alça superior, ações inferiores. Lista operacional do mesmo conjunto.
D-UX-02: painel detalhe lateral; mobile menu recolhido, cartões legíveis, seletor de fase e detalhe de tela completa; estilo aprovado da Pessoa com ícones e superfícies tonais.
CA-UX: render com mesmos dados sintéticos e viewport equivalente, registro de diferenças técnicas e sem ocultação de conteúdo.
