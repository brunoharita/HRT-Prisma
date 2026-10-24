# AoT — Reconhecimento ocupacional 3.2.0

Contrato [agreement-occupational-rag-v320.md](agreement-occupational-rag-v320.md)1.0.0; execução [execution-occupational-rag-v320.md](execution-occupational-rag-v320.md). Autoridade: Bruno,24/10/2026. Baseline `6b434a6c12853a3a824f68bc9cd5783ff66e6bdf`, produto3.1.4. ADR-089. Fechamento operacional ainda pendente antes da publicação.

## Matriz de acordos

| ID | Implementação | Teste/evidência | Status / limite |
| --- | --- | --- | --- |
| D-01 | Colunas/RPCs nos proprietários Knowledge e Perfil; nenhuma tabela | SQL compara quantidade de tabelas; diff migration | PASS local |
| D-02 | Associação exata preservada; expansão lexical, candidato40/reranking5; empresa antes de global; fontes vigentes | PoC real sintética; domínio, SQL,28 regressões Knowledge/matching; consulta global4.166ms/30.257conceitos | PASS com limites do benchmark no ADR |
| D-03 | Triggers Posição/publicação Perfil, cursor5, lease8min, dedupe/tentativas; falha e manual explícitos | SQL salva versão/publica evento,1.200cargos/seis Perfis retomáveis,lease/replay/falha; worker determinístico | PASS local |
| D-04 | Revisão exige modo/destino/versão, edição/original/ator; alias não clona | SQL RLS/versão/citações/curadoria; browser exige decisão explícita | PASS local |
| D-05 | Envio global automático sanitizado; Super aprova/mantém local, motivo opcional | SQL alias/conceito,aprovação/replay/manter; origem preservada; UI duas ações | PASS local |
| D-06 | Ollama/Qwen/BGE gratuitos privados, pins/digests; nenhum fallback pago | PoC/resources e testes de falha/URLs/JSON/citações; histórico IA original | PASS no escopo de proposta pendente; amostra pequena, sem qualidade universal |
| D-07 | Sem reprocessamento/pesos/decisões históricas; cursor aditivo | SQL payload/versão Perfil intactos;28 regressões existentes e worker anterior | PASS local; sem mutações de teste produtivas |
| D-08 | Registry3.2.0, rollout migration/worker+modelo/web | CI/recibos/smoke ainda pendentes | NOT TESTED operacional |
| D-UX-01 | Topologia em duas colunas, revisão/andamento e aprovação ao fim; mobile empilhado |19 checks browser em1600/430 e renders em evidence/occupational-rag-v320/browser | PASS local |

## Proibições verificadas

| ID | Prova | Status |
| --- | --- | --- |
| P-01 | Zero tabelas novas; IA só insere proposta; alias não duplica conceito; replay preserva decisão | PASS local |
| P-02 | Tenant/ator/lease/versão/ID/citação inválidos negados; modelo recebe contexto mínimo sem ferramentas/SQL; global sem texto privado | PASS local |
| P-03 | URLs privadas, sem fallback; fórmulas/tarifas intactas, fixtures sintéticas; serviços adjacentes a conferir após rollout | PARTIAL até smoke |
| P-UX-01 | Composição reconhecível e origem/incerteza visíveis; nenhuma nova ação global Rejeitar | PASS local |
| F-01 | Sem LinkedIn,treinamento,base vetorial,backfill,recalculo/tarifa nova | PASS diff |

## Mapa de impacto e preservação final

