# Acordo e execução — referências pertinentes no RAG

Versão 1.0.0. Decisão explícita de Bruno em 24/10/2026. Baseline d9b1d01ab01dcb1afbe5a1b81336c8e9c0e4caf7; produto permanece 3.2.1. Delta do acordo position-rag-audit-fix: a presença de uma boa indicação não autoriza exibir candidatos auxiliares sem pertinência como sugestões.

- D-01: mostrar na lista automática somente a referência indicada pela interpretação contextual concluída (`alias` com alvo e sustentação), nunca todo o pool recuperado. Contexto insuficiente/ambiguidade/novo conceito não habilitam candidatos do pool como correspondências. Revisão da Knowledge segue o mesmo critério.
- D-02: manter escolhas e aprovações humanas, busca manual, associação explícita e separada da aprovação, histórico original e dados existentes. Uma aprovação humana prevalece sobre a sugestão automática; o conceito publicado continua disponível independentemente do alvo da IA. Relações não viram equivalências nem aprovações implícitas.
- D-03: comprovar que Gerente de Estoque mostra Gestor de armazém/Gestora de armazém (ESCO), com justificativa de operações/estoque/equipe, e exclui produção de couro/representantes comerciais. Publicar na mesma 3.2.1.
- P-01: apagar/reescrever pool ou histórico, associar/aprovar automaticamente, criar tabelas/entidades concorrentes, hardcode de cargos, limiar numérico arbitrário, nova inferência/custo para corrigir a apresentação de um resultado existente.
- F-01: modelo, prompts, ranking/Score, nova busca externa, reprocessamento ou curadoria produtiva.
- A-01: projeção de leitura e componentes existentes, migração compatível, testes dirigidos e publicação seletiva delegados. Nenhuma decisão material pendente.
- CA-01: testes negativos com pool misto, estados sem indicação, fonte retirada e tenant; histórico original idêntico; aprovação humana prevalece; browser nos três viewports sem seleção/aprovação implícita; leitura real, CI, smoke e sincronização.

## Mapa de impacto / execução congelada

Classe D pela leitura do resultado de IA; sem alteração do modelo ou da autoridade. `direct`: projeção `load_position_occupational_rag`, listas/opções de reconhecimento e revisão na Knowledge; baseline mostra cinco recuperados, um alvo contextual. `critical_transversal`: elegibilidade publicada, tenant/ator e decisões humanas, mantidos pelos mesmos guards/RPCs; validar negativos SQL e estados aprovados. `plausible_indirect`: aprovação local/relação proposta, evitando seleção invisível de relações descartadas; testar fluxo explícito já existente. `no_impact_identified`: processamento/worker/modelo, Score/matching, Perfil e serviços compartilhados, pois nenhuma função de escrita/processamento muda. Regressão proporcional: SQL local descartável do loader, testes de projeção e decisões, tipos/build web, browser 1448/390/320, leitura produtiva sem mutação, hash de posições/aprovações/conceitos, smoke público. Sem suíte integral local. Publicar somente banco/web derivados do diff. Rollback da projeção pela definição anterior e imagem web anterior, preservando dados. Encerrar após critérios/evidência/contextos/CI/publicação, sem reexecutar IA nem ampliar polimento.

Implementar D-01..03; impedir P-01; preservar F-01; A-01 governa o como. A captura fornecida é contraprova funcional; composição, fontes, navegação e ações existentes permanecem.
