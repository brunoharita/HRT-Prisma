# ADR-082 — Prova comum por processo seletivo

Status: aceito para implementação v2.3.2 em10/10/2026, decisão explícita de Bruno nesta conversa e acordo process-assessment-v232 v1.0.0.

## Decisão

Reutilizar position_evaluation_processes, position_assessments, attempts/deliveries/generation/audit e o portal/gerador/transporte/ledger existentes. Evoluir o processo de único por Posição para ciclos com um atual e histórico; prova comum com person_id ausente e process_id obrigatório, aplicações com person_id próprio. Provas individuais anteriores conservam sua forma, conteúdo e acesso histórico. Nova prova usa contrato persistido2, portal mantém contrato público1 porque campos/semântica da aplicação individual não mudam.

Uma prova por ciclo, congelada na primeira emissão; nenhuma promoção ou conversão de aprovação histórica. Reuso explicitamente solicitado cria rascunho do novo ciclo, somente com contexto compatível. Montagem determinística do catálogo aprovado e revisão humana de conteúdo novo/editado; geração só após confirmação. Lote autenticado valida integralmente e enfileira aplicações individuais em transação, com idempotência persistida, reutilizando worker/leases existentes.

## Alternativas e consequências

Prova distinta por Pessoa impediria equivalência do instrumento e repetiria custo/revisão. Tabela/plataforma externa separada duplicaria catálogo, tokens, outbox e ledger sem benefício funcional verificado. Ampliar estruturas próprias é a menor integração compatível; nenhuma nova biblioteca/fornecedor. Implica migration aditiva, atualização seletiva das RPCs e Edge, leitura de ciclos e cuidado com exclusão de uma Pessoa: apagar sua aplicação não apaga a prova comum. Histórico e schema ficam preservados em rollback; consumidores antigos continuam lendo aplicações existentes, mas novas provas individuais são recusadas pelo backend.
