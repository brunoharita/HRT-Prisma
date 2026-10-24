# Acordo — classificação publicada nos cartões de Conhecimento

Versão1.0.0, agreed. Correção solicitada por Bruno em24/10/2026, após selecionar H4 em Transformação operacional e não encontrar continuação. Baseline84741a1cef3a664f796e2c2ef096a9e5a87ce8a8 /3.2.0. Restaura curadoria M8.1 e decisões globais2.0.0 (AoT knowledge-decisions-v281), sem nova autoridade.

- D-01: cartão aprovado exibe classificação vigente do conceito publicado, lida de `knowledge_competency_classifications`, mesmo que a proposta original não contenha subgrupo. Identificar estado aprovado e versão da classificação; não apresentar seleção editável sem ação válida.
- D-02: somente propostas pendentes mantêm seletor/guia e continuação das ações vigentes. Selecionar não grava; aprovar exige classificação válida, certificações continuam bloqueadas, motivo global opcional e duas decisões preservadas.
- D-03: preservar original, histórico, aprovações, escopos/RLS, conceitos e demais fluxos. Falha de consulta adicional fica explícita com retry; não bloqueia operação pendente nem simula ausência/classificação salva.
- P-01: alteração automática de classificação ou proposta aprovada; reabertura/reaprovação implícita; nova tabela/entidade, migration, IA, mudança de pesos ou permissões.
- F-01: criar funcionalidade para reclassificar conceitos já aprovados ou migrar/regularizar dados históricos. O registro reportado já possui H4, confirmado somente leitura.
- A-01: consultas limitadas às identidades visíveis, DTO/componente e engenharia delegados, mantendo layout dos cartões. Referências fornecidas são exemplos do defeito, não alvo de um redesign.
- CA-01: reproduzir original sem subgroup + classificação publicada H4; render somente leitura e sem nova decisão. Pending seleção libera aprovação existente; reload/erro/missing/rejected/deferred/occupation preservados. Desktop/mobile, tipos/build, regressão dirigida e CI; release só web, smoke e sincronização. Manter3.2.0 como correção da exibição.

Sem Q material pendente. Aprovação de publicação coberta pela autorização permanente do repositório.
