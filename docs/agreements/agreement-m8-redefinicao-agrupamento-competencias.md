# Agreement Contract — M8 — Redefinição das Regras de Agrupamento de Competências

**Versão do contrato:** 1.0.0
**Estado:** draft para aprovação do Product Owner
**Movimento:** M8 — Redefinição das regras de agrupamento de competências
**Objetivo:** substituir a classificação operacional atual de competências por uma arquitetura mais simples, genérica entre setores e preparada para recrutamento, gestão de pessoas, desenvolvimento e sucessão, sem confundir natureza do conceito com força/evidência da relação da Pessoa com esse conceito.

---

## 1. Contexto e problema

Hoje o Prisma apresenta/usa como agrupadores de tipo de conceito:

- Habilidades;
- Competências;
- Conhecimentos;
- Tecnologia e Ferramentas;
- Métodos e Práticas;
- Certificações.

Essa estrutura cria ambiguidade operacional para o administrador, porque mistura no mesmo nível:

1. natureza do conceito profissional;
2. forma de aplicação;
3. artefato/ferramenta;
4. método;
5. credencial;
6. forma de comprovação.

Exemplos de ambiguidade observada:

- `Transformação Digital` pode ser interpretada como conhecimento, competência ou prática;
- `Comunicação` pode ser interpretada como habilidade ou competência;
- `Gestão de Projetos` pode ser interpretada como conhecimento, competência ou método;
- `AWS` pode aparecer como tecnologia, conhecimento ou competência;
- uma certificação é uma credencial sobre um conhecimento, não uma família de competência equivalente a Hard/Soft Skill.

O M8 redefine essa arquitetura.

---

# 2. Modelo conceitual aprovado

O novo modelo separa obrigatoriamente duas dimensões independentes:

## 2.1. Dimensão A — Classificação do conceito

Responde:

> **Que tipo de capacidade profissional é esta?**

Estrutura:

```text
Macrogrupo
  -> Subagrupador
      -> Conceito canônico
```

O macrogrupo possui somente dois valores:

1. **Hard Skills**
2. **Soft Skills**

Cada conceito deve possuir **um único macrogrupo principal** e **um único subagrupador principal**.

Relações adicionais entre conceitos podem existir na Knowledge, mas não transformam um conceito em múltiplas classificações primárias.

---

## 2.2. Dimensão B — Qualificação da relação Pessoa × Conceito

Responde:

> **O que o Prisma efetivamente sabe sobre a relação desta Pessoa com este conceito, e com qual tipo de evidência?**

A classificação taxonômica do conceito não muda quando surgem novas evidências.

Exemplo:

```text
AWS
Hard Skill
Tecnologias, Ferramentas e Equipamentos
```

continua sendo o mesmo conceito independentemente de a Pessoa apenas declará-lo, apresentar uma certificação, realizar um assessment ou demonstrar aplicação prática no trabalho.

As evidências se acumulam; não substituem a identidade do conceito.

---

# 3. Estrutura dos agrupadores

## 3.1. Hard Skills

Hard Skills representam conhecimentos, técnicas, métodos, tecnologias, idiomas e capacidades estruturadas que podem ser aprendidas, ensinadas, descritas por conteúdo técnico e, quando aplicável, avaliadas diretamente.

### H1 — Domínios e Especialidades Profissionais

**Definição:** campo de conhecimento ou especialidade profissional sobre o qual a Pessoa precisa possuir repertório técnico.

**Pergunta de classificação:**

> “Este conceito representa uma área, disciplina ou especialidade profissional que precisa ser dominada?”

**Exemplos:**

- Arquitetura de Software;
- Cibersegurança;
- Engenharia de Processos;
- Contabilidade;
- Logística;
- Supply Chain;
- Business Intelligence;
- Data Science;
- Inteligência Artificial;
- Segurança da Informação.

**Não usar para:** uma ferramenta específica, um método formal, uma língua ou uma capacidade comportamental.

---

### H2 — Tecnologias, Ferramentas e Equipamentos

**Definição:** produto, plataforma, sistema, linguagem, ferramenta, tecnologia ou equipamento concreto utilizado no trabalho.

**Pergunta de classificação:**

> “Este conceito representa algo específico que a Pessoa usa, opera, configura, programa ou manipula?”

**Exemplos:**

