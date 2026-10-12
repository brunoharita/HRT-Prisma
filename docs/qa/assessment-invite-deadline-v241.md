# Acordo, execução e AoT — Prazo e mensagem do convite, correção2.4.1

Acordo v1.0.0,11/10/2026. Autorização explícita de Bruno nesta conversa; baseline a33e3db5347c677e6ee78156b9d6fa9f0f560f80. Risco C: frontend com reaproveitamento da proteção existente no servidor; testes negativos locais da fronteira. Sem migration/Edge novas e sem nova entrada no registro de versões.

## Acordo congelado e execução

- D-01: Prazo de acesso por1/3/7/14/30dias (padrão7), ou data específica. Dias são calendários a partir da escolha; data resolvida fica fixa, inclusive em retry. Até23:59 no horário de Brasília, incluindo segundos finais do dia; armazenar23:59:59.999 com fuso convertido corretamente. Sem edição de hora. Preservar validação de futuro e máximo90dias do servidor.
- D-02: Candidato deve concluir e enviar dentro do menor limite entre duração iniciada e acesso. Sem submissão concluída, mostrar Não realizada · prazo encerrado quando esse limite terminar; preservar estado persistido, respostas parciais/histórico e avaliações submetidas/canceladas. Servidor continua autoridade; consulta não cria decisão ou escrita.
- D-03: Mensagem padrão especifica o nome da Posição do workspace. Permitir personalizar e preservar texto editado ao atualizar/falhar/repetir; contexto novo recomeça com a Posição correta. Nome fornecido é texto, nunca HTML.
- D-UX-04: Preservar seleção/tabela de candidatos, prazo, personalização e CTA nessa ordem; adicionar rodapé com separação visual e espaçamento pelo menos20px do painel anterior, CTA à direita no desktop e largura disponível no celular. Screenshot é contraexemplo do espaçamento, não proposta de recomposição total.
- D-05: main/produção, destinos derivados do diff, CI, rollback, smoke e sincronização; provas desktop1448/768/mobile390/320 e limites explícitos.
- P-01: não mudar duração, prova comum, requisitos, regras de IA/cobrança, escolha humana, tenant, escritores, contratos persistidos ou histórico; não enviar/gerar automaticamente, nem considerar resposta parcial concluída.
- P-02: não alterar convites já emitidos, truncar mensagem, sobrescrever personalização no refresh ou mudar data resolvida no retry; não usar fuso do navegador para interpretar o limite.
- F-01: expurgo/avisos legais, alteração de SMTP/Resend, expiração persistida/agendamento, novos fornecedores ou redesign de toda a preparação.
- A-01: reutilizar Select/Input/date, CSS Prisma e conversão IANA interviewInstant existentes; rótulos, testes sintéticos e timer local de apresentação delegados. Nenhuma dependência nova.
- Q: nenhuma pendência.
- CA-01: datas, virada de mês/ano, calendário inválido, relógio/fuso do navegador, retry e limites em testes dirigidos; SQL rejeita start/load/save/submit vencidos sem resultado e preserva recibo concluído.
- CA-02: posição e personalização, seleção/lote/idempotência, nunca IA/envio por consulta, layout/teclado/mobile, tipos/build/contexto/CI; publicação e preservação operacional.

Implementar D-01..05, impedir P-01/02, preservar F-01; A-01 somente execução. D-01/02/03 refinam D-07/08 do acordo process-assessment-v232 v1.0.0; composição4A da preparação e prova comum permanecem.

## Mapa de impacto antes da implementação

| Capacidade | Relação | Baseline / preservação e prova |
| --- | --- | --- |
| Processo: convites/prazo/mensagem/CTA | direct | seleção/lote/retry e prazo explícito; fixture real, novos controles, mensagem/spacing e negativos |
| Aplicações/resultados individuais | direct | status/resposta/correção não mudam; indicação derivada de vencimento, recibo/cancelado preservados |
| Resultado compartilhado/avaliação individual legada | plausible_indirect | mesmo componente; testes de estados/data/respostas históricas |
| Conversão de fuso da entrevista | plausible_indirect | helper reutilizado, sem mudança em sua implementação; testes de conversão |
| Portal/servidor/tenant | critical_transversal | PostgreSQL já calcula least(expires_at,started_at+duration) e bloqueia antes de mutações; teste SQL descartável de rejeição e recibo |
| Preparação/IA/prova comum/cobrança/nav/loading | plausible_indirect | página compartilhada; regressão processAssessment dirigida, nenhum writer alterado/consulta gera envio |
| Banco/Edge/Parser/Synthesis/mail/serviços | no_impact_identified | sem alteração runtime dessas camadas; plano webonly e identidade operacional preservada |

PostgreSQL local verificado: import_evidence_v202,127.0.0.1:55479,prisma_v202_qa,people0 e position_assessments ausente. Fixture/rollback locais, sem dados reais. Baseline operacional de produção será revalidado antes de publicar.

## AoT

| Regra | Implementação | Teste / evidência | Estado |
| --- | --- | --- | --- |
| D-01 | assessmentInvitations, controles date/Select e conversão IANA existente | 5testes novos de calendário/fuso/limites/estado, browser56checks e regressão84checks, data no payload/retry/fuso Tokyo | PASS |
| D-02 | startedAt já emitido pelo RPC tipado; apresentação derivada e relógio sem IO, servidor preservado | 87asserts SQL locais com rollback, incluindo rejeição PA_EXPIRED em load/start/save/submit sem mudança de respostas/status/resultado e recibo concluído; browser atualiza status sem reload | PASS |
| D-03 | defaultAssessmentMessage(positionTitle), inicialização por contexto e preservação no refresh | mensagem padrão e personalizada/payload/retry nos quatro viewports; texto literal em teste Node | PASS |
| D-UX-04 | deadline-summary e footer process-assessment-send | imagens invitation/expired em browser/, medição gap≥20px e CTA mobile; revisão visual1448/390, sem overflow em4larguras | PASS |
| D-05 | publicação web derivada do diff | CI/produção/rollback/smoke/sincronização pendentes | PARTIAL |
| P-01/02 | nenhum writer/migration/Edge alterado; date/message estáveis, relógio somente visual | 15Node dirigidos (novos+processAssessment+positionFollowUp), SQL87 e browser56+84; IA/cancelamento/revisão/prova fixada/histórico/loading/retry preservados | PASS local |

Tipos frontend, build TypeScript e build Vite PASS. Evidências em `docs/qa/evidence/assessment-invite-v241/{browser,regression,sql}`. Screenshot fornecido é contraexemplo; comparação confirma ordem preservada e separação do CTA. Dados fictícios, sem envio real, chamada paga de IA ou escrita remota. Jornada autenticada de candidato real NOT TESTED. Sem desvio de contrato identificado; baseline/preservação operacionais aguardam publicação. Sem nova entrada de versão; correção2.4.1 conforme convenção do registro.
