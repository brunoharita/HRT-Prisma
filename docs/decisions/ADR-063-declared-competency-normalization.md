# ADR-063 — Normalização derivada das competências declaradas

Status: accepted. Data: 2026-09-18. Contrato: `docs/qa/agreement-m73-competency-normalization.md` 1.0.0.

## Decisão e reutilização

Estender Knowledge e seu Agent, o agendamento pg_cron/pg_net autenticado por Vault, a publicação humana e a projeção M7.2. Não introduzir ontologia, biblioteca, fornecedor, embeddings ou pesquisa Web. Correspondência literal do texto bruto é insuficiente para listas, nomes comerciais e tradução; alterar os snapshots revisados apagaria a decisão humana. Por isso a interpretação é derivada, persistida por Perfil/organização/versões da Knowledge/revisão, separada da fonte imutável.

A publicação enfileira em transação; uma chamada agendada processa um Perfil por vez. Claim usa lease, SKIP LOCKED, expiração de cinco minutos e até três tentativas, com intervalo de quinze minutos. Reprocessamento explícito exige autoridade de revisão e gera nova revisão quando o anterior terminou. Os sete Perfis vigentes existentes são elegíveis para o backfill autorizado; históricos não são alterados. Exclusão de Perfil remove a derivação por FK, sem órfãos de PII.

O domínio preserva origem/índice, separa delimitadores explícitos e nomes de ferramentas inequívocos. O Agent recebe apenas trechos de competências sem identificadores de Pessoa/empresa; utiliza o modelo já configurado em `KNOWLEDGE_RESEARCH_MODEL`, Structured Outputs, `store:false`, sem tools/Web Search, timeout de 90 segundos e uma chamada por tentativa. A organização precisa ter enriquecimento externo habilitado. Validação exige cobertura de todas as entradas, trechos literais, ausência de sobreposição, limites e proíbe expandir Office em ferramentas não declaradas. Resposta inválida mantém a saída determinística e um estado de falha, nunca sucesso vazio.

Os nomes canônicos/equivalentes gerados são **expressões de busca**, não novos conceitos. O servidor os reconcilia exclusivamente com aliases aprovados e fontes publicadas correntes, priorizando empresa sobre Global, excluindo ocupações. Correspondência ambígua permanece pendente, mesmo que a IA proponha um candidato. Decisão humana existente prevalece também se posterior ao processamento. Nenhum perfil vira verificado por normalização.

## Fronteiras e operação

- `declared-competency-normalization-1.0.0` versiona entrada derivada, método/prompt e validação. `person-professional-evidence-2.0.0` adiciona status, quantidade original e itens normalizados/pedentes à leitura, mantendo `position-taxonomy-1.0.0` e a demonstração M5.1.
- A tabela tem RLS e nenhum grant para leitores/operadores; somente RPCs autorizadas expõem a leitura. Workers e completion são service-only. Escrita interempresa, lease antigo e cobertura incompleta são rejeitados.
- Gateway JWT do Agent fica desabilitado para a invocação de cron, como no monitor existente; o handler **sempre** valida segredo server-side pelo Vault para este modo, ou `auth.getUser()` e autoridade existente para os outros. Não há modo público sem autenticação.
- Reutiliza limites diários/mensais do Knowledge, sem mudar seus valores. Reserva e uso da nova capacidade são auditados no banco; indisponibilidade de limite/provedor nunca bloqueia publicação.
- Pendências entram na Inbox existente sem ligar uma observação composta a um único átomo; curadoria aprova aliases pelo fluxo humano e o operador pode atualizar as associações do Perfil. Não há publicação automática Global.
- Falta de equivalente continua legítima. Traduções/sinônimos fornecidos pelo modelo não garantem cobertura total; somente conceitos efetivamente encontrados são associados. Não há score nem promessa de mapear 100% dos termos.
- A UI mantém a topologia M7.2 e acrescenta lista consultável de pendências, status e atualização. Filtros se acomodam à largura disponível, evitando sobreposição entre colunas.

## Alternativas

Reprocessar apenas o resolver exato continuaria sem tratar compostos/nomes. Construir nova taxonomia/serviço vetorial adicionaria governança e dependências sem necessidade comprovada. Reaproveitar o Agent e reconciliar seus nomes de busca na Knowledge atende ao escopo com backend e curadoria existentes. Risco residual de interpretação semântica é explicitado por método, proveniência, preservação integral da fonte e curadoria; não se confunde com evidência de desempenho.

Rollback: desativar somente o job `prisma-profile-competency-normalization` e restaurar a imagem web anterior, que continua usando a RPC V1 inalterada. A nova leitura usa `_v2`, sem interrupção do contrato antigo durante o rollout. Conservar runs para auditoria. Não apagar nem reescrever histórico.
