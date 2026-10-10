# Mapa de impacto — Pessoas compactas v2.3.4

Inicial10/10/2026, antes da implementação. Baseline main/origin220b5034d951a83b9d353596604da5cdd856ff7c, runtime webfa4168c69bc58dea78c0bf0eb7cb286088e38c6d/2.3.2; conferir operacionalmente antes do rollout. Branch codex/people-compact-v234. Risco C, integração frontend por RPC existente; sem schema/auth novo. Trabalho alheio não rastreado preservado.

| Área / capacidade | Relação | Baseline / cenário | Regressão mínima |
| --- | --- | --- | --- |
| Pessoas/identidade/score/requisitos/expansão/mobile | direct | CandidateMatchCard em VacancyPages, grandes colunas; fixture real sintética before desktop/mobile | renders equivalentes, geometria/overflow, conteúdos e ações |
| Vínculo/inclusão/estado por processo atual | direct | AddToPositionFollowUp guarda apenas added local; RPC atual existente retorna processo/entries | atual/histórico/fechado/ausente/pending/failure/retry/add/race e processo explícito |
| Tenant/papéis/concorrência | critical_transversal | RPC existente autoriza fora do frontend; efeitos seguem organização/Posição | mocks negativos de mudança de scope e retorno tardio; sem modificar grants/RLS |
| Confirmação/desconsideração/curadoria/divergências | direct | callbacks existentes independentes de follow-up | handlers/gates/loading/falha, separação humana e nenhum automatismo |
| Comparação/Perfil/navegação de retorno | plausible_indirect | CSS de score compartilhado e selection/view state | CSS restrito ao card; comparação existente, rota de Perfil/follow-up e seta anterior |
| Matching/fatos/IA/scorepersistido | no_impact_identified | leitura dos snapshots e callbacks de recálculo explicitamente humano | diff e testes vacancyIntelligence/positionFollowUp/stable-score; nenhuma fórmula ou chamada IA nova |
| Prova/portal/convites | no_impact_identified | link follow-up é único contato, serviço não alterado | diff + tipos/build; não executar envio/geração |
| Backend/DB/Edge/Parser/Synthesis/Mail/Gateway/Traefik | no_impact_identified | contratos e runtimes existentes | plano sem esses destinos; IDs/imagens/restarts antes/depois VPS |
| Registry/contextos/releaseweb | direct | versão2.3.2 | versão2.3.4 com3pulado, generator/check/CI, smoke e rollback |

Referência normativa: primeira proposta aprovada. Reutilização: Ant Design, details nativo, cards, serviços e RPCs Prisma atendem integralmente; não há lacuna que exija dependência externa. SQL será somente lido no repositório para conferir contrato; nenhuma consulta ou fixture de produção é necessária. Atualizar mapa se descoberta ampliar dependências.

Descoberta na validação CI: testes estáticos de rótulos/layout anteriores são diretamente afetados. Regressão inclui matchingEvidenceLabel e matchingScore; preserva a descrição de ausência de evidência no Perfil publicado e atualiza apenas asserções de apresentação aprovadas.
