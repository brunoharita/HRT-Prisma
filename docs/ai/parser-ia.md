# M5.7 Parser IA

Contrato de estruturação: `parser-ia-1.0.0`. Transporte hospedado: `parser-ia-hosted-transport-1.0.0`. Acordo/execução corrente: `../qa/agreement-production-resume-quality-pipeline.md` e `../qa/execution-production-resume-quality-pipeline.md` 1.3.0. Decisões: ADR-049 e ADR-059. Estado: integrado ao pipeline serial do único ambiente remoto, preservando revisão humana e limites operacionais.

## Funcionamento

Complemento aprovado em 2026-09-12: após validar as propostas contra a fonte, a aplicação normaliza períodos por `resume-dates-1.0.0` e classifica formação por 1.1.0. Curso declarado sem indicação contrária recebe conclusão inferida; datas usam DD/MM/YYYY e limites aprovados para componentes ausentes. “Atual” não ganha data final persistida. Originais continuam em `acceptedFacts`, evidências e notas de inferência do rascunho 8.2.0. O cache da resposta bruta continua reutilizável, sem nova chamada ao modelo por causa dessa regra. Contrato e testes: `../qa/resume-date-education-rules.md`.

Backend Node local lê o PDF com PDF.js, mantendo spans e coordenadas independentes de coluna. OpenAI recebe PDF inline e spans com IDs, sem referência humana ou baseline como gabarito. Resposta estrita contém `status`, `facts[{path,value,sources}]` e `uncertainties`. O domínio verifica IDs, caminhos, duplicações, suporte textual, campos de contato e vínculo organização/hash. Fatos sem suporte ficam fora do rascunho e geram pendência; zero fatos é erro.

As coordenadas de evidência são exclusivamente da fonte. Vários spans/páginas podem suportar um campo. Preservar palavra composta, separação explícita de listas, múltiplos cargos e períodos; títulos/cursos ausentes permanecem nulos. Duplicatas de formação são sinalizadas para decisão humana. O modelo não decide publicação, contratação, permissões ou mutação de dados aprovados.

Quando um texto narrativo reproduz marcadores explícitos de item, como `•`, `▪`, `●`, `◦`, `‣`, `⁃`, `∙`, a versão estruturada para revisão mantém o marcador e inicia cada item em uma nova linha. Essa normalização atua somente no valor reproduzido; o texto e as coordenadas da evidência de origem permanecem inalterados para rastreabilidade.

Rascunhos de revisão persistidos antes desta regra também passam pela mesma normalização ao serem decodificados para a tela. O carregamento não reescreve o banco nem altera a evidência; a nova formatação só é persistida quando o operador salvar a revisão.

O resultado alimenta a identificação antes do intake e é reutilizado para preencher o mesmo StructuredDraft na importação. Upload pela Central da Pessoa e retomada de intake interrompido também recebem a preparação. Reprocessamento histórico geral continua fora do escopo. O modo `local` permanece disponível somente em DEV/loopback; o modo `hosted` usa sessão e organização no gateway autenticado antes do túnel loopback. Falha na importação é explícita e oferece somente nova tentativa; não existe continuação automática pela leitura local. Resultado parcial mostra aviso e pendências.

Decisão temporária de 2026-09-17: o fluxo automático valida o PDF, executa somente a leitura nativa PDF.js e chama diretamente o Parser IA com o PDF original e os spans disponíveis. Paddle e Tesseract ficam desativados nessa rota, inclusive quando uma página possui pouco ou nenhum texto nativo. O modelo usa a imagem do PDF para contexto; fatos persistidos continuam limitados às referências aceitas pelo validador. Resultado ausente, inválido ou sem suporte falha explicitamente e nunca vira perfil completo.

## Executar localmente

Ativação autorizada para uso direto local em 2026-09-12. Na raiz oficial, `pnpm run dev:ia` inicia a interface e o parser no mesmo processo, ativa IA somente em DEV e encerra ambos com Ctrl+C. O comando preserva qualquer ledger histórico, mas não o consulta para autorizar chamadas; falha se a chave estiver ausente ou as portas ocupadas. Alternativa com processos separados:

1. `OPENAI_API_KEY` em `.env.local` do backend, sem prefixo VITE, ignorado pelo Git.
2. `pnpm run parser:ia:local` inicia somente `127.0.0.1:8787`; o segredo não é enviado ao cliente.
3. Para desenvolvimento da integração web, `VITE_PARSER_IA_LOCAL=true` e reinício do Vite. Proxy local encaminha `/parser-ia-local/parse`. **A URL localhost da interface não isola o banco:** a persistência continua apontando para o Supabase configurado. Esta validação não usou esse fluxo para escrever no ambiente remoto.
4. Benchmark independente, sem banco: `pnpm run build`, depois `node scripts/benchmark-parser-ia.mjs rodada --live evaluation-03`, somente com arquivos e envio externo autorizados. `--cached` revalida a resposta já recebida sem ler a chave nem acessar rede.

