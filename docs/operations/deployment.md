# Deployment

## Estado

O projeto Supabase `ioldpnqqvobprjiontre` é o único backend remoto e o ambiente atual de produção. O nome `Prisma-QA` ainda pode aparecer como rótulo legado no painel, mas não identifica outro ambiente. Desde 2026-09-15, o frontend está implantado na VPS Hostinger em `https://prisma.hrtsolutions.com.br` e usa esse mesmo backend. O deploy web usa Docker, Nginx e Traefik com HTTPS via Let's Encrypt; o runbook reproduzível está em `deploy/README.md`.

Em 2026-09-17, por decisão explícita do Product Owner, somente o frontend foi reconstruído para desativar temporariamente chamadas Paddle na importação: `VITE_DOCUMENT_INTELLIGENCE_MODE=baseline`, preservando `VITE_PARSER_IA_MODE=hosted`. Commit implantado `9dfa4d4`; imagem anterior preservada como `prisma-web:rollback-before-baseline-20260917`. Supabase, gateway, workers, modelos e volumes não mudaram. O bundle publicado e a tela autenticada confirmaram a configuração; a importação real pós-rollout ficou para teste do Product Owner.

Decisão posterior do mesmo dia determina retirar também o Tesseract da importação automática. A revisão `ae9d46c` usa `nativeOnlyForParserIa` nas três entradas do fluxo, preserva todas as páginas PDF.js e segue diretamente ao Parser IA; falha da IA não oferece continuação local. O OCR manual por região continua disponível na revisão. Somente `prisma-web` foi reconstruído e recriado; site HTTP 200, container ativo sem restart e tela autenticada de Pessoas carregada. Supabase, gateway e workers não mudaram. Rollback preservado como `prisma-web:rollback-before-native-only-20260917`. A importação real pós-rollout permanece pendente para provar ausência de chamadas OCR e qualidade final.

Decisão seguinte de 2026-09-17 remove o teto financeiro interno de US$ 2 do Parser IA. A revisão `42510b1` foi publicada no frontend e gateway e o worker local foi reiniciado. O ledger existente permanece como histórico, sem consulta ou reserva; saldo e limites da conta OpenAI são a autoridade financeira. Tamanho, timeout, serialização, cache, vínculo de organização e ausência de retry permanecem. Site 200; containers sem restart; bundle com commit e mensagens novas; worker loopback, túnel e credencial verificados sem documento nem chamada paga. Imagens anteriores: `prisma-web:rollback-before-parser-billing-20260917` (`sha256:f99c253d...`) e `prisma-paddle-gateway:rollback-before-parser-billing-20260917` (`sha256:b93d2d32...`).

Na importação autenticada posterior do currículo de Julia, PDF.js e Parser IA concluíram em 20,8 s, sem Paddle ou Tesseract, mas a persistência atômica rejeitou o rascunho pela constraint `extraction_drafts_structured_summary_shape_check`. O log mostrou um rótulo visual `(LinkedIn)` incorporado à URL do perfil; o normalizador anterior preservava esses caracteres e tornava o campo incompatível com o contrato já vigente. A correção remove somente esse rótulo antes da validação e transforma qualquer endereço ainda inválido em campo nulo com pendência humana, preservando fatos e evidências originais. Não altera banco, prompt, modelo, transporte ou política de revisão.

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

### Correção de transporte Parser IA — 2026-09-16

Bruno autorizou explicitamente atualizar o gateway e reiniciar o Parser IA após o reteste de Ivan. O isolamento de capacidade `7aa8c53` foi implantado somente no gateway; rollback preservado como `prisma-paddle-gateway:rollback-before-7aa8c53`. O worker foi reiniciado em loopback, sem operação ativa, e recebeu telemetria opcional de código fixo/status/duração, sem payload, organização, hash, cabeçalhos ou segredo. O reteste mostrou `403 PARSER_LOCAL_ONLY` antes da OpenAI. Teste HTTP real reproduziu o descarte de Host pelo fetch; o transporte do gateway passa a usar `node:http.request`, preservando `Host: 127.0.0.1:8787` através do túnel 18787, sem afrouxar a validação do worker. Somente loopback HTTP é aceito, redirects são recusados, AbortSignal e limites permanecem; não há nova dependência ou mudança de contrato persistido. Referência: [HTTP do Node](https://nodejs.org/api/http.html#httprequesturl-options-callback). Regressão dirigida: 31 testes aprovados; rollout deste segundo ajuste e reteste autenticado ainda pendentes neste registro.

Fechamento do rollout: `9d4375b` está ativo no gateway (imagem `sha256:b93d2d3285bf263d6db4cfde4bd365e919a04739274de5d774b42fbe6bae9d46`), sem alteração de frontend ou banco. Smoke sem sessão retornou 401; reteste autenticado de Ivan retornou 200, `PARSER_OK`, em 34.053 ms no worker. Ledger confirmou nova chamada, US$0,0120815, resultado parcial com evidências. A tela chegou à identificação; não se decidiu criação/vínculo nem publicação. Rollback anterior continua preservado. O timeout do Paddle e a validação integral da sequência permanecem pendentes, não cobertos por esse reteste da leitura preservada.

## Git

Branches de trabalho usam `codex/`. Commits são coerentes e não misturam mudanças pessoais. Push e ref remota só podem ser confirmados quando remoto existir. Merge não substitui evidência de ambiente.
