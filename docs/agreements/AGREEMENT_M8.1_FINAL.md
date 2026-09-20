# Agreement Contract — M8.1 — Migração Sistêmica da Arquitetura de Competências e Limpeza Controlada

**Versão:** 1.1.1
**Estado:** `agreed`
**Movimento:** M8.1
**Contrato-base:** Agreement Contract M8 — Redefinição das Regras de Agrupamento de Competências v1.0.0
**Product Owner:** Bruno
**Decisões finais do Product Owner:** 2026-09-20
**Natureza:** mudança material, arquitetural e destrutiva controlada

Este contrato é aditivo ao Agreement M8. Ele não substitui as definições de Hard Skills, Soft Skills, subagrupadores e qualificação Pessoa × Conceito; define como implementar a nova arquitetura e como limpar os dados atuais derivados de importações de currículos.

## Decisões materiais resolvidas

- **Q-01 = A:** Pessoa originada por currículo deve ser excluída integralmente, com todos os dados descendentes.
- **Q-02 = A:** se existir uma Pessoa correspondente a Bruno criada por currículo, essa Pessoa deve ser excluída normalmente; o Usuário `harita.super`, autenticação, papel e memberships devem ser integralmente preservados.
- **Q-03 = C:** remover toda evolução de Knowledge rastreável exclusivamente aos currículos de teste, incluindo observações, Inbox, aliases/conceitos Organization-owned e contribuições/propostas ainda não incorporadas; preservar CBO, ESCO, O*NET e conhecimento institucional independente.
- **Q-04 = A:** remover convites/tentativas/resultados de assessment, Evidência Demonstrada, match evaluations e demais derivados dependentes das Pessoas excluídas.
- **Q-05 = B:** não criar nem preservar ledger histórico específico da limpeza; buscar ausência total dos registros históricos relacionados ao conjunto apagado dentro do que a arquitetura permitir. O AoT pode registrar somente evidência operacional agregada e sem PII. Se um registro de auditoria imutável/obrigatório impedir essa decisão sem violar contrato estrutural, bloquear a parte afetada e reportar o conflito em vez de corromper a arquitetura.
- **Q-06 = A:** executar a limpeza no backend remoto atual usado pelo Prisma e publicar a alteração completa no frontend hospedado, com snapshot/backup técnico prévio, execução controlada e smoke autenticado.

## Decisão superveniente sobre persistência e alcance

O Product Owner definiu em 2026-09-20 que as definições dos macrogrupos `Hard Skill` e `Soft Skill` e dos subagrupadores devem residir em tabelas próprias do banco. A classificação principal referencia essas definições e a identidade canônica existente de `knowledge_concepts`; ela não cria outro catálogo de conceitos.

- Os dois macrogrupos e os nove subagrupadores aprovados constituem definições globais da estrutura M8.
- Cada subagrupador referencia exatamente um macrogrupo. Cada conceito de competência classificado referencia exatamente um subagrupador principal; o macrogrupo é determinado por essa referência.
- Um conceito Global usa somente um subagrupador Global. Sua classificação canônica não é alterada por organização, Pessoa, vaga ou evidência.
- A estrutura admite futuramente subagrupadores de alcance exclusivo de uma organização. Eles só podem classificar conceitos pertencentes à mesma organização; conceitos dessa organização também podem usar os subagrupadores globais.
- O cadastro e a edição de subagrupadores por usuários, seus papéis autorizados e a experiência de gestão são um movimento futuro. O M8.1 prepara a integridade e o isolamento dos dados, sem antecipar esse fluxo.
- Definições em uso mantêm identidade e rastreabilidade; alteração de rótulo ou desativação futura não reescreve silenciosamente o significado de classificações já publicadas.

**Q-07 resolvida:** subagrupadores próprios de uma organização nunca reclassificam conceitos Globais nem aparecem para outras organizações. A imagem composta de nove telas em `docs/assets/m81-nine-screen-reference.png` (SHA-256 `f7b586ccaa224d3d9bc146827e64822c6b43fb0d58d014a1e576feadbcb3f681`) é a referência normativa de arquitetura visual do M8.1.

