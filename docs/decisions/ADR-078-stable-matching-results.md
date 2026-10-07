# ADR-078 — Resultados persistidos de matching

Aceito em 07/10/2026 pelo acordo v2.1.4. Fórmula e contratos de score permanecem; `matching-stable-result-1.0.0` versiona ciclo de vida e persistência.

Reutilizar `match_evaluations` para histórico imutável e acrescentar `matching_score_states`, ponte tenant/Pessoa/Posição para resultado corrente e lease. RPC server-only verifica acesso, fontes e dependências concretas. Hashes de componentes usados substituem invalidação por contador global ou data; revisão vinculada a outro Perfil não entra. Uma consulta sem alteração retorna exatamente o resultado persistido. Primeira avaliação, alteração pertinente ou recálculo explícito materializam um novo resultado pelo motor compartilhado. Falhas preservam anterior e exigem nova mudança pertinente ou repetição explícita, evitando retries pagos por acesso.

Lease evita disputa; commit revalida fontes, identidade e papel; o cliente nunca fornece pontuação. Data de referência pertence ao cálculo, não à consulta. Versões/fingerprint e predecessor registram causalidade; versões antigas continuam auditáveis. A proteção depende de RLS/grants e RPCs autenticadas/serviço, não do frontend.

Alternativas rejeitadas: estado local/cache de browser não sobrevive a dispositivos e sessões; congelar somente número mistura evidências novas com score antigo; invalidação por versão global afeta Pessoas sem dependência. Nenhuma dependência externa nova. Rollback: retornar web/Edge anteriores sem remover tabelas ou histórico.
