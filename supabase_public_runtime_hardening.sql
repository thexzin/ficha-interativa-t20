-- Fecha a enumeracao anonima de fichas e estados de combate.
-- Links publicos continuam funcionando apenas para um UUID exato e opt-in.

alter table public.characters enable row level security;
alter table public.character_runtime_states enable row level security;

drop policy if exists characters_select_public_link on public.characters;
drop policy if exists "character_runtime_select_public" on public.character_runtime_states;

revoke select on table public.characters from anon;
revoke select (id, name, player_name, sheet_data, updated_at, is_public, is_private)
on public.characters from anon;
revoke all privileges on table public.character_runtime_states from anon;

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

create or replace function public.get_public_character(character_uuid uuid)
returns table (
  id uuid,
  name text,
  player_name text,
  sheet_data jsonb,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    character.id,
    character.name,
    character.player_name,
    character.sheet_data,
    character.updated_at
  from public.characters as character
  where character.id = character_uuid
    and coalesce(character.is_public, false)
    and not coalesce(character.is_private, false)
  limit 1;
$$;

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

revoke all on function public.get_public_character(uuid) from public, anon, authenticated;
revoke all on function public.get_public_character_runtime(uuid) from public, anon, authenticated;
grant execute on function public.get_public_character(uuid) to anon, authenticated;
grant execute on function public.get_public_character_runtime(uuid) to anon, authenticated;
