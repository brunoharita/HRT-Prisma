# Contrato de Acordos — V2M8 Padronização visual

Versão 1.0.0. Fonte: acordo completo aprovado por Bruno e transmitido à execução em 16/10/2026. Autoriza implementação, integração em main e produção 2.8.0. Classe C, apresentação transversal; reutiliza UX Foundation e ADR-050. Sem pendência material. Este documento congela o acordo abaixo, sem nova decisão.

## DEVE

- D-01: Normalizar a apresentação das páginas do Prisma reutilizando docs/product/ux-foundation.md, ADR-050, web/src/ui/theme.ts, foundation.css e componentes existentes. A identidade já estabelecida, fundos claros, estrutura das páginas e contratos permanecem. O objetivo é coesão entre papéis equivalentes, sem redesenhar jornadas.
- D-02: Adotar escala consistente: leitura/valores 16px; rótulos/metadados 14px; seções 20–24px conforme nível; preservar títulos de página e destaques legitimamente maiores. Formalizar densidades de leitura e operação compacta. A tabela Pessoas mantém o padrão compacto aprovado 14/20 e complementos 12/18; não aumentar tudo indiscriminadamente. Kanban deve manter densidade útil e ações legíveis com variante compacta explícita. Não achatar níveis distintos em um único título ou tamanho.
- D-03: Padronizar cores de links textuais, identificações e complementos, títulos de seção, filtros, ações de linha e cabeçalhos de modal/drawer. Texto informativo usa cor padrão; links textuais usam azul e foco/hover consistentes. Botões neutros, cartões clicáveis e selos informativos preservam sua semântica própria; não tornar tudo azul nem inventar interações. Bruno aprovou a distinção atual de Conhecimento: nome de área é informativo com Editar separado; conceito global é link azul que abre detalhes.
- D-04: Aplicar alinhamento superior a registros tabulares com várias linhas, espaçamentos/tokens coerentes, leitura responsiva e rolagem local quando necessária. Preservar controles, seleção, ordenação, filtros, navegação, teclado, foco visível, ações, conteúdo e permissões.
- D-05: Cobrir as áreas identificadas na auditoria: Processos seletivos (filtros13, seção16 e conteúdo14 locais); Acompanhamento (nome15, cargo/cidade/ações12 e avisos11); manual/revisão do Perfil (rótulos de referência/revisão ~10,6px, abas/orientações locais); competências/evidências da Pessoa (tabelas13, metadados11–12 e links próprios); lista de Posições (células centralizadas verticalmente, títulos próprios); processamento/revisões de documentos (datas/próximas ações12–13 e pesos locais); Tokens Prisma (links12, métricas/avisos13, espaçamento local); Banco de questões e painéis (enunciado15, contexto13, título drawer15 no celular). Verificar as regras efetivas de cascata e runtime antes de editar: foundation.css substitui várias regras antigas de styles.css. Examinar proporcionalmente demais páginas e componentes compartilhados para preservar sua apresentação ao normalizar as dependências comuns.
- D-06: Consolidar padrões em componentes/classes/tokens compartilhados, substituir exceções locais injustificadas nas áreas afetadas e estender validação visual entre páginas, abas e portais. Não criar outra biblioteca nem dependência sem necessidade material.
- D-07: Entregar main e produção 2.8.0 com regressão proporcional, documentação, Context Pack e AoT rastreando comportamento novo e preservação. Corrigir regressões causadas pelo movimento antes da publicação.

## PROIBIDO

- P-01: Não retirar ou ocultar informações, evidências, proveniência, histórico, fontes, avisos essenciais ou capacidades para melhorar a aparência.
- P-02: Não alterar regras de negócio, contratos de domínio/IA, extração, matching/score, taxonomias, dados, isolamento entre empresas ou autoridade humana.
- P-03: Não mudar ordem/topologia de informação, composição aprovada, navegação, filtros persistidos, confirmação/publicação humana, rascunhos ou semântica de estados como efeito colateral de CSS.
- P-04: Não declarar garantia absoluta ou PASS com base apenas no diff, em screenshot vazio ou em smoke público. Limitações de evidência devem ser explícitas; achado estático é hipótese até validado na renderização pertinente.

