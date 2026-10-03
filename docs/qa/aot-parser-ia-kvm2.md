# AoT — Prisma v2.0.1: Parser IA totalmente online na KVM2

Acordo e execução `parser-ia-kvm2` 1.1.0, ADR-075; decisão explícita de Bruno em 2026-10-03, incluindo credencial exata/origem/destino, teste sintético pago, main e produção. Baseline `efdadeb64fbe8399d718018cf6080cb9737774e6`; implementação em `codex/parser-ia-kvm2`; risco D/E. SHA funcional publicado `4ccfbf1e74534f529db7bea04978d1ee2f9c16c0`. Este fechamento documental não muda o runtime ou a versão pública.

## Matriz de Acordos

| ID | Acordo | Implementação | Teste/evidência | Status | Ambiente / limite |
| --- | --- | --- | --- | --- | --- |
| D-01 | Sem PC/túnel | Parser singleton na KVM2/127.0.0.1:18787, gateway existente | parse real HTTP 200; PC sem listener 8787/processo SSH após comandos | PASS | produção, PDF sintético sem banco |
| D-02 | Autoridade e interpretação preservadas | gateway inalterado, somente diretório do lock alterado no Parser | auth/tenant/origem/hash/limites/cache/evidência, 86/86; readiness autenticada na UI | PASS | QA sintético e produção |
| D-03 | Secret/cache/endpoint privados | Compose secret/node/loopback/hardening/volume | secret 400 UID 1000/read-only; cache/lock 700, arquivos 600; sem chave em env/imagem | PASS | inspeção Docker/host |
| D-04 | Restart sem lock antigo ou retry | tmpfs separado/cache persistente/healthcheck | restart Docker real, lock ausente, replay HTTP 200 cached=true | PASS | produção, sem nova inferência no replay |
| D-05 | Publicar/provar no servidor | script específico e rollback | main/GitHub/VPS no SHA funcional, CIs branch/main PASS; containers ativos | PASS | UI autenticada disponível; importação real até revisão não testada |
| D-06 | Prisma v2.0.1 / histórico e contratos preservados | registro único, geração 2/movimento 0/entrega 1 | 4 testes do registro, typecheck/build; menu hospedado v2.0.1; login usa o mesmo objeto no mesmo bundle publicado | PASS | binding do login verificado no código; footer após logout não inspecionado separadamente |

## Proibições verificadas

| ID | Guardrail | Teste negativo / evidência | Status |
| --- | --- | --- | --- |
| P-01 | Sem exposição/redução de proteção | auth/tenant/origem/loopback/sanitização; anônimo HTTP 401/session_required; mounts/UID/permissões | PASS |
| P-02 | Prompt/modelo/dados/revisão/no retry | referência inventada/zero fatos/partial/cache; mesmo prompt SHA/modelo/contratos; replay antes/depois de restart | PASS |
| P-03 | Sem mutação humana/material alheio | sintético sem DB/Pessoa/Perfil; serviços e material alheio preservados | PASS |

## Mapa de Impacto e Preservação

Mapa inicial e aditivo no acordo 1.1.0. A decisão adicional do PO fez versão/web uma superfície direta; não ampliou domínio ou interpretação.

| Capacidade / área | Relação | Baseline | Regressão / evidência | Status |
| --- | --- | --- | --- | --- |
| Parser/readiness | direct | PC/18787 VPS ausentes | HTTP/cache/lock/health, 45 tooling; inferência remota e restart | PASS |
| Versão pública/web | direct | v1.8.4, mesma fonte no login/menu | registro/histórico, typecheck/build, menu v2.0.1 real e binding do login | PASS |
| Gateway/auth/tenant | critical_transversal | gateway ativo/zero restart | negativos; UI autenticada disponível; anônimo 401; mesmo ID/imagem | PASS |
| Importação/revisão | plausible_indirect | parser-ia 1.0.0, mesma UI/saída | 26 domínio/recuperação/readiness; UI disponível | PASS |
| Site/Traefik/outros serviços | plausible_indirect | IDs/imagens/restarts coletados | somente web recriada e Parser criado; gateway/Traefik/experimento iguais; assets/HTTPS 200 | PASS |
| Dados/matching/Knowledge | no_impact_identified | sem SQL/Edge/banco no smoke | diff/plano/binding/cache; nenhuma mutação humana | PASS |
| Paddle/experimento | no_impact_identified | fora da rota automática | ID d991a574e45e/estado pré-existente preservados | PASS |

