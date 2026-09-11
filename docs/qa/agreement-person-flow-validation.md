# Contrato de Acordos: validação reproduzível do fluxo da Pessoa

- Versão: 1.0.0; estado: agreed; data: 2026-09-11.
- Product Owner: Bruno. Evidência: pedido explícito "Pode executar" após alinhamento de uma entrega única para importar currículo → revisar → publicar → consultar Perfil.
- Baseline: `e8fb794f04faff41b240210dd497804e74eb8a5d`.
- Este registro formaliza o escopo aprovado na conversa, sem atribuir ao usuário aprovação prévia de um documento que ainda não existia.

## DEVE

- D-01: reutilizar os testes e ferramentas existentes, organizar seleção explícita do fluxo e preservar o comando de todos os testes.
- D-02: fornecer um comando reproduzível com compilação atual, verificações de aplicação/web e testes pertinentes, incluindo limites e negativos de segurança.
- D-03: fornecer cenários sintéticos reinicializáveis para importação, revisão parcial, omissão/remoção explícita, contato privado, projeção publicada, descarte e falha.
- D-04: produzir medição inicial por fase, resultado e identificação da execução; falha, timeout ou ausência de teste nunca contam como PASS.
- D-05: separar comportamento local, inspeção de contratos e prova conectada; documentar comandos, cobertura, próximos usos e recuperação; atualizar Context Pack e entregar commit/push.

## PROIBIDO

- P-01: mudar regras de produto, código runtime, schemas, migrations, permissões ou decisões humanas para fazer testes passarem.
- P-02: usar dados reais, credenciais, LLM ou serviços remotos; declarar execução de RLS/publicação SQL ou smoke visual a partir de testes locais.
- P-03: executar o gate integral sem autorização específica, remover testes existentes ou selecionar silenciosamente uma suíte curta como suficiente para mudança transversal.
- P-04: apagar trabalho alheio ou gravar conteúdo de currículos, env, tokens ou stdout de testes nos relatórios de medição.

## FORA DE ESCOPO

- F-01: novas funcionalidades, rollout, benchmark Paddle com currículos reais, teste visual autenticado, banco descartável/containers novos e automação de QA remoto.
- F-02: promessa de economia, comparação entre modelos e acompanhamento recorrente. A medição atual é uma referência inicial; ganho exige observações posteriores.

## AUTONOMIA

- A-01: nomes dos comandos, divisão dos grupos de teste, dados sintéticos e formato de relatório metadata-only, sem novo framework/dependência.
- A-02: correções no executor e suas provas, documentação e passos administrativos da mesma entrega.

## PENDÊNCIAS

Nenhuma para implementar e validar a estrutura local. Operações futuras de QA exigem escopo e dados autorizados; não são necessárias para comprovar esta ferramenta local.

## CRITÉRIOS DE ACEITE

- CA-D01: listar a seleção, incluir revisão/publicação/segurança, rejeitar suíte desconhecida ou fonte ausente; seleção sem filtro continua incluindo testes de outros domínios.
- CA-D02: executar build de testes uma vez, typecheck web, build web e pacote do fluxo, com resultado verificável.
- CA-D03: PF-01..PF-06 exercitam funções reais de domínio e fixtures independentes; snapshots aprovados são entradas de projeção, não simulação de persistência.
- CA-D04: testes do executor cobrem falha, timeout, sinal, saída não zero e falha de preflight; relatório único contém duração, commit/dirty, seleção, versão e limites.
- CA-D05: runbook e AoT distinguem cada classe de evidência; checks do Context Pack passam; branch enviada sem produção ou merge funcional.

## Referência de execução

Aplicar integralmente este contrato 1.0.0 com a seleção explícita em `scripts/test-suites.mjs`, cenários em `tests/personFlowScenarios.test.ts` e fechamento em `aot-person-flow-validation.md`. Não adicionar infraestrutura externa se um limite conectado aparecer.
