# Prompt de Execução — M7.2 Perfil de Competências e Evidências

Contrato congelado: `docs/qa/agreement-m72-person-professional-evidence.md` 1.0.0. Baseline: `f02ac17`. Data: 2026-09-18.

## Entendimento obrigatório antes da execução

Implementar D-01 a D-20 e D-UX-01 a D-UX-05. P-01 a P-10 e P-UX-01/P-UX-02 não podem ocorrer. F-01 a F-03 permanecem fora de escopo. A-01 a A-03 delegam somente o modo de implementação.

## Fronteira

O movimento projeta o Perfil publicado vigente e resultados M5.1 já existentes sobre os conceitos e agrupadores publicados usados pelo M7.1. A projeção é somente leitura, tenant-scoped e versionada. Declaração, contexto e demonstração coexistem; apenas demonstração direta ativa, vigente e suficiente produz estado verificado.

A UI implementa Resumo, Competências, Evidências, explicação e abertura da origem. Os três arquivos de imagem fornecidos na solicitação são alvos normativos de arquitetura visual; seus nomes, pessoas, textos, datas e números são exemplos, não dados do produto. A comparação deve usar componente real, fixture sintética, mesmo estado e viewport equivalentes.

## Provas exigidas

- Domínio: contrato conhecido, tenant/Pessoa corretos, múltiplas naturezas, demonstração válida e inválida, ambiguidade neutra.
- Banco: Perfil vigente publicado, Knowledge publicada, M5.1 válida/inválida, outro tenant, membro, inativo e anônimo, todos em base local descartável com rollback.
- UI: três superfícies em desktop, empilhamento móvel, filtros, detalhes, origem, explicação, foco e estados recuperáveis.
- Regressão: versões de matching e score inalteradas; nenhum requisito de Posição na projeção; nenhuma dependência nova.
- Fechamento: owners, ADR, AoT, Context Pack, Prisma v1.7.2, commit e push do branch, sem deploy/merge/produção.
