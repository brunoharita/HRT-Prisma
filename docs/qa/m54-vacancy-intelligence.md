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