Não abrir serviço em 0.0.0.0, não copiar `.env.local`, tmp, PDFs ou referências privadas para Git/Hostinger. O único acesso hospedado permitido é a rota fixa do gateway autenticado definida no ADR-059; nunca publicar diretamente o worker loopback.

## Limites

- PDF 15 MB, 30 páginas; 12.000 spans e 250.000 caracteres; leitura PDF com prazo de 15 s, chamada API 120 s, cliente 135 s, sem retries ou redirects externos.
- PDF exclusivamente imagem não ganha evidência inventada. Durante o teste sem OCR automático, o Parser IA recebe o PDF completo; se não devolver fatos com referências aceitas, a rota falha explicitamente. Paddle e Tesseract permanecem instalados, mas não são alternativas automáticas nesse percurso.
- JSON de entrada HTTP 22 MB e saída do fornecedor limitada durante a leitura a 4 MB. Serviço valida método, path, Host, Origin e header; apenas loopback, uma operação por vez e lock de diretório.
- Não existe teto financeiro, contador de tentativas ou reserva monetária paralela no Prisma. Saldo e limites reais da conta, organização e projeto OpenAI são a autoridade financeira. Respostas do fornecedor distinguem saldo esgotado, limite de gastos e rate limit; detalhes livres do fornecedor não chegam ao cliente nem aos logs.
- O ledger histórico `tmp/m57-parser-ia/budget.json` não é apagado nem alterado, mas deixou de participar da autorização. A estimativa contábil por resposta continua na proveniência para observação; não é fatura nem bloqueio. Cache segrega organização, hash da fonte, contrato, modelo e prompt; replay revalida a fonte com o código atual.
- Dados completos e respostas originais somente em tmp ignorado. Proveniência local guarda modelo, hash do prompt, resposta, consumo e tempo. Versão de estruturação preparada para persistência inclui contrato/modelo/hash; evidência mantém método PDF.js separado da interpretação.

## Modelo e tratamento dos dados

Candidato: `gpt-5.6-luna`, Responses, low reasoning, 12.000 tokens de saída, `store:false`, sem ferramentas, Files API ou vector store. A documentação consultada em 2026-09-12 informa texto/imagem, Structured Outputs e US$ 0,20/1M entrada / US$ 1,20/1M saída até 272K entrada. Contexto maior altera preço; nenhum snapshot distinto apareceu no catálogo. O modelo continua experimental, sem adoção definitiva para produção.

O envio inclui dados pessoais do PDF. Endpoint padrão sem garantia regional contratada verificada. Não se alega ZDR: o padrão documentado não usa dados para treinamento e prevê até 30 dias de monitoramento de abuso, sujeito às condições do fornecedor; `store:false` não elimina esse monitoramento. A chave fornecida está configurada localmente e deve ser substituída antes da publicação, conforme decisão do PO.

