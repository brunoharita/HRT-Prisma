# Agreement Contract — M8.1 — Migração Sistêmica da Arquitetura de Competências e Limpeza Controlada de Dados

**Versão:** 0.1.0
**Estado:** `pending-product-decisions`
**Movimento:** M8.1
**Contrato-base:** Agreement Contract M8 — Redefinição das Regras de Agrupamento de Competências v1.0.0
**Natureza:** mudança material, arquitetural e destrutiva controlada

> Este contrato é um aditivo operacional ao M8. Ele não substitui as definições de Hard Skills, Soft Skills, subagrupadores e qualificação da relação Pessoa × Conceito já aprovadas no Agreement M8. Ele acrescenta as regras necessárias para executar a migração sistêmica e a limpeza dos dados atuais derivados de importações de currículos.

---

## 1. Objetivo do M8.1

Executar a mudança sistêmica necessária para que o Prisma passe a operar com a nova arquitetura de competências aprovada no M8, incluindo:

1. substituir a classificação operacional legada de competências;
2. alterar contratos, persistência, projeções e superfícies consumidoras diretamente afetadas;
3. criar a nova classificação canônica Prisma `Hard Skill / Soft Skill -> subagrupador`;
4. separar classificação do conceito da qualificação da relação Pessoa × Conceito;
5. preservar compatibilidade apenas onde necessária para fontes, contratos ou histórico técnico;
6. limpar os dados derivados das importações de currículos existentes para permitir novo ciclo de testes sobre uma base coerente com a arquitetura M8;
7. preservar autenticação, autorização, organizações e usabilidade operacional do sistema, com atenção especial ao acesso do Super Admin `harita.super`;
8. revalidar o fluxo completo de nova importação após a limpeza.

---

# 2. Necessário para o movimento

## D-ARCH-01 — Nova arquitetura M8

Implementar integralmente a arquitetura aprovada no Agreement M8:

```text
Conceito
  -> Hard Skill | Soft Skill
      -> Subagrupador principal
```

separada de:

```text
Pessoa × Conceito
  -> Declarado
  -> Contextualizado
  -> Certificado
  -> Verificado por Assessment
  -> Habilidade Evidenciada
```

A implementação não pode fundir essas duas dimensões.

---

## D-ARCH-02 — Agrupadores legados deixam de governar a experiência

Os agrupadores atuais:

- Habilidades;
- Competências;
- Conhecimentos;
- Tecnologia e Ferramentas;
- Métodos e Práticas;
- Certificações;

não podem continuar sendo a classificação operacional principal apresentada ao administrador para classificar uma competência.

O Codex deve localizar todos os locais em que esses valores:

- são persistidos;
- são inferidos;
- são validados;
- são usados em filtros;
- são exibidos;
- condicionam busca;
- condicionam matching;
- condicionam curadoria;
- condicionam Perfil;
- condicionam formulários;
- condicionam testes.

A substituição deve ser sistêmica nas superfícies diretamente envolvidas.

---

## D-ARCH-03 — Compatibilidade legada apenas quando tecnicamente necessária

Caso algum agrupador legado seja necessário para:

- identidade nativa de fonte externa;
- contrato histórico;
- leitura de snapshot antigo;
- compatibilidade de API;
- rollback;

ele pode permanecer internamente, mas:

1. deve ser explicitamente marcado como legado/técnico;
2. não pode governar a nova UX;
3. não pode ser confundido com a classificação canônica M8;
4. não pode ser reusado silenciosamente como substituto da nova estrutura.

---

## D-ARCH-04 — Classificação canônica

Cada conceito de competência deve possuir:

- um macrogrupo principal;
- um subagrupador principal compatível.

Hard Skills:

1. Domínios e Especialidades Profissionais;
2. Tecnologias, Ferramentas e Equipamentos;
3. Métodos, Processos e Padrões;
4. Gestão, Negócios e Estratégia;
5. Idiomas.

Soft Skills:

1. Interpessoais;
2. Intrapessoais;
3. Cognitivo-Executivas;
4. Liderança.

