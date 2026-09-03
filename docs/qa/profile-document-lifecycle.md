# Evidência QA: ciclo de vida de Perfil e documentos

## Matriz obrigatória

| Cenário | Resultado |
| --- | --- |
| Atualizar com omissão | fato atual preservado |
| Atualizar bloco com alvo | mesma identidade estável, novo conteúdo |
| Substituir Perfil | omissões ausentes no vigente, histórico preservado |
| Alvo de outro tipo | bloqueio com mensagem natural e campo acionável |
| Restaurar v2 com v4 vigente | nova v5 com origem restaurada |
| Repetir restauração | mesmo resultado, sem versão duplicada |
| Reiniciar Perfil | nenhum vigente; Pessoa, documentos e versões preservados |
| Excluir documento sem Perfil dependente | documento e arquivo ausentes; demais dados intactos |
| Excluir documento do Perfil vigente | nova versão recomposta ou nenhum vigente |
| Interromper após Storage | repetição conclui a mesma operação |
| Outro tenant, member e anon | operação negada |

## Gates

- `CI=true pnpm run validate`
- migrations `20260903194822` a `20260903204244` aplicadas e registradas no Prisma-QA
- prova SQL conectada executada com `rollback`: publicação `authenticated` permitida; restauração, reinício e exclusão `anon` negadas; núcleo privado negado
- prova conectada validou merge, replace, alvo inválido, restauração idempotente, reinício, exclusão, snapshot de Knowledge, ausência de órfãos e preservação de Evidência Demonstrada
- Edge Function `person-document-lifecycle` publicada no Prisma-QA com JWT obrigatório
- smoke autenticado em 1920x1080, 1600x900, 1440x900, 1366x768 e 390x844
- revisão visual de overflow, foco, hierarquia destrutiva e textos naturais
- histórico responsivo apresenta cada diferença como cartão rotulado em 390x844, sem exigir rolagem horizontal

Produção não é inferida a partir de QA.
