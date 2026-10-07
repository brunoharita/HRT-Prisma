# Acordo: ajuda na revisão de divergências, v2.1.3

Versão 1.0.0, aprovada pelo pedido explícito de Bruno em 07/10/2026 para implementar a proposta nesta tela, integrar em main e publicar v2.1.3. Baseline `98830fd42f5671ccc2a91140b839976a9fb284e8`, runtime v2.1.2 `58f8bd7`. Reutiliza integralmente os acordos de revisão humana, modal e checagem legada existentes; altera somente apresentação explicativa. Classe B, preservação proporcional das fronteiras sensíveis adjacentes.

- D-01: cada uma das três opções recebe explicação curta sempre visível e ícone de informação separado do rádio, com significado/impacto disponíveis por clique, mouse e teclado, inclusive celular. O conteúdo corresponde à categoria efetivamente recebida; nenhuma opção nasce selecionada.
- D-02: explicar função relacionada, contexto e indeterminação, além das demais categorias válidas quando retornadas. Impacto depende das evidências, da origem do trecho e da Posição; declaração não vira experiência. Não prometer pontuação fixa por escolha. Se qualquer item for `cannot_determine`, registrar sem conclusão e preservar o cálculo anterior.
- D-03: aviso visível informa aplicação ao salvar, alcance exclusivo deste Perfil/versão da Posição e ausência de regra nova na Knowledge. Preservar até cinco conflitos, gate de todas as escolhas, pares/citações/pergunta, carregamento, erro, legado, autorização e APIs existentes.
- D-04: publicar v2.1.3 em main/produção, com CI, smoke, rollback e sincronização seletivos.
- P-01: não selecionar/salvar/reprocessar ao abrir ajuda; não criar categorias, campo aberto, pontos, decisão humana ou equivalências; não alterar matching, score, IA, banco, papéis, Knowledge ou dados profissionais.
- F-01: mudanças no backend, algoritmos, taxonomia, outras telas, bibliotecas e teste com mutação/IA sobre Pessoa real.
- A-01: engenharia usa Ant Design existente, organização das linhas, estilos locais e testes sintéticos. Ícone de ajuda é controle próprio; Escape fecha ajuda sem fechar a revisão.
- CA-01: componente real renderizado em desktop e celular com três opções, descrições legíveis, sem overflow, ajuda por hover/focus/clique/Enter/Escape, sem escolha/salvamento incidental; evidência renderizada identificada.
- CA-02: salvar exige todos os itens; payload preserva as escolhas; indeterminação mantém fluxo anterior; operador sem permissão, legado, excesso e erro preservados. Testes dirigidos de matching/revisão permanecem aprovados.
- CA-03: tipos/build, validações proporcionais, Context Pack, CI, publicação/HTTP/assets e preservação dos serviços, com limites explícitos.

## Referência visual e impacto antes da implementação

A captura fornecida é baseline normativo da tela a preservar, não um novo desenho: modal com Pessoa/título, corpo rolável, pergunta, trecho, duas leituras lado a lado, classificação abaixo e rodapé persistente com contador/Fechar/Salvar. A proposta aprovada acrescenta ajuda na região de classificação; três linhas legíveis acomodam o texto. Celular empilha pares e opções. Textos/Pessoa ilustrativos, dados reais permanecem do serviço. Comparação renderizada usa o mesmo componente, cenário sintético, dados e viewports antes/depois; não alegar identidade com dados privados da captura.

| Área | Relação | Baseline/capacidade protegida | Prova proporcional |
| --- | --- | --- | --- |
| Modal e ajuda | direct | Três opções dinâmicas sem seleção, pares/citações, corpo/rodapé | Browser real desktop/celular, teclado/toque, screenshots antes/depois |
| CSS compartilhado | plausible_indirect | Regras limitadas ao modal; demais componentes e leitura dos pares | Escopo do diff, browser e build |
| Fluxo de revisão e matching | plausible_indirect | Mesmas APIs/handlers e cálculo, gate integral e cannot_determine | Browser com adaptador sintético + testes semânticos/score |
| Permissão e dados profissionais | critical_transversal | canReview impede modal; nenhuma chamada nova | Browser negativo, isolamento do adaptador, diff sem backend |
| Registry/web/release | direct | v2.1.2; infraestrutura registrada antes do deploy | Tipos/build/CI, HTTP/assets/SHA/rollback |
| Banco, Edge, Parser/Synthesis, Knowledge/IA | no_impact_identified | Nenhum arquivo funcional nesses destinos; ajuda é conteúdo local | Plano seletivo e IDs/imagens/reinícios preservados |

Sem Q material; proposta explicitamente autorizada. Não reabre decisões de matching.
