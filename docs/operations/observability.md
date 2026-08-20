# Observabilidade

## Separação obrigatória

### Logs técnicos

Erro sanitizado, correlation/process ID, etapa e duração. Sem currículo, prompt completo com PII, resposta sensível ou secret.

### Eventos de domínio

Planejados: documento importado, extração concluída, revisão solicitada, vaga criada, matching executado, decisão humana registrada e resultado observado.

### Auditoria

Planejada: ator, tenant, ação, alvo, finalidade, timestamp, resultado e ambiente para visualização, alteração, exportação, reprocessamento, exclusão, membership e configuração de IA.

### Métricas de IA

Provider, modelo, prompt, versões, tokens, custo, latência, timeout, erro, retry e revisão humana.

### Métricas de qualidade

Fato correto, omissão, alucinação, ambiguidade, falso positivo, falso negativo, matching contestado, regressão e insuficiência.

## Implementação atual

`ProcessingEvent` e `ai_usage_events` cobrem somente telemetria básica de processamento. Auditoria e eventos de domínio completos não estão implementados.

## Alertas planejados

Cross-tenant denial anômalo, pico de exportação, falhas de Auth, custo por tenant, timeout, regressão, revisão manual crescente, parser failure e indisponibilidade de provider.

## Retenção

Retenção de logs e auditoria ainda depende de política legal e operacional. Logs precisam permitir diagnóstico sem conservar conteúdo pessoal integral.
