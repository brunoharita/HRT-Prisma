# AoT - Avaliação local de PDF LinkedIn

Data: 2026-09-12. Contrato: `agreement-linkedin-pdf-evaluation.md` 1.0.0. Instruções parciais: `execution-linkedin-pdf-evaluation.md` 1.0.0. Implementação experimental final: `linkedin-pdf-evaluation-1.0.2`.

## Resultado e limites

**PARTIAL para o movimento completo.** Protótipo e ferramentas locais desenvolvidos, exercitados em cinco fontes autorizadas. Não integrado ao produto. Não há comparação externa executada nem referência humana aprovada para fidelidade, evidência semântica ou esforço real. Não há superioridade geral comprovada ou autorização técnica de cutover.

O baseline medido é PDF.js nativo + `buildAdaptiveExtraction` atual, chamado diretamente pelo runner. Não é validação integral de `validateAndProcessPdf`, UI, OCR/Paddle ou QA. O protótipo separa colunas antes de compor linhas, reconhece hierarquia tipográfica conservadoramente e usa StructuredDraft, IDs/evidências e classificação acadêmica existentes.

## Rodadas preservadas

| Rodada | Versão | Uso | Hash da implementação |
| --- | --- | --- | --- |
| evaluation-v1 | 1.0.0 | Um ajuste + quatro amostras inicialmente independentes | `b77162e7d54f2f5a672c2016985922bddb3c672a808ab91405ff5923566f5d2d` |
| regression-v101 | 1.0.1 | Amostras já conhecidas, correções iniciais | `91ca387b29f20df91673d135f8ee14ac80878d623f74117ac63ab59b58e2de79` |
| regression-v102 | 1.0.2 | Regressão conhecida, sem reivindicação de avaliação cega | `8dce69205ec5f042174ab2957693af28088b2fd14eb59f61cb10993dc823e52b` |

Os hashes são de código/configuração, não dos documentos pessoais. Fontes congeladas, hashes dos PDFs, propostas, citações e relatórios detalhados permanecem somente em `tmp/linkedin-evaluation/`, ignorado por Git. O código 1.0.0 foi preservado e seu hash integral conferido contra o registro feito antes da abertura das amostras independentes. O runner final salva fontes congeladas automaticamente antes da leitura dos PDFs.

Inventário (não é métrica de acurácia; contagens iguais nas rodadas 1.0.0 e 1.0.2):

| Caso | Páginas | Experiências baseline/local | Formações baseline/local | Certificações baseline/local | Idiomas baseline/local | Competências baseline/local |
| --- | --- | --- | --- | --- | --- | --- |
| Ajuste 01 | 8 | 0 / 12 | 5 / 5 | 0 / 5 | 2 / 2 | 0 / 3 |
| Avaliação 01 | 1 | 0 / 2 | 2 / 3 | 1 / 0 | 0 / 0 | 2 / 3 |
| Avaliação 02 | 5 | 0 / 9 | 3 / 2 | 3 / 0 | 1 / 1 | 0 / 3 |
| Avaliação 03 | 4 | 0 / 9 | 2 / 2 | 0 / 0 | 0 / 0 | 0 / 3 |
| Avaliação 04 | 3 | 0 / 6 | 2 / 2 | 0 / 1 | 0 / 0 | 0 / 3 |

21 páginas lidas; 20 superaram a heurística de suficiência nativa. A última página de uma fonte contém somente rodapé, conforme inspeção visual, não uma página profissional perdida. Os originais mantiveram os hashes. 18 links foram preservados como dados, sem navegação.

Inspeção visual local pelo agente, não aprovação humana da referência, encontrou: duplicata acadêmica explícita na fonte, preservada; país sem cidade/estado, mantido pendente; idioma sem proficiência, preservado sem completar. Encontrou também defeitos do protótipo inicial: e-mail quebrado aceito truncado, período-only convertido em curso pelo fallback do classificador e headline decorativa interpretada como título. Corrigidos com fixtures sintéticas. A primeira correção de e-mail revelou regressão quando telefone e e-mail têm entrelinha curta; corrigida em 1.0.2. A reexecução confirmou e-mail reconstruído, curso e snapshot nulos, pendência visível e headline nula. Não foi extrapolada para taxa global de qualidade.

## Matriz de acordos

