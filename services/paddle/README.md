# PaddleOCR self-hosted para M5.6

Este diretório contém somente o empacotamento operacional do provedor. O contrato de domínio permanece em `web/src/domain/documentIntelligence.ts` e não importa tipos do Paddle.

## Subir o caminho estrutural

```powershell
docker compose -f services/paddle/compose.yaml up --build structure
```

O serviço oficial básico do PaddleX fica acessível apenas em `127.0.0.1:8080`. O Vite encaminha `/document-intelligence` para esse endereço. Modelos são baixados pelo runtime oficial no primeiro uso e permanecem no volume nomeado.

## Habilitar recuperação visual

```powershell
docker compose -f services/paddle/compose.yaml --profile vision-recovery up --build
```

O segundo serviço usa a pipeline PaddleOCR-VL vigente no pacote fixado e fica acessível apenas em `127.0.0.1:8081`. Ele é uma recuperação cara e não participa do caminho rápido.

## Ativação do Prisma

- `VITE_DOCUMENT_INTELLIGENCE_MODE=baseline`: PDF.js e Tesseract continuam soberanos; não chama o provedor.
- `VITE_DOCUMENT_INTELLIGENCE_MODE=shadow`: executa o provedor em documentos elegíveis, registra diagnóstico e preserva a saída baseline.
- `VITE_DOCUMENT_INTELLIGENCE_MODE=enabled`: usa a saída canônica válida e retorna automaticamente ao baseline quando o provedor falha ou entrega páginas incompletas.

Valores desconhecidos falham fechados para `baseline`. Não exponha as portas fora do loopback e não envie currículos a serviços hospedados de terceiros.
