# Acordo — Cards compactos do acompanhamento

v1.0.0, frozen, 09/10/2026. Bruno confirmou que o ajuste aprovado dos cards também integra a entrega. Baseline main `fe35d88a7a67a124bc542f2bc5799db746bdadb4`; produto 2.2.1 mantido. Este acordo substitui F-01/D-UX-01 do acordo follow-up-stages somente quanto à exclusão/preservação do layout antigo dos cards, e D-06 do acordo position-follow-up-v220 quanto aos campos visíveis no card. Classe D por leitura de cidade/UF; sem escrita de dados pessoais. Reuso: cards, Score persistido, RPC e formulários existentes. Sem biblioteca nova. Publicação coberta por AGENTS.md seção 7.

- D-UX-01: aplicar o primeiro layout compacto refinado aprovado, referência normativa `reference.png`: avatar pequeno e identificação à esquerda; nome em negrito, cargo e cidade–UF abaixo; quadrado azul-claro com numeral azul à direita, alça acima; aviso de qualidade do Score fora do quadrado; divisor e Ver detalhes/Mover etapa lado a lado no rodapé. Preservar hierarquia/proporções/agrupamento e reduzir altura, sem recortar nome/cargo. Conteúdo/pessoas/números ilustrativos.
- D-02: somente nome, cargo, cidade–UF e Score no resumo principal. Quadrado contém somente número, sem Prisma, /100, porcentagem ou link textual; nome acessível identifica Score/cobertura. Ausência tem apresentação honesta (travessão com nome acessível para Score; localização/cargo não informados), sem zero inventado. Idade permanece disponível no detalhe existente, sai do resumo compacto.
- D-03: cidade/UF vêm do cadastro privado atual da Pessoa (city/state_code), atualizado também pela publicação aprovada do Perfil; esse é o contrato de persistência existente, pois o Perfil público não armazena contato. Nunca inferir estado por cidade ou aproveitar localização de snapshot antigo. Normalizar nome completo conhecido de estado para sigla; desconhecido permanece texto original. RPC retorna apenas dois campos opcionais adicionais, sem Perfil integral/contato/nascimento; mesmos gates, joins tenant e grants.
- D-04: preservar cinco etapas atuais, dimensões iguais das colunas, Lista/filtros/seleção mobile, drag/Escape/Mover etapa, loading/falha/conflito/rascunhos, agendamento/decisão explícitos e consulta de Score/cobertura/fontes. Mobile mantém a mesma composição compacta com ajustes de espaçamento; ações acessíveis sem overflow.
- P-01: nenhum recálculo/IA/questionário/convite, mudança de escolha humana, histórico, Perfil, Knowledge, ocupação ou permissões; sem dados reais sintéticos em produção.
- F-01: questões, novas etapas, edição de dados pessoais, mudança de versão ou biblioteca.
- A-01: CSS/React e normalização determinística de UF, migração aditiva da leitura existente, verificações proporcionais. Q: nenhuma pendência material.

CA-01: comparação visual mesma fixture/dados/viewport antes/depois 1448/390, além de estado fiel à referência com Bruno56 provisório/Diego62, Bauru-SP ilustrativos; geometria de quadrado/colunas, ações e redução de altura. CA-02: testes de localização completa/parcial/ausente/desconhecida, zero válido/indisponível e conteúdo longo; browser desktop/mobile/320 sem overflow. CA-03: SQL transacional local com fixtures e rollback: campos atuais sem snapshot, gates anônimo/member/outsider/inativo, tenant/versions/histórico/Score preservados. CA-04: tipos/build/testes dirigidos/contextos/CI; somente migration revisada + web, verificação remota de corpo/grants/RLS, smoke/rollback/sincronização.

## Mapa de impacto

| Área | Relação | Baseline e preservação / regressão |
| --- | --- | --- |
| Card/Score/rodapé/arraste/mobile | direct | SHA baseline e fixture antes/depois; browser/geometria/referência normativa |
| Leitura get_position_follow_up e campos city/state | direct | corpo remoto normalizado igual ao arquivo local original; SQL local e hash/grants/RLS remotos, sem PII real em logs |
| Serviços de mutação/lista/filtros/drawer | plausible_indirect | RPC mutadora intocada, campos opcionais compatíveis; browser de etapas/falhas/decisão/Score |
| Isolamento/permissões/estabilidade Score | critical_transversal | negativos SQL existentes e invariância de dados; rota e browser sintético |
| Perfil/Knowledge/ocupação/IA/importação | no_impact_identified | apenas projeção de leitura e CSS local; diff sem escrita ou invalidadores/consulta de IA |
| Release/contexto | direct | 2.2.1, plano migration+web, CI/smoke/rollback/serviços preservados |

Sem QA remoto separado. SQL local usa PostgreSQL17 localhost55479/import_evidence_v202 vazio e rollback. Browser é sintético; smoke público não comprova operação autenticada real.
