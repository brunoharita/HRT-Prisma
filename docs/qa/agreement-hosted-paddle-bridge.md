# Contrato de Acordos — Paddle hospedado com worker local

Versão: 1.0.0. Estado: agreed. PO: Bruno. Aprovação: 2026-09-16, resposta "aprovo" à proposta de túnel SSH reverso temporário e proteção das rotas. Fonte funcional: anexo "Continuação da implantação do Prisma hospedado com PaddleOCR como worker local", seções 1–36. A aprovação autoriza a ponte e seus controles; não altera pipeline nem autoriza publicação automática de Perfil.

## DEVE

- D-01: preservar HTTPS, login, Home e backend Prisma-QA (CA-01 a CA-03 do anexo).
- D-02: conservar os dois endpoints, JSON PaddleX, PP-StructureV3 e PaddleOCR-VL, preflight PDF.js, roteamento adaptativo e fallback (CA-04, CA-05, CA-09, CA-10).
- D-03: conectar VPS ao PC por SSH outbound reverso, com portas somente loopback; autorizar cada chamada por sessão, operador ativo e organização antes do worker (CA-06, CA-07).
- D-04: executar o PDF Ivan autorizado na interface hospedada até Draft/revisão; provar chamada e retorno do worker quando a rota o exigir (CA-08, CA-11 a CA-13).
- D-05: conferir qualidade/evidência/proveniência pela UI e registrar tempos/rotas/páginas/fallback, sem currículo integral, secrets ou PII desnecessária em logs (CA-14 a CA-17).

## PROIBIDO

- P-01: novo pipeline, troca por llama.cpp, novo contrato de OCR ou Paddle obrigatório para todos os PDFs.
- P-02: exposição pública de workers ou proxy sem autorização server-side, secrets no frontend e conteúdo pessoal nos logs.
- P-03: alterar Pessoa, publicação, matching, Knowledge ou Supabase sem necessidade; publicar Perfil automaticamente.
- P-04: declarar sucesso por health/probe, bypassar a interface como aceite, otimizar GPU ou fazer benchmarking amplo.

## FORA DE ESCOPO

- F-01: infraestrutura permanente, GPU, autoscaling, migração de backend, rollout do Parser IA M5.7 e novo ambiente de produção.

## AUTONOMIA

- A-01: detalhes reversíveis de Docker/Nginx/SSH, controles de transporte, limites e diagnóstico sanitizado, testes dirigidos, documentação, commit/push da branch.

## PENDÊNCIAS

Sem escolha arquitetural pendente para a ponte aprovada. Sessão autenticada e julgamento de qualidade podem exigir participação do PO. Inviabilidade de CPU abre movimento separado.

## CRITÉRIOS DE ACEITE

- CA-D01: smoke do site, login/Home e identidade QA, sem mudança de backend.
- CA-D02: testes reais do adapter/roteamento e inspeção do diff comprovam contrato intacto.
- CA-D03: ausência de listeners públicos; negativos para anônimo, outro tenant, papel insuficiente, origem/contrato desconhecidos; indisponibilidade falha fechada.
- CA-D04: importação real do PDF autorizado pela UI, sem artefato intermediário manual, com revisão alcançada.
- CA-D05: trace existente e logs mínimos de transporte, tempos medidos e inspeção visual da revisão contra documento.

Ativação enabled é limitada ao teste/piloto hospedado solicitado; não declara concluído o benchmark/cutover geral M5.6. Publicação de Perfil permanece humana.
