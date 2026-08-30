# Arquitetura do sistema

## Estado e objetivo

Estado: implementado localmente e conectado ao único projeto Supabase remoto interno. A arquitetura prova um slice de Talent Intelligence por CLI e um shell web React com Supabase Auth, rotas protegidas, App Shell autenticado, gestão de Usuários/Pessoas, ingestão M2-B, confiabilidade M2-C e revisão M5 com evidência espacial, sem LLM remoto. O CLI continua usando JSON tenant-scoped; o frontend usa PostgreSQL, RLS, Storage privado, RPCs controladas e Edge Functions no Prisma-QA.

## Fluxo atual

```text
currículo textual não confiável
  -> validação de formato e conteúdo mínimo
  -> processResume
  -> ExtractionProvider
  -> ExtractionDraft validado
  -> evidências e proveniência
  -> inferências versionadas
  -> ProfessionalProfile
  -> TalentRepository
  -> retrieval estruturado
  -> matching contextual
  -> explicação, gaps e incertezas
```

Texto do documento permanece dado. Nenhum trecho pode alterar instruções do agente, acessar secrets, mudar schema de saída ou executar ação.

## Componentes

| Camada | Responsabilidade | Implementação | Estado |
| --- | --- | --- | --- |
| Domain | Pessoa, documento, perfil, evidência, inferência, vaga, avaliação | `src/domain` | disponível localmente |
| Application | Estados, validação e orquestração | `processResume.ts` | disponível localmente |
| AI boundary | Extração, inferência, retrieval, confiança, matching | `src/ai` | provider determinístico |
| Infrastructure | Persistência tenant-scoped | `JsonTalentRepository` | somente local/teste |
| Web shell | React, Ant Design, App Shell, sessão Supabase, organization ativa, Usuários, Pessoas e route guards | `web/src` | local conectado ao remoto interno |
| Ingestão M2-B | PDF.js, Tesseract.js, draft, evidência, timeline e perfil versionado | `web/src/domain` e `web/src/infrastructure` | ativo e comprovado |
| Confiabilidade M2-C | central de documentos, retry, revisão humana, comparação e aprovação | `web/src/pages`, `personIngestionService`, RPCs | ativo e comprovado |
| Evidência espacial M5 | representação visual normalizada, mapa canônico por caractere/símbolo, OCR local por região, vínculos e histórico | `DocumentEvidenceViewer`, `spatialEvidence`, `StructuredReviewPanel`, RPC M5 | PDF ativo e comprovado; adaptadores futuros ainda não ativados |
| Aprendizado adaptativo v2 | releitura do bloco completo, aceite parcial, eventos e sinais organizacionais aprovados | `adaptiveResumeExtraction`, `AdaptiveSuggestionPanel`, RPC adaptativa | runtime local; persistência comprovada em QA |
| Intake currículo-first | PDF pré-Pessoa, identidade mínima, duplicidade e resolução transacional | `ResumeImportPage`, `resume_intakes`, RPCs | implementado localmente |
| Database contract | Modelo, integridade, grants, RLS, Storage e RPC atômica | `supabase/migrations` | ativo no Prisma-QA |
| Verification | Unit, negative, isolation, migration, golden, vertical | `tests` | disponível localmente |

## Fronteiras

- `ExtractionProvider` não persiste e não decide autorização.
- O domínio não conhece fornecedor de IA.
- `TalentRepository` exige organização em todas as leituras.
- Matching rejeita organizações diferentes antes da avaliação.
- O shell web consome apenas sessão Supabase e `organization_memberships`; ele não substitui RLS nem backend privilegiado.
- Toda rota autenticada reutiliza o App Shell com sidebar esquerda; não existe top bar global e headers pertencem às páginas.
- Documento bruto e dados privados são separados do perfil consultável no schema de produção.
- A UI existente continua consumidora dos contratos, nunca fonte de autorização ou verdade.
- O intake pré-Pessoa é tenant-owned desde o primeiro registro e converge para o pipeline M2-B/M2-C após uma única resolução explícita.
- O frontend nunca inventa coordenadas. Uma nova região M5 nasce de seleção explícita na versão do documento exibida e o banco valida página, retângulo, tenant e lock.
- Seleção e destaque M5 operam em coordenadas canônicas da página; pixels, zoom e densidade da tela são apenas transformações de entrada e saída. Adaptadores de formato devem produzir as mesmas unidades visuais antes de usar o motor comum.
- A correção humana não é copiada para outros registros. Cada sugestão é reconstruída da fonte original do próprio bloco, campos já revisados são preservados e registros ambíguos permanecem sem proposta.
- Padrões persistidos são sinais estruturais allowlisted e versionados, sem valores pessoais ou texto integral, promovidos somente na aprovação e sempre isolados por organização.

## Persistência

PostgreSQL/Supabase é a persistência-alvo. A migration possui organização em agregados de tenant, foreign keys compostas e RLS. O adaptador JSON permite execução determinística e persiste texto apenas em diretório local ignorado pelo Git. No ambiente conectado, documento bruto deve ficar em storage privado; a tabela guarda metadados, checksum e referência.

## Fail-closed

Formato não suportado, texto insuficiente, provider inválido, tenant incompatível, versão desconhecida ou autoridade ausente bloqueiam a operação sensível. Nenhuma dessas condições produz perfil válido por fallback implícito.

## Não implementado

API HTTP/BFF dedicada, fila assíncrona, embeddings vetoriais, LLM produtivo, malware scan, auditoria de visualização, ambiente de produção separado, hosting e integrações externas.
