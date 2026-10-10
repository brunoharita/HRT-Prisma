# AoT: encaminhamento corporativo HRT

Contrato docs/qa/agreement-hrt-email-forwarding.md v1.0.1 e execução correspondente, template aot-template.md. Baseline main2fe4e31, branch codex/hrt-email-forwarding, Prisma2.3.0 preservado. Em andamento: não declarar recebimento funcional antes da ativação/entrega. Primeiro SHA funcionaldc13eee publicado em main/origin/VPS, CI branch38012158752/38012158817 e main38012271121/38012271133 success. Serviço healthy/zero reinícios, assinatura ausente401; seis containers preservam IDs/imagens/restarts. Receiving enabled, DKIM/CNAMEs verified e MX pending; sessão Registro.br expirou e aguarda login do PO.

## Matriz de acordos

| ID | Implementação | Teste/evidência | Status | Limitação |
| --- | --- | --- | --- | --- |
| D-01 | Catch-all no domínio e destino fixo | Fila local/sintética pronta; ativação e teste real pendentes | PARTIAL | Sem MX ativo ainda |
| D-02 | MIME oficial, Reply-To e identificação | Teste texto/HTML/anexo inline/headers | PARTIAL | E-mail real com anexo pendente |
| D-03 | Assinatura, API scope, SQLite/hash/receipt/retry |16testes Windows e16Docker readonly/networknone no host existente | PASS | Inclui falha/replay/concorrência/reinício/expiração/destino injetado |
| D-04 | Compose/router e secrets isolados | Baseline IDs/imagens/restarts; sending key distinta | PARTIAL | Comparação pós-rollout pendente |
| D-05 | VPS existente, pacote/CI/release próprios | Build Docker/16testes,21tooling e audit sem vulnerabilidade | PARTIAL | CI/main/prod/smoke pendentes |

## Proibições

P-01 PASS: texto de ataque fica só no corpo encaminhado, sem IA/comando/destino externo. P-02 PASS local: logs/SQLite/artefatos apenas metadados; segredo capturado DPAPI/SSH stdin e salvo UID1000/mode400. P-03 PASS local: idempotência/payload/expiração testados; aceitação separada de entrega. P-04 PARTIAL até comparação pós-rollout; nenhuma mudança de produto/banco/chave restrita ou plano.

## Impacto e preservação

Mapa inicial no Agreement. Serviço/DNS/Gmail direct; cota/envio Resend e recursos do host plausible_indirect; Traefik/site critical_transversal; Supabase/tenant/Score/IA no_impact_identified após inspeção dos consumidores e ausência de credenciais/destinos do produto. Baseline sanitized em evidence/hrt-email-forwarding/baseline-containers.txt. Registro.br tem oito entradas, sem MX; Resend receiving disabled, sending verified/enabled. Infra existente não deve ser recriada. Após implantação: comparar IDs/imagens/restarts/health e smoke público do site/assets/portal/negações dos gateways.

## Fora de escopo e visual

F-01/F-02 preservados: nenhuma UI/template normativo novo, Gmail SMTP/Enviar como, IA, billing, purga, mudança de plano ou mensagens antigas. Referência visual não aplicável; formulário administrativo não é mockup de produto.

## Desvios e limites

Nenhum desvio funcional identificado na revisão local. Ocorrência de privacidade: destino configurado entrou em texto claro no SHA públicodc13eee, antes da confirmação da visibilidade PUBLIC do remoto. Valor removido dos arquivos atuais e transferido para config privada com binding hash na correção1.0.1. PO informado; endereço não é credencial, mas continua no histórico publicado. Nenhum secret ou conteúdo recebido foi exposto, nenhuma reescrita/remoção de histórico realizada. Full access exigido pelo provider foi apresentado e concedido pelo PO antes da instalação. Docker local indisponível; QA executado em container isolado na VPS existente, readonly e networknone, sem dados/segredos/produto. Não há QA remoto separado. Limite raw20MiB, quotas compartilhadas; não garante Inbox, spam, autenticação do remetente original ou segurança dos anexos. Rota de forwarding não toma decisões de emprego e não usa IA/ledger.

## Validação e ambientes

Windows16testes PASS; Docker16testes PASS;21testes tooling PASS; audit isolado sem vulnerabilidades. CI, main/origin/VPS, MX, verificação Resend e entrega real NOT TESTED nesta etapa. Fechamento somente quando todos D forem PASS.
