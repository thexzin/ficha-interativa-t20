-- Permite ao mestre remover uma ficha de jogador da campanha sem apagar a ficha.
-- Execute no SQL Editor do Supabase depois das tabelas e das funcoes de permissao.

create or replace function public.remove_character_from_campaign(character_uuid uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_campaign uuid;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select campaign_id
    into target_campaign
  from public.characters
  where id = character_uuid;

  if target_campaign is null then
    raise exception 'character_not_in_campaign';
  end if;

  if not public.can_manage_campaign(target_campaign) then
    raise exception 'not_campaign_master';
  end if;

  update public.characters
    set campaign_id = null,
        updated_at = now()
  where id = character_uuid;

  return character_uuid;
end;
$$;

grant execute on function public.remove_character_from_campaign(uuid) to authenticated;
