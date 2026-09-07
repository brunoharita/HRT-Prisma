# ADR-042: feedback de validação acionável no campo

- Status: accepted
- Date: 2026-09-07
- Owners: product, UX, engineering and QA

## Context

Mensagens gerais de salvamento sem indicar o campo que precisa de decisão, correção ou complemento obrigam o operador a interpretar a tela inteira. Isso cria atrito e pode levar a tentativas repetidas sem resolver a pendência real.

## Decision

Toda validação que bloquear uma ação em formulário deve, além de informar a causa em linguagem natural, identificar e destacar visualmente o campo ou bloco exato que requer ação. O destaque inclui estado de erro perceptível, instrução local acessível e foco ou rolagem até o primeiro alvo quando ele não estiver visível. Conflitos seguem o mesmo padrão e explicam qual decisão ainda cabe ao operador.

O feedback não pode marcar campos sem relação com o bloqueio, transformar ausência de evidência em erro de conteúdo ou substituir a decisão humana. Após correção válida, o estado visual deve desaparecer sem exigir uma ação adicional.

## Consequences

- O operador encontra a próxima ação sem procurar manualmente pela tela.
- Novos fluxos devem transportar o destino acionável junto da mensagem de validação.
- Validações gerais sem alvo só são aceitáveis para falhas estritamente sistêmicas, preservando uma recuperação segura.

## Technical impact

O contrato `operation-feedback` passa para a versão 2.1.0. A primeira aplicação é a edição de Vagas: ocupação/referência profissional, título, ocupante e requisitos inválidos usam alvo explícito e estilo de erro local.

## Validation strategy

Testes de interface devem comprovar que cada bloqueio conhecido aponta para o campo correspondente e que a correção remove o destaque. Smoke visual deve confirmar contraste, foco e leitura em desktop e mobile quando houver sessão QA autorizada.

## References

- `docs/architecture/contracts.md`
- `docs/decisions/ADR-030-decision-centered-interaction.md`
- `web/src/pages/VacancyPages.tsx`
- `web/src/styles.css`