---

## D-ARCH-05 — Casos ambíguos

Classificação incerta não pode ser resolvida por semelhança lexical simples.

Conceito sem classificação segura deve:

- permanecer utilizável conforme a política de compatibilidade definida pelo Codex;
- ser marcado como pendente de classificação/curadoria;
- não receber categoria inventada.

---

# 3. Limpeza controlada de dados

A intenção do Product Owner é remover os dados gerados a partir das importações de currículos atuais para que o novo ciclo M8.1 comece sobre dados de Pessoa coerentes com a nova arquitetura.

A limpeza é destrutiva e deve ser executada somente após inventário e plano de deleção.

---

## D-CLEAN-01 — Inventário antes da deleção

Antes de qualquer exclusão, o Codex deve produzir um inventário factual das tabelas, Storage objects e agregados alcançados pelas importações de currículo no ambiente alvo.

O inventário deve distinguir no mínimo:

- autenticação/usuários;
- grupos e organizações;
- memberships e papéis;
- Pessoas;
- dados privados da Pessoa;
- resume intakes;
- documentos;
- objetos PDF no Storage;
- processamento/tentativas;
- extrações por página;
- extraction drafts;
- evidência espacial;
- revisões;
- revisões de Perfil e mudanças;
- professional profiles;
- competências e associações da Pessoa;
- evidências;
- inferências;
- Knowledge observations;
- Knowledge Inbox;
- aprendizado adaptativo derivado de currículo;
- eventos de ingestão;
- match evaluations;
- verificação/assessment vinculada a Pessoas;
- logs/ledgers/auditoria;
- quaisquer tabelas novas descobertas pelo código ou migrations.

Não executar deleção baseado apenas nesta lista: o repositório e o banco são a autoridade técnica para descobrir o conjunto completo.

---

## D-CLEAN-02 — Preservar a plataforma

A limpeza não deve remover nem invalidar:

- autenticação necessária ao acesso;
- `platform_users`;
- grupos organizacionais;
- organizações;
- memberships;
- papéis;
- permissões;
- configuração do Super Admin;
- configuração operacional necessária ao login e navegação;
- Knowledge oficial/global que não seja dado pessoal derivado de currículo;
- CBO;
- ESCO;
- O*NET;
- fontes publicadas oficiais;
- configurações de ambiente;
- secrets;
- migrations;
- contratos;
- Vagas e Posições, salvo dado explicitamente derivado de Pessoa que precise ser removido por integridade referencial.

O acesso `harita.super` deve permanecer funcional após a limpeza.

---

## D-CLEAN-03 — Usuário e Pessoa são agregados distintos

A existência de uma Pessoa relacionada nominalmente ao mesmo indivíduo de um Usuário da plataforma não autoriza remover ou alterar o Usuário.

A limpeza de dados de Pessoa não pode:

- excluir o login;
- alterar senha;
- remover membership;
- reduzir papel;
- remover organização ativa;
- quebrar sessão/autorização do `harita.super`.

---

## D-CLEAN-04 — Exclusão por proveniência

A limpeza deve operar por proveniência real, relações e ownership.

É proibido apagar indiscriminadamente tabelas inteiras quando elas também contêm:

- Knowledge institucional;
- configuração;
- dados globais;
- usuários;
- organizações;
- dados não derivados de currículo.

---

## D-CLEAN-05 — Storage

Todo PDF/artefato privado pertencente aos currículos que estiverem no escopo de exclusão deve ser removido do Storage conforme o contrato de deleção existente, sem deixar objeto órfão.

Não apagar bucket ou configuração do Storage.

---

## D-CLEAN-06 — Referências órfãs

Após a limpeza não podem permanecer registros funcionais órfãos que façam a UI:

- listar Pessoa inexistente;
- mostrar Perfil sem Pessoa;
- mostrar documento sem owner válido;
- mostrar pendência de competência de Pessoa apagada;
- mostrar match de Pessoa apagada;
- mostrar assessment ativo de Pessoa apagada;
- contar dados apagados em indicadores operacionais.