| ID | Implementação | Teste / evidência | Status | Limitação |
| --- | --- | --- | --- | --- |
| D-01 | Source sidecar, hashes, links e evidências por linha/página | 5 originais inalterados, 18 links, teste de continuidade e imutabilidade | PASS | Rastreabilidade, não autenticidade ou veracidade profissional |
| D-02 | Nulos, uncertainties e unassigned; sem preenchimento de lacunas | Testes de curso ausente, layout desconhecido, datas e proficiência | PASS | Sem auditoria semântica humana completa dos reais |
| D-03 | Protótipo não chamado pela ingestão/publicação | Teste de isolamento, diff, regressão profileDelta | PASS | Preservação do fluxo, não novo smoke de publicação |
| D-04 | Resultados privados, pacotes offline, ausência de HTTP/secret no helper | Testes de manifesto, minimização e ausência de rede | PASS | Fronteira externa permanece sem execução/configuração |
| D-05 | Fonte/nulos/pendências permanecem revisáveis; produto inalterado | Testes de formato desconhecido e ausência de autoridade | PASS | Nenhum fallback externo vivo exercitado |
| D-06 | Protótipo cobre campos e relações no contrato existente | Fixtures e inspeção das cinco fontes | PARTIAL | Referência humana e cobertura independente pós-correções ausentes |
| D-07 | PDF.js + StructuredDraft + IDs/evidências/classificador existentes | Testes PT/EN, colunas, páginas e layout desconhecido | PASS | Heurística experimental; não ativada no produto |
| D-08 | Rodadas, manifests, templates de referência e scorer com associação explícita | Inventário/latência privados; scorer bloqueia referência não aprovada | PARTIAL | GPT, métricas semânticas e tempo humano não medidos |
| D-09 | Este AoT + pacote externo + recomendação | Limites e todos os itens não provados explicitados | PASS | Movimento completo continua PARTIAL |

## Proibições verificadas

| ID | Prova | Status |
| --- | --- | --- |
| P-01 | Testes de ausência, ambiguidades, agrupamentos, datas e proficiência; defeitos iniciais registrados/corrigidos; cobertura real integral ainda não provada | PARTIAL |
| P-02 | Citação textual única permanece sem validação semântica/espacial automática; scorer exige referência humana | PASS |
| P-03 | Entrada com instrução maliciosa tratada como texto; nenhum caminho de publicação ou ferramentas externas | PASS |
| P-04 | Nada pessoal no conjunto versionado; helpers externos offline; zero chamadas OpenAI | PASS |
| P-05 | Nenhuma rota de scraping, URL, vetor ou fluxo operacional paralelo | PASS |
| P-06 | Métricas sem referência são null/NOT TESTED; não há declaração de superioridade | PASS |
| P-07 | Sem cap legado de 16 registros; fonte não associada permanece disponível; unknown conservador; variantes não amostradas continuam desconhecidas | PARTIAL |

## Fora de escopo e desvios

F-01 a F-03 preservados pelo diff: nenhum deploy, migração, perfil publicado, sincronização LinkedIn, UI ou ativação de modelo. Não há mudança do contrato persistido de ExtractionDraft. Nova versão é exclusivamente do protótipo experimental.

O desenvolvimento local foi autorizado expressamente após a fase de planejamento. A avaliação externa não foi executada. Após os defeitos da primeira avaliação, as fontes deixaram de ser independentes para as correções; foram rotuladas como regressão, sem apagar a primeira rodada. Esta é uma limitação explícita da evidência, não uma exceção silenciosa aos aceites.

## Validação final

- `pnpm run build`: passou.
- 69 testes direcionados passaram: 21 novos (protótipo e ferramentas), mais regressões de extração adaptativa, Document Intelligence e Delta.
- `pnpm run typecheck:web`, `pnpm run build:web`: passaram; build mantém aviso de chunks maiores que 900 kB, sem alteração de bundle funcional por este protótipo isolado.
- `pnpm run generate:prisma-context`, `pnpm run check:prisma-context`, `pnpm run lint` (427 arquivos) e `git diff --check`: passaram.
- Suite completa não executada: protótipo isolado, sem mudança transversal da aplicação, conforme AGENTS.md atual.

## Recomendação e pendências

Há evidência suficiente para continuar avaliando a adaptação local, não para eleger uma arquitetura vencedora ou ativá-la. O principal ganho observado é recuperação estrutural; a taxa de fidelidade depende da referência humana. Próximos requisitos ainda abertos: aprovação da referência factual, medição humana de correção e pacote/credencial/condições de dados para a comparação externa. Os cinco PDFs permanecem locais, fora de Git.

Branch de entrega: `codex/linkedin-pdf-evaluation`, baseline `22b41f7`; hash de commit e resultado do push registrados no encerramento da tarefa. QA e produção não acionados. O worktree da tarefa contém somente mudanças desta avaliação; a raiz oficial permanece na branch anterior, com `.tmp.driveupload/` alheio preservado.
