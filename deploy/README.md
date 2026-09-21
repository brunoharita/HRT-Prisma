# Deploy web do Prisma

## Estado atual

M7.2 v2 publicado em 2026-09-18: Prisma v1.7.5, runtime `a6a0bc5`, migrations remotas `20260918163719`, `20260918163736` e `20260918164009`. Main/GitHub/VPS sincronizados; somente `prisma-web` foi reconstruído com baseline + Parser IA hosted. Imagem ativa `sha256:e7280c2e28419cb62a8109ce807815b48fe749de872d0d1b382cec63bf0a8c01`; rollback `prisma-web:rollback-before-m72v2-20260918`. HTTPS e smoke autenticado read-only nas três superfícies PASS; detalhes e limites no AoT M7.2 v2.

M7.4 publicado em 2026-09-18: Prisma v1.7.4, runtime `98bdf9c`, migration remota `20260918134315_m74_contextual_competency_curation`. Main/GitHub/VPS sincronizados; baseline + Parser IA hosted preservados; ativação restrita a `up -d --no-deps prisma-web`. Rollback `prisma-web:rollback-before-m74-20260918`. HTTP e smoke autenticado de painel/cancelamento PASS; detalhes e limites no AoT M7.4.

O frontend público do Prisma está hospedado em VPS Hostinger KVM 2, com Ubuntu 24.04, Docker, Traefik e Nginx.

Endpoint público:

https://prisma.hrtsolutions.com.br

O frontend utiliza o único backend Supabase remoto atual, projeto `ioldpnqqvobprjiontre` (nome atual Prisma; Prisma-QA é rótulo histórico). Esse é o ambiente de produção, não uma homologação separada.

Rollout M7.2 de 2026-09-18: main/Hostinger no commit `8f7473a`, migration registrada como `20260918081743_m72_person_professional_evidence` e Prisma v1.7.2 ativo. O build preservou `VITE_DOCUMENT_INTELLIGENCE_MODE=baseline` e `VITE_PARSER_IA_MODE=hosted`; somente `prisma-web` foi recriado. Recuperação web: `prisma-web:rollback-before-m72-20260918`. Evidências e limites no AoT M7.2.

Rollout M7.1 de 2026-09-18: checkout da VPS em main, frontend construído de `bc782fe`, migration aplicada antes da UI, smoke autenticado read-only aprovado. Recuperação web: `prisma-web:rollback-before-m71-20260918`. Preserve `VITE_DOCUMENT_INTELLIGENCE_MODE=baseline` e `VITE_PARSER_IA_MODE=hosted` em rebuild; não reinicie gateway/workers para uma alteração exclusivamente web. Evidências no AoT M7.1.

## Arquitetura

Internet
-> DNS Registro.br
-> Traefik :443
-> container prisma-web
-> Nginx
-> React/Vite
-> Supabase remoto

O Traefik é responsável pelo roteamento HTTPS e certificado Let's Encrypt.

## Variáveis de build

Devem existir fora do Git:

- VITE_SUPABASE_URL
- VITE_SUPABASE_PUBLISHABLE_KEY
- VITE_DOCUMENT_INTELLIGENCE_MODE
- VITE_DOCUMENT_INTELLIGENCE_TIMEOUT_MS
- VITE_PARSER_IA_LOCAL
- VITE_PARSER_IA_MODE (`hosted` por padrão no rollout; `disabled` somente em rollback explícito)

Nunca colocar service role, OpenAI API key ou outro secret server-side em variável VITE_*.
Se o campo não existir em `.env.production`, o `docker-compose.yml` assume `hosted` para não publicar uma tela que bloqueia a importação antes do envio. O modo hosted depende do gateway autenticado e do túnel reverso/worker loopback ativos; sem eles a chamada falha de forma explícita e sanitizada.

O arquivo operacional atual é .env.production, ignorado pelo Git.

## Build

    docker compose \
      --env-file .env.production \
      -f deploy/docker-compose.yml \
      build prisma-web

## Publicação

    docker compose \
      --env-file .env.production \
      -f deploy/docker-compose.yml \
      up -d

## Smoke

    docker ps
    curl -I https://prisma.hrtsolutions.com.br

Além do HTTP 200, validar no navegador:

1. certificado HTTPS válido;
2. tela de login;
3. autenticação;
4. carregamento da Home.

## Atualização

Antes de publicar uma nova versão:

    git pull --ff-only

    docker compose \
      --env-file .env.production \
      -f deploy/docker-compose.yml \
      build prisma-web

    docker compose \
      --env-file .env.production \
      -f deploy/docker-compose.yml \
      up -d

Executar smoke depois do rollout.

## Rollback

Preservar a imagem anterior até o smoke da nova versão concluir.

Em caso de falha, voltar para a imagem ou commit anteriormente validado e recriar o container.

A VPS possui snapshot operacional criado após o primeiro deploy público validado em 2026-09-15.

## Pipeline temporário de importação

Desde a decisão temporária de 2026-09-17, o frontend usa o fluxo PDF.js nativo -> Parser IA -> revisão humana. A importação deve ser construída com `VITE_DOCUMENT_INTELLIGENCE_MODE=baseline` e o código ativa `nativeOnlyForParserIa`; isso impede chamadas Paddle e o carregamento do Tesseract na importação automática sem remover as integrações. O Parser IA continua passando pelo gateway autenticado, socket Unix e SSH reverso; a chave OpenAI permanece somente no worker loopback do PC. Consulte `docs/operations/paddle-document-intelligence.md` e `docs/qa/aot-production-resume-quality-pipeline.md`.

Antes de rebuild, preserve a imagem web anterior para rollback e confirme a chave publicável/URL do Supabase único fora do Git. Durante o teste atual, use `VITE_DOCUMENT_INTELLIGENCE_MODE=baseline` e `VITE_PARSER_IA_MODE=hosted`. Não use `enabled` ou `shadow` até nova decisão explícita do Product Owner. Os serviços Paddle podem permanecer instalados e o gateway continua necessário para o Parser IA.

Rollout de 2026-09-17: bundle construído do commit `9dfa4d4` com `baseline` + Parser IA `hosted`. Imagem anterior preservada como `prisma-web:rollback-before-baseline-20260917`. Reativar Paddle exige decisão explícita, novo build e smoke; não alterar apenas containers locais.