---

# 4. Proteção de acesso e usabilidade

## D-AUTH-01

Antes da limpeza, o Codex deve confirmar factual e server-side:

- ID do `platform_user` correspondente ao usuário `harita.super`;
- papel;
- status;
- memberships;
- organizações acessíveis;
- mecanismo de autenticação em uso.

Não registrar ou expor senha, token, secret ou PII desnecessária.

---

## D-AUTH-02

Após limpeza e deploy, executar smoke autenticado com `harita.super` cobrindo no mínimo:

1. login;
2. carregamento do App Shell;
3. seleção/visibilidade da organização esperada;
4. acesso a Pessoas;
5. acesso a Conhecimento;
6. acesso a Posições/Vagas existentes;
7. abertura da importação de currículo;
8. ausência de erro causado por registros removidos.

---

## D-AUTH-03

Se qualquer passo de deleção ameaçar autenticação, membership, papel ou acesso do `harita.super`, a execução deve parar antes da ação destrutiva afetada.

---

# 5. Recriação do ciclo de Pessoa após a limpeza

## D-FLOW-01

Após a limpeza, o Prisma deve continuar apto a:

1. receber novo currículo;
2. resolver identidade conforme contrato vigente;
3. criar/vincular Pessoa;
4. extrair dados;
5. revisar;
6. publicar Perfil;
7. classificar conceitos segundo M8;
8. registrar declaração/contextualização conforme evidência;
9. mostrar a nova estrutura no Perfil.

---

## D-FLOW-02

Uma nova importação não pode recriar os agrupadores legados como classificação operacional principal.

---

## D-FLOW-03

Currículo importado após M8.1 pode gerar no máximo:

- Declarado;
- Contextualizado;
- credencial/certificação declarada conforme regra aprovada.

Não pode gerar por importação:

- Verificado por Assessment;
- Habilidade Evidenciada.

---

# 6. Superfícies UX necessárias

O M8.1 deverá alterar apenas as superfícies diretamente envolvidas na nova arquitetura.

### D-UX-01 — Curadoria / associação de conceito

A tela de criar ou associar competência deve apresentar:

- Macrogrupo: Hard Skill / Soft Skill;
- Subagrupador compatível;
- conceito;
- definição/descrição quando disponível;
- origem/escopo aplicável;
- indicação clara de pendência se a classificação ainda não for segura.

Os seis agrupadores legados não devem aparecer como escolha principal.

### D-UX-02 — Perfil da Pessoa / Competências

A tela deve organizar conceitos por:

```text
Hard Skills
  -> subagrupadores

Soft Skills
  -> subagrupadores
```

e mostrar separadamente as evidências da relação Pessoa × Conceito.

### D-UX-03 — Detalhe da competência

O detalhe deve permitir compreender:

- conceito canônico;
- macrogrupo;
- subagrupador;
- termo observado;
- origem;
- natureza(s) de evidência;
- documento/contexto quando disponível;
- assessment quando existir;
- evidência prática quando futuramente existir.

Não mostrar força, score ou nível inexistente.

---

# 7. PROIBIDO

- **P-01** — Não apagar `platform_users` como efeito da limpeza de currículos.
- **P-02** — Não apagar Auth users por correspondência de nome/e-mail com Pessoa.
- **P-03** — Não remover memberships ou papéis por causa da deleção de Pessoa.
- **P-04** — Não prejudicar o acesso do `harita.super`.
- **P-05** — Não truncar indiscriminadamente tabelas mistas.
- **P-06** — Não apagar CBO, ESCO, O*NET ou Knowledge oficial/global não pessoal.
- **P-07** — Não apagar Vagas/Posições apenas porque matches apontavam para Pessoas removidas.
- **P-08** — Não manter referências funcionais órfãs.
- **P-09** — Não converter agrupadores legados em aliases da nova taxonomia sem significado explícito.
- **P-10** — Não criar automaticamente `Habilidade Evidenciada` a partir de currículo.
- **P-11** — Não criar automaticamente `Verificado por Assessment` a partir de currículo ou certificação.
- **P-12** — Não alterar matching/Prisma Score por conveniência da migração.
- **P-13** — Não executar `db reset`, `drop schema`, `truncate cascade` global ou equivalente sem escopo provado.
- **P-14** — Não usar usuário, senha, token ou secret em fixtures/logs.
- **P-15** — Não declarar limpeza concluída apenas porque a UI ficou vazia; provar ausência de resíduos no banco/Storage.
- **P-16** — Não usar documentação como prova do estado real antes ou depois da execução.

