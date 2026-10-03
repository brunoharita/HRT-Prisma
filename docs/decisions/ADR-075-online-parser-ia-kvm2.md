# ADR-075 — Parser IA online na KVM2

Estado: aceito pela decisão explícita de Bruno em 2026-10-03. Owner: operations/security. Acordo: `docs/qa/agreement-parser-ia-kvm2.md` 1.0.0. Versão de implantação: `parser-ia-kvm2-1.0.0`; contratos de dados/transporte/readiness, prompt e modelo preservados.

## Problema e decisão

A ponte do ADR-059 deixou a importação dependente do PC e SSH. Em 03/10 worker/túnel ausentes bloquearam o envio. A operação deve ser totalmente online. F-04 do acordo de qualidade 1.3.0 e a dependência de PC/túnel do ADR-059 estão substituídos para a importação automática; históricos continuam válidos como evidência do piloto.

Reutilizar o Parser Node em container na KVM2, com Compose, usuário node, filesystem read-only, capabilities removidas, no-new-privileges e limites de CPU/RAM/PIDs. Reutilizar gateway sem alterar código: escuta HTTP somente `127.0.0.1:18787`, valida o Host lógico `127.0.0.1:8787` já enviado pelo gateway. A rede host existente permite o caminho privado; nenhuma porta Docker pública ou Traefik para o worker. A credencial é arquivo Compose secret montado somente no Parser, vindo de `/etc/prisma/parser-ia.env`, protegido fora do checkout.

Cache persistente em volume privado; lock em tmpfs separado. O singleton por nome de container e porta fixa mantém serialização. O tmpfs desaparece ao parar/recriar o container, permitindo restart sem lock obsoleto; cache continua validado por organização/fonte/prompt/modelo/contrato. Não reexecutar automaticamente documento interrompido, remover cache ou alterar o lock de processo ainda ativo. Readiness/healthcheck não chamam OpenAI.

## Reutilização e alternativas

- Reutilizar Parser e Docker existentes na KVM2: escolhido; 2 CPUs, memória/disco suficientes para adapter PDF.js e HTTP. O modelo é executado pela OpenAI, não exige GPU na KVM2.
- Continuar ponte PC/SSH: falha no objetivo de operação online.
- Nova Edge, fila ou fornecedor: acrescenta plataforma e reimplementação sem necessidade para o escopo unitário atual.

Nenhuma nova dependência npm. Limitação unitária e limites do Parser continuam. Cache antigo do PC não é transferido; primeira importação nessa instalação pode chamar o provedor quando não houver cache. Dados privados novos ficam no volume de produção; backup/retenção gerais não são redesenhados aqui.

## Compatibilidade, validação e rollback

Teste HTTP negativo de auth/tenant/origem/contrato e binding/hash; regressão Parser/readiness/cache; smoke sintético remoto sem Pessoa; restart/replay; IDs/imagens de web/gateway/Traefik comparados. Somente o novo Parser precisa ser publicado. Uma importação real até revisão é evidência separada e requer fluxo humano autorizado.

Rollback imediato: parar somente `parser-ia`, preservar volume/credencial e imagem. O aviso de indisponibilidade protege importações. Reversão do código por imagem anterior é possível em futuras revisões; retornar à ponte PC é recuperação histórica, não atendimento ao objetivo online e exige decisão explícita. Não apagar volumes ou dados.

Fontes oficiais consultadas em 03/10: [Compose secrets](https://docs.docker.com/compose/how-tos/use-secrets/) e [host networking](https://docs.docker.com/engine/network/drivers/host/). Secrets do Compose são bind mounts: permissões reais do arquivo de origem precisam ser verificadas; `uid/mode` declarativos não substituem essa verificação.