- Microsoft Excel;
- SAP;
- SAP EWM;
- AWS;
- Java;
- Power BI;
- Salesforce;
- SQL;
- n8n;
- Supabase;
- HPLC;
- espectrômetro;
- sistema LIMS;
- KNAPP.

**Observação:** linguagens de programação pertencem aqui. Idiomas humanos pertencem ao agrupador H5.

---

### H3 — Métodos, Processos e Padrões

**Definição:** método, framework, prática estruturada, padrão, norma ou forma organizada de executar trabalho.

**Pergunta de classificação:**

> “Este conceito representa uma forma estruturada, normatizada ou repetível de realizar uma atividade?”

**Exemplos:**

- Scrum;
- Kanban;
- Lean;
- Six Sigma;
- ITIL;
- BPM;
- BPMN;
- PDCA;
- HAZOP;
- ISO 27001;
- ISO 17025;
- Design Thinking;
- As-Is/To-Be.

**Não usar para:** domínio profissional amplo ou ferramenta concreta.

---

### H4 — Gestão, Negócios e Estratégia

**Definição:** conhecimentos e capacidades estruturadas relacionados a administrar recursos, projetos, operações, processos, portfólios, negócio ou estratégia.

**Pergunta de classificação:**

> “Este conceito representa saber estruturar ou executar gestão, negócio, operação ou estratégia?”

**Exemplos:**

- Gestão de Projetos;
- Gestão de Programas;
- PMO;
- Gestão Financeira;
- Gestão de Operações;
- Gestão de Processos;
- Gestão da Mudança;
- Transformação Digital;
- Planejamento Estratégico;
- Gestão de Portfólio;
- Gestão de Produto;
- Gestão de Riscos;
- Gestão de Stakeholders;
- Gestão de Fornecedores;
- Gestão de Capacidade;
- Gestão de Prioridades;
- Governança de Tecnologia;
- Excelência Operacional.

### Regra de separação Gestão × Liderança

`Gestão, Negócios e Estratégia` é Hard Skill quando o conceito descreve uma disciplina, prática estruturada ou capacidade de gestão.

`Liderança` é Soft Skill quando o conceito descreve comportamento de mobilizar, orientar, influenciar, desenvolver ou direcionar pessoas.

Exemplos:

- `Planejamento Estratégico` -> Hard Skill -> Gestão, Negócios e Estratégia;
- `Visão Estratégica` -> Soft Skill -> Liderança;
- `Gestão de Pessoas` pode conter conceitos hard de gestão e conceitos soft de liderança, que devem permanecer conceitos distintos;
- `Desenvolvimento de Pessoas` -> Soft Skill -> Liderança.

---

### H5 — Idiomas

**Definição:** capacidade linguística humana utilizada em contexto profissional.

**Pergunta de classificação:**

> “Este conceito é um idioma humano?”

**Exemplos:**

- Português;
- Inglês;
- Espanhol;
- Alemão;
- Japonês.

O nível declarado de idioma não transforma a declaração em verificação.

---

## 3.2. Soft Skills

Soft Skills representam capacidades comportamentais, relacionais, cognitivas ou de liderança observáveis na forma como a Pessoa pensa, age, reage e interage.

### S1 — Interpessoais

**Definição:** capacidades relacionadas à interação e relação com outras pessoas.

**Pergunta de classificação:**

> “Este conceito descreve como a Pessoa se comunica, coopera, negocia ou se relaciona com outras pessoas?”

**Exemplos:**

- Comunicação;
- Comunicação Executiva;
- Negociação;
- Colaboração;
- Escuta;
- Gestão de Conflitos;
- relacionamento com stakeholders.

---

### S2 — Intrapessoais

**Definição:** capacidades relacionadas à autorregulação e à forma como a Pessoa administra a si própria.

**Pergunta de classificação:**

> “Este conceito descreve como a Pessoa administra suas próprias emoções, energia, disciplina ou adaptação?”

**Exemplos:**

- Resiliência;
- Adaptabilidade;
- Autocontrole;
- Autoconhecimento;
- Disciplina;
- perseverança.

---

### S3 — Cognitivo-Executivas

**Definição:** capacidades relacionadas a raciocínio, análise, decisão, organização mental, criatividade e solução de problemas.

**Pergunta de classificação:**

> “Este conceito descreve principalmente como a Pessoa pensa, analisa, decide, organiza ou resolve?”

**Exemplos:**

