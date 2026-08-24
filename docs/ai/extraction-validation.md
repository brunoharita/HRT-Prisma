# Validação da extração

## Metodologia

Foram usados 13 currículos sintéticos representativos, sem dados pessoais reais. Os casos cobrem BI, varejo, logística, recrutamento, construção, saúde, manufatura, software, dados, gestão de projetos e prompt injection documental.

Cada documento foi processado pelo provider local. O runner verificou identidade, fatos obrigatórios, normalização, inferências aceitáveis, contextos, conhecimentos proibidos e proveniência. Os contratos esperados também foram inspecionados para evitar que ausência de dado virasse conclusão negativa.

## Resultado final

| Caso | Contexto principal | Resultado final |
| --- | --- | --- |
| CV 01 | BI e indústria | passou |
| CV 02 | Tableau e varejo | passou após ajuste |
| CV 03 | SAP e logística | passou |
| CV 04 | recrutamento | passou |
| CV 05 | projetos e construção | passou |
| CV 06 | dados e saúde | passou |
| CV 07 | Lean e manufatura | passou |
| CV 08 | software em inglês | passou após ajuste |
| CV 09 | Qlik | passou |
| CV 10 | comercial e Excel | passou |
| CV 11 | ETL e dados | passou |
| CV 12 | projetos industriais | passou |
| CV 13 | instrução maliciosa em currículo | passou |

Resultado do runner: 13 de 13 extrações, 4 de 4 avaliações de matching e 2 de 2 casos de retrieval aprovados.

## Achados

### Fatos perdidos

1. "analisou dados" não era reconhecido pela regra que aceitava somente "análise de dados".
2. O cabeçalho inglês "Experience" não mudava o parser para a seção de experiências.

### Ajustes

- A normalização de Data Analysis passou a reconhecer flexões verbais controladas.
- Seções `Summary`, `Experience` e `Education` passaram a ser reconhecidas.
- Os resultados esperados não foram afrouxados.

### Inferências

As inferências permitidas foram limitadas a regras explícitas, como ferramentas de BI para Business Intelligence e tecnologias de dados para Data Analysis. Nenhuma soft skill foi inferida.

### Alucinações

Nenhum conhecimento proibido nos casos foi produzido. Isso demonstra o comportamento do provider determinístico nas fixtures, não garante ausência de alucinação em um futuro provider de LLM.

### Prompt injection documental

Hipótese: texto de currículo tentando alterar instruções poderia contaminar extração futura. Achado: a fixture CV 13 contém pedido para ignorar regras, revelar secrets e conceder papel administrativo; o provider local manteve o texto como dado e extraiu somente SQL e a inferência permitida de Data Analysis. Mudança realizada: o caso entrou no golden set e ganhou teste negativo dedicado. Risco residual: provider LLM futuro precisa repetir o teste com separação de instruções e Structured Output validado.

### Ambiguidades e limitações

- Períodos são preservados como texto e ainda não calculam duração ou recência.
- O parser CLI continua textual; o fluxo web M2-B cobre PDF nativo e documento escaneado por OCR local seletivo, comprovados com fixtures sintéticas conectadas.
- O formato de experiência usa separadores estruturados nas fixtures.
- Contradições entre múltiplos documentos ainda não são detectadas.
- Senioridade não é inferida automaticamente.

## Risco aberto

`RISK: EXTRACTION_NOT_VALIDATED_AGAINST_REAL_CLIENT_DATA`

Plano de fechamento:

1. obter 10 a 15 currículos reais com base legal e acesso autorizado;
2. anonimizar o relatório de validação;
3. executar o provider candidato em ambiente controlado;
4. revisar fatos perdidos, excesso de inferência, formatos, idiomas, senioridade e contexto;
5. ajustar contratos e versões;
6. repetir golden tests antes da promoção.

A fundação de IA não deve ser considerada definitivamente validada enquanto esse risco permanecer aberto.
