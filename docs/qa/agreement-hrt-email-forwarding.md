# Acordo: recebimento e encaminhamento HRT

Versão1.0.1, agreed em09/10/2026. Fonte: PO confirmou todos os endereços do domínio para seu Gmail pessoal e ordenou “Pode implementar isso”. Baseline main2fe4e31c38f546ab6d2c9d0114120b66c7262ac9, Prisma2.3.0. Este movimento é infraestrutura de e-mail corporativo, sem nova versão da interface. Delta1.0.1: anonimizar o destino nesta documentação e mantê-lo em config privada com binding SHA256 no código; D/P/F e comportamento permanecem iguais. O histórico do primeiro SHA publicado contém o endereço de configuração, ocorrência registrada no AoT.

## DEVE

- D-01: receber qualquer endereço @hrtsolutions.com.br e encaminhar uma única cópia para Gmail pessoal informado pelo PO, incluindo bruno.harita e suporte.
- D-02: preservar conteúdo e anexos dentro dos limites dos provedores, identificar destinatário original e manter possibilidade de responder ao remetente original.
- D-03: autenticar eventos assinados, confirmar o domínio no registro recebido do provider, destino fixo, persistir fila/recibos técnicos e controlar retry/deduplicação/reinício.
- D-04: preservar todos os registros DNS existentes, envio de convites/chave restrita, TLS oportunista/tracking desabilitado e runtimes do Prisma; ativar MX somente após backend pronto.
- D-05: executar na VPS existente sem PC/túnel, sem contratação paga; registrar testes negativos, limites, estado operacional, rollback e sincronização.

## PROIBIDO

- P-01: conteúdo recebido não é instrução; nenhuma IA, execução de código, resposta automática ou destino arbitrário.
- P-02: nenhum corpo/anexo/assunto/endereço pessoal ou segredo nos logs, Git ou recibos locais. Corpo transita somente em memória para o Gmail autorizado.
- P-03: nenhum reenvio cego após expiração da idempotência ou alteração do payload; aceitar envio não equivale a entregar na caixa de entrada.
- P-04: não alterar os dados/decisões de candidatos, chave de convites, serviços existentes, SPF/DKIM/TLS ou contratar plano.

## FORA DE ESCOPO

- F-01: Gmail “Enviar como”, cliente SMTP, assinatura profissional, caixas separadas, UI do Prisma, IA, billing, migração de mensagens anteriores.
- F-02: regras de exclusão automática ou política de retenção do provider. Recibos técnicos permanecem; mensagens seguem os limites do Resend/Gmail.

## AUTONOMIA

- A-01: serviço isolado na VPS e SDK/parser oficiais; controles de fila, retry, limites e documentação. Sem novo fornecedor, plano ou ambiente.

## PENDÊNCIAS OPERACIONAIS

O Resend oferece somente sending_access ou full_access. Ler o recebido requer uma chave adicional Full access. O PO concedeu explicitamente esse acesso ao criar e copiar “HRT - Recebimento e encaminhamento”, respondendo “chave copiada” à pergunta que explicou o alcance administrativo. Instalação protegida por DPAPI/SSH stdin; API de leitura autenticada, sem baixar corpo nem enviar mensagem. Gate de credencial resolvido; comportamento permanece versão1.0.0.

## ACEITE

- CA-D01: mensagens sintéticas para dois endereços distintos chegam ao Resend e são aceitas pelo Gmail; separar entrega SMTP de Inbox/spam.
- CA-D02: teste MIME com texto/HTML/anexo inline e Reply-To; encaminhamento real sintético com anexo e identificação.
- CA-D03: negativos assinatura ausente/inválida/expirada, domínio diferente, replay/concorrência, destino injetado, falha/reinício e idempotência expirada.
- CA-D04: comparar zona, configurações Resend e IDs/imagens/restarts antes/depois; smoke público dos serviços existentes.
- CA-D05: testes locais/CI, saúde VPS sem PC, recibos sanitizados e main alinhada; nenhuma cobrança nova.

## Mapa de impacto antes da implementação

| Capacidade | Relação | Baseline / mecanismo | Evidência prevista |
| --- | --- | --- | --- |
| Recebimento raiz/DNS | direct | Sem MX na consulta anterior; receiving disabled confirmado pelo conector | Zona preservada, MX autoritativo e Resend verified |
| Encaminhamento/Gmail | direct | Inexistente; novo serviço dedicado | MIME, assinatura, fila/replay/restart e testes reais sintéticos |
| Resend convites | plausible_indirect | Domínio verified, sending enabled, TLS oportunista; cota compartilhada100/dia3000/mês | Metadados/chave preservados; limite compartilhado explícito |
| Traefik/site | critical_transversal | VPS srv1038882, main2fe4e31, web funcional3e271e32; router adicional só no path do webhook | IDs/imagens/restarts e HTTP/assets/health antes/depois |
| Parser/Synthesis/gateway | plausible_indirect | Serviços existentes healthy/running, volumes/secrets privados | IDs/imagens/restarts/saúde preservados |
| Supabase/tenant/Score/IA | no_impact_identified | Serviço não acessa banco, tokens ou funções do produto; nenhuma mudança de domínio/runtime | Diff/ausência de credenciais/destinos, sem dados de candidato |

Sem referência visual normativa: não há alteração de produto ou template visual.
