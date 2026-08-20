# Arquitetura do sistema

## Estado e objetivo

Estado: implementado localmente. A arquitetura prova um slice de Talent Intelligence por CLI sem UI, LLM remoto ou banco conectado. PostgreSQL/Supabase é o contrato de persistência aceito, mas a execução atual usa JSON tenant-scoped.

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
| Database contract | Modelo, integridade, grants e RLS | `supabase/migrations` | implementado, não ativado |
| Verification | Unit, negative, isolation, migration, golden, vertical | `tests` | disponível localmente |

## Fronteiras

- `ExtractionProvider` não persiste e não decide autorização.
- O domínio não conhece fornecedor de IA.
- `TalentRepository` exige organização em todas as leituras.
- Matching rejeita organizações diferentes antes da avaliação.
- Documento bruto e dados privados são separados do perfil consultável no schema de produção.
- Uma futura UI será consumidora dos contratos, nunca fonte de autorização ou verdade.

## Persistência

PostgreSQL/Supabase é a persistência-alvo. A migration possui organização em agregados de tenant, foreign keys compostas e RLS. O adaptador JSON permite execução determinística e persiste texto apenas em diretório local ignorado pelo Git. No ambiente conectado, documento bruto deve ficar em storage privado; a tabela guarda metadados, checksum e referência.

## Fail-closed

Formato não suportado, texto insuficiente, provider inválido, tenant incompatível, versão desconhecida ou autoridade ausente bloqueiam a operação sensível. Nenhuma dessas condições produz perfil válido por fallback implícito.

## Não implementado

UI, Auth runtime, storage, PDF, OCR, fila, embeddings vetoriais, LLM produtivo, auditoria de visualização, QA remoto, produção e integrações externas.
