# Evidência M5.4: Vagas

- Data: 2026-09-04
- Ambiente: local e Prisma-QA `ioldpnqqvobprjiontre`
- Branch: `codex/m5-4-vacancies`
- Produção: não acionada

## Evidência de banco

Migrations aplicadas no Prisma-QA:

- `20260904225430_m54_vacancy_intelligence`;
- `20260904225609_m54_vacancy_policy_hardening`;
- `20260904230236_m54_vacancy_fk_indexes`;
- `20260904230921_m54_vacancy_position_status_guard`.

`supabase/qa/m54_vacancy_intelligence_verification.sql` foi executado em transação revertida e confirmou:

- criação da definição v1 e atualização para v2 sem reescrever o snapshot anterior;
- identidade estável de requisitos e relação Figma/UX específica da versão;
- posição ocupada vinculada a uma Pessoa ativa do mesmo tenant;
- rejeição de conceito relacionado inválido;
- rejeição de posição `planned` como Vaga sem alterar o enum legado do organograma;
- `anon` sem execução da RPC;
- `authenticated` sem INSERT direto em versões.

Resultado final: `first_version=1`, `preserved_versions=2`, `anonymous_save_denied=true` e `direct_version_insert_denied=true`.

O advisor de performance encerrou sem achado novo de chave estrangeira sem cobertura. O advisor de segurança mantém somente o aviso esperado de RPC `security definer` executável por `authenticated`; a execução é intencional e protegida por checagem de ator, tenant e papel, `search_path` vazio, grant explícito e testes negativos.

O gate `pnpm run validate` aprovou lint de 322 arquivos, fundação, Context Pack, dois typechecks, build web, 249 testes técnicos, 19 casos golden e demonstração `VERTICAL_SLICE_OK`.

## Ajustes pontuais M5.4

O refinamento posterior preserva o schema e as migrations ativas. A interface passa a pedir somente requisito e importância; a classificação técnica continua interna e não limita o matching. Testes determinísticos confirmam que uma categoria interna incompatível não impede evidência em experiência, competências, conhecimentos, ferramentas, formação, certificações, idiomas, áreas personalizadas e Knowledge, e que a explicação lista as áreas encontradas.

O Contexto da vaga usa texto aberto opcional, ajuda humana e placeholder de cenário. A estruturação determinística deixa mercado, tecnologia e experiência no bloco de requisitos e propõe como contexto somente situações da área ou posição. O Assistente Prisma aceita pergunta livre, consulta Vagas, funções e Knowledge permitidas, separa `Na sua empresa`, `No mercado` e `Sugestão do Prisma`, e declara quando a Web não foi consultada. Ações continuam humanas. Naquele ajuste, a pesquisa externa ainda permanecia no Knowledge Agent existente e bloqueada enquanto flag, modelo, secret e orçamento não estivessem ativos; a ativação parcial posterior está registrada em M5.4.2.

O novo gate completo aprovou 322 arquivos no lint, fundação, Context Pack, dois typechecks, build web, 252 testes técnicos, 19 casos golden e `VERTICAL_SLICE_OK`. O smoke autenticado no navegador interno confirmou ausência de categoria e taxonomia no editor, requisito mais importância como únicas entradas, help e texto livre no Contexto da vaga, pergunta aberta e resposta nos três blocos. Nenhuma Vaga foi salva e o rascunho sintético do navegador foi limpo. O viewport do harness permaneceu fixo; responsividade adicional foi revisada no CSS e no build.

## Web Search contextual M5.4.2

A migration `20260904235900_m54_vacancy_advisor_web_search` foi aplicada no Prisma-QA. Ela criou `vacancy_advisor_research_runs` com RLS, DML direto revogado, índices tenant/fingerprint e catálogo Web ampliado com O*NET Online, BLS, CNCF, GitHub Octoverse e Stack Overflow Developer Survey. O advisor apontou a foreign key de ator sem cobertura; a migration complementar `20260905023000_m54_vacancy_advisor_actor_index` foi então aplicada e eliminou o alerta. Os três avisos restantes para a tabela são apenas índices ainda sem uso porque nenhuma pesquisa foi executada. A Edge Function `knowledge-agent` v5 está ativa em QA com JWT obrigatório e modo `vacancy_advisor`.

A pergunta `Quais são as linguagens mais utilizadas atualmente no desenvolvimento de sistemas em cloud?` agora é classificada como dependente de atualidade. O frontend chama Web Search server-side, mostra `Web pesquisada agora`, síntese, recomendação, ressalvas e fontes clicáveis. O payload externo contém apenas pergunta, título, área, idioma e data; nenhuma Pessoa, Perfil, organização ou descrição interna é enviada.

Modelo `gpt-5.6-luna`, flag, 10 pesquisas/dia, 100/mês, cooldown de 24 horas e opt-in da organização `Prisma` estão configurados em QA. O inventário de secrets confirmou que `OPENAI_API_KEY` ainda não existe. Por isso, a compilação e o rollout do boundary estão ativos, mas o smoke vivo do provider permanece bloqueado de forma fechada até o secret ser cadastrado no cofre do Supabase.

O gate final `pnpm run validate` aprovou lint de 324 arquivos, fundação, Context Pack, dois typechecks, build web, 254 testes técnicos, 19 casos golden e `VERTICAL_SLICE_OK`.

## Smoke autenticado

Na sessão Super Admin já existente, o navegador interno em `1280x720` validou:

1. lista com busca, situação, área e ação contextual;
2. Nova vaga com rascunho local, blocos estruturados, requisito obrigatório/desejável e pergunta pontual;
3. estruturação livre determinística, itens explícitos selecionados e `Liderança de equipes` derivada inicialmente desmarcada;
4. detalhe editorial com missão, responsabilidades, resultados, requisitos, contexto e versão;
5. Pessoas encontradas com motivo, evidências e `Sem evidência suficiente`;
6. comparação de exatamente duas Pessoas, por requisito, sem score e sem vencedor.

A Vaga sintética `[QA M5.4] Engenharia de Software` foi criada pela interface, encontrou três Perfis por SQL/React e foi removida ao final junto com a posição e a função exclusivas verificadas. Nenhum registro sintético M5.4 permaneceu.

O harness de browser disponível nesta execução manteve viewport fixa em `1280x720`. Os breakpoints `1100`, `760` e `420`, a tabela móvel empilhada e o bloqueio de overflow global foram revisados em código e cobertos pelo build; capturas reais adicionais em `1440x900`, `768x1024`, `390x844` e `360x800` permanecem uma limitação explícita desta rodada.

## Limitações operacionais

O dry-run do Supabase CLI continua bloqueado pela divergência histórica já existente entre aliases de migration locais e versões registradas no projeto remoto. Nenhum `migration repair` foi executado. As migrations M5.4 foram aplicadas pela API oficial do projeto, registradas no histórico remoto e verificadas diretamente.

O único bloqueio da chamada Web viva é a credencial `OPENAI_API_KEY`, que não deve ser enviada em chat nem gravada no repositório. Produção não foi acionada.
