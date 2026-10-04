-- Included in the existing synthetic, LOCAL publication fixture by --formats.
-- Execute before publication, with the same authenticated actor/review/tenant.
    if i=1 then
      perform s202_assert((select reviewed_data#>>'{experiences,0,period}'='31/02/2024' from public.profile_reviews where id=review.review_id),'invalid imported period is preserved and remains reviewable');
      perform public.s203_period_reject(format('select public.save_profile_review(%L,%L,%s,%L::jsonb,%L,%L)',s202_id('org'),review.review_id,review.lock_version,d,'Synthetic correction','s203-save-period'), 'review_period_invalid_date','experiences.'||(d#>>'{experiences,0,id}')||'.period');
      perform public.s203_period_reject(format('select public.publish_profile_review(%L,%L,%s,%L,%L::jsonb,%L)',s202_id('org'),review.review_id,review.lock_version,'merge','[]','s203-invalid-publish'), 'review_period_invalid_date','experiences.'||(d#>>'{experiences,0,id}')||'.period');
      perform s202_assert((select state='draft' and lock_version=review.lock_version and reviewed_data=d from public.profile_reviews where id=review.review_id) and (select count(*)=0 from public.professional_profiles where person_id=resolved.person_id),'format failure changes neither draft nor Profile');
      perform s202_assert(not exists(select 1 from public.document_operations where idempotency_key in ('s203-save-period','s203-invalid-publish')),'failed save/publication roll back claimed operations');
      perform s202_reject(format('select public.save_profile_review(%L,%L,%s,%L::jsonb,%L,%L)',s202_id('org'),review.review_id,review.lock_version+1,d,'Synthetic correction','s203-stale-format'),'P0001');
      perform s202_reject(format('select public.save_profile_review(%L,%L,%s,%L::jsonb,%L,%L)',s202_id('other-org'),review.review_id,review.lock_version,d,'Synthetic correction','s203-other-org'),'42501');
      d:=jsonb_set(d,'{experiences,0,period}',to_jsonb('2024 - 2020'::text));
      perform public.s203_period_reject(format('select public.save_profile_review(%L,%L,%s,%L::jsonb,%L,%L)',s202_id('org'),review.review_id,review.lock_version,d,'Synthetic correction','s203-reversed-save'), 'review_period_reversed','experiences.'||(d#>>'{experiences,0,id}')||'.period');
      d:=jsonb_set(d,'{experiences,0,period}',to_jsonb('Durante o curso'::text));
      select * into review from public.save_profile_review(s202_id('org'),review.review_id,review.lock_version,d,'Synthetic advisory period','s203-save-period');
      perform s202_assert((select reviewed_data=d from public.profile_reviews where id=review.review_id),'advisory unknown period saves without invented dates');
      d:=jsonb_set(d,'{experiences,0,period}',to_jsonb('2019–2023'::text));
      select * into review from public.save_profile_review(s202_id('org'),review.review_id,review.lock_version,d,'Synthetic valid correction','s203-valid-period');
      select * into replay from public.save_profile_review(s202_id('org'),review.review_id,review.lock_version-1,d,'Synthetic valid correction','s203-valid-period');
      perform s202_assert(replay.reused and replay.lock_version=review.lock_version,'save replay precedes format gate and preserves version');
    end if;
