# Matriz de testes

| Área | Cenário positivo | Cenário negativo/limite | Estado |
| --- | --- | --- | --- |
| Auth | username válido com sessão Supabase | username inexistente, senha incorreta e sem sessão | `harita.super` conectado no QA; negativos locais |
| Autorização | ação permitida por perfil e escopo | sessão sem membership, role desconhecida, escopo inválido | foundation QA validada; M2-A local cobre guards, hierarquia e falha fechada |
| Multi-tenant | dados do próprio tenant | ID conhecido e usuário sem membership | JSON e RLS QA testados em duas organizações sintéticas |
| Usuários da plataforma | criar, listar e editar dentro da autoridade | Member/Recruter sem gestão, autoelevação, último Owner, cross-group/cross-company | schema/Edge/UI ativos em QA; lista Super Admin comprovada |
| Pessoas | listar, cadastrar, editar e consultar perfis do tenant | PII/documento negados a perfil sem autoridade | M2-B ativo em QA; member negado por RLS e rota local |
| Upload | texto/PDF privado até 15 MB | tipo, tamanho, assinatura, trailer e parse inválidos | contrato implementado; malware scan ausente |
| Formatos | texto e PDF nativo/scan | formato exótico/corrompido | texto, PDF nativo v4 e PDF image-only v5 comprovados no remoto interno |
| Extração | perfil mínimo | sem texto, schema inválido, timeout | testado |
| Prompt injection | documento normal | instrução maliciosa em currículo | golden testado |
| OCR | scan legível com fallback seletivo | página insuficiente após OCR | Tesseract local comprovado em uma página; fixture inicial insuficiente foi recusada e fixture válida gerou 360 caracteres úteis |
| Parsing | seções conhecidas | variação, datas, caracteres | golden parcial |
| Revisão manual | corrigir e aprovar | tentar promover parcial sem revisão | não implementado |
| Duplicidade | primeira importação | mesma chave com payload divergente e concorrência | M2-C local/QA aprovado |
| Vagas | requisitos claros | vazio, incompatível, cross-tenant | contrato parcial |
| Matching | atendido/parcial/gap | insuficiência e requisito ausente | golden testado |
| Empate | ordem determinística | ranking arbitrário | golden testado |
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
| Migrations | RLS/grants/tenant | missing policy, unsafe delete, role drift e group drift | foundation, M2-A, M2-B e M2-C ativos no QA; advisors executados |
| Secrets | nenhum no repositório | key em código, log ou bundle | lint/scan local |
| Supply chain | lockfile fixado | advisory high/critical | CI planejado |

Todo item `planejado` precisa de owner e evidência antes de a capability correspondente ser ativada em QA.
