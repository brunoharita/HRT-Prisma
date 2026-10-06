# Acordo — Página unificada da Pessoa v2.1.0

Versão 1.0.0, aprovado/congelado em 06/10/2026 pela autorização explícita de Bruno nesta conversa. Os rótulos de proposta nos anexos são históricos e superados por esta autorização de implementar/integrar main/publicar v2.1.0. Baseline local/origin main df7b8403d23adefb0d8981f4391e757067e30551, produto2.0.12. Classe C, com validação negativa das fronteiras D existentes. Branch codex/person-unified-v210. Nenhuma nova arquitetura, dependência, schema ou decisão de produto.

## Contrato

- D-01: entrada direta na visão profissional/Resumo, cabeçalho único real, ações condicionadas e seis abas na mesma Pessoa. Rotas antigas/bookmarks e retorno à lista/busca/filtros/posição preservados.
- D-UX-02: composição normativa da referência refinada: desktop 70–73% leitura/27–30% operações, quatro destaques em linha, síntese integral, oito análises abertas em duas colunas, indicadores factuais; lateral pendências/documentos/atividade/ações. Tipografia legível, altura natural. Intermediário2x2, celular uma coluna, pendências antes da leitura, sem overflow horizontal.
- D-03: destaques reutilizam cálculos/classificação atuais de áreas/tempo, experiências recentes, maior formação concluída inclusive MBA/Especialização sustentados e organizações distintas. Não reduzir listas ou textos.
- D-04: fontes ocultas por padrão, Mostrar fontes no bloco da síntese, narrativa sempre aberta, resumo original consultável e retorno ao ponto de leitura. Nenhuma geração IA por visita/troca de aba/fonte.
- D-05: pendências reais, problema/objeto e destino viável; sem card amarelo artificial, distinção entre associação de evidência e classificação. Nova falha/revisão não oculta Perfil vigente. Carregamentos independentes e estados sem Perfil explícitos.
- D-06: preservar integralmente cadastro/contato autorizado, importação manual/PDF, documentos/tentativas/extração/revisão/recuperação/auditoria, versões/restauração/reinício, competências/curadoria/vínculos múltiplos/evidências, formação/idiomas/credenciais/outros, ciclo/fusão/Meus dados/exclusão. Member não consulta workspace operacional nem contato privado; autorização server-side existente preservada. Edição não salva mantém proteção.
- D-REL-07: versão explicitamente2.1.0, owners/current-state/contextos/AoT, validação proporcional/CI, commit/push/main, somente superfícies exigidas pelo release plan, rollback/saúde/assets/rotas/SHA/sincronização.
- P-01: truncar respostas, esconder análises em acordeões, fabricar dados/pendências/duração/classificação/decisão humana, gerar IA por navegação, ampliar permissões, expor PII em fixtures/evidência pública, misturar versões documentais e profissionais.
- F-01: Posições/matching/score, shell global/marca/nomenclatura, motor de taxonomia/banco/IA novo, dados reais publicados/curados, suíte integral local e testes pagos.
- A-01: reutilizar componentes, adapters, Ant Design, CSS/tokens e fluxos especializados existentes; engenharia decide composição interna e fixtures determinísticas sem alterar os requisitos.
- Q-01: nenhuma decisão material pendente. Autorização de publicação e título não ampliam escopo.

CA-01..07: cada D correspondente exige teste/inspeção e evidência no AoT. UI sintética mesma Marina/estado/viewport2048 da referência e telas intermediária/celular, texto longo, ausência/falha, member/operador, navegação/fontes/zero geração automática; regressões dirigidas dos contratos reutilizados; release operacional e CI. Não declarar smoke público como jornada autenticada real.

## Mapa de impacto inicial

