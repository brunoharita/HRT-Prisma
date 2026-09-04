# Central da Pessoa

## Propósito

A Central da Pessoa é o principal workspace de conhecimento, contexto e ações sobre uma Pessoa no Prisma. Ela deve responder, nesta ordem:

1. quem é a Pessoa;
2. se existe alguma ação humana pendente;
3. qual Perfil permanece vigente;
4. qual conhecimento profissional foi publicado;
5. de quais documentos e versões esse conhecimento veio;
6. o que mudou recentemente.

## Fronteira de produto

```text
Pessoa != Documento != Tentativa != Revisão != Perfil publicado
```

Uma importação incompleta ou uma falha técnica nunca invalida a Pessoa nem o Perfil vigente. Nova importação é uma proposta. Somente a publicação transacional de outra versão substitui o Perfil atual.

## Hierarquia

- Cabeçalho: identidade e posicionamento profissional existentes, localização autorizada, atualização e quantidade de documentos.
- Pendências: ações reais derivadas dos estados documentais, com documento, data, explicação e CTA direto.
- Perfil vigente: versão publicada e fonte preservadas em bloco estável, sem competir com a ação principal.
- Resumo: documentos, pendências, experiências e competências explícitas com contexto.
- Conhecimento profissional: resumo, experiências, formação acadêmica estruturada, competências e demais fatos publicados, sem logos ou métricas inventadas. Formação apresenta curso, instituição, período, situação, nível e qualificação; a origem permanece visível sem score arbitrário.
- Documentos e versões: lista selecionável e painel contextual com estado, dados recuperados, pontos pendentes, resultado no Perfil e próxima ação.
- Atividade recente: no máximo cinco eventos de produto; auditoria técnica permanece fora da visão geral.

## Perspectivas

- `Visão geral`: ação, Perfil vigente, resumo, conhecimento, documentos recentes e atividade.
- `Documentos e versões`: fontes, versões independentes e detalhe contextual.
- `Nova importação`: entrada, processamento, extração, evidências e detalhes técnicos já existentes.

As perspectivas reorganizam capacidades existentes. Não criam novos estados persistidos, menus globais, scores, inferências ou decisões automáticas.

## Ações de ciclo de vida

- A comparação oferece `Atualizar Perfil` como padrão e `Substituir Perfil` quando a revisão deve se tornar o perfil completo.
- O histórico permite `Restaurar versão` criando uma nova versão vigente e `Reiniciar Perfil` sem apagar Pessoa, documentos ou versões.
- O contexto documental oferece `Excluir documento` separado de `Arquivar revisão`. Exclusão física é destrutiva, recebe confirmação e preserva dados independentes.
- O cabeçalho oferece uma única ação primária, `Criar nova revisão`, com Perfil atual, versão anterior ou documento existente como origem. Quando a origem já é conhecida, a ação segue diretamente sem repetir perguntas.
- Cada documento mostra uma ação principal derivada do estado: `Continuar revisão`, `Revisar agora`, `Revisar novamente`, `Reabrir` ou `Abrir currículo`; `Corrigir Pessoa vinculada` e `Excluir documento` ficam entre as ações excepcionais.
- `Mesclar com outra Pessoa`, `Arquivar Pessoa`, `Reativar Pessoa` e a troca imediata de vínculo permanecem no contexto da mesma Pessoa.
- A busca normal omite Pessoas mescladas e arquivadas por padrão, mas o filtro recupera arquivadas e referências antigas à Pessoa absorvida conduzem ao cadastro principal.

## Linguagem

Usar `Perfil atual`, `Nova importação`, `Requer revisão`, `Revisar documento agora`, `Documentos e versões` e `Atividade recente`. Vermelho é reservado a falha técnica real ou ação destrutiva; âmbar comunica revisão; verde comunica publicação atual; azul comunica ação.

## Autorização

A Central operacional continua restrita aos papéis já autorizados. Member permanece na leitura de Perfil. Contato privado não é promovido ao cabeçalho e o frontend não assume autoridade de revisão.

## Limites

- Não cria pendência persistida quando o estado pode ser derivado.
- Não exibe confiança ou score sem contrato metodológico.
- Não transforma ano final em conclusão nem apresenta inferência acadêmica como fato confirmado.
- Não interpreta falta de evidência como característica negativa.
- Não inventa título profissional, empresas, logos, datas, evidências ou competências.
- Evidência Demonstrada do M5.1 permanece separada do Perfil factual e só aparece quando a consulta real correspondente existir.
