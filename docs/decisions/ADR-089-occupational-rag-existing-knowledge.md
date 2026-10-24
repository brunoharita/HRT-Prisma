# ADR-089 — RAG ocupacional na Knowledge existente

Estado: accepted. Data:24/10/2026. Produto3.2.0. Contrato `docs/qa/agreement-occupational-rag-v320.md`1.0.0 aprovado por Bruno; estende ADR-088 e curadoria empresa/global vigente.

## Decisão

Reutilizar conceitos, termos, relações, mappings, Inbox, pesquisas, propostas, aprovações e change sets. Nenhuma tabela, catálogo ou banco vetorial novo. Colunas técnicas ficam nos proprietários: contexto/origem/hash no Inbox; lease/tentativas/histórico nas pesquisas; cursor no Perfil; origem de alias nas propostas. Vetores transitórios são limitados e vinculados a tenant/modelo/identidade/versão/aliases/conteúdo.

Preservar primeiro associação exata aprovada e inequívoca. Para desconhecidos, expandir a consulta como hipótese, recuperar até40 conceitos ocupacionais aprovados e reordenar semanticamente até cinco, empresa antes de global. Mappings oficiais exigem versão publicada/vigente. Similaridade nunca publica equivalência, confiança, competência pessoal ou seleção. Título sem atividades gera pendências, sem modelo nem definição inventada. Contexto limitado e citações/IDs/versões pós-validados.

Responsável autorizado escolhe associação de termo a conceito existente ou criação local. Relações `related_to` são distintas de equivalência e persistidas para novo conceito local somente quando selecionadas. Original da IA, edição, versões/citações/ator permanecem separados. Aprovação local envia automaticamente definição/aliases curados e vínculo de origem à curadoria global; não envia currículo, trechos privados ou contexto pessoal. Super Admin aprova globalmente ou mantém somente local, motivo opcional. Origem da empresa permanece intacta.

Salvar Posição/publicar Perfil inicia trabalho assíncrono. Cursor de cinco cargos por passagem, sem backfill. Pesquisa tem lease8min, até três tentativas e deduplicação pelo contexto. Falha explícita permite retry ou assumir revisão manual, invalidando lease e sem chamada de IA. Escritores de origem não ficam bloqueados.

## Reuso, alternativas e modelos

Reutiliza o motor lexical e a curadoria. APIs pagas/Textkernel excluídas por decisão do PO. Banco vetorial separado e treinamento próprio acrescentariam manutenção sem resolver autoridade. Execução privada evita destino novo. Tarefa independente dentro do worker de síntese existente; Ollama em Docker privado, sem porta pública, credenciais ou ferramentas para o modelo.

Pins operacionais no compose, digests conferidos a cada trabalho:

- Ollama0.40.10, imagem `sha256:4c5b27871a3239a717048f9b93057680a51b60c8119a7016aebb57f938e25e35`; [MIT](https://github.com/ollama/ollama/blob/main/LICENSE), [saída estruturada oficial](https://docs.ollama.com/capabilities/structured-outputs).
- `qwen3:4b-instruct-2507-q4_K_M`, digest `0edcdef34593eac1aa2be9c7d06c432dcf81945adca5eca2f27662c18f168ba0`; família [Qwen3-4B-Instruct-2507 / Apache-2.0](https://huggingface.co/Qwen/Qwen3-4B-Instruct-2507).
- `bge-m3`, digest `7907646426070047a77226ac3e684fbbe8410524f7b4a74d02837e43f2146bab`; [MIT e modelo multilíngue](https://huggingface.co/BAAI/bge-m3).

## Evidência e limites

PoC sintética real na VPS existente, sem credenciais/dados produtivos no runner. O1.7B foi explorado; ambos os tamanhos tiveram referências incoerentes no protocolo inicial. O codec passou a uma decisão `alias:<id>` com enum e destino derivado no servidor. Não atribuir diferenças somente ao tamanho: o protocolo também mudou.

Ensaio final4B: Vendedor/Sales Representative, SDR comercial/pré-vendas e Logística dedicada a transportes passaram. Revenue ficou `ambiguous`, com definição/citações válidas:3/4 decisões categóricas esperadas,4/4 respostas sustentadas para revisão pendente. Expectativa de novo conceito em Revenue não passou; incerteza preservada é comportamento permitido, não prova de qualidade universal.

Embeddings acertaram top1 nos seis controles positivos, inclusive outras famílias e Logística com/sem estoque. Revenue sem conceito equivalente trouxe software architect primeiro: não contar como acerto, mesmo com `pass:true` exploratório no arquivo bruto. Recuperação nunca decide publicação. Amostra pequena não mede recall de toda a biblioteca nem qualidade estatística de produção.

Geração final85–102s por resposta; expansão4B cerca de30s. Sem promessa de resposta imediata. Limites CPU1,25/RAM-swap5GiB/um modelo e uma tarefa; pico cgroup atingiu limite incluindo cache, com reclaim, zero OOM/OOM-kill. Não presumir folga de RAM. Consulta lexical global somente leitura em30.257 conceitos:245 resultados/4.166ms no ensaio; não exigiu índice ou réplica persistida.

Tentativas usam histórico original, provider `ollama-local`, usageKind `external` (enum técnico de tentativa sem cache, não envio à internet). Custo estimado de API zero somente com contagens verificadas; observado nulo. Infraestrutura continua tendo custo. Sem tarifa/débito novo de Tokens Prisma.

## Compatibilidade e rollback

Desabilitar flag `OCCUPATIONAL_RAG_ENABLED`, restaurar imagem anterior do worker/web e parar somente o modelo. Preservar banco/histórico, sem migration inversa destrutiva. Leases permitem retomada. Falha de configuração nova não interrompe síntese/e-mails existentes. Perfil, Score, matching, pesos, credenciais e decisões humanas preservados. Evidência final e limites: AoT occupational-rag-v320.

Controles reais adicionais: Logística com inventário/armazenagem foi associada a Estoque (89.976ms); SDR em rádio/processamento de sinais ficou ambíguo sem destino comercial (78.796ms). Ambos passaram nos critérios de segurança/contexto. Arquivo `models/additional-controls.json`.
