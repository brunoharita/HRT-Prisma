# Prompt Mestre — M8.1 — Migração Sistêmica da Arquitetura de Competências e Limpeza Controlada da Base

**Revisão de execução:** 1.1.1, decisões supervenientes do Product Owner em 2026-09-20. Ler integralmente `docs/agreements/agreement-m8-redefinicao-agrupamento-competencias.md` e `docs/agreements/AGREEMENT_M8.1_FINAL.md` v1.1.1 antes de implementar. Esta revisão prevalece nas regras físicas e visuais abaixo sobre referências anteriores deste prompt.

**Decisões de execução posteriores:** incluir exclusivamente `[QA] Marina Dados` no conjunto de Pessoas de teste a excluir após preflight/preview, conforme confirmação individual do Product Owner; preservar a outra Pessoa sem origem de currículo comprovada. Concluir a fidelidade estrutural das nove telas de referência antes do deploy do frontend. Esses pontos atualizam a evidência de D-14/D-15/CA-23 e reiteram D-30/CA-40; não dispensam os demais critérios.

## Adendo vinculante: definições em tabelas e alcance

- Persistir os dois macrogrupos e os nove subagrupadores aprovados em tabelas próprias do PostgreSQL, com vínculo referencial entre eles e com a classificação principal do conceito canônico em `knowledge_concepts`.
- O macrogrupo do conceito decorre do seu único subagrupador principal; conceitos pendentes não recebem classificação inventada.
- Conceitos Globais usam somente subagrupadores Globais. Um subagrupador futuro de organização só pode classificar conceitos da mesma organização; conceitos de organização podem usar subagrupadores Globais. Provar as negações por FK/constraint/RPC e RLS, sem confiar apenas na UI.
- Preparar a representação isolada por organização. Cadastro e edição de subagrupadores por usuários ficam fora do M8.1.
- Incluir D-31 a D-33, P-24 a P-25, F-14 e CA-38 a CA-40 do Agreement M8.1 v1.1.0 no AoT.

## Adendo vinculante: referência visual

A imagem composta de nove telas enviada pelo Product Owner, preservada em `docs/assets/m81-nine-screen-reference.png` (SHA-256 `f7b586ccaa224d3d9bc146827e64822c6b43fb0d58d014a1e576feadbcb3f681`), substitui as três imagens mencionadas na seção 10 abaixo. As nove composições são referências normativas de arquitetura visual para as superfícies diretamente alteradas. Conteúdo, nomes e contagens são ilustrativos. Preservar topologia, hierarquia, agrupamentos, densidade, ordem da informação, posição relativa das ações e estados mostrados, ajustando à aplicação real e à acessibilidade. Comparar implementação e imagem com estado, dados e viewport equivalentes; registrar no AoT qualquer divergência estrutural.

0. Autoridade, natureza e objetivo

Você está executando o M8.1 — Migração Sistêmica da Arquitetura de Competências e Limpeza Controlada da Base no repositório oficial do Prisma.

Este é um movimento material, arquitetural, de dados, segurança e UX, com ação destrutiva aprovada sobre dados de teste derivados de importações de currículos. Trate-o como mudança de alto risco.

A autoridade de produto é:

decisão explícita mais recente do Product Owner;

Agreement Contract M8 v1.0.0;

Agreement Contract M8.1 v1.0.0;

este Execution Prompt;

contratos/ADRs vigentes do Prisma;

arquitetura e implementação atual.

Não reinterprete requisitos para “simplificar” o movimento. Otimize o como, não o quê.

Objetivo final

Ao terminar, o Prisma deve:

operar com a nova arquitetura de competências M8;

não usar mais os seis agrupadores legados como classificação operacional principal;

manter Taxonomia Ocupacional e Knowledge institucional;

ter removido de forma controlada os dados atuais derivados das importações de currículos conforme este prompt;

preservar Usuários, Auth, organizações, memberships e autoridade;

preservar especificamente a usabilidade e autoridade de harita.super;

estar publicado no backend remoto atual e frontend hospedado;

conseguir importar novamente um currículo sintético e produzir Perfil/competências sob a nova arquitetura;

possuir AoT completo, rastreando requisito -> implementação -> teste -> evidência.

1. Contrato congelado

Implemente integralmente os requisitos abaixo. Eles correspondem ao Agreement aprovado e são vinculantes.

1.1 Nova arquitetura taxonômica

Macrogrupos

