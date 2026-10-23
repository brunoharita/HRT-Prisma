# Acordo e execução — atualização de campos simples do Perfil, v1.0.0

Autoridade: Bruno solicitou corrigir e publicar a falha ao atualizar o Perfil em23/10/2026. Restauração do comportamento existente de comparação/publicação2.0.0 (ADR025), sem nova decisão de produto. Baseline4c4db2465d6c4eb4c32d7f106af7cb2230c09d79. RiscoD. Aplicação permanece3.1.3; correção de integridade sem nova entrega no registry.

- D-01: publicar uma atualização/substituição de campo simples ou item de lista, sem ID de bloco, deve concluir e auditar a decisão. O banco deve concordar com o validador existente.
- D-02: experiências, formação, resultados e seções personalizadas continuam exigindo destino para update/replace; RPC mantém verificação de existência, origem e vínculo, organização, papel, lock, idempotência e atomicidade.
- D-03: preservar versões anteriores, omissões no modo merge, ações humanas, rascunho e comparação em falhas. Publicar somente a migração necessária, com CI e sincronização.
- P-01: inventar IDs de bloco, remover auditoria ou aceitar update/replace de entidade sem destino; enfraquecer RLS/grants/validador.
- P-02: publicar o Perfil real ou alterar dados humanos para testar; backfill, IA paga ou nova extração.
- F-01: redesign, mudança de conteúdo curricular, mensagens genéricas de outras falhas, outros serviços e regras comerciais.
- A-01: ajustar a constraint existente por migração transacional, reutilizar harnesses e fixtures sintéticas locais, manter contratos e versão da aplicação.

CA-01/D-01: reproduzir23514 na constraint original; após migração comprovar publicação real da RPC com título/resumo/objetivo e listas, update/replace sem targetBlockId, auditoria e replay. CA-02/D-02/P-01: casos negativos de entidades sem destino/desconhecido, tenant/papel, DML direto e constraints de ação/resolvedor. CA-03/D-03/P-02: regressão do fluxo manual existente, versões/omissões/rollback, hashes produtivos antes/depois, plano e fingerprint da migração. Sem QA remoto separado: PostgreSQL17 local descartável e smoke produtivo por metadados somente leitura.

Execução: implementar D-01..03 sem violar P-01/02, F-01 excluído; A-01 somente no como. Validação mínima: dispatcher deduplicado, PostgreSQL integrado sintético com casos negativos, ledger, lint/contextos no snapshot rastreado, CI branch/main e verificação remota. Rollback sem apagar histórico: consumidores atuais permanecem compatíveis; reverter a constraint antiga somente após avaliar novas auditorias sem destino, pois a reversão pode reintroduzir o defeito. Preferir correção adiante.
