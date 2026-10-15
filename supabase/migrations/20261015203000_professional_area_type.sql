-- A macro professional area is not a competency or an occupation.
alter type public.knowledge_concept_type add value if not exists 'professional_area';
