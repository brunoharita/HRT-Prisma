# Execução - M5.7 Parser IA

Versão 1.1.0. Implementar integralmente `docs/qa/agreement-m57-parser-ia.md` versão 1.1.0, lido e aceito nesta tarefa. Este prompt incorpora todos os D/P/F/A/CA, sem substituí-los. Branch `codex/m5-7-parser-ia`, baseline `43c36e0`.

1. Criar contrato de propostas com referências estáveis às linhas da fonte, verificação local e conversão para StructuredDraft existente. Não usar referência aprovada como entrada do modelo.
2. Reutilizar PDF.js no backend local, OpenAI Responses sem ferramentas, segredo de .env.local e limites persistidos. Serviço exclusivamente loopback; não é endpoint de produção.
3. Integrar por flag de desenvolvimento antes da identidade/importação existente. Preservar autoria, origem e versão; desativado mantém comportamento anterior. Não executar persistência remota neste movimento.
4. Testar contratos, suporte textual, falhas e fronteira local com respostas sintéticas sem API/banco. Reutilizar a resposta já obtida de João e dispensar novos envios de Diego/Ivan conforme D-07 revisado. Registrar limites sem alegar aprovação geral.
5. Revisar diff, executar testes afetados, typecheck/build pertinentes, atualizar documentação/AoT/Context Pack e gerar/verificar export. Commit/push somente código, testes e documentação, nunca fontes pessoais, referências privadas ou segredos. Implantação posterior exige as condições próprias do ambiente online.

6. Delta de ativação autorizado: integrar por fast-forward na raiz oficial preservando alterações alheias, conservar o ledger de custos existente, ativar a configuração privada e disponibilizar localhost:5555. Oferecer `pnpm run dev:ia` para iniciar os dois serviços. Verificar a tela e o proxy sem gravar currículo no Supabase.
