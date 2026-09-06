# ADR-039: resolução ocupacional sob demanda

## Decisão

Vagas consultam Knowledge já publicada primeiro e, na ausência de uma decisão segura, consultam no máximo doze candidatos dos snapshots oficiais CBO, ESCO e O*NET. O resultado é registrado por organização, termo normalizado e chave idempotente no contrato `occupation-resolution-on-demand-1.0.0`.

Uma referência só é aplicada automaticamente quando já existe um conceito ocupacional aprovado e não ambíguo. Uma reconciliação aprovada substitui o conceito de origem pelo canônico. Snapshot oficial é evidência para a Knowledge, não publicação nem equivalência por similaridade textual.

## Consequências

- A interface exibe uma única referência profissional quando segura; fontes internas não são exibidas como cargos concorrentes.
- Ambiguidade real fica auditável e não bloqueia o preenchimento ou salvamento manual da Vaga.
- Indisponibilidade técnica é distinta de ambiguidade e também não bloqueia a Vaga.
- Relações de ocupação não criam competência, senioridade ou qualquer evidência em Perfil de Pessoa.
- O `knowledge-agent` permanece a única estratégia externa aprovada para exceções futuras; este fluxo econômico não ativa provider nem cria uma segunda IA.
