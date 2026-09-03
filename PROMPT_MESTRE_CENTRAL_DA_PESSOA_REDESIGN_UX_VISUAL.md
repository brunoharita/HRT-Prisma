# Prompt Mestre — Evolução da Central da Pessoa
# Redesign funcional, visual e operacional da experiência de Perfil no Prisma

## 0. Missão

Você está trabalhando no repositório oficial do Prisma.

Sua tarefa é implementar, em um único movimento coeso, uma evolução profunda da **Central da Pessoa**, cobrindo simultaneamente:

- hierarquia de informação;
- clareza operacional;
- redução de redundância;
- acesso direto a pendências;
- navegação;
- organização do conhecimento profissional;
- documentos e versões;
- competências e evidências;
- histórico;
- acabamento visual;
- responsividade;
- acessibilidade;
- consistência com o design system do Prisma.

Este movimento não deve ser tratado como simples “embelezamento de tela”.

O objetivo é transformar a Central da Pessoa de uma página de status técnico e currículo estruturado em uma verdadeira:

> **Central de conhecimento, contexto e ações sobre a Pessoa.**

A pergunta principal que a tela deve responder ao operador é:

> **O que sabemos sobre esta Pessoa, qual conhecimento está vigente e existe algo que exige minha ação agora?**

---

# 1. Caso real que motivou esta melhoria

Uma Pessoa já possui um Perfil aprovado no Prisma.

Posteriormente:

1. outro currículo é importado;
2. esse currículo é associado à mesma Pessoa;
3. o Prisma recupera parte das informações;
4. a extração não fica completa;
5. o documento passa a exigir revisão humana;
6. o Perfil aprovado anterior permanece vigente;
7. o operador abre a Central da Pessoa.

No estado atual, a informação existe, mas a UX não torna suficientemente evidente:

- que existe uma pendência;
- qual é a pendência;
- por que ela existe;
- o que foi preservado;
- qual ação deve ser tomada;
- como iniciar a revisão diretamente dali.

Hoje o operador pode precisar interpretar:

- Perfil aprovado;
- nova importação;
- status do documento;
- Processamento e revisões;
- botão de recuperação;
- documento;
- revisão;

antes de descobrir o que realmente deve fazer.

Esse custo cognitivo precisa ser eliminado.

---

# 2. Princípio máximo de produto

Preservar rigorosamente:

```text
Pessoa
≠ Documento
≠ Tentativa
≠ Revisão
≠ Perfil publicado
```

A regra continua sendo:

> Currículo é fonte. Pessoa é identidade. Perfil é conhecimento profissional publicado. Tentativa é detalhe técnico.

Portanto:

- uma nova importação pendente não invalida a Pessoa;
- um documento incompleto não invalida o Perfil vigente;
- o Perfil anterior permanece publicado até nova publicação;
- a tela deve mostrar simultaneamente estabilidade e pendência;
- a pendência deve ser acionável;
- nunca misturar estado do documento com estado da Pessoa.

---

# 3. Estado atual obrigatório antes de alterar código

Antes de implementar:

1. leia `AGENTS.md`;
2. leia `README.md`;
3. leia `docs/ai-context/PRISMA_CURRENT_STATE.md`;
4. leia `docs/ai-context/PRISMA_WIKI.md`;
5. leia `docs/ai-context/PRISMA_TECHNICAL_REFERENCE.md`;
6. leia `docs/ai-context/PRISMA_AI_REFERENCE.md`;
7. leia os documentos de produto e arquitetura diretamente relacionados a:
   - Pessoa;
   - Central da Pessoa;
   - documentos;
   - perfil vigente;
   - processamento e revisões;
   - jornada de ingestão;
   - `resume-product-state`;
   - `profile-publication-delta`;
   - M5;
   - competências;
   - evidências;
   - M5.1, apenas onde já houver informação real relacionada à Pessoa;
8. inspecione o código atual da Central da Pessoa;
9. inspecione o adapter Supabase usado pela tela;
10. inspecione as rotas reais;
11. inspecione componentes compartilhados;
12. inspecione o design system atual;
13. inspecione Git status e preserve trabalho existente.

O estado real já possui:

- Perfil vigente separado da última importação;
- Central da Pessoa;
- documentos;
- histórico;
- `Processamento e revisões`;
- M5;
- recuperação de extração parcial;
- publicação Delta;
- competências/evidências;
- M5.1A/B/C;
- aprendizado estrutural intra-documento.

Não reimplementar essas capacidades.

Este movimento deve reorganizar, integrar e tornar mais clara a experiência existente.

---

# 4. Imagens anexadas — referência visual obrigatória

Serão anexadas ao prompt no Codex **quatro imagens de referência**.

