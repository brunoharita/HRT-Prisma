# Processos seletivos — v2.6.0

Decisão de Bruno em14/10/2026, acordo selection-processes-v2601.0.0. A Posição representa um lugar permanente na organização; cada processo é um ciclo de seleção para exatamente uma Posição.

## Gestão e criação

O menu **Processos seletivos** abre lista à esquerda e resumo do selecionado à direita. Busca por processo/Posição e filtros Todos/Em andamento/Encerrados são consultas por empresa, paginadas em50registros. **Abrir acompanhamento** abre a página ampla existente, com Lista/Kanban, candidatos, avaliação e histórico. No celular, lista e resumo são telas sucessivas, com retorno à lista; o resumo por etapas precede as ações.

**Novo processo** exige escolher uma Posição desocupada sem processo ativo. A seleção consulta somente Posições elegíveis, em páginas de50com busca; o backend revalida elegibilidade na gravação. O ciclo começa vazio. Na Posição, **Criar processo seletivo** oferece a mesma ação; se já existe processo ativo, **Abrir processo seletivo** acessa seu resumo. **Ver processos e histórico** conserva o vínculo com os ciclos anteriores.

Inclusão de Pessoa não cria mais processo implicitamente, substituindo a criação na primeira inclusão da2.2.0. Primeiro crie o ciclo; depois inclua Pessoas pelos controles existentes de descoberta. Comparação/aderência permanece distinta da inclusão e da decisão humana.

## Ciclos e preservação

Pode haver vários ciclos históricos e somente um ativo por Posição. Encerramento mantém candidatos, etapas, entrevistas, decisões, prova, aplicações e resultados; não ocupa automaticamente a Posição. Reabertura do ciclo atual exige Posição desocupada. Ciclos anteriores permanecem somente consulta. Um novo ciclo conserva o anterior e começa sem candidatos; reuso explícito de prova compatível segue process-assessment.md.

Na descoberta de Pessoas para a Posição, a tag verde **Já está no acompanhamento** exige vínculo com processo em andamento. Processo encerrado mantém o vínculo, a indicação **Processo atual · encerrado** e **Abrir acompanhamento** para consulta do histórico, sem tag verde. Correção autorizada em 14/10/2026, acordo/execução/AoT em docs/qa/follow-up-active-tag.md; app permanece 2.6.0.

O estado de ocupação é independente do estado do processo. Posição desocupada pode estar sem processo ativo; encerramento não pressupõe contratação. A fonte da ocupação é public.positions.status, com organization_id e vínculo pela Posição; ausência fica indisponível, nunca elegível por inferência.

## Contrato e operação

Envelope de consulta **selection-process-management-1.0.0**, duas RPCs minimizadas: get_selection_process_workspace e get_selection_process_positions. Reutiliza position_evaluation_processes e o RPC start_position_selection_process, agora capaz de iniciar o primeiro ciclo explicitamente. Auditoria é transacional e start_request_id sustenta replay. Locks de Posição e índice único protegem disputas; o trigger de criação/reabertura impede bypass e a criação implícita legada. Mesmos papéis de acompanhamento: super_admin/owner/admin/recruiter, autorização viva backend, sem grants de tabelas.

Contratos anteriores de acompanhamento, prova e portal continuam legíveis; URLs anteriores de acompanhamento/avaliação preservadas e menu selecionado passa à área de processos. Visitas, filtros e resumo não acionam IA, cobrança, matching ou atualização de Perfil/Score. Cartões reais de candidatos e seus controles foram conservados; simplificações dos mockups não autorizam retirar capacidades.

Referência normativa: proposta-processos-seletivos-v2m6-2026-10-14/03-lista-painel.png, estrutura aprovada; dados/contagens/marca ilustrativos. Render/QA/rollout e limites: docs/qa/aot-selection-processes-v260.md.
