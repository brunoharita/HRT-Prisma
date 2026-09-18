# Contrato de Acordos — M7.2 v2 Taxonomia de Competências e Perfil de Evidências

Versão: `2.0.0`. Estado: `agreed`. Product Owner: Bruno. Aprovação: prompt mestre revisado fornecido integralmente em 2026-09-18 e solicitação explícita de execução. Baseline: `ccef68c05e10f3c35cf616f92f9a0d55c552a275`.

Este contrato substitui a semântica futura do prompt anterior do M7.2 sem reescrever o acordo 1.0.0, seus snapshots ou seu AoT. A evolução é forward-only. M7.1 e `position-taxonomy-1.0.0` permanecem a Taxonomia Ocupacional. A infraestrutura profissional é comum; os domínios ocupacional e de competências são separados e possuem versões próprias.

As três referências abaixo são alvos normativos de arquitetura visual e ilustrativas para pessoas, textos, números e integrações:

- `C:\Users\Bruno\AppData\Local\Temp\codex-clipboard-dda06256-8341-456f-9059-710c053d1cad.png` — visão geral;
- `C:\Users\Bruno\AppData\Local\Temp\codex-clipboard-38ea1181-14f1-43d1-a562-fd110c1af8ef.png` — Competências;
- `C:\Users\Bruno\AppData\Local\Temp\codex-clipboard-76c1b458-ac50-4ba9-9a30-f9f895941796.png` — Evidências.

## DEVE — Infraestrutura taxonômica

- D-TAX-01 — Uma infraestrutura/metamodelo comum forma a Taxonomia Profissional Prisma, com taxonomias de domínio separadas.
- D-TAX-02 — Preservar integralmente M7.1 e `position-taxonomy-1.0.0`, inclusive compatibilidade histórica.
- D-TAX-03 — Criar Taxonomia de Competências própria, com conhecimento, habilidade, competência e tecnologia/ferramenta quando sustentados; não inventar tipo.
- D-TAX-04 — Reutilizar Knowledge/Professional Concept para conceito, alias, origem, versão, relação, publicação, escopo, normalização e auditoria; estender apenas a lacuna comprovada.
- D-TAX-05 — Não manter identidades canônicas concorrentes sem relação explícita.
- D-TAX-06 — Identidade tipada distingue ocupação, conhecimento, habilidade, competência e tecnologia mesmo sob rótulo igual.
- D-TAX-07 — Relações ocupação↔competência são explícitas, versionadas, provenientes e explicáveis.
- D-TAX-08 — Relação cross-domain nunca constitui evidência pessoal.
- D-TAX-09 — Preservar Global e overlay Organization-owned, precedência local e isolamento.
- D-TAX-10 — Taxonomias ocupacional e de competências têm versões independentes.
- D-TAX-11 — Mudanças futuras não reescrevem fatos, associações ou explicações históricas.
- D-TAX-12 — Hierarquia só nasce de capacidade aprovada, fonte publicada, regra documentada ou decisão humana autorizada.

## DEVE — Conteúdo e bootstrap

- D-DATA-01 — A entrega é operacional e não vazia, reutilizando conceitos profissionais aprovados já existentes.
- D-DATA-02 — Ordem de bootstrap: Knowledge canônica, Perfis publicados sem duplicar fatos, ESCO/O*NET já publicados, demais estruturas aprovadas; CBO só quando o conteúdo real sustentar.
- D-DATA-03 — Lacuna não autoriza nova fonte, download, API, Web Search, licença ou provider.
- D-DATA-04 — Conceitos e relações catalogados preservam fonte, versão e proveniência.
- D-DATA-05 — Reconciliação só ocorre por identidade inequívoca ou aprovação existente; ambiguidade permanece explícita.
- D-DATA-06 — Relação taxonômica não produz proficiência, senioridade, score, domínio ou intensidade pessoal.

## DEVE — Pessoa e Perfil

