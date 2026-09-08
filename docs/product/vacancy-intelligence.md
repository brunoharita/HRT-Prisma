# Vagas como necessidade profissional estruturada

## Objetivo

`Vaga` descreve uma necessidade profissional concreta da organização. Ela pode estar ocupada ou não ocupada e não representa campanha de recrutamento, anúncio público ou etapa de ATS.

## Modelo mental

- Referência ocupacional global: conceito reutilizável da Knowledge Global, como CBO, ESCO ou O*NET.
- Função da organização: definição privada e reutilizável da empresa em `job_roles`.
- Posição: lugar concreto no desenho organizacional, com situação e Pessoa ocupante quando houver.
- Vaga: versão contextual da necessidade, com Sobre a posição, responsabilidades, resultados e requisitos próprios. O contexto relevante é consolidado em Sobre a posição, sem card final separado.

Vagas com o mesmo título podem ter requisitos diferentes. O título nunca substitui a definição versionada.

## Jornada M5.4

1. listar e filtrar Vagas;
2. criar manualmente ou iniciar por função, Vaga anterior, referência Knowledge ou descrição livre;
3. revisar sugestões determinísticas, corrigir a dimensão e decidir obrigatório/desejável; pendências não escondem Pessoas, mas mantêm a aderência detalhada incompleta;
4. consultar o detalhe editorial e o histórico;
5. encontrar Pessoas pelos Perfis publicados do tenant;
6. comparar exatamente duas Pessoas por requisito, sem score, ranking ou vencedor.
7. consultar o Assistente Prisma. Em `Na sua empresa`, a resposta usa somente a Vaga atual, Vagas e funções acessíveis e Knowledge publicada autorizada, incluindo relações publicadas quando disponíveis. Ela informa se a evidência interna é suficiente, parcial ou insuficiente; contagens são apenas metadados. Toda pergunta preenchida consulta a Web por padrão, separadamente da leitura interna, e mostra as fontes usadas. O operador pode escolher explicitamente `Somente fontes internas`; não há classificação oculta por palavras-chave. Nenhuma resposta substitui a leitura interna ou altera a Vaga automaticamente.

## Regras de aderência

- `Atendido`: existe igualdade direta ou equivalência canônica publicada na dimensão correspondente.
- `Parcial`: existe correspondência textual parcial na mesma dimensão ou transferência explicitamente configurada; exige revisão humana.
- `Sinal relacionado`: relação confirmada apenas para a versão da Vaga; não comprova o requisito.
- `Sem evidência suficiente`: o Perfil atual não traz evidência suficiente; nunca significa que a Pessoa não possui a experiência ou o conhecimento.

A relação com a posição aparece separada da aderência por requisitos: mesma referência, referência equivalente, referência relacionada, possível relação por título/experiência ou nenhuma relação automática. O usuário pode confirmar ou descartar a relação; sua decisão prevalece na ordenação, sem alterar Perfil, Vaga ou Knowledge.

A ordenação é determinística e operacional. Primeiro respeita a decisão humana, depois a força da relação ocupacional, evidência direta, parcial, sinal relacionado e menor quantidade de requisitos obrigatórios sem evidência, usando nome apenas como desempate. Todos os Perfis publicados acessíveis permanecem listados, e a tela informa quantos foram analisados do total. Essa ordem não é score nem recomendação de contratação.

## Estrutura canônica da Vaga pronta

`Sobre a posição` e `Resultados esperados` são opcionais. `Responsabilidades` descreve ações e entregas, nunca uma tecnologia isolada. Esses três campos são narrativos e nunca satisfazem requisitos. O matching detalhado consome requisitos classificados pelo humano em `Requisitos obrigatórios` ou `Requisitos desejáveis`, agrupados nas mesmas dimensões do Perfil Prisma. A dimensão pode ser sugerida automaticamente, mas a importância continua sendo decisão humana. A ausência de desejável ou de dimensão não exigida não é gap obrigatório. Requisitos manuais e correções humanas permanecem em reestruturações; uma alteração da descrição mostra delta e nunca remove item não encontrado automaticamente.

## Limites do piloto

- sem candidatura, pipeline, entrevista, proposta, contratação, página pública ou integração externa;
- sem publicação automática na Knowledge;
- sem provedor externo para estruturar descrições; Web Search existe somente na pergunta contextual e não altera a definição;
- sem avaliação automática M5.1;
- sem decisão de contratação.
