create extension if not exists pgcrypto;

create table if not exists public.campaign_rolls (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  character_id uuid references public.characters(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  actor_name text not null default 'Personagem',
  roll_type text not null default 'roll',
  title text not null default 'Rolagem',
  total_attack integer,
  total_damage integer,
  d20 integer,
  damage_details text,
  is_critical boolean not null default false,
  is_fumble boolean not null default false,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists campaign_rolls_campaign_created_idx
  on public.campaign_rolls (campaign_id, created_at desc);

alter table public.campaign_rolls enable row level security;

drop policy if exists "campaign rolls readable by campaign members" on public.campaign_rolls;
create policy "campaign rolls readable by campaign members"
on public.campaign_rolls
for select
using (
  exists (
    select 1
    from public.campaign_members member
    where member.campaign_id = campaign_rolls.campaign_id
      and member.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.campaigns campaign
    where campaign.id = campaign_rolls.campaign_id
      and campaign.owner_id = auth.uid()
  )
);

drop policy if exists "campaign members can create campaign rolls" on public.campaign_rolls;
create policy "campaign members can create campaign rolls"
on public.campaign_rolls
for insert
with check (
  auth.uid() = user_id
  and (
    exists (
      select 1
      from public.campaign_members member
      where member.campaign_id = campaign_rolls.campaign_id
        and member.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.campaigns campaign
      where campaign.id = campaign_rolls.campaign_id
        and campaign.owner_id = auth.uid()
    )
  )
);

drop policy if exists "campaign masters can delete campaign rolls" on public.campaign_rolls;
create policy "campaign masters can delete campaign rolls"
on public.campaign_rolls
for delete
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.campaigns campaign
    where campaign.id = campaign_rolls.campaign_id
      and campaign.owner_id = auth.uid()
  )
  or exists (
    select 1
    from public.campaign_members member
    where member.campaign_id = campaign_rolls.campaign_id
      and member.user_id = auth.uid()
      and member.role in ('master', 'mestre', 'dm')
  )
);

grant select, insert, delete on public.campaign_rolls to authenticated;
