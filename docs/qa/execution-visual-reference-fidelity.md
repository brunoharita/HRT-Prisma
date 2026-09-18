# Execução — Fidelidade a referências visuais em prompts

Versão 1.0.0. Autorizada por Bruno em 2026-09-18. Ler integralmente `docs/qa/agreement-visual-reference-fidelity.md` 1.0.0 e `docs/product/ux-foundation.md` contrato `prisma-ux-foundation-1.1.0`. Não reinterpretar D-UX-*, P-UX-*, F-UX-*, A-UX-* ou CA-UX-*.

Implementar a regra no contrato do agente, owner de UX, templates de acordo/AoT, protocolo de rastreabilidade, ADR e roteamento do Context Pack. Projetar a seção canônica de fidelidade visual diretamente na fonte compacta do GPT, protegê-la com checker e teste e regenerar os dois artefatos derivados. Não editar artefatos gerados manualmente.

Validar `check:foundation`, o teste de tooling do Context Pack, geração e verificação dos artefatos. Revisar diff e manifesto. Este movimento não altera telas, código de produto, banco, Supabase, IA de runtime, QA ou produção.