Apenas:

Hard Skill

Soft Skill

Hard Skills — subagrupadores

Domínios e Especialidades Profissionais

Tecnologias, Ferramentas e Equipamentos

Métodos, Processos e Padrões

Gestão, Negócios e Estratégia

Idiomas

Soft Skills — subagrupadores

Interpessoais

Intrapessoais

Cognitivo-Executivas

Liderança

Regra

Cada conceito de competência deve possuir um único macrogrupo principal e um único subagrupador principal.

A classificação pertence ao conceito canônico. Não muda por Pessoa, vaga, experiência, assessment ou origem da evidência.

Relações adicionais podem existir na Knowledge, mas não podem criar múltiplas classificações principais na UX.

1.2 Definições normativas dos subagrupadores

Hard > Domínios e Especialidades Profissionais

Campo técnico/profissional que exige domínio de conhecimento.

Exemplos:

Arquitetura de Software;

Cibersegurança;

Engenharia de Processos;

Contabilidade;

Logística;

Supply Chain;

Business Intelligence;

Data Science;

Inteligência Artificial;

Segurança da Informação.

Pergunta operacional:

Este conceito é uma área, disciplina ou especialidade profissional que precisa ser dominada?

Hard > Tecnologias, Ferramentas e Equipamentos

Produto, plataforma, sistema, linguagem, tecnologia, ferramenta ou equipamento concreto.

Exemplos:

Microsoft Excel;

SAP;

SAP EWM;

AWS;

Java;

Power BI;

Salesforce;

SQL;

n8n;

Supabase;

HPLC;

espectrômetro;

LIMS;

KNAPP.

Pergunta operacional:

Este conceito é algo específico que a Pessoa usa, opera, configura, programa ou manipula?

Linguagens de programação ficam aqui. Idiomas humanos não.

Hard > Métodos, Processos e Padrões

Método, framework, prática estruturada, norma, padrão ou forma organizada/repetível de trabalhar.

Exemplos:

Scrum;

Kanban;

Lean;

Six Sigma;

ITIL;

BPM;

BPMN;

PDCA;

HAZOP;

ISO 27001;

ISO 17025;

Design Thinking;

As-Is/To-Be.

Pergunta operacional:

Este conceito representa uma forma estruturada, normatizada ou repetível de realizar trabalho?

Hard > Gestão, Negócios e Estratégia

Conhecimentos/capacidades estruturadas para administrar projetos, operações, processos, recursos, portfólio, negócio ou estratégia.

Exemplos:

Gestão de Projetos;

Gestão de Programas;

PMO;

Gestão Financeira;

Gestão de Operações;

Gestão de Processos;

Gestão da Mudança;

Transformação Digital;

Planejamento Estratégico;

Gestão de Portfólio;

Gestão de Produto;

Gestão de Riscos;

Gestão de Stakeholders;

Gestão de Fornecedores;

Gestão de Capacidade;

Gestão de Prioridades;

Governança de Tecnologia;

Excelência Operacional.

Pergunta operacional:

Este conceito representa saber estruturar ou executar gestão, negócio, operação ou estratégia?

Gestão × Liderança

Planejamento Estratégico -> Hard > Gestão, Negócios e Estratégia.

Visão Estratégica -> Soft > Liderança.

Pensamento Estratégico -> Soft > Cognitivo-Executivas.

Desenvolvimento de Pessoas -> Soft > Liderança.

Não misture disciplina de gestão com comportamento de liderança.

Hard > Idiomas

Idiomas humanos utilizados profissionalmente.

Exemplos:

Português;

Inglês;

Espanhol;

Alemão;

Japonês.

Proficiência declarada não vira verificação.

Soft > Interpessoais

Como a Pessoa se comunica, coopera, negocia e se relaciona.

Exemplos:

Comunicação;

Comunicação Executiva;

Negociação;

Colaboração;

Escuta;

Gestão de Conflitos.

Soft > Intrapessoais

Como a Pessoa administra a si própria.

Exemplos:

Resiliência;

Adaptabilidade;

Autocontrole;

Autoconhecimento;

Disciplina;

Perseverança.

Soft > Cognitivo-Executivas

Como a Pessoa pensa, analisa, decide, organiza mentalmente e resolve.

Exemplos:

Resolução de Problemas;

Pensamento Crítico;

Criatividade;

Tomada de Decisão;

Pensamento Analítico;

