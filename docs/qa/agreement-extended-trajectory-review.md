# Acordo — revisão extensa opcional (1.0.0)

Estado: agreed por solicitação explícita de Bruno em 07/10/2026. Substitui a regra anterior de impossibilidade de revisão acima de cinco divergências, inclusive nos contratos históricos M8.6. O formato persistido `trajectory-human-review-1.0.0` e as escolhas permanecem; muda a elegibilidade por quantidade, não o significado das classificações. Entrega incremental v2.1.7.

- D-01: ao clicar em Revisar divergências, até cinco itens abrem automaticamente a revisão existente.
- D-02: acima de cinco, perguntar se o usuário quer revisar, informando a quantidade. Aceitar abre o mesmo modal com um item por página, navegação de ida/volta e escolhas preservadas. Nenhuma escolha automática.
- D-03: recusar/fechar preserva cálculo, evidências e ausência de nova decisão. Abrir, confirmar e paginar não gravam nem recalculam; salvar exige todos os itens classificados e mantém a transação íntegra existente.
- D-04: backend, motor e banco permitem revisão completa com mais de cinco, mantendo autenticação, papéis, tenant, fontes/versionamento, citações, negativos e concorrência. Incerteza mantém cálculo anterior; decisão contextual não altera outra Pessoa ou Knowledge.
- D-05: sinalizar carregamento/salvamento conforme diretriz v2.1.6; manter ajuda e acessibilidade/responsividade. Integrar/publicar conforme autorização permanente, com evidências e rollback.
- P-01: proibido truncar itens, aplicar decisões parciais, inventar escolhas/evidências, disparar IA/recálculo por abrir/paginar/recusar, afrouxar permissões ou reescrever históricos.
- F-01: fórmula/prompt/modelo, novas leituras automáticas, redesign global e curadoria real.
- A-01: reutilizar modal/Ant Design, pares existentes e RPCs; engenharia define paginação/posição das ações e migração compatível.
- Q: nenhum.

CA-01–05: testes 1/5/6/quantidade maior; aceitar/recusar, navegação e preservação; salvar completo e negativos de duplicação/ausência/ID/tenant/papel/stale/citação/concorrência; renders desktop/mobile; tipos/build/runtime gerado/SQL/Edge/smoke e destinos proporcionais. Sem afirmação de jornada autenticada real quando não testada.