Elas devem ser interpretadas como **visões complementares de uma mesma arquitetura de UX**, e não como quatro produtos independentes.

## Imagem A — Visão geral com uma pendência prioritária

Representa:

- cabeçalho profissional forte;
- card de pendência em destaque;
- card separado de Perfil vigente;
- cards-resumo;
- conhecimento profissional;
- documentos e versões;
- atividade recente.

Usar como referência principal da Central da Pessoa quando houver **uma pendência importante**.

---

## Imagem B — Foco em Documentos e versões

Representa:

- lista detalhada de documentos;
- status por documento;
- seleção de um documento pendente;
- painel lateral de contexto;
- resumo da extração;
- pontos pendentes;
- CTA direto para revisão M5;
- histórico relacionado.

Usar como referência para a perspectiva:

> **Documentos e versões**

Pode ser tab interna, seção detalhada, drawer ou rota filha da Central da Pessoa, conforme arquitetura atual.

---

## Imagem C — Perfil profissional enriquecido

Representa:

- cards de resumo;
- experiências em formato editorial;
- formação;
- competências;
- documentos relacionados;
- atividade recente;
- evidências.

Usar como referência para a perspectiva:

> **Perfil / Conhecimento profissional**

Não hardcodar números, empresas, logos ou dados exibidos na imagem.

---

## Imagem D — Múltiplas pendências

Representa:

- várias pendências simultâneas;
- cards separados por natureza da ação;
- CTAs específicos;
- Perfil vigente preservado;
- resumo operacional;
- conhecimento publicado;
- documentos e atividade.

Usar como referência quando existir mais de uma pendência.

---

# 5. Regra de interpretação das imagens

As imagens definem:

- hierarquia;
- densidade;
- proporções;
- agrupamento;
- cards;
- fluxo;
- uso de cor;
- posição de ações;
- separação entre estável e pendente;
- linguagem visual.

As imagens **não autorizam**:

- hardcode de dados;
- logos de empresas não existentes nos dados reais;
- números ilustrativos fictícios;
- títulos profissionais inventados;
- novos estados não suportados;
- nova sidebar incompatível;
- novo App Shell;
- topbar global;
- componentes que contradigam Ant Design ou tokens reais do Prisma.

Em caso de conflito:

1. contrato de produto e segurança;
2. estado real e código;
3. design system do Prisma;
4. imagens;
5. nova decisão estética.

---

# 6. Problema de UX atual

A Central da Pessoa hoje sofre principalmente de:

## 6.1 Hierarquia invertida

A tela tende a destacar primeiro:

> Perfil aprovado

e secundariamente:

> há uma pendência que exige sua ação.

Quando existe uma pendência real, a ordem deveria ser:

1. o que exige atenção;
2. o que permanece vigente;
3. conhecimento publicado;
4. contexto e histórico.

---

## 6.2 Redundância

A mesma informação pode aparecer em:

- banner;
- resumo;
- título de seção;
- histórico.

Exemplo:

`Perfil v1 aprovado` repetido diversas vezes.

Reduzir repetição.

---

## 6.3 CTA ambíguo

Evitar:

`Recuperar informações`

quando a tarefa real é:

`Revisar nova importação`

A ação deve falar a linguagem do trabalho do operador.

---

## 6.4 Dados sem ação

Cards como:

`Documentos: 2`

são pouco úteis isoladamente.

Preferir:

`2 documentos · 1 publicado · 1 aguardando revisão`

Sempre que houver estado relevante.

---

## 6.5 Histórico superdimensionado

Histórico é importante, mas deve ser secundário.

Mostrar resumo recente + acesso ao histórico completo.

---

## 6.6 Conhecimento profissional visualmente pobre

Experiências e formação precisam ser mais escaneáveis, editoriais e legíveis.

---

# 7. Nova definição da Central da Pessoa

A Central da Pessoa deve responder cinco perguntas:

## Quem é esta Pessoa?

Nome, posicionamento profissional e contexto.

## Existe algo que exige minha ação?

Pendências.

## Qual conhecimento está vigente?

Perfil publicado atual.

## De onde esse conhecimento veio?

Documentos, evidências e versões.

## O que mudou?

Histórico.

---

# 8. Arquitetura recomendada da página

A Central deve adotar uma arquitetura equivalente a:

```text
Cabeçalho da Pessoa
        ↓
Pendências acionáveis
        ↓
Perfil vigente / estado estável
        ↓
Resumo executivo
        ↓
Conhecimento profissional
        ↓
Documentos e versões
        ↓
Atividade recente / histórico
```

Pode haver navegação interna:

```text
Visão geral
Perfil
Documentos
Evidências
Histórico
```

Somente se isso melhorar a escalabilidade e estiver coerente com a arquitetura atual.

