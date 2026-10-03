# Contrato de Acordos — Prisma v2.0.2: evidências da importação

Versão 1.0.0, `agreed`, 2026-10-03. Autoridade: Bruno aprovou as cinco melhorias propostas no diagnóstico e autorizou “será a versão 2.0.2”, “implementar tudo em main e publicar”. Este contrato registra esse escopo sem nova decisão de produto. Correção classe D do adaptador existente, com migration aditiva; reutiliza ADR-049, ADR-075 e a revisão humana existente.

## DEVE

- D-01 — Compatibilizar a saída do Parser com a persistência e a abertura da revisão para todas as categorias já aceitas: campos simples, listas, experiências, formações, resultados, ferramentas/tecnologias, contextos profissionais e títulos/itens de seções adicionais. Preservar valores, fontes e regiões separadas; IDs do modelo são convertidos deterministamente para os contratos existentes quando necessário.
- D-02 — Validar caminhos, existência do alvo, arrays, limites e geometria antes de enviar a extração, mantendo validação autoritativa equivalente no banco. Falha não pode descartar evidência silenciosamente, criar Perfil ou aprovar dados.
- D-03 — Registrar a falha da importação com diagnóstico estruturado sanitizado: contrato, etapa, motivo, campo quando permitido, página/índice, código e versões. Reutilizar evento transacional existente com autorização tenant-scoped; não registrar texto do currículo, respostas/prompt ou segredo. Distinguir falha transitória de incompatibilidade interna.
- D-04 — Corrigir mensagens, ações e progresso: persistência faz parte da estruturação; revisão só é alcançada depois da gravação. Falha permanente orienta atualização/correção do sistema, sem recomendar repetição imediata ou troca de PDF válido; falha temporária permite nova tentativa humana. Conteúdo parcial continua explícito, sem ser apresentado como Perfil completo.
- D-05 — Preservar e recuperar tentativas interrompidas pelo original e cache já vinculados a organização/hash/versões, sem nova IA automática, duplicação de Pessoa, descarte do histórico ou publicação. Revalidar o cache com o adaptador corrigido; a importação do incidente só pode avançar até revisão, sem inventar decisões humanas.
- D-06 — Publicar v2.0.2 na fonte única de versão, integrar o SHA validado em main/origin/VPS e aplicar somente as superfícies exigidas: migration, Parser e web. Preservar rollback, gateway e serviços alheios.

## PROIBIDO

- P-01 — Relaxar auth, papel, tenant, vínculo de fonte/hash, método/origem, geometria ou limites para aceitar dados inválidos; usar produção como banco descartável de testes.
- P-02 — Alterar prompt/modelo, fazer inferência paga para validar a correção, publicar Perfil, confirmar classificação ou criar decisão humana; apagar cache/histórico ou repetir IA automaticamente.
- P-03 — Colapsar listas/regiões, descartar títulos/evidências, substituir categorias por equivalências semânticas inventadas, alterar Pessoas/Perfis alheios ou trabalho local não relacionado.

## FORA DE ESCOPO

- F-01 — DOC/DOCX/TXT, OCR/Paddle, matching/score, taxonomias/Knowledge, concorrência/fila, arquitetura nova e reprocessamento em lote.
- F-02 — Redesenho das telas ou ampliação do esquema de Perfil. Ferramentas/contextos continuam categorias existentes; revisão e apresentação só recebem o necessário à compatibilidade e preservação.

## AUTONOMIA

- A-01 — Engenharia escolhe normalização determinística de IDs, organização de validadores, metadados seguros, testes e migration forward-only compatíveis com as estruturas existentes, sem dependência nova.
- A-02 — Branch isolada `codex/`, commit/push/CI, fast-forward para main, QA descartável, deploy seletivo e smoke. Reaproveitar cache do incidente para prova sem custo; nenhuma aprovação/publicação humana é fabricada.

## PENDÊNCIAS

Nenhuma decisão material aberta no escopo aprovado. Se surgir alternativa que mude significado, autoridade ou custo, interromper somente essa parte e consultar o PO.

## CRITÉRIOS DE ACEITE

- CA-D01 — Matriz de todos os caminhos do Parser, IDs curtos/maiúsculos/máximos e listas; persistência e abertura/reabertura da revisão em PostgreSQL com seções e evidências preservadas. Replay do incidente sem inferência deve manter as 39 evidências e as duas seções.
- CA-D02 — Negativos de alvo inexistente, array inválido, limite, geometria/método/origem, tenant/papel/hash; nenhum dado inválido é persistido. Prova de rollback atômico.
- CA-D03 — Falha de contrato versus indisponibilidade tem motivo/recuperação distintos; diagnóstico só contém metadados permitidos. Evento, permissões e ausência de texto/PII comprovados.
- CA-D04 — Testes dos estados e ações, render de falha permanente/transitória e revisão; mesma topologia existente em desktop/mobile. Imagem do incidente é contraexemplo de estado, não referência para redesenho.
- CA-D05 — Cache antigo revalidado, identidade e idempotência preservadas; retry humano sem nova IA quando cache existe. Perfil aprovado permanece intacto; recuperação termina em revisão sem publicação.
- CA-D06 — Registro/histórico v2.0.2, testes dirigidos, SQL QA, typecheck/build/lint/Context Pack, CI; migration ativa e SHA/imagens/HTTPS/versão/readiness verificados. Limitações do smoke ficam explícitas.

## Mapa de Impacto e Preservação

Baseline: main local/origin/VPS `e55c2b7` documental, runtime v2.0.1 `4ccfbf1`; Parser running/healthy e banco único `ioldpnqqvobprjiontre` em produção. Diagnóstico read-only por hash: uma página, 31 fatos aceitos pelo Parser, 39 evidências com geometria válida, 3 experiências/2 formações/2 seções; títulos rejeitados pela RPC ativa. Outros caminhos incompatíveis comprovados por fixture sintética. Não existe ambiente remoto QA separado; QA será PostgreSQL local descartável, nunca reset/fixture persistida na produção.

| Capacidade | Relação | Preservação / baseline | Regressão proporcional |
| --- | --- | --- | --- |
| Parser/adaptador/cache | direct | prompt/modelo/cache key e suporte textual existentes | matriz, replay antigo, cache sem rede, IDs e negativos |
| Persistência/abertura da revisão | direct | RPC tenant-scoped, transação, fontes/39 evidências | SQL QA real, negativos, rollback, carga/reabertura |
| Mensagens/progresso/recuperação | direct | jornada e original preservado; erro interrompe gravação | teste funcional e renders desktop/mobile |
| Diagnóstico/auditoria | direct | evento existente; sem PII; erro original não chega bruto à UI | allowlist, autorização e prova transacional |
| Auth/tenant/publicação | critical_transversal | nenhuma decisão de aprovação automática | negativos de papel/tenant, Perfil vigente preservado, sem publicação |
| Versão/Parser/web/hosting | direct | deploy seletivo, rollback, gateway saudável | plano, CI, IDs/imagens, assets e readiness |
| Gateway/Traefik | plausible_indirect | transporte e configuração inalterados | regressão dirigida auth/readiness e smoke anônimo |
| Matching/score/Knowledge/OCR | no_impact_identified | sem consumidor novo/reclassificação; contratos e deploy excluídos | revisão do diff e plano; nenhuma Edge/LLM/reprocessamento alheio |

O AoT distingue novidade e preservação; não declara PASS quando falta prova obrigatória.
