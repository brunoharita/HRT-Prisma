# Prompt de Execução - M5.7 Confiabilidade da inteligência documental

Implementar integralmente o contrato `agreement-m57-document-intelligence-reliability.md`, sem reinterpretar o objetivo de reduzir trabalho humano por reconhecimento de padrões documentais repetidos.

## Resultado obrigatório

Estabilizar o runtime Paddle existente, tornar o fallback tecnicamente explicável sem PII, comprovar o adaptador nos arquivos autorizados e permitir que registros estruturalmente equivalentes com campo ausente sejam apresentados como sugestões possíveis para decisão humana.

## Limites congelados

- Implementar D-01 a D-11 e provar seus critérios de aceite na medida em que existam dados autorizados.
- Respeitar P-01 a P-08.
- Manter F-01 a F-04 fora do movimento.
- Usar A-01 a A-04 apenas para detalhes internos.
- Não declarar cutover nem excelência representativa enquanto a amostra autorizada permanecer abaixo de oito currículos.

## Validação

Executar testes focais de Document Intelligence, extração adaptativa, benchmark e contratos afetados. Executar typecheck e build das superfícies alteradas. Regenerar e verificar o Context Pack. Uma validação integral somente será executada se o risco observado justificar e houver autorização específica do Product Owner.
