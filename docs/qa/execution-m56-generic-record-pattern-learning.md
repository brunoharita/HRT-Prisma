# Prompt de Execução — M5.6 Aprendizado genérico de padrões de registros

Implementar o contrato `agreement-m56-generic-record-pattern-learning.md` sem reinterpretar seus requisitos.

## Resultado obrigatório

Criar uma camada determinística e provider-neutral que segmente blocos documentais, represente sua topologia relativa, use semântica como classificação posterior e permita que uma revisão humana confirme o tipo e os campos de um bloco. A assinatura aprendida deve localizar blocos irmãos em qualquer página, altura ou coluna, desde que repitam a estrutura e mantenham conteúdo semanticamente compatível.

## Requisitos congelados

- Implementar integralmente D-01 a D-12 e provar CA-D01 a CA-D12.
- Respeitar P-01 a P-08.
- Manter F-01 a F-04 fora do movimento.
- Exercer A-01 a A-04 apenas sobre detalhes de implementação.

## Direção técnica

Reutilizar `CanonicalDocument`, PDF.js, Tesseract posicionado, PP-StructureV3, evidência espacial, revisão e persistência atuais. Preservar metadados de bloco e ordem de leitura até a camada de padrões. Substituir gates de posição absoluta por relações relativas explicáveis. Manter adaptadores semânticos por tipo de registro sobre um motor estrutural comum. Cada candidato deve ser relido em sua própria fonte e nunca receber valores do exemplo humano.

## Validação

Adicionar testes positivos e negativos para experiência, formação, curso e certificação; seleção em diferentes partes do bloco; mesma estrutura em outra coluna/página; títulos ausentes ou diferentes; cabeçalho/rodapé repetido; tipo incompatível; ausência de geometria; preservação humana; evidência própria; nenhuma publicação. Executar `pnpm run validate`, regenerar o Context Pack e fechar o AoT.

## Limites

Não alterar produção, Knowledge, matching, taxonomias, Perfil aprovado ou documentos históricos. Não adicionar serviço externo ou dependência sem nova decisão do Product Owner.
