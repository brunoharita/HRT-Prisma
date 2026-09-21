# AoT — M5.7 — Marcadores de item em texto narrativo

Contrato de referência: `docs/ai/parser-ia.md` (M5.7, regra de reprodução de marcadores, 2026-09-21). Movimento restrito à estruturação do texto para revisão; não altera o modelo, o prompt, o banco ou a evidência de origem.

## Matriz de entrega

| ID | Implementação | Teste / evidência | Status |
| --- | --- | --- | --- |
| D-01 | `clean` preserva os marcadores explícitos `•`, `▪`, `●`, `◦`, `‣`, `⁃`, `∙` e inicia cada item em uma nova linha no valor estruturado | Teste Parser IA com dois marcadores inline e comparação exata do texto reproduzido | PASS |
| D-02 | O texto e as coordenadas em `fieldEvidence` continuam sendo os da fonte original | O mesmo teste confirma que `fieldEvidence.text` não recebe a normalização visual | PASS |
| D-03 | A regra mantém a normalização anterior de espaços e não altera campos sem marcador | 22 testes `parserIa` aprovados, incluindo recuperação de espaços, listas, contatos, experiências e educação | PASS |
| D-04 | A correção é publicada somente na camada web | Commit `1555cb1` em `main`/GitHub/VPS; container `prisma-web` ativo, zero reinícios, HTTPS 200 | PASS |

## Proibições verificadas

| ID | Guardrail | Evidência | Status |
| --- | --- | --- | --- |
| P-01 | Não reescrever o texto de evidência nem suas coordenadas | Teste de proveniência e diff restrito ao parser, teste e documentação | PASS |
| P-02 | Não chamar PaddleOCR/Tesseract nem alterar o pipeline de OCR | Diff sem alteração em Document Intelligence; apenas `parserIa.ts` foi modificado no runtime | PASS |
| P-03 | Não criar migração, dado, Perfil ou decisão humana | Release plan sem banco/funções; deploy recriou somente `prisma-web` | PASS |

## Validação

- `pnpm run build`: PASS.
- `pnpm run typecheck:web`: PASS.
- `pnpm exec node --test dist/tests/parserIa.test.js`: 22/22 PASS.
- `pnpm run generate:prisma-context` e `pnpm run check:prisma-context`: PASS.
- `git diff --check`: PASS.
- Smoke remoto: SHA `1555cb1419f476646c2ae1073db468b42b5bf6fe`, `prisma-web` `running`, `RestartCount=0`, `/`, `/profiles/import` e bundle principal HTTP 200; asset legado `pdf-hx5T6pJb.js` preservado e HTTP 200.

## Limites

A quebra de linha é aplicada quando o texto reproduz um marcador explícito reconhecido. O parser não infere marcadores ausentes a partir de layout desconhecido e não tenta reconstruir listas que não estejam presentes na fonte ou na resposta aceita. A validação visual autenticada de um currículo específico permanece responsabilidade da revisão humana.

## Conclusão

PASS. O texto narrativo reproduzido pelo Parser IA agora respeita marcadores explícitos como itens separados, preservando a evidência original para auditoria.