## FORA DE ESCOPO

- F-01: Novas funcionalidades, remodelação de jornadas, novas bibliotecas, alterações de schema/backend/IA, reprocessamentos e dados fictícios na produção.

## AUTONOMIA

- A-01: Engenharia escolhe reaproveitamento, classes, variantes compactas, divisão interna do trabalho, fixtures e verificações mínimas suficientes, sem reinterpretar D/P. Não precisa aguardar outra aprovação para decisões mecânicas no escopo.

## PENDÊNCIAS

Nenhuma.

## CRITÉRIOS DE ACEITE

- CA-01: Papéis equivalentes usam escala/cor/peso/alinhamento consistentes; diferenças legítimas e densidades ficam documentadas.
- CA-02: Evidência renderizada antes/depois em mesmos dados/estado/viewport nas áreas alteradas; desktop e celular, preenchido/vazio/erro quando aplicável, abas e modal/drawer relevantes; foco e ausência de corte/sobreposição/overflow indevido.
- CA-03: Jornadas e capacidades protegidas do mapa de impacto continuam operáveis com testes focados de interação, não só screenshots; distinguir falha de fixture/selector de defeito do produto.
- CA-04: Typecheck/build e testes afetados passam; CI obrigatório para o SHA integrado; publicação por superfícies derivadas do diff; prova de versão/SHA/rotas/assets/saúde e rollback disponível; main/local/origin/VPS sincronizados.
- CA-05: Nenhum D obrigatório fica sem PASS; limitações de baseline são explícitas. Não concluir com regressão conhecida ou quebra de hierarquia visual.

## GOV-01: mapa inicial e validação mínima

Baseline local e origin/main confirmados em 16/10/2026: a33c3d4d7b779351855fbf173701925afe9e1033, versão 2.7.8. Sem alterações tracked. Rascunhos untracked preservados no checkout canônico; implementação isolada em codex/v2m8-visual. Runtime produtivo será verificado no rollout, não presumido pelo histórico.

| Área/capacidade | Relação | Mecanismo / baseline / prova prevista |
| --- | --- | --- |
| Manual/revisão/comparação | direct | Componentes reais com transporte sintético; antes/depois 1448/390, abas, editar/salvar/retomar, publicação humana e validação negativa |
| Processos/Acompanhamento | direct | Cascata CSS local; busca/filtros, seleção, lista/Kanban, consulta, drawer e ações preservadas; dados/vazio/erro e teclado |
| Pessoa, competências/evidências | direct | Escala e links; abas, origens e portais; sem mudar destaques ou composição 72/28 |
| Posições/documentos | direct | Topo tabular e papéis de leitura; navegação, recuperação, histórico e rolagem local |
| Tokens/Banco de questões | direct | Escala de leitura e portais; saldos/destaques preservados, filtros e consulta; ausência não vira fato |
| Conhecimento/Home/Settings/Pessoas | plausible_indirect | Seletores opt-in e tokens; regressão de Conhecimento, Pessoas compactas, shell, títulos/destaques e foco |
| Auth/tenant/humano, rascunhos, navegação | critical_transversal | Sem serviços ou domínio alterados; testes de interação/gates existentes, zero chamadas externas nas fixtures e sem mutação real |
| Backend/schema/IA/matching | no_impact_identified | Mudanças limitadas a apresentação; inspeção do diff e release:plan devem confirmar web/docs apenas |
| Hospedagem web | direct | SHA/versão/rotas/assets/health/rollback; preservar outros containers |

Validação mínima: teste novo de papéis computados e capturas pareadas, reutilização de testes de interação diretamente afetados (manual, Processos/Acompanhamento, Pessoas, Conhecimento, Tokens/Banco), typecheck web, build root/web, teste de versão, lint/contexto e CI obrigatório. Não executar suíte integral local. Encerramento: todos D/P aplicáveis comprovados, documentação/contexto, SHA validado integrado/publicado, smoke e sincronização; limitações de evidência sintética explícitas. Referência normativa é a escala aprovada, sem nova imagem alvo; capturas anteriores comprovam preservação estrutural.
