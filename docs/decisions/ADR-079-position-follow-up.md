# ADR-079: Acompanhamento operacional por Pessoa e Posição

- Status: accepted pelo acordo v2.2.0 1.0.0
- Date: 2026-10-08
- Owners: Product Owner / engineering / security

## Context / Problem

A descoberta e comparação organizam evidências profissionais, mas não representam o andamento humano de Pessoas selecionadas. Usar decisões contextuais como etapas misturaria evidência e operação e provocaria recálculo indevido. O PO aprovou Lista/Kanban integrado à Posição, arraste e detalhe seguindo o visual do Perfil.

## Decision

Contrato `position-follow-up-1.0.0`: tabelas tenant-owned para processo único por Posição, entradas únicas por Pessoa/processo e histórico transacional. Processo começa somente por inclusão explícita. RPCs autenticadas leem snapshots estáveis e operam somente essas tabelas. Etapa, notas, entrevista e decisão humana não modificam Perfil, Knowledge, ocupação ou score. Revisões otimistas e bloqueio por Posição serializam encerramento/inclusão/alterações. Inclusão exige as versões de Perfil/Posição consultadas.

Reutilizar shell/tokens, Table, Drawer, Select, loading e navegação existentes. HTML Drag and Drop nativo atende desktop; Mover etapa atende teclado/mobile. Sem dependência nova. Lista e quadro usam uma projeção e filtros compartilhados. Mobile seleciona uma coluna e usa detalhe integral.

## Alternatives / Reasons

- Reutilizar matching/decisão contextual: rejeitado por significado, autoridade e invalidação diferentes.
- ATS externo: ampliaria transferência de PII, custo e sincronização sem necessidade neste escopo.
- Biblioteca DnD: útil para futuras necessidades de toque/reordenação; o escopo atual tem quatro destinos e alternativa acessível/mobile, sem reordenação interna. API nativa atende sem dependência.

## Consequences / Risks / Mitigation

Histórico/concurrency exigem persistência nova. Notas podem conter PII e ficam no boundary restrito de Posições; não são publicadas no Perfil. Score indisponível não impede acompanhamento manual nem cria zero. Resultado anterior e referências originais permanecem consultáveis. Leitura não invalida/calcula score; descoberta segue ADR-078.

## Technical / Data / Security and LGPD impact

Migration aditiva20261008120000. PostgreSQL é persistência de produção; JSON é somente fixture determinístico. Chaves compostas impedem relações entre tenants. RLS, grants diretos revogados inclusive service_role; duas RPCs autenticadas com auth.uid(), status ativo e papéis existentes super_admin/owner/admin/recruiter. Assignment não concede acesso. Só idade derivada sai do servidor, sem nascimento/contato/currículo integral. Exclusão definitiva já autorizada de Pessoa limpa entradas/histórico por FK; operações normais não apagam histórico. Encerramento preserva etapas individuais.

## AI / Compatibility

Sem IA nova, alteração de motor/prompt/modelo/fórmula ou custo externo. Snapshots são somente consultados. Contrato desconhecido falha fechado; capacidades/rotas anteriores permanecem.

## Validation / Rollback

SQL sintético local em rollback: permissões/tenant/versões/tipos/conflito/histórico/entrevista/decisão/encerramento e invariância de score/Perfil/Posição. Browser real sintético: arraste/Escape/teclado/falha/conflito/rascunho, Lista/Kanban/mobile e visual. Tipos/build/regressões dirigidas. Backend precede frontend. Rollback web para imagem preservada mantendo tabelas/dados. Não existe QA remoto separado; smoke não grava decisões fictícias.

## Review / Replacement criterion

Reavaliar se o PO aprovar múltiplos processos, arraste por toque, automações, integrações, escala que exija paginação de histórico ou nova autoridade.

## References / Change history

- Acordo `docs/qa/agreement-position-follow-up-v220.md`1.0.0, execução e AoT associados; ADR-078.
- [HTML Drag and Drop API, MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API) e [Database Functions, Supabase](https://supabase.com/docs/guides/database/functions), consultados08/10/2026.
- 2026-10-08: decisão consolidada no escopo autorizado; estado de rollout no AoT.
