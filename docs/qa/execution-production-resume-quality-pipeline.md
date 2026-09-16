# Prompt de Execução — Qualidade da importação de currículos em produção

Execute o contrato `docs/qa/agreement-production-resume-quality-pipeline.md`, versão `1.0.0`, sem reinterpretar os acordos.

## Entendimento obrigatório

- Implementar D-01 a D-09: PDF.js e estruturação inicial, verificação semântica, Paddle condicional, Parser IA obrigatório no caminho normal, falha explícita com continuação local consciente, transporte autenticado, revisão humana, limites operacionais e observabilidade.
- Impedir P-01 a P-07: falso positivo por volume textual, exclusão mútua entre Paddle e IA, exposição de segredos, confiança na organização do cliente, fatos sem evidência, publicação automática e retry incerto.
- Preservar F-01 a F-04: não redesenhar revisão, não trocar fornecedor/modelo, não reprocessar em massa e não converter a ponte temporária em infraestrutura independente do computador local.
- Usar A-01 a A-04 somente para decisões de implementação que não alterem o comportamento aprovado.

## Sequência de execução

1. Registrar a decisão arquitetural e versionar os contratos afetados.
2. Implementar e testar o verificador semântico determinístico.
3. Garantir que o modo de inteligência documental permaneça ativo quando o Parser IA estiver habilitado.
4. Estender a ponte autenticada com rota fixa e contrato específico para o Parser IA, removendo credenciais antes do encaminhamento.
5. Habilitar o cliente de produção com sessão e organização válidas, preservando o modo local para desenvolvimento.
6. Aplicar a migração aditiva de observabilidade na base única de produção.
7. Executar testes direcionados, build, verificação de contexto, smoke operacional e revisão de segurança.
8. Preencher `docs/qa/aot-production-resume-quality-pipeline.md`, revisar o diff, commitar e enviar a branch autorizada.

Não declarar conclusão se qualquer D-* obrigatório não estiver `PASS`, se uma proibição for violada ou se não houver evidência tecnicamente disponível.
