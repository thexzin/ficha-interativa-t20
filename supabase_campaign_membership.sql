-- Funcoes de entrada e vinculo de campanhas por codigo.
-- Execute depois de criar campaigns, campaign_members e characters.

drop function if exists public.link_character_to_campaign(uuid, text);
drop function if exists public.join_campaign_by_code(text);

create or replace function public.join_campaign_by_code(code text)
returns table (
  id uuid,
  name text,
  invite_code text,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_campaign public.campaigns%rowtype;
  clean_code text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  clean_code := upper(trim(coalesce(code, '')));
  if clean_code = '' then
    raise exception 'invalid_invite_code';
  end if;

  select *
    into target_campaign
  from public.campaigns campaign
  where upper(campaign.invite_code) = clean_code
  limit 1;

  if target_campaign.id is null then
    raise exception 'campaign_not_found';
  end if;

  insert into public.campaign_members (
    campaign_id,
    user_id,
    role
  )
  values (
    target_campaign.id,
    auth.uid(),
    'player'
  )
  on conflict (campaign_id, user_id) do nothing;

  return query
    select
      target_campaign.id,
      target_campaign.name,
      target_campaign.invite_code,
      target_campaign.updated_at;
end;
$$;

create or replace function public.link_character_to_campaign(
  character_uuid uuid,
  code text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_campaign_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select joined.id
    into target_campaign_id
  from public.join_campaign_by_code(code) joined
  limit 1;

  if target_campaign_id is null then
    raise exception 'campaign_not_found';
  end if;

  update public.characters
    set campaign_id = target_campaign_id,
        updated_at = now()
  where id = character_uuid
    and owner_id = auth.uid()
    and coalesce(is_private, false) = false;

  if not found then
    raise exception 'character_not_found_or_not_owned';
  end if;

  return target_campaign_id;
end;
$$;

grant execute on function public.join_campaign_by_code(text) to authenticated;
grant execute on function public.link_character_to_campaign(uuid, text) to authenticated;
