# Matriz de testes

| Área | Cenário positivo | Cenário negativo/limite | Estado |
| --- | --- | --- | --- |
| Auth | sessão válida | ausente, inválida e sem membership | Auth e ausência de sessão conectados; inspeção visual autenticada pendente |
| Autorização | ação permitida por papel | ação negada e tenant desconhecido | Admin, Recruiter e Hiring Manager testados no RLS QA; guards locais ativos |
| Multi-tenant | dados do próprio tenant | ID conhecido e usuário sem membership | JSON e RLS QA testados em duas organizações sintéticas |
| Upload | texto permitido | tipo, tamanho, malware, arquivo corrompido | parcial |
| Formatos | texto PT/EN | PDF, scan, formato exótico | texto testado; demais fail-closed |
| Extração | perfil mínimo | sem texto, schema inválido, timeout | testado |
| Prompt injection | documento normal | instrução maliciosa em currículo | golden testado |
| OCR | scan legível | baixa qualidade, sem OCR | não implementado |
| Parsing | seções conhecidas | variação, datas, caracteres | golden parcial |
| Revisão manual | corrigir e aprovar | tentar promover parcial sem revisão | não implementado |
| Duplicidade | primeira importação | mesma chave e concorrência | planejado |
| Vagas | requisitos claros | vazio, incompatível, cross-tenant | contrato parcial |
| Matching | atendido/parcial/gap | insuficiência e requisito ausente | golden testado |
| Empate | ordem determinística | ranking arbitrário | golden testado |
| Explicabilidade | conclusão com evidência | evidência ausente ou órfã | testado |
| Busca natural | conceito conhecido | conceito sem candidato | golden testado |
| Filtros | nome, lifecycle, tenant e escopo | organização persistida inválida e ID cross-tenant | adapter e testes locais; dados QA persistidos |
| LGPD | exportação/correção | acesso ou retenção indevida | documentado, não implementado |
| Exclusão | agregado completo | cache, embedding e backup residual | planejado |
| Auditoria | ator/ação/resultado | log sem ator ou com PII | planejado |
| Custo | evento de uso | limite excedido/retry duplicado | telemetria parcial |
| Latência | média e p95 | timeout/degradação | baseline local parcial |
| Resiliência | provider disponível | timeout, resposta inválida, fallback | timeout testado |
| Concorrência | processamento único | corrida e reprocessamento duplicado | planejado |
| Idempotência | mesma chave reutilizada | versão/conteúdo novo | checksum parcial |
| Acessibilidade | navegação semântica, labels, foco, contraste | teclado/screen reader | shell público local; autenticado conectado pendente |
| Responsividade | desktop, sidebar recolhida, drawer mobile | overflow e perda de navegação | público desktop/mobile validado; autenticado conectado pendente por login manual |
| Regression | suites estáveis | prompt/modelo/regra piora resultado | golden ativo |
| Migrations | RLS/grants/tenant | missing policy, unsafe delete | static testado |
| Secrets | nenhum no repositório | key em código, log ou bundle | lint/scan local |
| Supply chain | lockfile fixado | advisory high/critical | CI planejado |

Todo item `planejado` precisa de owner e evidência antes de a capability correspondente ser ativada em QA.
