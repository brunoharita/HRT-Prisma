# ADR-035: Resiliência operacional do piloto centrada na Pessoa

- Status: accepted
- Data: 2026-09-04
- Risco: E, mudança integrada de Pessoa, Documento, Revisão, Perfil, autorização e UX

## Contexto

O ciclo reversível anterior permitia publicar, restaurar, reiniciar e excluir, mas o operador ainda encontrava becos sem saída fora do fluxo ideal. Não era possível iniciar uma revisão diretamente de qualquer snapshot preservado, corrigir a Pessoa vinculada a um documento, resolver cadastros duplicados ou retirar temporariamente uma Pessoa da operação sem suporte técnico.

## Decisão

Reutilizar a Central da Pessoa, `profile_reviews`, `professional_profiles`, `document_operations`, Delta, RLS, locks e feedback operacional como uma única fronteira de recuperação:

1. toda revisão declara origem `document` ou `profile`; Perfil atual, versão histórica e documento preservado podem ser reutilizados sem modificar a fonte;
2. uma versão publicada permanece um snapshot autossuficiente, legível e restaurável mesmo depois da exclusão do documento original;
3. corrigir a Pessoa de um documento move atomicamente o documento e seus artefatos documentais, sem reescrever Perfis publicados;
4. mesclar Pessoas absorve um cadastro em outro, solicita apenas conflitos canônicos, preserva versões históricas e mantém redirecionamento auditável;
5. vínculo profissional e situação operacional são independentes; arquivar é reversível e não apaga conhecimento;
6. estados técnicos são traduzidos em ações humanas contextuais, com uma única ação primária e opções excepcionais agrupadas;
7. checkpoints persistidos e replays idempotentes são a garantia do piloto. Processamento local não é anunciado como execução em segundo plano quando o navegador está fechado.

## Alternativas avaliadas

- Criar pipelines separados para cada origem de revisão: rejeitado porque duplicaria locks, publicação e auditoria.
- Reatribuir somente `documents.person_id`: rejeitado porque deixaria tentativas, páginas, evidências e revisões inconsistentes.
- Apagar a Pessoa absorvida: rejeitado porque destruiria referências antigas e a explicação histórica.
- Mesclar automaticamente dois Perfis atuais: rejeitado porque fatos profissionais conflitantes exigem julgamento humano.
- Introduzir fila ou worker para continuar PDF.js/Tesseract fora do navegador: adiado; seria uma decisão arquitetural material sem necessidade para garantir checkpoint e retomada no piloto.

## Consequências

- `profile_reviews` aceita fonte de Perfil sem fabricar evidência documental.
- `people` passa a registrar situação operacional e relação de mesclagem.
- `document_operations` coordena revisão, movimentação, lifecycle, arquivamento e mesclagem com fingerprint e replay.
- A Central da Pessoa passa a ser o cockpit operacional; versões completas, documentos e recuperação permanecem no contexto da Pessoa.
- Member, `anon` e acessos cross-tenant não recebem nova autoridade.

## Rollback

A UI pode ocultar as novas ações e os novos `execute` podem ser revogados. As colunas são aditivas e estados existentes permanecem `active`. Mesclagens já concluídas não devem ser revertidas por edição direta; uma reversão exigiria operação autoritativa própria para preservar a história.

## Evidência

- migrations `20260903232237`, `20260904000509`, `20260904000810`, `20260904001336` e `20260904001602` ativas no Prisma-QA;
- `supabase/qa/m53_pilot_operational_resilience_verification.sql` executado em transação revertida;
- `tests/m53PilotOperationalResilience.test.ts` cobre contratos de UI, segurança e persistência.
