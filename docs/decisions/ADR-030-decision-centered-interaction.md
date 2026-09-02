# ADR-030: Interação centrada em decisão e intervenção humana mínima

- Status: accepted
- Date: 2026-09-02
- Owners: product, UX, engineering and QA

## Context

O Prisma combina automação determinística, recomendações, revisão humana, auditoria e operações sensíveis. Parte da interface ainda transformava responsabilidades internas do sistema em trabalho do operador, como pedir justificativa textual redundante, exigir cliques para fechar avisos sem ação ou bloquear um descarte visual porque o registro opcional de telemetria falhou.

## Problem

Reduzir cliques e teclas sem permitir que IA, defaults ou conveniência substituam decisões humanas materiais, e sem enfraquecer autorização, evidência, publicação ou integridade.

## Decision

Cada intervenção humana obrigatória deve representar ao menos uma destas condições: julgamento diante de ambiguidade relevante, exercício de autoridade, aceitação de risco material, decisão irreversível ou escolha que o sistema não consegue derivar com segurança.

Coordenação determinística, valores já conhecidos, auditoria factual, retry técnico, fechamento de apresentação e continuidade após uma ação concluída pertencem ao sistema. Ações locais e reversíveis não exigem confirmação; quando houver risco de perda, a interface prefere desfazer ou restauração automática. Recomendações opcionais nunca bloqueiam a tarefa principal. Fechar ou dispensar uma recomendação atualiza a interface imediatamente; telemetria elegível é registrada em segundo plano e sua indisponibilidade não exige nova ação do operador.

Intervenção mínima não significa decisão autônoma. Publicação, remoção de fato aprovado, aceite de inferência ambígua, mudança de autoridade, ação destrutiva e demais mutações sensíveis continuam explícitas, contextualizadas e fail-closed. Quando auditoria for requisito de validade da própria mutação, ela integra a mesma transação ou uma fila durável; não é transferida ao usuário como clique ou texto adicional.

## Alternatives considered

- Confirmar toda ação: rejeitado por transformar cautela genérica em atrito e dessensibilizar o operador.
- Ocultar toda falha técnica: rejeitado para mutações materiais, nas quais preservação e próxima ação precisam continuar explícitas.
- Aplicar recomendações automaticamente: rejeitado porque reduz cliques ao custo de retirar autoridade humana e confundir proposta com fato.

## Reasons for the choice

O operador agrega valor ao decidir, não ao alimentar metadados que o sistema já conhece. Separar ação material de coordenação visual reduz interrupções e mantém as proteções concentradas onde há consequência real.

## Positive consequences

- Menos cliques, digitação redundante e mensagens bloqueantes.
- Recuperação automática e continuidade mais previsível.
- Maior clareza sobre quais ações realmente representam decisão humana.
- Governança preservada para publicação, remoção, autoridade e evidência.

## Negative consequences

- Operações secundárias exigem tratamento assíncrono e observabilidade sem depender de alertas ao operador.
- Cada novo bloqueio precisa declarar a decisão ou o risco que justifica sua existência.

## Risks

Confundir redução de atrito com autorização automática, perder telemetria não crítica sem visibilidade interna ou esconder uma falha que afete dados.

## Mitigation

Classificar ações como materiais ou auxiliares, manter mutações materiais transacionais e fail-closed, testar ausência de bloqueios em ações auxiliares e registrar falhas secundárias sem PII. Se a telemetria for obrigatória, usar persistência atômica ou fila durável antes de ativar o fluxo.

## Technical impact

Introduz o contrato local `decision-centered-interaction` 1.0.0. No aprendizado intra-documento, relatório sem proposta segura é aviso não bloqueante; `Fechar aviso` não chama a RPC de auditoria. Quando há sugestões válidas, `Descartar sugestões` remove o painel imediatamente e registra a decisão elegível em segundo plano. O wrapper Supabase continua validando assinatura, tenant e papel sem alteração de schema, grant ou RLS.

## Data impact

Nenhum schema ou payload persistido muda. Descartes de propostas estruturais válidas continuam elegíveis ao evento metadata-only. Fechar um diagnóstico sem proposta não cria uma falsa decisão de descarte.

## Security and LGPD impact

Nenhuma autorização é ampliada. Dados pessoais não entram na telemetria; as RPCs existentes continuam tenant-scoped, com validação interna e DML direto revogado.

## AI impact

Recomendações permanecem propostas e nunca são aplicadas por silêncio, ausência de clique ou fechamento de aviso. Ambiguidade relevante continua exigindo revisão humana.

## Compatibility

Mudança compatível de aplicação e UI. Eventos históricos permanecem legíveis; clientes antigos continuam aceitos pelo backend, embora possam manter o bloqueio visual anterior.

## Validation strategy

Testes unitários comprovam que relatórios sem assinatura válida não são registráveis. Testes de integração estática protegem fechamento imediato, registro assíncrono apenas de sugestões válidas e ausência do CTA de aplicação quando não há proposta. Smoke autenticado confirma continuidade sem erro e sem mutação de perfil.

## Review criterion

Reavaliar quando uma obrigação legal ou contratual tornar indispensável persistir uma decisão auxiliar antes de continuar, ou quando métricas mostrarem que a automação está ocultando decisões relevantes.

## Replacement criterion

Somente um ADR posterior pode ampliar intervenções obrigatórias, identificando a decisão humana, o risco concreto, a alternativa sem clique e a evidência que justifica a mudança.

## References

- `AGENTS.md`
- `docs/product/product-vision.md`
- `docs/architecture/contracts.md`
- `docs/architecture/document-review-contract.md`
- `docs/qa/m5-sibling-block-learning.md`
- `web/src/pages/ProfileReviewPage.tsx`
- `web/src/components/review/AdaptiveSuggestionPanel.tsx`

## Change history

- 2026-09-02: accepted and implemented locally for the adaptive suggestion dismissal flow.