Não criar tabs artificiais sem conteúdo real.

---

# 9. Cabeçalho profissional da Pessoa

O topo deve deixar de ser apenas um nome grande.

Mostrar, quando disponível e autorizado:

### Linha 1
Nome completo.

### Linha 2
Título/posicionamento profissional vigente.

### Linha 3
Contexto resumido:

- localização;
- última atualização;
- quantidade de documentos;
- eventualmente contato, conforme autorização atual.

Ações gerais à direita:

- Editar dados;
- Processamento e revisões, se necessário;
- menu secundário.

Não colocar CTA operacional de pendência misturado às ações gerais.

Pendências têm sua própria área.

---

# 10. Não inventar posicionamento profissional

Se o perfil não possui título estruturado:

não gerar texto artificial.

Usar apenas dado existente.

Fallback:

- nome;
- localização;
- metadata.

---

# 11. Área de Pendências

Esta é a principal mudança funcional.

Se houver pendências:

mostrar imediatamente após o cabeçalho.

Título:

> **1 pendência requer sua atenção**

ou:

> **3 pendências requerem sua atenção**

Não usar:

> Problemas

Pendência não significa erro.

---

# 12. Pendência como objeto de UX

Cada pendência deve possuir:

- tipo;
- título;
- descrição;
- origem;
- data;
- contexto;
- estado;
- ação primária;
- ações secundárias;
- severity visual;
- entidade relacionada;
- route/action resolver.

Exemplo:

```text
Nova importação requer revisão

Bruno Harita - Product Owner.pdf
Importado em 30/08/2026 às 22:14

O Prisma recuperou parte das informações deste documento,
mas alguns pontos precisam de revisão humana antes de
uma nova versão do perfil poder ser publicada.

[ Revisar documento agora ]
```

Secundárias:

- Ver documento;
- Detalhes técnicos;
- Descartar importação.

---

# 13. CTA direto

Ao clicar:

> **Revisar documento agora**

abrir diretamente o workspace M5 correto:

- Pessoa correta;
- documento correto;
- tentativa revisável correta;
- revisão correta.

Não exigir navegar por:

`Processamento e revisões → Pessoa → Documento → Tentativa → Revisão`

quando a Central já conhece o contexto.

---

# 14. Fonte única de próxima ação

Não duplicar lógica na UI.

Usar ou evoluir derivação canônica equivalente a:

`deriveResumeProductState(...)`

e uma função equivalente a:

`derivePersonPendingAction(...)`

ou nome coerente.

A derivação deve devolver:

- tipo da pendência;
- label;
- explanation;
- severity;
- CTA label;
- CTA destination/action;
- secondary actions;
- entity ids;
- whether action is available.

---

# 15. Tipos de pendência suportados

A arquitetura deve ser extensível.

No mínimo, suportar pendências reais existentes, como:

- nova importação requer revisão;
- identificação pendente;
- documento tecnicamente recuperável;
- comparação pronta para publicação;
- revisão pendente;
- divergência entre evidências, se já existir no runtime;
- verificação de competência concluída aguardando ação, se já existir no runtime.

Não criar pendências fictícias.

Renderizar somente tipos suportados pelo estado real.

---

# 16. Múltiplas pendências

Quando houver várias:

mostrar cards independentes.

Ordenação:

1. bloqueantes;
2. requer ação humana;
3. informativas.

Não ordenar apenas por data.

Exemplo:

```text
Nova importação requer revisão
[Revisar documento]

Verificação de competência concluída
[Analisar resultado]

Divergência entre evidências
[Resolver divergência]
```

Somente exibir ações realmente implementadas.

---

# 17. Perfil vigente separado da pendência

Criar card visual próprio:

> **Perfil vigente**
>
> v1 aprovado/publicado
>
> Este é o perfil atualmente utilizado pelo Prisma enquanto novas informações estão em revisão.

Ação:

`Ver perfil atual`

O card deve comunicar estabilidade.

Cor:

verde suave somente para estado realmente aprovado/publicado.

---

# 18. Nunca usar Perfil vigente como CTA concorrente

Quando há uma pendência:

o CTA principal da tela é a pendência.

`Ver perfil atual` é secundário.

---

# 19. Resumo executivo

Substituir cards excessivamente técnicos por cards com contexto.

Possíveis cards, apenas quando suportados:

## Perfil atual
v1 publicado
data.

## Documentos
2 documentos
1 publicado · 1 pendente.

## Revisões
1 revisão pendente.

## Evidências
quantidade real, se consulta já existir e fizer sentido.

## Competências
quantidade real, se disponível.

Nunca inventar métricas.

---

# 20. Cards devem responder “e daí?”

Evitar:

