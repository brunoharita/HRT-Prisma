# AoT — preservação do primeiro acesso3.1.3

Acordo/execução: agreement-first-access-preservation.md1.0.0. Baseline895120b5ce2eeb979c9e4c5607ac906baf7b23e3; codex/preserve-first-access-v313, riscoD. Correção mantém versão3.1.3.

## Mapa de impacto e preservação

| Capacidade | Relação | Baseline e preservação | Prova proporcional |
| --- | --- | --- | --- |
| Edição administrativa/status | direct | pending convertido em active no formulário e persistido pela RPC | UI real e SQL de edição entre grupos/payload active |
| Primeiro acesso/login/reset | critical_transversal | must_change_password ainda true no incidente; conclusão pela RPC3.0.7 | SQL conclusão/concorrência e Edges offline |
| Owner/grupos/empresas | plausible_indirect | save compartilhado com guard/lifecycle | regressão local Owner pendente não ativa grupo |
| Authority/RLS/memberships | critical_transversal | RPC service-only com actor e tenant revalidados | negativos e snapshots |
| Conta de Juliano | direct | auditoria user_updated de19/10 promoveu pending→active junto ao vínculo; sem first_access_completed; flag true | CAS/audit restrito ao incidente, vínculos e credenciais preservados |
| IA/Pessoas/Tokens | no_impact_identified | RPC de operador não chama IA nem altera esses domínios | revisão do diff/plano; sem chamadas externas |

## AoT

| ID | Implementação | Evidência | Estado |
| --- | --- | --- | --- |
| D01 | formulário distingue habilitação e primeiro acesso; envia estado controlado | browser.json /27 checks em1448,390,320 | PASS local |
| D02/P01 | status derivado sob lock na RPC | postgres.json /325 checks incluindo22 novos | PASS local |
| D03 | conclusão/lifecycle/identidade preservados | PostgreSQL baseline/Owner/self-account e4 Deno reais/14 Node | PASS local |
| D04 | reparo específico auditado | pendente | NOT TESTED |
| P02 | sem IA/e-mail/teste produtivo | pendente | NOT TESTED |

Sem QA remoto separado. Provas funcionais sintéticas locais; leitura produtiva comprova o incidente, não representa login humano. Rascunhos não rastreados preservados e excluídos da release/contexto.


Validação local:325 checks PostgreSQL17 em banco isolado PASS; migração não altera registros/ACL, edição entre grupos, payload active/mustChangePassword adulterado, inativação/reativação pendente, conta bloqueada, legado ativo sem timestamp, conclusão concorrente e automações Owner.4 testes Deno de handlers reais com transporte fake PASS;14 Node dirigidos PASS; root build, typecheck web/build web PASS (warnings existentes de chunks/dynamic import). Sem suíte integral local; CI obrigatória permanece.

UI real:27 checks em1448/390/320 PASS, três renders com estado pendente e formulário compacto, edição/salvamento e envio explícito de inactive, bloqueado desabilitado e active preservado. O label usa Pendente com explicação completa, evitando truncamento móvel. A investigação também mostrou que status não é um campo registrado no Form: o envio agora usa o estado controlado do Segmented. Seletores de dropdown/radio do harness precisaram ajuste; o popup sintético ficou fora do viewport. A prova visual limita-se a edição básica/status; a transferência entre grupos/empresas foi exercitada na RPC real PostgreSQL, sem extrapolar a evidência browser. Avisos de depreciação AntD são preexistentes, sem pageerror. Sem teste de acesso humano produtivo, envio de mensagem ou IA.
