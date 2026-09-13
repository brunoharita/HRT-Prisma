# M5.7 Parser IA

Contrato: `parser-ia-1.0.0`. Acordo/execução: `../qa/agreement-m57-parser-ia.md` e `../qa/execution-m57-parser-ia.md` 1.1.1. Decisão: ADR-049. Estado: ativado para uso direto local; avaliação de qualidade parcial.

## Funcionamento

Backend Node local lê o PDF com PDF.js, mantendo spans e coordenadas independentes de coluna. OpenAI recebe PDF inline e spans com IDs, sem referência humana ou baseline como gabarito. Resposta estrita contém `status`, `facts[{path,value,sources}]` e `uncertainties`. O domínio verifica IDs, caminhos, duplicações, suporte textual, campos de contato e vínculo organização/hash. Fatos sem suporte ficam fora do rascunho e geram pendência; zero fatos é erro.

As coordenadas de evidência são exclusivamente da fonte. Vários spans/páginas podem suportar um campo. Preservar palavra composta, separação explícita de listas, múltiplos cargos e períodos; títulos/cursos ausentes permanecem nulos. Duplicatas de formação são sinalizadas para decisão humana. O modelo não decide publicação, contratação, permissões ou mutação de dados aprovados.

O resultado alimenta a identificação antes do intake e é reutilizado para preencher o mesmo StructuredDraft na importação. Upload pela Central da Pessoa também recebe a preparação. Reprocessamento histórico mantém a rota anterior nesta etapa. A rota fica desligada por padrão, habilitável somente em DEV/loopback. Falha na importação oferece continuação explícita pela leitura local, sem vender fallback como sucesso da IA. Resultado parcial mostra aviso e pendências.

## Executar localmente

Ativação autorizada para uso direto local em 2026-09-12. Na raiz oficial, `pnpm run dev:ia` inicia a interface e o parser no mesmo processo, ativa IA somente em DEV e encerra ambos com Ctrl+C. O comando preserva o ledger existente e falha se a chave estiver ausente ou as portas ocupadas. Alternativa com processos separados:

1. `OPENAI_API_KEY` em `.env.local` do backend, sem prefixo VITE, ignorado pelo Git.
2. `pnpm run parser:ia:local` inicia somente `127.0.0.1:8787`; o segredo não é enviado ao cliente.
3. Para desenvolvimento da integração web, `VITE_PARSER_IA_LOCAL=true` e reinício do Vite. Proxy local encaminha `/parser-ia-local/parse`. **A URL localhost da interface não isola o banco:** a persistência continua apontando para o Supabase configurado. Esta validação não usou esse fluxo para escrever no ambiente remoto.
4. Benchmark independente, sem banco: `pnpm run build`, depois `node scripts/benchmark-parser-ia.mjs rodada --live evaluation-03`, somente com arquivos e envio externo autorizados. `--cached` revalida a resposta já recebida sem ler a chave nem acessar rede.

Não abrir serviço em 0.0.0.0, não expor proxy pela Internet, não copiar `.env.local`, tmp, PDFs ou referências privadas para Git/Hostinger. Nunca publicar este backend experimental como backend multiusuário.

## Limites

- PDF 15 MB, 30 páginas; 12.000 spans e 250.000 caracteres; leitura PDF com prazo de 15 s, chamada API 120 s, cliente 135 s, sem retries ou redirects externos.
- Esta primeira rota exige spans textuais nativos verificáveis. PDF exclusivamente imagem não ganha evidência inventada: a rota de IA falha explicitamente e a leitura local/OCR existente permanece alternativa. OCR remoto, calibração de imagens e cutover geral não foram demonstrados.
- JSON de entrada HTTP 22 MB e saída do fornecedor limitada durante a leitura a 4 MB. Serviço valida método, path, Host, Origin e header; apenas loopback, uma operação por vez e lock de diretório.
- Ledger privado `tmp/m57-parser-ia/budget.json`: teto US$ 2, máximo 10 chamadas, reserva US$ 0,60 antes da rede. Reserva incerta permanece; corrupção e lock existente bloqueiam em vez de reiniciar o orçamento. Cache segrega organização, hash da fonte, contrato, modelo e prompt; replay revalida a fonte com o código atual.
- Estimativa contábil superior inclui tarifa de entrada sem desconto de cache, margem documentada para escrita de cache e tarifa de contexto longo quando aplicável. Não é fatura do fornecedor. Reserva cobre o máximo teórico de contexto e saída do candidato observado.
- Dados completos e respostas originais somente em tmp ignorado. Proveniência local guarda modelo, hash do prompt, resposta, consumo e tempo. Versão de estruturação preparada para persistência inclui contrato/modelo/hash; evidência mantém método PDF.js separado da interpretação.

