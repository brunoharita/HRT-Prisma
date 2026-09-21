# AoT — M5.8 — Formação complementar

Contrato de referência: `docs/ai/extraction-contract.md` e `docs/ai/parser-ia.md`, classificação `education-academic-classification-1.2.0`. O movimento adiciona um nível controlado à formação estruturada existente; não cria uma tabela paralela e não altera a separação de certificações.

## Matriz de entrega

| ID | Implementação | Teste / evidência | Status |
| --- | --- | --- | --- |
| D-01 | `education.level=complementary` e rótulo visual `Formação complementar`, reutilizando `education[]` | 37 testes direcionados, incluindo classificador, migration e UI | PASS |
| D-02 | Marcadores explícitos de curso livre, capacitação, treinamento, workshop, bootcamp, extensão, microcredencial e desenvolvimento profissional classificam o item como complementar | Testes de classificação para curso livre e curso de curta duração | PASS |
| D-03 | Graus formais continuam em `technical`, `undergraduate` ou `postgraduate`; certificações permanecem em sua seção própria | Suite de regressão da classificação e contrato documental | PASS |
| D-04 | Conclusão não explícita continua inferida e exige confirmação humana | Teste de curso complementar verifica `educationClassificationNeedsReview=true` | PASS |
| D-05 | Validação server-side aceita apenas combinações compatíveis com o novo nível | Migration aplicada no Supabase; caso complementar válido aceito e `complementary+bachelor` rejeitado | PASS |
| D-06 | Interface comunica formação acadêmica e complementar sem alterar a ordem do fluxo de revisão | `typecheck:web`, build e teste de UI aprovados | PASS |
| D-07 | Seletor de nível agrupa opções em Educação formal, Formação complementar e Sem classificação | Teste de UI com os três grupos; bundle publicado contém `Educação formal` | PASS |
| D-08 | Rascunho legado com qualificação incompatível não fica preso quando o nível oculta o campo | Normalização redefine a qualificação para `unknown`, preserva a origem e mantém confirmação humana obrigatória; regressão aprovada | PASS |

## Proibições verificadas

| ID | Guardrail | Evidência | Status |
| --- | --- | --- | --- |
| P-01 | Não classificar grau acadêmico formal como formação complementar | Compatibilidade server-side rejeita qualificações incompatíveis | PASS |
| P-02 | Não reclassificar certificações como formação | Diff limitado ao domínio `education[]`, parser e telas de formação | PASS |
| P-03 | Não transformar status inferido em fato confirmado | Classificador preserva a pendência de revisão humana | PASS |
| P-04 | Não alterar tenant, RLS, permissões ou autoridade humana | Migration somente substitui o validador privado e a função de identidade do curso | PASS |

## Validação

- `pnpm run build`: PASS.
- `pnpm run typecheck:web`: PASS.
- `pnpm exec node --test dist/tests/educationClassification.test.js dist/tests/educationClassificationMigration.test.js dist/tests/educationClassificationUi.test.js`: 37/37 PASS.
- `pnpm run generate:prisma-context` e `pnpm run check:prisma-context`: PASS.
- `git diff --check`: PASS.
- Supabase remoto: função instalada contém `complementary`; teste positivo retornou `true` e teste negativo de `complementary+bachelor` retornou rejeição.
- `pnpm run check:supabase-ledger`: BLOCKED conforme o guardrail histórico (`cliDbPushAllowed=false`, migrations antigas com timestamps divergentes e outras M8/M8.2 locais pendentes). A migration deste movimento foi aplicada pelo conector autorizado e verificada diretamente no banco; `db push` não foi usado.

## Limites

Sem marcador explícito, o classificador não inventa a natureza do curso: mantém a classificação determinística disponível e a confirmação humana quando a conclusão ou a categoria não estiverem comprovadas. A regra melhora a separação automática, mas não substitui a revisão de casos ambíguos.

## Conclusão

PASS. O commit funcional anterior `9d237a1f50e3c3aec48350a288e4639033f8e22e` está em `main`, GitHub e VPS; esta correção aguarda o novo rollout. O `prisma-web` permanece ativo com zero reinícios e HTTPS 200 em `/` e `/profiles/import`; o bundle contém os três agrupadores do seletor. A migration e as provas remotas permanecem válidas.