| Capacidade/área | Relação | Baseline e regressão |
| --- | --- | --- |
| Entrada/rotas/abas/cabeçalho/rail | direct | df7b8403: Central antes de Perfil; testes UI entradas antiga/nova e estados/ações |
| Síntese/fontes/cards/conteúdo publicado | direct |2.0.12:8 respostas abertas/cálculos; testes dirigidos texto longo/fontes/fallback/datas/formação |
| Documentos/revisões/versões/ciclo de vida | plausible_indirect | handlers/adapters existentes; UI destinos/actions/documentos e testes person-flow |
| Tenant/papéis/contato/dirty/retorno lista | critical_transversal | fronteiras existentes; negativos member e contratos/rotas/navigation, smoke sintético |
| Registry/sidebar/build/release web | direct |2.0.12; teste numeração histórica, tipos/build/CI/assets/SHA/rollback |
| Parser/Synthesis/Paddle/SQL/matching/Posições | no_impact_identified | reorganização read-only web, sem backend/migrations/provider; diff/plan e containers preservados |

## Especificação funcional integral aprovada

# Página unificada da Pessoa: perfil e ações

Revisão visual 2, 06/10/2026. Proposta ampliada solicitada por Bruno, ainda não autorizada para implementação ou publicação. Não atribui versão de produto. A composição original da opção 3 foi escolhida pelo usuário; os refinamentos deste documento são proposta para sua avaliação. Nenhum código, contrato persistido ou dado real foi alterado.

## Referência e fidelidade

- Referência escolhida: imagem enviada pelo usuário `codex-clipboard-7374853e-7bda-4bd8-81f8-583eb2f7424e.png`; arquitetura visual normativa para esta proposta, dados ilustrativos.
- Nova imagem: `03-perfil-e-acoes-refinado-v2.png`, gerada com a ferramenta integrada image_gen. Prompt integral: `prompt-refinamento-v2.txt`.
- Marina Costa, organizações, datas, quantidades e análises são fictícios, preparados para demonstrar a interface; não são uma consulta real sobre uma Pessoa.
- A imagem representa uma captura da página inteira, com rolagem vertical natural. Não propõe reduzir o texto real para caber em uma única altura de monitor.
- Mostra somente a área da Pessoa. Navegação global, marca, empresa ativa, conta e permissões institucionais existentes permanecem. Não propõe busca global ou notificações novas.

## Composição implementável

Cabeçalho de identidade único, seguido de seis abas locais. Na aba Resumo, leitura profissional à esquerda e tarefas operacionais à direita, na proporção aproximada 70–73% / 27–30% em desktop largo. Espaçamento regular de 20–24px, superfícies claras, texto azul-marinho, azul de ação, bordas discretas e cantos próximos de 10px. Ícones ajudam a localizar grupos; não competem com o texto. Âmbar apenas para pendência real, vermelho para falha real ou destruição. Sem medidor de mérito, score, ranking, fotos ou logos profissionais inventados.

Ordem da coluna principal: título Resumo do perfil; quatro destaques em uma linha; síntese profissional integral; oito análises abertas em duas colunas; indicadores factuais de competências/evidências e acessos correspondentes. Ordem da lateral: ações pendentes; documentos e revisões; atividade recente; ações rápidas. Alinhamento superior das duas colunas. Não há segunda tela intermediária para abrir o Perfil.

O conteúdo determina a altura. Não usar ellipsis, caixas de texto com rolagem própria, limite visual de linhas ou Leia mais para a síntese e as oito respostas. Na imagem os textos de exemplo são menores que alguns Perfis reais; isso não autoriza encurtá-los. Listas dos destaques preservam os dados existentes e podem aumentar a altura, sem inventar agrupamentos ou remover registros para igualar cards.

## 1. Cabeçalho

