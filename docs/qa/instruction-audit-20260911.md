# AoT: auditoria e revisão das instruções

- Contrato: instruction-audit-20260911, versão 1.0.0.
- Estado do acordo: agreed. Aprovação: Bruno solicitou aplicar as alterações sugeridas após a auditoria, nesta tarefa, em 2026-09-11.
- Escopo: 32 achados de instruções globais/pessoais, skills, AGENTS e documentação do Prisma. Não é execução do redesign nem alteração de produto.
- Baseline do repositório: `7cfd22bc963c2abc49d9242156c7f53c9c799778`.
- Execução: aplicar os achados abaixo por edição editorial, referências temáticas e validação proporcional. Esta matriz registra o escopo aprovado; não inventa uma aprovação formal separada que não ocorreu.

## Acordos, implementação e critérios de aceite

Para cada D-n, CA-n é a comprovação documental/técnica indicada na última coluna. PASS significa melhoria instrucional implementada, não ganho comportamental medido do modelo ou validação do produto.

| ID | Alteração aprovada | Implementação / CA e evidência | Status |
| --- | --- | --- | --- |
| D-01 | Retirar histórico não pertinente da carga global | AGENTS global enxuto; arquivos privados temáticos e backup integral | PASS |
| D-02 | Não perpetuar pedidos temporários | Relatórios, slides e testes de resposta objetiva classificados como histórico, não comandos ativos | PASS |
| D-03 | Distinguir histórico e fatos mutáveis | Avisos de data/verificação e CSV contextual; sem declarar fatos antigos como atuais | PASS |
| D-04 | Consolidar duplicidades e texto vago | Preferências de comunicação explícitas; travessão com escopo definido | PASS |
| D-05 | Separar análise gerencial, execução e orientação manual | AGENTS global e Prisma §7 preservam autorização e passo a passo quando solicitado | PASS |
| D-06 | Corrigir descrição da origem do conhecimento | Fontes fornecidas, repositório, memória, fonte pública e inferência distinguidas | PASS |
| D-07 | Separar evidência de autoridade | AGENTS §3 e Context Index; bug observado não sobrepõe acordo | PASS |
| D-08 | Distinguir dados não confiáveis de contratos designados | AGENTS §4 preserva autoridade explícita, sem promover dados a instruções | PASS |
| D-09 | Limitar bloqueio a gates necessários | AGENTS §4 mantém segurança fail-closed e caminho manual para ausência opcional | PASS |
| D-10 | Preservar navegação útil | AGENTS §2, ADR-030 com histórico, ADR-048 e catálogo de contratos alinhados | PASS |
| D-11 | Evitar renegociar correção já acordada | AGENTS §11 permite acordo existente + delta autorizado | PASS |
| D-12 | Permitir incorporação íntegra por referência | AGENTS §13, template de acordo e protocolo: caminho e versão/revisão + leitura completa | PASS |
| D-13 | Tornar geração de contexto condicional | AGENTS §4: material/fontes alteradas, não respostas somente leitura | PASS |
| D-14 | Encerrar pesquisa quando suficiente | AGENTS §5: fonte condicional, evidência suficiente, reutilização interna e decisão já aprovada | PASS |
| D-15 | Clarificar risco e isolamento | AGENTS §6/9: investigação não implica E; branch por risco; worktree não é nova raiz canônica | PASS |
| D-16 | Separar agente de desenvolvimento e IA de produto | AGENTS §6 e model-policy; sem troca fictícia ou dispensa por nome de modelo | PASS |
| D-17 | Remover sucesso pré-preenchido | AoT template começa NOT TESTED e exige verificar desvios | PASS |
| D-18 | Separar status, ambiente e limitações | Protocolo/matriz histórica normalizados; nenhuma evidência nova atribuída ao M5.4.6 | PASS |
| D-19 | Inventariar prompts reais | Registry: três templates, schemas, parâmetros, hashes e revisão imutável conferidos com o código | PASS |
| D-20 | Versionar e contextualizar o prompt histórico | Prompt/spec 2.0.0, baseline Git e quatro referências visuais explicitamente não recuperadas | PASS |
| D-21 | Reduzir leitura inicial obrigatória | Prompt e Context Index roteiam material pertinente, sem ler todos os owners | PASS |
| D-22 | Consolidar repetição do redesign | Especificação CP-01..12 mapeia todas as seções 0..125; original preservado no Git | PASS |
| D-23 | Separar requisitos e opções | Spec distingue capacidades existentes, proibições e alternativas de engenharia | PASS |
| D-24 | Tornar aceites verificáveis e limites explícitos | Spec cobre estados, IDs, viewports, acessibilidade, consultas e prova visual; sem SLA inventado | PASS |
| D-25 | Atualizar validação e shell do prompt | Testes focados; validate integral só com aprovação específica; comando PowerShell | PASS |
| D-26 | Restringir gatilho e publicação de QA | Skill qa separa relato autorizado de teste/diagnóstico e exige destino confirmado | PASS |
| D-27 | Retirar ferramentas/reprodução obrigatórias indevidas | qa permite exploração proporcional, evidência parcial explícita e referências sanitizadas | PASS |
| D-28 | Tornar entrevistas autocontidas | grill-me e grill-with-docs sem dependência de comandos ausentes; término e autoridade explícitos | PASS |
| D-29 | Restringir Supabase à tarefa pertinente | Skill pessoal com docs/changelog/testes condicionais e checks de segurança por fronteira | PASS |
| D-30 | Preservar ambiente e conexão | Skill separa SQL descartável local de QA/prod e não cria .mcp.json por ausência | PASS |
| D-31 | Carregar apenas modo visual necessário | Skill visualize conserva contrato de host e divide guias em referências por modalidade | PASS |
| D-32 | Evitar pesquisa ritual em texto fornecido | Skill openai-docs distingue análise textual, estado instalado e fatos atuais a verificar | PASS |

