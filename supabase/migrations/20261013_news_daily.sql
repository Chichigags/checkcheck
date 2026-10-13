-- One shared delivery window. Exclude every claimed edition, including uncertain sends.
create or replace function public.news_dispatch_candidates(p_date date,p_limit integer default 50)
returns setof jsonb language sql security invoker set search_path = public as $$
 select to_jsonb(s) || jsonb_build_object('profiles',to_jsonb(p))
 from news_subscriptions s join profiles p on p.id=s.profile_id
 where s.active and (s.paused_until is null or s.paused_until <= now())
 and not exists(select 1 from news_deliveries d where d.profile_id=s.profile_id and d.edition_date=p_date)
 order by s.profile_id limit greatest(1,least(p_limit,50));
$$;
revoke all on function public.news_dispatch_candidates(date,integer) from public,anon,authenticated;
grant execute on function public.news_dispatch_candidates(date,integer) to service_role;
