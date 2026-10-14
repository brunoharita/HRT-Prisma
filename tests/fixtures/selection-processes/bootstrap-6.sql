insert into public.people(id,organization_id,full_name) values(m83_id('late-person'),m83_id('a'),'Candidato sintético tardio');
insert into public.professional_profiles(id,organization_id,person_id,profile_data,extraction_version,inference_version,embedding_version,prompt_version,model_version,profile_version,review_status,approved_at)
values(m83_id('late-profile'),m83_id('a'),m83_id('late-person'),'{}','fixture','none','none','fixture','fixture',1,'approved',now());
