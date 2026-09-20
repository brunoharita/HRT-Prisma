-- M8.1: Prisma competency classification over the existing Knowledge identity.
-- Native source types and the independent occupational taxonomy remain intact.

create table public.competency_macro_groups (
  code text primary key check (code in ('hard', 'soft')),
  label text not null check (char_length(btrim(label)) between 1 and 120),
  definition text not null check (char_length(btrim(definition)) > 0),
  sort_order smallint not null unique check (sort_order > 0)
);

create table public.competency_subgroups (
  id uuid primary key default gen_random_uuid(),
  code text not null check (char_length(btrim(code)) between 1 and 80),
  macro_group_code text not null references public.competency_macro_groups(code) on delete restrict,
  scope public.knowledge_scope not null,
  organization_id uuid references public.organizations(id) on delete restrict,
  label text not null check (char_length(btrim(label)) between 1 and 160),
  definition text not null check (char_length(btrim(definition)) > 0),
  classification_question text not null default '',
  examples jsonb not null default '[]'::jsonb check (jsonb_typeof(examples) = 'array'),
  sort_order smallint not null check (sort_order > 0),
  status text not null default 'active' check (status in ('active', 'deprecated')),
  created_at timestamptz not null default now(),
  check ((scope = 'global' and organization_id is null) or (scope = 'organization' and organization_id is not null)),
  unique nulls not distinct (scope, organization_id, code),
  unique nulls not distinct (scope, organization_id, macro_group_code, sort_order)
);

