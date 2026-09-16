# ADR-058: Ponte temporária do frontend hospedado ao Paddle local

- Status: accepted
- Date: 2026-09-16
- Owners: engineering-operations, security

## Contexto e decisão

PO aprovou túnel SSH reverso temporário e proteção das rotas. Reutilizar OpenSSH, Docker, Nginx, Auth/RLS do Prisma-QA e o adapter Paddle. As rotas relativas atualmente chegam ao Nginx estático, com 405; o build baseline não chama o provider.

PC inicia SSH com duas portas remotas explicitamente 127.0.0.1:18080/18081. Gateway Node em network_mode host acessa essas portas, porém escuta somente socket Unix em volume privado compartilhado com Nginx. Isso resolve a separação da bridge Docker sem abrir listener TCP do gateway, habilitar GatewayPorts ou alterar Traefik. Conta SSH root foi cadastrada pelo PO para esta operação; a sessão temporária usa a chave existente, sem copiar chave privada. Identidade restrita de serviço deverá preceder uma operação permanente.

## Alternativas e limites

Tailscale foi apresentado, mas requer nova conta/agentes/políticas. SSH foi escolhido pelo PO pela simplicidade e reversibilidade. Vite não é proxy de produção. Nginx sozinho não valida a autorização Prisma; gateway mínimo em Node usa APIs existentes, sem nova dependência, migration, chave privilegiada ou novo contrato Paddle. `paddle-hosted-transport-1.0.0` versiona somente cabeçalhos de sessão/organização/versão. Payloads e modelos permanecem iguais.

## Segurança, dados e compatibilidade

Auth /user valida token. REST com a mesma sessão e chave publicável confirma operador ativo, organização visível via RLS e membership owner/admin/recruiter, com tratamento super_admin existente. Não usar metadata editável nem cache de autorização. Validar origem exata, versão, tamanho, assinatura/base64, chaves/opções do payload e rota fixa. Nenhuma URL arbitrária, retry, credencial ao worker ou logging de conteúdo. Uma inferência por vez, excesso retorna 429 ao fallback existente. Falha/desconexão mantém cooldown conservador, pois cancelar HTTP não garante cancelar Paddle. Corpo só em memória; proxy buffering desligado.

O browser obtém sua própria sessão no instante da chamada e acrescenta cabeçalhos. DEV loopback continua compatível. Gateway indisponível ou negação nunca alcança Paddle; o produto mantém seu fallback aprovado. Não altera persistência, interpretação, matching ou revisão. Gateway não substitui a autorização transacional no Supabase. PC precisa ficar ligado e conectado; túnel não tem inicialização automática ou reconexão invisível.

## Validação e rollback

Negativos de transporte/Auth/tenant com fixtures sintéticas, regressão do provider/preflight e build; depois prova operacional e UI real do piloto. Rollback: imagem web anterior baseline, parar gateway/túnel; nenhum histórico reescrito. Reavaliar para concorrência, infraestrutura permanente ou rollout do Parser IA. Produção geral e benchmark M5.6 permanecem decisões separadas.

## Referências

- `docs/qa/agreement-hosted-paddle-bridge.md` 1.0.0; `docs/operations/paddle-document-intelligence.md`.
- OpenSSH: https://manpages.ubuntu.com/manpages/jammy/man1/ssh.1.html
- Nginx: https://nginx.org/en/docs/http/ngx_http_proxy_module.html

## Histórico

- 2026-09-16: decisão temporária aprovada pelo PO; evidências de implantação separadas no AoT.
