-- Public character links are opt-in and expose only the sheet payload.
alter table public.characters
  alter column is_public set default false;

-- Existing rows predate an explicit sharing control, so keep them private.
update public.characters
set is_public = false
where is_public is distinct from false;

drop policy if exists characters_select_public_link on public.characters;
create policy characters_select_public_link
on public.characters
for select
to anon, authenticated
using (
  coalesce(is_public, false)
  and not coalesce(is_private, false)
);

revoke select on table public.characters from anon;
grant select (id, name, player_name, sheet_data, updated_at, is_public, is_private)
on public.characters to anon;

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
security invoker
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

revoke all on function public.get_public_character(uuid) from public;
grant execute on function public.get_public_character(uuid) to anon, authenticated;
