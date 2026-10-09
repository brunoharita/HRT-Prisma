# Acordo — Etapas claras de acompanhamento

v1.0.0, frozen, 08/10/2026. Solicitação explícita de Bruno: retirar as etapas ambíguas, ajustar o necessário e manter a versão 2.2.1. Baseline main `9bd6c79b048e3005cda78caaddcba083c6071eae`. Classe C, somente web. Reutilização: etapas persistidas, RPCs, formulários, filtros e navegação existentes; sem dependência nova. Publicação autorizada pelo AGENTS.md seção 7.

- D-01: uma etapa inicial Selecionadas para acompanhamento reúne as Pessoas anteriormente em Aguardando avaliação e Em avaliação, sem perda de pessoas, referências, anotações ou histórico. Substitui a nomenclatura e agrupamento inicial de D-04 do acordo position-follow-up-v220 1.0.0.
- D-02: cinco colunas concretas: Selecionadas para acompanhamento, Aguardando entrevista, Entrevista agendada, Aguardando decisão, Decisão registrada. Estados de entrevista/decisão deixam de ser tags redundantes. Concluídos continua separado. Lista, filtro, drawer, vínculos na Pessoa e seleção mobile usam os mesmos nomes. Filtros/coluna antigos continuam funcionando.
- D-03: inclusão passa a Adicionar ao acompanhamento, com loading/sucesso/estado vazio/orientação coerentes. Nomes automáticos Avaliação NN aparecem como Acompanhamento NN, preservando nomes personalizados e persistidos. Preservar destaque azul dentro do Score e handler/IDs/gates. Substitui apenas o texto de D-02 do acordo position-follow-up-v220 e dos acordos posteriores de localização.
- D-04: movimento para Selecionadas/Aguardando entrevista/Aguardando decisão salva a etapa; movimento para Entrevista agendada/Decisão registrada abre o formulário existente e só muda a etapa após registro válido. Abandonar formulário não altera etapa; decisão sem escolha predefinida e com justificativa, entrevista com data/hora/fuso/participantes. Falha/conflito/loading/rascunhos preservados.
- D-UX-01: preservar cartões e linguagem visual atuais; cinco colunas com larguras e alturas iguais na mesma linha, rolagem local quando necessário para evitar comprimir cartões, uma coluna selecionável no mobile. Referência normativa para estrutura preservada: screenshot fornecido pelo usuário e before1448/390 na pasta de evidências. A mudança aprovada é de etapas, sem redesenho dos cartões.
- P-01: nenhum recálculo, IA, avaliação/questionário, envio, escolha humana inventada, alteração de Perfil/Knowledge/ocupação/tenant/permissões ou reescrita de histórico. Não criar uma etapa factual sem seu registro explícito.
- F-01: banco de questões/avaliações, layout compacto dos cartões e novos campos, mudança de versão, schema/RPC/backfill/dados reais.
- A-01: engenharia decide projeção compatível dos identificadores legados, foco nos formulários, tokens e regressão proporcional. `awaiting_evaluation` continua identificador técnico da nova etapa inicial; `evaluating` é alias somente de leitura/visualização. Não alterar contrato persistido 1.0.0 nem histórico bruto.
- Q: nenhuma decisão material pendente na recomendação adotada. Pergunta opcional sobre agrupamento foi apresentada; segue-se a proposta de situações em colunas individuais discutida com Bruno.

CA-01: testes das duas etapas legadas, filtros e coluna mobile antiga; mesmas Pessoas/Score/detalhes/histórico. CA-02: browser drag/teclado/mobile, cinco destinos, formulários sem mutação ao abrir/cancelar, validações, salvamento explícito, falha/conflito, sem tags redundantes. CA-03: inclusão/loading/retry/sucesso/navegação e geometria desktop/mobile, sem corte. CA-04: tipos/build/testes dirigidos/contextos/diff/CI, release web, smoke/rollback/sincronização; 2.2.1.

## Mapa de impacto

| Área | Relação | Baseline, preservação e prova proporcional |
| --- | --- | --- |
| Projeção de etapas, filtros e Lista/Kanban/mobile | direct | SHA baseline, fixture com ambos legados; unitários/browser/antes e depois 1448/390 |
| Agendamento/decisão/drawer/drag/teclado | direct | RPCs e formulários existentes; browser valida abertura sem gravação, dados obrigatórios, falha e decisão explícita |
| CTA/estado vazio/orientação | direct | Score compacto publicado; browser inclusão/loading/retry/sucesso, contenção e seis larguras |
| Vínculos no Perfil | plausible_indirect | mapa de nomes compartilhado; unitário de labels e tipos, render/handler intactos |
| Autoridade/revisão concorrente/estabilidade Score | critical_transversal | serviço/RPC intactos; testes de rota, falha/conflito e snapshots invariantes sintéticos |
| Banco/IA/ingestão/Knowledge/Perfil/ocupação | no_impact_identified | nenhum contrato persistido, consulta, handler de matching ou campo profissional alterado; revisão do diff/dispatcher web apenas |
| Release/contexto | direct | 2.2.1 e runtime baseline 4f68ed54; CI/smoke/rollback/infra preservada |

Limites: testes locais são sintéticos. Smoke público não comprova operação autenticada real. Não existe QA remoto separado neste fluxo.