---

# 8. FORA DE ESCOPO

- **F-01** — Implementação de sucessão.
- **F-02** — 9-Box.
- **F-03** — PDI.
- **F-04** — Gap de execução.
- **F-05** — Score Técnica × Gestão.
- **F-06** — Nova fórmula de matching.
- **F-07** — Nova fórmula de Prisma Score.
- **F-08** — Novo motor de assessment.
- **F-09** — Novo provider/modelo externo.
- **F-10** — Redesign global do shell.
- **F-11** — Limpeza de usuários ou organizações não derivada do objetivo deste movimento.

---

# 9. AUTONOMIA TÉCNICA

- **A-01** — Definir estratégia segura de migration/backfill para a nova classificação.
- **A-02** — Preservar campos/enum legados internamente para compatibilidade, desde que deixem de governar a UX.
- **A-03** — Escolher projection/on-read/materialização para classificação M8, respeitando identidade única.
- **A-04** — Definir ordem técnica de deleção conforme FKs, RLS, Storage e transações.
- **A-05** — Reutilizar o contrato de exclusão definitiva de Pessoa onde ele for tecnicamente adequado.
- **A-06** — Criar migration/RPC administrativa específica e auditável se necessário; não usar operação genérica insegura.
- **A-07** — Definir índices e constraints necessários.
- **A-08** — Definir microcopy e componentes respeitando o design system atual.
- **A-09** — Criar fixtures sintéticas para testes.
- **A-10** — Implementar rollback técnico compatível com a arquitetura descoberta, exceto restauração de dados destruídos sem backup/snapshot prévio.

---

# 10. PENDENTES MATERIAIS

## Q-01 — Pessoas originadas por currículo

Quando uma Pessoa foi criada originalmente por importação de currículo e depois recebeu revisão/curadoria/edições humanas, o M8.1 deve:

**A.** excluir o agregado inteiro da Pessoa e todos os seus dados descendentes;
ou
**B.** preservar a Pessoa e remover somente documentos/dados derivados do currículo?

---

## Q-02 — Pessoa correspondente ao `harita.super`

Se existir no Prisma uma **Pessoa** de Bruno criada por currículo, distinta do **Usuário** `harita.super`, devemos:

**A.** excluir essa Pessoa normalmente e preservar apenas o Usuário/acesso;
ou
**B.** preservar também essa Pessoa e seu Perfil?

---

## Q-03 — Knowledge derivada de currículo

Quando termos de currículos originaram:

- `knowledge_observations`;
- Inbox;
- aliases humanos;
- conceitos Organization-owned;
- contribuições/propostas Globais;

devemos:

**A.** remover somente observações/pendências pessoais e preservar conceitos/aliases já aprovados;
**B.** remover também conceitos/aliases Organization-owned que tenham origem exclusiva nesses currículos;
**C.** remover toda evolução de Knowledge rastreável exclusivamente aos currículos de teste, inclusive contribuições/propostas ainda não aprovadas?

Knowledge oficial de CBO/ESCO/O*NET permanece preservada em todas as opções.

---

## Q-04 — Assessments e matching vinculados às Pessoas apagadas

Para Pessoas no escopo da limpeza, devemos excluir também:

- convites/tentativas/resultados de assessment;
- Evidência Demonstrada;
- `match_evaluations`;
- demais resultados derivados dessas Pessoas?

