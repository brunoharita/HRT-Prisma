# Operação do reconhecimento ocupacional

Contrato `occupational-rag-1.0.0`, proposta `occupational-rag-proposal-1.0.0`, fonte `knowledge-grounded-1.0.0`. ADR-089 e acordo/execução/AoT occupational-rag-v320. Produto3.2.0.

Empresa acompanha em Conhecimento > Termos para revisar > Reconhecimento de cargos. Novas versões de Posições e Perfis publicados geram tarefas. Pode solicitar por título/contexto, tentar novamente após falha ou assumir revisão manual. Aprovação escolhe associação ou criação e envia contribuição global automaticamente. Super Admin aprova ou mantém local em Propostas; motivo opcional e origem intacta.

`prisma-knowledge-model` no compose do worker, sem porta publicada, pesos públicos em `/var/lib/prisma/knowledge-models` somente leitura. Pins/digests/limites no compose. Nunca montar credenciais no modelo. Worker usa segredo de síntese nas RPCs e segredo próprio no histórico; nenhum service-role no navegador/modelo. Não registrar prompts/respostas integrais/currículos em logs.

Publicação seletiva: migration occupational_rag_v320, profile-synthesis (inclui modelo privado) e web. Preflight exige pesos e configuração protegida existentes, modelo saudável antes de recriar worker. Conferência de manifest digests antes de inferir. Sem `db push` ou atualização implícita dos pesos. Não publicar Parser/Edges/gateway/mail/Horus por adjacência.

Lease8min, três tentativas, timeout180s por chamada; cinco cargos por passagem de Perfil, lotes retomáveis acima de1.000 registros. Sem backfill. Falha explícita permite retry manual; assumir revisão invalida lease e deixa definição vazia para edição. Nada vira rejeição de pessoa. Nova tarefa assíncrona não bloqueia fila principal do worker.

Diagnóstico: eventos fixos `occupational_rag`, `occupational_rag_unavailable`, `occupational_rag_configuration_unavailable`, saúde e recursos. Histórico técnico distingue tokens conhecidos/desconhecidos e custo de API, sem regra comercial nova. Rollback: desabilitar flag efetiva, restaurar imagem de rollback indicada no recibo e web anterior, parar só `knowledge-model`; preservar colunas/propostas/aprovações e histórico.
