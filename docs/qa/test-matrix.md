# Matriz de testes

| Área | Cenário positivo | Cenário negativo/limite | Estado |
| --- | --- | --- | --- |
| Auth | sessão válida | ausente, expirada, removida | shell web local testado; ambiente conectado pendente |
| Autorização | ação permitida por papel | ação negada e tenant desconhecido | migration/documentado; route guard local testado |
| Multi-tenant | dados do próprio tenant | leitura, update e vínculo cruzado | JSON testado; RLS pendente |
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
| Filtros | tenant e escopo | bypass de filtro | parcial |
| LGPD | exportação/correção | acesso ou retenção indevida | documentado, não implementado |
| Exclusão | agregado completo | cache, embedding e backup residual | planejado |
| Auditoria | ator/ação/resultado | log sem ator ou com PII | planejado |
| Custo | evento de uso | limite excedido/retry duplicado | telemetria parcial |
| Latência | média e p95 | timeout/degradação | baseline local parcial |
| Resiliência | provider disponível | timeout, resposta inválida, fallback | timeout testado |
| Concorrência | processamento único | corrida e reprocessamento duplicado | planejado |
| Idempotência | mesma chave reutilizada | versão/conteúdo novo | checksum parcial |
| Acessibilidade | navegação, leitura, contraste | teclado/screen reader | shell web local parcial |
| Responsividade | viewports definidos | overflow e mobile | shell web local parcial |
| Regression | suites estáveis | prompt/modelo/regra piora resultado | golden ativo |
| Migrations | RLS/grants/tenant | missing policy, unsafe delete | static testado |
| Secrets | nenhum no repositório | key em código, log ou bundle | lint/scan local |
| Supply chain | lockfile fixado | advisory high/critical | CI planejado |

Todo item `planejado` precisa de owner e evidência antes de a capability correspondente ser ativada em QA.
