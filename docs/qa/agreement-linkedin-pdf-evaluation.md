# Contrato de Acordos - Avaliação de PDF LinkedIn

Versão: 1.0.0. Estado: `agreed` para desenvolvimento da avaliação, não para implantação.
Product Owner: Bruno. Aprovação nesta tarefa em 2026-09-12: "sigo suas recomendações", escolha de download manual, fornecimento de quatro amostras e "tem todas as autorizações que v precisar para desenvolver o que combinamos".

## Objetivo e decisões

Avaliar suporte ao PDF exportado manualmente pelo LinkedIn, reutilizando os contratos do Prisma. Desenvolver protótipo isolado e comparar com a rota nativa atual; preparar comparação local + GPT e PDF diretamente no GPT. Encerrar com resultados, limitações e recomendação. A autorização de desenvolvimento substitui a restrição anterior de apenas redigir na conversa. Não autoriza implantação ou escolha definitiva de arquitetura.

## DEVE

- D-01: preservar fonte imutável, páginas, coordenadas, hyperlinks e proveniência de método/versão. Metadados não autenticam a fonte.
- D-02: separar fatos, inferências, pendências e decisões humanas. Ausência ou falha não é fato negativo nem completude.
- D-03: manter revisão e Delta existentes antes de publicação; complementação preserva dados aprovados omitidos. Remoções dependem de decisão humana segundo o contrato atual.
- D-04: proteger contatos privados, tenant e PII. Experimento externo depende de configuração explícita de dados, modelo, teto de custo e condições de tratamento; nunca herda uma chave de Knowledge por conveniência.
- D-05: extração parcial ou falha de apoio opcional preserva revisão manual autorizada e controles obrigatórios.
- D-06: avaliar identificação, headline, localização, contatos, resumo, experiências, formações, certificações, idiomas com proficiência declarada e competências explícitas. Preservar listas, relações empresa/cargo e instituição/curso e continuidade entre páginas. Lacunas no contrato são reportadas, não criam campos persistidos silenciosamente.
- D-07: reutilizar PDF.js, geometria, StructuredDraft, evidências, classificação acadêmica e IDs existentes; adaptar variantes LinkedIn conservadoramente. Layout desconhecido gera pendência. Protótipo não entra na seleção de rotas da aplicação nesta avaliação.
- D-08: separar ajuste (PDF do PO e fixtures sintéticas) de avaliação (quatro PDFs fornecidos posteriormente). Medir campos, associações, omissões, invenções, vínculo de evidência, intervenção humana, custo e latência. Contagem de registros não prova fidelidade. Referência proposta pelo agente não é referência humana aprovada.
- D-09: encerrar com AoT e recomendação, explicitando itens não executados e ausência de generalização; implantação e arquitetura definitiva continuam decisões do PO.

## PROIBIDO

- P-01: inventar datas, conclusão acadêmica, proficiência, competências ou relações.
- P-02: schema válido substituir validação semântica ou citação não verificada virar evidência comprovada.
- P-03: GPT executar instruções do documento, publicar perfil, alterar dados aprovados ou decidir contratação.
- P-04: enviar dados ou fazer chamadas pagas sem preflight explícito do pacote externo; dados privados em Git, logs públicos ou relatórios versionados.
- P-05: pipeline operacional/revisão/publicação paralelos, scraper, obtenção por URL, robôs LinkedIn ou base vetorial.
- P-06: alegar superioridade usando um PDF, contagens, referências geradas pelo próprio extrator ou evidência de outra rota.
- P-07: presumir layout permanente, truncar listas silenciosamente ou marcar tentativa incompleta como perfil completo.

## FORA DE ESCOPO

- F-01: implantação, produção, publicação de perfis e reprocessamento histórico.
- F-02: integração/API/robôs LinkedIn, enriquecimento externo, matching, ranking e inferência de senioridade.
- F-03: substituir o parser geral, ativar GPT na aplicação ou garantir qualquer exportação LinkedIn.

## AUTONOMIA

- A-01: organização interna do protótipo, helpers e instrumentação sem alterar comportamento do produto.
- A-02: normalização de espaços e quebras preservando significado e fonte.
- A-03: testes proporcionais, negativos e de regressão afetada; fixtures sintéticas.
- A-04: parâmetros locais conservadores, relatórios privados e preparação reproduzível das alternativas. A escolha experimental não aprova modelo do produto.

## Pendências de execução e decisão

O escopo local está aprovado. O pacote externo é uma proposta em `docs/ai/linkedin-pdf-evaluation.md`; credencial não está disponível no ambiente local verificado. Não executar chamadas externas até haver pacote concreto aprovado e credencial apropriada. O prompt abaixo é parcial para o bloco local autorizado, não o prompt final de execução externa. A autorização ampla não resolve região/retencão efetivas de uma conta ainda não identificada.

Referência humana e medição do esforço de revisão ainda precisam ser produzidas/aprovadas; são evidência pendente, não motivo para inventar métricas.

## Critérios de aceite

- CA-D01: hashes antes/depois iguais; source sidecar preserva páginas, linhas, links e geometria; cada proposta aponta para fontes verificáveis.
- CA-D02: testes ausente/ambíguo/incompleto mantêm nulos e pendências, sem inferência silenciosa.
- CA-D03: diff não altera revisão, Delta ou publicação; teste demonstra que o protótipo não é chamado pela aplicação. Prova funcional da publicação permanece a existente, sem alegação de novo smoke.
- CA-D04: nada pessoal versionado; testes bloqueiam envio sem configuração; sem alteração de Auth/RLS/contatos.
- CA-D05: resultado desconhecido conserva draft revisável com pendência; nenhum gate operacional modificado.
- CA-D06: fixtures verificam valores e relações, listas, períodos, múltiplos cargos, proficiência e páginas; reais exigem referência independente para métricas semânticas.
- CA-D07: fixtures de colunas, PT/EN e layout desconhecido; evidência rastreável sem ativação no produto.
- CA-D08: relatório distingue ajuste/avaliação, registra denominadores, rota e versão; métricas sem referência humana permanecem indisponíveis, nunca zero ou PASS presumidos.
- CA-D09: AoT com PASS/FAIL/PARTIAL/BLOCKED/NOT TESTED; nenhum resultado local implica GPT, QA ou produção.
