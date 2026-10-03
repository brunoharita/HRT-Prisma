# Operação do Parser IA na KVM2

Versão de implantação `parser-ia-kvm2-1.0.0`; acordo `../qa/agreement-parser-ia-kvm2.md` 1.0.0 e ADR-075. A importação automática usa PDF.js → Parser IA → revisão. Paddle/Tesseract não são reativados. A versão dos dados, prompt, modelo e transporte continuam iguais.

## Caminho e proteção

`Browser → HTTPS/Traefik → Nginx → socket Unix do gateway → 127.0.0.1:18787 na KVM2 → OpenAI`.

O container `prisma-parser-ia` é singleton, Node 22, usuário `node` UID 1000, rede host Linux, escuta somente loopback. O gateway mantém auth/tenant/papel/origem/contrato e usa o Host lógico 8787 previamente validado pelo Parser. O worker não tem rota Traefik ou portas públicas. Cache novo fica em `deploy_parser-ia-cache`, com pasta 700 e arquivos 600; não é importado do PC. Lock em tmpfs privado é volátil, cache é persistente. Uma única inferência por vez, sem retry automático.

O secret é um arquivo contendo somente `OPENAI_API_KEY=...`, em `/etc/prisma/parser-ia.env`; diretório host root 700, arquivo UID 1000/mode 400. Compose monta esse arquivo somente em `/run/secrets/parser_ia_env`. Nunca copiar `.env.local` inteiro, chave para build/env do container, PDF ou cache do PC. Nunca exibir valor por `cat`, `docker inspect` completo, logs ou shell tracing. Compose faz bind mount; ownership/permissões reais da origem precisam permitir leitura pelo UID 1000. Nenhum service role é necessário.

## Publicar e verificar

Após promover o SHA validado e avançar `/opt/prisma` por fast-forward, executar na KVM2:

```bash
bash deploy/release-parser-ia.sh SHA_VALIDADO_COMPLETO
docker inspect --format '{{.State.Status}} {{.State.Health.Status}} {{.RestartCount}}' prisma-parser-ia
docker exec prisma-parser-ia node scripts/check-parser-ia-hosted.mjs
```

O script constrói/inicia somente `parser-ia`, preserva imagem anterior quando existente e não recria web/gateway/Traefik. Healthcheck permite `available/ready` ou `busy/worker_busy`; não chama a OpenAI, não cria cache nem reserva capacidade. Um resultado disponível não prova saldo/validade remota da chave, qualidade de resposta futura ou sucesso de um currículo.

Docker reinicia o container após falha e na inicialização do daemon (`unless-stopped`); depois de parada/recriação, tmpfs novo evita lock residual. Nenhum PDF interrompido é reexecutado. Fazer restart somente sem operação ativa. Cache inválido continua falhando fechado; não apagar cache para liberar uma tentativa. Conferir HTTPS e os mesmos IDs/imagens dos serviços preservados.

## Rollback e limites

Primeira implantação: parar somente `parser-ia` se houver risco; gateway informa indisponibilidade. Preservar volume e secret. Revisões posteriores mantêm tag `prisma-parser-ia:rollback-before-SHA12`. Não remover volumes/modelos alheios ou voltar silenciosamente ao PC. Ponte SSH é histórico do piloto e não atende ao objetivo online.

Limites iniciais: 768 MiB RAM, 1 CPU, 64 PIDs; concorrência unitária e todos os limites do Parser existentes. Sem GPU: a inferência do modelo ocorre na OpenAI. A persistência/revisão permanecem no Supabase autorizado. Smoke sintético pode validar o processamento sem banco; uma importação humana até revisão continua evidência distinta. Histórico de implantação e resultados ficam em `../qa/aot-parser-ia-kvm2.md`.