```text
Documentos
2
```

Preferir:

```text
Documentos
2 documentos
1 publicado · 1 aguardando revisão
```

---

# 21. Conhecimento profissional publicado

Esta seção é o centro de valor da Pessoa.

Precisa ter aparência editorial.

Organizar:

- Experiências;
- Formação;
- Competências;
- Certificações;
- Idiomas;
- Outros;

de acordo com os dados existentes.

Não forçar todas as seções se vazias.

---

# 22. Experiências — redesign

Cada experiência deve possuir:

### Título
Cargo.

### Linha secundária
Empresa · período.

### Descrição
Trecho resumido.

### Metadados discretos
Quando disponíveis:

- Perfil vigente;
- origem documental;
- quantidade de evidências.

### Ação
`Ver mais`

ou expansão inline.

Não mostrar parágrafos longos inteiros por padrão.

---

# 23. Não usar logos empresariais sem fonte real

As imagens de referência podem conter logos.

Não buscar nem inventar logos nesta entrega.

Se já houver entidade/imagem confiável:

usar.

Caso contrário:

usar ícone/avatar neutro.

---

# 24. Formação

Usar lista editorial ou timeline leve.

Mostrar:

- curso;
- instituição;
- período;
- status, se real.

Não repetir informação.

---

# 25. Competências

Adicionar seção clara quando existir dado real.

Exemplo:

```text
SQL
Documental forte

Gestão de Projetos
Verificada

BPM
Contextual
```

Os labels devem refletir contratos reais.

Não inventar “verificada” se não existir Evidência Demonstrada correspondente.

---

# 26. Diferenciar evidências de competência

Se runtime permitir:

- documental;
- contextual;
- confirmada;
- demonstrada/verificada;

de forma explícita.

Não transformar em selo absoluto.

---

# 27. Evidências

A evidência deve estar acessível sem dominar a tela.

Exemplos:

`18 evidências`

`Ver origem`

Ao clicar:

- abrir contexto;
- documento;
- campo;
- região;
- provenance.

Não exibir detalhes técnicos desnecessários por padrão.

---

# 28. Documentos e versões

Esta área precisa ser muito mais útil.

Em vez de apenas:

`Documentos: 2`

mostrar lista.

Colunas/atributos:

- documento;
- versão;
- origem;
- importado em;
- situação;
- perfil relacionado;
- ação.

Estados:

- publicado;
- aguardando revisão;
- descartado;
- arquivado;
- outros estados canônicos reais.

---

# 29. Documento pendente

Linha deve ter CTA:

`Revisar`

Ao selecionar, pode abrir painel lateral contextual inspirado na Imagem B.

---

# 30. Painel de detalhe do documento

Quando um documento é selecionado, mostrar:

## Identificação
nome, data, status.

## Resumo da extração
Somente métricas reais e suportadas.

Evitar “confiança 86%” se não existir contrato metodológico claro.

Preferir:

- campos recuperados;
- campos pendentes;
- alterações identificadas;
- estado de revisão.

## Próxima ação
`Abrir revisão M5`

## Secundárias
- Visualizar PDF;
- Detalhes técnicos;
- Descartar.

---

# 31. Não criar score de extração opaco

Se não houver métrica metodológica real:

não mostrar percentual de confiança.

A imagem é apenas referência visual.

---

# 32. Histórico de versões

Pode existir no painel lateral ou seção.

Mostrar relação:

```text
Perfil v1 publicado
← Currículo Mestre Executivo.pdf

Nova importação pendente
← Product Owner.pdf
```

Isso ajuda a explicar:

Documento ≠ Perfil.

---

# 33. Atividade recente

Mostrar apenas os eventos recentes relevantes.

Exemplo:

- nova importação recebida;
- perfil publicado;
- documento descartado;
- verificação concluída.

Máximo visual recomendado:

3–5 eventos.

CTA:

`Ver histórico completo`

---

# 34. Histórico completo

Pode manter rota/tela existente.

Não duplicar auditoria técnica na Visão geral.

---

# 35. Navegação interna

Avaliar implementar:

```text
Visão geral
Perfil
Documentos
Evidências
Histórico
```

### Visão geral

- pendências;
- perfil vigente;
- resumo;
- principais experiências;
- competências;
- documentos recentes;
- atividade.

### Perfil

- conhecimento completo.

### Documentos

- lista e versões.

### Evidências

- provenance.

### Histórico

- timeline completa.

Se o estado atual não justificar tabs, usar âncoras/seções.

Escolher a alternativa mais consistente com a arquitetura existente.

---

# 36. Sidebar global

Não adicionar:

- Central da Pessoa;
- Documentos;
- Revisões;
- Importações;

como novos menus globais apenas porque aparecem nas imagens.

