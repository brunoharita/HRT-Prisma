# ADR-022: Resumo estruturado e fronteira privada de contato

Status: accepted
Data: 2026-08-30

## Contexto

A primeira aba da revisão continha somente `summary`, embora currículos tragam identificação, contato, posicionamento, objetivo, resumo profissional e resultados principais como informações distintas. Misturar esses conteúdos em um único texto prejudica comparação, evidência por campo e atualização canônica. Copiar contato para `professional_profiles.profile_data`, porém, ampliaria indevidamente a superfície de PII e quebraria a separação já existente entre perfil profissional e `person_private_data`.

## Decisão

A aba continua chamada **Resumo**, por reconhecimento imediato do operador, e passa a revisar:

- `identity.fullName`;
- `contact.city`, `contact.state`, `contact.phone`, `contact.email` e `contact.linkedin`;
- `professionalTitle`;
- `areasOfExpertise[]`;
- `professionalObjective`;
- `summary`, apresentado como **Resumo profissional**;
- `keyResults[]`, com ID estável e evidência independente por item.

A extração é estritamente documental: campos ausentes permanecem nulos ou vazios, sem síntese do primeiro cargo, inferência de senioridade ou fabricação de objetivo. Revisões históricas sem a nova estrutura recebem, somente na leitura, fallback determinístico derivado das páginas já persistidas; o payload original não é reescrito silenciosamente.

Na aprovação, `identity` e `contact` são removidos antes da criação de `professional_profiles`. Nome confirmado atualiza `people.full_name`; contato confirmado atualiza `person_private_data`. Valores nulos não apagam valores canônicos existentes. Constraints impedem que `identity` ou `contact` sejam promovidos para o perfil profissional e validam limites, formato, IDs estáveis e duplicidades. RLS e papéis não são ampliados.

## Consequências

- comparação e evidência passam a existir por informação real do currículo;
- cada resultado principal pode ser corrigido ou criado com região própria;
- o perfil profissional aprovado ganha título, áreas, objetivo, resumo e resultados estruturados;
- dados de contato continuam restritos ao domínio privado e ao fluxo autorizado de revisão;
- revisões e versões antigas continuam legíveis;
- a evolução exige versões major de extração, draft, ingestão, revisão e perfil.

## Versões

- `structured-resume-summary` 1.0.0;
- `adaptive-resume-extraction` 3.0.0;
- `extraction-draft` 4.0.0;
- `person-ingestion` 6.0.0;
- `human-profile-review` 3.0.0;
- `professional-profile` 2.0.0.

`spatial-evidence` permanece 1.2.0: novos caminhos usam a mesma semântica canônica de região, caracteres e projeção já vigente.

## Reversão

O frontend pode deixar de apresentar os novos campos sem apagar dados. A migration não remove colunas anteriores. Uma reversão de aprovação deve restaurar a função anterior e remover as constraints somente depois de confirmar que nenhum perfil 2.0.0 depende da nova estrutura. `state_code` e `linkedin_url` permanecem dados privados compatíveis mesmo se a interface for revertida.
