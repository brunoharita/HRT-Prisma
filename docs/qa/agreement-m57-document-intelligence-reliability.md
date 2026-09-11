# Contrato de Acordos - M5.7 Confiabilidade da inteligência documental

## Objetivo

Reduzir materialmente o trabalho humano na importação de currículos estabilizando o provedor estrutural já integrado, tornando todo fallback explicável e ampliando a recuperação de registros que repetem um padrão confirmado, inclusive quando algum campo estiver ausente, sem converter probabilidade em fato.

## DEVE

- D-01 - Executar o adaptador Paddle real nos dois currículos autorizados e separar falha de transporte, timeout, resposta inválida, conteúdo insuficiente e fallback.
- D-02 - Preservar no trace o provedor, modelo e versões tentados mesmo quando a tentativa falhar.
- D-03 - Registrar apenas códigos e métricas técnicas allowlisted, sem texto do currículo, mensagem integral do provedor ou PII.
- D-04 - Alinhar os timeouts do cliente e do proxy à execução local CPU observada, com limite configurável e fail-closed.
- D-05 - Manter PDF.js no caminho nativo simples e Paddle somente nas rotas estruturais ou visuais elegíveis.
- D-06 - Aceitar como sugestão possível um bloco estruturalmente equivalente e semanticamente compatível que não possua período, desde que possua empresa, cargo e conteúdo próprios recuperáveis.
- D-07 - Exigir confirmação humana individual para sugestões possíveis e nunca preencher o campo ausente por cópia ou inferência.
- D-08 - Disponibilizar probe reproduzível e sanitizado do runtime local para arquivos explicitamente autorizados.
- D-09 - Bloquear cutover sem 8 a 12 currículos autorizados, pelo menos 90% nos campos claros suportados, superioridade sobre o baseline, redução de intervenção humana, zero fallback nos casos que exigem Document Intelligence e nenhuma regressão crítica.
- D-10 - Atualizar contratos, documentação operacional, estado atual e AoT com as evidências realmente obtidas.
- D-11 - Permitir que o revisor vincule um currículo com nome explícito a uma Pessoa existente mesmo quando e-mail e telefone não forem recuperados, sem relaxar o mínimo de identidade exigido para criar uma nova Pessoa.

## PROIBIDO

- P-01 - Não usar currículos encontrados na máquina sem autorização explícita.
- P-02 - Não enviar currículo ou PII para serviço externo.
- P-03 - Não publicar sugestões no Perfil nem aprová-las automaticamente.
- P-04 - Não adicionar outro parser, OCR, LLM ou dependência neste movimento.
- P-05 - Não alterar Knowledge, CBO, ESCO, O*NET, matching, senioridade ou decisão de contratação.
- P-06 - Não registrar conteúdo integral, mensagem livre do provedor ou caminho local do arquivo na telemetria.
- P-07 - Não promover flag ou executar produção.
- P-08 - Não declarar excelência representativa com somente dois currículos reais.

## FORA DE ESCOPO

- F-01 - Integração de Docling, Unstructured ou outro provider challenger.
- F-02 - Treinamento ou fine-tuning de modelo.
- F-03 - Reprocessamento retroativo de documentos históricos.
- F-04 - Alteração de RLS, papéis, publicação ou taxonomias profissionais.

## AUTONOMIA

- A-01 - Estrutura dos erros tipados e códigos técnicos allowlisted.
- A-02 - Limites locais de timeout dentro de 30 a 300 segundos.
- A-03 - Composição das fixtures negativas e do probe sanitizado.
- A-04 - Ajuste determinístico do candidato incompleto, desde que permaneça como possível e não invente valores.

## CRITÉRIOS DE ACEITE

- CA-D01 - Os dois PDFs autorizados completam o adaptador canônico real ou produzem motivo técnico específico e reproduzível.
- CA-D02 - Uma falha preserva identidade técnica do provider no trace.
- CA-D03 - Testes provam que detalhes livres do provider não chegam à metadata persistível.
- CA-D04 - Cliente e proxy suportam a latência CPU observada e valores inválidos retornam ao padrão seguro.
- CA-D05 - Regressão confirma que PDF nativo simples continua em `native-fast`.
- CA-D06 - Fixture com empresa, cargo e descrição, mas sem período, aparece como `possible`.
- CA-D07 - O período permanece nulo e a UI exige revisão individual.
- CA-D08 - O probe retorna somente hash curto e métricas estruturais.
- CA-D09 - O benchmark permanece `BLOCKED` sem a amostra e aplica todos os gates definidos.
- CA-D10 - Context Pack e AoT distinguem PASS, PARTIAL e BLOCKED.
- CA-D11 - QA aceita o vínculo humano name-only no estado de revisão de identidade, continua exigindo nome mais e-mail ou telefone para criação e mantém tenant, papel e lock autoritativos.

## ESTADO E APROVAÇÃO

- Estado: `agreed`
- Product Owner: Bruno Harita Santos
- Data: 2026-09-11
- Evidência de aprovação: solicitação para executar todos os passos do upgrade recomendado com o objetivo previamente determinado.
- Aditivo D-11: erro encontrado durante o teste completo incluído pela solicitação anterior de corrigir os erros da rotina de importação e pela autorização deste upgrade integral.
