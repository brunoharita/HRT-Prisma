# Prompt de execução — M6.1 Pontuação de matching

Versão 1.2.0. Contrato normativo integral: `docs/qa/agreement-m61-matching-score.md` 1.2.0. Movimento e adendo de matching autorizados pelo Product Owner em 2026-09-14.

Implementar D-001 a D-026 e provar P-001 a P-016 sem ampliar F-001 a F-012. A autonomia A-001 a A-008 cobre encaixe técnico, extensão compatível do resultado existente, função pura, componentes compartilhados, testes, relatório sombra e versionamento.

O adendo aprovado implementa D-027 a D-029 e prova P-017/P-018: inclusão manual sincroniza apresentação e valor `required`; rascunho assistido exige classificação; frontend e `save_vacancy_definition` rejeitam nova versão com `unclassified`; leitura histórica permanece compatível. Aplicar migration forward-only no Prisma-QA e criar a nova versão da Posição `Analista de Marketing` classificando como obrigatórios apenas `RD Station`, `2 anos de experiência comprovada na área` e `Office`, preservando os dois desejáveis.

O adendo 1.2.0 implementa D-030 a D-034 e prova P-019 a P-021: procurar o termo do requisito em todo conteúdo profissional publicado, independentemente da categoria; exigir limite lexical e excluir negação; preservar fonte/trecho; deixar requisito com nível parcial até comprovação; aceitar equivalência canônica publicada sem barreira de grupo. Reproduzir o caso de Bruno com SAP na descrição da experiência e avançar o matching para 4.0.0 e o produto para v1.6.2.

Ordem de execução: diagnóstico do matching 2.3.0; domínio puro; integração posterior à descoberta; agrupamento e ordenação; UI com progressive disclosure; relatório sombra; validações proporcionais de risco D; documentação, Context Pack e AoT.

Não criar persistência/cache de score, chamada de IA, round trip de banco dentro do cálculo, provider, cutoff, faixa semântica ou produção. O adendo 1.2.0 não autoriza migration, reclassificação de Perfil ou remoção dos grupos. Evidência Demonstrada é carregada na fronteira tenant-scoped e consumida somente por vínculo exato e versões reconhecidas. O cálculo não recebe PII.

Fechar em `docs/qa/aot-m61-matching-score.md`, distinguindo prova local, QA, smoke visual e produção.