A imagem é conceitual.

Preservar sidebar consolidada atual.

---

# 37. Hierarquia visual

Usar quatro níveis.

## Nível 1
Pessoa + pendência.

## Nível 2
Perfil vigente.

## Nível 3
Conhecimento profissional.

## Nível 4
Documentos/histórico/detalhes.

---

# 38. Uso de cor

Usar cores sem poluição.

## Azul
Ação principal.

## Verde
Publicado/aprovado/vigente.

## Âmbar
Requer atenção/revisão.

## Vermelho
Somente operação destrutiva/falha real.

## Cinza
Histórico/arquivado/neutro.

Status não pode depender apenas de cor.

---

# 39. Card de pendência

Deve ter:

- fundo suave;
- ícone;
- título forte;
- descrição;
- metadata;
- CTA claro.

Não usar banner genérico de largura inteira com muitas ações concorrentes.

---

# 40. Tipografia

Melhorar ritmo.

### Nome
forte.

### Título profissional
secundário.

### Section titles
claros.

### Corpo
legível.

### Metadata
menor, mas com contraste adequado.

Aumentar line-height em textos profissionais.

---

# 41. Espaçamento

Reduzir sensação de “grade apertada”.

Adicionar respiro entre:

- cabeçalho;
- pendências;
- perfil;
- conhecimento;
- documentos.

Não exagerar altura.

---

# 42. Cards

Evitar excesso de “caixas brancas com borda”.

Usar:

- agrupamentos;
- divisores;
- fundos suaves;
- cards somente onde há unidade semântica.

---

# 43. Visual premium sem decoração inútil

O objetivo não é:

- gradiente em todo lugar;
- glassmorphism;
- animações pesadas.

O objetivo é:

- presença;
- clareza;
- hierarquia;
- confiança;
- sensação de produto maduro.

---

# 44. Estado sem pendências

Quando não existir nenhuma pendência:

não mostrar grande bloco vazio.

Pode mostrar discretamente:

> Nenhuma pendência ativa

e dar mais destaque ao Perfil.

---

# 45. Estado com uma pendência

Usar layout da Imagem A como referência principal.

Pendência com destaque + Perfil vigente ao lado ou abaixo conforme viewport.

---

# 46. Estado com várias pendências

Usar Imagem D.

Desktop:

cards lado a lado se houver espaço.

Mobile:

stack vertical.

---

# 47. Estado sem Perfil publicado

Central ainda deve funcionar.

Mostrar:

> Ainda não existe Perfil publicado.

Pendências/processamento ganham destaque.

Não exibir card verde fictício.

---

# 48. Estado com Perfil + documento em processamento

Mostrar:

- Perfil vigente estável;
- documento processando;
- ação `Aguardar` ou status sem CTA.

Não inventar revisão antes de estar disponível.

---

# 49. Estado com documento requer revisão

CTA direto M5.

---

# 50. Estado pronto para publicação

Pendência:

> Nova versão pronta para comparação/publicação.

CTA:

`Comparar com Perfil atual`

ou ação canônica vigente.

---

# 51. Estado descartado

Não manter pendência ativa.

Evento fica no histórico/documentos.

---

# 52. Linguagem oficial

Usar:

- Perfil vigente;
- Nova importação;
- Requer revisão;
- Revisar documento;
- Documento;
- Publicado;
- Aguardando revisão;
- Atividade recente;
- Documentos e versões.

Evitar:

- recuperar informações;
- perfil falhou;
- pessoa falhou;
- dados ruins;
- currículo inválido.

---

# 53. “Recuperar informações”

Remover como CTA principal quando o estado real é revisão humana.

Substituir por:

`Revisar nova importação`

ou:

`Revisar documento agora`

de acordo com contexto.

---

# 54. Descarte

Manter como ação destrutiva secundária.

Não colocar com peso igual ao CTA principal.

Exigir confirmação adequada.

Preservar operação não destrutiva já existente.

---

# 55. Processamento e revisões

Continua existindo como fila transversal:

> O que precisa de ação na organização?

Central da Pessoa:

> O que precisa de ação nesta Pessoa?

Não duplicar propósito.

---

# 56. Navegação canônica

## Pessoas
→ Central da Pessoa.

## Processamento e revisões
Nome → Central da Pessoa.
CTA → ação específica.

## Central da Pessoa
Pendência → ação específica.

## Revisão
→ Delta.

## Publicação
→ Central da Pessoa.

---

# 57. Evitar loop de navegação

Não mandar operador da Central para Processamento só para voltar à Pessoa/revisão.

---

# 58. Dados e consultas

Este movimento deve preferir reutilizar dados existentes.

Se a Central exigir uma agregação mais eficiente:

