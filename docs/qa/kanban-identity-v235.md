# Correção de identidade do Kanban — v2.3.5

Contrato e execução v1.0.0, 10/10/2026. Autoridade: reclamação de Bruno sobre a tela publicada, correção do escopo anterior e autorização permanente AGENTS.md seção 7. Baseline main `38d4940fae723545bf24620d1ba00e3399b6f85b`, runtime 2.3.4 `07ab173`. Screenshot fornecido `codex-clipboard-6a1caaf6-6b20-4a9d-9f6a-c2ab4265e1ac.png` é contraexemplo. Reutilizar composição aprovada de `agreement-compact-follow-up-cards.md` v1.0.0; CSS grid existente basta. Classe B, somente apresentação; versão patch 2.3.5.

## Acordo

- D-01: corrigir auto posicionamento da grade do card; checkbox/avatar ocupam a região esquerda, nome/cargo/localização a região central flexível e alça/score a direita. Manter conteúdo completo e quebras naturais, score quadrado de50px, rodapé lado a lado. Desktop/mobile preservam composição compacta aprovada.
- D-02: preservar seleção para avaliação, score/proveniência, detalhes, cinco etapas, arraste e Mover etapa; nenhuma ação passiva ou alteração de dados. Validar nome/cargo longos e ausentes, desktop/mobile sem corte/overflow.
- D-03: publicar patch 2.3.5 em main/produção com plano web-only, CI, rollback e smoke; sincronizar documentação.
- P-01: não alterar backend/IA/matching/processo/dados/permissões nem esconder conteúdo ou retirar checkbox para mascarar o erro.
- F-01: redesign de página, filtros/indicadores e novos fluxos de avaliação.
- A-01: posicionamento explícito no grid e espaçamento; testes proporcionais com fixture existente e sem dependência nova.
- Q: nenhuma decisão material pendente.
- CA-01: reprodução antes/depois, geometria da identidade e quadrado/alça, conteúdo, seleção e ações em2048/1448/768/390/320, incluindo referência Bruno56/Diego62 e cargo longo.
- CA-02: regressão de seleção/detalhes/etapas/score; tipos/build/contextos/CI, SHA/versão/rollback e serviços preservados.

## Mapa de impacto antes da implementação

| Área | Relação | Baseline / preservação / regressão |
| --- | --- | --- |
| Grid de identidade no Kanban | direct | quatro filhos para três tracks; reprodução mostra texto no track50px; render/medição antes/depois |
| Seleção/score/alça/rodapé/mobile | direct | DOM e callbacks existentes; geometria/conteúdo/seleção/Mover etapa/detalhes |
| Lista/drawer/Pessoas encontradas | plausible_indirect | CSS scoped ao pf-card-top; modo Lista/detalhe e ausência de mudança nos estilos dos outros cards |
| Dados/tenant/IA/backend | no_impact_identified | apenas CSS/layout/versionamento; diff sem alteração de serviços, RPCs ou escrita |
| Registry/contextos/release | direct | 2.3.4 → patch2.3.5; plano/checks/CI/smoke/rollback |

## Execução congelada

Aplicar integralmente D/P/F/A deste arquivo v1.0.0. Preservar contrato anterior de cards compactos; corrigir posicionamento dos quatro filhos sem redesign ou nova regra de negócio. Renderizar mesma fixture/viewport e medir região do texto, não apenas ausência de overflow. Testes sintéticos não comprovam leitura de Pessoas reais.

## AoT

Registro inicial antes de implementar: implementação, evidências e rollout pendentes. Fechamento operacional comprovado na seção final abaixo.

### Implementação e QA local

Grid scoped em positionFollowUp.css posiciona cada filho explicitamente: avatar/checkbox no track esquerdo, identificação no centro flexível, alça/score no direito. Sem alteração de DOM, handlers ou serviços. Diff de d8fc7fb confirma adição do checkbox em2.3.2 sem mudança dos três tracks. Regressão persistiu em2.3.4; os testes anteriores de overflow/quadrado não mediam largura da identidade. A nova prova mede essa área e falha para o baseline.

| ID | Implementação / prova | Status |
| --- | --- | --- |
| D-01 | 15 cenários (2048/1448/768/390/320 × referência/longo/ausente), imagens mesma fixture/estado/viewport; identidade50px antes e158/162/478/200/130px depois | PASS local |
| D-02 | checkbox, nome/cargo/cidade completos, score50×50, detalhes e alternativa de etapa; arraste real em1448 e Mover etapa em390 preservam scores; zero mutações passivas | PASS local |
| P-01 / F-01 | CSS restrito ao card, registry e documentação; nenhum backend/IA/dado/permissão modificado | PASS local |
| D-03 | tipos/build/contextos/plano/CI, SHA/versão/CSS/assets/rollback e preservação de serviços | PASS operacional, evidências na seção final |

Tipos web e build web PASS; avisos preexistentes de tamanho/import dinâmico permanecem. Browser PASS nos15 cenários, incluindo interação explícita. UI real, fixtures sintéticas existentes, zero uso de Pessoas reais ou IA. Evidência em evidence/kanban-identity-v235. Sem mudança de regra de negócio ou desvio material do acordo. Produção ainda2.3.4 até publicação confirmada.
Regressão Node: 11 testes positionFollowUp/productRelease PASS. Root build, tipos web e build web PASS. Context Pack gerado/checker PASS em snapshot do index selecionado, preservando arquivos alheios não rastreados.

### Fechamento operacional

Publicado em10/10/2026, main/origin/runtime web `9212c5c5a865f22eff756ff516f6117e866a3567`, v2.3.5. CI branch38079903273 PASS. Plano/dry-run limitados ao web, nenhum backend.22 checks de produção e18 HTTP200 PASS: CSS posicionando identidade/checkbox/aside, versão e SHA no bundle, arquivos novos/anteriores preservados, rollback correspondente ao runtime2.3.4 e seis containers adjacentes com IDs/imagens/status/restarts/health idênticos. Login público real renderizou v2.3.5 sem erro. Evidências: release-plan/dry-run/verify, ci-branch, production-before/after/public-browser e screenshots.

O probe imediato do dispatcher encontrou404 durante recriação (remoto22/local1); não houve recibo de publish bem-sucedido. Verificação independente após estabilização PASS, sem segundo build. release-recovery.json preserva esse limite; não se transforma a falha transitória em prova de sucesso do comando. Experimento paddle-vl-llama-test já estava unhealthy e permaneceu assim, sem intervenção.

Todos os D/P aplicáveis PASS nos limites descritos; nenhum desvio material residual. Foi corrigida a falha da validação anterior com teste de largura e posicionamento da identidade. QA usa dados sintéticos; leitura real autenticada continua NOT TESTED, não se escreveu dado humano para demonstrar o visual. Fontes/decisões/Score não foram alterados. Fechamento documental integra/sincroniza por fast-forward sem rebuild; runtime funcional permanece9212c5c. Trabalho alheio preservado.
CI main38079976474 também PASS para o mesmo SHA funcional; registro ci-main.json. Fechamento web-only confirmado.