Pensamento Estratégico;

raciocínio sistêmico.

Soft > Liderança

Como a Pessoa mobiliza, orienta, desenvolve, influencia ou direciona pessoas/organização.

Exemplos:

Visão Estratégica;

Delegação;

Desenvolvimento de Pessoas;

Formação de Times;

Liderança Multidisciplinar;

mobilização de equipes;

inspiração.

2. Segunda dimensão: relação Pessoa × Conceito

A taxonomia responde o que o conceito é.

A relação Pessoa × Conceito responde o que sabemos sobre a relação daquela Pessoa com o conceito.

As naturezas abaixo são acumulativas e independentes:

Declarado

Contextualizado

Certificado

Verificado por Assessment

Habilidade Evidenciada

Nunca crie cinco conceitos diferentes.

Exemplo:

AWS
Hard Skill
Tecnologias, Ferramentas e Equipamentos

Pessoa X:
- Declarado
- Contextualizado
- Certificado
- Verificado por Assessment
- Habilidade Evidenciada

Cada natureza deve manter, quando aplicável:

evidência;

origem;

método;

data;

versão;

decisão humana;

vínculo documental/assessment.

2.1 Declarado

Autorrelato explícito.

Exemplos de origem:

currículo;

ATS;

formulário preenchido pela Pessoa.

Não é verificação.

2.2 Contextualizado

Existe relato concreto ligando o conceito a experiência, projeto, responsabilidade ou resultado.

Exemplo:

SAP listado nas competências + experiência narrando participação em migração SAP.

Se a fonte é o próprio currículo, continua autorrelato.

Portanto:

Declarado + Contextualizado != Verificado
Declarado + Contextualizado != Habilidade Evidenciada

2.3 Certificado

Existe credencial/certificação relacionada ao conceito.

Certificação deixa de ser tipo de conceito.

Certificação e assessment são naturezas diferentes e podem coexistir.

Não promova automaticamente Certificado quando um texto mistura genericamente cursos e certificações sem permitir identificar com segurança qual item é credencial.

Preserve a credencial declarada e a pendência quando necessário.

2.4 Verificado por Assessment

Conhecimento diretamente avaliado por assessment do Prisma com resultado suficiente conforme contrato do instrumento.

Reutilize a infraestrutura M5.1 existente quando compatível.

Não crie segundo motor de assessment.

Não altere Item Bank, geração externa, budget, provider, correção ou segurança do M5.1 além do mínimo necessário para projetar semanticamente o resultado como Verificado por Assessment.

Assessment não gera Habilidade Evidenciada.

2.5 Habilidade Evidenciada

Aplicação profissional real sustentada por evidência organizacional autorizada.

Pode ser suportada futuramente por:

projeto real;

avaliação de gestor;

avaliação de desempenho;

rito organizacional aprovado;

fonte interna comprovável.

Neste M8.1, crie suporte contratual/representacional apenas na medida necessária à arquitetura.

Não invente produtor automático de Habilidade Evidenciada.

Currículo, certificação e assessment isolados nunca geram esse estado.

3. O que deve deixar de existir operacionalmente

Os seguintes agrupadores não podem continuar governando a criação, associação, curadoria ou apresentação principal das competências:

Habilidades;

Competências;

Conhecimentos;

Tecnologia e Ferramentas;

Métodos e Práticas;

Certificações.

3.1 Faça inventário sistêmico

Antes de alterar, procure todos os usos reais desses tipos em:

schema;

migrations;

enums;

constraints;

TypeScript;

domain contracts;

RPCs;

SQL;

Edge Functions;

Knowledge;

normalização;

pesquisa;

curadoria;

formulário de criação;

filtros;

Perfil;

Vagas/Posições;

matching;

Item Bank/verificação;

testes;

documentação.

Classifique cada uso como:

governança operacional a substituir;

metadado histórico a preservar;

tipo nativo de fonte externa a preservar;

compatibilidade temporária;

código morto a remover, se comprovado.

Não remova por busca textual cega.

3.2 Compatibilidade legada

Se um tipo antigo for necessário para:

leitura histórica;

identidade nativa de ESCO/O*NET/etc.;

contrato antigo;

rollback;

preserve-o tecnicamente.

Mas:

marque semanticamente como legado/nativo;

não o apresente como classificação M8;

não o use como fallback silencioso;

não permita que a nova criação dependa dele.

4. O que deve ser criado/alterado