- Resolução de Problemas;
- Pensamento Crítico;
- Criatividade;
- Tomada de Decisão;
- Pensamento Analítico;
- Pensamento Estratégico;
- priorização;
- raciocínio sistêmico.

---

### S4 — Liderança

**Definição:** capacidades comportamentais usadas para mobilizar, direcionar, desenvolver, influenciar ou alinhar pessoas e organizações.

**Pergunta de classificação:**

> “Este conceito descreve como a Pessoa lidera, orienta, mobiliza ou desenvolve outras pessoas ou uma organização?”

**Exemplos:**

- Visão Estratégica;
- Delegação;
- Desenvolvimento de Pessoas;
- Formação de Times;
- Influência de Liderança;
- liderança multidisciplinar;
- mobilização de equipes;
- direcionamento;
- inspiração.

---

# 4. Regra canônica de classificação

## D-CLASS-01 — Classificação única principal

Cada conceito canônico deve possuir:

- exatamente um macrogrupo principal: `Hard Skill` ou `Soft Skill`;
- exatamente um subagrupador principal compatível com o macrogrupo.

Não apresentar ao administrador múltiplas classificações principais concorrentes para o mesmo conceito.

---

## D-CLASS-02 — Classificar pelo significado do conceito, não pela Pessoa

A classificação é propriedade do conceito canônico e não deve mudar de acordo com:

- a Pessoa;
- a vaga;
- a experiência em que apareceu;
- o nível de proficiência;
- o tipo de evidência disponível.

Exemplo:

`AWS` continua sendo `Hard Skill -> Tecnologias, Ferramentas e Equipamentos` para todas as Pessoas.

---

## D-CLASS-03 — Definição canônica governa casos ambíguos

A classificação deve considerar o significado canônico do conceito, e não apenas a palavra isolada.

Exemplo:

- `Planejamento Estratégico` -> Hard -> Gestão, Negócios e Estratégia;
- `Visão Estratégica` -> Soft -> Liderança;
- `Pensamento Estratégico` -> Soft -> Cognitivo-Executiva.

Quando a definição não permitir decisão segura, o conceito deve permanecer pendente de curadoria em vez de receber classificação inventada.

---

## D-CLASS-04 — Sem agrupador genérico “Outros” como escape automático

Não criar um agrupador principal genérico apenas para eliminar pendências.

Conceitos realmente ambíguos devem entrar em curadoria.

---

# 5. Qualificação da relação Pessoa × Conceito

A segunda dimensão não é taxonômica.

Ela descreve **qual evidência existe sobre o conhecimento e a aplicação daquela Pessoa**.

Os estados/naturezas abaixo podem coexistir.

---

## K1 — Declarado

**Significado:** a própria Pessoa afirma possuir o conhecimento/capacidade.

Fontes típicas:

- currículo;
- ATS;
- formulário preenchido pela própria Pessoa;
- perfil profissional declarado.

Exemplo:

`AWS` listado no currículo.

### Regra

Uma declaração não é verificação e não é evidência prática independente.

---

## K2 — Contextualizado

**Significado:** existe relato concreto de utilização daquele conceito em experiência, projeto, resultado ou responsabilidade descrita pela própria Pessoa.

Exemplo:

`SAP` aparece como competência e o currículo também descreve participação em migração ERP/SAP, operação logística e resultados associados.

### Regra

Contextualização aumenta a riqueza factual da declaração, mas continua sendo autorrelato quando a origem é o próprio currículo.

Portanto:

```text
Declarado + Contextualizado != Verificado
Declarado + Contextualizado != Habilidade Evidenciada
```

---

## K3 — Certificado

**Significado:** existe uma credencial/certificação válida relacionada ao conceito.

### Regra estrutural

Certificação **não é tipo de competência**.

Ela é uma credencial/evidência relacionada ao conceito.

Exemplo:

```text
Conceito: AWS
Classificação: Hard -> Tecnologias, Ferramentas e Equipamentos
Credencial: certificação AWS
Qualificação: Certificado
```

### Regra de segurança

Texto genérico como `certificações e cursos: X, Y, Z` não deve virar automaticamente `Certificado` se não for possível distinguir com segurança:

- qual item é certificação;
- qual é formação/curso;
- qual o emissor;
- qual a credencial;
- status/validade quando aplicável.

