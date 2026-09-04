# Vagas como necessidade profissional estruturada

## Objetivo

`Vaga` descreve uma necessidade profissional concreta da organização. Ela pode estar ocupada ou não ocupada e não representa campanha de recrutamento, anúncio público ou etapa de ATS.

## Modelo mental

- Referência ocupacional global: conceito reutilizável da Knowledge Global, como CBO, ESCO ou O*NET.
- Função da organização: definição privada e reutilizável da empresa em `job_roles`.
- Posição: lugar concreto no desenho organizacional, com situação e Pessoa ocupante quando houver.
- Vaga: versão contextual da necessidade, com missão, responsabilidades, resultados, requisitos e contexto próprios.

Vagas com o mesmo título podem ter requisitos diferentes. O título nunca substitui a definição versionada.

## Jornada M5.4

1. listar e filtrar Vagas;
2. criar manualmente ou iniciar por função, Vaga anterior, referência Knowledge ou descrição livre;
3. revisar sugestões determinísticas antes de aplicá-las;
4. consultar o detalhe editorial e o histórico;
5. encontrar Pessoas pelos Perfis publicados do tenant;
6. comparar exatamente duas Pessoas por requisito, sem score, ranking ou vencedor.

## Regras de aderência

- `Atendido`: existe evidência direta ou equivalência canônica publicada no Knowledge.
- `Parcial`: existe inferência rastreável, quando o contrato de matching utilizado a disponibiliza.
- `Sinal relacionado`: relação confirmada apenas para a versão da Vaga; não comprova o requisito.
- `Sem evidência suficiente`: o Perfil atual não traz evidência suficiente; nunca significa que a Pessoa não possui a experiência ou o conhecimento.

A ordenação é determinística e operacional. Ela prioriza evidência direta, depois inferência rastreável, sinal relacionado e menor quantidade de requisitos obrigatórios sem evidência, usando nome apenas como desempate. Essa ordem não é score nem recomendação de contratação.

## Limites do piloto

- sem candidatura, pipeline, entrevista, proposta, contratação, página pública ou integração externa;
- sem publicação automática na Knowledge;
- sem provedor externo para estruturar descrições;
- sem avaliação automática M5.1;
- sem decisão de contratação.