- Voltar para Pessoas: retorna à lista conservando busca, filtros e posição disponíveis.
- Nome, iniciais neutras, título profissional publicado, localização autorizada, vínculo e estado operacional real. Dados ausentes não são inventados. Contato privado não é promovido ao cabeçalho.
- Versão e data de publicação do Perfil vigente, separadas do estado do documento novo.
- Criar revisão: ação principal para trabalhar sobre o Perfil publicado, reutilizando o fluxo existente e origem conhecida. Se não existe Perfil publicado, a ação principal passa a ser a próxima ação real, como Nova importação ou Continuar revisão.
- Nova importação: abre o fluxo existente contextualizado nesta Pessoa; arquivo/manual conforme capacidades atuais, sem prometer formatos não suportados.
- Versões: histórico de versões do Perfil, consulta e restauração segundo regras existentes.
- Mais ações: vínculo Candidato/Colaborador/Banco de talentos, mesclar, arquivar/reativar, acesso a Meus dados e exclusão definitiva, conforme permissões e proteções atuais. Ações destrutivas não ganham destaque primário.

## 2. Abas e inventário de preservação

| Aba | Conteúdo e ações preservados |
| --- | --- |
| Resumo | Quatro destaques, síntese completa, oito análises abertas, indicação de IA/base/data, resumo original sob demanda, indicadores factuais e painel operacional. |
| Competências | Naturezas, grupos/subgrupos, filtros, busca, termos declarados, classificação pendente, curadoria, associações, vínculo de uma ou mais evidências, explicação e verificação por Assessment distintas. |
| Evidências | Explorador e filtros, fatos/trechos, fontes, múltiplas associações, documento/página/região quando disponível, contexto e natureza da evidência. |
| Perfil completo | Texto aprovado e todos os registros: experiências, responsabilidades, períodos, formação acadêmica/complementar, curso, instituição, situação, nível, qualificação, credenciais, idiomas, contato autorizado e demais seções existentes. Não reescreve o snapshot. |
| Documentos e revisões | Todos os documentos e suas versões independentes, seleção e detalhe contextual, importação, tentativas, processamento, extração, rascunho/revisão, recuperação, resultado no Perfil e próximas ações. Arquivar revisão, corrigir vínculo e excluir documento continuam nos respectivos contextos. |
| Histórico | Atividade de produto e acesso aos detalhes operacionais/auditoria existentes; versões do Perfil, origem e restauração permanecem acessíveis por Versões. Não mistura Perfil v3 com Documento v2. |

As abas trocam o contexto de consulta na mesma Pessoa. Os oito conteúdos analíticos do Resumo continuam todos abertos; abas não são um motivo para ocultá-los. Seções extensas e tarefas especializadas já existentes permanecem em suas abas ou fluxos adequados, sem serem removidas. Revisão/edição podem abrir os fluxos existentes; o retorno preserva Pessoa e contexto. O menu de navegação da organização não muda.

## 3. Quatro destaques profissionais

1. **Áreas da experiência mais recente:** áreas efetivamente identificadas na experiência recente, tempo aproximado documentado por área e, quando existente, demais áreas gerais separadas. Reutilizar a taxonomia e o cálculo atuais, sem confundir título do cargo com área. Períodos sobrepostos contam uma vez. Falta de período não produz duração inventada; Atual só aparece quando declarado.
2. **Experiência mais recente:** cargo, empresa, período e duração; abaixo, em hierarquia secundária, outra experiência recente com cargo, empresa e período. Quando sobrepostas, não sugerir sequência falsa de carreira; usar Outra experiência recente. Rótulos atual/anterior dependem dos dados, não do exemplo.
3. **Maior formação concluída:** nível/qualificação apoiados no registro, cursos, instituições e períodos. MBA e Especialização podem coexistir no mesmo nível. Exibir conclusão apenas quando sustentada pela classificação válida; ano final sozinho não confirma. Informação inconclusiva recebe explicação neutra e ação para o registro quando houver uma revisão humana pertinente.
4. **Empresas da trajetória:** contagem de organizações distintas e respectivos nomes publicados, reutilizando normalização atual, sem inferir empresas ausentes ou fabricar logos.

Os destaques são fatos/cálculos do Perfil vigente. A narrativa é análise de IA. Essa distinção permanece clara, sem transformar cartões em avaliação profissional.

## 4. Síntese e fontes

