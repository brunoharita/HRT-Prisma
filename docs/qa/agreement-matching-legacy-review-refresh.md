# Acordo — checagem explícita de discordância antiga v1.0.0

Decisão de Bruno em 2026-09-30: para uma discordância antiga sem o par das duas respostas armazenado, permitir uma nova checagem por IA somente quando a pessoa autorizada clicar para solicitá-la. Este aditivo **substitui apenas a restrição F-01** do acordo `agreement-matching-human-conflicts.md` v1.0.0 no caso de cache legado sem par; não altera as demais regras desse acordo nem transforma uma repetição automática da mesma versão em política geral.

## DEVE

- D-01 — A abertura da revisão de um registro legado sem par responder prontamente e explicar que as respostas antigas não foram guardadas. Não alegar falha de preenchimento, nem apresentar itens inventados.
- D-02 — Oferecer uma ação explícita apenas ao operador autorizado para pedir duas novas leituras de IA para o Perfil e a versão da Posição em tela. Antes de adquirir o trabalho pago, o servidor deve revalidar tenant, papel, fontes, contexto, modelo/prompt/método e identidade do cache. Registrar solicitante e horário. Uma linha legada pode receber no máximo uma checagem adicional por esta exceção.
- D-03 — Processar a nova tentativa pelo contrato auditado existente, preservando a contagem real de tentativas. Se as leituras discordarem, oferecer revisão humana de um a cinco itens; acima de cinco, conservar o cálculo interno. Se concordarem, usar o fluxo normal de interpretação e recálculo. Se a IA falhar, manter o cálculo interno e impedir outra chamada automática decorrente desse registro.
- D-04 — Mostrar mensagens causais para indisponibilidade, fontes alteradas e concorrência, sem alterar grupo ou score antes de uma leitura válida ou decisão humana íntegra.

## PROIBIDO

- P-01 — Reprocessar automaticamente caches antigos durante busca, atualização da página, abertura do cartão ou carga da revisão.
- P-02 — Burlar os limites de papel/tenant, reusar o par de outra posição, inventar as respostas antigas, expor o par bruto ao navegador ou salvar revisão sem evidência.
- P-03 — Apagar o fallback, alterar Knowledge, Perfil, Posição, pesos, prompt ou modelo para fazer a checagem passar.

## FORA DE ESCOPO

- F-01 — Reprocessamento em massa, backfill de respostas antigas, reanálises de registros já auditados, mudança da política normal de retries e chamadas pagas para smoke em Pessoas reais.

## AUTONOMIA

- A-01 — Reusar o cache, lease e conclusão auditada existentes; escolher a apresentação na tela atual e o mecanismo restrito de solicitação.

## CRITÉRIOS DE ACEITE

- CA-01 — Cache antigo sem par retorna causa própria; somente clique autorizado inicia duas leituras, sem chamada ao provedor na carga ou em clique repetido.
- CA-02 — Tentativa anterior número três pode ganhar uma quarta tentativa explicitamente solicitada, com auditoria real; par novo diverge e abre os itens ou concorda e atualiza o resultado.
- CA-03 — Negativos para member/outro tenant, análise/versão/fonte alterada, concorrência, resposta inválida e falha do provedor. Falha não aciona retry automático nem muda o resultado interno.
- CA-04 — Busca, comparação, snapshot e Knowledge preservados; produção só declarada após migrations, Edge, web, CI e smoke proporcionais.

## Mapa de impacto e preservação

| Área | Relação | Capacidade protegida e baseline | Prova proporcional |
| --- | --- | --- | --- |
| Cache, lease, par auditado, revisão | direct | Cache legado não tem par; novo cache tem auditoria | SQL sintético 1/3/4 tentativas, recusa, par novo, falha |
| Edge de matching | direct | Duas leituras em ordem inversa; nenhuma chamada em review_load | Deno com provedor simulado, carga sem custo, clique explícito |
| Cartão e mensagens | direct | Resultado pré-IA visível e preservado | Typecheck/build e inspeção visual proporcional |
| Autorização, tenant e dados profissionais | critical_transversal | RPC service-only, papel de revisão e contexto minimizado | Negativos SQL/Edge, grants/RLS, sem PII em logs |
| Score/snapshot, Knowledge e requisitos | plausible_indirect | Motor e bases existentes | Testes de matching afetados e inspeção do diff |

Estado: aprovado pela resposta explícita de Bruno em 2026-09-30. Nenhuma decisão material pendente para este aditivo.
