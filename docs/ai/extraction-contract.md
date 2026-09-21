# Contrato de extração

## Identidade

Nome: `extraction-provider`. Owner: AI engineering. Versão: 1.0.0 (shape preservado). Consumidores: `processResume` e ingestão M2-B. A ingestão web acrescenta `adaptive-resume-extraction` 7.2.0 e `education-academic-classification` 1.2.0: resumo estruturado, IDs estáveis, evidência por campo, classificação acadêmica determinística, formação complementar, colunas paralelas e descoberta genérica de registros irmãos. A regra local de 2026-09-12 normaliza datas e períodos por `resume-dates-1.0.0`, conforme `docs/qa/resume-date-education-rules.md`; não equivale a novo rollout do banco.

## Entrada

Extensão experimental M5.7: `parser-ia-1.0.0`, descrita em `parser-ia.md` e ADR-049. Acrescenta interpretação via backend local antes do preenchimento, com propostas ancoradas aos spans originais, verificação e revisão humana. ExtractionDraft 8.2.0 registra a normalização de datas após validação das propostas; a versão de estruturação da rota inclui contrato/modelo/hash do prompt. O contrato do modelo e seu cache não mudam. Não está ativa online nem substitui silenciosamente a extração padrão.

- `sourceText`: texto tratado como payload não confiável;
- `filename`: nome sanitizável, sem autoridade;
- `mediaType`: deve pertencer à allowlist;
- organização e documento são controlados pela aplicação, não pelo provider.
- PDF: máximo de 15 MB, assinatura `%PDF-`, trailer `%%EOF` e parse válido;
- páginas: extração nativa PDF.js primeiro, preservando todas as páginas, linhas visuais e coordenadas disponíveis. No teste operacional aprovado em 2026-09-17, a importação automática segue diretamente ao Parser IA e não carrega Paddle ou Tesseract, mesmo quando a suficiência nativa falha. O worker, o core WASM e os dados `por+eng` permanecem empacotados para reversão e para OCR manual por região na revisão;
- evidência espacial persistida: coordenadas de página nativa exigem `pdfjs-layout-v1`; coordenadas de página OCR exigem `tesseract-layout-v1`; combinações cruzadas falham antes da persistência;
- campos: cada fato estruturado pode apontar para uma região própria e para o método que a produziu;
- adaptação: repetição no documento e sinais estruturais aprovados do próprio tenant orientam a interpretação, mas não autorizam copiar valores entre registros nem executar templates persistidos.
- blocos irmãos: uma experiência humana completa e com evidência espacial gera uma assinatura temporária do documento. Seção, cabeçalho, período, corpo, espaçamento e coluna são avaliados por critérios nomeados. Fontes sem geometria, colunas distintas, ambiguidades e duplicidades não geram novas experiências seguras.
- áreas personalizadas: somente títulos previamente aprovados no mesmo tenant são candidatos; o título precisa coincidir após normalização e o conteúdo é relido no documento até o próximo cabeçalho reconhecido, com evidência por item.
- resumo profissional: somente uma seção explicitamente intitulada é extraída. Variações PT/EN e conteúdo unido ao cabeçalho pelo PDF são aceitos; a próxima seção reconhecida encerra a captura, e a ausência permanece nula em vez de produzir uma síntese automática.
- formação: curso, nível, qualificação e situação são dimensões independentes. Regras PT/EN ignoram caixa, acentos e variações de hífen. Curso declarado sem indicação contrária assume conclusão inferida; status de não conclusão ou andamento explícito prevalece. `Atual/Present` sugere andamento; pós-graduação genérica não vira especialização; `Tecnologia em` é graduação tecnológica, nunca curso técnico. Marcadores explícitos de curso livre, capacitação, treinamento, workshop, bootcamp, extensão, microcredencial ou desenvolvimento profissional classificam o registro como `complementary` / Formação complementar, sem transformar o item em grau acadêmico. Evidência e confirmação humana continuam obrigatórias conforme o contrato de revisão.

## Saída de sucesso