Não existe `Q-*` material conhecido após essas decisões.

**Decisão posterior do Product Owner (2026-09-20, cadastro específico):** a Pessoa de teste identificada como `[QA] Marina Dados`, antes preservada por falta de intake resolvido, foi confirmada pelo Product Owner como criada artificialmente para testes. Essa confirmação individual autoriza incluí-la na exclusão D-14/CA-23, após o mesmo preflight, backup e preview da saga M5.5. A dúvida de proveniência anterior de D-15 fica resolvida somente para esse cadastro; a outra Pessoa sem criação por intake comprovada continua preservada. Nenhuma outra linha ambígua é autorizada por analogia. D-30/CA-40 continuam exigindo fidelidade visual antes da publicação, conforme decisão explícita posterior do Product Owner.

---

# 1. Objetivo

O M8.1 deve:

1. substituir sistemicamente a classificação operacional legada de competências;
2. implementar a nova arquitetura M8;
3. separar classificação do conceito de qualificação da relação Pessoa × Conceito;
4. atualizar persistência, contratos, queries, RPCs, curadoria, Perfil e consumidores diretamente afetados;
5. preservar a Taxonomia Ocupacional e Knowledge institucional;
6. limpar dados derivados das importações atuais de currículos conforme proveniência;
7. manter Usuários, autenticação, organizações, memberships e autoridade, especialmente `harita.super`;
8. revalidar o ciclo de importação/publicação em produção depois da limpeza.

# 2. Arquitetura de competências

## 2.1 Macrogrupos

Somente:

- `Hard Skill`
- `Soft Skill`

## 2.2 Subagrupadores Hard Skill

1. `Domínios e Especialidades Profissionais`
2. `Tecnologias, Ferramentas e Equipamentos`
3. `Métodos, Processos e Padrões`
4. `Gestão, Negócios e Estratégia`
5. `Idiomas`

## 2.3 Subagrupadores Soft Skill

1. `Interpessoais`
2. `Intrapessoais`
3. `Cognitivo-Executivas`
4. `Liderança`

## 2.4 Regra canônica

Cada conceito possui exatamente um macrogrupo e um subagrupador principal. Classificação pertence ao conceito, não à Pessoa, vaga ou evidência.

## 2.5 Gestão × Liderança

- disciplina, método ou capacidade estruturada de gestão/negócio/estratégia -> `Hard Skill > Gestão, Negócios e Estratégia`;
- comportamento de mobilizar, orientar, influenciar ou desenvolver pessoas -> `Soft Skill > Liderança`.

# 3. Qualificação Pessoa × Conceito

As naturezas de evidência são independentes e acumulativas:

- `Declarado`
- `Contextualizado`
- `Certificado`
- `Verificado por Assessment`
- `Habilidade Evidenciada`

Elas não são novos conceitos e não substituem evidências anteriores.

## 3.1 Declarado

Autorrelato explícito da Pessoa.

## 3.2 Contextualizado

Autorrelato ligado a experiência/projeto/resultado/responsabilidade concreta. Continua autorrelato quando originado do próprio currículo.

## 3.3 Certificado

Credencial relacionada ao conceito. Certificação deixa de ser tipo de competência. Texto ambíguo entre curso/certificação não promove automaticamente `Certificado`.

## 3.4 Verificado por Assessment

Resultado direto de assessment do Prisma que atende ao critério da avaliação. Reutilizar M5.1 quando compatível. Não equivale a habilidade prática.

## 3.5 Habilidade Evidenciada

Aplicação profissional real validada por fonte organizacional autorizada. Currículo, certificação ou assessment isolados não a produzem.

# 4. Regras da importação de currículo

Uma importação pode produzir:

- Declaração;
- Contextualização;
- credencial/certificação declarada quando sustentada.

Nunca pode produzir automaticamente:

- Verificado por Assessment;
- Habilidade Evidenciada.

Ausência de evidência é neutra: sem zero, deficiência ou inferência negativa.

