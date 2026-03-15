create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  telegram_user_id bigint unique not null,
  telegram_username text,
  legal_name text,
  nickname text,
  date_of_birth date,
  birth_time text,
  birth_city text,
  gender text,
  delivery_time text check (delivery_time in ('Morning', 'Afternoon', 'Evening')),
  timezone text not null default 'UTC',
  language_preference text not null default 'None',
  daily_inspiration boolean not null default false,
  relationship_status text,
  life_focus text,
  current_city text,
  onboarding_complete boolean not null default false,
  layer2_complete boolean not null default false,
  paused_until timestamptz,
  status text not null default 'active' check (status in ('active', 'stopped')),
  next_delivery_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_status_next_delivery_idx on public.profiles (status, next_delivery_at);
create index if not exists profiles_paused_until_idx on public.profiles (paused_until);

create trigger trg_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create table if not exists public.bot_state (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  flow text not null default 'onboarding' check (flow in ('onboarding', 'layer2', 'idle')),
  step integer not null default 0,
  awaiting_field text,
  last_command text,
  updated_at timestamptz not null default now()
);

create trigger trg_bot_state_updated_at
before update on public.bot_state
for each row
execute function public.set_updated_at();

create table if not exists public.daily_messages (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  message_date date not null,
  payload jsonb not null,
  sent_at timestamptz not null default now(),
  unique (profile_id, message_date)
);

create index if not exists daily_messages_profile_date_idx on public.daily_messages (profile_id, message_date desc);

create table if not exists public.telegram_updates (
  update_id bigint primary key,
  received_at timestamptz not null default now()
);

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.bot_state enable row level security;
alter table public.daily_messages enable row level security;
alter table public.feedback enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
using (auth.uid() = auth_user_id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
using (auth.uid() = auth_user_id)
with check (auth.uid() = auth_user_id);

drop policy if exists "bot_state_select_own" on public.bot_state;
create policy "bot_state_select_own"
on public.bot_state
for select
using (
  exists (
    select 1
    from public.profiles p
    where p.id = bot_state.profile_id
      and p.auth_user_id = auth.uid()
  )
);

drop policy if exists "bot_state_update_own" on public.bot_state;
create policy "bot_state_update_own"
on public.bot_state
for update
using (
  exists (
    select 1
    from public.profiles p
    where p.id = bot_state.profile_id
      and p.auth_user_id = auth.uid()
  )
);

drop policy if exists "daily_messages_select_own" on public.daily_messages;
create policy "daily_messages_select_own"
on public.daily_messages
for select
using (
  exists (
    select 1
    from public.profiles p
    where p.id = daily_messages.profile_id
      and p.auth_user_id = auth.uid()
  )
);

drop policy if exists "feedback_insert_own" on public.feedback;
create policy "feedback_insert_own"
on public.feedback
for insert
with check (
  profile_id is null
  or exists (
    select 1
    from public.profiles p
    where p.id = feedback.profile_id
      and p.auth_user_id = auth.uid()
  )
);
