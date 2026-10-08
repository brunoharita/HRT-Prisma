# Acordo — Ícones centralizados nos destaques

v1.0.0, agreed, 08/10/2026. Autoridade: Bruno pediu corrigir os ícones destacados em toda a plataforma, usando a imagem anexada como contraexemplo, sem alterar a versão do produto. Baseline main `aaa289458676556de000b651539bbeb3ee07354f`, v2.2.0. A instrução já autoriza implementação e publicação conforme AGENTS.md.

- D-01/D-UX-01: ícones dentro de círculos ou superfícies de destaque ficam centralizados nos dois eixos, inclusive nas quatro métricas da página inicial; verificar componentes compartilhados e variantes existentes.
- D-02/D-UX-02: preservar ícones, dimensões, cores, raios, números, textos, agrupamentos, ordem, ações, responsividade e funções. A imagem é contraexemplo do desalinhamento, não autorização para redesenhar a página nem usar seus números como dados reais de teste.
- D-03: corrigir a causa na regra existente, com seletores limitados aos destaques afetados; preservar os destaques já corretos e ícones em controles/textos.
- D-04: manter v2.2.0, registrar a diretriz em UX, Context Pack e AoT, publicar somente o destino necessário e comprovar CI/smoke/rollback/sincronização.
- P-01/P-UX-01: sem compensação por deslocamento arbitrário, sem aumentar SVG para esconder o desalinhamento, esconder ícone ou alterar globalmente todos os anticon/controles.
- P-02: sem mudança de dados, permissões, banco, backend, IA, matching ou incremento de versão.
- F-01: redesign, troca de ícones, novas funcionalidades e correções adjacentes.
- A-01/A-UX-01: reutilizar CSS/componentes/fixtures existentes; engenharia decide especificidade, medições e validação proporcional. Nenhuma dependência nova.
- Q-01: nenhuma pendência material.

## Aceite e fidelidade visual

CA-01/CA-UX-01: reproduzir o desvio, medir centro do SVG contra seu destaque antes/depois (tolerância de1CSSpx por eixo), comparar renders equivalentes desktop/mobile e conferir variantes compartilhadas. CA-02: mesmos tamanhos, cores, raios e conteúdo; nenhum overflow introduzido. CA-03: controles comuns e destaques não afetados preservados. CA-04: tipos/build, checks dirigidos/contexto/CI, publicação web e smoke público com SHA e v2.2.0; registrar limites de cobertura e jornada autenticada real.

## Mapa de impacto inicial

| Área | Relação | Baseline / preservação / regressão |
| --- | --- | --- |
| CSS de indicadores iniciais | direct | prefix56/SVG32; desvio(-12,-7) reproduzido;4centros pós-correção e renders |
| Destaques compartilhados: títulos/Pessoas/Perfil/Knowledge/Posições/Kanban | plausible_indirect | inventário dos3CSS e DOM sintético; centros, tamanhos, ausência de overflow em1813/768/390/320 |
| Controles/navegação | plausible_indirect | seletor não global; menu desktop/mobile e botão com ícone preservados |
| Dados/tenant/backend/IA | no_impact_identified | CSS não toca fluxos/serviços/contratos; diff/plano sem esses destinos |
| Versão/release/contexto | direct | registro2.2.0 inalterado; Context Pack/CI/smoke/rollback |

Classe B: correção visual delimitada na base compartilhada. Não requer nova arquitetura, biblioteca ou ADR. Screenshot `codex-clipboard-36d5c979-fafd-4fd8-b29a-7edea04a625b.png` é o contraexemplo fornecido; topologia e hierarquia permanecem iguais, somente alinhamento corrigido.
