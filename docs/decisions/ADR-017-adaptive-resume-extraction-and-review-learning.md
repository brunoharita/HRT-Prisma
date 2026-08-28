# ADR-017: Extração adaptativa de currículo e aprendizado controlado pela revisão

- Status: accepted
- Data: 2026-08-28
- Owners: AI, application, data, security, product

## Contexto

A estruturação M2-B descartava posição, tamanho e agrupamento visual do texto do PDF e aplicava uma expressão regular a linhas achatadas. Isso permitia interpretar um descritor de atuação e um período como empresa, ignorar a empresa na linha seguinte e deixar o período como não identificado. Currículos variam demais para uma coleção crescente de templates canônicos.

## Decisão

- A extração nativa preserva linhas visuais com coordenadas normalizadas, tamanho e ênfase, além do texto por página.
- A primeira estruturação usa sinais semânticos, geometria e repetição dentro do próprio documento. Regras linguísticas são sinais de bootstrap, não templates de currículo nem autoridade sobre o dado.
- Cada campo estruturado pode carregar uma região espacial própria. Ao iniciar a revisão, regiões válidas geram vínculos originais navegáveis sem fabricar coordenadas para documentos antigos.
- Uma correção humana pode induzir sugestões para registros irmãos da mesma semântica. A sugestão reinterpreta o conteúdo de cada registro e nunca replica o valor corrigido para os demais. Aplicação exige confirmação humana.
- Correções confirmadas viram casos tenant-scoped de avaliação. Elas só passam de `candidate` para `approved` quando a revisão inteira é aprovada. Não existe atualização autônoma de prompt, regra ou modelo em produção.
- Excluir evidência humana encerra o vínculo ativo por RPC, preservando região, vínculo anterior, revisão e evento. Evidência original não pode ser excluída.
- Um provider semântico remoto permanece uma extensão possível pela fronteira do ADR-003, mas fica inativo até existir provider, modelo, tratamento de PII, custo, avaliação e rollout aprovados.

## Consequências

A primeira extração passa a compreender layouts repetidos e períodos abreviados sem depender de um modelo fixo de currículo. A revisão deixa de ser apenas correção pontual e produz aprendizado document-local e casos reutilizáveis de avaliação, mantendo evidência e decisão humana separadas.

O bootstrap local ainda não oferece compreensão aberta equivalente a um modelo multimodal. Documentos escaneados dependem do OCR local, que não fornece geometria de palavra neste movimento. Casos reais autorizados continuam necessários para medir ganho de qualidade e calibrar promoção.

## Segurança e LGPD

O PDF permanece processado localmente. `extraction_learning_cases` não duplica texto integral nem valores do perfil; referencia revisão e evento sob `organization_id`, RLS e papel de revisor. Um provider externo não pode ser ativado por configuração implícita.

## Compatibilidade

Páginas antigas recebem arrays vazios de layout e evidência de campo. Evidências textuais antigas continuam visíveis sem coordenadas. Versão desconhecida bloqueia promoção, não converte ausência em fato e não inventa região.

## Validação

- fixture sintética do layout observado no currículo HRT;
- formatos de período abreviado e empresa na linha seguinte;
- sugestão para irmãos sem cópia de valor;
- RLS, autorização, imutabilidade e proibição de excluir evidência original;
- typecheck, build, regressão M2/M5, golden suite e gate `pnpm run validate`.

## Referências

- `web/src/domain/adaptiveResumeExtraction.ts`
- `supabase/migrations/20260828055309_adaptive_resume_extraction.sql`
- `tests/adaptiveResumeExtraction.test.ts`
- ADR-003, ADR-004, ADR-010, ADR-011 e ADR-016

## Histórico

- 2026-08-28: decisão aceita, implementação local criada e migration aplicada no Prisma-QA; produção não existe nem faz parte desta evidência.
- 2026-08-28: ADR-018 amplia esta fundação com releitura imediata do bloco completo, aceite parcial atômico e padrões organizacionais metadata-only promovidos após aprovação.
