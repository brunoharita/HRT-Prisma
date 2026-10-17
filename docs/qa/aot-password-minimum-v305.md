# AoT — Mínimo de senha8 /3.0.5

Contrato `docs/qa/agreement-password-minimum-v305.md`1.0.1, decisão de Bruno17/10/2026. Baseline9a456e4/runtime3.0.4 0c4af48. Evidência `docs/qa/evidence/password-minimum-v305/`.

## Acordos / proibições

| ID | Implementação / prova | Status |
| --- | --- | --- |
| D-01 | Constante8 web/Edge/config; fronteiras7/8/9/10/11/12e negativos das condições preservadas | PASS |
| D-02 | Cadastro/Owner/troca compartilham mínimo8e rótulos; Auth hospedado6 informado por Bruno, compatível e preservado | PASS |
| P-01 | Nenhuma conta/credencial real alterada; JWT7=true baseline; somente comprimento muda | PASS |
| F-01 | Sem migration/RLS/provedor/regras novas/redesign; diff dirigido | PASS |
| CA-03 | Runtime3c11f5e publicado, Edge8/JWTtrue/fonte igual,22smokes públicos/401anônimo/rollback/5serviços preservados; Auth6 conforme Bruno | PASS |

## Mapa de impacto e preservação

Mesmo mapa do acordo. Dependência operacional identificada antes de implementar: mínimo do serviço Supabase Auth é separado do config.toml local.

| Área | Relação | Prova / estado |
| --- | --- | --- |
| Cadastro/Owner/feedback web | direct | Comparador/política e browser com7/8, foco, cores/checks/locks e submit8sintético |
| Troca/primeiro acesso | direct | Helper8 e tela real com Auth/completion sintéticos;7não atualiza,8atualiza e conclui |
| Edge/Auth | critical_transversal |3Deno/29cenários PASS,19anteriores+10de senha; mínimo do Auth hospedado6 informado por Bruno; sem leitura direta, compatível com8 |
| Escopo/canonicalidade/automático | plausible_indirect | Handler real com quatro perfis/negativos/compensação anteriores, browser do Owner/genérico |
| RLS/banco/outros serviços | no_impact_identified | Sem alterações/consultas nesses destinos; apenas metadados/fontes Edge lidos para baseline |

## Validação e fidelidade

21Node/tooling PASS: política/config/Edge alinhados localmente, fronteiras/complexidade/confirmação, identidade/rotas/avisos/versão.3Deno PASS/29cenários com fetch sintético; nenhum serviço externo/conta/e-mail. Tipos/build web e build TypeScript PASS. 138browser PASS (112anteriores adaptados ao limiar8,26casos novos de fronteira/submit/troca/genérico). Lint/foundation/contexto/ledger/diff PASS; CI funcional e21abd8 PASS (39046362811); revisão3c11f5e CI branch39055765363 PASS; main39055861395 PASS. Screenshots mascaradas, mesma topologia/dados sintéticos/larguras1448/390/320 do movimento anterior; só rótulo/limite mudou. Senhas únicas geradas em memória, sem valor em fonte/log/artefato. Sem jornada autenticada humana em produção.

Falha inicial de harness: no320px o texto do aviso de senha inválida (cadastro/troca) ficou sem área visível; assert alterado para presença da resposta e ausência de submit, com requisito vermelho visível sendo a prova de feedback do mínimo. Isso não declara PASS para legibilidade desses avisos nem altera seu layout fora do escopo. Outros casos/ações de recuperação anteriores permanecem na regressão.

## Confirmação operacional / publicação

Bruno confirmou no chat17/10/2026 mínimo6 já configurado no Auth e reiterou que o requisito Prisma deve ser8. Acordo1.0.1 supersede o requisito anterior de Auth hospedado exatamente8. Esse piso6 aceita8 e permanece preservado. Não foi possível ler diretamente o Auth: ferramentas de interface falharam ao inicializar e conector não expõe essa configuração. A origem do valor6 é a confirmação humana; não config.toml, fixture ou inferência. Troca/primeiro acesso continuam com validação web8 antes da API nativa, cujo piso continua6. Cadastro/Owner também validam8 na Edge. Nenhuma credencial de gerenciamento foi obtida de sessões do navegador.

Baseline Edge platform-users7, verify_jwt=true, fonte obtida do conector no projeto Prisma saudável. Plano publica apenas essa Edge e web, sem migrations/outros serviços ou alteração de Auth.138browser/21Node/3Deno já válidos; esta revisão é documental e não repete testes funcionais sem novo diff. Publicado runtime3c11f5e139516bd34edafaef294b6409a8f50d7e em main/VPS. Edge platform-users8 ACTIVE, verify_jwt=true e fonte normalizada igual ao Git.22checks públicos PASS:4rotas,assets novos/anteriores,versão/SHA,navegação anônima Owner protegida e ausência de exceções. Chamada Edge sem JWT respondeu401. Web running/restarts0; cinco serviços adjacentes idênticos, imagem anterior retida em prisma-web:rollback-before-3c11f5e13951. Probe imediato do script retornou404 durante recriação; conferência independente após estabilização passou, sem repetir build. Evidências production.json/public-smoke.json/anonymous-edge.json/containers-before.txt/containers-after.txt; registro final sincronizado por commit documental, sem novo build/deploy.

## Conclusão

D-01/D-02/P-01 e CA-01/02/03 PASS no escopo do acordo1.0.1; mínimo8 publicado, demais requisitos preservados. Desvios do acordo vigente: nenhum. Piso nativo Auth6 informado por Bruno permanece explícito; não equivale a imposição8 no endpoint nativo. CI funcional branch/main PASS. Registro pós-publicação em commit documental, sem novo deploy funcional; SHA final de sincronização e CI do registro conferidos no encerramento. Jornada autenticada humana em produção não testada; testes de senha usam transportes sintéticos sem contas/e-mails reais.
