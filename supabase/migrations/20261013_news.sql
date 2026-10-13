-- Additive only: no changes to profiles, bot_state or BaZi messages.
create table if not exists public.news_subscriptions (
 profile_id uuid primary key references public.profiles(id) on delete cascade,
 active boolean not null default false,
 paused_until timestamptz,
 timezone text not null default 'Asia/Singapore',
 delivery_time text not null default 'Morning' check (delivery_time in ('Morning','Afternoon','Evening')),
 next_delivery_at timestamptz not null default now(),
 interests text not null default '' check (length(interests) <= 500),
 awaiting_interests boolean not null default false
);
create index if not exists news_due_idx on public.news_subscriptions(next_delivery_at) where active;
create table if not exists public.news_editions (
 edition_date date primary key,
 status text not null check (status in ('generating','ready','empty','failed')),
 claim_token uuid not null default gen_random_uuid(),
 claimed_at timestamptz not null default now(),
 payload jsonb
);
create table if not exists public.news_deliveries (
 profile_id uuid references public.profiles(id) on delete cascade,
 edition_date date references public.news_editions(edition_date),
 status text not null default 'sending' check (status in ('sending','sent','uncertain')),
 next_part integer not null default 0,
 updated_at timestamptz not null default now(),
 primary key(profile_id, edition_date)
);
alter table public.news_subscriptions enable row level security;
alter table public.news_editions enable row level security;
alter table public.news_deliveries enable row level security;
-- All access is server service-role only; no anonymous/authenticated policies.
create or replace function public.claim_news_edition(p_date date) returns uuid
language plpgsql security invoker set search_path = public as $$
declare v_token uuid;
begin
 insert into news_editions(edition_date,status) values(p_date,'generating')
 on conflict(edition_date) do update set status='generating',claim_token=gen_random_uuid(),claimed_at=now()
 where news_editions.status='failed' or (news_editions.status='generating' and news_editions.claimed_at < now()-interval '15 minutes')
 returning claim_token into v_token;
 return v_token;
end; $$;
create or replace function public.finish_news_edition(p_date date,p_token uuid,p_payload jsonb) returns boolean
language plpgsql security invoker set search_path = public as $$
begin
 update news_editions set status=case when jsonb_array_length(p_payload->'draft'->'stories')=0 then 'empty' else 'ready' end,payload=p_payload
 where edition_date=p_date and claim_token=p_token and status='generating';
 return found;
end; $$;
create or replace function public.fail_news_edition(p_date date,p_token uuid) returns void
language sql security invoker set search_path = public as $$
 update news_editions set status='failed' where edition_date=p_date and claim_token=p_token and status='generating';
$$;
create or replace function public.claim_news_delivery(p_profile uuid,p_date date) returns boolean
language plpgsql security invoker set search_path = public as $$
begin
 insert into news_deliveries(profile_id,edition_date) values(p_profile,p_date) on conflict do nothing;
 return found;
end; $$;
revoke all on function public.claim_news_edition(date) from public,anon,authenticated;
revoke all on function public.finish_news_edition(date,uuid,jsonb) from public,anon,authenticated;
revoke all on function public.fail_news_edition(date,uuid) from public,anon,authenticated;
revoke all on function public.claim_news_delivery(uuid,date) from public,anon,authenticated;
grant execute on function public.claim_news_edition(date),public.finish_news_edition(date,uuid,jsonb),public.fail_news_edition(date,uuid),public.claim_news_delivery(uuid,date) to service_role;

-- Carry forward only existing completed, active subscriptions; preserve BaZi rows.
-- New users subscribe via /start, without supplying birth information.
insert into public.news_subscriptions(profile_id,active,paused_until,timezone,delivery_time,next_delivery_at)
select id,true,paused_until,timezone,coalesce(delivery_time,'Morning'),next_delivery_at
from public.profiles where onboarding_complete and status='active' and next_delivery_at is not null
on conflict(profile_id) do nothing;
