# Matriz de testes

| Área | Cenário positivo | Cenário negativo/limite | Estado |
| --- | --- | --- | --- |
| Auth | username válido com sessão Supabase | username inexistente, senha incorreta e sem sessão | `harita.super` conectado no QA; negativos locais |
| Autorização | ação permitida por perfil e escopo | sessão sem membership, role desconhecida, escopo inválido | foundation QA validada; M2-A local cobre guards, hierarquia e falha fechada |
| Multi-tenant | dados do próprio tenant | ID conhecido e usuário sem membership | JSON e RLS QA testados em duas organizações sintéticas |
| Usuários da plataforma | criar, listar e editar dentro da autoridade | Member/Recruter sem gestão, autoelevação, último Owner, cross-group/cross-company | schema/Edge/UI ativos em QA; lista Super Admin comprovada |
| Pessoas | listar, cadastrar, editar e consultar perfis do tenant | PII/documento negados a perfil sem autoridade | M2-B ativo em QA; member negado por RLS e rota local |
| Pessoa, documento e perfil vigente | perfil atual independente da importação, Central da Pessoa, visualização curricular M5 somente leitura, revisão parcial e descarte auditável | Member/sem sessão, documento sem revisão, tentativa de mutação em visualização, documento aprovado, replay, falha técnica e ausência de importação | 105 testes locais e transações revertidas aprovados no QA; smoke visual autenticado pendente por sessão expirada |
| Currículo-first | PDF cria ou vincula Pessoa e converge para revisão | identidade insuficiente, duplicidade ambígua e sem nome não criam Pessoa | unit/contract local; evidência conectada pendente |
| Deduplicação de Pessoa | mesmo e-mail/telefone sugere vínculo no tenant | nome isolado não faz merge; cross-tenant não aparece | migration e UI implementadas; QA pendente |
| Upload | texto/PDF privado até 15 MB | tipo, tamanho, assinatura, trailer e parse inválidos | contrato implementado; malware scan ausente |
| Formatos | texto e PDF nativo/scan | formato exótico/corrompido | texto, PDF nativo v4 e PDF image-only v5 comprovados no remoto interno |
| Extração | perfil mínimo | sem texto, schema inválido, timeout | testado |
| Prompt injection | documento normal | instrução maliciosa em currículo | golden testado |
| OCR | scan legível com fallback seletivo | página insuficiente após OCR | Tesseract local comprovado em uma página; fixture inicial insuficiente foi recusada e fixture válida gerou 360 caracteres úteis |
| Parsing | seções conhecidas | variação, datas, caracteres | golden parcial |
| Extração adaptativa | layout repetido, período abreviado, empresa em linha distinta, bloco completo e padrão aprovado do tenant | não copiar correção, não sobrescrever revisão humana, registro ambíguo, versão desconhecida e layout legado | regressão local e transação QA aprovadas; lote real autorizado pendente |
| Revisão manual | corrigir e aprovar, inclusive com área personalizada | lock stale, estado inválido, tenant/papel, dados mínimos, evidência, shape, duplicidade e falha interna sanitizada | M2-C ativo; regressão local e aprovação completa com rollback aprovadas no Prisma-QA |
| Evidência espacial M5 | selecionar somente caracteres visualmente contidos, aplicar ou corrigir sem texto livre, registrar auditoria automática, complementar/substituir e navegar no histórico | linha que apenas intersecta a borda, conteúdo obrigatório vazio, erro oculto atrás do modal, coordenada/página/versão inválida, Member, cross-tenant e DML direto | regressão local, schema/RPC QA e browser autenticado aprovados |
| Segmentação de competências | grade espacial e texto delimitado geram um item por competência, preservando nomes compostos e ordem | múltiplas linhas sem fronteira segura não viram um único fato; duplicidade equivalente, `/`, item único e seleção vazia | regressão determinística e colagem autenticada aprovadas; smoke da grade espacial pendente |
| Evidência por campo | clicar extraído/revisado navega para a origem correta e retirar evidência humana preserva histórico | excluir original, link de outro tenant e lock stale | contrato e testes locais; QA pendente |
| Aprendizado imediato | correção relê irmãos, aceite parcial salva revisão/evento/casos e aprovação promove padrão | sem JWT, DML direto, replay divergente, lock stale, promoção antes da aprovação e payload com valor/trecho | unit/contract e transações com rollback no QA aprovadas; smoke autenticado pendente |
| Interação centrada em decisão | aviso sem proposta fecha localmente; descarte válido não bloqueia e registra telemetria em segundo plano | assinatura ausente, RPC indisponível, zero proposta e erro secundário | regressão local obrigatória; smoke autenticado do descarte pendente |
| Duplicidade | primeira importação | mesma chave com payload divergente e concorrência | M2-C local/QA aprovado |
| Vagas M5.4 | criar manualmente ou por referência, ocupada/não ocupada, editar com nova versão e histórico | Vaga vazia, ocupante incompatível, relação inválida, Member, anon e cross-tenant | migrations, prova revertida e smoke autenticado `1280x720` aprovados no QA; quatro viewports adicionais pendentes |
| Matching por Vaga | evidência direta, equivalência Knowledge, parcial rastreável e sinal relacionado | ausência apresentada como insuficiência, requisito ausente e relação local tratada como prova | testes determinísticos e descoberta autenticada aprovados no QA |
| Comparação M5.4 | exatamente duas Pessoas por requisito | uma/três Pessoas, score, ranking, vencedor e overflow mobile | contrato e comparação autenticada aprovados; captura real mobile pendente |
| Empate | ordem determinística | ranking arbitrário | golden e M5.4 testados |
| Explicabilidade | conclusão com evidência | evidência ausente ou órfã | testado |
| Busca natural | conceito conhecido | conceito sem candidato | golden testado |
| Filtros | nome, lifecycle, tenant e escopo | organização persistida inválida e ID cross-tenant | adapter e testes locais; dados QA persistidos |
| LGPD | exportação/correção | acesso ou retenção indevida | documentado, não implementado |
| Exclusão | agregado completo | cache, embedding e backup residual | planejado |
| Auditoria | criação e mudança material de usuário | segredo, token ou senha em trilha | M2-A local cria contrato e tabela; evidência conectada pendente |
| Custo | evento de uso | limite excedido/retry duplicado | telemetria parcial |
| Latência | média e p95 | timeout/degradação | baseline local parcial |
| Resiliência | provider disponível | timeout, resposta inválida, fallback | timeout testado |
| Concorrência | versões e tentativas serializadas | corrida no número de versão, lock stale e replay divergente | M2-C local/QA aprovado |
| Idempotência | mesma chave/fingerprint retorna mesmo resultado | mesma chave com fingerprint diferente | ledger M2-C local/QA aprovado |
| Acessibilidade | navegação semântica, labels, foco, contraste | teclado/screen reader | shell público local; autenticado conectado pendente |
| Responsividade | desktop, sidebar recolhida, drawer mobile | overflow, perda de navegação e quebra do formulário de usuário | desktop e viewport 390x844 conectados; sem overflow horizontal |
| Regression | suites estáveis | prompt/modelo/regra piora resultado | golden ativo |
| Migrations | RLS/grants/tenant | missing policy, unsafe delete, role drift e group drift | foundation, M2-A, M2-B, M2-C e M5 ativos no QA; advisors executados |
| Secrets | nenhum no repositório | key em código, log ou bundle | lint/scan local |
| Supply chain | lockfile fixado | advisory high/critical | CI planejado |

Todo item `planejado` precisa de owner e evidência antes de a capability correspondente ser ativada em QA.