criar adapter/query/RPC de leitura adequada.

Não criar schema novo apenas por layout.

---

# 59. Performance

Evitar:

- múltiplas queries por card;
- N+1;
- carregar todos os eventos históricos;
- carregar todos os documentos completos.

Usar:

- resumo;
- paginação;
- lazy details.

---

# 60. Dados do resumo

Idealmente obter em uma consulta/coordenador:

- person header;
- current profile;
- pending actions;
- counts;
- latest docs;
- recent events;
- main professional sections.

---

# 61. Fonte única de pendências

Não calcular pendência em cinco componentes.

Criar um resolver central.

Exemplo conceitual:

```text
derivePersonActionCenter(...)
```

ou service equivalente.

---

# 62. Pendência deve ser derivada, não redundante

Evitar criar tabela `person_pending_actions` se os estados já forem deriváveis.

Só persistir se houver razão arquitetural material.

---

# 63. Atualização em tempo real

Não é requisito.

Após ação:

refetch/revalidate suficiente.

---

# 64. Consistência após publicar

Depois de publicar nova versão:

Central deve atualizar:

- Perfil vigente;
- versão;
- pendências;
- documentos;
- atividade.

Pendência de revisão desaparece.

---

# 65. Consistência após descarte

Pendência desaparece.

Documento permanece histórico.

Perfil vigente permanece.

---

# 66. Consistência após abrir revisão

Pode manter status:

`Em revisão`

se contrato existir.

Não mudar estado apenas porque tela abriu se sistema não suporta.

---

# 67. UX mobile

A Central precisa ser excelente em 390px.

Ordem mobile:

1. cabeçalho;
2. pendências;
3. Perfil vigente;
4. resumo;
5. conhecimento;
6. documentos;
7. histórico.

Sem duas colunas forçadas.

---

# 68. CTA mobile

`Revisar documento agora`

deve permanecer visível e fácil de tocar.

Não depender de menu de três pontos.

---

# 69. Tabelas mobile

Documentos:

transformar em cards/linhas adaptadas ou scroll interno controlado.

Sem overflow global.

---

# 70. Acessibilidade

Obrigatório:

- foco;
- keyboard;
- headings semânticos;
- aria labels;
- status não apenas por cor;
- cards acionáveis com affordance;
- destructive action clara;
- timeline legível;
- links descritivos.

---

# 71. Empty states

## Sem experiências
> Nenhuma experiência profissional foi publicada neste perfil.

## Sem formação
> Nenhuma formação foi publicada neste perfil.

## Sem competências explícitas
> Nenhuma competência explícita foi identificada nos documentos aprovados.

## Sem documentos
> Nenhum documento foi associado a esta Pessoa.

Não usar “Sem dados” genericamente.

---

# 72. Loading states

Usar Skeleton consistente.

Não montar tela parcialmente com layout saltando em excesso.

---

# 73. Error states

Mensagem deve dizer:

1. o que falhou;
2. o que permanece seguro;
3. como tentar novamente.

Exemplo:

> Não foi possível carregar os documentos desta Pessoa. O Perfil vigente permanece disponível. Tente novamente.

---

# 74. Unauthorized

Não esconder via CSS.

Respeitar authorization.

Ações não autorizadas:

- não renderizar;
- ou mostrar disabled com explicação apenas se fizer sentido.

---

# 75. Testes funcionais mínimos

Cobrir:

## Caso 1
Pessoa com Perfil e nenhuma pendência.

## Caso 2
Perfil + nova importação requer revisão.

## Caso 3
Perfil + documento processando.

## Caso 4
Perfil + pronto para publicação.

## Caso 5
Perfil + documento descartado.

## Caso 6
Pessoa sem Perfil.

## Caso 7
Múltiplas pendências.

## Caso 8
Member sem authority para revisão.

---

# 76. Teste do CTA direto

No caso:

Perfil v1 + Documento v2 requer revisão

clicar:

`Revisar documento agora`

deve abrir M5 correto diretamente.

Validar:

- person id;
- document id;
- review id/attempt;
- fonte revisável.

---

# 77. Teste de preservação

Após abrir revisão:

Perfil v1 continua vigente.

Após descartar:

Perfil v1 continua.

Após publicar v2:

v2 passa a vigente.

---

# 78. Testes de documentos

Lista deve refletir:

- publicado;
- pendente;
- descartado;
- histórico.

Sem confundir Documento v2 com Perfil v2.

---

# 79. Testes visuais

Validar:

- 1920x1080;
- 1600x900;
- 1440x900;
- 1366x768;
- 390x844.

Sem:

- overflow global;
- CTA fora da tela;
- card comprimido;
- texto ilegível;
- status cortado;
- overlap;
- console error.

---

