# ADR-025: Jornada de currículo e publicação por Delta

- Status: accepted
- Date: 2026-08-31
- Owners: Product, Engineering, Security, QA

## Context

O Prisma já preservava Pessoa, Documento, Tentativa, Rascunho, Revisão e Perfil como entidades distintas, mas o percurso de importação ainda expunha etapas técnicas, condensava estados de maneiras diferentes entre telas e permitia que a aprovação promovesse diretamente o rascunho. Esse último comportamento tornava a omissão de um item no currículo novo ambígua: ela podia parecer uma remoção do conhecimento já aprovado.

## Decision

- A experiência principal possui seis etapas: Importar currículo, Identificação da pessoa, Processamento do documento, Análise do documento, Revisão do currículo e Comparação com o perfil atual.
- O contrato `resume-product-state` 1.1.0 deriva sete estados visíveis a partir dos fatos técnicos: `Processando`, `Requer identificação`, `Requer revisão`, `Pronto para publicação`, `Perfil atualizado`, `Falha técnica` e `Descartado`.
- Extração parcial útil sempre segue para revisão. `Falha técnica` é reservada à ausência de fonte recuperável ou erro real de execução.
- A nova importação é uma proposta. O perfil vigente continua disponível até a publicação atômica de uma nova versão.
- A comparação `profile-publication-delta` 1.0.0 classifica cada fato como adicionado, atualizado, mantido, não citado ou remoção explícita. Não citado preserva o fato aprovado.
- Remoção exige decisão humana explícita, motivo e registro imutável em `profile_publication_removals`.
- `publish_profile_review` é a única autoridade executável pelo cliente para publicar. `approve_profile_review` permanece como primitiva interna sem grant para `authenticated`.
- Competência explícita, normalizada, confirmada por humano e inferida mantêm origem distinta. A publicação não depende da existência de competências.
- Tentativas e detalhes operacionais permanecem disponíveis em consulta técnica, sem dominar a jornada comum.
- O contrato local `operation-feedback` 1.0.0 classifica interrupções como validação, conflito, sessão, autorização, estado desatualizado, indisponibilidade ou falha interna. A mensagem sempre informa preservação e recuperação, sem expor SQL, nomes internos ou payloads.
- O cliente valida o rascunho antes de aplicar aprendizado ou publicar. Falha posterior a uma confirmação transacional é apresentada como atualização de tela incompleta, nunca como mutação não realizada; a interface não incentiva repetição ambígua.
- Recuperação de falha técnica deriva das páginas e dos caracteres úteis preservados. Reprocessar só aparece quando existe fonte reutilizável; nos demais casos a ação é substituir o arquivo.

## Consequences

O operador sempre sabe onde está, o que foi reconhecido, o que depende de ação humana e o que mudará no perfil. O sistema não apaga conhecimento por silêncio documental, não converte limitação de extração em avaliação da Pessoa e mantém proveniência de cada publicação. O custo é uma etapa adicional antes da publicação, um ledger novo e composição server-side do perfil-base com a proposta.

## Security and data

O ledger carrega `organization_id`, RLS tenant-scoped e escrita direta revogada. A RPC usa `SECURITY DEFINER`, `search_path` vazio, autorização interna de revisor, lock otimista e idempotência. Eventos continuam metadata-only. PII privada segue fora de `professional_profiles`.

## Compatibility and versioning

Documentos, revisões e perfis históricos permanecem legíveis. O fluxo cliente antigo de aprovação direta deixa de ser autorizado, portanto `human-profile-review` e `person-ingestion` avançam major. A representação profissional avança major porque a publicação passa a mesclar perfil-base e proposta com remoção explícita auditada. Nenhum prompt, modelo ou contrato de inferência muda.

Em 2026-09-02, a recuperação determinística de falhas avança `resume-product-state` para 1.1.0 e `document-presentation` para 2.1.0, além de introduzir `operation-feedback` 1.0.0. A mudança é compatível e local ao cliente: nenhum estado, payload, grant, RPC ou significado persistido mudou.

## Validation

Testes determinísticos cobrem os sete estados, extração parcial, Delta inicial, atualização, manutenção, omissão e remoção explícita. QA conectado comprova autorização, RLS, mesclagem, idempotência, rejeição cross-tenant e publicação revertida sem resíduos. Smoke autenticado usa o navegador interno nos cinco viewports definidos pela matriz de QA.

## References

- `docs/architecture/document-review-contract.md`
- `docs/architecture/data-model.md`
- `web/src/domain/resumeProductState.ts`
- `web/src/domain/profileDelta.ts`
- `supabase/migrations/20260831230000_profile_publication_delta.sql`
- `supabase/migrations/20260901000000_enforce_profile_publication_boundary.sql`
