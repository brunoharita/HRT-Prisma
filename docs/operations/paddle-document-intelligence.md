# Operação local do Paddle Document Intelligence

## Ponte temporária do frontend hospedado — 2026-09-16

Decisão aprovada: ADR-058; contrato `paddle-hosted-transport-1.0.0`. Status operacional e aceite ficam em `docs/qa/aot-hosted-paddle-bridge.md`. Nenhuma prova de health substitui a importação na interface.

`Browser -> HTTPS/Traefik -> Nginx -> socket Unix -> gateway -> VPS loopback 18080/18081/18787 -> SSH reverso -> PC loopback 8080/8081/8787`.

Executar `scripts/start-paddle-tunnel.ps1` no PC. O processo permanece ativo durante o uso; Ctrl+C encerra a ponte. Em execução assistida, iniciar com janela oculta e registrar somente PID/caminho do script, sem credenciais. Não habilitar GatewayPorts nem alterar o bind local dos containers. PC desligado, suspenso, sem rede ou túnel encerrado torna o provider indisponível e preserva o fallback existente. Restart/reconexão do túnel é manual neste piloto.

O gateway só escuta `/run/paddle-gateway/gateway.sock`, compartilhado por volume com Nginx, e usa network_mode host para alcançar o loopback da VPS. Não publica porta. `deploy/docker-compose.yml` recebe a URL e chave publicável do Supabase já configuradas; não requer service key. Sessão Bearer, organização e versão do transporte vêm do browser e são verificadas antes de ler/encaminhar o documento. Chaves e sessão não chegam aos workers. A rota fixa `/parser-ia-hosted/parse` também valida organização, hash, assinatura e tamanho do PDF antes de remover credenciais e encaminhar ao worker 8787.

Há limite de 21 MiB para JSON/base64 (PDF até 15 MiB), uma inferência simultânea, nenhum retry e deadline de 295 s no gateway, 300 s no Nginx. O cliente mantém 240 s, configurável entre 30 e 300 s como antes. Cancelamento de HTTP não garante cancelamento de inferência: falha de transporte conserva cooldown de 295 s, sem novas chamadas concorrentes. Logs do gateway contêm somente rota técnica, status e duração; Nginx não grava access log dessas rotas nem buffers de documento em disco.

Para o rollout autorizado: `VITE_DOCUMENT_INTELLIGENCE_MODE=enabled`, `VITE_DOCUMENT_INTELLIGENCE_TIMEOUT_MS=240000`, `VITE_PARSER_IA_LOCAL=false`, `VITE_PARSER_IA_MODE=hosted`. O Parser IA continua escutando somente em loopback; a rota pública é protegida pelo gateway e não expõe o worker ou a chave OpenAI.

Na implantação autorizada de 2026-09-16, exportar também `PRISMA_DEPLOY_COMMIT` com o SHA construído. Os overrides do piloto foram fornecidos no build, sem alterar `.env.production`; precisam ser repetidos em rebuild autorizado. Construir ambos os serviços e iniciar `paddle-gateway` antes de `prisma-web` para inicializar a propriedade do volume do socket. Pipeline serial publicado a partir de `ee90d43`, configuração alinhada em `b36287d`; imagens ativas `prisma-web:1.6.4` e `prisma-paddle-gateway:1.1.0`. Rollback imediato preservado como `prisma-web:rollback-55733a0-resume-pipeline` e `prisma-paddle-gateway:rollback-55733a0`. O Nginx serve `.mjs` como application/javascript, necessário ao worker PDF.js. Validar HTTP após estabilização do container, não apenas durante sua recriação.

Rollback: preservar/taguear imagem web anterior, voltar a ela (baseline), parar apenas gateway e processo SSH desta ponte. Não remover volumes de modelos, documentos, perfis ou containers experimentais alheios. O web antigo funciona sem gateway; o Nginx novo também continua servindo login/Home quando o worker falta.

## Versões e licença

- PaddleOCR: 3.7.0, Apache-2.0;
- PaddlePaddle CPU: 3.2.0;
- Python no container: 3.12;
- pipeline estrutural: PP-StructureV3 com OCR da linha PP-OCRv6 do pacote corrente;
- recuperação visual: PaddleOCR-VL 1.6 pela pipeline `PaddleOCR-VL` do pacote fixado;
- empacotamento: `services/paddle/Dockerfile.cpu` e `services/paddle/compose.yaml`.

## Requisitos

Docker com containers Linux e memória disponível. No Windows, o modo de alta performance do fornecedor recomenda Docker ou WSL. A GPU GTX 1050 Ti e o driver observados no spike não foram declarados compatíveis com a imagem CUDA 12.6 atual; por isso o baseline operacional escolhido é CPU. Isso é decisão conservadora de compatibilidade, não evidência de performance suficiente.

## Execução

```powershell
docker compose -f services/paddle/compose.yaml up --build structure
```

Para incluir a recuperação visual:

```powershell
docker compose -f services/paddle/compose.yaml --profile vision-recovery up --build
```

As portas são publicadas somente em `127.0.0.1`. O primeiro uso baixa modelos oficiais para volumes nomeados e pode ter latência maior. O frontend em desenvolvimento encaminha os endpoints pelo proxy Vite.

O cliente usa 240 segundos por padrão, aceita `VITE_DOCUMENT_INTELLIGENCE_TIMEOUT_MS` somente entre 30 e 300 segundos e o proxy Vite usa 300 segundos. Para ativar o provider no ambiente local, defina `VITE_DOCUMENT_INTELLIGENCE_MODE=enabled`; `baseline` mantém o pipeline anterior. Reinicie o Vite após mudar variáveis de ambiente.

## Verificação mínima

1. confirmar que `http://127.0.0.1:8080/docs` responde localmente;
2. enviar uma fixture não pessoal à operação `POST /layout-parsing`;
3. confirmar `result.layoutParsingResults[].prunedResult`, dimensões, `parsing_res_list` e `overall_ocr_res`;
4. iniciar Prisma em `shadow` e confirmar que a saída baseline não muda;
5. revisar `document_intelligence_runs` sem texto ou PII;
6. executar o benchmark autorizado antes de qualquer `enabled`.

Probe local sanitizado para arquivos explicitamente autorizados:

```powershell
pnpm run build
pnpm run probe:paddle -- --file "C:\caminho\curriculo.pdf"
```

O probe rejeita endpoint fora de loopback e imprime somente hash curto, tempo, páginas, blocos, linhas e versões técnicas.

## Falha e rollback

Timeout, indisponibilidade, JSON inválido, página ausente ou texto insuficiente ficam explícitos. O operador pode escolher conscientemente continuar somente com a leitura local; essa escolha não é registrada como sucesso da IA. Para rollback, use `VITE_PARSER_IA_MODE=disabled`, restaure a imagem anterior e interrompa o túnel. Não reprocessar perfis históricos em massa.

## Evidência desta execução

Em 2026-09-11, o container `structure` respondeu em `127.0.0.1:8080`. Os dois arquivos autorizados completaram o adaptador real sem fallback: Tainá em aproximadamente 83 segundos, com 40 blocos e 71 linhas; Vagner em aproximadamente 66 segundos, com 27 blocos e 60 linhas. Uma execução autenticada posterior pela interface variou até cerca de dois minutos no mesmo CPU, dentro do novo limite. Memória e comportamento com concorrência ainda não foram medidos.
