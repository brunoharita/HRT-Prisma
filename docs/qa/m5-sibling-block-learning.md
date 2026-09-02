# Evidência QA: aprendizado estrutural intra-documento

Data: 2026-09-01. Branch: `codex/m5-sibling-block-learning`. Produção fora do escopo.

## Objetivo

Comprovar que uma experiência corrigida e completa pode revelar blocos profissionais irmãos ausentes no mesmo currículo, sem publicação automática, cópia de valores, score opaco ou chamadas externas.

## Gates locais

- fixture visual com três cabeçalhos `Cargo, Empresa` e períodos à direita;
- duas experiências ausentes viram propostas completas fortes;
- rascunho original permanece imutável até o aceite;
- cada campo possui evidência do próprio bloco e descrições multipágina podem manter mais de uma região;
- fonte textual sem geometria e candidato em outra coluna são rejeitados;
- OCR transforma blocos Tesseract em linhas normalizadas;
- campos já alterados por humano não são sobrescritos;
- RPC v3 é tenant-scoped, metadata-only no ledger adaptativo e cria vínculos espaciais complementares;
- o hardening remoto rejeita contagens inconsistentes, candidato/campo divergentes, texto sem geometria e regiões sem shape completo antes de alcançar a operação interna;
- detecção e descarte têm eventos próprios.

## Rollout concluído

1. `CI=true pnpm run validate` aprovou 151 testes técnicos, 19 golden, build e demo.
2. O `db push --dry-run` foi bloqueado pelo histórico remoto reparado preexistente; nenhuma alteração ocorreu nessa tentativa.
3. As migrations `20260902003617` e `20260902011222` compilaram em transação remota com `ROLLBACK`, foram aplicadas isoladamente por `db query --linked --file` e registradas no histórico do QA.
4. Verificação remota confirmou as duas RPCs, cinco colunas novas, três validadores privados, execução `anon = false`, wrappers `authenticated = true` e implementações internas `authenticated = false`.
5. Provas negativas remotas rejeitaram assinatura sem geometria, contagens inconsistentes e sugestão metadata-only com candidato divergente. O advisor mantém somente o alerta esperado para os wrappers `security definer` autenticados; a autorização de revisor e organização permanece interna e fail-closed.
6. As migrations de compatibilidade `20260902021134` e `20260902022059` restauraram `layout_blocks`/`field_evidence` no wrapper de recuperação parcial e alinharam a allowlist aos caminhos estáveis atuais, sem ampliar execução anônima ou acesso à implementação privada.
7. Smoke autenticado no Prisma-QA usou um PDF sintético com três experiências `Cargo, Empresa`. A experiência humana, criada sem página ou texto de evidência no draft, foi reencontrada pela região espacial persistida; o Prisma propôs exatamente duas experiências fortes, com seis critérios estruturais e oito campos com evidência própria.
8. O aceite criou três experiências no rascunho, um evento adaptativo metadata-only e oito vínculos complementares ativos. A revisão permaneceu `draft`, `approved_profile_id = null` e nenhuma publicação foi acionada.
9. A interface passou em desktop e `390x844` sem overflow horizontal global; a alternância móvel entre Currículo e Revisão permaneceu utilizável. Produção não foi alterada.

## Limitações aceitas

Texto achatado sem coordenadas não cria nova experiência. Layouts heterogêneos, períodos ambíguos, colunas divergentes e candidatos parciais continuam sob revisão manual. O smoke usa conteúdo sintético e não sustenta alegação de precisão em currículos reais antes de amostra autorizada.
