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
| Perfil atual, versão ou documento -> nova revisão | fonte imutável e rascunho próprio, sem reupload |
| Corrigir Pessoa vinculada | árvore documental movida atomicamente; Perfis publicados preservados |
| Mesclar Pessoas e repetir | uma absorção auditável, sem duplicar efeitos |
| Alterar vínculo | Pessoa atualizada sem nova versão de Perfil |
| Arquivar e reativar | busca operacional muda; histórico permanece |

## Gates

- `CI=true pnpm run validate`
- migrations `20260903194822` a `20260903204244` aplicadas e registradas no Prisma-QA
- prova SQL conectada executada com `rollback`: publicação `authenticated` permitida; restauração, reinício e exclusão `anon` negadas; núcleo privado negado
- prova conectada validou merge, replace, alvo inválido, restauração idempotente, reinício, exclusão, snapshot de Knowledge, ausência de órfãos e preservação de Evidência Demonstrada
- Edge Function `person-document-lifecycle` publicada no Prisma-QA com JWT obrigatório
- smoke autenticado em 1920x1080, 1600x900, 1440x900, 1366x768 e 390x844
- revisão visual de overflow, foco, hierarquia destrutiva e textos naturais
- histórico responsivo apresenta cada diferença como cartão rotulado em 390x844, sem exigir rolagem horizontal

## Evidência M5.3 no Prisma-QA

- migrations `20260903232237`, `20260904000509`, `20260904000810`, `20260904001336` e `20260904001602` aplicadas e registradas;
- `db lint --linked --level error --fail-on error`: zero erros;
- `m53_pilot_operational_resilience_verification.sql`: transação revertida após provar revisão por versão e replay, exclusão da fonte sem reescrever Perfil, restauração para a próxima versão, movimentação integral da árvore documental, mesclagem idempotente e grants fechados para `anon`/núcleo privado;
- a regressão encontrou uma FK espacial imediata durante a movimentação; a correção forward-only tornou a relação diferível e passou a atualizar região e documento na mesma transação.
- smoke autenticado concluiu a jornada de consulta completa das versões, compatibilidade de idioma histórico, confirmação de restauração, preflight de exclusão, correção de Pessoa vinculada, comparação de cadastros para mesclagem e ciclo reversível arquivar -> reativar em uma Pessoa sintética;
- a Central da Pessoa passou em `360x800`, `390x844`, `768x1024`, `1280x720` e `1440x900`, com zero overflow horizontal global ou em descendentes do conteúdo principal.

Produção não é inferida a partir de QA.
