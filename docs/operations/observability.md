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

O M5.6 adiciona `document_intelligence_runs` para rota selecionada/efetiva, modo, provider/modelo/versionamento, fallback, diagnóstico allowlisted e duração por estágio. O registro é organization-scoped, protegido por RLS e não contém texto, imagem, PII, prompt ou resposta integral. A gravação é opcional e sua falha não bloqueia revisão humana. Métricas de qualidade detalhadas ficam no harness privado de benchmark e somente relatórios sanitizados podem ser versionados.

Na Edge `matching-trajectory`, tentativas com falha ou discordância emitem um único evento JSON `matching_trajectory_readings` v1 após as duas leituras terminarem. `analysisId` e `attempt` correlacionam o evento com o cache; cada leitura informa `outcome`, `stage`, motivo limitado, HTTP status, provider status, incomplete reason e contagens de tokens quando disponíveis. Valores vindos do provedor são reduzidos a listas fechadas ou números limitados. Não se registra nome/ID da pessoa, conteúdo profissional, posição, prompt, citação, resposta bruta ou mensagem livre de erro. A falha do logger não modifica o resultado; leituras bem-sucedidas sem discordância e respostas vindas somente do cache não geram evento. O evento fica apenas no log operacional da Edge, não no banco nem na resposta ao navegador. Logs antigos `RESPONSE_INVALID` continuam sem etapa recuperável. Versões de prompt, método e score permanecem as mesmas.

Separadamente do evento de log, `matching_trajectory_assessments.last_reading_pair` v1 conserva apenas o último par estruturado por chave de cache, com IDs de trecho/evidência e categorias válidas ou etapa/motivo de falha. O cache já guarda organização, Perfil, versão da Posição, fontes, modelo, tentativa e horário; o novo campo não duplica texto profissional nem resposta bruta. A escrita é transacional com a conclusão da análise; novos retries substituem o par. A tabela continua sem SELECT para `anon`, `authenticated` e `service_role`, com RLS; a Edge não inclui o par na resposta pública. Auditoria histórica de pares e tela de consulta permanecem fora do escopo. Exclusão do Perfil ou da versão da Posição continua a remover o cache em cascata.

## Alertas planejados

Cross-tenant denial anômalo, pico de exportação, falhas de Auth, custo por tenant, timeout, regressão, revisão manual crescente, parser failure e indisponibilidade de provider.

## Retenção

Retenção de logs e auditoria ainda depende de política legal e operacional. Logs precisam permitir diagnóstico sem conservar conteúdo pessoal integral.
