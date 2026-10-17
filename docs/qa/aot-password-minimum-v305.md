# AoT — Mínimo de senha8 /3.0.5

Contrato `docs/qa/agreement-password-minimum-v305.md`1.0.0, decisão de Bruno17/10/2026. Baseline9a456e4/runtime3.0.4 0c4af48. Evidência `docs/qa/evidence/password-minimum-v305/`.

## Acordos / proibições

| ID | Implementação / prova | Status |
| --- | --- | --- |
| D-01 | Constante8 web/Edge/config; fronteiras7/8/9/10/11/12e negativos das condições preservadas | PASS |
| D-02 | Cadastro/Owner/troca compartilham mínimo8e rótulos; Auth remoto depende de confirmação | PARTIAL |
| P-01 | Nenhuma conta/credencial real alterada; JWT7=true baseline; somente comprimento muda | PASS |
| F-01 | Sem migration/RLS/provedor/regras novas/redesign; diff dirigido | PASS |
| CA-03 | Publicação e Auth8pendentes; runtime continua3.0.4 | BLOCKED |

## Mapa de impacto e preservação

Mesmo mapa do acordo. Dependência operacional identificada antes de implementar: mínimo do serviço Supabase Auth é separado do config.toml local.

| Área | Relação | Prova / estado |
| --- | --- | --- |
| Cadastro/Owner/feedback web | direct | Comparador/política e browser com7/8, foco, cores/checks/locks e submit8sintético |
| Troca/primeiro acesso | direct | Helper8 e tela real com Auth/completion sintéticos;7não atualiza,8atualiza e conclui |
| Edge/Auth | critical_transversal |3Deno/29cenários PASS,19anteriores+10de senha; mínimo do Auth remoto NÃO VERIFICADO |
| Escopo/canonicalidade/automático | plausible_indirect | Handler real com quatro perfis/negativos/compensação anteriores, browser do Owner/genérico |
| RLS/banco/outros serviços | no_impact_identified | Sem alterações/consultas nesses destinos; apenas metadados/fontes Edge lidos para baseline |

## Validação e fidelidade

21Node/tooling PASS: política/config/Edge alinhados localmente, fronteiras/complexidade/confirmação, identidade/rotas/avisos/versão.3Deno PASS/29cenários com fetch sintético; nenhum serviço externo/conta/e-mail. Tipos/build web e build TypeScript PASS. 138browser PASS (112anteriores adaptados ao limiar8,26casos novos de fronteira/submit/troca/genérico). Lint/foundation/contexto/ledger/diff PASS; CI pendente. Screenshots mascaradas, mesma topologia/dados sintéticos/larguras1448/390/320 do movimento anterior; só rótulo/limite mudou. Senhas únicas geradas em memória, sem valor em fonte/log/artefato. Sem jornada autenticada humana em produção.

Falha inicial de harness: no320px o texto do aviso de senha inválida (cadastro/troca) ficou sem área visível; assert alterado para presença da resposta e ausência de submit, com requisito vermelho visível sendo a prova de feedback do mínimo. Isso não declara PASS para legibilidade desses avisos nem altera seu layout fora do escopo. Outros casos/ações de recuperação anteriores permanecem na regressão.

## Bloqueio operacional / publicação

Não publicada. MCP/browser e node_repl falharam ao inicializar com `failed to write kernel assets` (os error3); conector Supabase disponível não expõe Auth config, CLI/token de gerenciamento não configurados no processo/local ou na VPS existente (somente presença de credencial específica conferida, sem saída de segredos). Nenhum token foi solicitado/exposto nem obtido de sessões do navegador. Solicitado ao usuário conferir/deixar Minimum password length8 no projeto Prisma ioldpnqqvobprjiontre, sem mudar outros parâmetros. [API oficial de configuração Auth](https://supabase.com/docs/reference/api/v1-update-auth-service-config) confirma configuração separada `password_min_length`; não substituir confirmação por config.toml ou teste sintético.

Baseline Edge platform-users7, verify_jwt=true, fonte obtida do conector no projeto Prisma saudável e conferida igual ao Git baseline. Plano deve publicar apenas essa Edge e web após a confirmação; sem migrations. Push/CI da branch isolada em execução; main/produção3.0.4 preservadas até Auth8 confirmado. Autorização da tarefa/standing cobre execução assim que o pré-requisito operacional for satisfeito, sem nova aprovação.

## Conclusão

Implementação local preparada, entrega PARTIAL enquanto Auth remoto e publicação não forem comprovados. Não declarar conclusão ou versão3.0.5 em produção. Nenhuma repetição de testes válidos será necessária apenas para aguardar a confirmação, salvo novo diff/falha/estado divergente.
