# M8.1 — Preflight e limpeza controlada de dados de currículo

Estado: **plano, backup técnico concluído; limpeza e restauração isolada não executadas**. Contrato: Agreement M8.1 v1.1.0, D-14 a D-23/P-01 a P-08/P-13 a P-15/P-21 a P-23. O backend alvo é o projeto Supabase existente `ioldpnqqvobprjiontre`.

## Guardas antes de qualquer exclusão

1. Executar e verificar a [rotina de backup do Prisma](prisma-production-backup.md) com autenticação e destino privado, registrar horário, tamanho e hash fora do repositório. O plano Free **não oferece backup automático** no Dashboard. Não ligar/desligar PITR nem contratar plano como atalho. Primeira cópia concluída em `C:\Users\Bruno\Documents\Prisma-Backups\prisma-2026-09-20T15-16-28-483Z`; a restauração isolada ainda é obrigatória.
2. Confirmar que a rotina copiou separadamente todos os objetos Storage no escopo, com inventário de bucket/path, tamanho e checksum, antes de excluí-los. [Backups de banco não contêm os objetos](https://supabase.com/docs/guides/platform/backups).
3. Testar leitura/restauração do dump em ambiente isolado sem publicar dados pessoais. Confirmar que o backup e as cópias de Storage cobrem o mesmo corte temporal; suspender novas importações durante o corte ou revalidar fingerprints imediatamente antes da exclusão.
4. Confirmar server-side `harita.super`: exatamente um `platform_users`, Auth existente, status ativo, perfil `super_admin` e memberships atuais. Não incluir Auth/memberships no conjunto a excluir.
5. Montar lista de Pessoas pelo vínculo `resume_intakes.resolution_type='created_new_person'` e `resolved_person_id`, agrupada por organização. `latest_source_type` isolado não prova origem. Em 2026-09-20 havia oito Pessoas com criação por intake rastreável e duas sem intake resolvido; uma destas tinha `latest_source_type=resume_pdf` e permanece ambígua. Uma Pessoa criada por intake tem também outro intake vinculado. Exigir prova individual de qualquer linha adicional sem intake antes de incluí-la.
6. Para cada Pessoa elegível, usar `preview_person_definitive_deletion` e a saga M5.5 existente para obter fingerprints, plano de Storage, deleção relacional e verificação de resíduos. Não apagar Vaga/Posição; aplicar apenas a desvinculação de ocupante prevista no contrato vigente. Não criar Pessoa, Knowledge ou decisão humana de teste em produção.
7. Para Knowledge, construir grafo de origem a partir de `knowledge_observations`, `knowledge_inbox.observation_ids`, propostas, conceitos e aliases; eliminar apenas nós sem proveniência independente, fonte oficial ou uso compartilhado. CBO/ESCO/O*NET e conceitos institucionais ficam fora. Não inferir exclusividade de coincidência textual ou do nome do usuário.
8. Examinar `person_deletion_operations` e `person_deletion_storage_items` existentes antes de decidir se um registro exclusivamente ligado ao conjunto pode ser removido. Caso uma regra estrutural obrigatória ou imutável impeça, bloquear essa parte e registrar o conflito no AoT, sem corromper a auditoria.

## Execução e verificação

Executar lote tenant-scoped, idempotente e revalidado pelo servidor; Storage e DB seguem a ordem exigida pela saga M5.5. Repetir contagens de Pessoas/intakes/documentos, dependências de Assessment/matching, Storage e referências órfãs. Confirmar preservação de Auth/memberships, Knowledge independente e Vagas/Posições. Depois fazer smoke autenticado de login, App Shell, organizações, Pessoas, Conhecimento, Posições/Vagas, nova importação sintética, revisão, publicação e Perfil M8. Registrar somente contagens/hashes no AoT.

## Parada obrigatória

Não executar exclusão quando faltar backup verificável de DB ou objetos Storage, autorização server-side, exclusividade de proveniência, contrato de desvinculação ou capacidade de verificar resíduos. A aprovação geral da implementação M8.1 não transforma uma linha ambígua em alvo seguro.
