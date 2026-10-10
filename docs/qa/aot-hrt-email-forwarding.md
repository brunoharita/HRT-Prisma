# AoT: encaminhamento corporativo HRT

## Atualização operacional1.0.2

PO salvou o MX em09/10/2026. Nove entradas persistidas no Registro.br, preservando as oito anteriores; DNS autoritativo e1.1.1.1 confirmam root MX10 inbound-smtp.sa-east-1.amazonaws.com. Resend verified em envio/recebimento, tracking desabilitado. Dois e-mails sintéticos recebidos com texto/HTML/anexo; job bloqueado antes de enviar por raw_url_invalid. Causa provada: API autenticada entrega download em cdn.resend.app, ausente da lista inicial. Correção autoriza somente esse host exato adicional e mantém HTTP/portas/credenciais/redirecionamentos bloqueados. Mapa de impacto original preservado, com download CDN do mesmo provider diretamente afetado;17testes Windows e17QA Docker readonly/networknone/cap_drop PASS, audit sem vulnerabilidades. Rollout/retomada e prova Gmail ainda pendentes neste checkpoint; matriz abaixo é baseline e será fechada com a evidência real.

Contrato docs/qa/agreement-hrt-email-forwarding.md v1.0.1 e execução correspondente, template aot-template.md. Baseline main2fe4e31, branch codex/hrt-email-forwarding, Prisma2.3.0 preservado. Em andamento: não declarar recebimento funcional antes da ativação/entrega. Primeiro SHA funcionaldc13eee publicado em main/origin/VPS, CI branch38012158752/38012158817 e main38012271121/38012271133 success. Serviço healthy/zero reinícios, assinatura ausente401; seis containers preservam IDs/imagens/restarts. Receiving enabled, DKIM/CNAMEs verified e MX pending; sessão Registro.br expirou e aguarda login do PO.

## Matriz de acordos

| ID | Implementação | Teste/evidência | Status | Limitação |
| --- | --- | --- | --- | --- |
| D-01 | Catch-all no domínio e destino fixo | Fila local/sintética pronta; ativação e teste real pendentes | PARTIAL | Sem MX ativo ainda |
| D-02 | MIME oficial, Reply-To e identificação | Teste texto/HTML/anexo inline/headers | PARTIAL | E-mail real com anexo pendente |
| D-03 | Assinatura, API scope, SQLite/hash/receipt/retry |17testes Windows/CI Node24;16Docker inicial readonly/networknone | PASS | Inclui falha/replay/concorrência/reinício/expiração/destino injetado; assinatura HTTP401 em produção |
| D-04 | Compose/router/secrets, registros antigos e chave isolados | Baseline/after IDs/imagens/restarts idênticos; chave restrita preservada; sending DNS verified | PARTIAL | MX não modificado; conclusão depende do login/DNS |
| D-05 | VPS existente, pacote/CI/release próprios | SHA15db406 main/origin/VPS, quatro CIs success; health200 e11HTTP de preservação | PASS | Sem plano pago/PC/túnel; rollout parcial por gate DNS |

## Proibições

P-01 PASS: texto de ataque fica só no corpo encaminhado, sem IA/comando/destino externo. P-02 FAIL: endereço pessoal de configuração permanece no histórico público, conforme ocorrência registrada abaixo; arquivos atuais corrigidos, sem exposição de conteúdo recebido/segredos/logs/SQLite. A correção não elimina a violação histórica e impede declarar conformidade integral do movimento. Segredo capturado DPAPI/SSH stdin e salvo UID1000/mode400. P-03 PASS local: idempotência/payload/expiração testados; aceitação separada de entrega. P-04 PASS: comparação pós-rollout preserva seis containers e suas imagens/restarts; nenhuma mudança de produto/banco/chave restrita ou plano.

## Impacto e preservação

Mapa inicial no Agreement. Serviço/DNS/Gmail direct; cota/envio Resend e recursos do host plausible_indirect; Traefik/site critical_transversal; Supabase/tenant/Score/IA no_impact_identified após inspeção dos consumidores e ausência de credenciais/destinos do produto. Baseline sanitized em evidence/hrt-email-forwarding/baseline-containers.txt. Registro.br tem oito entradas, sem MX; Resend receiving disabled, sending verified/enabled. Infra existente não deve ser recriada. Após implantação: comparar IDs/imagens/restarts/health e smoke público do site/assets/portal/negações dos gateways.

## Fora de escopo e visual

F-01/F-02 preservados: nenhuma UI/template normativo novo, Gmail SMTP/Enviar como, IA, billing, purga, mudança de plano ou mensagens antigas. Referência visual não aplicável; formulário administrativo não é mockup de produto.

## Desvios e limites

Nenhum desvio funcional identificado na revisão local. Ocorrência de privacidade: destino configurado entrou em texto claro no SHA públicodc13eee, antes da confirmação da visibilidade PUBLIC do remoto. Valor removido dos arquivos atuais e transferido para config privada com binding hash na correção1.0.1. PO informado; endereço não é credencial, mas continua no histórico publicado. Nenhum secret ou conteúdo recebido foi exposto, nenhuma reescrita/remoção de histórico realizada. Full access exigido pelo provider foi apresentado e concedido pelo PO antes da instalação. Docker local indisponível; QA executado em container isolado na VPS existente, readonly e networknone, sem dados/segredos/produto. Não há QA remoto separado. Limite raw20MiB, quotas compartilhadas; não garante Inbox, spam, autenticação do remetente original ou segurança dos anexos. Rota de forwarding não toma decisões de emprego e não usa IA/ledger.

## Validação e ambientes

Windows17testes PASS; Docker16testes iniciais PASS;21testes tooling PASS; audit isolado sem vulnerabilidades. Contextos/lint PASS em snapshot dos arquivos rastreados sem os documentos alheios/untracked. Correção1.0.1 no SHA15db40625e636bd273e2cb78d99095e709737f57; branch CI38012643014/38012643034 e main38012751626/38012751674 success. VPS checkout alinhado e serviço com SHA esperado, healthy/zero reinícios. Rollback-before-15db406 preserva imagem inicial; volume/secret mantidos. HTTP site/portal/sete assets200, Parser/Paddle sem auth403 e webhook sem assinatura401. Evidências em evidence/hrt-email-forwarding/ci.json, deployed-smoke.json, http-preservation.json, baseline-containers.txt/after-containers.txt e operational-checkpoint.json.

Estado parcial: servidor/código/credencial/webhook implementados, recebimento habilitado no Resend; MX raiz priority10 inbound-smtp.sa-east-1.amazonaws.com ainda pending e não gravado no Registro.br. Nenhum e-mail real enviado ou encaminhado. Nova autenticação do PO foi solicitada pela sessão expirada; somente depois desse gate concluir DNS autoritativo, verificação e testes sintéticos em dois aliases/anexo/replay. Não declarar D-01/D-02/D-04 PASS nem entrega funcional até essas evidências. Arquivos alheios preservados. Prisma permanece2.3.0; não houve rebuild dos runtimes existentes.
