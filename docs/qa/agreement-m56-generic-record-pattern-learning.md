# Contrato de Acordos — M5.6 Aprendizado genérico de padrões de registros

## Objetivo

Reduzir materialmente o trabalho humano na importação de currículos reconhecendo blocos repetidos primeiro pela estrutura documental e depois pelo significado proposto pelo parser ou confirmado pela revisão humana, sem depender da posição absoluta, do título da seção ou de uma parte fixa do registro.

## DEVE — Inegociável

- D-01 — Segmentar o documento em blocos estruturais antes de decidir o tipo profissional de cada registro.
- D-02 — Usar o parser como primeira interpretação e a revisão humana como confirmação ou correção do tipo e dos campos do padrão.
- D-03 — Reconhecer blocos irmãos pela topologia visual relativa, conteúdo compatível e repetição, independentemente da página, altura, coluna ou presença de título de seção.
- D-04 — Resolver qualquer região selecionada dentro de um registro para o bloco completo que a contém; a seleção nunca é presumida como cabeçalho.
- D-05 — Aplicar o mecanismo genérico a experiências, formações acadêmicas, cursos e certificações.
- D-06 — Extrair os valores próprios de cada bloco candidato; aprendizado estrutural nunca copia valores do registro humano para irmãos.
- D-07 — Separar correspondência forte, possível e não resolvida por critérios nomeados e auditáveis, sem score opaco.
- D-08 — Reutilizar PDF.js, OCR posicionado, PP-StructureV3 e o documento canônico existentes, preservando tipo, região, hierarquia e ordem de leitura úteis.
- D-09 — Disparar a busca de irmãos sem exigir uma etapa humana adicional depois que um registro tiver informação e evidência suficientes.
- D-10 — Preservar evidência por campo, proveniência, decisão humana, isolamento por organização, autorização, lock, idempotência e publicação separada.
- D-11 — Cobrir layouts reais e sintéticos com variação de posição, coluna, título, cabeçalho, rodapé, quebra de página e seleção em diferentes partes do bloco.
- D-12 — Limitar a alteração ao pipeline de documento, estruturação e revisão de currículo diretamente necessário a este objetivo.

## PROIBIDO

- P-01 — Não criar regras baseadas somente em coordenada absoluta, nome de seção, cabeçalho ou rodapé.
- P-02 — Não copiar empresa, cargo, período, curso, instituição, certificado, descrição ou outro valor entre registros.
- P-03 — Não publicar sugestões diretamente no Perfil nem converter probabilidade em fato aprovado.
- P-04 — Não enviar currículos ou PII a serviço externo.
- P-05 — Não introduzir parser, OCR ou documento canônico paralelo.
- P-06 — Não alterar Knowledge, CBO, ESCO, O*NET, matching, senioridade, decisão de contratação ou dados aprovados fora da revisão.
- P-07 — Não reduzir RLS, tenant scope, grants, validação espacial, histórico ou auditabilidade.
- P-08 — Não declarar excelência ou conclusão sem regressões negativas e evidência em currículos representativos autorizados.

## FORA DE ESCOPO

- F-01 — Produção e promoção automática de feature flag.
- F-02 — Reprocessamento retroativo de documentos ou perfis históricos.
- F-03 — Modelo externo, LLM remoto ou treinamento autônomo.
- F-04 — Mudança do significado do Perfil profissional ou das taxonomias de ocupações e competências.

## AUTONOMIA DE ENGENHARIA

- A-01 — Estruturas internas, algoritmos determinísticos, thresholds explicáveis e nomes de versões.
- A-02 — Organização dos adaptadores por tipo de registro e composição dos testes.
- A-03 — Uso de metadados de bloco do documento canônico e fallbacks compatíveis para PDF.js e OCR legado.
- A-04 — Evolução compatível de contratos locais e documentação proprietária necessária.

## PENDÊNCIAS

Nenhuma pendência material para implementação local e validação em Prisma-QA. Produção permanece fora de escopo.

## CRITÉRIOS DE ACEITE

- CA-D01 — Dado um currículo sem títulos canônicos, quando houver blocos repetidos, então a segmentação identifica candidatos antes da classificação semântica.
- CA-D02 — Dado um tipo proposto incorretamente ou ausente, quando o revisor classificar um bloco, então essa decisão orienta apenas blocos estruturalmente equivalentes.
- CA-D03 — Dado o mesmo padrão em outra página, altura ou coluna, então a posição absoluta isolada não impede a proposta.
- CA-D04 — Dada uma seleção no cargo, empresa, data, descrição, curso ou instituição, então o mesmo bloco completo é recuperado.
- CA-D05 — Fixtures de experiência, formação, curso e certificação produzem irmãos do mesmo tipo e rejeitam tipos incompatíveis.
- CA-D06 — Cada sugestão contém texto e região do próprio candidato; teste negativo prova ausência de cópia do valor humano.
- CA-D07 — Toda sugestão ou rejeição possui critérios ou motivo determinístico visível e versionado.
- CA-D08 — O adaptador conserva metadados canônicos úteis; fontes legadas continuam compatíveis sem coordenadas inventadas.
- CA-D09 — Uma correção completa dispara análise sem novo clique; falha auxiliar não perde a correção.
- CA-D10 — Testes preservam revisão, evidência, segurança e ausência de publicação.
- CA-D11 — Suíte cobre variações espaciais, ruído repetido e quebras de página, além dos dois currículos reais autorizados.
- CA-D12 — Diff e regressões demonstram ausência de mudança funcional fora do fluxo de currículo.

## ESTADO

- `agreed`

## APROVAÇÃO

- Product Owner: Bruno Harita Santos
- Data: 2026-09-10
