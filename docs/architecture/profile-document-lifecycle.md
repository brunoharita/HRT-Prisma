# Arquitetura do ciclo de vida de Perfil e documento

## Contratos

- `profile-publication-delta` 2.0.0
- `professional-profile` 6.0.0
- `person-ingestion` 12.0.0
- `document-operation-idempotency` 3.0.0
- `profile-document-lifecycle` 2.0.0
- `pilot-operational-resilience` 1.0.0

## Autoridade

Todas as mutações usam `SECURITY DEFINER`, `search_path = ''`, objetos totalmente qualificados, `private.require_document_reviewer`, lock da Pessoa ou revisão e chave idempotente. `public` e `anon` não recebem `execute`; o cliente autenticado não possui DML direto.

## Publicação e blocos

`publish_profile_review` recebe modo e decisões de bloco. `merge` reutiliza o compositor Delta. `replace` usa a revisão integral. `update` e `replace` exigem `targetBlockId` existente no mesmo array tipado. O ledger `profile_publication_decisions` preserva ação, resolvedor, origem, alvo, ator e instante.

## Restauração e reinício

Restauração copia um snapshot histórico normalizado para uma nova linha com próximo número de versão e `restored_from_profile_id`. Reinício marca a versão atual como superseded e atualiza o estado da Pessoa sem excluir linhas.

## Exclusão coordenada

```text
UI autenticada
  -> Edge Function person-document-lifecycle
     -> prepare_document_deletion (autoriza, bloqueia, grava plano)
     -> Storage API remove
     -> finalize_document_deletion (limpa dependências e recompõe)
```

O ledger sobrevive à exclusão porque referências operacionais usam `SET NULL`. `source_document_snapshot` preserva ID, nome, versão e data da exclusão. Repetir a mesma operação retorna o resultado concluído ou retoma a finalização.

Dependências que só existem dentro da revisão ou da evidência daquele documento usam cascata, mas a cascata não pode ser acionada por DML comum. Um gatilho exige, na mesma transação, uma operação `delete_document` iniciada para o documento exato e executada pelo owner da RPC autoritativa. O ledger imutável de evidência reconhece apenas esse identificador local de transação. Assim, a limpeza física não amplia permissões do cliente nem cria um caminho genérico de exclusão.

## Integridade preservada

- Evidências, regiões, vínculos e refinamentos ligados exclusivamente ao documento seguem cascatas restritas à operação autoritativa.
- Evidência Demonstrada M5.1 e avaliações não dependem do documento e permanecem.
- Knowledge validado permanece; observações que apontavam para evidência removida preservam o snapshot da fonte e deixam apenas o vínculo físico ausente.
- Não há referência viva a `documents.id` inexistente.

## Revisão universal

`profile_reviews.source_kind` distingue `document` e `profile`. Uma revisão por Perfil registra `source_profile_id` e snapshots de lock do Perfil atual, mas não cria `evidence` nem simula documento. Uma revisão documental reutiliza tentativa, páginas, draft e evidências preservados por `start_document_revision`.

## Correção de vínculo

`move_person_document` invalida somente rascunhos concorrentes e chama `private.reassign_document_person` na mesma transação. Documento, tentativa, páginas, draft, regiões espaciais, evidências, revisões e observações documentais mudam juntos; Perfis publicados mantêm Pessoa e conteúdo originais. A FK espacial é diferida para que a troca coordenada não produza estado intermediário inválido.

## Mesclagem e situação da Pessoa

`merge_people` bloqueia as duas Pessoas, exige escolhas apenas para valores canônicos incompatíveis e move documentos pela mesma autoridade de vínculo. Perfis da Pessoa absorvida permanecem imutáveis e históricos; se o Perfil dela for escolhido, um novo snapshot é publicado na principal. A absorvida recebe `operational_status = merged` e `merged_into_person_id` para redirecionamento e auditoria.

`update_person_lifecycle` altera somente o vínculo de domínio. `set_person_archive_state` alterna `active` e `archived`; nenhuma das duas operações cria Perfil, reprocessa documento ou remove histórico. Ambas usam `updated_at` como precondição otimista e retornam feedback acionável em conflito.
