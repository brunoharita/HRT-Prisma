# Acordo — contenção de Propostas

Versão 1.0.0, congelada pela autorização explícita de Bruno em16/10/2026: corrigir os estouros, validar desktop/celular e publicar em produção. Baseline c4ef51011fe0e82b17f3cbb2896828d0fb61251b, Prisma2.8.0. Correção de apresentação classe B; versão do produto preservada pela política de correções.

- D-01: ações de propostas pendentes devem permanecer inteiras e acessíveis dentro do cartão, quebrando linhas conforme o espaço.
- D-02: candidatos, fontes e campos longos devem respeitar a largura disponível, preservando conteúdo e ordem.
- D-03: manter seleção, motivo, estados desabilitados, origem, autoridade humana e regras/handlers de curadoria.
- D-04: validar componentes reais em desktop e celular, publicar somente as superfícies derivadas do diff e conferir produção/sincronização.
- P-01: proibido esconder/cortar conteúdo ou remover ações para resolver o estouro.
- P-02: proibido decidir propostas, pesquisar com IA ou alterar dados reais durante a validação.
- F-01: outros fluxos/abas, domínio, backend, banco, contratos persistidos, novas bibliotecas e redesenho da tela.
- A-01: engenharia escolhe regras locais de flex/reflow, dimensões de teste e fixtures sintéticas, reutilizando AntD/PrismaCard.
- CA-01 (D-01/02, P-01): medidas de geometria e capturas pareadas sem estouro de página/cartão/candidato; quatro ações globais legíveis, inclusive Rejeitar; testar também ação legada longa.
- CA-02 (D-03, P-02): motivo e subgrupo retidos após reflow; guardas de aprovação mantidas; contador de escritas zero.
- CA-03 (D-04): tipos/build/checks afetados, CI, SHA publicado, smoke visual autenticado somente leitura e rollback disponível.

Q: nenhum. Referência visual é a composição existente observada em produção, preservada; apenas reflow/contenção autorizados.