# 5. Agrupadores legados

Deixam de governar a experiência:

- Habilidades;
- Competências;
- Conhecimentos;
- Tecnologia e Ferramentas;
- Métodos e Práticas;
- Certificações.

Podem permanecer tecnicamente apenas quando necessários a compatibilidade histórica/fonte nativa/rollback e devem ser tratados como metadado legado, não como taxonomia operacional M8.

# 6. Limpeza

## 6.1 Pessoas originadas por currículo

Excluir integralmente o agregado da Pessoa e descendentes.

## 6.2 Pessoas preexistentes/manual + currículo posterior

Preservar a identidade manual da Pessoa e remover somente artefatos/fatos/evidências derivados das importações em escopo, preservando conteúdo manual independente. Se o repositório não permite distinguir proveniência com segurança, não apagar por aproximação.

## 6.3 `harita.super`

Preservar integralmente:

- Auth user;
- `platform_users`;
- status;
- papel Super Admin;
- memberships;
- organizações acessíveis;
- login e autorização.

Uma Pessoa homônima/originada de currículo é outro agregado e deve ser apagada conforme a regra normal.

## 6.4 Knowledge

Remover tudo que seja **exclusivamente** derivado dos currículos de teste apagados:

- observations;
- Inbox;
- aliases humanos;
- conceitos Organization-owned;
- change/proposal/contribution ainda dependente;
- demais derivados encontrados.

Preservar tudo que tenha proveniência institucional independente ou fonte oficial.

Preservar sempre CBO, ESCO e O*NET.

## 6.5 Assessment e matching

Para Pessoas excluídas, remover:

- invitations;
- attempts;
- responses/events/metrics/evaluations;
- demonstrated evidence;
- match evaluations;
- derivados diretamente dependentes.

## 6.6 Vagas e Posições

Preservar definições. Remover/destacar somente vínculos à Pessoa apagada necessários para integridade. Não apagar Vaga/Posição por causa da Pessoa. Se uma Posição tiver ocupante apagado, aplicar o estado canônico coerente previsto pelo contrato vigente, sem inventar semântica nova.

## 6.7 Storage

Remover PDFs/artefatos privados do conjunto apagado; preservar bucket e configuração.

## 6.8 Auditoria/ledger da limpeza

Não criar ledger persistente novo para a limpeza. Remover histórico exclusivamente ligado ao conjunto apagado quando permitido. AoT deve registrar somente contagens, hashes/SHA de release, checks e evidência agregada sem PII. Registro obrigatório/imutável incompatível deve ser reportado como bloqueio da parte afetada.

# 7. Proteção operacional

Antes de apagar qualquer dado, confirmar server-side o usuário `harita.super`, papel, status e memberships sem expor secrets.

Após deploy, smoke autenticado deve provar:

1. login;
2. App Shell;
3. organizações;
4. Pessoas;
5. Conhecimento;
6. Posições/Vagas;
7. importação de currículo;
8. ausência de resíduos/erros da limpeza.

# 8. DEVE