PASS de preservação da revisão refere-se à regressão determinística do contrato; não equivale a uma publicação humana real. O baseline não tinha Parser disponível, portanto o smoke real comprova restauração da capacidade online, não comparação de qualidade de currículos reais.

## Implementação e validação

Reutilizados Parser Node/PDF.js, gateway autenticado e Docker/Compose. Cache privado persistente separado do lock em tmpfs, serviço não privilegiado, healthcheck sem IA e restart unless-stopped. Limites: 768 MiB/1 CPU/64 PIDs, concorrência unitária; mesma OpenAI/modelo/prompt, sem retry. Nenhuma migration/Edge ou novo fornecedor/dependência. Histórico 1.x preservado; versão dos dados não renumerada.

Quatro testes novos de hosted/restart/auth/health; preservação por 41 gateway/Parser existentes, 26 domínio e 15 release/contexto: 86/86 PASS. Build TS raiz, compilação específica e lint (787 arquivos) PASS. QA Docker na KVM2 sem rede/chave real: HTTP 200, origem/hash recusados, cache, UID 1000, permissões e restart com lock volátil/cache persistente PASS. Imagem QA `prisma-parser-ia:qa-57b306d`, ID `sha256:225afd6a2f211a3451b6f3a81e62700032bb63d7945f458de29136f587bd6f2a`. Container QA removido; build/cache sintético e imagem QA preservados.

Incremento v2.0.1: registro/histórico 4/4 PASS; release/contexto 15/15 PASS; typecheck/build web e lint PASS. Uma primeira prova de contexto falhou por não projetar v2.0.1 no resumo selecionado pelo gerador; corrigida a fonte canônica, regenerado/check e teste passaram. Exports nunca editados manualmente. Build web mantém avisos existentes de chunks grandes/import dinâmico, sem falha. Nenhuma suíte integral local executada; CI existente rodou seus gates automaticamente.

Context Pack gerado/check em cópia do índice Git, excluindo acordo alheio não rastreado. pnpm 11 tentou reinstalar módulos numa cópia ligada por junction e abortou sem TTY; não houve purge ou mudança de dependências. Reexecução com `--config.verify-deps-before-run=false` PASS. O QA anterior recebeu CRLF extra via stdin e acusou erro shell após PASS/cleanup; inspeção posterior confirmou container ausente. Probes de produção toleram/removem somente CR do script transportado, não do segredo.

Dispatcher 1.0.1: docs/context/hosting/infrastructure/tests/tooling/web; migrations e Edge skip, nenhum path desconhecido. Roteamento genérico de testes substituído pela regressão afetada; Parser publicado pelo script próprio e web pelo script existente. Recibo Git em `tmp/parser-ia-v201-git-release.json` registra GIT_PUBLISHED e web pendente por configuração SSH do dispatcher; as publicações manuais verificadas abaixo concluem essa superfície.

## Evidência operacional de produção