4.1 Contrato de classificação M8

Implemente representação persistente ou projetada equivalente a:

macro_group: Hard/Soft;

subgroup: um dos nove valores;

versão da classificação;

proveniência/método da classificação quando relevante;

estado de classificação: classificado ou pendente/ambíguo.

Escolha nomes físicos após inspecionar o padrão do repositório.

Não duplique knowledge_concepts.id.

4.2 Integridade

Backend deve rejeitar combinações inválidas, por exemplo:

Soft -> Tecnologias;

Hard -> Liderança;

Hard/Soft sem subagrupador quando a classificação é declarada completa;

subagrupador desconhecido em versão ativa.

Versão desconhecida falha explicitamente.

4.3 Conceitos existentes

Para Knowledge institucional existente:

não reclassifique por mera semelhança lexical;

aplique backfill determinístico apenas quando a semântica existente/fonte/tipo tornar a conversão inequívoca;

mantenha demais conceitos como pendentes de classificação;

preserve sua utilidade conforme o contrato de busca/Knowledge sem fabricar categoria;

exponha pendência de forma administrável.

Exemplos de mapeamento seguro devem ser demonstrados por testes, não presumidos para toda a base.

4.4 Criação de conceito

A criação de novo conceito de competência por usuário autorizado deve exigir:

nome;

definição/descrição se o contrato vigente a suportar;

Hard/Soft;

subagrupador;

alcance/escopo conforme governança M7.7;

aliases/fontes conforme fluxo vigente.

Owner/Admin continuam seguindo a governança vigente de Knowledge da empresa/Global; M8.1 não muda autoridade de publicação.

4.5 Curadoria

Atualize a curadoria para mostrar:

termo observado;

conceito candidato;

macrogrupo;

subagrupador;

definição;

origem/escopo;

autoridade do alias;

classificação pendente quando aplicável.

Não pré-selecione uma categoria ambígua.

4.6 Perfil da Pessoa

A aba Competências deve organizar visualmente:

Hard Skills
  Domínios e Especialidades
  Tecnologias, Ferramentas e Equipamentos
  Métodos, Processos e Padrões
  Gestão, Negócios e Estratégia
  Idiomas

Soft Skills
  Interpessoais
  Intrapessoais
  Cognitivo-Executivas
  Liderança

Mostre somente subgrupos com conteúdo, salvo quando um estado vazio for útil à ação atual.

Para cada conceito, mostre as naturezas de evidência realmente presentes.

Não mostrar score, estrelas, barras, nível inventado ou “0”.

5. Regras da nova importação de currículo

Depois da migração/limpeza, uma nova importação deve:

preservar o pipeline vigente de identidade;

extrair fatos conforme contratos atuais;

resolver conceitos via Knowledge;

usar a classificação M8 do conceito;

registrar Declarado quando sustentado por declaração;

registrar Contextualizado apenas quando houver vínculo factual identificável com experiência/projeto/resultado;

preservar credenciais/certificações;

não criar Verificado por Assessment;

não criar Habilidade Evidenciada.

A mera repetição do termo em outra seção não basta para contextualização.

Não introduza novo provider/LLM para cumprir isso. Reutilize evidência e estruturas existentes. Se um contexto não puder ser vinculado com segurança pelo pipeline atual, deixe de contextualizar e preserve a declaração.

6. Limpeza destrutiva aprovada

A limpeza é parte obrigatória deste movimento.

6.1 Princípio

Remover os dados atuais gerados pelas importações de currículos de teste para que o próximo ciclo de validação comece coerente com M8.

Não equivale a resetar a plataforma.

6.2 Pré-condições obrigatórias

Antes de qualquer DELETE:

verificar Git status e baseline;

identificar ambiente remoto ativo;

capturar versão/SHA/runtime atual;

gerar snapshot/backup técnico recuperável do banco e, se aplicável, inventário de objetos Storage;

confirmar harita.super server-side:

Auth existente;

platform_user;

status ativo;

papel Super Admin;

memberships;

organizações;

inventariar Pessoas e sua origem/proveniência;

construir grafo real de dependências/FKs/RPCs/cascatas;

contar registros por tabela/owner no escopo da limpeza;

determinar Knowledge exclusiva vs. compartilhada/independente;

preparar rollback antes da primeira ação destrutiva.

Não registrar secrets, senha ou tokens.

6.3 Pessoas originadas por currículo

