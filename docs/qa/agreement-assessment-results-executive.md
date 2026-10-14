# Acordo e execução — Resultado executivo da avaliação 2.5.4

Contrato 1.0.0. Bruno aprovou a opção 1, seus agrupamentos configuráveis e o refinamento claro, e autorizou implementar, integrar em main e publicar nesta conversa em 13/10/2026. Baseline main/origin 5d6f8066a75f7c710a150f92116771e07a56a987. Risco C: apresentação integrada, sem mudança de persistência, autorização ou método IA.

Referência normativa: `docs/product/assessment-results-executive-reference.html`, cópia integral do último protótipo aprovado. Seus dados são ilustrativos. Topologia: cabeçalho com pessoa/contexto/estado; três indicadores, acertos com maior destaque; abas Visão geral/Questões/Registros; faixa clara com Mostrar/Agrupar por/Filtros; escopo visível; duas colunas de agrupamentos e padrões; origem IA recolhida e limites. Fundo branco, azul discreto, bordas suaves, espaçamento regular, ações junto à informação. Desktop modal amplo; celular uma coluna, controles reorganizados e fechamento disponível. Não substituir por relatório longo, wizard ou dashboard distinto.

- D-01 / D-UX-01: aplicar essa composição no resultado individual atual e histórico, preservando identificação e versão. Indicadores sempre representam a avaliação inteira: acertos persistidos, tempo decorrido válido início/envio, questões com registros aceitos; ausência permanece indisponível, nunca zero inventado. Estados não concluídos não exibem correção como resultado concluído.
- D-02 / D-UX-02: leitura padrão acertos por assunto; Mostrar permite acertos, ocorrências de perda de foco, tempo sem foco registrado, alterações de resposta; Agrupar por assunto/dificuldade; Filtros por assunto/dificuldade/resposta correta ou incorreta, com limpar e quantidade explícita. Agrupar não muda escopo; filtros mudam os dois painéis e a lista. Não confundir tempo sem foco com tempo de resposta; este aparece indisponível. Dificuldade é classificação da versão aplicada, não calibração empírica. Sempre mostrar denominador.
- D-03 / D-UX-03: navegar de grupo/padrão para questões/registros associados mantendo recorte; retornar preserva escolhas. Manter enunciado, cinco alternativas, resposta/gabarito, explicação, origem/método/versão e todos sinais/detalhes técnicos. Eventos sem correspondência permanecem consultáveis. Nenhum recorte mistura empresas, tentativas ou versões.
- D-04: preservar IA explícita, cotação/confirmação, saldo, cache, retry/conciliacão/erros, análises antigas e evidência do snapshot imutável. Consulta/filtros/abas não geram IA nem cotação automaticamente. Síntese salva tem escopo original identificado e não é reescrita por filtros; link abre os registros daquele snapshot e permite retornar aos dados atuais.
- D-05 / D-UX-04: uso por teclado, feedback de carregamento, limites visíveis, ausência/zero/não aplicável separados, responsividade em 1448/768/390/320. Modal com fechamento nativo, títulos/contexto, rolagem vertical; sem rolagem horizontal no resumo/mobile.
- D-06: publicação seletiva 2.5.4 em main/produção, tipos/build/testes dirigidos, Context Pack/AoT, fidelidade com mesmos dados/viewport, rollback/smoke/sincronização. Não usar candidatos reais como fixture nem executar IA paga de teste.
- P-01: inventar tempo de resposta, calibração, risco/fraude/aptidão, ranking ou decisão automática; alterar resultado, Score, Perfil, matching, etapa, banco de questões ou histórico.
- P-02: coletar dados novos, mudar contratos/tarifas/IA/backend/RLS, cobrar automaticamente, ocultar sinais ou reatribuir eventos de versões/empresas divergentes.
- F-01: novo coletor de tempo, matriz assunto×dificuldade avançada, comparação entre candidatos, exportação, novo provider/componente externo, redesign da preparação/portal.
- A-01 / A-UX-01: reutilizar Ant Design, ícones e tokens existentes; arquivos, funções puras, joins pelos IDs oficiais, densidade e decoração menor, layout responsivo e estratégia proporcional de regressão delegados à engenharia. Sem biblioteca nova. Produto 2.5.4; contratos persistidos/métodos IA permanecem intactos.
- Q: nenhum material pendente.
- CA-01 (D01/02): fixtures com grupos desiguais/sem resposta/dados ausentes, difícil e recorte, mudança de métrica sem mutação; indicadores gerais estáveis e denominadores exatos.
- CA-02 (D03/04/P02): browser com respostas/registros/conteúdo/legado/stale/snapshot diferente/cache/confirmar/cancelar/saldo/resultado incerto; filtros não invocam IA/cotação; evidência por versão e tentativa preservada.
- CA-03 (D05/UX): capturas mesmas pessoas/dados/viewport da referência, teclado, sem overflow/erros e estado incompleto; demais sinais legíveis no detalhe, origem IA e limites acessíveis.
- CA-04 (D06/P01/F01): diff dirigido sem backend/novos coletores, CI aplicável, smoke público SHA/versão/assets/rollback/container adjacente, AoT distingue fixture de jornada autenticada real.

## Mapa de impacto prévio

| Capacidade | Relação | Baseline e validação mínima |
| --- | --- | --- |
| Resultado individual/histórico/modal/abas | direct | código baseline, fixtures de resultados; grupos/filtros/join/respostas/navegação e capturas novas |
| Registros/síntese/cache/limites | direct | fatos método1.1.0/envelope1.0.0, 68 checks v252; regressão dirigida com snapshots/legado/negativos |
| Preparação/processo/posição | plausible_indirect | consumidor compartilhado AssessmentAttemptResults; regressão configuração/revisão/convites e histórico sem efeitos de consulta |
| Custos/tenant/dados | critical_transversal | serviço validado atual e pipeline de cotação; mocks de chamadas/escopo sem mudanças de autoridade ou mutação real |
| Portal/coleta/correção | no_impact_identified | somente consumidor de leitura; fonte/método não alterados, smoke do portal/revisão/envio já existente |
| Score/Perfil/matching/banco/Parser/mail/Síntese worker | no_impact_identified | não são consumidores do resumo; diff/plano sem mudanças nessas regras/destinos, preservar containers na publicação |
| Web/release/assets | critical_transversal | runtime2.5.3/f780dcd, VPS existente/opt/prisma; plano web-only, rollback/rotas/SHA/contexto/sync |

Execução congelada: implementar todos D/P/F/A/CA acima, sem reabrir decisões já aprovadas. Reuso Ant Design e capacidades Prisma atende à necessidade; não há alternativa externa material nova. Fechar AoT segundo o template; fidelidade visual estrutural não exige pixel idêntico, adapta dados reais e componentes acessíveis sem mudar hierarquia/ordem/ações.