**A. Sim, remover tudo que dependa dessas Pessoas.**
**B. Não, preservar histórico anonimizado quando tecnicamente possível.**

---

## Q-05 — Auditoria mínima após limpeza

Aceita-se preservar **ledger técnico mínimo e não-PII** de operação/deleção para comprovar a limpeza e manter integridade/auditoria?

**A. Sim.**
**B. Não, deseja-se ausência total de registros históricos relacionados, dentro do que a arquitetura permitir.**

---

## Q-06 — Ambiente alvo da limpeza

A limpeza destrutiva deve ocorrer no **backend remoto atual usado pelo Prisma**, após snapshot/backup técnico e validação, ou apenas local/QA?

**A. Backend remoto atual + frontend hospedado, com execução controlada e smoke.**
**B. Somente local/QA por enquanto.**

---

# 11. CRITÉRIOS DE ACEITE

- **CA-01** — Nova UX não oferece os seis agrupadores legados como classificação principal.
- **CA-02** — Hard/Soft e os nove subagrupadores M8 estão implementados e validados.
- **CA-03** — Combinações macrogrupo/subagrupador inválidas são rejeitadas no backend.
- **CA-04** — Classificação M8 não duplica identidade canônica.
- **CA-05** — Certificação é tratada como credencial/evidência, não como macro/subagrupador.
- **CA-06** — Importação nova produz somente naturezas permitidas pelo contrato.
- **CA-07** — Todos os registros de currículo no escopo aprovado da limpeza foram removidos.
- **CA-08** — Todos os objetos Storage no escopo foram removidos.
- **CA-09** — Nenhum resíduo funcional órfão permanece.
- **CA-10** — CBO/ESCO/O*NET e Knowledge institucional preservados.
- **CA-11** — Usuários, organizações, memberships e papéis preservados conforme contrato.
- **CA-12** — `harita.super` autentica e mantém autoridade de Super Admin.
- **CA-13** — Pessoas apresenta estado vazio/coerente após limpeza quando aplicável.
- **CA-14** — Um novo currículo sintético pode percorrer intake -> revisão -> publicação após a migração.
- **CA-15** — Competências desse novo Perfil aparecem na nova estrutura M8.
- **CA-16** — Matching/Prisma Score não mudaram semanticamente.
- **CA-17** — Evidência de banco e Storage comprova a limpeza, não apenas a UI.
- **CA-18** — Testes negativos provam que Auth/Usuário não foi apagado pela deleção de Pessoa.
- **CA-19** — AoT mapeia D/P para implementação, teste e evidência.
- **CA-20** — Não há Q-* material aberto no momento da geração do Execution Prompt final.

---

# 12. Referências obrigatórias para o futuro Execution Prompt

O Execution Prompt M8.1 deverá exigir leitura integral de:

1. Agreement Contract M8 aprovado;
2. este Agreement M8.1 aprovado;
3. `AGENTS.md`;
4. seção pertinente de `docs/ai-context/PRISMA_CURRENT_STATE.md`;
5. owners de Knowledge/Professional Concept;
6. contratos e ADRs M7.2/M7.4/M7.5/M7.6/M7.7 aplicáveis;
7. owners de Pessoa/currículo/revisão/publicação;
8. owners e implementação da exclusão definitiva de Pessoa;
9. owners do M5.1 quando assessment for projetado como conhecimento verificado;
10. migrations/RPCs/FKs/RLS/Storage diretamente afetados;
11. `docs/product/ux-foundation.md` para as referências visuais.

O Codex deve confirmar no código, banco e ambiente o que realmente existe antes de qualquer deleção ou migração.

---

# 13. Regra de bloqueio

**Não gerar nem executar o Execution Prompt final do M8.1 enquanto Q-01 a Q-06 não estiverem resolvidas pelo Product Owner.**

A limpeza proposta envolve dados destrutivos, identidade Pessoa × Usuário, Knowledge derivada, assessments, matching, auditoria e ambiente remoto. Essas decisões alteram materialmente escopo, dados, segurança e rollback.
