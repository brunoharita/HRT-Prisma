# AoT — ponte Paddle hospedada

Contrato: `docs/qa/agreement-hosted-paddle-bridge.md` 1.1.0; execução em `docs/qa/execution-hosted-paddle-bridge.md`. Data: 2026-09-16. Baseline: f1cc983, branch `codex/hosted-paddle-bridge`. Ambiente: frontend público Hostinger com backend Prisma-QA, worker CPU local provisório.

## Matriz de Acordos

| ID | Implementação | Teste / evidência | Status | Limitação |
| --- | --- | --- | --- | --- |
| D-01 | Web/backend preservados; Nginx com rotas adicionais | HTTPS 200, Home autenticada recarregada e importação no mesmo backend QA | PASS | Não existe backend separado de produção |
| D-02 | Adapter só acrescenta cabeçalhos; domínio/roteamento/payload sem alteração | 12 testes de adapter/preflight aprovados | PASS | Não é prova de worker real |
| D-03 | SSH reverso, gateway Auth/RLS, socket Unix privado | 11 testes gateway; listeners remotos somente loopback; health 200 dos dois workers; ambas as rotas públicas anônimas 401 | PASS | Retorno de inferência autenticada real ainda não comprovado |
| D-04 | Mesma UI/intake/draft | PDF autorizado chegou à revisão após correção de identidade e criação normal da Pessoa | PASS | Rota native-fast não exigiu Paddle; inferência real não testada por este arquivo |
| D-05 | Trace existente; logs somente rota/status/duração | Trace sanitizado observado na chamada real; comparação visual páginas 1/5 com rascunho | PARTIAL | Qualidade insuficiente e persistência de telemetria opcional retornou 404/PGRST205 |
| D-06 | Correção explícita reutiliza IdentityForm e identifyResumeIntake; resolução oculta durante edição, erro mantém formulário | 15 testes dirigidos; UI comprovou cancelar, rejeitar ausência de contato, corrigir, confirmar RPC 200 e criar Pessoa com nome correto | PASS | Extração original permanece separada da identidade humana do intake |

## Proibições verificadas

| ID | Guardrail | Evidência | Status |
| --- | --- | --- | --- |
| P-01 | Sem novo pipeline/modelo/roteamento | Diff sem mudança de domínio | PASS |
| P-02 | Sem exposição/credencial/PII | Negativos sintéticos; listeners remotos 127.0.0.1:18080/18081; gateway Unix; logs somente rota/status/duração | PASS |
| P-03 | Aditivo preserva regras de Pessoa/publicação/matching/Knowledge/Supabase | Sem migration; somente RPCs normais de intake/criação/revisão autorizadas, sem publicação | PASS |
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

Na versão anterior ao aditivo, a tela não oferecia edição quando `hasMinimumResumeIdentity` era verdadeiro; `Criar nova` usaria diretamente a identidade incorreta. Nenhuma Pessoa foi criada e nenhum Perfil foi publicado naquela tentativa. O intake/arquivo recebido pelo fluxo normal foi preservado para continuidade; nenhuma exclusão foi feita. Não foi executada chamada manual de API, alteração de estado React ou correção direta no banco para contornar o gate humano. Foi solicitado escopo adicional ao PO para permitir revisão da identidade antes da criação.

## Aditivo de identidade — evidência 2026-09-16

Aditivo autorizado pelo PO: expor correção antes da criação e retomar o teste. Implementação `55733a0` publicada na VPS reutiliza a RPC que verifica organização/papel, bloqueia intake resolvido e recalcula possíveis duplicados; sem migration ou alteração de segurança. Formulário em erro não encerra edição; cancelar não chama o backend. Criação exige mínimo nome/contato, vínculo name-only existente preservado. Contratos persistidos mantêm versões; acordo documental avança para 1.1.0. Rollback anterior preservado como `prisma-web:rollback-99b91c8-identity`.

Validação adicional: typecheck web, build TypeScript/web, 15 testes dirigidos (3 contratos de fonte da correção, 3 regressões de interrupção, 6 cenários de Pessoa e 3 estados de produto), lint e Context Pack aprovados. Uma asserção de teste inicialmente não reconheceu JSX no atributo icon; corrigida e reexecutada com 15/15. Os contratos de fonte não substituem a prova de interação abaixo. Nenhum `pnpm run validate` executado.

Na UI publicada: abrir correção ocultou criar/vincular; alterar nome e cancelar conservou o valor anterior; confirmar nome sem contato mostrou erro e manteve editor; cancelar restaurou os contatos originais; corrigir apenas o nome e confirmar retornou RPC 200 e novas correspondências vazias. Pessoa criada como Ivan Raineri; análise concluída e `Iniciar revisão` abriu a bancada. Rascunho sincronizado, documento v1, nenhuma publicação e nenhuma correção manual dos campos profissionais. O nome extraído original continua no rascunho: confirmar identidade do intake não reescreve a extração documental.

Trace observado no POST real, sem execução manual de pipeline: modo enabled, rota escolhida/efetiva native-fast, provider/model null, fallback false, diagnósticos vazios; preflight 0,4 ms, leitura nativa 201,3 ms, 5 páginas. UI indicou 7.102 caracteres úteis, 3 seções, zero sinais de experiência e zero competências. Análise observada até 21 s após a resolução (limite superior com latência de ferramentas, não duração do motor); pausas humanas excluem comparação de tempo total. Este arquivo não acionou Paddle e não prova sua qualidade ou performance CPU.

Persistência opcional em `document_intelligence_runs` retornou HTTP 404, código PGRST205: tabela não encontrada no schema cache. Não é prova conclusiva de tabela inexistente fisicamente; o endpoint não a disponibilizou nesta sessão. O fluxo principal continuou. Nenhuma migration/reload de schema foi aplicado para corrigir essa limitação fora do escopo.

Qualidade: inspeção visual do PDF original na revisão confirmou nome, título e resumo legíveis na página 1, mas rascunho trouxe ocupação como nome, ferramenta como título e resumo vazio. Página 5 contém experiências não estruturadas e duas formações visíveis; UI propôs três formações, sendo a primeira com sigla da instituição como curso. Evidência espacial abriu a página 5 e destacou o trecho, demonstrando vínculo documental, não correção semântica. Resultado insuficiente para considerar a extração validada; não foi corrigido manualmente para aparentar qualidade do parser. Aprovação de Perfil permanece humana independentemente da qualidade.

## Conclusão

PARTIAL. Correção de identidade entregue e validada; jornada hospedada chegou à revisão sem publicar Perfil. Runtime ativo `55733a0`; túnel e workers dependem do PC ligado, sem retomada automática. Qualidade do rascunho insuficiente, telemetria não persistida e inferência Paddle não exercitada pela rota nativa escolhida. Não há conclusão de cutover nem evidência de viabilidade CPU para este PDF. Parser/roteamento e disponibilização da telemetria exigem movimento separado autorizado.