# 80. Smoke visual com o caso real

Usar o cenário sintético/QA equivalente ao caso apresentado:

- Pessoa com Perfil aprovado;
- novo currículo associado;
- extração parcial;
- requer revisão.

Validar:

- pendência dominante;
- Perfil vigente separado;
- CTA direto;
- documentos;
- histórico;
- mobile.

---

# 81. Imagens de referência como acceptance visual

Comparar implementação às quatro imagens.

Não exigir pixel-perfect.

Exigir:

- mesma hierarquia;
- mesma lógica;
- mesma clareza;
- qualidade equivalente;
- coerência Prisma.

---

# 82. Não reproduzir dados falsos das imagens

Exemplos ilustrativos que não devem ser hardcoded:

- “87 evidências”;
- “12 competências”;
- nomes/logos;
- percentuais;
- datas;
- títulos;
- empresas.

Usar dados reais do adapter.

---

# 83. Não criar score de Perfil

Nenhum novo score.

---

# 84. Não criar avatar fake

Se não houver foto:

usar monograma/avatar padrão.

---

# 85. Design system

Reutilizar:

- Ant Design;
- tokens;
- spacing;
- typography;
- buttons;
- tags;
- cards;
- icons.

Evitar CSS isolado repetitivo.

---

# 86. Componentes compartilháveis sugeridos

Avaliar criar:

- `PersonHeader`;
- `PersonActionCenter`;
- `PersonPendingActionCard`;
- `CurrentProfileCard`;
- `PersonSummaryStat`;
- `ProfessionalExperienceCard`;
- `ProfessionalEducationList`;
- `CompetencyEvidenceCard`;
- `PersonDocumentsPanel`;
- `RecentActivityTimeline`.

Nomes podem variar.

Não criar abstrações excessivas.

---

# 87. Responsabilidade dos componentes

Componentes devem receber view models.

Não consultar banco diretamente.

---

# 88. View model da Central

Criar composição tipada equivalente a:

```text
PersonCenterViewModel
├── identity
├── professionalPositioning
├── currentProfile
├── pendingActions[]
├── summary
├── professionalKnowledge
├── competencies
├── recentDocuments
└── recentActivity
```

Sem duplicar domain model.

---

# 89. PendingAction ViewModel

Campos equivalentes:

```text
type
severity
title
description
metadata
primaryAction
secondaryActions
createdAt
relatedEntity
```

---

# 90. Status visuais padronizados

Usar catálogo central.

Não criar `Tag` diferente em cada seção.

---

# 91. Historico e timeline

Preservar ordenação.

Não misturar eventos técnicos internos com eventos de produto.

---

# 92. Detalhes técnicos

Continuam acessíveis.

Não promover para a Visão geral.

---

# 93. Auditoria

Esta melhoria não deve apagar ou reescrever histórico.

---

# 94. RLS e segurança

Nenhum relaxamento.

Central só mostra:

- organização ativa;
- Person autorizada;
- PII conforme role.

---

# 95. PII

Contato privado apenas para roles autorizados.

Não colocar e-mail/telefone no header se role atual não pode ver.

---

# 96. Evidências

Evidências privadas/documentais seguem contratos atuais.

---

# 97. M5.1

Se competências verificadas existirem de fato:

poderão ser mostradas no Perfil.

Se não:

não criar placeholder de “verificação”.

---

# 98. Divergência entre evidências

Apenas mostrar como pendência se o runtime atual tiver estado/derivação real.

Não inventar feature só porque aparece na imagem D.

---

# 99. Processo de desenvolvimento

Este é um movimento único.

Não fragmentar em:

- visual;
- CTA;
- documentos;
- mobile;
- testes;

como entregas separadas.

Planejar internamente, entregar vertical slice completo.

---

# 100. Etapa recomendada 1 — diagnóstico

Mapear:

- Central atual;
- queries;
- routes;
- state derivation;
- actions.

---

# 101. Etapa recomendada 2 — view model

Criar composição canônica.

---

# 102. Etapa recomendada 3 — pendências

Implementar `PersonActionCenter`.

---

# 103. Etapa recomendada 4 — redesign

Recompor layout.

---

# 104. Etapa recomendada 5 — documentos

Adicionar perspectiva detalhada.

---

# 105. Etapa recomendada 6 — visual polish

Spacing, typography, responsive.

---

# 106. Etapa recomendada 7 — testes

Domain + frontend + smoke.

---

# 107. Migration

Preferir nenhuma migration.

Se dados necessários já existem:

não criar schema.

Migration somente se houver lacuna real de contrato.

---

# 108. API/RPC

Se consultas atuais causarem N+1:

criar read model/RPC seguro.

Não mover regra de autorização ao frontend.

---