- **D-01** Implementar Hard/Soft + 9 subagrupadores.
- **D-02** Um macrogrupo + um subagrupador principal por conceito.
- **D-03** Separar taxonomia de evidência Pessoa × Conceito.
- **D-04** Certificação é credencial/evidência, não tipo de conceito.
- **D-05** Evidências são cumulativas e não destrutivas.
- **D-06** Currículo produz somente os estados permitidos.
- **D-07** M5.1 projeta `Verificado por Assessment` quando compatível.
- **D-08** Habilidade Evidenciada exige evidência real organizacional.
- **D-09** Ausência permanece neutra.
- **D-10** Reutilizar Knowledge e identidades existentes.
- **D-11** Preservar Taxonomia Ocupacional.
- **D-12** Remover a governança UX dos seis agrupadores legados.
- **D-13** Atualizar backend e frontend para impedir combinações inválidas.
- **D-14** Excluir integralmente Pessoas originadas por currículo e descendentes.
- **D-15** Preservar Pessoa manual quando distinguível e limpar somente derivados de currículo.
- **D-16** Preservar integralmente `harita.super` como Usuário.
- **D-17** Remover Knowledge exclusivamente originada pelos currículos de teste.
- **D-18** Preservar Knowledge institucional e fontes oficiais.
- **D-19** Remover assessment/matching dependente de Pessoas excluídas.
- **D-20** Remover Storage no escopo.
- **D-21** Não deixar referências órfãs.
- **D-22** Executar no backend remoto atual com backup técnico prévio e smoke.
- **D-23** Não criar ledger persistente específico da limpeza.
- **D-24** Revalidar ciclo intake -> revisão -> publicação -> Perfil sob M8.
- **D-25** Preservar matching/Prisma Score semanticamente.
- **D-26** Atualizar owners, contratos, ADR/AoT e Context Pack proporcionalmente.
- **D-27** Registrar release/versionamento conforme contrato vigente, sem inventar versão em conflito.
- **D-28** Usar dados sintéticos em testes e não currículos reais versionados.
- **D-29** Preservar isolamento tenant/RLS/autoridade.
- **D-30** As telas M8.1 anexadas ao Execution Prompt são referência normativa de arquitetura visual, nos termos de `docs/product/ux-foundation.md`.
- **D-31** Persistir definições de macrogrupos e subagrupadores em tabelas próprias, vinculadas por integridade referencial à classificação do conceito canônico em Knowledge.
- **D-32** Preservar a classificação Global de conceitos Globais e impedir que subagrupadores de uma organização classifiquem conceitos Globais ou de outra organização.
- **D-33** Preparar a representação tenant-scoped de subagrupadores organizacionais sem implementar neste movimento seu cadastro/edição por usuários.

# 9. PROIBIDO

- **P-01** Não apagar Auth/`platform_users`.
- **P-02** Não apagar memberships/papéis por deleção de Pessoa.
- **P-03** Não prejudicar `harita.super`.
- **P-04** Não truncar indiscriminadamente tabelas mistas.
- **P-05** Não apagar CBO/ESCO/O*NET.
- **P-06** Não apagar Knowledge com proveniência independente.
- **P-07** Não apagar Vagas/Posições apenas por referência a Pessoa.
- **P-08** Não deixar órfãos funcionais.
- **P-09** Não reusar silenciosamente tipos legados como M8.
- **P-10** Não criar Habilidade Evidenciada de currículo.
- **P-11** Não criar Verificado de currículo/certificação.
- **P-12** Não mudar matching/score.
- **P-13** Não `drop schema`, `db reset`, `truncate cascade` global.
- **P-14** Não expor secrets/PII em logs.
- **P-15** Não declarar limpeza só pela UI.
- **P-16** Não inventar classificação ambígua.
- **P-17** Não criar conceito duplicado para evidência.
- **P-18** Não criar nova fonte/API/provider/modelo por este movimento.
- **P-19** Não implementar sucessão/PDI/9-Box/gap.
- **P-20** Não usar currículo real como fixture versionada.
- **P-21** Não criar ledger persistente novo da limpeza.
- **P-22** Não manter histórico pessoal deletável apenas para “auditar a limpeza”.
- **P-23** Não remover auditoria estrutural imutável por corrupção; bloquear/reportar conflito se existir.
- **P-24** Não codificar as definições de Hard/Soft e subagrupadores apenas como enums, constantes de frontend ou texto livre sem integridade no banco.
- **P-25** Não aplicar classificação organizacional a conceito Global nem permitir referência entre organizações.

# 10. FORA DE ESCOPO

- **F-01** sucessão;
- **F-02** 9-Box;
- **F-03** PDI;
- **F-04** gap de execução;
- **F-05** score Técnica × Gestão;
- **F-06** nova fórmula de matching;
- **F-07** nova fórmula Prisma Score;
- **F-08** novo motor de assessment;
- **F-09** novo feedback 360/1-on-1/performance;
- **F-10** verificação externa automática de certificações;
- **F-11** novo provider/modelo externo;
- **F-12** redesign global do App Shell;
- **F-13** mudança de OCR/parser não necessária ao contrato.
- **F-14** cadastro e edição de subagrupadores por usuários neste movimento.