## Proibições, fora de escopo e autonomia

| ID | Limite | Evidência / status |
| --- | --- | --- |
| P-01 | Não alterar código, schema, dados, permissões ou runtime de IA | Diff limitado a Markdown e exportação gerada; PASS |
| P-02 | Não apagar história nem trabalho alheio | Original do redesign no baseline; históricos privados preservados; `.tmp.driveupload/` excluído da entrega; PASS |
| P-03 | Não enfraquecer tenant, segurança, aprovação humana ou produção | Revisão de AGENTS, proibições e ADR-048; PASS |
| P-04 | Não presumir resultados ou equivalência entre modelos | Templates NOT TESTED, registry com lacunas e limites abaixo; PASS |
| F-01 | Redesign funcional, QA/prod, dados reais e benchmarks de modelos | Nenhum acionado nesta entrega; PASS |
| F-02 | Memórias persistentes e histórico privado no Git | Memórias não editadas; conteúdo pessoal permanece fora do repositório; PASS |
| A-01 | Organização editorial e solução nativa de skills | Cópias pessoais e configuração nativa, sem alterar caches originais ou desconectar plugins |

## Validação final

Validação estrutural oficial das seis skills: PASS (`qa`, `grill-me`, `grill-with-docs`, `supabase`, `visualize`, `openai-docs`). O validador foi executado com UTF-8 e PyYAML temporário, sem dependência adicionada ao Prisma.

O catálogo nativo `skills/list`, em processo novo sob o perfil real do usuário, retornou as seis cópias pessoais habilitadas e nenhum erro; a versão de sistema de openai-docs apareceu desabilitada. Supabase/visualize originais têm seus caminhos exatos desabilitados na configuração; o processo CLI não os retornou. Isso não comprova recarga do catálogo já injetado na tarefa desktop atual.

Validações documentais finais:

- `pnpm run generate:prisma-context` e `pnpm run check:prisma-context`: PASS; cinco fontes canônicas verificadas, exportação gerada pelo script oficial.
- Três hashes de `instructions` recalculados contra o registry: PASS.
- Verificação de cobertura das seções históricas 0..125, presença de CP-01..12, rastreio D-01..32 e ausência de PASS pré-preenchido no template: PASS. Cobertura numérica é verificação estrutural, complementada pela revisão editorial; não prova desempenho de modelo.
- Preservação dos 213 registros originais nos arquivos privados temáticos, prefixo integral da configuração anterior, entrypoints originais e links locais das skills: PASS.
- Lint focado nos 16 documentos da entrega e `git diff --check`: PASS. Scripts auxiliares de auditoria ficam em `tmp/instruction-audit/`, ignorado pelo Git.
- Não executados: `pnpm run validate`, testes de produto, chamadas LLM, smoke de QA e benchmark entre modelos. O diff é documental; essas superfícies não foram alteradas.

## Git, ambiente e recuperação

Branch: `codex/instruction-audit-20260911`, derivada do baseline acima. A entrega Git contém somente documentação do Prisma; preferências e skills pessoais não pertencem ao repositório. Nenhum deploy, merge em branch funcional ou acionamento de produção integra esta entrega.

Histórico global e backups das skills/configuração ficam no perfil privado do usuário, em `.codex/instruction-history/2026-09-11-audit/`; as cópias locais têm `references/local-maintenance.md` com origem e recuperação. A configuração original é preservada, sem exibir seu conteúdo em documentação pública. Reiniciar o Codex ou iniciar sessão que recarregue as instruções é necessário para aplicar toda a revisão ao contexto; atualização futura do caminho de um plugin exige conferir duplicidades.

## Limitações e desvios

Nenhum desvio de escopo identificado na revisão documental. O registry agora explicita lacunas de golden baseline/QA/rollout já existentes; preenchê-las exigiria outro trabalho, não aprovação presumida. As quatro imagens históricas do redesign não foram recuperadas; o prompt exige recuperá-las na execução correspondente. Não foi medido ganho, perda ou equivalência entre GPT-6 e GPT-5.6 Sol. A redução textual não é prova de desempenho.
