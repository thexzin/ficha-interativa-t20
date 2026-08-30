-- Public character links are opt-in and expose only the sheet payload.
alter table public.characters
  alter column is_public set default false;

-- Existing rows predate an explicit sharing control, so keep them private.
update public.characters
set is_public = false
where is_public is distinct from false;

drop policy if exists characters_select_public_link on public.characters;
revoke select on table public.characters from anon;
revoke select (id, name, player_name, sheet_data, updated_at, is_public, is_private)
on public.characters from anon;

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

revoke all on function public.get_public_character(uuid) from public, anon, authenticated;
grant execute on function public.get_public_character(uuid) to anon, authenticated;
