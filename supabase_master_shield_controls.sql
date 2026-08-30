-- Estado compartilhado de combate e controles rápidos do Escudo do Mestre.
-- Mantém PV, PM e condições fora do JSON completo da ficha para evitar que
-- salvamentos concorrentes do jogador e do mestre desfaçam alterações.

create table if not exists public.character_runtime_states (
  character_id uuid primary key references public.characters(id) on delete cascade,
  pv_current integer not null default 0,
  pm_current integer not null default 0,
  pv_temp integer not null default 0 check (pv_temp >= 0),
  pm_temp integer not null default 0 check (pm_temp >= 0),
  conditions jsonb not null default '{}'::jsonb,
  custom_conditions jsonb not null default '[]'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists character_runtime_states_updated_by_idx
  on public.character_runtime_states (updated_by);

alter table public.character_runtime_states enable row level security;

drop policy if exists "character_runtime_select_authorized" on public.character_runtime_states;
create policy "character_runtime_select_authorized"
on public.character_runtime_states
for select
to authenticated
using (
  exists (
    select 1
    from public.characters character
    where character.id = character_id
      and (
        character.owner_id = (select auth.uid())
        or public.can_manage_campaign(character.campaign_id)
        or (
          coalesce(character.is_private, false) = false
          and public.can_read_campaign(character.campaign_id)
        )
      )
  )
);

drop policy if exists "character_runtime_select_public" on public.character_runtime_states;

drop policy if exists "character_runtime_insert_authorized" on public.character_runtime_states;
create policy "character_runtime_insert_authorized"
on public.character_runtime_states
for insert
to authenticated
with check (
  exists (
    select 1
    from public.characters character
    where character.id = character_id
      and (
        character.owner_id = (select auth.uid())
        or public.can_manage_campaign(character.campaign_id)
      )
  )
);

drop policy if exists "character_runtime_update_authorized" on public.character_runtime_states;
create policy "character_runtime_update_authorized"
on public.character_runtime_states
for update
to authenticated
using (
  exists (
    select 1
    from public.characters character
    where character.id = character_id
      and (
        character.owner_id = (select auth.uid())
        or public.can_manage_campaign(character.campaign_id)
      )
  )
)
with check (
  exists (
    select 1
    from public.characters character
    where character.id = character_id
      and (
        character.owner_id = (select auth.uid())
        or public.can_manage_campaign(character.campaign_id)
      )
  )
);

drop policy if exists "character_runtime_delete_authorized" on public.character_runtime_states;
create policy "character_runtime_delete_authorized"
on public.character_runtime_states
for delete
to authenticated
using (
  exists (
    select 1
    from public.characters character
    where character.id = character_id
      and (
        character.owner_id = (select auth.uid())
        or public.can_manage_campaign(character.campaign_id)
      )
  )
);

revoke all privileges on table public.character_runtime_states from anon;
grant select, insert, update, delete on public.character_runtime_states to authenticated;

create or replace function public.get_public_character_runtime(character_uuid uuid)
returns table (
  character_id uuid,
  pv_current integer,
  pm_current integer,
  pv_temp integer,
  pm_temp integer,
  conditions jsonb,
  custom_conditions jsonb,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    runtime.character_id,
    runtime.pv_current,
    runtime.pm_current,
    runtime.pv_temp,
    runtime.pm_temp,
    runtime.conditions,
    runtime.custom_conditions,
    runtime.updated_at
  from public.character_runtime_states as runtime
  join public.characters as character on character.id = runtime.character_id
  where runtime.character_id = character_uuid
    and coalesce(character.is_public, false)
    and not coalesce(character.is_private, false)
  limit 1;
$$;

revoke all on function public.get_public_character_runtime(uuid) from public, anon, authenticated;
grant execute on function public.get_public_character_runtime(uuid) to anon, authenticated;

drop trigger if exists character_runtime_touch_updated_at on public.character_runtime_states;
create trigger character_runtime_touch_updated_at
before update on public.character_runtime_states
for each row
execute function public.touch_updated_at();

create or replace function public.create_character_runtime_state()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  insert into public.character_runtime_states (
    character_id, pv_current, pm_current, pv_temp, pm_temp,
    conditions, custom_conditions, updated_by
  ) values (
    new.id,
    case when coalesce(new.sheet_data -> 'fields' ->> 'pvAtual', '') ~ '^-?[0-9]+$'
      then (new.sheet_data -> 'fields' ->> 'pvAtual')::integer else 0 end,
    case when coalesce(new.sheet_data -> 'fields' ->> 'pmAtual', '') ~ '^-?[0-9]+$'
      then (new.sheet_data -> 'fields' ->> 'pmAtual')::integer else 0 end,
    greatest(0, case when coalesce(new.sheet_data -> 'fields' ->> 'pvBonus', '') ~ '^-?[0-9]+$'
      then (new.sheet_data -> 'fields' ->> 'pvBonus')::integer else 0 end),
    greatest(0, case when coalesce(new.sheet_data -> 'fields' ->> 'pmBonus', '') ~ '^-?[0-9]+$'
      then (new.sheet_data -> 'fields' ->> 'pmBonus')::integer else 0 end),
    coalesce(new.sheet_data -> 'state' -> 'conditions', '{}'::jsonb),
    coalesce(new.sheet_data -> 'state' -> 'customConditions', '[]'::jsonb),
    new.owner_id
  )
  on conflict (character_id) do nothing;
  return new;
end;
$$;

revoke all on function public.create_character_runtime_state() from public;

drop trigger if exists character_create_runtime_state on public.characters;
create trigger character_create_runtime_state
after insert on public.characters
for each row
execute function public.create_character_runtime_state();

insert into public.character_runtime_states (
  character_id, pv_current, pm_current, pv_temp, pm_temp,
  conditions, custom_conditions, updated_by
)
select
  character.id,
  case when coalesce(character.sheet_data -> 'fields' ->> 'pvAtual', '') ~ '^-?[0-9]+$'
    then (character.sheet_data -> 'fields' ->> 'pvAtual')::integer else 0 end,
  case when coalesce(character.sheet_data -> 'fields' ->> 'pmAtual', '') ~ '^-?[0-9]+$'
    then (character.sheet_data -> 'fields' ->> 'pmAtual')::integer else 0 end,
  greatest(0, case when coalesce(character.sheet_data -> 'fields' ->> 'pvBonus', '') ~ '^-?[0-9]+$'
    then (character.sheet_data -> 'fields' ->> 'pvBonus')::integer else 0 end),
  greatest(0, case when coalesce(character.sheet_data -> 'fields' ->> 'pmBonus', '') ~ '^-?[0-9]+$'
    then (character.sheet_data -> 'fields' ->> 'pmBonus')::integer else 0 end),
  coalesce(character.sheet_data -> 'state' -> 'conditions', '{}'::jsonb),
  coalesce(character.sheet_data -> 'state' -> 'customConditions', '[]'::jsonb),
  character.owner_id
from public.characters character
on conflict (character_id) do nothing;

create or replace function public.adjust_character_runtime_resource(
  p_character_id uuid,
  p_resource text,
  p_delta integer
)
returns public.character_runtime_states
language plpgsql
security invoker
set search_path = ''
as $$
declare
  changed public.character_runtime_states;
begin
  if p_resource not in ('pv', 'pm') then
    raise exception 'invalid_resource';
  end if;

  if p_resource = 'pv' then
    update public.character_runtime_states
    set pv_current = case
          when p_delta >= 0 then pv_current + p_delta
          else pv_current - greatest(0, -p_delta - pv_temp)
        end,
        pv_temp = case
          when p_delta < 0 then greatest(0, pv_temp + p_delta)
          else pv_temp
        end,
        updated_by = (select auth.uid())
    where character_id = p_character_id
    returning * into changed;
  else
    update public.character_runtime_states
    set pm_current = case
          when p_delta >= 0 then pm_current + p_delta
          else greatest(0, pm_current - greatest(0, -p_delta - pm_temp))
        end,
        pm_temp = case
          when p_delta < 0 then greatest(0, pm_temp + p_delta)
          else pm_temp
        end,
        updated_by = (select auth.uid())
    where character_id = p_character_id
    returning * into changed;
  end if;

  if changed.character_id is null then
    raise exception 'runtime_state_not_found_or_forbidden';
  end if;
  return changed;
end;
$$;

create or replace function public.set_character_runtime_condition(
  p_character_id uuid,
  p_condition_name text,
  p_active boolean
)
returns public.character_runtime_states
language plpgsql
security invoker
set search_path = ''
as $$
declare
  changed public.character_runtime_states;
  safe_name text := nullif(trim(p_condition_name), '');
begin
  if safe_name is null then
    raise exception 'invalid_condition';
  end if;

  update public.character_runtime_states
  set conditions = coalesce(conditions, '{}'::jsonb)
        || jsonb_build_object(safe_name, jsonb_build_object('active', coalesce(p_active, false))),
      updated_by = (select auth.uid())
  where character_id = p_character_id
  returning * into changed;

  if changed.character_id is null then
    raise exception 'runtime_state_not_found_or_forbidden';
  end if;
  return changed;
end;
$$;

revoke all on function public.adjust_character_runtime_resource(uuid, text, integer) from public;
revoke all on function public.set_character_runtime_condition(uuid, text, boolean) from public;
grant execute on function public.adjust_character_runtime_resource(uuid, text, integer) to authenticated;
grant execute on function public.set_character_runtime_condition(uuid, text, boolean) to authenticated;

-- Corrige a validação cruzada de campanha nas políticas de iniciativa.
drop policy if exists "initiative_entries_insert_authorized" on public.campaign_initiative_entries;
create policy "initiative_entries_insert_authorized"
on public.campaign_initiative_entries
for insert
to authenticated
with check (
  exists (
    select 1 from public.campaign_encounters encounter
    where encounter.id = campaign_initiative_entries.encounter_id
      and encounter.campaign_id = campaign_initiative_entries.campaign_id
      and encounter.status in ('collecting', 'active')
  )
  and (
    public.can_manage_campaign(campaign_initiative_entries.campaign_id)
    or (
      (select auth.uid()) = campaign_initiative_entries.user_id
      and exists (
        select 1 from public.characters character
        where character.id = campaign_initiative_entries.character_id
          and character.owner_id = (select auth.uid())
          and character.campaign_id = campaign_initiative_entries.campaign_id
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
  public.can_manage_campaign(campaign_initiative_entries.campaign_id)
  or (
    (select auth.uid()) = campaign_initiative_entries.user_id
    and exists (
      select 1 from public.characters character
      where character.id = campaign_initiative_entries.character_id
        and character.owner_id = (select auth.uid())
        and character.campaign_id = campaign_initiative_entries.campaign_id
    )
  )
)
with check (
  exists (
    select 1 from public.campaign_encounters encounter
    where encounter.id = campaign_initiative_entries.encounter_id
      and encounter.campaign_id = campaign_initiative_entries.campaign_id
      and encounter.status in ('collecting', 'active')
  )
  and (
    public.can_manage_campaign(campaign_initiative_entries.campaign_id)
    or (
      (select auth.uid()) = campaign_initiative_entries.user_id
      and exists (
        select 1 from public.characters character
        where character.id = campaign_initiative_entries.character_id
          and character.owner_id = (select auth.uid())
          and character.campaign_id = campaign_initiative_entries.campaign_id
      )
    )
  )
);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'character_runtime_states'
  ) then
    alter publication supabase_realtime add table public.character_runtime_states;
  end if;
end
$$;
