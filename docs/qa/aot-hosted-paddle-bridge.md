# AoT — ponte Paddle hospedada

Contrato: `docs/qa/agreement-hosted-paddle-bridge.md` 1.0.0; execução em `docs/qa/execution-hosted-paddle-bridge.md`. Data: 2026-09-16. Baseline: f1cc983, branch `codex/hosted-paddle-bridge`. Ambiente: frontend público Hostinger com backend Prisma-QA, worker CPU local provisório.

## Matriz de Acordos

| ID | Implementação | Teste / evidência | Status | Limitação |
| --- | --- | --- | --- | --- |
| D-01 | Web/backend preservados; Nginx com rotas adicionais | HTTPS 200, Home autenticada recarregada e importação no mesmo backend QA | PASS | Não existe backend separado de produção |
| D-02 | Adapter só acrescenta cabeçalhos; domínio/roteamento/payload sem alteração | 12 testes de adapter/preflight aprovados | PASS | Não é prova de worker real |
| D-03 | SSH reverso, gateway Auth/RLS, socket Unix privado | 11 testes gateway; listeners remotos somente loopback; health 200 dos dois workers; ambas as rotas públicas anônimas 401 | PASS | Retorno de inferência autenticada real ainda não comprovado |
| D-04 | Mesma UI/intake/draft | PDF autorizado importado pela UI até confirmação de identidade | BLOCKED | Nome extraído incorretamente; UI não permite corrigir antes de criar Pessoa |
| D-05 | Trace existente; logs somente rota/status/duração | Erro de identidade observado na UI; etapa alcançada em até 28 s após clique | PARTIAL | Draft/revisão, métricas persistidas e qualidade profissional não avaliados |

## Proibições verificadas

| ID | Guardrail | Evidência | Status |
| --- | --- | --- | --- |
| P-01 | Sem novo pipeline/modelo/roteamento | Diff sem mudança de domínio | PASS |
| P-02 | Sem exposição/credencial/PII | Negativos sintéticos; listeners remotos 127.0.0.1:18080/18081; gateway Unix; logs somente rota/status/duração | PASS |
| P-03 | Sem regras de Pessoa/publicação/matching/Knowledge/Supabase | Nenhuma migration ou mutação desses owners | PASS |
| P-04 | Sem falsa conclusão/probe/GPU | Importação E2E e qualidade mantidas incompletas; health não tratado como inferência | PASS |

## Fora de escopo preservado

F-01: Parser IA continua DEV/loopback; infraestrutura permanente/GPU/autoscaling/migração não alterados. PASS.

## Desvios do contrato

Nenhum desvio funcional identificado no diff. Aceite incompleto não é tratado como sucesso.

## Validação final

23 testes dirigidos aprovados (12 adapter/preflight + 11 gateway), incluindo tenant, status/papel, anonimato, origem/contrato, SSRF/payload, timeout, cancelamento, concorrência e sanitização. Typecheck web, compilação TypeScript, build web, lint, diff check e geração/check de contexto aprovados. Aviso preexistente de chunk Ant Design acima de 900 kB. Imagem do gateway construída e smoke descartável confirmou execução como node, filesystem read-only, socket Unix e 401 anônimo; container de teste removido. Nginx 1.27 Alpine confirmou sintaxe válida do proxy Unix em container local sem rede. Sem execução de `pnpm run validate`.

## Git / QA / ambiente

Itens preexistentes `.tmp.driveupload/`, `services/paddle/Dockerfile.gpu` e `/opt/prisma/models/` preservados e fora da entrega. Container experimental remoto `paddle-vl-llama-test` observado unhealthy, sem intervenção; não é worker desta ponte. A chave SSH foi cadastrada pelo PO, conexão root confirmada. Nenhum merge de main ou operação de produção geral.

Implementação `aba118a` enviada a `origin/codex/hosted-paddle-bridge`. A preparação remota foi inicialmente negada pela revisão automática por falta de autorização específica para mutação da VPS pública. Não houve tentativa de contornar: execução só retomada após a autorização explícita abaixo.

## Continuação autorizada — 2026-09-16

PO respondeu "sim autorizo" especificamente ao deploy na VPS pública, recriação web/gateway, túnel e teste Ivan. Branch b494f6d construída/ativada; imagem anterior preservada como `prisma-web:rollback-f1cc983-paddle`. Túnel local PID 4164 com portas remotas somente 127.0.0.1:18080/18081; health 200 de ambos os workers. Gateway como node, filesystem read-only, socket Unix; rotas públicas anônimas 401; site 200 e Home autenticada recarregada.

Primeira tentativa pela UI falhou antes do Paddle: worker PDF.js `.mjs` respondeu 200 com Content-Type application/octet-stream, rejeitado como módulo pelo navegador. Nenhuma chamada documental chegou ao gateway. Correção mecânica de MIME no Nginx em `99b91c8`, validada em container local sem rede e publicada: HTTP 200/application/javascript confirmado após estabilização do container. Uma consulta imediata durante recriação retornou 404 transitório. PDF.js, parser e arquivo de teste não foram alterados.

Na repetição, após recarga completa e seleção do PDF original, a UI alcançou a identificação da Pessoa em até 28 s (limite superior observado, não duração exata do motor). O nome sugerido foi uma ocupação, não o nome da pessoa; contatos foram identificados, sem correspondência exibida. Nenhuma chamada aos endpoints Paddle foi observada nessa tentativa; logs gateway continham apenas os dois negativos 401. Isso não comprova inferência nem permite atribuir qualidade ao Paddle. A telemetria completa depende da continuação do fluxo e não foi persistida/inspecionada nesta etapa.

A tela não oferece edição quando `hasMinimumResumeIdentity` é verdadeiro; `Criar nova` usaria diretamente a identidade incorreta. Nenhuma Pessoa foi criada e nenhum Perfil foi publicado nesta execução. O intake/arquivo recebido pelo fluxo normal permanece para continuidade; nenhuma exclusão foi feita. Não foi executada chamada manual de API, alteração de estado React ou correção direta no banco para contornar o gate humano. Corrigir a possibilidade de revisão da identidade antes da criação requer escopo adicional do PO.

## Conclusão

PARTIAL/BLOCKED. Ponte implantada com autorização específica e MIME PDF.js corrigido. Login/Home e leitura inicial do PDF comprovados; Draft/revisão e qualidade profissional não comprovados devido ao bloqueio de identidade. Runtime ativo `99b91c8`; túnel e workers dependem do PC ligado, sem retomada automática. Não há conclusão de cutover nem evidência de viabilidade CPU para este PDF.
