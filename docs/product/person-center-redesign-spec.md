# Especificação de referência do redesign da Central da Pessoa

- Versão editorial: 2.0.0, 2026-09-11.
- Estado: consolidação documental do prompt histórico, não autorização para nova implementação.
- Origem integral: `PROMPT_MESTRE_CENTRAL_DA_PESSOA_REDESIGN_UX_VISUAL.md` no Git `7cfd22bc963c2abc49d9242156c7f53c9c799778`.
- A aprovação desta reorganização não substitui decisões posteriores em `person-center.md` nem comprova rollout.

## CP-01: identidade e conhecimento vigente

Pessoa, Documento, Tentativa, Revisão e Perfil publicado são distintos. Importação, extração parcial e falha documental não invalidam a Pessoa nem substituem o Perfil. Somente publicação de nova versão altera o conhecimento vigente. Documento v2 não implica Perfil v2.

Aceite: durante processamento, revisão e descarte, preservar o Perfil anterior; após publicação, tornar vigente a nova versão. Identificar entidades e fontes sem misturá-las.

## CP-02: hierarquia e cabeçalho

Ordem: cabeçalho → pendências → Perfil vigente → resumo → conhecimento → documentos/versões → atividade. Responder quem é a Pessoa, o que exige ação, qual conhecimento vigora, de onde veio e o que mudou.

Cabeçalho usa nome, título/posicionamento existente, localização autorizada, atualização e quantidade de documentos. Sem título estruturado, usar nome/contexto/metadata, sem gerar posicionamento. Contato depende de contrato e papel; não ampliar exposição. Editar dados, acesso contextual a processamento e menu secundário ficam separados do CTA de pendência.

Perfil vigente tem bloco próprio, versão/data/fonte e explicação de preservação durante revisão. `Ver perfil atual` é secundário quando há pendência. Verde suave somente para publicação real.

Aceite: Perfil v1 + importação em revisão mostra pendência e CTA no topo e Perfil v1 separado. Mobile preserva a ordem sem duas colunas forçadas.

## CP-03: pendências e CTA direto

Área logo após o cabeçalho, contagem e rótulo de pendência, não "problemas". Cada item reúne tipo, título, explicação, origem/data, contexto/estado, entidade, prioridade visual, ação principal e secundárias. São dados derivados, sem exigir nova entidade persistida.

Reutilizar derivação como `deriveResumeProductState`, estendendo por composição central quando necessário. Produzir label, explanation, severity, CTA/destino, ações secundárias, IDs e disponibilidade. Não recalcular em vários componentes.

`Revisar documento agora` abre diretamente M5 com Pessoa, documento, tentativa revisável e revisão corretos. Não reencontrar contexto pela fila transversal. Secundárias: documento, detalhes técnicos e descarte conforme contrato. Ordenar múltiplos itens por bloqueio, ação humana e informação, não apenas data; cards independentes, lado a lado quando couber e empilhados no mobile.

Inventariar suporte real para nova importação/revisão, identificação pendente, recuperação técnica, comparação/publicação, divergência de evidências e verificação concluída. Só expor estados e ações implementados; os últimos dois não podem virar features novas para imitar imagens.

Aceite: provar IDs/destino, disponibilidade e autoridade; listar suporte encontrado e prova por tipo exposto, sem declarar entregue um recurso não suportado.

## CP-04: resumo e conhecimento profissional

Cards-resumo fornecem contexto real: Perfil/versão/data, documentos publicados/pendentes, revisões e evidências/competências disponíveis. Evitar números isolados, métricas fictícias e repetição de versão em vários banners/títulos.

Organizar experiências, formação, competências, certificações, idiomas e demais fatos existentes. Não forçar seções vazias na visão geral; ao acessar seção vazia, usar CP-09.

Experiência: cargo, empresa/período, trecho resumido, origem/evidências disponíveis e expansão ou `Ver mais`. Não mostrar parágrafos longos integrais por padrão. Formação: curso, instituição, período e estado real em lista editorial/timeline, sem inferir conclusão. Logos somente de fonte confiável já existente; não pesquisar nem inventar logos. Sem foto, usar monograma/avatar padrão.

Distinguir evidências documentais, contextuais, confirmadas e demonstradas conforme runtime. Labels como "Documental forte" são exemplos sujeitos ao contrato metodológico, não novos selos absolutos. "Verificada" exige Evidência Demonstrada correspondente. Origem acessível por documento, campo, região e proveniência, sem dominar a visão geral.

Aceite: dados correspondem ao adapter autorizado, textos longos expandem, ausência não se transforma em fato negativo e não há hardcode ilustrativo.

## CP-05: documentos e versões

Lista selecionável com documento, versão, origem, importação, situação, Perfil relacionado e ação. Estados: publicado, revisão, descartado, arquivado e outros estados canônicos existentes. Documento pendente oferece revisão; seleção pode abrir painel contextual.