create table public.knowledge_competency_classifications (
  id uuid primary key default gen_random_uuid(),
  concept_id uuid not null references public.knowledge_concepts(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete restrict,
  subgroup_id uuid not null references public.competency_subgroups(id) on delete restrict,
  version integer not null check (version > 0),
  taxonomy_version text not null check (char_length(btrim(taxonomy_version)) > 0),
  is_current boolean not null default true,
  method text not null check (method in ('contract_example', 'source_type', 'human_curated')),
  provenance jsonb not null default '{}'::jsonb check (jsonb_typeof(provenance) = 'object'),
  decided_by_auth_user_id uuid references auth.users(id) on delete restrict,
  decided_at timestamptz not null default now(),
  unique (concept_id, version)
);
create unique index knowledge_competency_classifications_current_idx
  on public.knowledge_competency_classifications(concept_id) where is_current;
create index knowledge_competency_classifications_subgroup_idx
  on public.knowledge_competency_classifications(subgroup_id, concept_id) where is_current;
create index knowledge_competency_classifications_organization_idx
  on public.knowledge_competency_classifications(organization_id, concept_id) where organization_id is not null;

create function private.m81_validate_competency_classification() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_concept public.knowledge_concepts; v_subgroup public.competency_subgroups;
begin
  select * into v_concept from public.knowledge_concepts where id = new.concept_id;
  select * into v_subgroup from public.competency_subgroups where id = new.subgroup_id;
  if v_concept.id is null or v_concept.concept_type in ('occupation', 'certification') or v_concept.status <> 'approved'
    or v_subgroup.id is null or v_subgroup.status <> 'active' then
    raise exception 'COMPETENCY_CLASSIFICATION_INVALID' using errcode = '23514';
  end if;
  if (v_concept.scope = 'global' and v_subgroup.scope <> 'global')
    or (v_concept.scope = 'organization' and v_subgroup.scope = 'organization'
      and v_concept.organization_id is distinct from v_subgroup.organization_id) then
    raise exception 'COMPETENCY_CLASSIFICATION_SCOPE_MISMATCH' using errcode = '42501';
  end if;
  if new.organization_id is not null and new.organization_id is distinct from v_concept.organization_id then
    raise exception 'COMPETENCY_CLASSIFICATION_TENANT_MISMATCH' using errcode = '42501';
  end if;
  new.organization_id := v_concept.organization_id;
  return new;
end $$;
revoke all on function private.m81_validate_competency_classification() from public, anon, authenticated;
create trigger m81_validate_competency_classification
  before insert or update of concept_id, subgroup_id, organization_id on public.knowledge_competency_classifications
  for each row execute function private.m81_validate_competency_classification();

insert into public.competency_macro_groups(code, label, definition, sort_order) values
  ('hard', 'Hard Skills', 'Conhecimentos, técnicas, métodos, tecnologias, idiomas e capacidades estruturadas que podem ser aprendidas e avaliadas diretamente quando aplicável.', 1),
  ('soft', 'Soft Skills', 'Capacidades comportamentais, relacionais, cognitivas ou de liderança observáveis na forma de pensar, agir e interagir.', 2);

insert into public.competency_subgroups(code, macro_group_code, scope, label, definition, classification_question, examples, sort_order) values
  ('H1', 'hard', 'global', 'Domínios e Especialidades Profissionais', 'Campo de conhecimento ou especialidade profissional sobre o qual a Pessoa precisa possuir repertório técnico.', 'Representa uma área, disciplina ou especialidade profissional?', '["Cibersegurança","Engenharia de Processos","Contabilidade"]', 1),
  ('H2', 'hard', 'global', 'Tecnologias, Ferramentas e Equipamentos', 'Produto, plataforma, sistema, linguagem, ferramenta, tecnologia ou equipamento concreto utilizado no trabalho.', 'Representa algo específico que a Pessoa usa, opera, configura, programa ou manipula?', '["Microsoft Excel","SAP","HPLC"]', 2),
  ('H3', 'hard', 'global', 'Métodos, Processos e Padrões', 'Método, framework, prática estruturada, padrão, norma ou forma organizada de executar trabalho.', 'Representa uma forma estruturada, normatizada ou repetível de realizar uma atividade?', '["Scrum","HAZOP","ISO 27001"]', 3),
  ('H4', 'hard', 'global', 'Gestão, Negócios e Estratégia', 'Conhecimentos e capacidades estruturadas para administrar recursos, projetos, operações, processos, portfólios, negócio ou estratégia.', 'Representa saber estruturar ou executar gestão, negócio, operação ou estratégia?', '["Gestão de Projetos","Transformação Digital","Planejamento Estratégico"]', 4),
  ('H5', 'hard', 'global', 'Idiomas', 'Capacidade linguística humana utilizada em contexto profissional.', 'É um idioma humano?', '["Português","Inglês","Espanhol"]', 5),
  ('S1', 'soft', 'global', 'Interpessoais', 'Capacidades relacionadas à interação e relação com outras pessoas.', 'Descreve como a Pessoa se comunica, coopera, negocia ou se relaciona?', '["Comunicação","Negociação","Colaboração"]', 1),
  ('S2', 'soft', 'global', 'Intrapessoais', 'Capacidades de autorregulação e de administração das próprias emoções, energia, disciplina ou adaptação.', 'Descreve como a Pessoa administra a si própria?', '["Resiliência","Adaptabilidade","Autocontrole"]', 2),
  ('S3', 'soft', 'global', 'Cognitivo-Executivas', 'Capacidades de raciocínio, análise, decisão, organização mental, criatividade e solução de problemas.', 'Descreve como a Pessoa pensa, analisa, decide, organiza ou resolve?', '["Resolução de Problemas","Pensamento Estratégico"]', 3),
  ('S4', 'soft', 'global', 'Liderança', 'Capacidades comportamentais para mobilizar, direcionar, desenvolver, influenciar ou alinhar pessoas e organizações.', 'Descreve como a Pessoa lidera, orienta, mobiliza ou desenvolve outras pessoas?', '["Visão Estratégica","Delegação","Desenvolvimento de Pessoas"]', 4);

-- The published O*NET technology type is an explicit, structured source category
-- for concrete software/tools/equipment and safely maps to H2. A lexical label
-- alone is never used for backfill; all other concepts remain pending.
insert into public.knowledge_competency_classifications
  (concept_id, subgroup_id, version, taxonomy_version, method, provenance)
select concept.id, subgroup.id, 1, 'competency-taxonomy-2.0.0', 'source_type',
  jsonb_build_object('agreement', 'M8-1.0.0', 'nativeType', 'technology', 'source', 'O*NET')
from public.knowledge_concepts concept
join public.competency_subgroups subgroup on subgroup.scope = 'global' and subgroup.code = 'H2'
where concept.scope = 'global' and concept.status = 'approved' and concept.concept_type = 'technology'
  and exists (select 1 from public.knowledge_external_mappings mapping
    join public.knowledge_sources source on source.id = mapping.source_id and source.name = 'O*NET'
    where mapping.concept_id = concept.id)
on conflict (concept_id, version) do nothing;

alter table public.competency_macro_groups enable row level security;
alter table public.competency_subgroups enable row level security;
alter table public.knowledge_competency_classifications enable row level security;
create policy competency_macro_groups_read on public.competency_macro_groups for select to authenticated using (true);
create policy competency_subgroups_read on public.competency_subgroups for select to authenticated
  using (scope = 'global' or (scope = 'organization' and (select private.has_org_role(organization_id,
    array['super_admin','owner','admin','recruiter','member']::public.membership_role[]))));
create policy knowledge_competency_classifications_read on public.knowledge_competency_classifications for select to authenticated
  using (exists(select 1 from public.knowledge_concepts concept where concept.id = concept_id and
    (concept.scope = 'global' or (select private.has_org_role(concept.organization_id,
      array['super_admin','owner','admin','recruiter','member']::public.membership_role[])))));
revoke all on public.competency_macro_groups, public.competency_subgroups, public.knowledge_competency_classifications from public, anon, authenticated;
grant select on public.competency_macro_groups, public.competency_subgroups, public.knowledge_competency_classifications to authenticated;
grant all on public.competency_macro_groups, public.competency_subgroups, public.knowledge_competency_classifications to service_role;

comment on table public.competency_macro_groups is 'M8.1 persisted definitions of the two global competency macro groups.';
comment on table public.competency_subgroups is 'M8.1 versionable competency subgroup definitions; organization rows are tenant isolated and have no user CRUD in this movement.';
comment on table public.knowledge_competency_classifications is 'M8.1 principal, versioned Prisma classification of an existing Knowledge concept; no row means pending classification.';
