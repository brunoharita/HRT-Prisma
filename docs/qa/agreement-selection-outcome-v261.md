# Acordo — encerramento e histórico de processos, v2.6.1

Versão 1.0.0, aprovado por Bruno nesta conversa em 14/10/2026. Baseline `453747131f82d537ae1f2591b6d3e450cfb6fefb`. Transcrição do acordo, sem nova decisão de produto. Supersede a exibição de vínculos encerrados de D-03 em people-compact-v234 e D-02 em follow-up-active-tag; complementa D-04/D-05 de selection-processes-v260, preservando as demais regras.

## DEVE

- D-01: somente ao encerrar um processo ativo, escolher exatamente uma Pessoa participante ou explicitamente ninguém. Uma única confirmação grava resultado, encerramento, responsável, data e auditoria na mesma transação. Cancelar a tela não grava nada. Nenhuma escolha final durante o processo ativo.
- D-02: usar o mesmo fluxo pelos dois acessos existentes de Encerrar processo (gestão e acompanhamento); não criar terceira possibilidade de resultado ou ação antecipada de escolha. Sem escolha pré-preenchida; participante exigido na opção com escolha. Reabertura existente conserva as decisões anteriores no histórico, retorna a andamento sem escolha final vigente e novo encerramento registra uma nova decisão, sem reescrever a anterior.
- D-03: processo específico encerrado mostra a Pessoa escolhida ou Encerrado sem escolha. Participantes mostram Escolhida/Não escolhida conforme o resultado explícito desse encerramento. Andamento não afirma escolha final. Legado encerrado sem resultado permanece Resultado não informado; não converter Prosseguir, etapa ou nota em escolha.
- D-04: no Histórico do Perfil, mostrar participações da empresa consultada, resultado final e dados/atividades completos já registrados: etapas, anotações, entrevistas, decisões, provas/aplicações, respostas/resultados e demais acontecimentos. Resumo compacto por participação e detalhes sob demanda, com links de processo/resultado pelos IDs exatos. Falha de consulta não inventa ausência; sem dados de outro tenant/papel.
- D-05: descoberta geral da Posição só exibe indicação/vínculo operacional quando o processo está ativo. Encerrado não produz tags, rótulo Processo atual, ação Abrir acompanhamento ou indicação individual de participação encerrada. Consulta histórica continua no processo específico e no Perfil. Pessoas e capacidades de descoberta permanecem.
- D-06: preservar registros, avaliações/resultados, decisões intermediárias, ocupação, Score e fatos/versões publicados do Perfil. Reabertura/criação e controles humanos existentes preservados. Exclusão explícita da Pessoa segue a proteção/remoção de referências pessoais existente; nunca inventar identidade removida.
- D-07: publicar 2.6.1 em main/origin/produção, QA proporcional, CI, rollback, smoke e sincronização. Sem LLM remoto nem fixtures produtivas.

## PROIBIDO

- P-01: contratação/ocupação/reprovação/Score/alteração de Perfil automáticos; nota ou fechamento legado como prova de escolha; participante externo ao processo escolhido; leitura/mutação entre empresas, papel/contrato desconhecido ou auditoria parcial.
- P-02: escolher antes do encerramento, gravar decisões ou alterar dados de negócio por abrir/cancelar/consultar, perder histórico por reabrir, remover funcionalidades corretas ou dados para simplificar. A auditoria obrigatória de consulta já existente é preservada.
- P-UX-01: redesenhar a arquitetura aprovada de gestão/acompanhamento/descoberta; despejar todos os detalhes no resumo do Perfil ou exigir formulários por candidato para encerrar.

## FORA DE ESCOPO / AUTONOMIA / PENDENTES

- F-01: contratação/ocupação, novos estados de processo, IA/cobrança, novas etapas, novo instrumento de teste, expurgo/backfill de decisões antigas, divulgação pública do histórico ou outros serviços.
- F-02: criação de nova coleta ou novos formulários de atividades. Este movimento integra o histórico registrado; atividades futuras permanecem nos controles existentes, sem fabricar entrevista realizada por agendamento.
- A-01: estender registros/RPCs/componentes existentes, campos de resultado/auditoria, tokens, consulta progressiva e testes sintéticos, sem biblioteca/fornecedor novo. Sem duplicar resultados de provas ou escrever histórico dentro dos fatos do Perfil publicado.
- Q: nenhuma pendência material. A regra aprovada restringe os resultados do encerramento a alguém/ninguém; rótulos intermediários e ausência legada permanecem fatos distintos.

## Aceite e Mapa de Impacto

CA-01 (D-01..03/P-01..02): SQL escolhido/ninguém, vazio, participante errado/tenant/papel, payload/contrato/versionamento, revisão concorrente e replay sem duplicar auditoria, atomicidade, legado, reabertura e snapshots protegidos. Browser cancelar, escolha obrigatória, falha/retry sem perder escolha, dupla confirmação e ambos os acessos em 1448/390/320px.
CA-02 (D-04..06): histórico da Pessoa com processo ativo/encerrado/legado e múltiplos ciclos, notas/entrevista/decisões/auditoria e aplicação de prova; ID explícito no resultado/processo, vazio/erro/permissão e isolamento. Descoberta encerrada sem vínculo visual, ativa preservada, sem mutação passiva; renders antes/depois com a mesma fixture/viewport.
CA-03 (D-07): tipos/build/checks dirigidos, contexto/CI, plano comprometido apenas banco/web/docs, fingerprint/ACLs/RLS/rollout, SHA/versão/assets/rollback/saúde e containers adjacentes. Jornada produtiva autenticada não inferida do QA.

| Área/capacidade | Relação | Baseline e mínima preservação/validação |
| --- | --- | --- |
| Encerramento/resultado/reabertura | direct | main4537471, core RPC/ciclos/auditoria; SQL transacional/negativos e concorrência, dois acessos browser |
| Descoberta e acesso ativo | direct | mesmos cards/fixture; ativo com tag/ação, encerrado sem vínculo visual, perfil/comparação/Score preservados |
| Histórico do Perfil e processo | direct | PersonFollowUps/PersonWorkspace/FollowUpHistory e provas existentes; múltiplos ciclos, detalhes e links explícitos |
| Provas/convites/respostas/resultados | plausible_indirect | writers de avaliação intactos; snapshots SQL, leitura por processo/Pessoa e resultado original navegável |
| Auth/tenant/erasure | critical_transversal | authorize_position_follow_up, grants/RLS e FKs; negativos de papel/tenant/anon/worker e referência removida |
| Score/Perfil/ocupação/comercial/IA | no_impact_identified | nenhum writer desses domínios; snapshots/hashes e diff/plano, sem chamada externa no browser |
| Parser/Synthesis/gateway/mail | no_impact_identified | destinos não necessários; identidade/imagem/estado/restarts antes/depois |

Classe D, trabalho isolado. Reúso das capacidades existentes suficiente; extensão do contrato de resultado humano e projeção histórica, sem nova arquitetura de fornecedor. Fechamento: D/P aplicáveis PASS, evidência e docs/contexto, CI, publicação seletiva e sincronização. Não executar suíte integral local por padrão.
