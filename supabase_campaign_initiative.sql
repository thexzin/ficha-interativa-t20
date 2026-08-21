-- Encontros e ordem de iniciativa do Escudo do Mestre.
-- Pode ser executado depois de supabase_campaign_rolls.sql e supabase_permissions.sql.

create extension if not exists pgcrypto;

create table if not exists public.campaign_encounters (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'collecting'
    check (status in ('collecting', 'active', 'ended')),
  round_number integer not null default 0 check (round_number >= 0),
  current_entry_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  ended_at timestamptz
);

create table if not exists public.campaign_initiative_entries (
  id uuid primary key default gen_random_uuid(),
  encounter_id uuid not null references public.campaign_encounters(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  character_id uuid references public.characters(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  actor_name text not null default 'Participante',
  initiative_total integer,
  initiative_bonus integer not null default 0,
  d20 integer,
  position integer check (position is null or position >= 0),
  participant_state text not null default 'ready'
    check (participant_state in ('ready', 'unconscious', 'out')),
  source text not null default 'campaign'
    check (source in ('campaign', 'roll', 'manual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (encounter_id, character_id)
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'campaign_encounters_current_entry_fkey'
      and conrelid = 'public.campaign_encounters'::regclass
  ) then
    alter table public.campaign_encounters
      add constraint campaign_encounters_current_entry_fkey
      foreign key (current_entry_id)
      references public.campaign_initiative_entries(id)
      on delete set null
      deferrable initially deferred;
  end if;
end
$$;

create unique index if not exists campaign_encounters_one_open_idx
  on public.campaign_encounters (campaign_id)
  where status in ('collecting', 'active');

create index if not exists campaign_encounters_campaign_created_idx
  on public.campaign_encounters (campaign_id, created_at desc);

create index if not exists campaign_encounters_created_by_idx
  on public.campaign_encounters (created_by);

create index if not exists campaign_encounters_current_entry_idx
  on public.campaign_encounters (current_entry_id);

create index if not exists campaign_initiative_encounter_position_idx
  on public.campaign_initiative_entries (encounter_id, position, initiative_total desc);

create index if not exists campaign_initiative_campaign_idx
  on public.campaign_initiative_entries (campaign_id);

create index if not exists campaign_initiative_character_idx
  on public.campaign_initiative_entries (character_id);

create index if not exists campaign_initiative_user_idx
  on public.campaign_initiative_entries (user_id);

alter table public.campaign_encounters enable row level security;
alter table public.campaign_initiative_entries enable row level security;

drop policy if exists "campaign_encounters_select_for_members" on public.campaign_encounters;
create policy "campaign_encounters_select_for_members"
on public.campaign_encounters
for select
to authenticated
using (public.can_read_campaign(campaign_id));

drop policy if exists "campaign_encounters_insert_by_master" on public.campaign_encounters;
create policy "campaign_encounters_insert_by_master"
on public.campaign_encounters
for insert
to authenticated
with check (
  (select auth.uid()) = created_by
  and public.can_manage_campaign(campaign_id)
);

drop policy if exists "campaign_encounters_update_by_master" on public.campaign_encounters;
create policy "campaign_encounters_update_by_master"
on public.campaign_encounters
for update
to authenticated
using (public.can_manage_campaign(campaign_id))
with check (public.can_manage_campaign(campaign_id));

drop policy if exists "campaign_encounters_delete_by_master" on public.campaign_encounters;
create policy "campaign_encounters_delete_by_master"
on public.campaign_encounters
for delete
to authenticated
using (public.can_manage_campaign(campaign_id));

drop policy if exists "initiative_entries_select_for_members" on public.campaign_initiative_entries;
create policy "initiative_entries_select_for_members"
on public.campaign_initiative_entries
for select
to authenticated
using (public.can_read_campaign(campaign_id));

drop policy if exists "initiative_entries_insert_authorized" on public.campaign_initiative_entries;
create policy "initiative_entries_insert_authorized"
on public.campaign_initiative_entries
for insert
to authenticated
with check (
  exists (
    select 1 from public.campaign_encounters encounter
    where encounter.id = encounter_id
      and encounter.campaign_id = campaign_id
      and encounter.status in ('collecting', 'active')
  )
  and (
    public.can_manage_campaign(campaign_id)
    or (
      (select auth.uid()) = user_id
      and exists (
        select 1 from public.characters character
        where character.id = character_id
          and character.owner_id = (select auth.uid())
          and character.campaign_id = campaign_id
      )
    )
  )
);

drop policy if exists "initiative_entries_update_authorized" on public.campaign_initiative_entries;
create policy "initiative_entries_update_authorized"
on public.campaign_initiative_entries
for update
to authenticated
using (
  public.can_manage_campaign(campaign_id)
  or (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.characters character
      where character.id = character_id
        and character.owner_id = (select auth.uid())
        and character.campaign_id = campaign_id
    )
  )
)
with check (
  exists (
    select 1 from public.campaign_encounters encounter
    where encounter.id = encounter_id
      and encounter.campaign_id = campaign_id
      and encounter.status in ('collecting', 'active')
  )
  and (
    public.can_manage_campaign(campaign_id)
    or (
      (select auth.uid()) = user_id
      and exists (
        select 1 from public.characters character
        where character.id = character_id
          and character.owner_id = (select auth.uid())
          and character.campaign_id = campaign_id
      )
    )
  )
);

drop policy if exists "initiative_entries_delete_by_master" on public.campaign_initiative_entries;
create policy "initiative_entries_delete_by_master"
on public.campaign_initiative_entries
for delete
to authenticated
using (public.can_manage_campaign(campaign_id));

grant select, insert, update, delete on public.campaign_encounters to authenticated;
grant select, insert, update, delete on public.campaign_initiative_entries to authenticated;

create or replace function public.capture_campaign_initiative()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  target_encounter uuid;
  encounter_status text;
  roll_bonus integer := 0;
  roll_total integer;
  next_position integer;
begin
  if new.roll_type <> 'd20'
    or lower(trim(new.title)) <> 'iniciativa'
    or new.character_id is null
    or new.user_id is null
  then
    return new;
  end if;

  select encounter.id, encounter.status
    into target_encounter, encounter_status
  from public.campaign_encounters encounter
  where encounter.campaign_id = new.campaign_id
    and encounter.status in ('collecting', 'active')
  order by encounter.created_at desc
  limit 1;

  if target_encounter is null then
    return new;
  end if;

  if coalesce(new.payload ->> 'bonus', '') ~ '^-?[0-9]+$' then
    roll_bonus := (new.payload ->> 'bonus')::integer;
  elsif new.total_attack is not null and new.d20 is not null then
    roll_bonus := new.total_attack - new.d20;
  end if;
  roll_total := coalesce(new.total_attack, coalesce(new.d20, 0) + roll_bonus);

  if encounter_status = 'active' then
    select coalesce(max(entry.position), -1) + 1
      into next_position
    from public.campaign_initiative_entries entry
    where entry.encounter_id = target_encounter;
  end if;

  update public.campaign_initiative_entries
  set actor_name = new.actor_name,
      user_id = new.user_id,
      initiative_total = roll_total,
      initiative_bonus = roll_bonus,
      d20 = new.d20,
      position = case
        when encounter_status = 'active' and position is null then next_position
        else position
      end,
      source = 'roll',
      updated_at = now()
  where encounter_id = target_encounter
    and character_id = new.character_id;

  if not found then
    insert into public.campaign_initiative_entries (
      encounter_id, campaign_id, character_id, user_id, actor_name,
      initiative_total, initiative_bonus, d20, position, source
    ) values (
      target_encounter, new.campaign_id, new.character_id, new.user_id, new.actor_name,
      roll_total, roll_bonus, new.d20,
      case when encounter_status = 'active' then next_position else null end,
      'roll'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists campaign_roll_capture_initiative on public.campaign_rolls;
create trigger campaign_roll_capture_initiative
after insert on public.campaign_rolls
for each row
execute function public.capture_campaign_initiative();
