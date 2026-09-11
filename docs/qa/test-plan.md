# Plano de testes

## Objetivo

Demonstrar comportamento, segurança, compatibilidade e explicabilidade proporcionalmente ao risco. Código que compila, migration que existe ou IA que responde não são evidência suficiente.

## Níveis

- Unit: regras, validação, estados, confiança, matching.
- Contract: versões, schema, provider, Context Pack.
- Integration: repository, banco, Auth, storage e provider quando existirem.
- Golden: extração, prompt injection, matching, empate e insuficiência.
- E2E: importação até resultado explicado.
- Security: autorização negativa, tenant, PII, documento malicioso, secrets.
- Operational: migrations, deployment, rollback, observabilidade e incidentes.

## Estratégia por risco

Classes A/B usam checks focados. Classe C inclui integração e regressão afetada. Classes D/E exigem teste negativo, ADR/contrato quando duradouro, QA-first, rollback e evidência nas áreas afetadas. A suíte completa do repositório só pode ser executada com autorização explícita do Product Owner, depois de explicar qual risco transversal não pode ser coberto por testes direcionados.

## Escopo proporcional e autorização

Os testes devem cobrir somente as áreas alteradas, as áreas comprovadamente afetadas e os cenários condizentes com a mudança. Testes de módulos sem relação causal com o diff não devem ser executados por padrão.

`pnpm run validate` é o gate completo da fundação, mas não é o gate automático de toda alteração. Sua execução exige autorização explícita do Product Owner e uma justificativa objetiva sobre o risco transversal, a regressão potencial e por que a validação direcionada seria insuficiente. Sem essa autorização, o agente deve executar apenas os checks proporcionais e registrar claramente o que ficou fora do escopo.

## Dados

Local e QA usam fixtures sintéticas ou anonimizadas. Dados reais exigem autorização, finalidade, base legal, minimização, acesso e retenção. Evidência de teste não copia PII integral.

## Automação atual

Para mudanças no fluxo importar → revisar → publicar → consultar Perfil, existe `pnpm run validate:person-flow`, descrito em [person-flow-validation.md](person-flow-validation.md). O pacote conserva revisão, publicação e negativos de segurança, gera duração por fase e não substitui integração PostgreSQL/RLS ou smoke de navegador. Seleção explícita exige análise dos consumidores afetados; não autoriza ignorar regressões fora do pacote.

`pnpm run validate` executa lint, invariantes de fundação, Context Pack, typechecks, build web, testes, golden tests e demo. A suite inclui guards, username/senha/celular, migrations M2-A/M2-B/M2-C/M5, currículo-first, PDF inválido, identidade insuficiente, Storage privado, idempotência, concorrência, revisão imutável, coordenadas normalizadas, aprovação atômica, auditoria sem conteúdo integral, Member sem documento bruto, releitura completa do bloco, aceite parcial e promoção controlada de padrão. O projeto remoto conectado deve comprovar Pessoa nova, vínculo existente, identidade insuficiente, Super Admin, Owner, Admin, Recruiter, Member, cross-tenant, coordenada inválida, DML direto revogado, aceite adaptativo atômico e promoção somente após aprovação. Desktop e viewport mobile precisam ser validados após qualquer alteração de layout. `pnpm run audit:dependencies` consulta advisories do registry.

Para M5.4, a suíte deve manter duas Vagas de mesmo título com requisitos diferentes, termo desconhecido privado à organização, relação Figma/UX apenas como sinal, ausência de idioma como `Sem evidência suficiente`, ordenação sem score, edição com nova versão e comparação de exatamente duas Pessoas. A prova SQL usa rollback e cobre autoria, ocupante, versão imutável, relação tenant-scoped e grants negativos. O smoke cobre lista, criação, assistência, detalhe, Pessoas e comparação em `1440x900`, `1280x720`, `768x1024`, `390x844` e `360x800`.

Para M5.5, a prova rica deve iniciar uma exclusão, simular Storage pendente sem falso sucesso, negar mutações concorrentes, retomar, remover todo o agregado individual, verificar zero resíduos, manter auditoria mínima com nome e preservar Knowledge, Item Bank, Vaga e usuários da plataforma. Matrizes separadas cobrem Super Admin, Owner, Admin, Recruiter, Member, cross-tenant, titularidade, token expirado/revogado/replayado e rejeição de assessment. O recadastro posterior precisa criar novo UUID e histórico vazio. O smoke público é somente leitura até a confirmação e não executa a exclusão visual sem confirmação humana de ação externa irreversível.

## Critério de promoção

Sem regressão não justificada, contratos compatíveis, segurança negativa aprovada, custo/latência dentro do budget, documentação/contexto atualizados, QA com evidência e aprovação explícita para produção.

## Evidência

Registrar commit, ambiente, versões, fixtures, comando, resultado, falhas, correções, limitações e timestamp. Snapshot de UI ou log não substitui assertiva reproduzível quando automação é possível.

## Rastreabilidade de acordos

Movimentos materiais usam o [Contrato de Acordos](agreement-contract-template.md) antes do Prompt Mestre e encerram com o [AoT](aot-template.md). Todo `D-*` possui critério de aceite e evidência; todo `P-*` material e testável possui prova negativa. Consulte o [protocolo de rastreabilidade](product-agreement-traceability.md) para estados, supersessão e critérios que impedem concluir uma entrega.
