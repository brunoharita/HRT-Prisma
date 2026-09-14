# Contrato de Acordos — Context Pack Prisma 2.0

Versão 1.0.0. Estado: agreed para implementação local. PO: Bruno, 2026-09-14. Fonte: decisão de manter uma única fonte eficiente no GPT e documentação detalhada portátil para outras IAs.

## DEVE

- D-001: preservar as cinco fontes canônicas e os owners especializados como documentação completa e autoritativa.
- D-002: gerar `FONTE_GPT_PRISMA.md` como única fonte permanente, compacta e vigente para o GPT que prepara prompts do Codex.
- D-003: manter `TUDO_SOBRE_PRISMA.md` como exportação completa e portátil de `AGENTS.md`, `README.md` e todos os documentos especializados em `docs/**/*.md`.
- D-004: uma única rotina deve gerar as duas saídas a partir das mesmas fontes e do mesmo manifesto.
- D-005: a fonte compacta deve conter objetivo, invariantes, estado atual, linguagem, arquitetura essencial, limites e mapa de owners/código a consultar.
- D-006: o prompt orientado por essa fonte deve exigir que o Codex confirme fontes específicas antes de implementar e use DEVE, PROIBIDO, FORA DE ESCOPO, AUTONOMIA, PENDENTE e CRITÉRIO DE ACEITE em mudança material.
- D-007: o checker deve validar as duas saídas, seus papéis, manifesto, conteúdo vigente e limite de tamanho, sem falso stale por LF/CRLF.
- D-008: referências consolidadas diretamente usadas na fonte compacta devem refletir matching 4.0.0, score 1.1.0, M6.2, Knowledge publicada e estados reais dos providers.

## PROIBIDO

- P-001: editar manualmente qualquer artefato gerado ou tratá-lo como fonte de verdade independente.
- P-002: apagar owners detalhados, histórico, ADRs, contratos, provas ou limites para reduzir tamanho.
- P-003: misturar afirmação histórica com estado vigente sem indicação de precedência.
- P-004: afirmar implementação, QA ou produção somente pela documentação.
- P-005: incluir segredo, credencial, PII integral, currículo ou dado real no contexto gerado.
- P-006: criar sincronização externa automática, custo, provider ou publicação nesta entrega.

## FORA DE ESCOPO

- F-001: upload ou atualização das fontes de um GPT externo.
- F-002: API de sincronização com ChatGPT, Drive, GitHub ou outro serviço.
- F-003: mudança de produto runtime, banco, Supabase, Auth, RLS, frontend ou produção.
- F-004: reescrita integral de todo documento histórico especializado.

## AUTONOMIA

- A-001: nome, composição e seleção determinística de seções da fonte compacta.
- A-002: limite técnico de tamanho, metadados e testes de integridade.
- A-003: correções factuais diretamente necessárias nas referências canônicas e catálogos proprietários.

## CRITÉRIOS DE ACEITE

- CA-001: um comando gera os dois arquivos com o mesmo manifesto.
- CA-002: a fonte GPT fica abaixo de 60 mil caracteres e contém as versões correntes exigidas.
- CA-003: a exportação completa conserva integralmente todas as fontes Markdown especializadas, além de `AGENTS.md` e `README.md`.
- CA-004: alterar uma fonte faz o checker falhar até regenerar ambos os artefatos.
- CA-005: converter os artefatos entre LF e CRLF não produz falso stale.
- CA-006: documentos e testes declaram papéis, precedência, limites e ausência de sincronização externa.

## PENDENTE

Nenhuma decisão material pendente. Automação futura de upload exige decisão própria de integração, autenticação, custo e operação.
