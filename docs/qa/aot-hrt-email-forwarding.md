# AoT: encaminhamento corporativo HRT

Contrato docs/qa/agreement-hrt-email-forwarding.md v1.0.1, execução correspondente e ADR-081. Fonte: PO aprovou catch-all para seu Gmail e salvou o MX em09/10/2026. Prisma2.3.0 preservado; serviço independente1.0.2 publicado no SHA funcional ffc5a8ce626b6d87c219e1f511cc0f467682714f. Comportamento funcional comprovado. Conformidade integral do movimento não declarada: P-02 FAIL pela ocorrência histórica de endereço pessoal no Git público, detalhada abaixo.

## Matriz de acordos

| ID | Implementação | Teste/evidência | Status | Limitação |
| --- | --- | --- | --- | --- |
| D-01 | Catch-all no domínio e destino privado fixo | Dois aliases recebidos e forwarded last_event delivered, destino conferido por hash | PASS | SMTP do Gmail aceitou; Inbox/spam não inspecionados |
| D-02 | Parser MIME oficial, Reply-To, X-Original-To/From |17testes; ambos os testes reais preservam texto/HTML/assunto/Reply-To e anexo byte a byte | PASS | Cabeçalhos de identificação demonstrados no parser/serialização SDK; interface do Gmail não inspecionada |
| D-03 | Assinatura/API scope/destino fixo/SQLite/idem/retry |17negativos/contratos Windows e17Docker; replay oficial HTTP200 duas vezes por evento, mesmos recibos/uma tentativa; reinício persistiu dois delivered | PASS | Reenvio após24h ou payload alterado exige reconciliação |
| D-04 | DNS/config/chave de convites/serviços preservados | Nove entradas persistidas com oito anteriores iguais; MX autoritativo/1.1.1.1 verified; TLS oportunista/tracking off; seis containers mesmos IDs/imagens/restarts e11HTTP PASS | PASS | Smoke público não substitui jornada autenticada de candidato |
| D-05 | VPS existente, QA isolado, CI/main/rollout/rollback | Quatro CIs ffc5a8c success; container healthy/zero reinícios inesperados, config UID1000/mode400; docs sincronizadas sem rebuild dos outros runtimes | PASS | Sem ambiente QA remoto separado; QA Docker readonly/networknone na VPS |

## Proibições e ocorrência histórica

P-01 PASS: nenhuma IA, execução ou resposta automática; conteúdo recebido não controla destino nem ações. P-03 PASS: mesma idempotência/hash, uma tentativa e um recibo por recebido após replay/reinício, sem reenvio cego; accepted separado de delivered. P-04 PASS: nenhum dado de candidato, chave restrita, produto, banco/Score/IA, TLS, SPF/DKIM, plano ou outro runtime alterado.

P-02 FAIL: o destino de configuração entrou em texto claro no primeiro SHA público dc13eee antes da confirmação de visibilidade PUBLIC do remoto. PO informado. Correção1.0.1 retirou o valor dos arquivos atuais e colocou-o em secret privado com binding SHA256, mas o endereço permanece no histórico. Nenhum segredo, corpo, assunto, anexo ou conteúdo recebido foi exposto; recibos/logs atuais guardam só UUIDs, estados, tempos, hash e categorias técnicas. Não houve reescrita/remoção de histórico. A correção atual não elimina a violação histórica nem autoriza declarar conformidade integral.

## Mapa de impacto e preservação

Mapa inicial no Agreement: serviço/DNS/Gmail direct, cota Resend/recursos VPS plausible_indirect, Traefik/site critical_transversal, Supabase/tenant/Score/IA no_impact_identified após inspeção de consumidores e ausência de suas credenciais no serviço. Baseline main2fe4e31, web funcional3e271e32, sem MX e receiving disabled. Baseline/after preservam os seis containers, suas imagens e reinícios; novo serviço é o único recriado. Paddle experimental unhealthy é condição anterior preservada, não foi tratado por este movimento. Smoke público site/portal/sete assets200 e gateways sem auth403; webhook sem assinatura401.

Delta1.0.2: os dois testes chegaram, mas a lista inicial recusou raw download de cdn.resend.app. Causa provada pela API autenticada e recibos raw_url_invalid antes de qualquer envio. Host com CNAME CloudFront; documentação oficial define URL assinada CloudFront. Correção permite somente esse host exato adicional, preservando rejeição HTTP/portas/credenciais/redirects/hosts semelhantes e limite20MiB. Mapa mantém as áreas anteriores; download CDN do mesmo provider diretamente afetado. Retomada seletiva somente dos dois recibos sintéticos bloqueados sem tentativa/recibo prévio, sem apagar dados. Ambos passaram a delivered com uma tentativa.

## Testes, evidências e ambientes

Windows17tests e audit sem vulnerabilidades; QA17tests na imagem Node24, readonly/networknone/cap_drop/no-new-privileges e tmpfs, sem credenciais/dados reais. CI branch38014993520/38014993516 e main38015084029/38015084035 success. Context/lint em snapshot rastreado preserva arquivos alheios/untracked. Serviço1.0.2 healthy no SHA ffc5a8c, imagem ffc0f2a53e093cec01c4a91e652b29b0ede4808ecc2f461df9e6faa52940cc31. Um reinício manual de validação manteve dois jobs delivered e mesmos recibos/attempts=1; RestartCount0, sem crash. Rollback-before-ffc5a8ce626b preserva1.0.1, volume/secret mantidos.

Evidências sanitizadas em evidence/hrt-email-forwarding: operational-checkpoint.json, forwarding-before-restart.json/forwarding-after-restart.json, replay-audit.json, dns-zone-after.json, ci-cdn-fix.json, deployed-smoke.json, http-preservation.json e baseline-containers.txt/after-containers.txt. Nenhum endereço Gmail, URL assinada, chave ou corpo foi incluído nesses arquivos. Evento recebido e entregue confirmado pelo provider; anexos baixados só para comparação dos testes sintéticos, em memória.

## Limites, fora de escopo e fechamento

Gmail Inbox/spam e sua UI/filtro NOT TESTED. Filtro recomendado from:encaminhamento@hrtsolutions.com.br; configuração Gmail/SMTP/Enviar como fora de escopo, respostas seguem Gmail pessoal. Cota Free observada100envios/dia3000/mês compartilhada com convites; sem upgrade/contratação. Mensagem bruta limitada20MiB, limites adicionais e retenção Resend/Gmail preservados; anexos continuam conteúdo não confiável.

Sem nova referência visual/UI do produto. F-01/F-02 preservados: nenhuma IA/billing/purga/migração de mensagens antigas ou fluxo de candidato. Todos D-* PASS; P-02 FAIL histórico permanece como resíduo explícito. Entrega funcional publicada e sincronizada; não declarar conformidade integral do movimento.
