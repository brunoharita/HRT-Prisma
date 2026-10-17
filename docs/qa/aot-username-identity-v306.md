# AoT — Username único e contato compartilhável / 3.0.6

Acordo `docs/qa/agreement-username-identity-v306.md`1.0.1 integralmente incorporado; decisão de Bruno17/10/2026. Baseline6f12850/runtime3.0.5. ADR-086 / operator-identity2.0.0. Evidências em `docs/qa/evidence/username-identity-v306/`.

## Matriz de acordos

| ID | Implementação e prova | Status | Ambiente/limite |
| --- | --- | --- | --- |
| D-01 | Índice de contato não único, username/Auth UUID únicos; SQL dois contatos iguais em grupos diferentes, cadastro manual/Owner/browser | PASS | PG17 local isolado e handlers sintéticos |
| D-02 | Alias técnico exclusivo, login resolve Auth UUID e confere sessão; pares A/B e credenciais cruzadas rejeitadas, identidade/sessão divergentes negadas | PASS | SDK real/transportes sintéticos; Auth externo não usado para testes |
| D-03 | generateLink recovery oficial, envio ao contato com username, redirect fixo; claim/60s/3por hora/concorrência, recibos e falhas; público somente username/neutro | PASS | Não equivale a recebimento humano ou teste criptográfico do serviço Auth |
| D-04 | Nenhum backfill/reset; migração preserva todos os campos/IDs/Auth/memberships; login legado, edição/conversão e compensação testados, conclusão de A ignora B | PASS | Preservação remota a conferir na publicação sem mutação de contas reais |
| D-05 | Migração/três Edges/web, CI e smoke/sincronização | NOT TESTED | Publicação pendente |

## Proibições

| ID | Prova | Status |
| --- | --- | --- |
| P-01 | Handler não consulta primeiro e-mail, nunca reutiliza Auth por contato; cruzamento de senha/ID/sessão/token-alvo negado; username e Auth UUID mantêm constraints | PASS |
| P-02 | Só primitives oficiais; sem senha/token em recibos/artefatos, nenhum envio/conta real de teste; nenhuma alteração de RLS/perfil/plano/Auth hospedado | PASS |
| F-01 | Sem SSO/MFA/provedor novo/fusão/seleção por e-mail/redesign/reset em massa | PASS |

## Mapa de impacto e preservação

Mesmo mapa inicial do acordo, sem expansão. Banco de metadados de entrega usa vínculo Auth e organization_id quando disponível, RLS e grants exclusivos de funções service_role. Reutiliza getter de credencial de envio já criptografada: dependência transversal registrada; nenhuma consulta do segredo em ferramentas, fila/dispatcher/avaliação intactos.

| Área | Relação | Regressão/evidência | Status |
| --- | --- | --- | --- |
| Cadastro/Owner/edição | direct | Handlers atuais e novos,150checks SQL,162browser; locks, escopo e compensação | PASS |
| Login/ativação/recuperação/primeiro acesso | critical_transversal |4Deno; contas A/B, legado, estado, retorno neutro, direcionamento/redirect, entrega/timeout/compensação; SignIn real extraído no harness | PASS |
| Contato/índices/recibos | direct | SQL/grants/RLS/limites e duas conexões concorrentes, sem PII/tokens em tabela operacional | PASS |
| Configuração de envio | plausible_indirect | Projeto Prisma saudável, configuração instalada=1; getter somente service_role e mock de transporte. Provedor/entrega humana não testados nesta fase | PARTIAL |
| Autorização/memberships/histórico | critical_transversal | Regressão multiempresa/Owner em150SQL e4Deno; ID continua autoridade, migração não toca Auth/roles/RLS existentes | PASS |
| Matching/IA/Tokens/Pessoas/outros serviços | no_impact_identified | IDs/joins/políticas preservados; sem modificações nesses módulos. Serviços remotos a conferir | PARTIAL |

## Validação, fidelidade e limites

150checks PostgreSQL17 isolado PASS: harness real de multiempresa/Owner e testes novos de identidade.162checks browser PASS em1448/390/320, incluindo147de regressão/recuperação e cadastro com contato existente.17Node PASS após build atual;4Deno PASS (29cenários anteriores e bateria nova de identidade); deno check das três Edges/helper PASS; tipos web/build web/build TypeScript/lint/foundation PASS. CI/contexto/publicação pendentes.

Senha sintética única somente em memória, campos mascarados. Screenshots de contato compartilhado e recuperação inspecionados: composição/locks/requisitos8 preservados; login sem redesign. Sem nova referência normativa; imagens anteriores são baseline da estrutura, não amostras de conta real. Mensagem de e-mail é HTML/texto simples acessível, sem tracking aplicado pelo código.

Falhas de harness corrigidas: stub antigo de invite substituído por createUser/generateLink; import dinâmico de Deno requer allow-read restrito à pasta; tipo do cliente Supabase genérico corrigido e deno check passou. Importar o shell inteiro no fixture de login encontrou export ausente em stub alheio; harness extrai somente SignInPage real, sem alterar aquele produto. A execução inicial Node em dist anterior não foi usada como evidência;17testes foram repetidos após build correto. Aviso inválido320px com legibilidade não comprovada é a limitação já registrada na3.0.5, sem mudança de layout neste movimento.

## Segurança e recuperação operacional

O projeto compartilhado Prisma é produção, não ambiente para criar contas/enviar testes. Validação QA usa PostgreSQL descartável e handlers/telas reais com transportes sintéticos; não há ambiente Auth hospedado de QA separado confirmado. Token/expiração/uso único são fornecidos pelo Auth nativo; testes provam escolha do usuário correto, não uma certificação criptográfica nem entrega humana. A configuração hospedada de senha continua6 conforme Bruno informou; Prisma exige8, sem mudança desta política.

Rollback de web usa imagem anterior e é compatível com a API nova. Após existir conta técnica ou contato duplicado, não restaurar handlers antigos de login/recuperação nem recriar índice único: corrigir adiante preservando identidade2.0.0. Fontes antigas/versões constam do Git e baseline remoto; sem apagar usuário, alias, histórico ou e-mail duplicado para facilitar rollback. Não alterar configurações hospedadas Auth ou segredos no rollout.

## Desvios e conclusão

Nenhum desvio identificado do acordo1.0.1. Implementação validada localmente; CA-04/D-05 e operação/sincronização ainda não comprovados. Entrega não declarada concluída até publicação seletiva e CI/smoke finais.

Revisão de segurança local: conversão de alias legada é monotônica e idempotente; a falha de save não muda contato/ID/senha e não restaura endereço Auth antigo que poderia sobrepor edição concorrente. Acordo1.0.1 explicita esta escolha interna dentro de A-01, sem mudança do resultado aprovado. Teste negativo de login após falha acrescido; demais provas válidas não repetidas.
