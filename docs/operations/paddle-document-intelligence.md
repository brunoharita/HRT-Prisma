# Operação local do Paddle Document Intelligence

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

## Verificação mínima

1. confirmar que `http://127.0.0.1:8080/docs` responde localmente;
2. enviar uma fixture não pessoal à operação `POST /layout-parsing`;
3. confirmar `result.layoutParsingResults[].prunedResult`, dimensões, `parsing_res_list` e `overall_ocr_res`;
4. iniciar Prisma em `shadow` e confirmar que a saída baseline não muda;
5. revisar `document_intelligence_runs` sem texto ou PII;
6. executar o benchmark autorizado antes de qualquer `enabled`.

## Falha e rollback

Timeout, indisponibilidade, JSON inválido, página ausente ou texto insuficiente retornam ao pipeline existente. Defina `VITE_DOCUMENT_INTELLIGENCE_MODE=baseline` e pare os containers para rollback. Não reprocese perfis históricos e não promova flag para produção.

## Evidência desta execução

Em 2026-09-10, `docker version` confirmou o cliente 28.3.3, mas o daemon não respondeu e a chamada elevada ficou bloqueada até interrupção. Assim, build do container, download de modelos, warm-up, latência e memória não foram medidos nesta máquina. O código e a configuração são verificáveis estaticamente, porém o runtime permanece `NOT TESTED` até o daemon estar funcional.
