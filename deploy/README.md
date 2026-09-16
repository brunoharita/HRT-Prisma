# Deploy web do Prisma

## Estado atual

O frontend público do Prisma está hospedado em VPS Hostinger KVM 2, com Ubuntu 24.04, Docker, Traefik e Nginx.

Endpoint público:

https://prisma.hrtsolutions.com.br

O frontend utiliza o único backend Supabase remoto atual, Prisma-QA. Não existe ainda projeto Supabase separado de produção.

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
- VITE_PARSER_IA_MODE (`hosted` no rollout autorizado; `disabled` no rollback)

Nunca colocar service role, OpenAI API key ou outro secret server-side em variável VITE_*.

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

O frontend usa o fluxo PDF.js -> gate semântico -> Paddle quando necessário -> Parser IA -> revisão humana. Paddle e Parser IA passam pelo mesmo gateway autenticado, socket Unix e SSH reverso; a chave OpenAI permanece somente no worker loopback do PC. Consulte `docs/operations/paddle-document-intelligence.md` e `docs/qa/aot-production-resume-quality-pipeline.md`.

Antes de rebuild, preserve a imagem web anterior para rollback. O compose inclui `paddle-gateway`; use `build` sem limitar ao serviço web para construir ambos, e confirme a chave publicável/URL do Supabase único fora do Git. Ative `VITE_DOCUMENT_INTELLIGENCE_MODE=enabled` e `VITE_PARSER_IA_MODE=hosted` somente no rollout autorizado e depois de verificar os três workers loopback. Os defaults continuam fechados.