Nesses casos, preservar a credencial declarada e a pendência de confirmação sem promover o conceito para `Certificado`.

### Certificação × Assessment

Certificação não substitui o assessment Prisma.

Uma Pessoa pode possuir simultaneamente:

- Certificado;
- Verificado por assessment.

O Prisma não deve inferir equivalência automática entre certificação e resultado de assessment.

---

## K4 — Verificado por Assessment

**Significado:** o conhecimento foi diretamente avaliado por um assessment/teste do Prisma e o resultado atingiu o critério definido pela avaliação.

Exemplo:

```text
AWS
Declarado: sim
Contextualizado: sim
Certificado: sim
Verificado por assessment: sim
```

### Regra

O assessment verifica conhecimento no escopo, versão e data daquele instrumento.

Ele não comprova automaticamente aplicação profissional real.

O conceito `Verificado por Assessment` deve reutilizar, quando compatível, a infraestrutura vigente de M5.1/Evidência Demonstrada, sem criar um segundo motor de avaliação.

Mudança de nomenclatura/projeção não autoriza alterar:

- banco de itens;
- blueprint;
- convite;
- tentativa;
- correção;
- budgets;
- provider;
- política de geração de itens;
- segurança do M5.1,

salvo o mínimo estritamente necessário para projetar o resultado como `Conhecimento Verificado`.

---

## K5 — Habilidade Evidenciada

**Significado:** existe evidência de aplicação prática real daquele conhecimento/capacidade em contexto de trabalho, validada por fonte organizacional autorizada.

Exemplos futuros:

- resultado real de projeto;
- avaliação de gestor;
- registro organizacional de entrega;
- avaliação de desempenho;
- outros ritos aprovados de gestão.

### Regra fundamental

Currículo sozinho nunca cria `Habilidade Evidenciada`.

Assessment de conhecimento sozinho nunca cria `Habilidade Evidenciada`.

Certificação sozinha nunca cria `Habilidade Evidenciada`.

A habilidade evidenciada pertence ao universo de aplicação prática.

---

# 6. Evidências são acumulativas, não substitutivas

## D-EVID-01

A evolução não deve funcionar como uma máquina de estados destrutiva.

Exemplo válido:

```text
AWS
- Declarado
- Contextualizado
- Certificado
- Verificado por Assessment
- Habilidade Evidenciada
```

Todas as naturezas podem coexistir e manter:

- origem;
- evidência;
- data;
- método;
- versão;
- decisão humana quando aplicável.

Nenhuma nova evidência deve apagar a evidência anterior.

---

# 7. Regra específica para importação de currículo

## D-CV-01 — Limite máximo da importação

Ao importar somente um currículo, o Prisma pode criar ou relacionar:

- `Declarado`;
- `Contextualizado`;
- credenciais/certificações declaradas, respeitando as regras de validação.

A importação de currículo **não pode** gerar automaticamente:

- `Verificado por Assessment`;
- `Habilidade Evidenciada`.

---

## D-CV-02 — Contexto precisa de vínculo factual

Um conceito só deve receber contextualização quando houver evidência textual identificável relacionando-o a:

- experiência;
- projeto;
- responsabilidade;
- resultado;
- atividade concreta.

A mera repetição do termo em outra seção não basta.

---

## D-CV-03 — Ausência permanece neutra

Se não houver evidência para determinada natureza:

- não atribuir zero;
- não atribuir deficiência;
- não atribuir “não sabe”;
- não penalizar a Pessoa;
- não inventar estado negativo.

Usar linguagem neutra como:

- não avaliado;
- sem evidência disponível;
- não verificado;
- sem evidência prática registrada.

---

# 8. Exemplos canônicos para implementação e QA

Os exemplos abaixo são normativos para a regra de classificação, mas devem ser implementados em fixtures sintéticas sem PII.

