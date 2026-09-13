# Contrato de Acordos - M5.7 Parser IA

Versão 1.1.2. Estado: agreed para implementação e validação locais. PO: Bruno, 2026-09-12, "Ok... pode começar... vamos chamar de movimento M5.7 Parser IA". Autorizou usar a credencial fornecida localmente, adiando sua troca até antes da publicação.

Delta autorizado em 2026-09-12: "pode preparar o prisma para eu usar diretamente". Integrar na raiz oficial, ativar a flag local e iniciar os serviços para uso humano. A interface mantém o único Supabase já configurado; não há migração ou publicação online. O agente não cria registros reais para provar o smoke. O uso da importação pelo operador continua persistindo pelo fluxo existente. D-07 deixa de exigir novos envios.

## Objetivo e precedência

Interpretar o PDF por IA antes de preencher os campos, reutilizando StructuredDraft, evidências, classificação e revisão humana do Prisma. A decisão atual substitui, neste novo movimento, a exclusão de integração/IA de F-03 e D-07 da avaliação LinkedIn 1.0.0. O acordo histórico `agreement-m57-document-intelligence-reliability.md` refere-se ao trabalho anterior de Paddle; suas restrições a novos provedores não governam esta mudança explicitamente autorizada. Nenhum histórico será apagado nem haverá renumeração silenciosa.

## DEVE

- D-01: executar primeiro localmente; testes e benchmark não escrevem no Supabase atual. Atualização remota é etapa posterior à evidência local.
- D-02: enviar PDF e referências textuais de página ao backend; a IA retorna fatos estruturados e referências, nunca coordenadas inventadas. Validar formato, escopo, origem e suporte textual antes do preenchimento.
- D-03: preservar continuidade entre linhas/páginas, cargos/empresas, cursos/instituições, listas e dados ausentes. Não presumir conclusão, senioridade ou proficiência. Duplicações ambíguas permanecem para revisão humana.
- D-04: integrar antes da identificação e do rascunho da importação existente, mantendo revisão, autorização, identidade mínima, Delta e publicação. Proveniência identifica a interpretação por IA separadamente da leitura PDF.js.
- D-05: timeout, recusa, resposta incompleta, referência inválida e ausência de configuração têm estados explícitos. Resposta sem fatos suportados não é perfil válido. O modo local anterior continua disponível ao desativar a integração.
- D-06: chave somente server-side; serviço experimental ligado apenas ao loopback e não utilizável como backend online. Limites de tamanho, páginas, tempo, chamadas, orçamento e concorrência; erros sanitizados, sem PII em logs/Git.
- D-07: testes sintéticos negativos e comparação privada já obtida com João como regressão conhecida, não avaliação cega. Por decisão do PO em 2026-09-12, envios adicionais de Diego/Ivan foram dispensados para avançar com a integração local. Julia permanece fora da avaliação humana.
- D-08: documentar pacote, contratos, versões, limites, resultados reais e AoT; preservar fontes e referências humanas.

## Pacote de execução local

Reutilizar PDF.js, contratos e fetch server-side já usado pelos adapters OpenAI. Sem dependência nova, treinamento ou serviço de parsing adicional. Candidato experimental já apresentado: OpenAI Responses, `gpt-5.6-luna`, configurado no backend, `store:false`, sem ferramentas ou Files API, PDF inline e schema estrito. Até US$ 2 por ledger local, 10 chamadas, 120 s e 12.000 tokens de saída; reservar US$ 0,60 antes de cada tentativa e manter reserva se o consumo ficar desconhecido. Preço e capacidades verificados no catálogo oficial em 2026-09-12; alias sem snapshot distinto, logo sem promessa de reprodução idêntica.

O PDF inclui dados pessoais autorizados nesta conversa. Desenvolvimento local não é IA offline. Endpoint padrão, sem garantia de residência regional ou ZDR; padrão documentado sem treinamento e até 30 dias de monitoramento, conforme política do fornecedor. Controles especiais de conta não foram comprovados e não serão alegados. Registros locais completos permanecem em tmp ignorado; telemetria contém apenas metadados. Trocar a chave exposta antes de disponibilizar online.

## PROIBIDO

- P-01: preencher fato sem suporte, aprovar/persistir perfil por decisão do modelo, executar instrução do PDF, criar ranking ou inferência de contratação.
- P-02: segredo no frontend, logs, Git ou resposta HTTP; rede/retentativas/redirecionamentos sem limites; servidor experimental exposto em interface pública.
- P-03: fallback silencioso vendido como sucesso de IA, completar lacunas com baseline, referência ou conhecimento externo; usar referência humana no prompt de extração.
- P-04: mutação do Supabase atual durante esta validação local; publicação Hostinger ou mudança de autenticação/RLS nesta etapa.

## FORA DE ESCOPO

- F-01: rollout online, reprocessamento histórico, scraper LinkedIn, Knowledge, matching, migrações ou nova tela operacional de revisão/publicação.
- F-02: garantir 100% de acerto, generalização com três PDFs ou equivalência exata à leitura interativa do assistente.

## AUTONOMIA

- A-01: organização de módulos, transporte local, schema, testes, fixtures, prompts de fidelidade e normalizações sem alteração de significado.
- A-02: limites menores que os tetos do pacote, sem promover modelo experimental a escolha definitiva de produção.

## Pendências

Nenhuma decisão de produto pendente impede a implementação local. Acesso real do modelo/credencial, qualidade medida e aceitação de implantação são evidências/etapas ainda a demonstrar; não se presumem pelo acordo.

## Critérios de aceite

- CA-D01: execução/testes sem cliente de banco no serviço/probe; nenhum deploy remoto.
- CA-D02/D03: testes com e-mail quebrado, múltiplos cargos, páginas consecutivas, formação sem data/curso, duplicação e referências inexistentes.
- CA-D04: cliente usa a interpretação antes da identidade e reutiliza o mesmo rascunho; versão e hash não se confundem com o parser determinístico; testes de integração afetada.
- CA-D05: provas de timeout, recusa, truncamento, fonte diferente, resposta malformada, zero fatos e rollback por flag.
- CA-D06: provas negativas de origem/host, limites, concorrência, cache segregado, chave ausente, budget persistido e sanitização.
- CA-D07: rodada privada rastreável; resultados por rota e diferenças, sem converter ausência de medição em sucesso.
- CA-D08: documentação/Context Pack regenerados; AoT distingue implementação, validação sintética, teste real e rollout.

Delta de recuperação autorizado pelo relato "ainda com erro" em 2026-09-12: retomar somente intake M5.7 já vinculado, com falha de estruturação e sem leitura persistida, a partir do PDF original privado. Reutilizar Pessoa, documento, intake e RPCs existentes, validar organização/vínculo/hash antes da IA e manter revisão humana. F-01 continua excluindo reprocessamento histórico geral. A validação do agente usa persistência simulada e consultas remotas somente de leitura.

Delta de validação autenticada: o PO autorizou explicitamente importar o PDF de João com processamento OpenAI e persistência no Supabase existente e, depois, selecionar o cadastro de João criado na tentativa anterior. Isso autoriza a prova de importação/identificação/persistência/revisão pela sessão do operador, sem ampliar autoridade para classificação acadêmica humana ou publicação automática. As restrições D-01/P-04 sobre os testes iniciais independentes do banco permanecem históricas; esta prova autorizada registra suas mutações reais.
