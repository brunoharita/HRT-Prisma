# ADR-064 — Curadoria contextual de competências

Status: accepted. Data: 2026-09-18. Acordo `docs/qa/agreement-m74-contextual-curation.md` v1.1.0.

## Decisão e reutilização

Reutilizar `suggest_knowledge_concepts`, `resolve_knowledge_inbox_alias`, `propose_knowledge_concept_from_inbox`, componentes Ant Design e proteção de navegação existente. Um painel lateral apresenta a decisão dentro do Perfil; nenhuma Knowledge paralela, dependência, fornecedor, taxonomia ou chamada de IA é introduzida. Navegar à Knowledge perde o contexto; embutir a página inteira duplicaria navegação e não garantiria retorno transacional à pendência. O adapter delimitado e a RPC aditiva atendem à decisão aprovada.

`curate_profile_competency` valida Perfil vigente, organização, átomo original e pendência atual; exige `require_knowledge_admin`, com autorização Global adicional. Serializa Perfil/Inbox/escopo, recusa conflito humano, delega alias/proposta às operações auditadas existentes e retorna a leitura atualizada na mesma transação. Se o alias não resolver com segurança, a transação inteira falha. Propostas repetidas pendentes não são duplicadas. Não há grants anônimos, tabelas novas nem alteração de snapshots, runs ou RLS. Funções SECURITY DEFINER usam search_path vazio; a leitura reutiliza a autorização ativa de V2 antes de consultar derivação.

`load_person_professional_evidence_map_v3` projeta aliases humanos aprovados sobre os átomos existentes, respeitando resolução única e prioridade empresa/Global. Decisões sobre a declaração bruta (`human_preserved`) prevalecem. Apenas a associação automática daquele átomo é substituída; contextos, verificações e original permanecem. A explicação expõe método `profile-competency-curation-1.0.0`, justificativa, escopo e versões. Aprovação nunca transforma declaração em demonstração.

Estado de navegação usa chave composta por índice original, declaração, trecho e termo, não índice de página. Ao resolver, busca próximo sobrevivente ou anterior; ao cancelar, o mesmo. Erros mantêm formulário e instruem atualizar a lista em caso de concorrência. Modal de descarte protege troca de item; guard existente protege navegação SPA e saída do navegador. Painel não modal no desktop; no móvel, tela inteira com ciclo de foco. Busca/lista continuam independentes da seleção.

## Compatibilidade, operação e limites

Workflow novo, formato de projeção 2.0.0 preservado. V1/V2 intactas. Aplicar migration `20260918190000` antes de publicar frontend v1.7.4; validar RPC com sessão tenant-scoped. Rollback restaura frontend v1.7.3, conservando funções e decisões auditadas, sem apagar aliases/propostas. Não executar rollback destrutivo de dados.

A validação local combina PostgreSQL real com roles e transações revertidas e UI com adapter sintético; não equivale a gravação E2E Supabase hospedada. Não existe QA remoto separado disponível nesta entrega. Rollout autorizado em 2026-09-18 e smoke autenticado de leitura/painel/cancelamento PASS, sem gravar decisões fictícias. Evidências no AoT M7.4. Não reprocessar perfis nem chamar modelos para aplicar a curadoria. Termos sem equivalente podem permanecer pendentes legitimamente; conflitos não são resolvidos silenciosamente.