Decisão do Product Owner: excluir integralmente.

Para toda Pessoa cuja origem comprovada seja criação a partir de currículo/intake:

excluir Pessoa;

private data;

resume intake;

documentos;

Storage;

tentativas;

page extractions;

drafts;

evidence regions;

reviews/revisions/changes;

Perfil publicado;

profile competencies;

evidence;

inferences;

Knowledge observations;

ingestion events;

adaptive-learning data;

assessments;

demonstrated evidence;

matching;

demais descendentes reais.

A lista acima é orientativa. Use o schema real para completar.

6.4 Pessoa manual/preexistente com currículo posterior

Se a Pessoa existir independentemente da importação:

preserve a Pessoa;

preserve dados manuais independentes;

remova somente artefatos/fatos/evidências cuja proveniência seja o currículo no escopo da limpeza.

Se não for possível distinguir proveniência com segurança, não apague por aproximação. Registre bloqueio específico no AoT.

6.5 Pessoa homônima do Usuário harita.super

Usuário e Pessoa são agregados diferentes.

Se houver uma Pessoa Bruno originada por currículo:

apague a Pessoa conforme regra normal;

preserve integralmente o Usuário harita.super.

Proibido correlacionar e apagar Auth pelo mesmo e-mail/nome.

6.6 Knowledge derivada

Decisão do Product Owner: opção C.

Remova toda evolução de Knowledge que seja rastreável exclusivamente aos currículos de teste apagados, inclusive quando aplicável:

knowledge observations;

knowledge inbox;

aliases humanos;

conceitos Organization-owned;

propostas pendentes;

contribuições Global não incorporadas;

change/proposal artifacts;

demais derivados descobertos.

Preservar obrigatoriamente

CBO;

ESCO;

O*NET;

source versions oficiais;

conceitos/aliases com proveniência independente;

Knowledge institucional não dependente dos currículos apagados;

decisões que tenham origem manual/institucional independente.

Não use “foi criado depois de um currículo” como prova de exclusividade. Prove proveniência.

6.7 Assessments e matching

Para Pessoas excluídas, remova tudo que depende delas:

verification needs;

invitations;

attempts;

question instances vinculadas à tentativa quando exclusivas;

responses;

browser/attempt events;

metrics;

evaluations;

demonstrated evidence;

match evaluations;

caches/derivações pessoais.

Não delete Item Bank global/organizacional reutilizável apenas porque foi usado por uma Pessoa removida.

6.8 Vagas e Posições

Preserve Vagas e Posições.

Remova referências às Pessoas apagadas.

Se houver ocupante em Posição:

use a transição canônica existente para remover o ocupante;

preserve a Posição;

não invente novo status;

mantenha snapshot/histórico da Posição conforme contrato.

Matching histórico dependente das Pessoas apagadas deve sair conforme regra 6.7.

6.9 Storage

Remova objetos privados dos currículos apagados.

Não:

apague bucket;

altere policy além do necessário;

deixe arquivo órfão;

deixe banco apontando para objeto removido.

6.10 Auditoria e histórico da limpeza

Decisão do Product Owner: não preservar ledger específico da limpeza.

Portanto:

não crie tabela/ledger de cleanup;

não crie registros pessoais apenas para dizer que foram apagados;

remova registros históricos exclusivamente dependentes das Pessoas/currículos apagados quando a arquitetura permitir;

o AoT deve registrar apenas:

contagens agregadas;

tabelas/owners afetados;

validações;

SHA/release;

evidência de ausência;

sem PII.

Se houver auditoria imutável obrigatória que não possa ser apagada sem violar contrato estrutural:

não corrompa ou burle o mecanismo;

pare apenas a parte incompatível;

documente o conflito factual;

não declare CA correspondente como PASS.

7. Ordem segura recomendada de execução

Você pode adaptar a ordem por FK/arquitetura real, mas deve preservar estes gates.

Fase 0 — Understanding Check

Antes de mudar arquivos, declare de forma concisa:

D-* que implementará;

P-* que não podem ocorrer;

F-*;

A-*;

superfícies previstas.

Isso não é pedido de nova aprovação.

Fase 1 — Descoberta dirigida

Leia somente fontes necessárias:

AGENTS.md;

seção relevante de PRISMA_CURRENT_STATE.md;

docs/architecture/contracts.md;

Knowledge/Professional Concept owners;

Perfil/competências owners;

