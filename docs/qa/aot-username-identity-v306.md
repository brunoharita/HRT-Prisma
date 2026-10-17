# AoT — Username único e contato compartilhável / 3.0.6

Acordo `docs/qa/agreement-username-identity-v306.md`1.0.1 integralmente incorporado; decisão de Bruno17/10/2026. Baseline6f12850/runtime3.0.5. ADR-086 / operator-identity2.0.0. Evidências em `docs/qa/evidence/username-identity-v306/`.

## Matriz de acordos

| ID | Implementação e prova | Status | Ambiente/limite |
| --- | --- | --- | --- |
| D-01 | Índice de contato não único, username/Auth UUID únicos; SQL dois contatos iguais em grupos diferentes, cadastro manual/Owner/browser | PASS | PG17 local isolado e handlers sintéticos |
| D-02 | Alias técnico exclusivo, login resolve Auth UUID e confere sessão; pares A/B e credenciais cruzadas rejeitadas, identidade/sessão divergentes negadas | PASS | SDK real/transportes sintéticos; Auth externo não usado para testes |
| D-03 | generateLink recovery oficial, envio ao contato com username, redirect fixo; claim/60s/3por hora/concorrência, recibos e falhas; público somente username/neutro | PASS | Não equivale a recebimento humano ou teste criptográfico do serviço Auth |
| D-04 | Nenhum backfill/reset; migração preserva todos os campos/IDs/Auth/memberships; login legado, edição/conversão e compensação testados, conclusão de A ignora B | PASS | Produção preservou7operadores/7Auth/9vínculos/13auditorias, fingerprints de IDs/vínculos iguais, sem senha consultada |
| D-05 | Runtime9b55d07, migração20261017185531, Edges6/6/9/fontes/JWT,22smokes públicos+3negativos, CI branch/main PASS e registro sincronizado | PASS | Produção; envio humano não testado |

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
| Configuração de envio | plausible_indirect | Configuração instalada/getter pronto, domínio verificado/envio habilitado/tracking desabilitado. Mock de transporte; entrega humana não testada | PASS |
| Autorização/memberships/histórico | critical_transversal | Regressão multiempresa/Owner em150SQL e4Deno; ID continua autoridade, migração não toca Auth/roles/RLS existentes | PASS |
| Matching/IA/Tokens/Pessoas/outros serviços | no_impact_identified | IDs/joins/políticas preservados; sem modificações nesses módulos. Cinco serviços remotos idênticos após publicação | PASS |

## Validação, fidelidade e limites

150checks PostgreSQL17 isolado PASS: harness real de multiempresa/Owner e testes novos de identidade.162checks browser PASS em1448/390/320, incluindo147de regressão/recuperação e cadastro com contato existente.19Node PASS após build atual;4Deno PASS (29cenários anteriores e bateria nova de identidade); deno check das três Edges/helper PASS; tipos web/build web/build TypeScript/lint/foundation PASS. Contexto/ledger/diff PASS; CI branch39060095893/main39060219492 PASS; publicação seletiva comprovada.

Senha sintética única somente em memória, campos mascarados. Screenshots de contato compartilhado e recuperação inspecionados: composição/locks/requisitos8 preservados; login sem redesign. Sem nova referência normativa; imagens anteriores são baseline da estrutura, não amostras de conta real. Mensagem de e-mail é HTML/texto simples acessível, sem tracking aplicado pelo código.

Falhas de harness corrigidas: stub antigo de invite substituído por createUser/generateLink; import dinâmico de Deno requer allow-read restrito à pasta; tipo do cliente Supabase genérico corrigido e deno check passou. Importar o shell inteiro no fixture de login encontrou export ausente em stub alheio; harness extrai somente SignInPage real, sem alterar aquele produto. A execução inicial Node em dist anterior não foi usada como evidência;17testes foram repetidos após build correto. Aviso inválido320px com legibilidade não comprovada é a limitação já registrada na3.0.5, sem mudança de layout neste movimento.

## Segurança e recuperação operacional

O projeto compartilhado Prisma é produção, não ambiente para criar contas/enviar testes. Validação QA usa PostgreSQL descartável e handlers/telas reais com transportes sintéticos; não há ambiente Auth hospedado de QA separado confirmado. Token/expiração/uso único são fornecidos pelo Auth nativo; testes provam escolha do usuário correto, não uma certificação criptográfica nem entrega humana. A configuração hospedada de senha continua6 conforme Bruno informou; Prisma exige8, sem mudança desta política.

Rollback de web usa imagem anterior e é compatível com a API nova. Após existir conta técnica ou contato duplicado, não restaurar handlers antigos de login/recuperação nem recriar índice único: corrigir adiante preservando identidade2.0.0. Fontes antigas/versões constam do Git e baseline remoto; sem apagar usuário, alias, histórico ou e-mail duplicado para facilitar rollback. Não alterar configurações hospedadas Auth ou segredos no rollout.

## Desvios e conclusão

Nenhum desvio identificado do acordo1.0.1. D-01a05/P-01a02/CA-01a04 PASS dentro dos limites documentados. Runtime publicado9b55d07ccca9fa322016d53c6a156d5409ab9731; migração remota20261017185531 e três fontes Edge/JWT conferidos. Web3.0.6 running/restarts0,22checks públicos e3negativos Edge PASS.7operadores,7Auth,9vínculos e13auditorias inalterados; nenhum pedido de e-mail gerado por teste. Cinco serviços adjacentes e imagem anterior preservados. Registro pós-publicação em commit documental/ledger, sem novo rebuild. CI/sincronização do registro conferidas no encerramento.

Revisão de segurança local: conversão de alias legada é monotônica e idempotente; a falha de save não muda contato/ID/senha e não restaura endereço Auth antigo que poderia sobrepor edição concorrente. Acordo1.0.1 explicita esta escolha interna dentro de A-01, sem mudança do resultado aprovado. Teste negativo de login após falha acrescido; demais provas válidas não repetidas.

CI inicial39059880043 detectou contrato de teste antigo ainda exigindo recuperação por e-mail. platformUsersEdgeFunctions foi alinhado à decisão D-03/P-01 com negativos contra lookup por contato e reset direto por e-mail;2testes dirigidos PASS,19Node no total. Nenhum comportamento funcional mudou; CI repetida no SHA9b55d07 passou em branch/main.

## Publicação e encerramento operacional

Deploy web teve404 no probe imediato após recriação. A conferência independente de rotas/assets novos/anteriores, versão/SHA/browser e running0 passou após estabilização, sem repetir build. Rollback prisma-web:rollback-before-9b55d07ccca9 aponta para imagem anterior; preservar backend identidade2.0.0 conforme seção de rollback. Migração local20261017190000 mapeada à remota20261017185531; apenas esta migração aplicada pelo conector, sem db push histórico. Fontes dos três bundles incluem helper idêntico ao Git; verify_jwt continua false/false/true respectivamente.

Evidência: production.json, edge-smoke.json, public-smoke.json, containers-before/after.txt, browser.json, postgres.json e screenshots. Configuração de envio foi verificada por booleano seguro no backend e metadados do Resend, sem consultar segredo em ferramentas. Aceitação/entrega real de e-mail e jornada autenticada humana continuam NOT TESTED, sem impedir a distinção das provas locais/rollout. Nenhum teste com conta, senha ou destinatário real foi executado em produção.
