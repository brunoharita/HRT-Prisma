# Contrato de extração

## Identidade

Nome: `extraction-provider`. Owner: AI engineering. Versão: 1.0.0. Consumidores: `processResume` e ingestão M2-B. Estado: ativo localmente e com persistência validada em QA. A ingestão web acrescenta o contrato `adaptive-resume-extraction` 2.0.0: runtime local e persistência/padrões ativos no Prisma-QA.

## Entrada

- `sourceText`: texto tratado como payload não confiável;
- `filename`: nome sanitizável, sem autoridade;
- `mediaType`: deve pertencer à allowlist;
- organização e documento são controlados pela aplicação, não pelo provider.
- PDF: máximo de 15 MB, assinatura `%PDF-`, trailer `%%EOF` e parse válido;
- páginas: extração nativa primeiro, preservando linhas visuais e coordenadas; OCR local somente quando a suficiência falha;
- campos: cada fato estruturado pode apontar para uma região própria e para o método que a produziu;
- adaptação: repetição no documento e sinais estruturais aprovados do próprio tenant orientam a interpretação, mas não autorizam copiar valores entre registros nem executar templates persistidos.

## Saída de sucesso

`ExtractionDraft` contém identidade possível, experiências, educação, certificações, idiomas, competências explícitas, contextos, incertezas e campos não identificados. O provider também retorna nome/modelo lógico e métricas de uso.

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
- PDF.js e Tesseract.js processam no navegador; nenhum currículo é enviado a OCR ou LLM externo.
- O ledger adaptativo recebe apenas caminhos de campo, página, método, versão, padrão e código de justificativa; valores e trechos não são duplicados.

## Compatibilidade

Versão desconhecida ou resposta fora do schema é rejeitada. Mudança de campo opcional compatível é minor; mudança de semântica ou obrigatoriedade é major.

## Testes

Unit tests cobrem sucesso, formato não suportado, texto insuficiente, timeout, releitura completa do bloco, preservação de correção humana anterior, aceite parcial e registro sem padrão seguro. Golden tests cobrem fatos, inferências permitidas, invenções proibidas e prompt injection documental.
