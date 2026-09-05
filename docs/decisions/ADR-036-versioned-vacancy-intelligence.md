# ADR-036: Vaga versionada como necessidade profissional

- Status: accepted
- Data: 2026-09-04
- Risco: E, mudança integrada de domínio, matching, autorização, persistência e UX

## Contexto

O schema já distinguia função, posição e Vaga, e o Prisma já possuía Perfis publicados, Knowledge e descoberta explicável. Faltava tornar a Vaga uma definição operacional completa, preservar a versão usada em cada comparação e representar posições ocupadas sem transformá-las em campanhas de recrutamento.

## Decisão

Estender a fundação existente com snapshots imutáveis de Vaga, requisitos estáveis por versão, relações específicas confirmadas e ocupante opcional da posição. Toda escrita passa pela RPC tenant-scoped. A busca reutiliza profile-discovery e Knowledge; o operador informa somente requisito e importância, enquanto a categoria técnica permanece interna e não restringe as áreas consultadas no Perfil. Sinais relacionados não se tornam equivalência canônica nem atendem automaticamente um requisito. O assistente contextual reaproveita Vagas, funções e Knowledge acessíveis, e qualquer pesquisa Web permanece no Knowledge Agent governado. A interface cobre as seis superfícies do M5.4 e proíbe score, ranking e vencedor.

## Alternativas avaliadas

- Tratar Vaga como `job_role`: rejeitado porque apagaria variações contextuais da mesma função.
- Criar um módulo ATS ou entidade de anúncio: rejeitado por ampliar o escopo e confundir necessidade profissional com recrutamento.
- Reescrever o matching no banco: rejeitado porque duplicaria a fundação explicável já existente.
- Tornar relações locais aliases da Knowledge: rejeitado porque uma decisão específica da Vaga não tem autoridade ontológica global ou organizacional.
- Usar um provedor generativo externo para estruturar descrições: adiado por custo, privacidade e ausência de necessidade no piloto determinístico.

## Consequências

- Vaga, posição, função e referência ocupacional permanecem distintas.
- Alteração material cria nova versão e avaliações futuras apontam para ela.
- Relações Figma/UX e equivalentes exigem confirmação e ficam limitadas à versão.
- Cada requisito é procurado em todo o Perfil publicado e a explicação identifica as áreas que sustentam a evidência.
- Contexto da Vaga descreve cenário e desafio em texto livre; requisitos profissionais permanecem no bloco próprio.
- O assistente não altera Vaga ou Knowledge automaticamente e não apresenta pesquisa de mercado como realizada quando o Knowledge Agent está desativado.
- `member`, `anon` e outro tenant não recebem acesso às Vagas ou avaliações.
- O histórico cresce de forma append-only; paginação e retenção podem ser otimizadas quando o volume real justificar.

## Rollback

Revogar a RPC e ocultar as rotas interrompe novas escritas. Colunas e tabelas são aditivas; snapshots já emitidos permanecem evidência histórica e não devem ser apagados durante rollback funcional.

## Evidência

- migrations `20260904222624_m54_vacancy_intelligence.sql`, `20260904225612_m54_vacancy_policy_hardening.sql`, `20260904230234_m54_vacancy_fk_indexes.sql` e `20260904230903_m54_vacancy_position_status_guard.sql`;
- prova revertida `supabase/qa/m54_vacancy_intelligence_verification.sql`;
- testes determinísticos `tests/vacancyIntelligence.test.ts`;
- smoke responsivo das seis superfícies sem mutação de produção.
