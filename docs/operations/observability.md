# Observabilidade

## Separação obrigatória

### Logs técnicos

Erro sanitizado, correlation/process ID, etapa e duração. Sem currículo, prompt completo com PII, resposta sensível ou secret.

### Eventos de domínio

Implementados para ingestão/revisão: documento importado, falha, extração concluída, revisão iniciada/salva e versão aprovada. Vaga, matching e resultado observado ainda não possuem eventos de domínio completos.

### Auditoria

M2-C registra ator, tenant, ação, alvo, timestamp e referências de resultado para mutações documentais e revisão. Visualização, exportação, exclusão, membership e configuração de IA ainda não possuem cobertura completa.

### Métricas de IA

Provider, modelo, prompt, versões, tokens, custo, latência, timeout, erro, retry e revisão humana.

### Métricas de qualidade

Fato correto, omissão, alucinação, ambiguidade, falso positivo, falso negativo, matching contestado, regressão e insuficiência.

## Implementação atual

`ProcessingEvent` e `ai_usage_events` cobrem telemetria básica; `person_ingestion_events` e `document_operations` cobrem a trilha operacional M2-C sem conteúdo integral. A auditoria global da plataforma continua incompleta.

## Alertas planejados

Cross-tenant denial anômalo, pico de exportação, falhas de Auth, custo por tenant, timeout, regressão, revisão manual crescente, parser failure e indisponibilidade de provider.

## Retenção

Retenção de logs e auditoria ainda depende de política legal e operacional. Logs precisam permitir diagnóstico sem conservar conteúdo pessoal integral.
