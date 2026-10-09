# Acordo — Avaliação dentro do Score

v1.0.0, frozen, 08/10/2026. Bruno aprovou a imagem compacta e pediu implementação rápida. Classe B; baseline main `9415f4180dad4d031ae02c94307fa1fed33a4187`, versão 2.2.1 mantida. Reutilização: MatchingScoreSummary e AddToPositionFollowUp existentes, sem biblioteca nova. Publicação autorizada pelo AGENTS.md seção 7.

- D-01/D-UX-01: ação azul compacta dentro do fundo lilás do Score, abaixo das informações, com margens iguais e ícone centralizado. Largura desktop do Score permanece a anterior (máximo 300px para cartões com inclusão); altura acomoda a ação sem corte. Substitui D-01/D-UX-01 e CA-01 do acordo discovery-header-evaluation v1.0.0.
- D-02/D-UX-02: ação permanece dentro do Score também em tablet/celular, acompanhando a largura responsiva do quadro e antes de Consultar. Substitui D-02/D-UX-02 e a posição da ação em CA-02 do acordo anterior. Manter leitura em 1813/1537/1024/768/390/320.
- D-03: preservar inclusão explícita, mesmos IDs/handler/tenant/papéis, loading, falha/retry, sucesso desabilitado e navegação; Score, comparação, relação/revisão e demais ações preservados. Sem inclusão automática.
- P-01: não duplicar ação, alargar o Score desktop para acomodá-la, cortar conteúdo ou fazer decisão humana/recálculo implícito. Sem backend/IA/permissões/dados reais/dependências novas.
- F-01: versão, denominador/cálculo, novos fluxos e redesenho dos demais blocos.
- A-01: engenharia decide implementação React/CSS, espaçamento/altura mínima e validação proporcional. Q: nenhuma pendência.

CA-01/02: imagem aprovada `reference.png` é alvo normativo para topologia, largura relativa, agrupamento, posição da ação e estilo; pessoas/textos são ilustrativos. Comparar render antes/depois mesmos dados/viewport 1537/390, medir contenção/300px, responsividade e ícone. CA-03: reaproveitar teste browser de inclusão/falha/retry/sucesso/navegação e testes dirigidos. CA-04: tipos/build/contextos/diff, CI/publicação web/smoke/rollback/sincronização.

## Mapa de impacto

| Área | Relação | Baseline e preservação / regressão |
| --- | --- | --- |
| Score e CTA dos cabeçalhos normal/pendente | direct | SHA baseline, before1537/390; render/geometria e diff dos dois ramos |
| AddToPositionFollowUp | direct | handler intocado; loading/falha/retry/sucesso/navegação sintéticos |
| Score sem ação/drawer/comparação | plausible_indirect | prop opcional; texto/dados intactos, sem children conserva render; teste e diff |
| Papéis/Consultar/relação/revisão | plausible_indirect | fixture member/review, handlers intocados |
| Lista/Kanban/backend/tenant/IA/Perfil | no_impact_identified | nenhum serviço/contrato/consulta alterado; IDs e rotas preservados, CSS local |
| Release/contexto | direct | web apenas, 2.2.1, CI/smoke/rollback |

Sem jornada transversal crítica nova. Prova sintética não comprova inclusão autenticada real em produção.