- D-PER-01 — O Perfil representa somente fatos sustentados; taxonomia organiza, não cria.
- D-PER-02 — A projeção usa Perfil publicado vigente e evidências aprovadas; draft/intake/falha parcial não aparecem como publicado.
- D-PER-03 — Nova importação em revisão não altera o mapa até publicação válida.
- D-PER-04 — Perfis existentes recebem a taxonomia sem reimportação e sem reescrita dos fatos.
- D-PER-05 — Evidência explícita permanece declarada.
- D-PER-06 — Inferência/contexto permanece separado, com regra, método e versão.
- D-PER-07 — Verificado exige resultado direto vigente M5.1/Evidência Demonstrada; currículo, certificação, revisão, normalização e relações isoladas não bastam.
- D-PER-08 — Declaração, contexto, demonstração e decisão humana coexistem sem sobrescrita.
- D-PER-09 — Ausência é neutra e nunca deficiência.
- D-PER-10 — Gap existe somente no contexto de uma Posição.
- D-PER-11 — Sem score, ranking, estrelas, percentual ou nível pessoal.
- D-PER-12 — Conceito → associação → evidência → origem → método → versão → decisão/demonstração é reconstituível.

## DEVE — Posição

- D-POS-01 — Requisitos podem apontar para a mesma identidade canônica de competência usada pela Pessoa, sem compartilhar evidência.
- D-POS-02 — Taxonomia organiza; não cria requisito sem decisão humana.
- D-POS-03 — Legado e snapshots permanecem legíveis, sem migração destrutiva.
- D-POS-04 — Elegibilidade, A/B/C, Prisma Score, pesos, ordem, negação, trajetória e matching permanecem semanticamente inalterados.
- D-POS-05 — Relação ocupação→competência nunca insere requisito automaticamente.

## DEVE — UX

- D-UX-01 — As três imagens são normativas para topologia, hierarquia, proporções, agrupamento, densidade, ordem, ações, disclosure, relação mapa/evidência, detalhe e navegação desktop.
- D-UX-02 — Visão geral resume agrupamentos/conceitos evidenciados sem ranking.
- D-UX-03 — Competências mantém busca, filtros, tipos, grupos, naturezas, contagem não avaliativa, detalhe e porquê.
- D-UX-04 — Sem radar, barras, estrelas, gauges ou domínio quantitativo.
- D-UX-05 — Evidências permite buscar, filtrar, agrupar, selecionar, detalhar, ver conceitos e abrir origem.
- D-UX-06 — O porquê expõe evidência, origem, observado/canônico, tipo, regra, método, versão, decisão e demonstração aplicáveis, sem chain-of-thought.
- D-UX-07 — Reutilizar navegação espacial existente quando houver mapa compatível.
- D-UX-08 — Sem coordenada, degradar para documento, trecho/seção/fato/página/método disponíveis.
- D-UX-09 — Cobrir loading, dados, vazio, parcial, erro recuperável, incompatibilidade, fonte indisponível, ausência espacial e ausência de demonstração.
- D-UX-10 — Empty state é neutro.
- D-UX-11 — Mobile empilha cards, mantém ações/porquê e não depende de hover.
- D-UX-12 — Preservar teclado, foco, headings, labels, contraste, leitor de tela, touch targets e redução de movimento aplicável.
- D-UX-13 — Leitura principal é executiva; auditoria técnica usa disclosure progressivo.

## DEVE — Segurança

- D-SEC-01 — Todo dado tenant-owned conserva `organizationId`/`organization_id`.
- D-SEC-02 — RLS/autorização permanece server-side e não amplia papéis.
- D-SEC-03 — Conceitos, aliases, evidências, decisões, relações privadas e caches não vazam entre tenants.
- D-SEC-04 — Uso no Perfil não publica PII na Knowledge Global.
- D-SEC-05 — Logging não recebe currículo integral, trecho/PII desnecessários, prompt com PII ou URL privada desnecessária.
- D-SEC-06 — Não inferir dados sensíveis.
- D-SEC-07 — Versão, relação ou autoridade desconhecida falha explicitamente.

## DEVE — Curadoria e resolução segura já solicitadas para o M7.4

- D-CUR-01 — Busca server-side exclui ocupações antes do limite e classifica canônico exato, alias oficial, alias humano, parcial relevante, ambiguidade e ausência.
- D-CUR-02 — Parcial relevante é apenas candidato humano; nunca resolve associação automaticamente.
- D-CUR-03 — Consulta curta só encontra sigla exata; uma ou duas letras não funcionam como substring interna.
- D-CUR-04 — Candidato expõe definição, tipo Prisma, termo sustentador, autoridade do alias e referências oficiais versionadas.
- D-CUR-05 — O painel M7.4 mantém página, filtros, seleção, cancelamento, gravar/próximo e proteção de edição.