| Conceito | Macrogrupo | Subagrupador |
|---|---|---|
| Microsoft Excel | Hard Skill | Tecnologias, Ferramentas e Equipamentos |
| SAP | Hard Skill | Tecnologias, Ferramentas e Equipamentos |
| AWS | Hard Skill | Tecnologias, Ferramentas e Equipamentos |
| Java | Hard Skill | Tecnologias, Ferramentas e Equipamentos |
| HPLC | Hard Skill | Tecnologias, Ferramentas e Equipamentos |
| Cibersegurança | Hard Skill | Domínios e Especialidades Profissionais |
| Engenharia de Processos | Hard Skill | Domínios e Especialidades Profissionais |
| Inteligência Artificial | Hard Skill | Domínios e Especialidades Profissionais |
| Scrum | Hard Skill | Métodos, Processos e Padrões |
| ITIL | Hard Skill | Métodos, Processos e Padrões |
| HAZOP | Hard Skill | Métodos, Processos e Padrões |
| ISO 27001 | Hard Skill | Métodos, Processos e Padrões |
| Gestão de Projetos | Hard Skill | Gestão, Negócios e Estratégia |
| Transformação Digital | Hard Skill | Gestão, Negócios e Estratégia |
| Gestão Financeira | Hard Skill | Gestão, Negócios e Estratégia |
| Gestão de Operações | Hard Skill | Gestão, Negócios e Estratégia |
| Planejamento Estratégico | Hard Skill | Gestão, Negócios e Estratégia |
| Inglês | Hard Skill | Idiomas |
| Comunicação | Soft Skill | Interpessoais |
| Negociação | Soft Skill | Interpessoais |
| Gestão de Conflitos | Soft Skill | Interpessoais |
| Resiliência | Soft Skill | Intrapessoais |
| Adaptabilidade | Soft Skill | Intrapessoais |
| Autocontrole | Soft Skill | Intrapessoais |
| Resolução de Problemas | Soft Skill | Cognitivo-Executivas |
| Pensamento Crítico | Soft Skill | Cognitivo-Executivas |
| Pensamento Estratégico | Soft Skill | Cognitivo-Executivas |
| Visão Estratégica | Soft Skill | Liderança |
| Delegação | Soft Skill | Liderança |
| Desenvolvimento de Pessoas | Soft Skill | Liderança |
| Liderança Multidisciplinar | Soft Skill | Liderança |

---

# 9. Compatibilidade com a Knowledge existente

## D-KNOW-01

A nova estrutura deve reutilizar a identidade canônica existente em `knowledge_concepts`/Professional Concept quando ela for válida.

Não criar uma segunda identidade canônica para:

- AWS;
- SAP;
- Comunicação;
- Gestão de Projetos;
- ou qualquer outro conceito já existente,

apenas para suportar a nova classificação.

---

## D-KNOW-02 — Separar tipo nativo/origem de classificação Prisma

Tipos e classificações provenientes de fontes externas, contratos históricos ou estrutura interna existente não devem ser destruídos apenas porque o agrupamento de apresentação mudou.

A nova classificação `Hard/Soft + subagrupador` é uma semântica Prisma de organização profissional.

Quando necessário, preservar separadamente:

- tipo nativo da fonte;
- identidade da fonte;
- mapping;
- versão;
- proveniência;
- classificação Prisma.

---

## D-KNOW-03 — Não misturar ocupação com competência

Taxonomia ocupacional e taxonomia de competências continuam domínios separados.

Relações ocupação -> competência podem existir, mas não:

- classificam uma Pessoa;
- criam evidência;
- criam requisito automaticamente;
- provam que a Pessoa possui a competência.

---

# 10. Aplicação na interface de administração

## D-UX-01

O fluxo de criar/associar um conceito de competência não deve exigir que o administrador escolha entre os seis agrupadores legados como decisão principal.

A classificação principal deve utilizar:

1. Hard Skill / Soft Skill;
2. subagrupador compatível.

---

## D-UX-02

A interface deve tornar a classificação compreensível por meio de:

- nome do macrogrupo;
- nome do subagrupador;
- definição curta;
- exemplos;
- regra/pergunta de classificação.

O administrador não deve precisar conhecer a implementação da Knowledge ou nomes técnicos internos.

---

## D-UX-03 — Compatibilidade entre macrogrupo e subagrupador

A UI e o backend devem impedir combinações inválidas.

Exemplo proibido:

```text
Soft Skill -> Tecnologias, Ferramentas e Equipamentos
```

---

## D-UX-04 — Classificação existente

Conceitos já existentes devem ser apresentados na nova organização quando houver classificação segura.

Ambiguidade real deve permanecer pendente de curadoria.

Não reclassificar silenciosamente por similaridade lexical.

---

# 11. Impacto em Pessoa e Perfil

## D-PER-01

O Perfil deve ser capaz de apresentar a competência pela nova estrutura:

