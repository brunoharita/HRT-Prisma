# Acordo — revisão humana de divergências da trajetória v1.0.0

Decisão de Bruno em 2026-09-30: no máximo cinco itens divergentes por Perfil e versão da Posição podem ser apresentados para tratamento humano; depois de concluído o tratamento, o Prisma recalcula o score. Acima de cinco, permanece o cálculo interno anterior à IA. Este acordo substitui apenas a rejeição integral de toda discordância no ADR-073; o par de leituras original permanece auditável.

## DEVE

- D-01 — Contar divergências por `entry.id` e categoria profissional, ignorando a ordem de retorno e diferenças isoladas no segmento de citação. Somente duas leituras completas e validadas da mesma tentativa são elegíveis.
- D-02 — Entre uma e cinco divergências, exibir ao operador autorizado cada item, o trecho profissional, as duas categorias e a referência de evidência, sem tratar nenhuma resposta como verdade. Permitir escolher uma das classificações sustentadas ou `não é possível determinar` para cada item.
- D-03 — Salvar a decisão humana apenas para o par Perfil–versão da Posição, vinculada ao cache, fontes, tentativa, revisor e horário. Revalidar servidor, tenant, papel, versões, quantidade e opções antes da gravação. Não alterar Perfil, Posição ou Knowledge.
- D-04 — Após salvar todas as decisões que permitam uma leitura íntegra, compor uma interpretação versionada com os itens concordantes e as decisões humanas, recalcular grupo, score e evidências pelo motor compartilhado, e identificar claramente a origem humana. Se alguma decisão decisiva continuar indeterminada, preservar o cálculo interno pré-IA sem conclusão semântica.
- D-05 — Acima de cinco divergências, não oferecer tratamento item a item neste fluxo: conservar integralmente o cálculo interno e explicar que a IA não concluiu; nem a divergência nem o excesso reduzem pontuação ou excluem a Pessoa.

## PROIBIDO

- P-01 — Escolher automaticamente um dos lados, converter discordância em fato negativo, zero ou Grupo C, ou declarar score final quando houver decisão material pendente.
- P-02 — Permitir escrita de revisão por `member`, outro tenant, fonte/versão obsoleta, avaliação sem par válido, item não conflitante ou opção sem evidência.
- P-03 — Publicar correção contextual na Knowledge global/empresa, substituir o par original, guardar currículo bruto, confiar em score enviado pelo navegador ou alterar pesos/prompt/modelo.

## FORA DE ESCOPO

- F-01 — Nova política de modelo ou de acionamento da IA, múltiplas rodadas de revisão, alteração de requisitos, reaplicação em Perfis/Posições diferentes e reprocessamento pago de dados reais.

## AUTONOMIA

- A-01 — Engenharia escolhe o armazenamento e a apresentação na tela existente, reutilizando a leitura auditada, autoridade de decisões de matching (`owner`, `admin`, `recruiter`) e motor de score.

## CRITÉRIOS DE ACEITE

- CA-01 — Um a cinco conflitos, inclusive o caso observado de três: tela mostra os itens, revisão autorizada produz leitura composta e score reproduzível; um conflito não decidido mantém fallback.
- CA-02 — Seis ou mais conflitos: nenhuma opção de salvar revisão e resultado pré-IA intacto. Diferença de ordem ou de `evidenceId` com mesma categoria não conta.
- CA-03 — Testes negativos de tenant/papel, versão e cache, opções malformadas, par inválido e concorrência; revisão não divulga par para papéis sem acesso nem altera Knowledge.
- CA-04 — Busca e comparação exibem origem, pendências e score recalculado de modo causal; snapshots persistidos só aceitam a leitura revisada autenticada e o fingerprint vigente.

## Mapa de impacto e preservação

| Área | Relação | Baseline | Regressão |
| --- | --- | --- | --- |
| Par auditado, cache, RPC de revisão | direct | `main` e0e8289, par completo apenas interno, status indeterminado | SQL local, tenant/papel, imutabilidade do par |
| Edge de matching e snapshot | direct | Duas leituras; divergência integral descartada | Deno de 0/1/5/6 conflitos, fonte obsoleta, snapshot |
| Motor compartilhado, score e versões | direct | Interpretação apenas consensual | Testes de grupo/score/fingerprint e fallback |
| Busca, comparação e detalhe | direct | Aviso genérico e pré-IA preservado | Testes de UI e comparação, visual no mesmo estado |
| Auth, privacidade e auditoria | critical_transversal | RLS/cache fechado, papéis de matching | Negativos e smoke QA |
| Knowledge, parser e requisitos | no_impact_identified | Sem escrita prevista | Inspeção de diff e smoke de preservação |

Estado: agreed. Aprovação: pedido explícito de implementação em main e produção por Bruno em 2026-09-30, após discussão dos limites e do fallback.