Título, identificação discreta de Análise de IA, narrativa integral e controle Mostrar fontes no canto superior direito do bloco. Resumo original do currículo abre o conteúdo aprovado correspondente, preservando o retorno. Base/versão/data aparecem uma vez em texto secundário.

Mostrar fontes habilita referências associadas às afirmações, inclusive nas oito análises. Selecionar uma referência abre o painel existente com trecho, origem e acesso ao documento/região quando houver. Fechar retorna ao mesmo ponto. Ocultar fontes restaura a leitura limpa. A narrativa nunca fica escondida por esse controle. Fatos, interpretações e lacunas continuam diferenciados pelo contrato e por identificação acessível, sem empilhar selos e referências na leitura padrão.

## 5. Oito análises abertas

| Seção | Informação que a pessoa encontra |
| --- | --- |
| Trajetória profissional | Continuidade, transições, mudanças de atuação e ampliação de responsabilidades sustentadas pelos registros. |
| Contribuições profissionais | Atividades, processos, problemas e entregas; participação individual quando descrita. |
| Contextos, responsabilidade e autonomia | Contextos de atuação, execução/apoio/coordenação/decisão e limites do que está documentado. |
| Competências em contexto | Conhecimentos e ferramentas ligados a atividades e situações concretas, preservando natureza declarada/contextual/verificada. |
| Resultados e entregas | O que foi entregue, efeitos relatados, medidas existentes e limites de atribuição. |
| Formação e aplicação | Relação entre formação e atividades; aplicação prática somente quando sustentada. |
| Direção profissional | Objetivo declarado e conexão com a trajetória, sem recomendar contratação ou vaga. |
| Investigação complementar | Perguntas específicas para esclarecer lacunas relevantes, sem tratar ausência como demérito. |

Todas as respostas válidas aparecem integralmente. Informação desconhecida é declarada na própria seção. Uma falha localizada preserva os trechos válidos, explica o que não pôde ser apresentado em português claro e oferece a ação viável. Ausência de dado não gera obrigação de preenchimento desnecessária. Não prometer que o operador resolverá um problema interno editando um campo correto.

## 6. Painel operacional

**Ações pendentes:** mostrar apenas pendências reais, sem card amarelo permanente quando tudo está resolvido. Cada item informa objeto, problema e próximo passo. O exemplo tem duas ações distintas, uma delas abrangendo três declarações. Corrigir período abre a revisão do documento e o campo de formação correspondente, quando o diagnóstico conhece esse destino; quando conhece apenas a revisão, o rótulo honesto é Continuar revisão. Revisar competências abre a lista contextual, já filtrada para os itens pertinentes quando possível. Reutilizar os estados atuais, sem supor que vincular evidência resolve classificação taxonômica. Falha interna não se apresenta como erro humano. Preservação do Perfil vigente fica explícita quando uma nova importação falha/pende.

**Documentos e revisões:** prévia das fontes recentes, nome, versão documental, data, situação em português e ação real por estado. Ver todos abre a aba com a lista completa. Utilizado no Perfil só quando existe esse vínculo; não equiparar documento lido a Perfil publicado.

**Atividade recente:** até cinco eventos de produto, data e descrição curta; Ver histórico abre a lista correspondente. Auditoria técnica continua nos detalhes existentes.

**Ações rápidas:** Editar dados cadastrais e Processamento e revisões, ambos no contexto desta Pessoa e segundo o papel. Manter a visibilidade/destino atuais de contatos, ciclo de vida, fusão e exclusão nos fluxos apropriados.

O painel serve para agir sem procurar em outra central. Não se torna um segundo formulário nem uma lista de detalhes técnicos. Não ocupar a coluna com mensagens verdes repetitivas de Tudo certo.

## 7. Comportamento responsivo e estados

