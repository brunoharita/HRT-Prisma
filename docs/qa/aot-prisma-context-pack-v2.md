# AoT — Context Pack Prisma 2.0

Contrato: `docs/qa/agreement-prisma-context-pack-v2.md` 1.0.0. Execução: `docs/qa/execution-prisma-context-pack-v2.md`. Evidência iniciada em 2026-09-14.

## Matriz de acordos

| IDs | Implementação | Teste / evidência | Status |
| --- | --- | --- | --- |
| D-001 a D-004 | cinco fontes canônicas preservadas; exportação inclui toda documentação especializada; dois artefatos usam o mesmo manifesto | geração comprovou 178 fontes completas e manifesto idêntico | PASS |
| D-005 a D-006 | fonte compacta com seleção vigente, governança e mapa de aprofundamento | teste estrutural e inspeção de conteúdo; 45.765 caracteres | PASS |
| D-007 | checker normaliza finais de linha e valida duas saídas, papéis, tamanho e referências | teste aceita LF/CRLF, rejeita conteúdo diferente e checker final passa | PASS |
| D-008 | AI, técnica, Wiki, README, catálogos e estado corrente reconciliados | buscas negativas e foundation distinguem matching base de matching de Posições | PASS |
| P-001 a P-006 | artefatos marcados como gerados; owners/histórico preservados; sem integração/runtime/dados | diff não contém runtime do produto, migration, Supabase ou integração externa | PASS |

## Fora de escopo

Upload em GPT, sincronização externa, produto runtime, Supabase, QA e produção.

## Evidência

- `pnpm run generate:prisma-context`: PASS; gerou `FONTE_GPT_PRISMA.md` e `TUDO_SOBRE_PRISMA.md`.
- `pnpm run check:prisma-context`: PASS com cinco fontes canônicas e dois artefatos gerados.
- `pnpm run test:tooling`: PASS, 12/12; as falhas sintéticas impressas fazem parte das provas negativas do runner e o comando terminou com sucesso.
- `pnpm run lint`: PASS, 492 arquivos.
- `pnpm run check:foundation`: PASS, 18 tabelas públicas e seis versões de processamento; confirmou a coexistência do matching base 1.0.0 e matching de Posições 4.0.0/score 1.1.0.
- `git diff --check`: PASS.
- Fonte compacta: 45.765 caracteres. Exportação completa: aproximadamente 1,03 milhão de caracteres e 178 fontes. Manifesto idêntico nas duas saídas.
- `pnpm run validate` não foi executado: a mudança afeta somente governança, documentação e tooling do Context Pack, sem risco transversal de runtime que justifique o gate integral.

## Conclusão

PASS. D-001 a D-008 e P-001 a P-006 possuem implementação e prova proporcional. Prisma permanece v1.6.3. Não houve mudança em produto runtime, Supabase, QA ou produção; o upload do novo arquivo no GPT continua sendo uma ação externa manual do Product Owner.
