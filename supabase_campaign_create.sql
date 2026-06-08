alter table public.campaign_members
  drop constraint if exists campaign_members_role_check;

alter table public.campaign_members
  add constraint campaign_members_role_check
  check (role in ('master', 'player', 'mestre', 'jogador', 'dm'));

create or replace function public.create_campaign(
  campaign_name text,
  master_name_input text default null
)
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
  new_campaign public.campaigns%rowtype;
  clean_name text;
  clean_master text;
  new_code text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  clean_name := nullif(trim(coalesce(campaign_name, '')), '');
  clean_master := nullif(trim(coalesce(master_name_input, '')), '');

  if clean_name is null then
    clean_name := 'Nova campanha';
  end if;

  loop
    new_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    exit when not exists (
      select 1
      from public.campaigns existing_campaign
      where existing_campaign.invite_code = new_code
    );
  end loop;

  insert into public.campaigns (
    owner_id,
    name,
    master_name,
    invite_code,
    updated_at
  )
  values (
    auth.uid(),
    clean_name,
    clean_master,
    new_code,
    now()
  )
  returning * into new_campaign;

  insert into public.campaign_members (
    campaign_id,
    user_id,
    role
  )
  values (
    new_campaign.id,
    auth.uid(),
    'master'
  )
  on conflict (campaign_id, user_id) do update
    set role = excluded.role;

  return query
    select
      new_campaign.id,
      new_campaign.name,
      new_campaign.invite_code,
      new_campaign.updated_at;
end;
$$;

grant execute on function public.create_campaign(text, text) to authenticated;
