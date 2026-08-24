-- Permissao opcional para o mestre editar o conteudo de uma ficha vinculada.
-- A autorizacao pertence ao jogador e volta a false sempre que a campanha muda.

alter table public.characters
  add column if not exists allow_master_edit boolean not null default false;

create or replace function public.reset_master_edit_on_campaign_change()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.campaign_id is distinct from new.campaign_id then
    new.allow_master_edit := false;
  end if;
  return new;
end;
$$;

drop trigger if exists reset_master_edit_on_campaign_change on public.characters;
create trigger reset_master_edit_on_campaign_change
before update of campaign_id on public.characters
for each row
execute function public.reset_master_edit_on_campaign_change();

create or replace function public.update_character_as_campaign_master(
  character_uuid uuid,
  character_name text,
  character_player_name text,
  character_sheet_data jsonb
)
returns table (
  id uuid,
  name text,
  campaign_id uuid,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  requester_id uuid := (select auth.uid());
begin
  if requester_id is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  return query
    update public.characters as character
       set name = coalesce(nullif(trim(character_name), ''), character.name),
           player_name = character_player_name,
           sheet_data = coalesce(character_sheet_data, '{}'::jsonb),
           updated_at = now()
     where character.id = character_uuid
       and character.campaign_id is not null
       and coalesce(character.allow_master_edit, false)
       and exists (
         select 1
           from public.campaigns as campaign
          where campaign.id = character.campaign_id
            and campaign.owner_id = requester_id
       )
    returning character.id, character.name, character.campaign_id, character.updated_at;

  if not found then
    raise exception 'master_edit_not_allowed' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.update_character_as_campaign_master(uuid, text, text, jsonb) from public, anon;
grant execute on function public.update_character_as_campaign_master(uuid, text, text, jsonb) to authenticated;
