# Contrato de extração

## Identidade

Nome: `extraction-provider`. Owner: AI engineering. Versão: 1.0.0. Consumidor: `processResume`. Estado: implementado localmente.

## Entrada

- `sourceText`: texto tratado como payload não confiável;
- `filename`: nome sanitizável, sem autoridade;
- `mediaType`: deve pertencer à allowlist;
- organização e documento são controlados pela aplicação, não pelo provider.

## Saída de sucesso

`ExtractionDraft` contém identidade possível, experiências, educação, certificações, idiomas, competências explícitas, contextos, incertezas e campos não identificados. O provider também retorna nome/modelo lógico e métricas de uso.

Sucesso do provider não significa perfil processado. A aplicação exige identidade e ao menos uma experiência estruturável, cria evidências, executa inferência e persiste somente após validação.

## Proveniência

Cada fato material liga-se a documento, bloco, página quando disponível, trecho, versão de extração, timestamp e método. Inferência referencia evidências separadas. Prompt e modelo são registrados quando aplicáveis. Revisão humana ainda não possui runtime, mas deve ser campo explícito antes do piloto conectado.

## Estados

| Estado | Significado atual |
| --- | --- |
| `pending` | Documento registrado e ainda não iniciado |
| `processing` | Extração em andamento |
| `processed` | Perfil mínimo validado e persistido |
| `extraction_failed` | Falha de provider, timeout, resposta ou schema |
| `needs_manual_review` | Texto ou estrutura insuficiente para perfil seguro |
| `unsupported_format` | Parser não disponível para o media type |

Estados planejados: `ocr_required`, `partially_extracted`, `duplicate_document`, `corrupted_document`. Eles não estão implementados e não devem ser emitidos.

## Falha

Falha registra reason code, motivo legível, mensagem técnica sanitizável, timestamp, pipeline version e `canReprocess`. Nunca converte falha em perfil vazio.

## Segurança

- Conteúdo do documento não altera instruções nem schema.
- Strings como "ignore instruções", "revele secrets" ou "execute" permanecem texto.
- Não enviar atributos sensíveis ou documento integral a fornecedor externo sem fluxo aprovado.
- Não logar currículo ou resposta integral.
- Tipo, tamanho, conteúdo e malware precisam de controles antes de upload real.

## Compatibilidade

Versão desconhecida ou resposta fora do schema é rejeitada. Mudança de campo opcional compatível é minor; mudança de semântica ou obrigatoriedade é major.

## Testes

Unit tests cobrem sucesso, formato não suportado, texto insuficiente e timeout. Golden tests cobrem fatos, inferências permitidas, invenções proibidas e prompt injection documental.