M7.2/M7.4/M7.5/M7.6/M7.7 agreements/executions/AoTs/ADRs aplicáveis;

M5.1 owners;

exclusão definitiva de Pessoa;

data model/security;

UX foundation;

migrations/RPCs/código afetado.

Confirme estado real em código/config/banco.

Fase 2 — Inventário da classificação antiga

Produza internamente uma matriz:

uso legado -> owner -> consumidor -> persistido? -> preservar? -> substituir? -> teste

Remova dependência operacional dos seis agrupadores antigos sem destruir metadado necessário.

Fase 3 — Contratos/schema M8

Implemente:

classificação Hard/Soft;

subagrupador;

constraints;

versão;

projeções/RPCs;

compatibilidade;

representação de evidências Pessoa × Conceito.

Prefira extensão da infraestrutura Knowledge atual.

Não crie catálogo paralelo.

Fase 4 — Curadoria e criação Knowledge

Atualize:

busca;

formulário de criação;

edição/curadoria;

filtros;

propostas/contribuições;

detalhe.

Mantenha governança de escopo e autoridade vigente.

Fase 5 — Perfil e evidências

Atualize projeção e UI para:

Hard/Soft;

subgrupos;

badges/naturezas de evidência;

detalhe explicável;

origem/documento/assessment quando aplicável.

Mantenha Declarado, Contextualizado, Certificado, Verificado por Assessment, Habilidade Evidenciada separados.

Fase 6 — Adequação do pipeline de importação

Garanta que novo currículo:

resolve conceito;

herda classificação do conceito;

cria evidência permitida;

não cria estados proibidos.

Fase 7 — Snapshot e plano destrutivo

Somente quando código/migrations de nova arquitetura estiverem prontos e validados localmente:

snapshot/backup;

inventário remoto final;

confirmação harita.super;

plano de delete por dependência;

dry-run/read-only counts.

Fase 8 — Migração remota

Aplique migrations necessárias antes da limpeza se isso for requisito para executar a limpeza de modo seguro.

Não use reset geral.

Fase 9 — Limpeza remota

Execute a deleção controlada.

Prefira transações/RPCs administrativas seguras e idempotência/reentrância quando o volume/Storage exigir.

Se reutilizar o contrato de exclusão definitiva de Pessoa:

confirme que ele cobre o objetivo;

não preserve ledger pessoal proibido por este Agreement;

adapte somente dentro do escopo aprovado.

Fase 10 — Provas de limpeza

Prove no banco e Storage:

Pessoas originadas por currículos = ausentes;

descendentes = ausentes;

objetos Storage = ausentes;

Knowledge exclusiva = ausente;

assessments/matches dependentes = ausentes;

CBO/ESCO/O*NET = preservados;

Users/orgs/memberships = preservados;

sem órfãos;

sem contagens residuais em UI.

Não exponha PII nos relatórios.

Fase 11 — Deploy frontend

Publique o frontend coerente com o schema/contratos novos.

Evite janela em que frontend antigo dependa de semântica removida. Use estratégia compatível/reversível.

Fase 12 — Smoke autenticado

Com harita.super, valide:

login;

sidebar/App Shell;

organização;

Pessoas;

Conhecimento;

Propostas/curadoria quando autorizadas;

Posições;

Vagas;

importação.

Depois faça um teste sintético end-to-end de currículo sem PII real versionada:

intake
-> identidade
-> processamento
-> revisão
-> publicação
-> Perfil
-> competências M8

Exclua o dado sintético após a prova, salvo se o ambiente possuir fixture temporária explicitamente destinada a smoke.

8. Casos canônicos de teste da taxonomia

Inclua testes determinísticos no mínimo para:

Conceito

Resultado

Microsoft Excel

Hard > Tecnologias, Ferramentas e Equipamentos

SAP

Hard > Tecnologias, Ferramentas e Equipamentos

AWS

Hard > Tecnologias, Ferramentas e Equipamentos

HPLC

Hard > Tecnologias, Ferramentas e Equipamentos

Cibersegurança

Hard > Domínios e Especialidades Profissionais

Engenharia de Processos

Hard > Domínios e Especialidades Profissionais

Scrum

Hard > Métodos, Processos e Padrões

HAZOP

Hard > Métodos, Processos e Padrões

Gestão de Projetos

Hard > Gestão, Negócios e Estratégia

Transformação Digital

Hard > Gestão, Negócios e Estratégia

