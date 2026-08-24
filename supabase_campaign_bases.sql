-- Bases compartilhadas de campanha (Herois de Arton, p. 244-251).
-- Execute este arquivo no SQL Editor depois de supabase_permissions.sql.

create extension if not exists pgcrypto;

create table if not exists public.campaign_bases (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Nova base',
  base_type text not null default 'residencia',
  size text not null default 'minima',
  base_data jsonb not null default '{"security_adjustment":0,"maintenance_paid":false,"rooms":[],"furniture":[],"notes":""}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaign_base_residents (
  base_id uuid not null references public.campaign_bases(id) on delete cascade,
  character_id uuid not null references public.characters(id) on delete cascade,
  choices jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (base_id, character_id),
  unique (character_id)
);

create index if not exists campaign_bases_campaign_id_idx
  on public.campaign_bases(campaign_id);
create index if not exists campaign_bases_created_by_idx
  on public.campaign_bases(created_by);
create index if not exists campaign_base_residents_character_id_idx
  on public.campaign_base_residents(character_id);

create or replace function public.touch_campaign_base_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists touch_campaign_bases_updated_at on public.campaign_bases;
create trigger touch_campaign_bases_updated_at
before update on public.campaign_bases
for each row execute function public.touch_campaign_base_updated_at();

drop trigger if exists touch_campaign_base_residents_updated_at on public.campaign_base_residents;
create trigger touch_campaign_base_residents_updated_at
before update on public.campaign_base_residents
for each row execute function public.touch_campaign_base_updated_at();

create or replace function public.protect_campaign_base_identity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.campaign_id := old.campaign_id;
  new.created_by := old.created_by;
  return new;
end;
$$;

drop trigger if exists protect_campaign_base_identity on public.campaign_bases;
create trigger protect_campaign_base_identity
before update on public.campaign_bases
for each row execute function public.protect_campaign_base_identity();

create or replace function public.validate_campaign_base_resident()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  base_campaign uuid;
  character_campaign uuid;
begin
  select campaign_id into base_campaign
    from public.campaign_bases
   where id = new.base_id;

  select campaign_id into character_campaign
    from public.characters
   where id = new.character_id;

  if base_campaign is null or character_campaign is null or base_campaign is distinct from character_campaign then
    raise exception 'base_and_character_must_share_campaign' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_campaign_base_resident on public.campaign_base_residents;
create trigger validate_campaign_base_resident
before insert or update on public.campaign_base_residents
for each row execute function public.validate_campaign_base_resident();

create or replace function public.remove_residency_after_campaign_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.campaign_id is distinct from new.campaign_id then
    delete from public.campaign_base_residents where character_id = new.id;
  end if;
  return new;
end;
$$;

revoke all on function public.remove_residency_after_campaign_change() from public, anon, authenticated;

drop trigger if exists remove_residency_after_campaign_change on public.characters;
create trigger remove_residency_after_campaign_change
after update of campaign_id on public.characters
for each row execute function public.remove_residency_after_campaign_change();

alter table public.campaign_bases enable row level security;
alter table public.campaign_base_residents enable row level security;

drop policy if exists "campaign_bases_select_members" on public.campaign_bases;
drop policy if exists "campaign_bases_insert_members" on public.campaign_bases;
drop policy if exists "campaign_bases_update_members" on public.campaign_bases;
drop policy if exists "campaign_bases_delete_master" on public.campaign_bases;

create policy "campaign_bases_select_members"
on public.campaign_bases for select to authenticated
using (public.can_read_campaign(campaign_id));

create policy "campaign_bases_insert_members"
on public.campaign_bases for insert to authenticated
with check (
  (select auth.uid()) = created_by
  and public.can_read_campaign(campaign_id)
);

create policy "campaign_bases_update_members"
on public.campaign_bases for update to authenticated
using (public.can_read_campaign(campaign_id))
with check (public.can_read_campaign(campaign_id));

create policy "campaign_bases_delete_master"
on public.campaign_bases for delete to authenticated
using (public.can_manage_campaign(campaign_id));

drop policy if exists "campaign_base_residents_select_members" on public.campaign_base_residents;
drop policy if exists "campaign_base_residents_insert_members" on public.campaign_base_residents;
drop policy if exists "campaign_base_residents_update_members" on public.campaign_base_residents;
drop policy if exists "campaign_base_residents_delete_members" on public.campaign_base_residents;

create policy "campaign_base_residents_select_members"
on public.campaign_base_residents for select to authenticated
using (
  exists (
    select 1 from public.campaign_bases base
     where base.id = base_id
       and public.can_read_campaign(base.campaign_id)
       and exists (
         select 1 from public.characters ch
          where ch.id = character_id
            and ch.campaign_id = base.campaign_id
       )
  )
);

create policy "campaign_base_residents_insert_members"
on public.campaign_base_residents for insert to authenticated
with check (
  exists (
    select 1 from public.campaign_bases base
     where base.id = base_id
       and public.can_read_campaign(base.campaign_id)
       and exists (
         select 1 from public.characters ch
          where ch.id = character_id
            and ch.campaign_id = base.campaign_id
       )
  )
);

create policy "campaign_base_residents_update_members"
on public.campaign_base_residents for update to authenticated
using (
  exists (
    select 1 from public.campaign_bases base
     where base.id = base_id
       and public.can_read_campaign(base.campaign_id)
       and exists (
         select 1 from public.characters ch
          where ch.id = character_id
            and ch.campaign_id = base.campaign_id
       )
  )
)
with check (
  exists (
    select 1 from public.campaign_bases base
     where base.id = base_id
       and public.can_read_campaign(base.campaign_id)
       and exists (
         select 1 from public.characters ch
          where ch.id = character_id
            and ch.campaign_id = base.campaign_id
       )
  )
);

create policy "campaign_base_residents_delete_members"
on public.campaign_base_residents for delete to authenticated
using (
  exists (
    select 1 from public.campaign_bases base
     where base.id = base_id
       and public.can_read_campaign(base.campaign_id)
       and exists (
         select 1 from public.characters ch
          where ch.id = character_id
            and ch.campaign_id = base.campaign_id
       )
  )
);

revoke all on table public.campaign_bases from anon;
revoke all on table public.campaign_base_residents from anon;
grant select, insert, update, delete on table public.campaign_bases to authenticated;
grant select, insert, update, delete on table public.campaign_base_residents to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'campaign_bases'
    ) then
      alter publication supabase_realtime add table public.campaign_bases;
    end if;
    if not exists (
      select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'campaign_base_residents'
    ) then
      alter publication supabase_realtime add table public.campaign_base_residents;
    end if;
  end if;
end
$$;
