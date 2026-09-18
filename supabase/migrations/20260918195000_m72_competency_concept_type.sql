-- PostgreSQL requires a newly added enum value to commit before later migrations can use it.
alter type public.knowledge_concept_type add value if not exists 'competency' after 'skill';
