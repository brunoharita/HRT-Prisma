# Evidência de QA da classificação acadêmica

## Escopo

Valida `education-academic-classification` 1.0.0 na extração determinística, revisão M5, publicação por Delta, Central da Pessoa e contexto de Documentos. Dados de teste são sintéticos; publicação conectada deve ocorrer em transação revertida.

## Matriz funcional

| Caso | Resultado obrigatório |
| --- | --- |
| Bacharelado, Licenciatura, Tecnólogo e Técnico | nível e qualificação distintos e compatíveis |
| MBA, Especialização, Mestrado, Doutorado e Pós-doutorado | nível `postgraduate` e qualificação específica |
| Pós-graduação genérica | nível explícito e qualificação `unknown` |
| Período com ano final | status `unknown` |
| `Atual` ou `Present` | `in_progress` inferido e revisável |
| Conclusão explícita | `completed` explícito |
| Texto ambíguo | valores `unknown`, sem invenção |
| Override humano | valor efetivo humano e snapshot original preservado |
| Mudança de nível incompatível | qualificação limpa para `unknown` |
| Perfil histórico | leitura com fallback `legacy-unclassified` |
| Delta acadêmico | prefixo qualificado e nome limpo correspondem ao mesmo registro |

## Segurança e contrato

- novas extrações e novos salvamentos falham sem shape acadêmico atual;
- publicação rejeita classificação presente e não confirmada;
- Member e cross-tenant continuam negados pelas políticas e RPCs existentes;
- nenhum grant foi ampliado;
- auditoria acadêmica é metadata-only;
- nenhuma confiança percentual ou decisão autônoma é criada.

## Smoke visual obrigatório

Validar M5, Central da Pessoa e Documentos em `1920x1080`, `1600x900`, `1440x900`, `1366x768` e `390x844`. Conferir ausência de overflow horizontal, leitura dos badges, reflow dos seletores, CTA de confirmação e visibilidade das pendências.

## Estado da execução

- Local: lint aprovado em 257 arquivos, dois typechecks, build web, 190 testes técnicos, 19 golden tests e demonstração `VERTICAL_SLICE_OK`.
- Prisma-QA: migrations `20260902122414_education_academic_classification` e `20260902125511_education_academic_classification_legacy_compatibility` aplicadas e registradas no histórico remoto.
- Prova conectada transacional: shape válido aceito; combinação incompatível rejeitada; payload histórico legível, mas impedido de entrar como extração atual; histórico explicitamente revisado aceito sem snapshot fictício; publicação não revisada rejeitada; identidade acadêmica do Delta preservada; funções privadas negadas a `anon` e `authenticated`; nenhuma tabela paralela criada. A transação terminou com `rollback`.
- Smoke autenticado: M5, Central da Pessoa e Documentos aprovados em `1920x1080`, `1600x900`, `1440x900`, `1366x768` e `390x844`, sem overflow horizontal. O M5 apresentou três seletores em colunas no desktop e uma coluna no mobile; a seleção de `Nível acadêmico` atualizou o caminho ativo de evidência. Nenhum descarte, salvamento ou publicação foi acionado.
- Casos deliberadamente não classificados: quatro formações do Perfil v1 e cinco registros da importação histórica de Bruno Harita permanecem `legacy-unclassified` até revisão humana, porque foram extraídos antes deste classificador. Nenhum backfill sem evidência foi executado.
- Resíduo externo ao movimento: `supabase db lint` continua apontando o erro histórico de cast do enum `knowledge_inbox_status` em `public.enqueue_knowledge_observation`. Não foi alterado porque pertence ao domínio Knowledge.
