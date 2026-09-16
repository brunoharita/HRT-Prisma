# ADR-059 — Pipeline serial de qualidade para currículos em produção

- Estado: aceito
- Data: 2026-09-16
- Contrato: `docs/qa/agreement-production-resume-quality-pipeline.md` 1.0.0

## Contexto

A implantação única do Prisma aceitava PDFs com grande volume de texto como `native-fast`, mesmo quando a estruturação resultante não encontrava experiências ou competências. Além disso, a tela desativava a inteligência documental quando o Parser IA estava habilitado, e o Parser IA era restrito a `localhost`. O resultado observado foi uma importação com 7.102 caracteres e cinco páginas, mas sem trajetória profissional estruturada.

## Decisão

O fluxo passa a ser serial:

`PDF.js + estruturação determinística -> verificação semântica -> Paddle quando necessário -> Parser IA -> validação e revisão humana`.

A ponte temporária já autenticada do Paddle será estendida por uma rota fixa de Parser IA. O gateway público valida sessão, operador, papel e organização contra o Supabase, aplica contrato, origem, limites, serialização e timeout, e encaminha apenas o payload mínimo por túnel reverso loopback. Credenciais do Supabase não chegam à máquina local; a chave da OpenAI permanece somente nela.

O Parser IA continua ligado ao hash do PDF, à organização, às linhas-fonte, ao prompt e ao modelo, com fatos aceitos somente quando suportados pelas referências. Sua saída é um rascunho para revisão, nunca publicação automática.

## Alternativas consideradas

- Manter apenas PDF.js: rejeitado porque o caso real demonstrou falso positivo de qualidade.
- Usar Paddle ou Parser IA como alternativas: rejeitado porque remove a recuperação de estrutura justamente quando a IA está ativa.
- Colocar a chave da OpenAI no navegador: rejeitado por segurança.
- Implantar agora um backend permanente independente da máquina local: adequado como evolução, mas fora do escopo e desnecessário para restaurar o fluxo aprovado hoje.

## Consequências

- A qualidade deixa de depender somente de volume textual e passa a ter motivos semânticos verificáveis.
- A importação normal depende da disponibilidade da máquina local, do túnel e do orçamento do Parser IA; a indisponibilidade é explícita e não produz sucesso falso.
- PDFs são enviados à OpenAI somente após autorização do operador no fluxo acordado, com `store: false`, mínimo necessário, cache privado e revisão humana.
- A ponte permanece temporária e operacionalmente limitada a uma inferência por vez.
