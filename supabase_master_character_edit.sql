-- O mestre pode editar automaticamente o conteudo das fichas vinculadas a sua campanha.
-- A funcao nao permite alterar dono, campanha, privacidade ou outras colunas protegidas.

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