- Desktop largo: quatro destaques em uma linha e análises em duas colunas; lateral aproximadamente 27–30%. Uma rolagem de página. Cabeçalho compacto/abas podem acompanhar a rolagem sem duplicar identidade e botões.
- Largura intermediária: quatro destaques passam a 2x2 quando necessário à legibilidade. Não reduzir fonte para manter quatro colunas. Lateral passa para o fluxo vertical quando retirar largura útil da leitura.
- Celular: identidade compacta, ações com quebra controlada, abas acessíveis, cards e análises em uma coluna. Pendência acionável fica próxima ao cabeçalho; documentos/atividade/ações seguem após a leitura. Nenhuma resposta exige abrir acordeão.
- Sem Perfil publicado: identidade e documentos continuam; mostrar Ainda não existe Perfil publicado e a próxima ação disponível. Não inventar síntese nem deixar uma página vazia.
- Falha da análise ou de uma seção: dados publicados e demais respostas válidas continuam. Falha documental nova não invalida Perfil vigente.
- Carregamento independente de Perfil, síntese e contexto operacional; falha opcional não bloqueia toda a página. Estados vazios são neutros e específicos.
- Abas/ações respeitam o papel atual; member não recebe controles operacionais proibidos. Não consultar nem exibir contato privado sem autorização. A unificação visual não amplia acesso.
- Preservar confirmação de descarte quando houver edição não salva. Voltar de revisão/fontes/documento mantém contexto de consulta.

## 8. Velocidade e limites desta proposta

Reutilizar componentes, leitura canônica, análise armazenada, projeções e fluxos existentes. Não gerar análise a cada visita, não chamar IA para trocar abas, abrir fonte ou mostrar os quatro destaques. Carregar detalhes extensos sob demanda, com identidade/tenant/versão corretos. Não criar novo banco, novo motor de classificação ou nova consulta a IA neste refinamento visual.

O desenho registra o resultado pretendido; não prova comportamento implementado ou fidelidade de execução. Antes de desenvolvimento material, consolidar acordo/prompt, mapa de impacto, versão de produto e aceites, conforme AGENTS.md. A futura validação compara mesma Pessoa fictícia, estado e largura desta referência, além de dados extensos e tela estreita. Alterações materiais na composição escolhida exigem decisão de Bruno.

## Base conferida nesta proposta

Código: `web/src/pages/PersonWorkspacePage.tsx`, `web/src/pages/PersonProfilePage.tsx`, `web/src/components/profile/PersonProfessionalEvidenceMap.tsx`, `web/src/components/profile/ProfileSynthesisSurface.tsx`, `web/src/ui/PrismaAppShell.tsx` e `src/domain/profileSynthesis.ts`.

Documentos: `docs/product/person-center.md` e `docs/product/professional-profile-standard.md`. A hierarquia de entrada proposta substitui a necessidade de Central -> Ver perfil; a separação dos objetos e suas permissões permanece.


## Prompt visual integral aprovado

