# Contrato de Acordos — M7.2 Perfil de Competências e Evidências

Versão: 1.0.0. Estado: agreed. Product Owner: Bruno. Aprovação: solicitação explícita de implementação acompanhada do texto integral e de três referências visuais normativas, em 2026-09-18. As referências são normativas para arquitetura visual e ilustrativas para pessoas, textos, contagens e registros. Este índice classifica o acordo; `execution-m72-person-professional-evidence.md` preserva a fronteira de execução.

## DEVE — Inegociável

- D-01 — Reutilizar Knowledge e `position-taxonomy-1.0.0` do M7.1, sem taxonomia paralela.
- D-02 — Manter conceitos de Pessoa e requisitos de Posição separados até matching explícito.
- D-03 — Projetar somente o Perfil publicado vigente; rascunho e histórico não alteram a leitura atual.
- D-04 — Preservar declaração explícita, relação contextual e Evidência Demonstrada como naturezas distintas e cumulativas.
- D-05 — Considerar estado verificado somente a Evidência Demonstrada M5.1 ativa, vigente e com resultado suficiente.
- D-06 — Não interpretar ausência, insuficiência, ambiguidade, expiração ou indisponibilidade como deficiência.
- D-07 — Conservar múltiplas evidências do mesmo conceito sem sobrescrever origem ou natureza.
- D-08 — Agrupar por tipos publicados da taxonomia Prisma e identidade estável do conceito.
- D-09 — Exibir Resumo com síntese do Perfil, explicação da taxonomia, agrupamentos e evidências recentes.
- D-10 — Exibir mapa de Competências pesquisável e filtrável por natureza e agrupamento.
- D-11 — Exibir explorador de Evidências com filtros, métricas descritivas, lista e detalhe.
- D-12 — Explicar por que cada item aparece com termo observado, regra, versões, fonte e decisão humana disponível, sem raciocínio privado.
- D-13 — Permitir abrir origem documental e, quando houver geometria, a página/região correspondente.
- D-14 — Expor estados loading, vazio, parcial, erro recuperável e versão incompatível sem inventar fallback.
- D-15 — Respeitar tenant, Perfil, Pessoa, papel e proveniência no servidor; membro autorizado pode ler sem ganhar escrita.
- D-16 — Manter PII integral fora de logs e usar dados sintéticos em QA visual/contratual.
- D-17 — Manter matching 5.0.0, score 1.2.0, parser/OCR, publicação e fontes externas inalterados.
- D-18 — Versionar a projeção como `person-professional-evidence-1.0.0` e falhar fechado para versão desconhecida.
- D-19 — Atualizar owners, ADR, Context Pack, AoT e versão de produto central.
- D-20 — Registrar M7.2 como segunda entrega do Movimento 7 e apresentar Prisma v1.7.2 no login e na barra lateral.
- D-UX-01 — Preservar topologia das referências: cabeçalho da Pessoa, abas de leitura, conteúdo principal e coluna explicativa/detalhe.
- D-UX-02 — Preservar hierarquia, agrupamento, densidade, ordem informacional e posição relativa das ações nas três superfícies.
- D-UX-03 — Em viewport estreito, empilhar conteúdo sem ocultar filtros, explicações, origem ou estados.
- D-UX-04 — Usar componentes/tokens Prisma e manter teclado, foco visível, rótulos e contraste.
- D-UX-05 — Comparar visualmente o mesmo estado, dados equivalentes e viewport com as referências normativas.

## PROIBIDO

- P-01 — Importar requisitos ou sugestões de Posição como competências/evidências da Pessoa.
- P-02 — Criar score, ranking, proficiência, senioridade, confiança probabilística ou decisão automática.
- P-03 — Chamar Lominger, fonte externa, LLM, embedding, pesquisa Web ou dependência nova.
- P-04 — Tratar certificado, documento, revisão humana ou inferência como verificação direta.
- P-05 — Converter ambiguidade ou ausência em fato; escolher conceito silenciosamente.
- P-06 — Reescrever Perfil histórico, Knowledge Global, Evidência Demonstrada ou origem.
- P-07 — Alterar parser, OCR, publicação, matching, fórmula, pesos ou ordem A/B/C.
- P-08 — Fazer backfill massivo, preencher dados ilustrativos em runtime ou usar PII real na prova.
- P-09 — Expor payload técnico bruto ou cadeia privada de raciocínio como explicação.
- P-10 — Relaxar RLS, grants, tenant ou autorização frontend-only.
- P-UX-01 — Trocar a composição normativa por tela materialmente diferente sob pretexto de adaptação.
- P-UX-02 — Provar fidelidade somente com teste funcional ou afirmação textual.

## FORA DE ESCOPO

- F-01 — Matching Pessoa × Posição, nova fórmula, sucessão, mobilidade, carreira, workforce planning ou remuneração.
- F-02 — Nova avaliação, 360, certificação, parser/OCR, publicação de Perfil, fonte externa, IA ou remodelagem ampla de Knowledge.
- F-03 — Deploy, migration remota, merge ou produção. Commit e push do branch seguem a autorização permanente do repositório.

## AUTONOMIA DE ENGENHARIA

- A-01 — DTO, RPC somente leitura, composição interna e nomes de componentes compatíveis com os contratos.
- A-02 — Microcopy, ícones, breakpoints e detalhes decorativos sem alterar topologia ou semântica.
- A-03 — Testes, fixtures sintéticas, índices e refatorações mecânicas necessárias dentro da fronteira acordada.

## PENDÊNCIAS

Nenhuma decisão funcional pendente. A publicação remota continua fora do escopo e exige autorização específica.

## CRITÉRIOS DE ACEITE

Cada D-* e P-* recebe linha própria no AoT. A prova mínima combina testes de domínio/contrato, PostgreSQL descartável com positivos e negativos de autorização, build/typecheck, revisão do diff, Context Pack e comparação visual desktop/mobile. Nenhum item obrigatório é concluído por inferência de código ou por screenshot isolado.

## Baseline e material preservado

Baseline `f02ac17`; branch `codex/m72-person-competency-evidence`. Material alheio preservado e excluído: `.tmp.driveupload/` e `services/paddle/Dockerfile.gpu`.