```text
Macrogrupo -> Subagrupador -> Conceito
```

 e, separadamente, as naturezas de evidência existentes para a Pessoa.

---

## D-PER-02

Exemplo esperado:

```text
AWS
Hard Skill
Tecnologias, Ferramentas e Equipamentos

Evidências:
- Declarado
- Contextualizado
- Certificado
- Verificado por Assessment
- Habilidade Evidenciada
```

Apenas as naturezas realmente sustentadas devem aparecer.

---

## D-PER-03

A classificação taxonômica nunca deve ser mostrada como evidência de que a Pessoa possui a competência.

---

# 12. Aplicação futura em inteligência de pessoas

A estrutura deve ser compatível com futura leitura de trajetória:

- técnica;
- gestão;
- híbrida;

 e com futuras funcionalidades de:

- desenvolvimento;
- inteligência de pessoas;
- sucessão;
- readiness;
- planejamento de talentos.

## Importante

M8 **não autoriza automaticamente** implementar:

- score Técnica × Gestão;
- classificação automática de trajetória;
- 9-Box;
- sucessão;
- readiness;
- PDI;
- gap de execução;
- recomendação automática de carreira.

Essas capacidades exigem contratos próprios.

O M8 apenas deve evitar decisões de arquitetura que impeçam essas evoluções.

---

# 13. DEVE

### Estrutura

- **D-01** — Substituir a organização operacional principal baseada em `Habilidades / Competências / Conhecimentos / Tecnologia e Ferramentas / Métodos e Práticas / Certificações` pela classificação `Hard Skills / Soft Skills` com subagrupadores.
- **D-02** — Hard Skills possuem exatamente os cinco subagrupadores definidos neste contrato.
- **D-03** — Soft Skills possuem exatamente os quatro subagrupadores definidos neste contrato.
- **D-04** — Cada conceito possui um único macrogrupo e um único subagrupador principal.
- **D-05** — Casos ambíguos não são classificados automaticamente.
- **D-06** — Certificação deixa de ser agrupador principal de competência e passa a ser credencial/evidência relacionada ao conceito.
- **D-07** — Classificação do conceito e qualificação da evidência da Pessoa são dimensões distintas.
- **D-08** — Evidências são acumulativas e não destrutivas.
- **D-09** — Importação de currículo pode produzir declaração e contextualização, mas nunca assessment verificado ou habilidade prática evidenciada.
- **D-10** — Assessment Prisma qualifica conhecimento como `Verificado por Assessment`, sem equivaler automaticamente a habilidade prática.
- **D-11** — Habilidade Evidenciada exige aplicação profissional real sustentada por evidência organizacional autorizada.
- **D-12** — Ausência de evidência permanece neutra.
- **D-13** — Preservar proveniência, método, versão e origem de cada evidência.
- **D-14** — Reutilizar identidades canônicas e Knowledge existentes.
- **D-15** — Preservar compatibilidade histórica e tipos nativos/fontes quando necessários.
- **D-16** — Taxonomia ocupacional continua separada da Taxonomia de Competências.
- **D-17** — Backend e UI devem impedir combinações inválidas de macrogrupo/subagrupador.
- **D-18** — O operador deve compreender a classificação sem depender de terminologia técnica interna.
- **D-19** — M5.1 deve ser reutilizado para assessment quando compatível; não criar motor paralelo.
- **D-20** — O novo modelo deve ser genérico para diferentes setores, incluindo tecnologia, indústria, serviços, varejo, finanças, saúde e indústria química, sem criar agrupadores setoriais de primeiro nível.

---

# 14. PROIBIDO

- **P-01** — Não usar `Certificações` como família principal de competência.
- **P-02** — Não misturar natureza do conceito com tipo de evidência.
- **P-03** — Não criar conceito duplicado para representar `declarado`, `certificado`, `verificado` ou `evidenciado`.
- **P-04** — Não transformar autorrelato de currículo em Habilidade Evidenciada.
- **P-05** — Não transformar contexto do próprio currículo em verificação independente.
- **P-06** — Não transformar certificação em assessment Prisma.
- **P-07** — Não transformar assessment em evidência automática de performance real.
- **P-08** — Não usar ausência como zero, deficiência ou incapacidade.
- **P-09** — Não introduzir score, ranking ou nível de domínio sem contrato específico.
- **P-10** — Não classificar por simples igualdade de rótulo quando houver ambiguidade semântica.
- **P-11** — Não destruir tipo nativo, origem, mapping ou versão de fonte externa por causa da nova classificação Prisma.
- **P-12** — Não alterar fórmula de matching ou Prisma Score como efeito colateral.
- **P-13** — Não criar nova taxonomia ocupacional.
- **P-14** — Não criar nova fonte externa, API, provider ou modelo de IA sem decisão específica.
- **P-15** — Não implementar sucessão, PDI, 9-Box ou gap de execução dentro deste movimento.
- **P-16** — Não usar dados reais/PII de currículos como fixture versionada de QA.

