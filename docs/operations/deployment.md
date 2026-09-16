# Deployment

## Estado

O projeto Supabase `ioldpnqqvobprjiontre` é o único backend remoto e o ambiente atual de produção. O nome `Prisma-QA` ainda pode aparecer como rótulo legado no painel, mas não identifica outro ambiente. Desde 2026-09-15, o frontend está implantado na VPS Hostinger em `https://prisma.hrtsolutions.com.br` e usa esse mesmo backend. O deploy web usa Docker, Nginx e Traefik com HTTPS via Let's Encrypt; o runbook reproduzível está em `deploy/README.md`.

Em 2026-09-16, o pipeline serial de importação foi ativado nesse ambiente: PDF.js, verificação semântica, Paddle condicional e Parser IA antes da revisão. O worker Parser e os dois workers Paddle permanecem no PC e escutam somente loopback; o gateway 1.1.0 valida sessão/tenant e usa túnel reverso ligado apenas ao loopback da VPS. O Supabase recebeu a migration aditiva de observabilidade com RLS. Imagens de rollback anteriores foram preservadas. Evidência e limitação do smoke autenticado ficam em `docs/qa/aot-production-resume-quality-pipeline.md`.

## Pré-requisitos

- branch e commit identificados;
- checks locais e CI aprovados;
- scripts de instalação de dependências revisados e decididos explicitamente em `pnpm-workspace.yaml`; o `postinstall` não funcional do `tesseract.js` permanece bloqueado;
- Context Pack gerado com finais de linha normalizados para produzir o mesmo hash em Windows e Linux;
- migration revisada e testada;
- secrets no ambiente correto;
- Context Pack atualizado;
- release checklist preenchido;
- rollback e owner definidos.

## Validação antes da produção

1. aplicar migrations em ordem;
2. executar advisors e testes RLS;
3. publicar backend/UI quando existirem;
4. executar smoke e matriz proporcional;
5. registrar commit, migration, configurações, versões de IA e evidências;
6. corrigir antes de solicitar produção.

Para fontes Knowledge, executar `pnpm run knowledge:prepare -- <cbo|esco> <diretorio> <versao> <data> <saida>`. Aplicar os lotes `stage-NNNN.sql`, executar `finalize-and-diff.sql`, revisar o diff e somente então executar repetidamente a instrução de `publish.sql` com o Super Admin que aprovou até `done = true`. Cada chamada processa um lote confirmado em transação própria; replays com o mesmo hash são idempotentes, a retomada preserva o cursor e divergência ou tentativa de sobrescrever versão publicada falham fechadas.

Evidência de 2026-09-13: o schema funcional acumulado e `20260914015642_m61_requirement_classification_invariant` estavam alinhados no repositório e ativos no projeto remoto. As dez Edge Functions presentes no repositório permaneciam `ACTIVE` e não foram alteradas naquele movimento. A prova M6.1 confirmou rejeição de requisito `unclassified`, contrato `vacancy-definition-1.2.0`, grant apenas para `authenticated` e wrapper legado sem execução; a Posição afetada foi corrigida por nova versão. O histórico remoto de migrations anterior a setembro contém timestamps diferentes dos arquivos locais equivalentes; a simulação oficial falha fechada sem executar SQL. Não reparar o ledger nem reaplicar migrations antigas sem um movimento específico de reconciliação com prova de equivalência. Essa evidência antecede o hosting do frontend iniciado em 2026-09-15.

## Produção atual

Não existe ambiente remoto separado de homologação. Toda alteração deve ser validada localmente e só pode seguir para o projeto único após autorização explícita de produção. O rollout exige confirmar backup ou recuperação aplicável, compatibilidade, janela, retenção, comunicação, rollback e smoke sem PII desnecessária. Uma futura separação entre homologação e produção permanece uma decisão de infraestrutura ainda não executada.

## Git

### Correção de transporte Parser IA — 2026-09-16

Bruno autorizou explicitamente atualizar o gateway e reiniciar o Parser IA após o reteste de Ivan. O isolamento de capacidade `7aa8c53` foi implantado somente no gateway; rollback preservado como `prisma-paddle-gateway:rollback-before-7aa8c53`. O worker foi reiniciado em loopback, sem operação ativa, e recebeu telemetria opcional de código fixo/status/duração, sem payload, organização, hash, cabeçalhos ou segredo. O reteste mostrou `403 PARSER_LOCAL_ONLY` antes da OpenAI. Teste HTTP real reproduziu o descarte de Host pelo fetch; o transporte do gateway passa a usar `node:http.request`, preservando `Host: 127.0.0.1:8787` através do túnel 18787, sem afrouxar a validação do worker. Somente loopback HTTP é aceito, redirects são recusados, AbortSignal e limites permanecem; não há nova dependência ou mudança de contrato persistido. Referência: [HTTP do Node](https://nodejs.org/api/http.html#httprequesturl-options-callback). Regressão dirigida: 31 testes aprovados; rollout deste segundo ajuste e reteste autenticado ainda pendentes neste registro.

Branches de trabalho usam `codex/`. Commits são coerentes e não misturam mudanças pessoais. Push e ref remota só podem ser confirmados quando remoto existir. Merge não substitui evidência de ambiente.
