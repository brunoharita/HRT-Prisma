# AoT — descoberta pertinente e ordenação 3.3.0

Acordo/execução `agreement-position-relevance-v330.md`1.0.0, aprovado em25/10/2026. Baseline e95876b9a8f1915ff5b010f2c9b157b7201bb762. Projeção versionada `position-people-discovery-1.0.0`; score e motor permanecem originais.

| ID | Implementação / evidência | Status |
| --- | --- | --- |
| D-01 | `positionPeopleDiscovery` exige evidência profissional atribuível para relações diretas/relacionadas. Título declarado só corrobora quando idêntico ao de experiência real; competência/área/ferramenta isolada não admitem recomendação | PASS |
| D-02 | Seções separadas de recomendação, dúvida profissional individual e inclusão humana; entrada exige política not_required e material pertinente. Browser24checks em1448/390/320 | PASS |
| D-03 | Confirmação/inclusão preservada em faixa própria quando sem sustentação automática; processos/acompanhamentos não filtram seus participantes. Dispensa humana não é desfeita; histórico só é lido | PASS |
| D-04 | Comparador de notas salvas válido/zero/indisponível; A/B juntos na recomendação, acompanhamento/colunas/seletores/convites/resultados/comparação ordenados pela nota, desempates secundários | PASS |
| D-05 | Nenhuma alteração de vacancy.ts/matchingScore.ts/runtime gerado; sem migration/Edge/IA/novas entidades. Registro3.3.0 e histórico de versões testados; publicação pendente | PARTIAL |
| D-06 | Casos reais em leitura/offline: Beatriz contextual_only/nota null fica not_recommended; Willian related/48 recomendado mesmo sem considerar a confirmação em simulação. Fontes preservadas | PASS |
| P-01 | Sem cutoff numérico/hardcode/blacklist de competências; nota não determina inclusão. Negativos de sinais, cargo só declarado, software vendido, confirmação/dispensa, zero/desconhecido e fonte de entrada | PASS |
| F-01 | RAG/idiomas/modelos/provas/convites e cálculos não alterados; só ordenação e reaproveitamento da consulta opcional de notas | PASS |

## Mapa final e preservação

`direct`: descoberta/UI, ordenação de acompanhamento/seletores e avaliação. `critical_transversal`: autoridade humana e dados persistidos, sem DML/grants; negativos dirigidos e comparação de fingerprints. `plausible_indirect`: comparação, revisão e seleção para convites mantidas; consulta opcional de notas compartilhada pelo pai/resultados sem nova consulta duplicada. `no_impact_identified`: backend/Score/runtime, RAG/ingestão e Horus, demonstrado por diff/check do runtime e inventário operacional a confirmar. Sem nova dependência ou alternativa arquitetural. Ordem do Kanban é interna à coluna; não muda estágio. Timeline de fatos/ações não é ranking de pessoas e mantém sua ordem histórica.

Novidade: sinais isolados deixam de aparecer nas recomendações e nota passa antes do grupo/nome/prova nas listas. Preservação: originais A/B/C e notas ficam nos snapshots históricos; a nova projeção não os regrava nem dispara recálculo pelo deploy. Inclusão em processo e decisão de contratação permanecem explícitas.

## Evidências

- `evidence/position-relevance-v330/real-cases.json`: dados profissionais relevantes dos resultados salvos atuais, consultados em produção e aplicados offline à projeção nova; sem currículo integral, inferência nova ou mutação. Willian48 preservado; decisão confirmed mantida; Beatriz sem decisão/nota não recomendada.
- `browser/`:24checks da composição real de grupos/cartões, exclusão genérica, Willian antes de trajetória direta de nota menor, dúvida individual, ação de comparação e inclusão humana, três viewports. Desktop e320px, além de resultados390px, inspecionados: hierarquia/ações preservadas, sem ruído e sem overflow.
- `assessment/`:65checks do componente/página/modal reais, notas versus acertos independentes, ordem nova, falha opcional/processo incorreto sem vazamento de nota, zero, histórico somente leitura e callbacks explícitos.
- `follow-up/`:12checks, ordem no Kanban e lista nos três viewports, sem overflow ou erros.
- 68testes de domínio PASS; tipos raiz/web, build e check do runtime compartilhado PASS. Contexto/CI/publicação em consolidação. Sem suíte integral local.

O teste visual inicial identificou uma falsa exclusão: o resolver pode citar primeiro o título declarado mesmo havendo cargo idêntico em experiência. Corrigida a atribuição conservadora, com positivo de cargo efetivo e negativo de cargo somente declarado. Um teste estático ainda exigia os antigos títulos A/B/C; atualizado para a composição aprovada, mantendo os checks de nota, cobertura, explicação, fontes e responsividade. Falha de edição CRLF do harness foi corrigida no teste; não se alterou motor para satisfazer seletor ou expectativa antiga.

## Limites / visual

Referência fornecida é contraprova funcional. Cartões/fontes/ações existentes preservados; agrupamento muda explicitamente para ordem global das recomendações, dúvida individual e faixa humana. Browser usa fixtures sintéticas; leitura produtiva não confirma uma jornada humana autenticada pela UI. A projeção filtra observações existentes e não promete infalibilidade da interpretação original. Casos sem informação continuam acessíveis manualmente; nenhuma pessoa é rejeitada.

## Publicação / rollback / conclusão

Publicação e verificação produtiva pendentes. Plano esperado somente web/documentação. Rollback pela imagem web anterior, sem apagar/reprocessar dados ou originais. Não encerrar enquanto D-05 e preservação operacional não estiverem comprovados.