| Área / capacidade | Relação | Baseline e prova proporcional | Status |
| --- | --- | --- | --- |
| Knowledge/empresa/global | direct | SQL PostgreSQL17 com M77/M81 reais, negativos/RLS/replay/alias/conceito/related_to; propostas,termos,aprovações originais | PASS local |
| Posição e publicação de Perfil | direct | Triggers aditivos; fixtures salvam versão e evento vigente; perfil/versão preservados; lote1.200cargos sem backfill | PASS local |
| IA/histórico técnico | direct (reclassificado) | Nova finalidade no escritor existente, mesmo segredo separado; tentativas sem PII, tokens desconhecidos nulos/API estimada0; nenhum débito comercial | PASS local |
| Auth/tenant | critical_transversal | Negativos anon,membro,inativo,outro tenant; somente Super em global; nenhuma service-role no cliente/modelo | PASS local |
| Score/matching/evidências | plausible_indirect | Fórmulas e pesos sem diff; fixtures trajetória/negação/ferramenta/histórico e normalização já existentes | PASS local |
| UX Knowledge | direct | Três estados equivalentes/shell atual e mobile,19 checks; aprovação/recuperação manual | PASS local |
| VPS/Horus/serviços adjacentes | plausible_indirect | Baseline images/StartedAt/restarts em models/resources-before-release.txt; CPU/RAM limitados; pós ainda pendente | PARTIAL |
| Fontes/importadores/comercial | no_impact_identified | Só consulta mappings vigentes; nenhum importador,tarifa/reserva/pesos alterado; sem novo destino externo | PASS diff e regressão dirigida |

Diferença do mapa inicial: histórico de IA passou a `direct`; finalidade nova foi adicionada ao escritor original, sem mudar tarifas nem o contrato de custo. Sem QA remoto separado: clone lógico local PostgreSQL17, funções dependentes já implantadas, fixtures transacionais e rollback. Clone físico inicial falhou por arquivo ausente no baseline descartável; schema lógico preservou baseline. Falhas intermediárias foram corrigidas antes do PASS (ambiguidade SQL de variável e ajustes de fixtures aos limites/identidades atuais), sem alterar dados produtivos ou restrições para acomodar teste.

## Fidelidade visual

Referências preservadas em `evidence/occupational-rag-v320/references`; dados fictícios Arquiteto de Revenue, definição/Revenue Architect/Operações de receita e Empresa demonstração. Mesmo viewport1600×1100; mobile430×1100. Renders `*-recognition.png`, `*-company.png`, `*-global.png`; inspeção visual acompanha checks funcionais.

Topologia, hierarquia, agrupamentos, ordem e ações preservados. Adaptações delegadas D-UX/A-02: shell real288px versus ilustrativo250px, componentes/tokens atuais, seletor explícito associar/criar e justificativa opcional na revisão; tela mais alta mantém aprovação ao fim. Barra de demonstração/navegação ilustrativa não entra no produto. Nenhuma cópia de texto/estatística fictícia para produção. Sem divergência estrutural material identificada. Screenshots são de componentes reais com serviços sintéticos, não evidência de curadoria real em produção.

## Qualidade e limites dos modelos

ADR-089 registra resultados e fontes oficiais/licenças. Artefatos brutos em `models/`: falhas iniciais de referência preservadas; codec ajustado. Ensaio final4B:3/4 decisões esperadas e4/4 propostas sustentadas; Revenue ambíguo, sem promoção automática. BGE seis controles positivos corretos; Revenue recuperou software architect e **não** é contado como acerto, apesar do marcador exploratório bruto. Sem prova de recall de todas as bibliotecas. Latência85–102s por geração e~30s de expansão; serviço em segundo plano. Pico de memória/reclaim no limite5GiB, sem OOM; manter contenção.

## Validação e publicação

Evidência SQL `sql/verification.txt`/`environment.json`, browser `browser/checks.json`, modelos/digests/resources em `models/`. Typechecks/backend/web, build web e testes dirigidos locais passam; warnings de chunks grandes/import dinâmico preexistentes, sem falha. Testes release/context/worker69 e depois72 incluindo checker de contexto;28 regressões Knowledge/matching. Sem suíte integral local; CI obrigatória ainda será comprovada. Divergências contratuais: nenhuma alteração de comportamento aprovada foi retirada; resultado ambíguo do modelo permanece limite explícito.

Git/main/SHA, CI, versão remota de migration/fingerprint, imagens/health e smoke serão preenchidos no recibo operacional antes do encerramento. Rollback no ADR/runbook, preservando banco/histórico. Trabalho preexistente não rastreado permanece fora da entrega.