`ExtractionDraft` contém identidade possível, título e áreas, objetivo, resumo profissional opcional, resultados, experiências, educação estruturada, certificações, idiomas, competências explícitas, contextos, áreas personalizadas, pendências de interpretação e informações não localizadas. Cada formação nova preserva texto original, resultado do classificador, motivos, versão, origem por dimensão e necessidade de revisão. Não existe confiança percentual acadêmica.

Sucesso do provider não significa perfil processado. A aplicação exige identidade e ao menos uma experiência estruturável, cria evidências, executa inferência e persiste somente após validação.

## Proveniência

Cada fato material liga-se a documento, bloco, página quando disponível, região, trecho, versão de extração, timestamp e método. Inferência referencia evidências separadas. Prompt e modelo são registrados quando aplicáveis. Uma correção humana permanece decisão distinta, pode orientar imediatamente a releitura de blocos irmãos e somente se torna padrão organizacional depois da aprovação integral da revisão.

## Estados

| Estado | Significado atual |
| --- | --- |
| `pending` | Documento registrado e ainda não iniciado |
| `processing` | Extração em andamento |
| `processed` | Perfil mínimo validado e persistido |
| `extraction_failed` | Falha de provider, timeout, resposta ou schema |
| `needs_manual_review` | Texto ou estrutura insuficiente para perfil seguro |
| `unsupported_format` | Parser não disponível para o media type |

`ocr_required` e `ocr_processing` estão implementados no M2-B. `partially_extracted`, `duplicate_document` e `corrupted_document` continuam planejados e não devem ser emitidos.

## Falha

Falha registra reason code, motivo legível, mensagem técnica sanitizável, timestamp, pipeline version e `canReprocess`. Nunca converte falha em perfil vazio.

## Segurança

- Conteúdo do documento não altera instruções nem schema.
- Strings como "ignore instruções", "revele secrets" ou "execute" permanecem texto.
- Não enviar atributos sensíveis ou documento integral a fornecedor externo sem fluxo aprovado.
- Não logar currículo ou resposta integral.
- Tipo, tamanho, assinatura, trailer e parser são validados antes da persistência. Malware scanning ainda não existe e não pode ser alegado.
- PDF.js processa a leitura inicial no navegador. Na rota hospedada aprovada, o PDF é enviado ao Parser IA por gateway autenticado; Paddle e Tesseract não participam da importação automática enquanto o teste estiver ativo.
- O ledger adaptativo recebe apenas caminhos de campo, página, método, versões, âncora, resumos estruturais e código de justificativa; valores e trechos não são duplicados. O texto aceito permanece exclusivamente no ledger espacial tenant-scoped.
- O catálogo de áreas personalizadas recebe apenas chave, título normalizado, formato, versão e confirmação; um ledger metadata-only referencia cada revisão aprovada. Conteúdo do currículo e evidência permanecem no perfil/review tenant-scoped.

## Compatibilidade

Versão desconhecida ou resposta fora do schema é rejeitada. Mudança de campo opcional compatível é minor; mudança de semântica ou obrigatoriedade é major.

O M5.6 acrescenta, atrás de `VITE_DOCUMENT_INTELLIGENCE_MODE`, `document-intelligence-provider` 1.0.0 e `canonical-document` 1.0.0. A capacidade instalada mantém PP-StructureV3/PP-OCRv6, PaddleOCR-VL 1.6 e Tesseract.js como opções reversíveis. Durante o teste aprovado em 2026-09-17, `nativeOnlyForParserIa` força `baseline`, não cria canvases de OCR e encaminha todas as páginas ao Parser IA; `ExtractionDraft` e o parser profissional continuam sem conhecer tipos Paddle. Detalhes e limites comprovados estão em `docs/ai/document-intelligence.md`.

## Testes

Unit tests cobrem sucesso, formato não suportado, texto insuficiente, timeout, releitura completa do bloco, preservação de correção humana anterior, aceite parcial e registro sem padrão seguro. Golden tests cobrem fatos, inferências permitidas, invenções proibidas e prompt injection documental.