Painel: identificação, métricas reais da extração (recuperados/pendentes, alterações e revisão), próxima ação, PDF, detalhes técnicos e descarte permitido. Sem confiança percentual sem método aprovado. Relacionar versões do Perfil às fontes sem confundi-las. Histórico pode usar rota existente.

Aceite: lista/detalhe correspondem a estados/fontes reais; IDs/capabilities corretos e versões documental/profissional independentes.

## CP-06: navegação e atividade

Perspectivas possíveis: Visão geral, Perfil, Documentos, Evidências e Histórico. Tabs, âncoras/seções, drawer ou rota filha são opções delegadas conforme arquitetura e conteúdo real. Não criar navegação vazia, App Shell, topbar ou menu global por causa das imagens.

Visão geral resume ações, Perfil, conhecimento, documentos e atividade; perspectivas detalham. Processamento e revisões mantém fila transversal da organização; Central contextualiza uma Pessoa. Nome na fila abre Central; CTA abre ação específica; revisão segue ao Delta e publicação retorna à Central, sem loops.

Atividade: 3–5 eventos recentes de produto e acesso ao histórico completo, preservando ordenação. Detalhes técnicos/auditoria continuam acessíveis fora do destaque principal.

Aceite: destinos corretos sem etapas redundantes, menus globais indevidos ou duplicação do propósito da fila.

## CP-07: estados e atualização

| Estado/ação | Resultado obrigatório |
| --- | --- |
| Sem pendência | Sem grande bloco vazio; mensagem discreta opcional; foco no Perfil. |
| Uma pendência | Imagem A; ação destacada e Perfil ao lado/abaixo conforme viewport. |
| Várias pendências | Imagem D; itens ordenados independentes; mobile vertical. |
| Sem Perfil | Mensagem explícita e foco em processamento/pendências; sem card verde fictício. |
| Perfil + processamento | Perfil estável e status/aguardar; sem revisão inventada. |
| Requer revisão | CTA direto ao M5 correto. |
| Pronto para publicar | Comparação com Perfil atual ou ação canônica vigente. |
| Abrir revisão | Não mudar estado só por abrir; "Em revisão" apenas se suportado. |
| Publicar | Atualizar Perfil/versão, pendências, documentos e atividade; remover pendência resolvida. |
| Descartar | Remover pendência, preservar documento/histórico e Perfil conforme operação existente. |

Refetch/revalidate é suficiente; Realtime não é requisito. Descarte é secundário, com confirmação adequada à operação, preservando o comportamento não destrutivo existente.

Aceite: transições não deixam contagem, estado ou CTA obsoleto nem alteram dados aprovados por omissão.

## CP-08: linguagem, imagens e design system

Reutilizar Ant Design e tokens de tipografia, espaçamento, botões, tags, cards e ícones; catálogo central de status. Azul: ação; verde: publicado; âmbar: atenção; vermelho: falha real/destruição; cinza: histórico/neutro, sempre com texto além da cor.

Nome forte, título secundário, seções claras, corpo legível, metadata menor com contraste e line-height adequado. Dar respiro sem altura excessiva; cards como unidades semânticas, sem grade apertada e caixas repetidas. Pendência tem fundo suave, ícone, título, descrição, metadata e CTA; evitar banner genérico com ações concorrentes. Não substituir hierarquia por gradientes, glassmorphism ou animações pesadas.

Usar Perfil vigente/atual, Nova importação, Requer revisão, Revisar documento, Publicado, Atividade recente, Documentos e versões. Substituir "Recuperar informações" quando a ação real for revisão, sem renomear indevidamente recuperação técnica. Não generalizar falha parcial como "Pessoa falhou", "dados ruins" ou "currículo inválido".

Referências: A visão geral/uma pendência; B documentos; C conhecimento; D várias pendências. Comparar hierarquia, densidade, proporções, agrupamento, cores e ações, sem pixel-perfect. Produto/segurança e decisões aprovadas prevalecem, depois compatibilidade real/design system, imagens e preferência estética. Imagens não autorizam dados, estados, menus ou componentes incompatíveis.

Aceite: provar a comparação às quatro referências. "Premium", "sofisticação" e "confiança" são intenção visual, não evidência. Sem anexos identificados, equivalência visual permanece não comprovada; não substituí-los por imagens do artigo sobre skills.

## CP-09: responsividade, acessibilidade e feedback

Mobile 390 px: ordem CP-02, CTA visível/acessível sem menu de três pontos, documentos como cards/linhas ou scroll interno controlado, sem overflow global. Validar 1920×1080, 1600×900, 1440×900, 1366×768 e 390×844, sem CTA inacessível, card comprimido, texto ilegível/cortado, sobreposição ou erro de console.