## Modelo e tratamento dos dados

Candidato: `gpt-5.6-luna`, Responses, low reasoning, 12.000 tokens de saída, `store:false`, sem ferramentas, Files API ou vector store. A documentação consultada em 2026-09-12 informa texto/imagem, Structured Outputs e US$ 0,20/1M entrada / US$ 1,20/1M saída até 272K entrada. Contexto maior altera preço; nenhum snapshot distinto apareceu no catálogo. O modelo continua experimental, sem adoção definitiva para produção.

O envio inclui dados pessoais do PDF. Endpoint padrão sem garantia regional contratada verificada. Não se alega ZDR: o padrão documentado não usa dados para treinamento e prevê até 30 dias de monitoramento de abuso, sujeito às condições do fornecedor; `store:false` não elimina esse monitoramento. A chave fornecida está configurada localmente e deve ser substituída antes da publicação, conforme decisão do PO.

Fontes oficiais: [modelo](https://developers.openai.com/api/docs/models/gpt-5.6-luna), [entrada PDF](https://developers.openai.com/api/docs/guides/file-inputs), [dados](https://developers.openai.com/api/docs/guides/your-data). Revalidar antes de mudar modelo, região ou pacote.

## Evidência observada

Um teste real autorizado, `evaluation-03`, completou em 20.736 ms; 21.630 tokens de entrada e 2.705 de saída, estimativa superior US$ 0,0086535. Replays locais não reenviaram o documento. O validador foi refinado após observar o caso; esse resultado é regressão conhecida.

Comparação mecânica final: 50 campos observados, 49 iguais à referência após normalização, uma diferença de grafia no cargo; nove experiências associadas por âncoras únicas. Uma proposta adicional de país no campo de estado foi rejeitada e mantém o resultado parcial. Referência humana permanece inalterada. O baseline PDF.js congelado é comparador técnico, não reprodução integral de toda configuração da interface atual; igualdade estrita/âncoras não equivale a uma nota de qualidade de produto.

Diego e Ivan não foram enviados: houve rejeição do auto-review e nenhum contorno. Depois disso, o PO dispensou os envios adicionais como condição para avançar. Não há benchmark pendente dessas amostras nesta etapa. Julia não foi avaliada por decisão do PO.

Nenhuma validação semântica/espacial humana da saída nova, teste ponta a ponta com persistência, alteração Supabase ou implantação Hostinger foi concluída. Consulte o AoT para o estado por requisito.

Correção de proveniência (2026-09-12): identificadores de modelo aceitam ponto, hífen e sublinhado, mantendo limites e rejeição de separadores de caminho/espaços. A validação de versão/org/hash/modelo/prompt ocorre também no cliente dentro do tratamento amigável de falha, antes de iniciar o intake. Compatível com parser-ia-1.0.0; modelo, prompt, cache, dados e contratos persistidos permanecem iguais.

Compatibilidade de evidência de listas: a proposta do modelo mantém índices por item; a revisão/persistência recebe competências, idiomas, certificações e áreas de atuação no caminho raiz. Cada trecho mantém seu próprio descritor e coordenadas. preparedParserIa adapta resultados já em memória para permitir retomada sem reenvio. Correção compatível, sem migração ou mudança de modelo/prompt.

Retomada de intake interrompido: na Central da Pessoa e no detalhe do documento, a ação Retomar importação com IA fica disponível em DEV para documento M5.7 failed/not_ready, tentativa resume_intake_processing_failed, zero caracteres persistidos e nenhuma tentativa revisável. A sessão autorizada recupera o PDF privado; organização, Pessoa, intake, documento, caminho e SHA-256 precisam corresponder antes da IA. O cache existente é reutilizado quando elegível; sem cache aplicam-se os limites e orçamento normais. Persistência e conclusão reutilizam os RPCs/idempotência existentes. Nenhuma nova Pessoa é criada, nem Perfil publicado. Compatível com parser-ia-1.0.0, sem mudança de prompt, modelo ou schema.

Normalização de LinkedIn (2026-09-12): a interpretação conserva o valor citado e suas coordenadas; somente contact.linkedin no rascunho ganha HTTPS e codificação URL de caracteres Unicode, reutilizando o normalizador nativo e URL padrão. Resultados antigos em memória são adaptados sem mutação. O caso real continha ausência de protocolo e acento; ambos violavam o contrato de resumo estruturado já instalado. Sem migração, relaxamento de validação, mudança de prompt ou nova inferência.
