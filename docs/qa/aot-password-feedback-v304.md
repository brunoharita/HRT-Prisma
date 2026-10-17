# AoT — Senha reativa e campos bloqueados3.0.4

Contrato `docs/qa/agreement-password-feedback-v304.md`1.0.0, decisão de Bruno no chat17/10/2026. Baseline375c9e4/runtime3.0.3 a67c32b. Evidência `docs/qa/evidence/password-feedback-v304/`.

## Matriz de acordos / proibições

| ID | Implementação / prova | Status |
| --- | --- | --- |
| D-01 | Form.useWatch e política existentes preservados; browser digita, preenche/substitui e apaga sem blur, ambos campos | PASS |
| D-UX-01 | Item local com estado pendente/atendido, vermelho/verde, check e texto acessível; CSS/color/ícone computados no browser | PASS |
| D-UX-02 | Username disabled no Owner; quatro controles com estilo cinza legível; valores canônicos, genérico e campos pessoais preservados | PASS |
| P-01 | Diff sem política/server/Auth/serviço; watcher local sem chamadas, fixtures não enviam enquanto digita; nenhuma credencial em logs/evidências | PASS |
| F-01 | CSS opt-in prisma-user-form/componente local, sem mudar PasswordChangePage nem estilos globais/backend | PASS |

## Mapa de impacto e preservação

Sem novas dependências ou reclassificações em relação ao acordo.

| Área | Relação | Baseline / regressão | Status |
| --- | --- | --- | --- |
| Checklist/locks | direct |3.0.3;52checks novos de transições/foco/estilo/ícones/canonicalidade/mascara em1448/390/320 | PASS |
| Política/salvar manual e automático | plausible_indirect | Política compartilhada intacta;17Node/tooling e casos de automático/erro/draft anteriores | PASS |
| Owner/genérico | plausible_indirect |60checks browser anteriores, rota/reload/submit/recuperação/edição genérica | PASS |
| Autoridade/canonicalidade | critical_transversal | Backend intacto, mesmas fontes canônicas e submit; quatro disabled/valores/rota protegida | PASS |
| Troca de senha/recuperação/banco/Edge/outros fluxos | no_impact_identified | Nenhum arquivo/serviço desses destinos muda; classe local nova evita aplicar regra a checklist compartilhado de troca | PASS |

As regressões acima PASS. Plano de release e prova operacional pendentes; não se declara rollout com evidência local.

## Fidelidade visual / privacidade

Referência do chat é a topologia atual do cadastro com estados a corrigir; conteúdo pessoal/credencial não copiado. Mantidas seções, ordem, três colunas desktop, painel ao lado das senhas e empilhamento mobile, ações/header/footer. Estado inicial e atendido em `pending-*.png`/`satisfied-*.png`, com mesma fixture/larguras1448/390/320 da evidência Owner anterior; inspeção visual PASS, sem overflow. Fonte/check verde #117847 e pendente #b42318, campos #f1f4f8 com texto #526078 e borda #c1ccda. Valores permanecem legíveis.

Senha sintética única gerada apenas em memória por execução; campos mascarados nas screenshots e limpos antes do submit automático. Nenhuma senha do usuário ou desta execução sintética persistida em fonte, relatório ou log. Teste aguarda atualização visual de classe/cor/check no ciclo de render, mantendo foco; snapshots intermediários de CSS antes do paint causaram falhas iniciais de harness, sem evidência de necessidade de blur. Watcher existente atende D-01, sem nova rotina de envio/estado de credencial.

## Validação / ambientes

112browser PASS (52novos/60regressão);17Node/tooling PASS (política, identidade/rota Owner, avisos e versão). Tipos/build web PASS, build TypeScript PASS. Checklist/disabled inspecionados em desktop/mobile. Lint/foundation/contexto/CI/publicação em execução. Sem QA remoto separado; navegador usa formulário e navegação reais com transporte sintético, sem identidade humana real ou e-mail. Isso não prova jornada humana autenticada em produção.

## Desvios

Nenhum desvio material identificado ou novo requisito de política. O nome de usuário usa disabled no lugar de readOnly para refletir bloqueio real e visual; Form/submit mantêm a origem canônica. Nenhuma alteração de valor, permissões ou persistência.

## Git / publicação / fechamento

Pendente. Publicação somente web, rollback/serviços/assets/SHA/CI e sincronização a registrar. Não executar validate integral local nem reabrir testes válidos depois da publicação.