# 11. AUTONOMIA

- **A-01** estratégia de migration/backfill;
- **A-02** compatibilidade técnica legada;
- **A-03** projeção/materialização;
- **A-04** ordem segura de deleção;
- **A-05** reuso do contrato de exclusão de Pessoa;
- **A-06** RPC/migration administrativa segura;
- **A-07** índices/constraints;
- **A-08** microcopy/componentes;
- **A-09** fixtures sintéticas;
- **A-10** rollback técnico;
- **A-11** limpeza de referências de ocupante em Posição conforme contrato vigente;
- **A-12** classificação determinística de conceitos existentes apenas onde semanticamente inequívoca; demais permanecem pendentes.

# 12. CRITÉRIOS DE ACEITE

- **CA-01** Excel -> Hard > Tecnologias, Ferramentas e Equipamentos.
- **CA-02** Gestão de Projetos -> Hard > Gestão, Negócios e Estratégia.
- **CA-03** Comunicação -> Soft > Interpessoais.
- **CA-04** Resiliência -> Soft > Intrapessoais.
- **CA-05** Resolução de Problemas -> Soft > Cognitivo-Executivas.
- **CA-06** Visão Estratégica -> Soft > Liderança.
- **CA-07** Planejamento Estratégico -> Hard > Gestão, Negócios e Estratégia.
- **CA-08** SAP e HPLC compartilham H2, demonstrando neutralidade setorial.
- **CA-09** currículo com AWS apenas -> Declarado no máximo.
- **CA-10** currículo com AWS + experiência concreta -> Declarado + Contextualizado possível.
- **CA-11** currículo nunca -> Habilidade Evidenciada.
- **CA-12** assessment pode -> Verificado por Assessment.
- **CA-13** assessment não -> Habilidade Evidenciada.
- **CA-14** Certificado e Verificado coexistem.
- **CA-15** ausência não vira zero.
- **CA-16** evidência nova não apaga anterior.
- **CA-17** identidade canônica não é duplicada.
- **CA-18** tipos/mappings nativos permanecem recuperáveis.
- **CA-19** taxonomia ocupacional permanece independente.
- **CA-20** ambiguidade não autoassocia.
- **CA-21** usuários/organizações/memberships preservados.
- **CA-22** `harita.super` autentica e mantém Super Admin.
- **CA-23** Pessoas originadas por currículos no escopo não permanecem.
- **CA-24** dados descendentes/Storage dessas Pessoas não permanecem.
- **CA-25** Knowledge exclusivamente derivada desses currículos não permanece.
- **CA-26** CBO/ESCO/O*NET e Knowledge independente permanecem.
- **CA-27** assessment/matching dependente de Pessoas excluídas não permanece.
- **CA-28** sem referências funcionais órfãs.
- **CA-29** Vagas/Posições preservadas.
- **CA-30** novo currículo sintético percorre intake -> revisão -> publicação.
- **CA-31** novo Perfil usa M8.
- **CA-32** os seis agrupadores legados não governam criação/associação.
- **CA-33** UI/backend impedem combinações inválidas.
- **CA-34** matching/score sem regressão semântica.
- **CA-35** RLS/tenant sem regressão.
- **CA-36** AoT contém evidência agregada sem PII e sem novo ledger de cleanup.
- **CA-37** frontend hospedado e backend remoto atual estão sincronizados no SHA final.
- **CA-38** tabelas próprias contêm dois macrogrupos e nove subagrupadores globais aprovados, com FK válida e classificação principal única por conceito classificado.
- **CA-39** conceito Global rejeita subagrupador organizacional; conceito de uma organização rejeita subagrupador de outra, inclusive por escrita direta e RPC.
- **CA-40** telas são comparadas com a imagem composta de nove telas em estado, dados e viewport equivalentes; divergências estruturais são registradas no AoT.
