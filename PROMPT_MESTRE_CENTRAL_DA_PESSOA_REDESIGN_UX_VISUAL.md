# Prompt de execução: Central da Pessoa

- Versão editorial: 2.0.0, 2026-09-11.
- Estado: referência de execução sob demanda; esta revisão não autoriza executar novamente o redesign.
- Aprovação da reorganização: Bruno solicitou aplicar os itens 20–25 da auditoria de instruções em 2026-09-11.
- Fonte histórica integral: este mesmo caminho no Git `7cfd22bc963c2abc49d9242156c7f53c9c799778` (seções 0–125).
- Especificação incorporada: `docs/product/person-center-redesign-spec.md`, versão editorial 2.0.0. Ler integralmente ao receber autorização para executar este prompt.
- Produto vigente: `docs/product/person-center.md`. Decisões posteriores aprovadas prevalecem sobre esta referência histórica; não regredir capacidades já entregues.

## Objetivo e leitura

Entregar em um movimento coeso a Central como espaço de conhecimento e ações: pendência acionável, Perfil vigente preservado, conhecimento profissional, documentos/versões e histórico. Preservar CP-01 a CP-12, proibições, autonomia e critérios de aceite da especificação incorporada.

Inspecionar Git e preservar mudanças existentes. Aplicar `AGENTS.md` já carregado, sem releitura automática. Ler a especificação e o contrato da Central; consultar as seções pertinentes do Current State quando precisar verificar disponibilidade. Inspecionar Central, rotas, derivação de estados, adapter e componentes/tokens usados. Consultar contratos de revisão, publicação Delta, autorização e evidência nas fronteiras afetadas, sem leitura geral do repositório.

Inventariar os recursos condicionais como existentes, indisponíveis ou não verificados. Não tratar a lista histórica como prova atual. Um conflito material com decisão aprovada exige explicação e decisão do Product Owner antes de alterar a regra.

## Referências visuais

A: visão geral com uma pendência; B: documentos/versões; C: conhecimento profissional; D: múltiplas pendências. As quatro imagens originais foram referidas como anexos e não têm caminhos versionados identificados neste documento. As imagens do artigo sobre skills não são referências deste redesign.

Na execução do redesign, recuperar os quatro anexos da tarefa original ou solicitar as referências faltantes. Registrar caminhos/IDs reais no acordo. A ausência impede afirmar equivalência visual, mas não autoriza inventar referências ou eliminar esse critério. Continuar trabalho independente já autorizado.

## Execução e validação

Reutilizar a arquitetura. A ordem interna de diagnóstico, composição, pendências, layout, documentos, acabamento e testes é delegada; a entrega deve ser completa, sem microentregas que deixem requisitos obrigatórios pendentes.

Executar a matriz da especificação: testes de estados/CTA/preservação/autorização, cinco viewports e smoke autenticado com dados sintéticos/QA autorizados. Rodar typecheck/build afetados; atualizar owners, Current State somente após prova, Context Pack e exportação gerada.

```powershell
pnpm run generate:prisma-context
pnpm run check:prisma-context
```

A existência deste arquivo não pré-autoriza validação integral. Se o risco transversal não for coberto pelas verificações focadas, explicar e obter autorização específica. Somente então, em PowerShell:

```powershell
$env:CI = 'true'
pnpm run validate
```

Frontend permanece local no escopo original. Backend/migration realmente necessários seguem local → Prisma-QA, sem produção. Nova decisão material exige aprovação antes de implementação.

## Fechamento

Usar AoT relacionando CP-* a implementação, teste, evidência, ambiente e limite. Relatar mudanças em UX, pendências suportadas, CTA, Perfil/documentos, componentes/mobile, backend e provas sem repetir o prompt. Não concluir com requisito ou prova obrigatória ausente, incluindo equivalência visual. Registrar comandos efetivamente executados; não presumir `pnpm run validate`.