---

# 15. FORA DE ESCOPO

- **F-01** — Fórmula de score Técnica × Gestão.
- **F-02** — Classificação automática de trajetória em Técnica / Híbrida / Gestão.
- **F-03** — 9-Box.
- **F-04** — Succession Readiness.
- **F-05** — Plano de Desenvolvimento Individual.
- **F-06** — Fórmula de Gap de Execução.
- **F-07** — Novo motor de assessment.
- **F-08** — Novo fluxo de feedback 360°.
- **F-09** — Novo fluxo de 1-on-1.
- **F-10** — Nova avaliação de desempenho.
- **F-11** — Verificação externa automática de certificações.
- **F-12** — Mudança de matching, Prisma Score ou grupos A/B/C.
- **F-13** — Mudança no parser/OCR além do necessário para preservar os conceitos já extraídos.
- **F-14** — Implementação de Lominger como taxonomia do Prisma.

---

# 16. AUTONOMIA TÉCNICA

- **A-01** — Codex pode escolher nomes físicos de campos/tabelas/contratos, preservando a semântica deste Agreement.
- **A-02** — Pode decidir entre projeção, coluna adicional, relação taxonômica ou estrutura equivalente, desde que não duplique identidade canônica.
- **A-03** — Pode preservar tipos legados internamente e projetar a nova classificação na UI.
- **A-04** — Pode definir estratégia de migração/backfill não destrutiva para conceitos já classificados.
- **A-05** — Pode criar índices e queries necessários.
- **A-06** — Pode ajustar componentes de UX já existentes sem redesenhar superfícies fora do escopo.
- **A-07** — Pode reutilizar estruturas M7.2/M7.4 e M5.1 quando tecnicamente compatíveis.
- **A-08** — Pode definir microcopy final em pt-BR, preservando exatamente o significado dos termos acordados.
- **A-09** — Pode criar fixtures sintéticas equivalentes aos exemplos deste contrato.
- **A-10** — Pode manter nomenclaturas técnicas legadas para compatibilidade, desde que elas deixem de determinar a classificação operacional apresentada ao usuário.

---

# 17. PENDENTES

**Q-01 — Nenhuma pendência material de produto conhecida no momento.**

Se durante a inspeção do repositório o Codex descobrir que algum dos seis agrupadores atuais possui significado persistido necessário para integração externa, fonte oficial ou contrato histórico, isso **não autoriza destruí-lo**.

Nesse caso:

1. preservar o dado técnico legado;
2. implementar a nova classificação Prisma em camada compatível;
3. registrar a compatibilidade;
4. somente abrir nova Q-* se houver conflito real que altere comportamento de produto acordado neste contrato.

---

# 18. CRITÉRIOS DE ACEITE

### Classificação

- **CA-01** — `Microsoft Excel` é classificado como `Hard Skill -> Tecnologias, Ferramentas e Equipamentos`.
- **CA-02** — `Gestão de Projetos` é classificado como `Hard Skill -> Gestão, Negócios e Estratégia`.
- **CA-03** — `Comunicação` é classificada como `Soft Skill -> Interpessoais`.
- **CA-04** — `Resiliência` é classificada como `Soft Skill -> Intrapessoais`.
- **CA-05** — `Resolução de Problemas` é classificada como `Soft Skill -> Cognitivo-Executivas`.
- **CA-06** — `Visão Estratégica` é classificada como `Soft Skill -> Liderança`.
- **CA-07** — `Planejamento Estratégico` é classificado como `Hard Skill -> Gestão, Negócios e Estratégia`.
- **CA-08** — `SAP` e `HPLC` entram no mesmo subagrupador estrutural, demonstrando neutralidade setorial da taxonomia.

### Evidência