## PROIBIDO

- P-01 — Não transformar a taxonomia ocupacional do M7.1 em taxonomia de competências.
- P-02 — Não criar taxonomia plana misturando ocupações e competências.
- P-03 — Não criar catálogo paralelo a Knowledge/Professional Concept sem lacuna comprovada e decisão registrada.
- P-04 — Não usar Posição, ocupação ou relação ocupacional como evidência de competência da Pessoa.
- P-05 — Não tratar CBO, ESCO ou O*NET como evidência da Pessoa.
- P-06 — Não criar requisito de Posição automaticamente a partir da taxonomia.
- P-07 — Não criar score, ranking, proficiência, senioridade ou percentual de domínio.
- P-08 — Não interpretar ausência como deficiência.
- P-09 — Não criar gap fora de Posição.
- P-10 — Não chamar currículo, certificação, revisão humana, normalização ou inferência de verificação direta.
- P-11 — Não tratar inferência como fato declarado.
- P-12 — Não sobrescrever proveniências anteriores.
- P-13 — Não reimportar currículo para habilitar o novo mapa.
- P-14 — Não alterar M5.1 além da leitura/projeção necessária.
- P-15 — Não alterar matching, Prisma Score, A/B/C ou ordenação.
- P-16 — Não implementar Lominger.
- P-17 — Não introduzir LinkedIn, GitHub, Web Search, nova API, nova base ou fonte externa por causa dos mockups.
- P-18 — Não alterar parser/OCR.
- P-19 — Não criar IA, provider ou modelo novo para classificar competências.
- P-20 — Não inventar dados sintéticos em runtime.
- P-21 — Não mostrar draft como Perfil publicado.
- P-22 — Não relaxar RLS/autorização.
- P-23 — Não expor chain-of-thought.
- P-24 — Não criar persistência redundante quando projeção segura puder reutilizar contratos existentes.
- P-25 — Não executar ação externa sem autorização aplicável. A autorização permanente do `AGENTS.md` 1.3.0 cobre commit, merge, deploy e produção desta melhoria; não cobre destruição, force push, uso indevido de dados reais ou custo externo novo.

## FORA DE ESCOPO

- F-01 — Mudança funcional do M7.1 além das extensões compatíveis necessárias para compartilhar infraestrutura.
- F-02 — Mudança semântica de `position-taxonomy-1.0.0`.
- F-03 — Nova fórmula de matching.
- F-04 — Nova fórmula de Prisma Score.
- F-05 — Alteração dos grupos A/B/C.
- F-06 — Senioridade ou proficiência automática.
- F-07 — Sucessão.
- F-08 — Mobilidade ou plano de carreira.
- F-09 — Workforce planning.
- F-10 — Feedback 360.
- F-11 — Nova avaliação ou teste.
- F-12 — Nova fonte externa de Pessoa.
- F-13 — Lominger.
- F-14 — OCR/parser.
- F-15 — Redesign global do App Shell.
- F-16 — Produção/deploy remoto sem autorização aplicável. Nesta execução, a autorização permanente do `AGENTS.md` 1.3.0 é aplicável e não houve veto do Product Owner.

## AUTONOMIA

- A-01 — Definir composição interna React/TypeScript usando componentes existentes.
- A-02 — Escolher projeção on-read, materialização ou híbrido após avaliar consistência, versão e performance.
- A-03 — Criar ou adaptar índices e queries.
- A-04 — Refatorar infraestrutura taxonômica para reúso preservando compatibilidade histórica.
- A-05 — Definir microcopy pt-BR.
- A-06 — Definir representação visual de múltiplas proveniências.
- A-07 — Definir filtros conforme dados reais.
- A-08 — Escolher drawer, painel ou modal preservando a arquitetura normativa.
- A-09 — Aplicar paginação, lazy loading ou memoização quando necessário.
- A-10 — Escolher nomes físicos de tabelas, campos e contratos após inspeção.
- A-11 — Escolher estratégia reversível, auditável e não destrutiva para Perfis existentes.
- A-12 — Escolher referência canônica de conceitos nos requisitos sem mudar a semântica de matching.