Planejamento Estratégico

Hard > Gestão, Negócios e Estratégia

Inglês

Hard > Idiomas

Comunicação

Soft > Interpessoais

Resiliência

Soft > Intrapessoais

Resolução de Problemas

Soft > Cognitivo-Executivas

Pensamento Estratégico

Soft > Cognitivo-Executivas

Visão Estratégica

Soft > Liderança

Delegação

Soft > Liderança

Também prove que classificação ambígua não é inventada.

9. Casos canônicos de evidência

Caso A — apenas lista

Currículo contém:

AWS

Esperado:

conceito resolvido;

Hard > Tecnologia/Ferramentas/Equipamentos;

Declarado;

não Contextualizado sem vínculo concreto;

não Certificado;

não Verificado;

não Habilidade Evidenciada.

Caso B — contexto

Currículo contém SAP e experiência concreta em projeto SAP.

Esperado:

Declarado;

Contextualizado;

não Verificado;

não Habilidade Evidenciada.

Caso C — certificação

Currículo apresenta certificação identificável relacionada ao conceito.

Esperado:

credencial preservada;

Certificado somente se a identidade da certificação estiver suficientemente sustentada;

não Verificado automaticamente.

Caso D — assessment

Assessment M5.1 válido.

Esperado:

Verificado por Assessment;

manter declaração/contexto/certificação preexistentes;

não criar Habilidade Evidenciada.

10. Telas normativas anexadas

Este prompt será entregue ao Codex junto das imagens M8.1.

Classifique-as como alvos normativos de arquitetura visual, conforme docs/product/ux-foundation.md.

Os dados, nomes e contagens são ilustrativos; a estrutura visual é normativa.

Imagem 1 — Conhecimento / Competências / Classificação

Deve orientar:

shell Prisma vigente;

busca/lista à esquerda/centro;

detalhe/edição à direita;

seleção Hard/Soft;

subagrupador dependente do macrogrupo;

definição curta;

exemplos;

origem/escopo;

estado de classificação;

ausência dos seis agrupadores legados como decisão principal.

Imagem 2 — Perfil da Pessoa / Competências M8

Deve orientar:

resumo executivo;

Hard Skills e Soft Skills como grandes blocos;

subagrupos internos;

conceitos;

chips de evidência;

pendências reais;

busca/filtros sem poluição técnica;

sem score/estrelas/barras.

Imagem 3 — Detalhe de competência e evidências

Deve orientar:

conceito;

classificação;

termo observado;

naturezas acumulativas de evidência;

origem;

documento/experiência;

certificação;

assessment;

habilidade prática quando existir;

linguagem neutra para o que ainda não existe.

Fidelidade visual

Compare a implementação com as imagens usando:

mesmo estado;

dados equivalentes;

viewport equivalente;

desktop e larguras responsivas aplicáveis.

Preserve:

topologia;

hierarquia;

proporções;

agrupamentos;

densidade;

alinhamentos;

posição relativa de ações;

disclosure;

relação lista/detalhe.

Não é pixel-perfect obrigatório, mas divergência estrutural precisa de justificativa/autorização.

11. Requisitos e proibições vinculantes

DEVE

D-01 a D-30 do Agreement M8.1 são obrigatórios.

Todos devem aparecer no AoT.

Cada D deve ter implementação, teste e evidência ou status explícito.

PROIBIDO

P-01 a P-23 do Agreement M8.1 são vinculantes.

Inclua provas negativas onde testável.

Nenhum P pode ser violado na conclusão.

FORA DE ESCOPO

F-01 a F-13 não podem ser incluídos “por oportunidade”.

AUTONOMIA

A-01 a A-12 permitem otimizar implementação sem alterar comportamento aprovado.

12. Segurança e deleção

Classifique o movimento no mínimo como D sensível e avalie se alguma decisão arquitetural nova eleva parte a E.

Inclua:

testes negativos de tenant;

testes negativos de autorização;

prova de preservação de harita.super;

prova de que excluir Pessoa não exclui Usuário;

prova de que Knowledge oficial não é apagada;

prova de que delete não cruza tenant;

prova de que Storage removido pertence ao tenant/Pessoa corretos.

Não confie no frontend para autorização.

13. Validação proporcional

Execute validações integradas e sensíveis das áreas realmente alteradas.

No mínimo:

TypeScript typecheck das superfícies tocadas;

build web;

testes de domínio/classificação;