```text
Use case: ui-mockup.
Create ONE extremely polished, production-realistic HIGH FIDELITY desktop full-page screenshot of the Prisma PERSON workspace, in Brazilian Portuguese. Use attached reference as the NORMATIVE composition: broad professional reading column LEFT approximately 73%, narrower operational column RIGHT approximately 27%; shared identity header, one row of six local tabs; 4 highlight cards on ONE row above narrative; eight open analysis cards in two columns, four rows. Evolve this exact selected design with richer readable real-looking content, precise hierarchy and thoughtful spacing. This is a long full-page capture, NOT an impossible screen squeezed into one viewport. Target 2048px wide by about 2304px high. No annotations, perspective, browser chrome, device frame, watermark, decorative charts, scores, photos, fabricated global search or notification bar. Render ONLY the person-page content area, without a global sidebar or global brand/header redesign. White surfaces, very pale blue-gray canvas, cobalt #165DFA, deep navy text, 10px corners, subtle hairline borders, very light shadows, Inter-like crisp generous body typography. Refined, useful, calm, impactful, accessible contrast. No gradient backgrounds. All visible content must be legible at native size.

TOP AREA full width:
Small back link "← Pessoas".
Identity left: pale blue initials avatar MC, "Marina Costa" as largest heading; "Gerente de Operações"; location "São Paulo, SP", understated chips "Candidata" and "Ativa". Right aligned actions: secondary outlined "Nova importação", stronger blue "Criar revisão", outlined "Versões", text dropdown "Mais ações". Small quiet metadata below: "Perfil v3 · Publicado em 06/10/2026".
Below: six tabs exactly "Resumo" (active blue underline), "Competências", "Evidências", "Perfil completo", "Documentos e revisões", "Histórico". No separate "Ver perfil" button.
Start content grid with 24px gutters, top aligned columns.

LEFT region:
Heading "Resumo do perfil" with subtle helper "Uma leitura da trajetória, das contribuições e dos contextos de atuação."
Section "Destaques profissionais" with 4 equal cards horizontally, simple blue outline icons, small label, bold value, secondary supporting details. Do NOT stack cards into2x2:
1 "Áreas da experiência mais recente": bold "Gestão de operações", "Atuação documentada: aproximadamente 8 anos e 9 meses"; second smaller area "Logística", "Aproximadamente 3 anos". Footnote small "Períodos sobrepostos contados uma vez."
2 "Experiência mais recente": bold "Gerente de Operações", "NovaVia Serviços", "Jan/2022 – Atual · 4 anos e 9 meses". Thin separator, small "Experiência anterior", medium "Coordenadora de Operações", "Grupo Aurora · Jan/2018 – Dez/2021".
3 "Maior formação concluída": bold "MBA · Especialização". Two compact groups: "Gestão de Negócios" / "Instituto Horizonte · 2019–2020"; "Gestão de Projetos" / "Instituto Horizonte · 2017–2018". No unproven qualification or confidence percentage.
4 "Empresas da trajetória": bold "3 organizações"; "NovaVia Serviços", "Grupo Aurora", "Rede Horizonte". Subtle "Organizações distintas nas experiências publicadas".

Then large WHITE full-left-width narrative card, thin cobalt left accent, header "Síntese profissional", small quiet badge "Análise de IA" and outlined button "Mostrar fontes" aligned top RIGHT of this card. THREE open paragraphs:
"Marina construiu sua trajetória em operações de serviços e distribuição. Os registros mostram a passagem da supervisão para a coordenação e, depois, para a gestão de operações, com ampliação das responsabilidades sobre equipes, rotinas e acompanhamento de indicadores."
"Sua atuação conecta atendimento, organização da execução e melhoria de processos. As experiências publicadas descrevem participação na revisão de fluxos, no planejamento de escalas e na articulação entre a operação e as áreas de apoio."
"Essa leitura indica continuidade na área de operações. Os registros ainda não detalham o tamanho das equipes, a autonomia sobre orçamento ou as medidas dos resultados relatados."
Footer link with document icon "Ver resumo original do currículo"; quiet provenance one line "Base: Perfil publicado v3 · Análise de 06/10/2026". No citation pills or per-paragraph sources visible. No ellipses, expand buttons, read-more, hidden information.

Then "Análises profissionais" header and helper "Respostas completas, organizadas para consulta."
EXACTLY EIGHT open cards in 2columns4rows, roomy heights for these illustrative texts; each bold heading, discreet blue line icon, open paragraphs, never collapsible. Preserve all eight titles exactly:
ROW1 LEFT "Trajetória profissional": "A trajetória mantém continuidade em operações, com passagem por supervisão, coordenação e gestão. Na NovaVia, o registro atual descreve organização da operação e acompanhamento de indicadores." second paragraph "As mudanças sugerem ampliação de responsabilidades; o relato não permite quantificar o aumento de equipe ou orçamento."
ROW1 RIGHT "Contribuições profissionais": "As atividades incluem revisão de rotinas, planejamento de escalas e coordenação do atendimento. Também aparecem acompanhamento de indicadores e articulação com áreas de apoio." second paragraph "Os registros descrevem sua participação na execução, mas não separam todas as entregas individuais das realizadas pela equipe."
ROW2 LEFT "Contextos, responsabilidade e autonomia": "Há atuação em serviços e distribuição, com coordenação de equipes e organização de rotinas. Os cargos estão acompanhados de atividades de gestão operacional." second paragraph "O tamanho das equipes, o orçamento e os limites de decisão não foram detalhados."
ROW2 RIGHT "Competências em contexto": "Gestão de operações e melhoria de processos aparecem ligadas à revisão de fluxos e ao acompanhamento de indicadores. A coordenação de equipes está relacionada ao planejamento das rotinas de atendimento." second paragraph "Esses registros contextualizam o uso declarado; não equivalem a uma verificação prática."
ROW3 LEFT "Resultados e entregas": "Foram relatadas iniciativas de organização de escalas e revisão de fluxos de atendimento. Os registros apresentam as entregas realizadas, mas não informam medidas anteriores e posteriores." second paragraph "Ainda não é possível quantificar efeitos em prazo, produtividade ou qualidade."
ROW3 RIGHT "Formação e aplicação": "MBA em Gestão de Negócios e especialização em Gestão de Projetos constam como concluídos. Os temas se relacionam às atividades de planejamento e organização descritas." second paragraph "Não há relato suficiente para atribuir uma entrega específica à aplicação de um desses cursos."
ROW4 LEFT "Direção profissional": "O objetivo publicado é continuar em gestão de operações, com foco em serviços. A experiência recente apresenta continuidade nessa área." second paragraph "O Perfil não informa preferência por porte de empresa ou modelo de trabalho."
ROW4 RIGHT "Investigação complementar": "Qual fluxo de atendimento você redesenhou e qual foi sua participação?" then "Que indicadores acompanhava antes e depois da mudança?" then "Qual era o tamanho da equipe e quais decisões dependiam de aprovação?" Small quiet closing "Perguntas para aprofundar os registros, sem desqualificar a trajetória."

Below8cards a compact white strip "Competências e evidências" with 3 factual illustrative metrics "18 conceitos associados", "42 evidências vinculadas", "3 declarações a revisar", simple links "Consultar competências →" and "Explorar evidências →". No score.
Near bottom discreet "Dados ilustrativos para validação do layout".

RIGHT operational rail aligned to TOP of the LEFT heading:
One elegant amber-soft card "Ações pendentes" badge "2". Two vertically separated mini-items WITH precise human-readable issue + dedicated blue actionable button:
item1 heading "Período de formação incompleto"; description "No Currículo v2, falta informar quando a formação começou." blue button "Corrigir período". quiet sentence "O Perfil v3 continua vigente."
item2 heading "Competências sem classificação"; description "3 declarações ainda precisam ser associadas a uma competência." outlined button "Revisar competências".
Do not turn these into a full-page blocking alert or mark person in error. No IDs or technical status names.
Next white card "Documentos e revisões", header link "Ver todos →"; "2 documentos" subtle; list two generous rows:
"curriculo_marina_v2.pdf", "Documento v2 · 05/10/2026", amber "Em revisão", action "Continuar revisão →".
"curriculo_marina_v1.pdf", "Documento v1 · 01/10/2026", neutral/green "Utilizado no Perfil", action "Abrir documento →".
Next white card "Atividade recente", link "Ver histórico →", compact vertical timeline with dates and 3 events "06/10 · Perfil v3 publicado" / "Nova versão disponível para consulta."; "05/10 · Currículo v2 recebido" / "Documento disponível para revisão."; "01/10 · Primeiro currículo recebido".
Next white card "Ações rápidas", two simple full-width text-icon rows "Editar dados cadastrais →", "Processamento e revisões →". No destructive primary buttons.

Important fidelity: rich open narrative and8answers not very abbreviated snippets. Plenty of white space, compact understandable operational side. Larger titles than labels, body ~16px equivalent. The screenshot is ONE coherent screen, no second dashboard, no phone inset or unrelated references. Exact source-control wording "Mostrar fontes". Preserve fundamental input reference topology while refining hierarchy and text clarity.

```
