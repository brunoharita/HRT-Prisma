-- Forward-only compatibility fix for the unnamed M4 state/concept invariant.

alter table public.knowledge_observations
  drop constraint if exists knowledge_observations_check;

alter table public.knowledge_observations
  add constraint knowledge_observations_concept_state_check
  check (
    (resolution_state = 'resolved' and concept_id is not null)
    or (resolution_state in ('ambiguous', 'unresolved') and concept_id is null)
  );
