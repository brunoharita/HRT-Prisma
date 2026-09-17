# Prompt de Execução — Qualidade da importação de currículos em produção

Execute o contrato `docs/qa/agreement-production-resume-quality-pipeline.md`, versão `1.1.0`, sem reinterpretar os acordos.

## Entendimento obrigatório

- Implementar D-01 a D-09 na versão 1.1.0: PDF.js e estruturação inicial, nenhum tráfego Paddle, Parser IA obrigatório no caminho normal, falha explícita com continuação local consciente, transporte autenticado, revisão humana, limites operacionais e observabilidade.
- Impedir P-01 a P-07: falso positivo por volume textual, chamada Paddle durante o teste, exposição de segredos, confiança na organização do cliente, fatos sem evidência, publicação automática e retry incerto.
- Preservar F-01 a F-05: não redesenhar revisão, não trocar fornecedor/modelo, não reprocessar em massa, não converter a ponte e não remover a instalação Paddle.
- Usar A-01 a A-05 somente para decisões de implementação que não alterem o comportamento aprovado.

## Sequência de execução

1. Registrar a decisão arquitetural e versionar os contratos afetados.
2. Preservar a imagem web ativa como rollback verificável.
3. Construir somente o frontend com `VITE_DOCUMENT_INTELLIGENCE_MODE=baseline` e `VITE_PARSER_IA_MODE=hosted`, preservando a IA e desativando somente as chamadas Paddle.
4. Publicar o frontend no único ambiente remoto sem alterar Supabase, gateway, workers, modelos ou volumes.
5. Confirmar HTTP, versão construída, Parser IA e ausência de exposição pública dos workers.
6. Executar testes direcionados, build, verificação de contexto e revisão de segurança.
7. Confirmar por rede e telemetria que uma importação real não chamou Paddle e continuou usando o Parser IA.
8. Preencher `docs/qa/aot-production-resume-quality-pipeline.md`, revisar o diff, commitar e enviar a branch autorizada.

Não declarar conclusão se qualquer D-* obrigatório não estiver `PASS`, se uma proibição for violada ou se não houver evidência tecnicamente disponível.
