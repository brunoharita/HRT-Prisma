# Document Intelligence M5.6

## Contratos

- `document-intelligence-provider` 1.0.0: recebe bytes, MIME, rota e páginas de recuperação; devolve somente `CanonicalDocument`.
- `canonical-document` 1.0.0: páginas, dimensões, blocos, linhas, texto, tipo genérico, ordem, região, polígono, score e proveniência.
- coordenadas: `normalized-page-v1` antes de qualquer consumo por M5.
- provider: `paddleocr-self-hosted` com adaptador `paddleocr-3.7.0/prisma-adapter-1.1.0`.

## Separação de autoridade

Paddle fornece sinais documentais. Empresa, cargo, período, experiência, formação, competência, resumo, identidade e contato continuam sob as regras determinísticas do Prisma. Um label `title`, `text` ou `table` nunca publica fato profissional. `ExtractionDraft` continua sendo a fronteira de revisão humana.

O adaptador preserva `parsing_res_list`, `overall_ocr_res`, dimensões, leitura, caixas, polígonos e scores no formato canônico necessário. O parser existente consome linhas em ordem e geometria já normalizada, sem importar tipos Paddle.

## Rotas adaptativas

| Rota | Uso | Engine |
| --- | --- | --- |
| `native-fast` | PDF nativo simples e suficiente | PDF.js |
| `structure` | duas colunas ou layout complexo com texto útil | PP-StructureV3 e PP-OCRv6 |
| `vision` | scan, image-only ou texto nativo insuficiente | PP-StructureV3 com preprocessing |
| `recovery` | página ainda ausente ou insuficiente | PaddleOCR-VL 1.6; depois Tesseract.js |

O caminho pesado nunca é aplicado ao PDF nativo simples. Recuperação visual recebe uma imagem de página, não reprocesa deliberadamente todo o documento. Tesseract.js permanece fallback e baseline comparável.

## Diagnóstico

As categorias allowlisted distinguem falha documental/OCR, layout/reading order, estrutura, semântica, padrão desconhecido, ambiguidade, provider, timeout, resposta inválida, página incompleta, conteúdo insuficiente e fallback. O trace preserva provider, modelo e versões tentados também na falha e acrescenta somente status, código seguro e contagens estruturais. Nenhuma categoria transporta texto do currículo, mensagem livre do provider ou caminho local.

## Structural Pattern Knowledge

O M5.6 estende `organization_extraction_patterns`, que já recebe padrões aprovados de blocos irmãos. Acrescenta versão de assinatura, família de provider, aplicabilidade e metadados de invalidação. A entidade continua organization-scoped e metadata-only, separada da Knowledge ocupacional. Um documento futuro sempre é relido e produz evidência própria; valores anteriores nunca são copiados.

## Estado comprovado em 2026-09-11

O runtime CPU local respondeu nos dois currículos autorizados. O probe sanitizado registrou 40 blocos e 71 linhas no caso Tainá, 27 blocos e 60 linhas no caso Vagner, sem fallback. O fluxo autenticado em QA exibiu `PP-StructureV3 local`, recuperou três experiências e duas formações para Tainá e sete sinais de experiência para Vagner. O parser 7.1.0 prioriza o detector específico de colunas sobre agrupamentos genéricos, reconhece cargos femininos equivalentes e preserva blocos incompletos como `possible`, sem inventar datas.

Dois currículos não constituem amostra representativa. A meta de 90%, a comparação quantitativa contra baseline e o cutover continuam bloqueados até a avaliação cega de 8 a 12 currículos reais autorizados com contagem de intervenção humana e zero fallback nos casos que exigem o provider.
