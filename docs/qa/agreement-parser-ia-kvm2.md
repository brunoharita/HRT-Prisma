# Contrato de Acordos — Parser IA totalmente online na KVM2

Versão 1.1.0, `agreed`, 2026-10-03. Bruno confirmou: “é exatamente o que precisamos fazer, precisa operar totalmente online”. Após o bloqueio da revisão automática, autorizou explicitamente a transferência solicitada de `OPENAI_API_KEY` da `.env.local` oficial para `/etc/prisma/parser-ia.env` na KVM2 `72.60.241.90`, o teste sintético cobrado e a publicação: “tudo autorizado ... atualizar o movimento para o movimento 2.0.1 atualizar tudo em main, e publicar”. Esta revisão preserva D-01 a D-05/P-01 a P-03/F-01/A-01, especifica A-02, substitui F-02 apenas quanto à versão visual e acrescenta D-06/CA-D06. Substitui F-04 do acordo de qualidade 1.3.0 e a dependência temporária do ADR-059 somente no fluxo automático ativo. Nenhuma decisão humana sobre Pessoa é fabricada.

## DEVE

- D-01 — O fluxo automático PDF.js → Parser IA → revisão deve operar no ambiente online existente, sem worker no PC ou túnel SSH.
- D-02 — Reutilizar o gateway e o Parser existentes; preservar sessão, operador, papel, empresa, origem, contrato, hash, limites, serialização, ausência de retry e falha explícita.
- D-03 — Chave OpenAI somente no backend, montada por arquivo protegido; cache privado persistente e segregado por empresa/fonte/versões; usuário sem privilégios e endpoint somente loopback.
- D-04 — Serviço com reinício automático, verificação de disponibilidade sem IA e recuperação após reinício sem lock antigo bloquear permanentemente novas operações. Reinício não repete inferência de execução incerta.
- D-05 — Publicar um SHA validado no GitHub/main/KVM2, preservar rollback e demonstrar disponibilidade e processamento no servidor enquanto worker/túnel do PC estão ausentes.
- D-06 — Registrar e publicar Prisma v2.0.1 na fonte única de versão pública; login e menu devem exibir o mesmo valor. Preservar histórico e versões dos contratos de Parser/dados.

## PROIBIDO

- P-01 — Expor worker, credencial, cache ou currículo em porta pública, bundle, imagem ou logs; reduzir auth/tenant/validação para viabilizar a migração.
- P-02 — Mudar prompt/modelo, versão dos dados, score, interpretação ou regras de revisão/publicação; repetir IA automaticamente; transformar falha em perfil completo.
- P-03 — Migrar documentos/cache pessoais do PC, criar Pessoa fictícia em produção, publicar Perfil ou alterar containers/modelos alheios como parte do smoke.

## FORA DE ESCOPO

- F-01 — Reativar ou migrar Paddle/Tesseract da importação automática, migrar experimentos inativos, remover modelos/containers históricos, monitor externo, nova plataforma, concorrência múltipla ou arquitetura de fila.
- F-02 — Reprocessar Pessoas reais ou alterar banco, Edge Functions, matching, taxonomia, UX além da apresentação da versão pública e contratos persistidos.

## AUTONOMIA

- A-01 — Docker/Compose e Node existentes; layout interno de cache/lock, limites do container, healthcheck, roteiro de publicação e escolha de testes negativos proporcionais.
- A-02 — Transferir somente `OPENAI_API_KEY` da `.env.local` oficial para `/etc/prisma/parser-ia.env` na KVM2 `72.60.241.90` por SSH, montada apenas no backend, sem copiar o arquivo completo, PDFs ou caches. Testar com chamada real ao provedor usando somente PDF sintético mínimo sem persistir Pessoa, com replay sem nova chamada paga.

## PENDÊNCIAS

Nenhuma decisão material aberta para esta migração. Uma importação real com persistência pela interface depende de documento e ação humana autorizados; o smoke técnico usa somente PDF sintético, sem banco, sem Pessoa e sem publicação. Não equivale a aceite de qualidade de currículos reais.

## CRITÉRIOS DE ACEITE

- CA-D01 — Disponibilidade e parse sintético reais na KVM2, com ausência comprovada de listener 8787/processo SSH no PC; mostrar o caminho de rede e o resultado validado.
- CA-D02 — Regressão dirigida de gateway, Parser, readiness, validação de evidência e recuperação; negativos de sessão/origem/tenant/hash/tamanho/concorrência.
- CA-D03 — Inspeção Docker/host: loopback, usuário sem privilégios, filesystem read-only, limites e arquivo/volume privados; nenhuma chave em env/imagem; segregação de cache comprovada na regressão.
- CA-D04 — Healthcheck disponível após restart e replay de cache no servidor; lock volátil e nenhuma nova chamada paga no replay; erro continua explícito.
- CA-D05 — CI, SHA local/remoto/VPS e serviço ativo registrados; rollback preservado; smoke público anônimo recusado e frontend acessível. Limite do smoke autenticado fica explícito se sessão não estiver disponível.
- CA-D06 — Teste do registro/histórico, typecheck/build web e login hospedado mostram v2.0.1; menu usa o mesmo registro. Qualquer limite do smoke autenticado fica explícito.

## Mapa de Impacto e Preservação

Baseline verificado: SHA `efdadeb64fbe8399d718018cf6080cb9737774e6` local/origin/main/VPS; `prisma-web` e gateway ativos, zero restart; PC sem listener 8787 nem SSH e VPS sem 18787. KVM2: 2 CPUs, 7.940 MiB RAM/5.287 MiB disponíveis, 81 GiB disco livre. Modelos remotos não rastreados e material local alheio preservados.

| Área / capacidade | Relação | Dependência e preservação | Regressão proporcional |
| --- | --- | --- | --- |
| Parser e disponibilidade | direct | trocar somente localização e ciclo de vida; mesmo prompt/modelo/validador | HTTP/lock/cache, build TS, parse sintético remoto e restart |
| Gateway e autorização | critical_transversal | mesmo endpoint privado 18787 e Host 8787; mesmo autorizador vivo | negativos existentes e rota pública anônima recusada |
| Importação/revisão | plausible_indirect | mesmos payloads/páginas/fatos; nenhuma alteração da UI ou persistência | Parser domínio/recuperação/readiness, web HTTP; limite de importação real explícito |
| Versão pública / web | direct | decisão adicional de Bruno para v2.0.1; nova geração 2/movimento 0/entrega 1 no registro único | release/histórico, tipos/build web, login real e fonte do menu; publicar web |
| Site/Traefik e outros serviços | plausible_indirect | Parser limitado, rebuild web para a versão; gateway/Traefik/experimentos preservados | comparar IDs/imagens/restarts, assets e HTTPS antes/depois |
| Dados/Supabase/matching/Knowledge | no_impact_identified | nenhuma migration/Edge/SQL nem chamada de persistência no smoke; saída do Parser mantém contrato | diff/plano e negativos de binding/cache; nenhuma mutação humana |
| Paddle/experimento inativo | no_impact_identified | ausentes da rota automática; containers/modelos/portas existentes não alterados | inspeção antes/depois |

Imagem anexada é evidência de incidente, não alvo de redesenho. Fidelidade visual não aplicável: nenhuma alteração de tela.
