# ADR-077: identidade estável da decisão de curadoria

Estado: aceito para o comportamento explicitamente autorizado no acordo de persistência 1.0.0, 06/10/2026.

## Problema e alternativas

A normalização pode separar uma declaração e mudar o nome de seus fragmentos. Knowledge registra aprovação do termo, mas Inbox de fragmento pode não ter observações. `knowledge_observations` tem unicidade por Perfil/termo normalizado e representa também decisões sobre declarações integrais. Reutilizá-la como decisão de átomo faria a preservação legada aplicar uma escolha a todos os fragmentos. Alterar aliases não registra o alvo exato da decisão nem sobrevive à renomeação.

## Decisão

Reutilizar Knowledge, autorização e RPCs; acrescentar um registro interno mínimo por organização/Perfil/declaração original/trecho, com conceito e operador/prova existentes. Não editar normalizações antigas nem snapshots. A projeção e o processamento consultam esse registro antes de sugestões automáticas, inclusive em Perfil posterior da mesma Pessoa com a mesma declaração/trecho. Gravação e confirmação de resolução pertencem à transação existente. Nenhum novo endpoint público ou biblioteca.

RLS e ausência de grants de escrita direta protegem o registro. Helpers privados executam sob a autorização já estabelecida pelas RPCs. Conceito indisponível ou fora do alcance não produz associação válida; decisão permanece registrada e limitação explícita. Propostas globais pendentes não são decisões concluídas.

A proposta global recebe uma referência server-side à declaração/trecho original. Somente sua aprovação efetiva pela governança existente persiste a decisão, por trigger privado na mesma transação. A contribuição global automática de uma criação local não recebe esse alvo e não substitui a escolha local.

Recuperação inicial usa somente itens fundamentados no último resultado completo do Perfil vigente e termos humanos aprovados inequívocos, com prova de alias ou criação aprovada. Não inferir equivalência nem selecionar conceitos novos.

## Consequências e rollback

Uma pequena tabela e índice são necessários para preservar a identidade que os contratos anteriores não representam. Forma das RPCs e projeções permanece compatível. Reversão operacional restaura funções anteriores, preservando a tabela e o histórico; nunca remover decisões para reverter a apresentação.
