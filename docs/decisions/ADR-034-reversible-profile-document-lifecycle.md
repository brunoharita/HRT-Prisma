# ADR-034: Ciclo de vida reversível de Perfil e documento

- Status: aceito
- Data: 2026-09-03
- Risco: E, mudança integrada de persistência, Storage, autorização e UX

## Contexto

O Prisma já possuía versões imutáveis de Perfil, revisão transacional, eventos e um ledger idempotente de operações, mas oferecia apenas publicação por mesclagem e arquivamento de revisão. Restauração, reinício e exclusão física segura de documentos não estavam disponíveis.

## Decisão

Reutilizar os contratos existentes e ampliá-los, sem criar um pipeline paralelo:

1. `Atualizar Perfil` preserva omissões e aplica decisões por bloco.
2. `Substituir Perfil` usa a revisão como perfil completo; omissões deixam o perfil vigente, mas não o histórico.
3. `Restaurar versão` cria uma nova versão vigente com referência imutável à versão restaurada.
4. `Reiniciar Perfil` apenas encerra a vigência atual; Pessoa, documentos e versões permanecem.
5. `Excluir documento` usa uma saga retomável: RPC autorizada prepara e registra a operação, a Edge Function remove o objeto pela API do Storage e outra RPC finaliza a limpeza relacional e recompõe o Perfil quando necessário.

O resolvedor de blocos usa somente `same_block`, `new_block` e `ambiguous`. Atualização ou substituição exige alvo estável do mesmo tipo. Não existe score opaco.

## Alternativas avaliadas

- Excluir o objeto via SQL: rejeitado porque deixa o arquivo físico órfão no Storage.
- Coordenar banco e Storage apenas no navegador: rejeitado por expor uma janela de interrupção sem retomada confiável.
- Criar novo serviço, fila ou tabela de saga: rejeitado porque `document_operations` já é o ledger idempotente adequado.
- Apagar versões históricas ao restaurar ou reiniciar: rejeitado por destruir auditabilidade e reversibilidade.

## Consequências

- A exclusão é lógica e operacionalmente atômica para o usuário, embora banco e Storage não compartilhem uma transação física; reexecução com a mesma chave conclui o estado pendente.
- Referências a documentos excluídos tornam-se snapshots de proveniência, não chaves órfãs.
- Ações destrutivas exigem uma confirmação; operações reversíveis não ganham confirmações adicionais.
- Produção permanece fora do escopo sem autorização explícita.

## Rollback

O frontend pode ocultar as novas ações. As funções novas podem ter `execute` revogado. Versões já criadas continuam legíveis; colunas aditivas não precisam ser removidas. Uma exclusão física concluída não recupera o arquivo, mas todo efeito relacional preservado segue auditável.