## CRITÉRIOS DE ACEITE

- CA-TAX-01 — Infraestrutura comum mantém os domínios separados e tipados.
- CA-TAX-02 — M7.1 e `position-taxonomy-1.0.0` permanecem semanticamente preservados.
- CA-TAX-03 — Reúso de Knowledge/Professional Concept é demonstrável.
- CA-TAX-04 — Relação cross-domain é versionada, proveniente e explicável.
- CA-TAX-05 — Relação cross-domain não contamina a evidência pessoal.
- CA-TAX-06 — Overlay organizacional permanece isolado.
- CA-TAX-07 — As versões ocupacional e de competências evoluem de modo independente.
- CA-DATA-01 — A Taxonomia de Competências nasce publicada e não vazia.
- CA-DATA-02 — Fonte, versão e proveniência de conceito e relação são recuperáveis.
- CA-DATA-03 — Ambiguidade permanece explícita e sem associação automática.
- CA-DATA-04 — Nenhuma fonte nova é introduzida.
- CA-PER-01 — Perfil existente obtém o mapa sem reimportação nem reescrita.
- CA-PER-02 — Draft/revisão não altera o Perfil publicado.
- CA-PER-03 — Evidência explícita permanece explícita.
- CA-PER-04 — Inferência permanece contextual, versionada e separada.
- CA-PER-05 — Verificado exige Evidência Demonstrada direta e vigente.
- CA-PER-06 — Proveniências coexistem sem sobrescrita.
- CA-PER-07 — Ausência é neutra.
- CA-PER-08 — Não existe score, nível ou ranking pessoal.
- CA-POS-01 — Pessoa e requisito podem apontar para a mesma identidade canônica de competência.
- CA-POS-02 — Taxonomia não cria requisito automaticamente.
- CA-POS-03 — Legado e snapshots continuam legíveis.
- CA-POS-04 — Matching, Prisma Score, A/B/C e ordenação não sofrem regressão semântica.
- CA-UX-01 — Comparação visual same-state, same-data e same-viewport demonstra fidelidade estrutural às três referências.
- CA-UX-02 — Competências entrega busca, filtros, grupos, naturezas, contagem não avaliativa, detalhe e porquê.
- CA-UX-03 — Evidências entrega busca, filtro, seleção, detalhe, conceito e abertura de origem.
- CA-UX-04 — Evidência espacial navega; sem coordenada, o fallback disponível é explícito.
- CA-UX-05 — Mobile empilha conteúdo e preserva ações essenciais sem hover.
- CA-UX-06 — Teclado, foco, headings, labels, contraste, leitor de tela e touch targets aplicáveis são preservados.
- CA-UX-07 — Estado vazio é neutro.
- CA-SEC-01 — Teste negativo bloqueia leitura e mutação cross-tenant.
- CA-SEC-02 — Autorização e RLS server-side permanecem.
- CA-SEC-03 — PII e logging permanecem mínimos.
- CA-SEC-04 — Contrato, versão ou autoridade desconhecidos falham explicitamente.
- CA-REG-01 — Regressão dirigida cobre currículo, revisão e publicação afetados.
- CA-REG-02 — Regressão dirigida cobre leitura M5.1 afetada.
- CA-REG-03 — Build e typecheck das superfícies tocadas passam.
- CA-DOC-01 — Owners, ADR, QA e Current State atualizados; Context Pack gerado e verificado.
- CA-AOT-01 — AoT mapeia todos os D/P aplicáveis; conclusão exige D aplicável em PASS, nenhum P violado e evidência tecnicamente disponível.
- CA-CUR-01 — `a` não faz busca parcial; `C`/`R` só exatos; `BI`/`C#` exatos funcionam; `Active Listening` prioriza exato; ocupação não consome limite.
- CA-CUR-02 — UI expõe classe/autoridade/referências e parcial/ambiguidade não simulam sucesso.

## Pendências

Não existe `Q-*` material conhecido. Nova decisão material bloqueia somente a parte afetada.