- **CA-09** — Currículo contendo apenas `AWS` cria no máximo declaração.
- **CA-10** — Currículo contendo `AWS` e uma experiência concreta com AWS pode registrar declaração + contextualização.
- **CA-11** — Nenhum currículo isolado produz `Habilidade Evidenciada`.
- **CA-12** — Resultado direto de assessment compatível pode projetar `Verificado por Assessment`.
- **CA-13** — Assessment não cria automaticamente `Habilidade Evidenciada`.
- **CA-14** — Certificação e assessment podem coexistir.
- **CA-15** — Ausência de assessment aparece de forma neutra e não como nota zero.
- **CA-16** — Nova evidência não apaga declaração, contexto, certificação ou evidência anterior.

### Knowledge e compatibilidade

- **CA-17** — Um conceito canônico já existente não é duplicado apenas por causa da nova estrutura.
- **CA-18** — Tipos/mappings nativos de fontes continuam recuperáveis.
- **CA-19** — Taxonomia ocupacional permanece semanticamente independente.
- **CA-20** — Ambiguidade de classificação não gera associação automática.
- **CA-21** — Conceitos existentes podem ser projetados na nova estrutura sem reimportar currículo.
- **CA-22** — Histórico de Perfil e evidência não é reescrito destrutivamente.

### UX e autorização

- **CA-23** — O administrador não precisa escolher entre os seis agrupadores antigos como classificação principal.
- **CA-24** — A UI impede macrogrupo/subagrupador incompatível.
- **CA-25** — Definição e exemplos tornam a decisão operacional compreensível.
- **CA-26** — RLS, tenant scope e autoridade existente permanecem.
- **CA-27** — Nenhum dado cross-tenant é exposto pela nova classificação.

### Regressão

- **CA-28** — Matching e Prisma Score mantêm comportamento semântico vigente.
- **CA-29** — M5.1 continua funcional nos fluxos existentes.
- **CA-30** — Perfil vigente permanece legível durante compatibilidade/migração.
- **CA-31** — Testes usam dados sintéticos, não o currículo real fornecido na discussão.

---

# 19. Superfícies que o Codex deve inspecionar antes de implementar

O Execution Prompt futuro deverá mandar o Codex localizar e ler apenas os owners e código diretamente envolvidos, incluindo, conforme existirem no baseline real:

- `AGENTS.md`;
- seção pertinente de `docs/ai-context/PRISMA_CURRENT_STATE.md`;
- `docs/architecture/contracts.md`;
- owners de Professional Concept / Knowledge;
- owners de Perfil Profissional;
- Agreement/Execution/AoT vigentes de M7.2 e M7.4;
- ADR vigente da Taxonomia Profissional/Competências;
- owners do M5.1 para o mapeamento de assessment;
- migrations/RPCs que persistem ou projetam `knowledge_concepts`;
- backend de busca/curadoria de conceitos;
- UI de criação/associação/curadoria de competência;
- UI de Perfil/Competências;
- testes diretamente relacionados.

O Codex deve confirmar no código e nas migrations:

1. onde os seis agrupadores legados são persistidos ou derivados;
2. quais são apenas apresentação;
3. quais são necessários para fontes externas;
4. quais consumidores dependem deles;
5. se existe enum, constraint, RPC, índice ou contrato que precise de compatibilidade.

Não assumir que documentação prova implementação.

---

# 20. Resultado esperado do M8

Ao final do movimento, o Prisma deve possuir uma linguagem de competências simples para o operador e robusta para evolução futura:

```text
CONCEITO
  -> Hard Skill ou Soft Skill
      -> Subagrupador
```

separada de:

```text
PESSOA x CONCEITO
  -> Declarado
  -> Contextualizado
  -> Certificado
  -> Verificado por Assessment
  -> Habilidade Evidenciada
```

O modelo deve permitir responder perguntas diferentes sem misturá-las:

- **O que é esta competência?** -> classificação taxonômica.
- **A Pessoa diz possuir?** -> declarado.
- **Há contexto profissional relatado?** -> contextualizado.
- **Há credencial?** -> certificado.
- **O conhecimento foi testado?** -> verificado por assessment.
- **A aplicação real foi comprovada no trabalho?** -> habilidade evidenciada.

Essa separação é a fundação aprovada para futuras capacidades de Talent Intelligence, gestão de pessoas e sucessão, sem implementar essas funcionalidades antecipadamente.
