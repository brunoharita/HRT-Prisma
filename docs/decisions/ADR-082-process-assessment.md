# ADR-082 — Prova comum por processo seletivo

Status: aceito para implementação v2.3.2 em10/10/2026, decisão explícita de Bruno nesta conversa e acordo process-assessment-v232 v1.0.0.

## Decisão

Reutilizar position_evaluation_processes, position_assessments, attempts/deliveries/generation/audit e o portal/gerador/transporte/ledger existentes. Evoluir o processo de único por Posição para ciclos com um atual e histórico; prova comum com person_id ausente e process_id obrigatório, aplicações com person_id próprio. Provas individuais anteriores conservam sua forma, conteúdo e acesso histórico. Nova prova usa contrato persistido2, portal mantém contrato público1 porque campos/semântica da aplicação individual não mudam.

Uma prova por ciclo, congelada na primeira emissão; nenhuma promoção ou conversão de aprovação histórica. Reuso explicitamente solicitado cria rascunho do novo ciclo, somente com contexto compatível. Montagem determinística do catálogo aprovado e revisão humana de conteúdo novo/editado; geração só após confirmação. Lote autenticado valida integralmente e enfileira aplicações individuais em transação, com idempotência persistida, reutilizando worker/leases existentes.

## Alternativas e consequências

### Delta aprovado em14/10/2026 — encerramento/histórico2.6.1

Escolha final pertence ao encerramento do ciclo, não a uma etapa ou à nota. Reutilizar processo/entradas/auditoria e provas existentes, acrescentando resultado humano transacional e projeção paginada da participação, evita duplicar resultados ou atribuir decisões ao Perfil profissional. Snapshot/decisões intermediárias e histórico permanecem. FK por empresa/entrada com remoção somente da referência pessoal conserva isolamento e erasure; padrão suportado pelo [PostgreSQL17](https://www.postgresql.org/docs/17/ddl-constraints.html#DDL-CONSTRAINTS-FK). Reabertura conserva a decisão anterior em auditoria, sem escolha vigente no ativo. Não há backfill ou fornecedor/biblioteca novos. Contratos adicionais versionam o resultado e a projeção histórica sem alterar os contratos de prova/portal. Escrita antiga de encerramento sem escolha explícita é recusada; rollback de web conserva schema/dados/guard e exige atualizar o frontend para novos encerramentos. Acordo/execução1.0.0 e AoT selection-outcome-v261.

### Delta aprovado em14/10/2026 — Processos seletivos2.6.0

Bruno escolheu proposta3 e autorizou criação explícita somente para Posição desocupada, um processo ativo por Posição e gestão própria no menu. Reutilizar ciclos existentes, RPC de criação e guardas backend é suficiente; não criar tabela, plataforma externa ou biblioteca. O primeiro ciclo também começa vazio; a inclusão não cria processo. Reabertura requer Posição desocupada. Novo envelope selection-process-management-1.0.0 consulta projeções mínimas/paginadas e preserva contratos/artefatos históricos da avaliação. Índice ativo, lock e trigger impedem bypass/concorrência, sem backfill. Acordo1.0.0/AoT selection-processes-v260.

Prova distinta por Pessoa impediria equivalência do instrumento e repetiria custo/revisão. Tabela/plataforma externa separada duplicaria catálogo, tokens, outbox e ledger sem benefício funcional verificado. Ampliar estruturas próprias é a menor integração compatível; nenhuma nova biblioteca/fornecedor. Implica migration aditiva, atualização seletiva das RPCs e Edge, leitura de ciclos e cuidado com exclusão de uma Pessoa: apagar sua aplicação não apaga a prova comum. Histórico e schema ficam preservados em rollback; consumidores antigos continuam lendo aplicações existentes, mas novas provas individuais são recusadas pelo backend.