Foco visível, teclado, headings semânticos, nomes acessíveis, links descritivos e affordance de ações; destruição identificável e status além da cor. Skeleton consistente, sem saltos excessivos. Erro informa o que falhou, o que continua disponível quando verdadeiro e como tentar novamente.

Empty states específicos: nenhuma experiência publicada; nenhuma formação publicada; nenhuma competência explícita identificada nos documentos aprovados; nenhum documento associado. Não usar "Sem dados" genérico. Não esconder ação não autorizada por CSS: omitir ou desabilitar com explicação pertinente, mantendo backend autoritativo.

Aceite: cinco viewports, teclado, loading/erro/vazios e negação efetiva a usuário sem autoridade.

## CP-10: dados, composição e performance

Reutilizar dados/queries existentes. Composição tipada reúne identidade, posicionamento, Perfil, pendências, resumo, conhecimento, competências, documentos e atividade sem duplicar domínio. Componentes recebem view models, não consultam banco. Nomes como PersonHeader, PersonActionCenter, CurrentProfileCard e PersonDocumentsPanel são sugestões, não obrigação de novas abstrações.

Evitar N+1, query por card e carga integral de histórico/documentos. Usar resumo, paginação, lazy details e coordenação de consultas. Resolver central de pendências, sem persistência redundante se deriváveis. Nova query/RPC/migration apenas por lacuna real; uma nova decisão material exige Product Owner antes. Não mover autorização ao frontend.

Aceite: registrar conjunto de QA (experiências, dezenas de competências, documentos/histórico), consultas e carga inicial; provar que consultas não crescem por card e que histórico/documentos integrais não são carregados. Medir tempos/baseline sem inventar SLA ou comprovar volumes não testados. Novos tipos de pendência devem reutilizar a composição sem redesenho estrutural.

## CP-11: proibições

Não inventar métricas, números, empresas, títulos, datas, fotos, logos, estados ou competências; sem hardcode das imagens. Nenhum novo score, LLM, matching, senioridade, Knowledge ou rebranding. Não alterar regras de M5/publicação, RLS, papéis ou histórico. Evidências privadas/documentais e contatos obedecem contratos, organização ativa e Pessoa autorizada.

M5.1 e divergências só aparecem com dados/estados reais; não adicionar placeholder/feature para imitar imagem. Não criar App Shell, topbar, sidebar incompatível ou componentes contrários aos tokens.

Aceite: diff e provas negativas preservam limites; exemplos técnicos não autorizam migração/integração material nova.

## CP-12: entrega e evidência

Entregar visual, CTA, documentos, mobile e testes juntos. Cobrir Perfil sem pendência, revisão, processamento, pronto para publicação, descartado, Pessoa sem Perfil, várias pendências e Member sem autoridade. Provar IDs do CTA, preservação ao abrir/descartar/publicar e distinção de versões na lista documental.

Smoke autenticado com caso sintético/QA autorizado (Perfil aprovado + novo currículo parcial/revisão), pendência dominante, Perfil separado, CTA, documentos, histórico e mobile. Comparar quatro imagens e registrar viewports, ambiente, suporte condicional, backend necessário e limitações.

Atualizar owners afetados; ADR somente por decisão durável aprovada. Atualizar Current State após prova, gerar/verificar Context Pack. Testes focados e typecheck/build afetados são obrigatórios; gate integral exige justificativa e autorização específica. Frontend local e backend necessário no QA; produção fora de escopo.

Aceite: AoT rastreia CP-01 a CP-12 e proibições; requisito obrigatório sem prova impede conclusão. Esta reorganização documental não comprova a implementação do redesign.

## Mapeamento das seções históricas

| Requisito | Seções do prompt original |
| --- | --- |
| CP-01 | 1, 2, 17, 18, 77, 93 |
| CP-02 | 0, 7–10, 37, 112, 124, 125 |
| CP-03 | 11–16, 39, 61, 62, 76, 89, 113 |
| CP-04 | 6, 19–27, 82–84, 96–98 |
| CP-05 | 28–32, 78 |
| CP-06 | 33–36, 55–57, 91, 92 |
| CP-07 | 44–51, 54, 63–66 |
| CP-08 | 4, 5, 38–43, 52, 53, 81, 85, 90, 110, 114 |
| CP-09 | 67–74, 79 |
| CP-10 | 58–62, 86–89, 107–109, 115 |
| CP-11 | 5, 10, 23, 26, 31, 36, 82–84, 93–98, 116 |
| CP-12 e prompt | 3, 75–81, 99–106, 111–114, 117–123 |

Exemplos foram consolidados em regras sem virar dados reais; etapas recomendadas permanecem autonomia de engenharia. Requisitos e aceitação aplicáveis não foram removidos.
