# AoT: vínculo múltiplo v2.0.9

Acordo `agreement-evidence-multiselect-v209.md` v1.0.0. Baseline bbe6c5d; mapa/CA no acordo. Movimento limitado ao modal/adapter/RPC lote/versão, com reuso do RPC unitário e Select Ant Design.

| ID | Implementação | Teste/evidência | Estado |
| --- | --- | --- | --- |
| D-01 | Select múltiplo, trechos por registro e credenciais preservadas |10fluxosUI:1/2seleções, remoção, falha, credencial1416/390; gravação/projeção atualizada | PASS |
| D-02 | Sem campo/input de justificativa, servidor registra somente confirmação/autor/data |UI ausência e payload sem reason; SQL confirma gravação, motivo histórico preservado | PASS |
| D-03/P-01 | Uma transação, funções legadas/fontes/autoridade reutilizadas, lock UI sem escolha prévia |SQL local rollback:1/2, replay, segunda fonte inválida reverte, fonte/conceito/tenant/member/anon negados, credenciais; UI doubleclick1chamada/erro preserva edição | PASS |
| D-04 | Registry2.0.9, release seletivo |5testes registry/types/build/contextos/lint/foundation PASS; CI branch37404841333/main37404931808 PASS; migration20261006023840/web/HTTP/rollback emruntime.json | PASS |

## Preservação e limites

Nenhuma suíte integral local. Somente tipos/build,5testes registry,10fluxos de tela e15checks SQL negativos/positivos da fronteira alterada. PostgreSQL17.5 local127.0.0.1:55479/DBdescartávelimport_evidence_v202, migrations/fixture em ROLLBACK. Nenhum teste mutacional em produção nem chamada de IA. UI com adapter sintético; SQL real comprova persistência/atomicidade e checks legados, não uma jornada autenticada real na aplicação hospedada. Essa jornada permanece NOT TESTED.

Conferência visual das capturas `evidence/evidence-multiselect-v209/multiple-1416.png` e `multiple-390.png` realizada. Imagem enviada pelo usuário é contraexemplo de cardinalidade/justificativa; mesma topologia preservada: competência-alvo e seleção no topo, trechos abaixo, confirmação/cancelamento no rodapé. Modal agora640px e blocos factuais separados, ajuste necessário à multiplicidade; sem redesign de navegação/Perfil. Texto das opções abreviado pelo Select no celular, com nome integral visível em cada bloco abaixo. Dados sintéticos não usam Pessoa real da imagem.

Funções de projeção/trigger/síntese/curadoria não foram substituídas; RPC legado preservado. Nenhum library/model/prompt/Parser/matching/backfill novo. Obrigatoriedade de nome/emissor de credenciais permanece factual. Erro mantém seleção e trechos; cliente não declara gravação quando o RPC falha. Arquivos alheios não incorporados. Registro da publicação e rollback abaixo.

## Publicação e sincronização

SHA funcional `83869c676cde721b438ea94857eca1273f17fa69`, CI branch37404841333/main37404931808 success. Plano seletivo: uma migration e web, sem Edge/worker/Parser. Migration aditiva `competency_evidence_batch`, remota20261006023840 no Prisma ioldpnqqvobprjiontre, aplicada antes da web; anon/INSERT direto negados, authenticated permitido sob require_knowledge_admin, RPC legado e trigger síntese preservados. Ledger registra alias exato sem reparar divergências históricas; cliDbPushAllowed=false. Nenhuma Pessoa real foi usada para testar gravação.

Web `08ce658e93da605dcb6b03f3393d4856ca0807379cdfdac59c6c483d1c879511`, running0/entryindex-Beiv2NZm.js, SHA/entrega2.0.9/RPCbatch/lista múltipla/ausência da justificativa conferidos no bundle. Rotas `/`, `/login`, `/people`, assets novos e anterioresindex-B1nbqs-I.js/index-Bx4s26MG.js HTTP200.404 imediato durante recriação estabilizou sem rebuild. Rollback antes de83869c676cde retém webf22a01f; rollback da web pode reutilizar o RPC legado sem retirar dados/migration. Worker8526717/Parser8682af7 healthy0/gatewayd061cea running0 e imagens preservadas. Evidência `evidence/evidence-multiselect-v209/runtime.json`.

Contextos gerados em snapshot dos arquivos autorizados (875files no gate inicial), checker/lint/foundation PASS. Suite completa local não executada; CI obrigatório do repositório executou seus gates automaticamente. Dez fluxos finais de tela e15checks SQL PASS; ajustes de seletores da fixture para navegação nativa e Select Ant Design atual foram corrigidos, sem alterar o produto para acomodar teste. Nenhum diagnóstico temporário no produto. Servidor/navegador QA próprios encerrados; PostgreSQL previamente ativo preservado.

D-01..04/P-01 PASS, sem desvio material. Jornada autenticada hospedada real NOT TESTED; fixture UI + PostgreSQL local não a substituem. Sem chamada real de IA. Complemento documental/ledger pertence ao mesmo movimento, sincronizado em main/VPS sem reconstruir a aplicação.