# 109. Performance acceptance

Central deve carregar de forma aceitável com:

- várias experiências;
- dezenas de competências;
- muitos documentos;
- histórico extenso.

Paginar/dobrar detalhes.

---

# 110. Visual acceptance

A tela final deve transmitir:

- sofisticação;
- clareza;
- importância;
- inteligência;
- confiança.

Não deve parecer:

- CRUD;
- tela de debug;
- dashboard genérico;
- fila técnica.

---

# 111. Funcional acceptance

Ao entrar numa Pessoa com pendência:

operador entende em poucos segundos:

1. existe pendência;
2. qual;
3. por quê;
4. Perfil vigente está seguro;
5. qual botão clicar.

---

# 112. Critério de sucesso principal

No cenário real:

> Perfil v1 aprovado + novo currículo requer revisão

o topo deve mostrar:

```text
Nova importação requer revisão
[ Revisar documento agora ]
```

e separadamente:

```text
Perfil vigente
v1 aprovado
```

---

# 113. Critério de sucesso de navegação

`Revisar documento agora`

abre o M5 correto.

Sem tela intermediária.

---

# 114. Critério de sucesso visual

A Central deve alcançar qualidade visual equivalente às imagens anexadas, adaptada ao design system real.

---

# 115. Critério de sucesso de escalabilidade

Com futuras funcionalidades:

- novas pendências entram como cards;
- não exigem redesenho estrutural.

---

# 116. Não fazer

Não:

- criar dados fake;
- inventar estados;
- inventar métricas;
- adicionar score;
- adicionar LLM;
- alterar matching;
- alterar senioridade;
- criar nova Knowledge;
- alterar M5;
- alterar publicação;
- apagar histórico;
- alterar RLS;
- criar menu global desnecessário;
- rebrandear Prisma.

---

# 117. Documentação

Atualizar owner correto:

- `docs/product`;
- `docs/architecture`;
- `docs/qa`;
- `docs/ai-context`.

Se decisão arquitetural durável surgir:

ADR.

---

# 118. Current State

Após comprovação:

atualizar `PRISMA_CURRENT_STATE.md` com:

- Central redesenhada;
- pendências acionáveis;
- CTA direto;
- visão de documentos;
- responsividade;
- smokes.

Não declarar funcionalidades não comprovadas.

---

# 119. Context Pack

Executar:

```bash
pnpm run generate:prisma-context
pnpm run check:prisma-context
```

Nunca editar `TUDO_SOBRE_PRISMA.md` diretamente.

---

# 120. Validação

Executar:

```bash
CI=true pnpm run validate
```

Além de testes focados.

---

# 121. QA

Aplicar ao Prisma-QA somente se houver mudança backend/migration necessária.

Frontend continua local conforme estado atual.

Registrar smoke autenticado.

---

# 122. Smoke obrigatório

Cenários:

### A
Perfil vigente sem pendência.

### B
Perfil vigente + uma revisão.

### C
Múltiplas pendências reais suportadas.

### D
Documentos e versões.

### E
Mobile.

---

# 123. Relatório final

Informar:

## UX
O que mudou.

## Pendências
Tipos suportados.

## Navegação
CTA direto.

## Perfil
Como ficou organizado.

## Documentos
Nova apresentação.

## Visual
Componentes e responsividade.

## Backend
Se houve mudanças.

## Tests
Resultados.

## Smoke
Viewports.

## Limitações
O que ficou fora.

## Validation
`pnpm run validate`.

---

# 124. Frase-guia

> A Central da Pessoa deve mostrar primeiro o que exige ação, depois o que está vigente e, em seguida, todo o conhecimento que o Prisma possui sobre aquela Pessoa.

---

# 125. Resultado final esperado

A Central da Pessoa deve deixar de parecer:

> uma página que reúne status técnicos, cards e currículo estruturado

e passar a parecer:

> **o principal workspace de conhecimento e ações sobre uma Pessoa dentro do Prisma.**

No cenário que motivou este movimento, o operador deve entrar na Pessoa e imediatamente enxergar:

```text
Bruno Harita
Diretor de Operações · Transformação Operacional e Digital

1 pendência requer sua atenção

Nova importação requer revisão
Product Owner.pdf

O Prisma recuperou parte das informações deste documento,
mas alguns pontos precisam de revisão humana antes da publicação.

[ Revisar documento agora ]

Perfil vigente
v1 aprovado
Este perfil continua válido enquanto a nova importação é revisada.
```

A partir daí:

- Perfil profissional;
- experiências;
- formação;
- competências;
- documentos;
- evidências;
- atividade;

devem aparecer com hierarquia visual clara, menor redundância e acabamento de produto premium.

Esse é o objetivo deste movimento.
