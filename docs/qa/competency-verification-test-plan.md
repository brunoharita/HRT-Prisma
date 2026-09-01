---
owner: qa
status: planned
version: 0.1.0
last_verified: 2026-09-01
---

# QA do M5.1 - Verificação de Competências

## Estado

Plano futuro. Não há testes executáveis do M5.1 porque não há implementação funcional do movimento.

## Estratégia

O M5.1 é classe D/E quando implementado: envolve tenant, PII profissional, avaliação, IA potencial, políticas, telemetria, integridade e impacto em matching. A validação futura deve combinar unit, contract, integration, security, golden, UX e regressão de fairness/acessibilidade.

## Matriz futura

| Área | Casos mínimos |
| --- | --- |
| Contratos | versionamento, versão desconhecida fail-closed, compatibilidade histórica |
| Tenant/RLS | item Organization privado, policy tenant-scoped, usuário sem membership, papel insuficiente |
| Verification Need | criação, recomendação, exigência por policy, cancelamento, expiração, inconclusivo |
| Sufficiency Engine | suficiente, opcional, recomendado, obrigatório por política, informação insuficiente |
| Policy | criticidade, nível mínimo, recência, modalidade aceita, reutilização, tentativas |
| Item Bank | item não aprovado não selecionado, deprecated/compromised bloqueado, Global não recebe Organization |
| Composer | respeita blueprint, nível, dimensão, dificuldade, cooldown, exposição e família |
| Attempt | autosave, replay, reconexão, timeout, refresh, tentativa duplicada e expiração |
| Rubrica | resultado bruto preservado, nível demonstrado explicado, inconclusivo permitido |
| Telemetria | questão ativa correta, timestamps, blur/focus, page hidden/visible, duplicidade |
| Integridade | flags determinísticas, nenhum evento isolado acusa fraude, incidente técnico separado |
| Evidência | demonstrada independente, divergência preservada, matching reavaliado sem decisão automática |
| Acessibilidade | teclado, leitor de tela, foco, contraste, tempo adicional e tecnologia assistiva |

## Golden fixtures futuras

Fixtures devem cobrir:

- assessment normal;
- múltiplas saídas curtas;
- saídas prolongadas em itens difíceis;
- conexão instável;
- mudança de dispositivo;
- tempo muito rápido;
- tempo muito lento;
- item fora de calibração;
- evidências divergentes;
- verificação inconclusiva;
- policy obrigatória para competência crítica;
- ausência de evidência demonstrada sem interpretação negativa;
- item Organization impedido de aparecer em outro tenant;
- assessment composto sem LLM quando Item Bank cobre o blueprint.

## Critérios de aceite futuros

Implementação só poderá ser promovida quando:

- contratos e versões estiverem documentados;
- migrations tiverem RLS, grants e índices revisados;
- DML direto de tabelas críticas estiver revogado quando aplicável;
- tests negativos de tenant e papel passarem;
- composer respeitar blueprint em regressão determinística;
- attempt preservar respostas em refresh/reconnect;
- telemetria estiver ligada à questão ativa;
- integridade não alterar resultado bruto;
- evidência demonstrada não sobrescrever perfil;
- matching mostrar impacto sem decisão automática;
- UX cobrir estados vazios, erro, conflito, expiração, inconclusivo e autorização insuficiente;
- acessibilidade estiver validada em desktop e mobile;
- Context Pack estiver regenerado.

## Evidência esperada

Registrar ambiente, branch, commit, migrations, versões de contratos, dados sintéticos, comandos, resultado, limitações, screenshots quando houver UI, transações revertidas quando houver banco remoto e status de produção separado.

Produção permanece fora do M5.1 até aprovação explícita e ambiente dedicado.