- SHA funcional `4ccfbf1e74534f529db7bea04978d1ee2f9c16c0` em main local/origin/VPS, branch publicada. CIs `37140745879` (branch) e `37140809170` (main): SUCCESS. Commits anteriores 57b306d/07af391 integrados, incluindo evidência e autorização superveniente.
- Parser `b160ce0f591d`, running/healthy, imagem `sha256:116fe4fbb904dd08005b5edbfbe27c358dbc12c1a4eb0493e0d626136de6bac8`. Loopback 127.0.0.1:18787; UID 1000, read-only, cap_drop ALL, no-new-privileges, memória 805306368, nanoCPUs 1000000000, PIDs 64, restart unless-stopped.
- Secret `/etc/prisma/parser-ia.env`: diretório host root 700, arquivo 400 UID 1000, mount somente leitura em `/run/secrets/parser_ia_env`; apenas OPENAI_API_KEY autorizada, sem arquivo completo, PDF/cache do PC ou service role. Chave ausente do env do processo; Dockerfile/context excluem secrets. Cache `deploy_parser-ia-cache` privado, pasta/lock 700 e arquivos 600; não houve exposição de conteúdos pessoais.
- Parse real: organização técnica sintética `synthetic-online-probe`, PDF mínimo SHA `14a3dc19b62d44c7550b72d20e7fc7e0dcd27edc141675b92f997b175f973a09`, nenhum DB/Pessoa. HTTP 200, cached=false, 1 fato de identidade validado com fonte; modelo `gpt-5.6-luna`, prompt SHA `d8a86ce90512fa5bb12f9605fb860b0cbad0df5139e9e1e3fe5d1cd54febd09b`. 703 tokens entrada/44 saída, custo contábil estimado US$ 0.00022855, duração 3372 ms. Não é medição de qualidade de currículo real ou fatura definitiva.
- Replay imediato cached=true. Readiness available antes de restart administrativo; depois running/healthy, nenhum lock residual, mesmo cache validado antes de POST e cached=true em dois replays. A proveniência/custo retornados no replay são da inferência original, não nova cobrança. RestartCount=0 após restart manual é comportamento do Docker, não ausência de reinício.
- Web nova `8ca85a5569d2`, running/zero reinícios, imagem `sha256:974d6f4036d472ad2bd2952078475b320b07344b3b496533ac8600893f38a0ed`. Rollback `prisma-web:rollback-before-4ccfbf1e7453` preserva imagem `sha256:85a0abe1a47a69e4fdde2545ee509fd11c4528e16d8ef13dbdd387fb3f360ae8`; assets anteriores copiados para manter abas existentes. Primeiro curl imediato retornou 404 transitório, sem rebuild repetido; depois `/`, `/sign-in`, `/index.html`, JS index-C2XmZklw, CSS index-NtLZfLyW e PDF chunk-DGyYHl6d retornaram 200.
- Gateway `2eed2dd379ea`, Traefik `5e25fdc6d2e6`, experimento `d991a574e45e`: IDs/imagens preservados, zero restart. Experimento já unhealthy antes, não foi tratado. Gateway imagem `sha256:d061cea3ae0a785f5cc0879704e1918666d22aa51236ec4ff7384b1387d2cf99`; rota readiness pública anônima HTTP 401/session_required.
- Navegador: login com campos já preenchidos pelo usuário, sem ler/revelar valores; após autenticação/reload, menu v2.0.1. `/profiles/import` mostrou `Serviço de importação disponível`, checagem autenticada às 14:39:17–14:39:47 BRT, sem PDF selecionado. Captura inline da sessão registra cartão verde/menu v2.0.1 (1059x1244). Login e menu consomem PRISMA_RELEASE; footer do login sem sessão após publicação não foi inspecionado separadamente. Aba temporária fechada; aba autenticada de importação preservada.
- PC sem worker/listener 8787 e sem processo SSH após comandos administrativos. SSH usado para publicar/inspecionar, não túnel ou dependência de execução.

## Fora de escopo, desvios e resíduos

F-01/F-02 preservados: sem OCR automático, remoção de modelos/containers históricos, reprocessamento humano, banco, Edge, matching ou redesenho de UX. Apenas versão pública alterada por decisão expressa. Dados e contratos preservados. Primeira implantação tem rollback por parar somente Parser e conservar secret/volume, explicitando indisponibilidade; não voltar ao PC.

Sem desvio de produto. Rejeição inicial da revisão automática exigiu autorização específica do segredo/origem/destino; a ação ficou parada, e Bruno autorizou explicitamente antes da transferência. Bloqueio resolvido, sem contorno. `.tmp.driveupload/`, acordo matching alheio, Dockerfile.gpu, teste duplicado e `models/` remoto preservados. Volume contém apenas cache sintético desta validação além de eventuais operações humanas legítimas do serviço; nenhuma leitura de documentos alheios no smoke.

## Conclusão

D-01 a D-06 e P-01 a P-03 PASS com os limites de observação descritos. Importação automática online ativada na KVM2, Prisma v2.0.1 publicada em main/produção, frontend autenticado disponível. Jornada com currículo real até revisão/publicação e avaliação ampliada de qualidade: NOT TESTED, fora deste smoke, sem criação de Pessoa ou Perfil de teste. Fechamento documental deve ser sincronizado por fast-forward sem rebuild do runtime funcional validado.