Fontes oficiais: [modelo](https://developers.openai.com/api/docs/models/gpt-5.6-luna), [entrada PDF](https://developers.openai.com/api/docs/guides/file-inputs), [dados](https://developers.openai.com/api/docs/guides/your-data). Revalidar antes de mudar modelo, região ou pacote.

## Evidência observada

Um teste real autorizado, `evaluation-03`, completou em 20.736 ms; 21.630 tokens de entrada e 2.705 de saída, estimativa superior US$ 0,0086535. Replays locais não reenviaram o documento. O validador foi refinado após observar o caso; esse resultado é regressão conhecida.

Comparação mecânica final: 50 campos observados, 49 iguais à referência após normalização, uma diferença de grafia no cargo; nove experiências associadas por âncoras únicas. Uma proposta adicional de país no campo de estado foi rejeitada e mantém o resultado parcial. Referência humana permanece inalterada. O baseline PDF.js congelado é comparador técnico, não reprodução integral de toda configuração da interface atual; igualdade estrita/âncoras não equivale a uma nota de qualidade de produto.

Diego e Ivan não foram enviados: houve rejeição do auto-review e nenhum contorno. Depois disso, o PO dispensou os envios adicionais como condição para avançar. Não há benchmark pendente dessas amostras nesta etapa. Julia não foi avaliada por decisão do PO.

Na avaliação inicial, não havia prova de persistência autenticada. A prova posterior descrita abaixo confirmou importação até a revisão no Supabase existente. O PO posteriormente confirmou sucesso e publicou o Perfil do caso validado. Avaliação semântica/espacial ampliada e implantação Hostinger continuam fora da evidência disponível. Consulte o AoT para o estado por requisito.

Correção de proveniência (2026-09-12): identificadores de modelo aceitam ponto, hífen e sublinhado, mantendo limites e rejeição de separadores de caminho/espaços. A validação de versão/org/hash/modelo/prompt ocorre também no cliente dentro do tratamento amigável de falha, antes de iniciar o intake. Compatível com parser-ia-1.0.0; modelo, prompt, cache, dados e contratos persistidos permanecem iguais.

Compatibilidade de evidência de listas: a proposta do modelo mantém índices por item; a revisão/persistência recebe competências, idiomas, certificações e áreas de atuação no caminho raiz. Cada trecho mantém seu próprio descritor e coordenadas. preparedParserIa adapta resultados já em memória para permitir retomada sem reenvio. Correção compatível, sem migração ou mudança de modelo/prompt.

Retomada de intake interrompido: na Central da Pessoa e no detalhe do documento, a ação Retomar importação com IA fica disponível em DEV para documento M5.7 failed/not_ready, tentativa resume_intake_processing_failed, zero caracteres persistidos e nenhuma tentativa revisável. A sessão autorizada recupera o PDF privado; organização, Pessoa, intake, documento, caminho e SHA-256 precisam corresponder antes da IA. O cache existente é reutilizado quando elegível; sem cache aplicam-se os limites e orçamento normais. Persistência e conclusão reutilizam os RPCs/idempotência existentes. Nenhuma nova Pessoa é criada, nem Perfil publicado. Compatível com parser-ia-1.0.0, sem mudança de prompt, modelo ou schema.

Normalização de LinkedIn (2026-09-12, correção complementar em 2026-09-17): a interpretação conserva o valor citado e suas coordenadas; somente `contact.linkedin` no rascunho ganha HTTPS e codificação URL de caracteres Unicode. O rótulo visual `(LinkedIn)` que o PDF pode anexar ao endereço é removido antes da validação, e parâmetros ou fragmentos não integram a URL canônica. Se o valor ainda não representar um perfil `/in/` aceito pelo contrato, o campo fica nulo e gera pendência para revisão humana, sem invalidar o restante do currículo. Resultados antigos em memória são adaptados sem mutação e sem nova chamada ao modelo. Sem migração, relaxamento de validação, mudança de prompt ou inferência de endereço.

Persistência de evidência acadêmica (2026-09-17): o contrato de revisão aceita uma formação identificada pelo curso ou pela instituição. A rotina atômica de persistência passa a usar o curso declarado como rótulo da evidência e, quando ele está ausente, usa a instituição declarada. O texto citado, a formação parcial e a pendência humana permanecem inalterados; a correção não preenche curso ausente, não afrouxa `evidence.fact` e não descarta o bloco acadêmico. A migration `20260917143000_preserve_institution_only_education_evidence` está aplicada e registrada no Supabase de produção; o smoke autenticado confirmou a revisão `draft` sem falha de persistência e sem publicação de Perfil.

Proteção contra cliente desatualizado (2026-09-17): a migration `20260917154500_harden_linkedin_draft_persistence` aplica no banco a mesma normalização conservadora do LinkedIn usada pelo domínio. Um gatilho anterior à constraint atua somente sobre a cópia estruturada para revisão: remove o rótulo visual conhecido, força HTTPS, retira query/fragmento e valida o perfil `/in/`; valor ainda incompatível vira `null` com pendência humana. Páginas, texto e evidências de origem permanecem intactos. Tipos estruturais inesperados continuam sendo rejeitados pela constraint. A função é privada, não usa `security definer` e tem execução revogada de `public`, `anon` e `authenticated`.

Prova autenticada concluída na etapa de importação até revisão: seleção do PDF, interpretação com cache local, identificação pelo cadastro existente expressamente autorizado, persistência e abertura da revisão. Supabase confirmou quatro páginas, 4.710 caracteres, nove experiências, duas formações, três competências e 115 descritores de evidência; contratos de resumo e formação válidos. A revisão continuou acessível após recarregar. Comparação sinalizou confirmação humana da situação acadêmica ausente; não houve publicação ou confirmação automática. Ledger privado inalterado, sem nova chamada OpenAI nesta prova.

Aceite local confirmado pelo PO após a publicação do Perfil. Consulta ao Supabase verificou documento/revisão approved e um Perfil publicado a partir da fonte validada. Modelo, prompt, contrato, orçamento e política de acesso permanecem iguais; nenhuma migração necessária. O histórico de pendências acima distingue os testes anteriores da aceitação final.
