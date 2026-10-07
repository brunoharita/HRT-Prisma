# Execução — revisão extensa opcional

Aplicar integralmente `agreement-extended-trajectory-review.md` 1.0.0, sem reinterpretar D-01–05/P-01/F-01/A-01. A solicitação explícita aprova o acordo; não é necessária confirmação de detalhes mecânicos. Classe D: gravação de interpretação contextual/matching. Baseline local/main/origin `1a1c254455e0b354cae67d728fa4c564a25f5a3a`; runtime web v2.1.6 `20ebdd70`, backend matching-trajectory16 conforme evidência anterior, a verificar antes do rollout.

## Mapa prévio de impacto e preservação

| Área | Relação | Baseline/cenário/evidência e regressão |
| --- | --- | --- |
| Modal, serviço, domínio, Edge e RPCs/tabela de revisão | direct | Limite cinco confirmado em código/SQL; ampliar apenas elegibilidade, testar 1/5/6/maior, revisão completa e incerteza |
| Autorização/tenant/fontes/concorrência/citações | critical_transversal | Guards RPC/Edge existentes; negativos e SQL sintético com rollback, grants/RLS remotos |
| Score persistido, busca/detalhe/comparação | plausible_indirect | Contrato v2.1.4; abrir/recusar/paginar sem efeitos, salvar isolado e regressão estabilidade |
| Ajuda, navegação, rascunhos, estados v2.1.6 | direct | Modal/Ant Design existentes; renders e browser desktop/mobile, escolha preservada/sem pré-seleção |
| Parser, síntese, gateway, publicação de Perfil/Knowledge | no_impact_identified | Nenhum consumidor executável dessas capacidades mudou; preservar IDs/imagens/saúde no rollout |

Reuso escolhido: componentes e RPCs já existentes. Nenhuma biblioteca nova; não há lacuna que justifique construção externa. Migração nova, sem reescrever as anteriores; proteção de revisão completa passa a usar o total real das divergências. O formato das decisões/evidências permanece compatível. Sem aumento de custo de IA: a revisão usa o par já armazenado. Rollback de aplicação preserva registros/histórico e schema ampliado; não estreitar novamente a constraint se houver revisões extensas.
