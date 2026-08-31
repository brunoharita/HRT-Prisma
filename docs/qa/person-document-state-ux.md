# Evidência de QA: Pessoa, documento e perfil vigente

## Escopo

Validar o contrato `document-presentation` 1.2.0, a navegação centrada na Pessoa, a visualização curricular M5 somente leitura, a recuperação de extração parcial e a invalidação auditável de uma nova importação.

## Cenários determinísticos

1. Perfil v1 aprovado com Documento v2 em `ready_for_review`: Pessoa permanece estável, perfil v1 aparece disponível, Documento v2 mostra `Requer revisão`, a ação é `Revisar nova importação` e nenhuma versão v2 de perfil é inventada.
2. Documento aprovado: estado documental `Processado` e nenhuma comunicação de falha.
3. Tentativa `failed_*`: estado `Falha técnica`, perfil atual permanece independente e a próxima ação indica reprocessar ou substituir.
4. Ausência de documento: `Sem nova importação`, sem pendência inventada.
5. Documento invalidado: `Importação arquivada`, histórico preservado e nenhuma pendência ativa.
6. Clique no nome ou em `Abrir`: rota `/profiles/:personId`, nunca `/edit`.
7. Draft válido sem experiências: revisão pode ser aberta e oferece `Selecionar área no currículo` e `Adicionar experiência manualmente`.
8. Documento com revisão registrada: `Ver documento` abre `/profiles/:personId/documents/:documentId/verification/:reviewId`, com currículo original à esquerda e campos estruturados à direita.
9. Visualização curricular: não exibe salvar, aprovar, adicionar, remover, selecionar área ou alterar evidência; mostra `Somente leitura` e mantém `Detalhes técnicos` como ação separada.
10. Documento sem revisão registrada: a ação é `Detalhes técnicos` e nenhum review ID ou conteúdo estruturado é inventado.
11. Tentativa mais recente vazia não oculta uma tentativa anterior com páginas, caracteres úteis, draft `insufficient` e `insufficient_structured_facts`; a ação é `Recuperar informações`.
12. `start_profile_review` aceita a tentativa parcial recuperável e rejeita tentativa vazia, sem páginas, outro tenant ou operador sem papel de revisão.

Cobertura automatizada: `tests/documentPresentation.test.ts`, além das regressões M2-B, M2-C e M5 existentes.

## Invalidação conectada exigida

No Prisma-QA, executar a migration `20260831022615_invalidate_document_review` e comprovar em transação controlada:

- sessão sem membership e papel `member` não executam a RPC;
- documento aprovado é rejeitado;
- importação revisável cria ou reutiliza revisão antes da invalidação;
- importação tecnicamente falha pode ser invalidada sem criar perfil;
- documento e revisão ficam `invalidated` quando aplicável;
- `professional_profiles` atual permanece com o mesmo ID e versão;
- `document_operations` e `person_ingestion_events` registram somente IDs e flags metadata-only;
- replay idempotente não duplica evento;
- nenhuma linha é apagada.

Os dados de prova devem ser sintéticos e revertidos ao final.

## Smoke visual autenticado

Validar em desktop e viewport estreito:

- cards, busca, filtros e quatro colunas da tela Pessoas sem esmagamento;
- legenda, cinco métricas e sete colunas da central operacional com rolagem interna;
- banner, ações, resumo, histórico e tabela `Documentos e versões` da Central da Pessoa;
- `Ver documento` abrindo o workspace M5 lado a lado em modo somente leitura, sem controles de mutação, e `Detalhes técnicos` retornando à página operacional;
- ação primária `Revisar nova importação` e descarte com confirmação explícita;
- alerta de experiência não reconhecida sobre o workspace M5 lado a lado;
- perfil vigente visível e importação problemática contida em seu próprio bloco;
- sidebar, App Shell, organização ativa e permissões sem regressão.

## Estado da evidência

- Implementação local: concluída.
- Testes determinísticos: 109 aprovados; `CI=true pnpm run validate` concluiu lint, fundação, Context Pack, typechecks, build, testes, 19 golden e demonstração.
- Migration Prisma-QA: aplicada como `20260831024503_invalidate_document_review`, com guard complementar `20260831025522_invalidate_document_review_approved_guard`.
- Recuperação parcial aplicada no Prisma-QA como `20260831205547_recover_partial_resume_review`. O documento real `Bruno Harita - Product Owner.pdf` voltou a `ready_for_review`; a tentativa 1 preserva duas páginas, 4.448 caracteres e draft `insufficient`, enquanto a tentativa 2 vazia permanece no histórico e não é usada como fonte.
- Transação revertida com Admin abriu revisão draft sobre a tentativa 1, manteve zero experiências, expôs duas páginas e preservou um Perfil vigente. Tentativa 2 vazia e usuário sem membership foram rejeitados; o rollback deixou zero revisão e zero operação de QA.
- Transações conectadas: aprovadas e revertidas sem resíduo para autorização, documento aprovado mesmo com drift de estado, documento sem Pessoa, revisão, falha técnica, perfil vigente, auditoria e replay.
- Leitura conectada da projeção: os dois documentos aprovados existentes no Prisma-QA possuem revisão aprovada associada; a rota de visualização pode ser resolvida sem schema novo nem inferência de conteúdo.
- Advisors: nenhuma nova policy, tabela ou ausência de RLS; novo aviso restrito à RPC `security definer` intencionalmente executável por `authenticated` e protegida internamente.
- Smoke visual autenticado: a aplicação local abriu corretamente, mas a sessão interna continua expirada e não há Chrome conectado; nenhum bypass, credencial temporária ou login automatizado foi criado.
