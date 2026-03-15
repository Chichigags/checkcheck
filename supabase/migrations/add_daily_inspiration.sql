-- Add daily_inspiration column to profiles table
alter table public.profiles
  add column if not exists daily_inspiration boolean not null default false;
