# Padrão Prisma de Perfil Profissional

## Propósito

O Perfil Profissional é a apresentação canônica do conhecimento profissional publicado sobre uma Pessoa. Ele transforma o snapshot versionado já existente em uma leitura consistente, pesquisável e comparável, sem criar outra fonte de verdade.

## Superfícies

O mesmo contrato de apresentação é reutilizado em seis contextos:

1. Central da Pessoa, com resumo profissional, experiência recente, competências principais e acesso ao Perfil completo;
2. Perfil completo, em ordem estável: Sobre, Experiência, Formação, Competências, Credenciais e Outros;
3. Formação, competências e credenciais dentro do Perfil, sem métricas inventadas;
4. busca avançada de Pessoas por experiência, formação, competências, credenciais e contexto;
5. resultados explicáveis, com os critérios objetivos que fizeram cada Pessoa aparecer;
6. comparação lado a lado de exatamente dois Perfis, sem vencedor, score ou recomendação automática.

Versões históricas usam a mesma composição visual do Perfil atual. Se uma seção não possui fatos publicados, ela é omitida; a ausência nunca é apresentada como característica negativa.

## Busca explicável

A busca opera somente sobre Perfis vigentes da organização ativa. Os filtros de competência declaram explicitamente se exigem todos os termos ou qualquer termo. Equivalências publicadas no Knowledge podem satisfazer a consulta, mas o resultado preserva o termo observado no Perfil e explica a relação usada.

## M7.2 — competências e evidências

O Perfil vigente apresenta Resumo, mapa de Competências e explorador de Evidências sobre `person-professional-evidence-3.0.0`. A projeção declara separadamente `position-taxonomy-1.0.0` e `competency-taxonomy-1.0.0`: a primeira continua ocupacional e não aparece como competência pessoal; a segunda fornece a identidade canônica comum que também pode ser referenciada por requisitos de Posição. Perfis publicados existentes recebem a projeção on-read, sem reimportação nem reescrita dos fatos.

Declaração, relação contextual e Evidência Demonstrada são naturezas diferentes e podem coexistir no mesmo conceito. Relações entre ocupações e competências organizam a taxonomia, mas nunca criam evidência pessoal. Somente resultado direto M5.1 ativo, vigente e suficiente recebe estado verificado. Documento, certificação, aprovação humana e inferência preservam sua natureza e não viram verificação por associação.

Cada item explica termo observado, conceito, regra, versões, fonte e decisão humana disponível. A origem documental abre a revisão e a região quando essa geometria existe. Ausência, ambiguidade, insuficiência, expiração e indisponibilidade usam linguagem neutra; não produzem score, proficiência, senioridade ou recomendação. Requisitos de Posição permanecem fora do Perfil até matching explícito. Requisitos novos podem apontar para a mesma identidade canônica de competência, sempre por decisão humana e com versão própria; isso não altera matching, Prisma Score, A/B/C ou evidência da Pessoa.

Os resultados são ordenados por quantidade de critérios objetivos atendidos e, em caso de empate, por nome. Essa ordenação não constitui aderência, senioridade, ranking profissional ou decisão de contratação.

## Curadoria contextual M7.4

Na aba Competências, administradores autorizados revisam declarações pendentes em painel lateral, mantendo a lista visível, sem navegar à Knowledge. A curadoria reutiliza conceitos/aliases aprovados e propostas existentes, com fonte, termo original, definição e alcance. Ao propor conceito, a descrição é opcional; a justificativa textual da associação não é coletada. Empresa é o alcance padrão; Global exige Super Admin e informa o impacto em outros perfis. Proposta não publica conceito nem encerra pendência. Na governança de Conhecimento, o Super Admin vê propostas Globais e da empresa ativa, identificadas pelo alcance; propostas de outra empresa não aparecem.

Gravar atualiza a projeção e fecha o painel; Cancelar não grava. Página, filtro e posição permanecem. Se o item resolvido desaparecer, o foco passa ao próximo sobrevivente, ou ao anterior se era o último; página vazia recua à última válida. Gravar e próximo mantém a revisão aberta no próximo pendente. Alterações não salvas pedem confirmação de descarte, e falhas preservam a edição. No celular, o painel ocupa a tela e retorna à lista na mesma posição. Perfis antigos sem itens normalizados mantêm pendências explícitas e exigem normalização antes da curadoria contextual.

Snapshots e natureza declarada permanecem intactos. Aprovação de alias é decisão humana auditada, não evidência de desempenho. O retorno da transação já traz a projeção atualizada, sem chamar IA nem reprocessar todo o Perfil.

## Recuperação de cobertura M7.5

O Perfil usa o último processamento completo compatível como base. Uma tentativa posterior em fila, em processamento ou com falha aparece separadamente e nunca reduz as associações completas já disponíveis. A leitura distingue declarações, itens atômicos, itens associados, conceitos únicos, pendências e termos únicos pendentes; pendência não significa ausência de competência.

Na curadoria, termos normalizados equivalentes formam um grupo com contagem de ocorrências, preservando cada origem. As expressões `searchTerms` versionadas alimentam uma busca deduplicada; exato, alias oficial, alias humano, parcial e ambíguo continuam classes visíveis, e nenhuma opção é pré-selecionada. Alias de empresa aprovado por humano pode resolver ocorrências compatíveis e beneficiar Perfis futuros da empresa. Proposta de conceito continua pendente até o fluxo de publicação humano.

## Comparação

A comparação aceita exatamente duas Pessoas selecionadas na busca e reapresenta seus Perfis canônicos em colunas equivalentes. Destaques são contagens ou fatos publicados, nunca uma avaliação relativa. Ao voltar, consulta, filtros e seleção permanecem preservados na sessão do navegador.

## Autorização e privacidade

- Toda leitura permanece tenant-scoped e sujeita a RLS.
- Localização privada só é consultada para papéis já autorizados.
- Contato privado não entra na apresentação canônica nem nos cartões de resultado.
- Perfis arquivados ficam fora da busca padrão e só aparecem por escolha explícita do filtro.
- Pessoas mescladas não são retornadas.

## Limites do piloto

- A busca local pagina os resultados carregados e consulta no máximo 500 Perfis vigentes por organização neste estágio.
- Não há foto profissional porque esse dado não possui contrato atual; a interface usa iniciais neutras.
- Não há cargo preferido, senioridade, distância semântica numérica, comparação automática ou exportação do Perfil enquanto essas capacidades não possuírem contrato próprio.
- Evidência Demonstrada continua separada do Perfil factual.
