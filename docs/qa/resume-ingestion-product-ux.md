# Evidência de QA: jornada de ingestão e publicação Delta

## Escopo

Validar `resume-product-state` 1.1.0, `document-presentation` 2.1.0, `operation-feedback` 2.0.0, `profile-publication-delta` 1.1.0 e a jornada de seis telas sem alterar autenticação, IA, matching ou produção.

## Matriz funcional

1. Importação preserva o PDF antes de resolver a Pessoa e explica privacidade, formatos e etapas.
2. Identificação usa somente contato e nome, mostra candidatos do tenant e exige decisão explícita de vincular ou criar.
3. Processamento apresenta progresso e fatos do arquivo; tentativas permanecem em detalhes técnicos.
4. Análise diferencia conteúdo recuperado, revisão humana e falha técnica, oferecendo revisão quando existe fonte útil.
5. Revisão M5 mantém PDF à esquerda, campos e evidências à direita, origem por campo e salvamento sem publicação.
6. Delta compara perfil vigente e proposta; omissão aparece como `Não citado` e preserva o fato.
7. Remoção só entra na publicação com confirmação e motivo humanos.
8. Publicação retorna à Central da Pessoa, com a nova versão e fonte identificáveis.
9. Reprocessamento aparece somente para falha técnica recuperável.
10. Perfil pode ser publicado sem competências; inferências e recomendações não se tornam fatos aprovados.
11. Aplicação adaptativa valida o draft normalizado e envia `detected = strong + possible + rejected`; irmãos já completos permanecem apenas como contexto não aplicável.
12. Evidência, refinamento, classificação acadêmica, arquivamento e publicação exibem causa sanitizada, preservação e ação de recuperação específica.
13. Falha de recarga após confirmação remota não afirma que a mutação falhou e não convida a repeti-la.
14. Processamento orienta manter a página aberta enquanto a sessão cliente conclui a estruturação; falha reutilizável oferece retry e falha sem fonte útil oferece substituição.
15. O modal de remoção continua aberto após falha de publicação, com erro contextual e retorno direto à revisão.
16. Revisão histórica é sincronizada automaticamente antes do Delta; fatos já aprovados do perfil-base entram no contrato atual sem reclassificação acadêmica inventada.
17. O Delta lista todas as pendências conhecidas e troca `Publicar` por `Revisar pendência`; a ação retorna ao campo exato, rola a tela e aplica destaque visual.
18. Erro corrigível do servidor contém `reason`, `fieldPath` e item no envelope `operation-feedback-2.0.0`; falha interna afirma explicitamente que nenhum campo precisa ser corrigido manualmente.
19. Toda fronteira Supabase usa o tradutor operacional central; respostas controladas de Edge Functions são lidas e traduzidas, e nenhuma mensagem técnica bruta pode ser lançada diretamente por um service.
20. Contato permanece visível no Delta como atualização do cadastro privado, sem seletor de ação nem envio em `p_block_decisions`; título, resumo, listas e registros profissionais continuam produzindo decisões normalmente.

## Evidência determinística

- `tests/resumeProductState.test.ts` cobre os sete estados e a extração parcial.
- `tests/profileDelta.test.ts` cobre primeira publicação, atualização, manutenção, omissão, identidade estável, remoção explícita e a exclusão de contato privado das decisões de bloco sem retirá-lo da comparação.
- `tests/profilePublicationDeltaMigration.test.ts` cobre RLS, DML revogado, autoridade única, recuperação de tentativa útil e integração das seis telas.
- `tests/reviewOperationErrors.test.ts` cobre categorias, mensagens sanitizadas e recuperação representativa para evidência, aprendizado, classificação, publicação, arquivamento, transporte, M5.1A/B/C e Conhecimento; também varre os services Supabase e falha diante de qualquer lançamento direto de mensagem do backend.
- `tests/resumeInterruptionUx.test.ts` protege preflight, confirmação remota versus falha de recarga, modal de publicação e ausência de mensagens técnicas cruas.
- O gate final `pnpm run validate` deve cobrir lint, fundação, Context Pack, dois typechecks, build web, testes técnicos, golden tests e demonstração `VERTICAL_SLICE_OK`.

## Evidência conectada no Prisma-QA

- Migrations `20260831230000` a `20260901000000` aplicadas somente em `Prisma-QA`.
- Helper de mesclagem preservou experiência e competência omitidas; a mesma prova removeu somente chaves explicitamente confirmadas.
- `anon` não executa publicação; `authenticated` executa `publish_profile_review` e não executa a primitiva legada.
- Super Admin publicou em transação e comprovou Perfil v2 antes do rollback; Member e ator sem escopo foram negados.
- A prova de remoção criou uma linha no ledger e retirou somente o item indicado antes do rollback.
- Todas as transações de prova foram revertidas e deixaram zero perfis, eventos, operações ou remoções residuais.

## Smoke visual exigido

Validar no navegador interno, usando a sessão autenticada já salva, em `1920x1080`, `1600x900`, `1440x900`, `1366x768` e `390x844`. Conferir ausência de sobreposição, corte, rolagem horizontal global e controles inacessíveis nas seis etapas. A revisão deve preservar o workspace M5; o Delta deve manter ação, resumo e classificação legíveis no viewport móvel. Não publicar dados reais durante o smoke.

## Resultado do smoke

O navegador interno autenticado validou Importação, Revisão M5 e Delta nos cinco viewports, totalizando 15 combinações. A auditoria final registrou zero overflow horizontal global, zero botão fora do viewport e zero erro de console. A primeira passagem revelou largura intrínseca indevida nos controles da revisão e do Delta em `390x844`; o CSS foi corrigido e a matriz integral foi repetida com sucesso. Identificação, Processamento e Análise compartilham o mesmo componente de jornada e foram cobertos por contrato e build, mas não foram alimentados com um novo arquivo para evitar criar resíduo documental no QA. A revisão real permaneceu `draft` e o botão de publicação não foi acionado.

Os advisors não apontaram ausência nova de RLS. `publish_profile_review` aparece no aviso esperado de função `security definer` executável por autenticado; a exposição é intencional, com autorização interna, `search_path` vazio, lock e DML direto revogado. O índice da nova foreign key de ator foi acrescentado em `profile_publication_removals_actor_idx`; os demais avisos de performance são históricos do projeto.

Em 2026-09-02, a migration `20260902213000_actionable_review_errors_and_legacy_publication` foi aplicada ao Prisma-QA. Prova transacional com rollback confirmou: IDs estáveis para experiência e formação históricas, classificação acadêmica histórica preservada como `unknown` sem invenção, proposta legada mantida como pendente, payload final aceito pelo contrato vigente, envelope `operation-feedback-2.0.0` com item e campo exatos e execução das três funções privadas negada a `anon` e `authenticated`. O lint remoto conservou somente o erro histórico de cast em `public.enqueue_knowledge_observation`, sem erro novo deste movimento.

O smoke autenticado abriu o Delta real, exibiu simultaneamente as duas pendências conhecidas em linguagem natural, substituiu o CTA de publicação por `Revisar pendência` e mostrou `v4 aguardando revisão`. `Revisar o campo` retornou à revisão, rolou até `Nome completo`, aplicou borda e fundo de erro e deixou a entrada pronta para edição. Nenhum perfil foi publicado no smoke.
