-- Scalars and string-list items have field paths, not entity block IDs.
-- Match private.validate_profile_block_decisions: only entity updates need a target.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

alter table public.profile_publication_decisions
  drop constraint profile_publication_decisions_check;
alter table public.profile_publication_decisions
  add constraint profile_publication_decisions_check check (
    action not in ('update', 'replace')
    or split_part(field_path, '::', 1) in (
      'professionalTitle', 'professionalObjective', 'summary', 'areasOfExpertise',
      'competencies', 'languages', 'certifications'
    )
    or target_block_id is not null
  );

commit;
