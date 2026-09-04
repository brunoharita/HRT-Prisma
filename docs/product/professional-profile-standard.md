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

Os resultados são ordenados por quantidade de critérios objetivos atendidos e, em caso de empate, por nome. Essa ordenação não constitui aderência, senioridade, ranking profissional ou decisão de contratação.

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
