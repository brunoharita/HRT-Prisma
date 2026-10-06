# Acordo e execução: vínculo múltiplo v2.0.9

v1.0.0, aprovado pelo pedido explícito de Bruno em 05/10/2026. Baseline `bbe6c5df9a408350f384ed08e004869c66edaa75`, produto2.0.8. Imagem do usuário é contraexemplo do modal de seleção única e justificativa obrigatória; preservar cabeçalho, competência-alvo, seleção no topo, trechos abaixo e ações Confirmar/Cancelar no rodapé. Nenhuma escolha previamente marcada.

- D-01: selecionar uma ou mais fontes do Perfil publicado na mesma lista; preservar experiências e credenciais disponíveis, trechos e dados factuais das credenciais por registro. Confirmação humana explícita.
- D-02: retirar justificativa da tela e da entrada do cliente. Auditoria registra somente a seleção/confirmação, autor e data, sem inventar uma justificativa humana ou promover verificação por Assessment.
- D-03: gravar todos os vínculos selecionados atomicamente, mantendo fontes separadas, tenant/role/Perfil vigente/conceito/fonte e idempotência. Falha preserva seleção/trechos; não gravar subset silenciosamente; duplicata compatível não exige repetir decisão antiga nem a substitui.
- D-04: v2.0.9 em main/produção, documentação/contextos/rollback/smoke. Validação focada na tela e fluxos de um/múltiplos registros, mais negativos obrigatórios do RPC alterado; sem suíte completa local.
- P-01: nenhuma fonte preselecionada, decisão automatizada, justificativa fabricada, perda de vínculos anteriores, escrita fora da empresa/Perfil, aumento de autoridade, gravação parcial ou transformação de vínculo contextual em comprovação independente.
- F-01: resumo/IA/matching/taxonomia, backfill e mutações de Pessoas reais para QA.
- A-01: reusar Select múltiplo/modal e RPC unitário validado dentro de wrapper transacional; mensagem factual de auditoria gerada no servidor distingue confirmação de justificativa. Campos opcionais adicionais não serão introduzidos.
- Q-01: nenhuma decisão pendente.

## Mapa de impacto e aceite

Risco D limitado à entrada de vínculos. Direct: modal/adapter/RPC lote; testar desktop/celular, seleção1/2, remoção, falha e repetição; SQL descartável comprova atomicidade/replay/tenant/anon/fonte inválida. Plausible_indirect: leitura/projeção/auditoria e versão login/sidebar; retorno do reader existente e registry9/types/build. Critical_transversal: atualização da síntese via trigger existente e histórico dos vínculos; manter funções legadas/trigger e testar sem chamar IA. No_impact_identified: Parser, worker, publicações canônicas/curadoria/taxonomia; diff/plan e imagens antes/depois suficientes. Baseline serviços webf22a01f, worker8526717, Parser8682af7, gatewayd061cea.

CA-01..03: modal carregado permite confirmar sem justificativa, envia todos registros, atualiza contagem/projeção, um clique sem duplicação, erro mantém edição; SQL grava1/2 e rollback completo quando segundo inválido, replay preserva auditoria anterior, autoridade negada. CA-04: registry9/CI/contextos/SHA/ledger/rotas/assets/rollback e sincronização. Imagem serve para mesma topologia do modal, não para dados da Pessoa. Comparação usa fixture sintética de mesma tela/viewport.

Prompt congelado: implementar todos D/P/F/A acima; nenhuma suíte integral local, nenhum teste mutacional em produção. Migrar backend compatível antes da web e preservar RPC anterior.