testes das RPCs/migrations;

testes de RLS/tenant afetados;

regressão dirigida do fluxo currículo;

regressão dirigida de Knowledge;

regressão dirigida do Perfil;

regressão dirigida de M5.1 afetado;

regressão dirigida de matching/score para provar não alteração;

validação de deleção;

smoke remoto.

Não rode validação completa do repositório apenas porque existe. Se a mudança demonstrar risco cross-cutting que exija pnpm run validate completo, explique ao Product Owner e peça autorização explícita conforme AGENTS.md.

14. Release e rollback

14.1 Release

O movimento autorizado inclui publicação no ambiente remoto atual e frontend hospedado.

Aplique a ordem segura descoberta no repositório.

Não declare produção apenas por:

commit;

migration local;

CI;

build;

documentação.

Comprove ambiente real.

14.2 Backup

Crie snapshot/backup técnico antes da limpeza.

Ele serve somente como rollback da execução destrutiva.

Não use o backup como “histórico funcional” do Prisma.

Observe política real do provedor. Se o backup específico puder ser removido após conclusão segura sem violar política obrigatória, não preserve material desnecessário por causa do M8.1.

14.3 Rollback

Documente:

rollback de frontend;

rollback de migration quando reversível;

restauração do snapshot em caso de falha destrutiva;

limites de rollback depois que nova importação pós-M8 começar.

Nunca prometa rollback que o ambiente não suporta.

15. Documentação obrigatória

Atualize somente owners afetados.

No mínimo, conforme aplicável:

product/competências;

Knowledge architecture;

data model;

contracts;

security;

AI reference se a projeção de assessment mudar;

current state;

versioning;

ADR para decisão durável M8;

Agreement/Execution;

AoT.

Depois:

pnpm run generate:prisma-context
pnpm run check:prisma-context

Não edite manualmente FONTE_GPT_PRISMA.md ou TUDO_SOBRE_PRISMA.md.

16. AoT obrigatório

Crie o AoT no owner de QA usando o template vigente.

Para cada requisito:

Agreement
-> Implementation
-> Test
-> Evidence
-> Status

Status permitidos:

PASS

FAIL

PARTIAL

BLOCKED

NOT TESTED

Conclusão só é permitida quando:

todo D aplicável = PASS;

nenhum P violado;

evidência tecnicamente disponível está registrada;

harita.super está funcional;

limpeza foi comprovada no banco/Storage;

fluxo sintético pós-M8 foi comprovado;

backend/frontend estão sincronizados.

O AoT não deve conter PII dos currículos apagados.

Use contagens e identificadores técnicos não sensíveis quando necessário.

17. Critérios objetivos de encerramento

Não considere M8.1 concluído até provar todos os seguintes pontos:

Hard/Soft + nove subgrupos ativos.

Seis agrupadores legados não governam UX.

Backend bloqueia classificação inválida.

Conceitos canônicos não foram duplicados.

Certificação virou evidência/credencial.

Person evidence diferencia Declarado/Contextualizado/Certificado/Verificado/Habilidade.

Importação não cria Verificado/Habilidade.

Pessoas originadas por currículo no escopo foram apagadas.

Descendentes e Storage foram apagados.

Knowledge exclusivamente derivada foi apagada.

CBO/ESCO/O*NET preservados.

Knowledge independente preservada.

Assessments/matching dependentes das Pessoas apagadas foram removidos.

Sem órfãos funcionais.

Vagas/Posições preservadas.

Usuários/memberships/organizações preservados.

harita.super mantém Super Admin e login funcional.

Novo currículo sintético conclui publicação.

Novo Perfil exibe competências M8.

Matching/Prisma Score não mudou semanticamente.

RLS/tenant sem regressão.

frontend e backend publicados e smoke PASS.

AoT completo.

nenhuma expansão para sucessão/PDI/9-Box/gap.

nenhuma fonte/modelo/API nova não aprovada.

Se qualquer item não puder ser provado, registre o status real e não declare “concluído”.

18. Forma de trabalho esperada

Se durante a implementação surgir conflito técnico real com requisito aprovado:

pare apenas a parte afetada;

descreva o conflito factual;

apresente alternativas e impactos;

aguarde decisão do Product Owner;

não reinterprete o contrato silenciosamente.

Fora disso, execute o movimento até o fechamento completo, sem pedir aprovações intermediárias para decisões já delegadas em AUTONOMIA.
