# AoT — M5.6 Aprendizado genérico de padrões de registros

## Matriz de Acordos

| ID | Acordo | Implementação | Teste | Evidência | Status |
| --- | --- | --- | --- | --- | --- |
| D-01 | Segmentação estrutural anterior à semântica | Motor relativo e agrupamento canônico por bloco | Fixtures sem título e com grupos `blockId` | Candidatos segmentados antes do adaptador profissional | PASS |
| D-02 | Parser primeiro e revisão humana como confirmação | Extração inicial conservadora e âncora humana espacial | Parser ausente/incorreto e correção humana | Tainá e Vagner dispararam releitura após correção | PASS |
| D-03 | Padrão independente de posição absoluta | Assinatura relativa, continuidade de coluna e limite espacial de seção | Outra coluna, página, altura e ordem serial | Vagner encontrou irmãos nas colunas esquerda e direita | PASS |
| D-04 | Qualquer seleção resolve o bloco completo | `locateRecordAnchor` e região persistida resolvem o bloco contenedor | Seleção em empresa, cargo, descrição e região | Seleção apenas em JAD ZOGHEIB recuperou cargo, período e corpo | PASS |
| D-05 | Experiência, formação, curso e certificação | Adaptadores sobre o mesmo motor de assinatura | Fixtures dedicadas dos três tipos persistidos, incluindo curso/certificação | Tipos incompatíveis são rejeitados | PASS |
| D-06 | Valores próprios por candidato | Releitura de cada região candidata | Teste negativo contra cópia e assertions de evidência | Vagner manteve quatro conjuntos distintos de valores | PASS |
| D-07 | Critérios explicáveis | Forte, possível e não resolvido com critérios e reason codes | Contratos e UI do painel | UI apresentou critérios nomeados e revisão individual | PASS |
| D-08 | Reuso do documento canônico | PDF.js, Tesseract, Paddle e `layoutLines` existentes | Compatibilidade espacial e text-only fail-closed | Nenhum segundo parser ou documento paralelo | PASS |
| D-09 | Sem passo humano adicional | Scan automático após salvamento do registro completo | Teste da página e smoke autenticado | O painel surgiu depois de salvar, sem ação de procura | PASS |
| D-10 | Evidência e segurança preservadas | RPC v4 atômica, validação privada, tenant e lock | Testes SQL negativos e aplicação autenticada | Quatro propostas aplicadas ao draft; Perfil preservado | PASS |
| D-11 | Variações e currículos autorizados | Fixtures espaciais e dois PDFs reais fora do repositório | Suíte técnica e smoke local ligado ao QA | Tainá: 2 irmãos; Vagner: 4 irmãos | PASS |
| D-12 | Escopo limitado | Alterações restritas à extração, revisão, persistência e contratos M5.6 | Revisão do diff e regressão integral | Knowledge, matching e Perfil publicado não mudaram | PASS |

## Proibições verificadas

| ID | Guardrail | Teste negativo | Evidência | Status |
| --- | --- | --- | --- | --- |
| P-01 | Sem regra somente por posição ou título | Variações espaciais e duas colunas | Irmãos encontrados fora da coluna da âncora | PASS |
| P-02 | Sem cópia de valores | Valores humanos e irmãos deliberadamente distintos | Cada proposta veio de sua região original | PASS |
| P-03 | Sem publicação automática | Aplicação encerrou no rascunho da revisão | Perfil vigente preservado no smoke | PASS |
| P-04 | Sem envio externo de PII | Pipeline self-hosted/local e testes determinísticos | Nenhum LLM ou serviço documental externo adicionado | PASS |
| P-05 | Sem parser paralelo | Reuso de `ExtractedPage.layoutLines` | Diff não cria documento alternativo | PASS |
| P-06 | Sem mudança em Knowledge ou decisão | Diff restrito ao M5.6 | CBO, ESCO, O*NET, matching e senioridade intactos | PASS |
| P-07 | Sem redução de segurança | `private.require_document_reviewer`, RLS e grants negativos | `anon` negado; execução autenticada controlada | PASS |
| P-08 | Sem conclusão sem evidência | Suíte integral, SQL QA e dois currículos reais | Evidências registradas nesta matriz | PASS |

## Fora de escopo preservado

| ID | Evidência no diff | Status |
| --- | --- | --- |
| F-01 | Nenhuma promoção de produção ou feature flag | PASS |
| F-02 | Nenhum reprocessamento retroativo em lote | PASS |
| F-03 | Nenhum modelo externo, LLM ou treinamento autônomo | PASS |
| F-04 | Nenhuma mudança no significado do Perfil ou taxonomias | PASS |

## Desvios do contrato

Nenhum desvio registrado até o momento.

## Mudanças autorizadas durante a execução

Nenhuma.

## Validação final

- Suíte técnica focal: 311 testes aprovados antes do gate final.
- Smoke autenticado local ligado ao Prisma-QA: Tainá gerou 2 propostas corretas e Vagner 4, todas com confirmação humana; nenhuma publicação foi executada.
- `pnpm run validate`: lint de 398 arquivos, foundation, Context Pack, dois typechecks, build web, 311 testes técnicos, 19 goldens e `VERTICAL_SLICE_OK`.
- `pnpm run generate:prisma-context` e `pnpm run check:prisma-context`: exportação regenerada e 5 fontes canônicas aprovadas.

## Git / QA / ambiente

- Branch local: `codex/m5-6-resume-parser-upgrade`.
- Migration `20260910193000_generic_record_pattern_learning.sql` aplicada somente ao Prisma-QA.
- Frontend executado localmente em `127.0.0.1:5555`, conectado ao QA.
- Produção não foi alterada.
- Permanecem no QA os rascunhos de teste autorizados de Tainá e Vagner e intakes incompletos criados durante o diagnóstico; nenhum Perfil novo foi publicado.

## Conclusão

Todos os `D-*` e `P-*` aplicáveis estão em `PASS`. Os comportamentos funcionais e de segurança acordados estão comprovados, sem desvio do contrato. Produção, reprocessamento histórico e publicação automática permaneceram fora de escopo.
