-- Permissoes/RLS da Ficha Interativa Tormenta20.
-- Execute depois de criar as tabelas campaigns, campaign_members, characters
-- e, se for usar o Escudo, depois de supabase_campaign_rolls.sql.

create extension if not exists pgcrypto;

do $$
declare
  policy_row record;
begin
  for policy_row in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('campaigns', 'campaign_members', 'characters', 'campaign_rolls')
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      policy_row.policyname,
      policy_row.schemaname,
      policy_row.tablename
    );
  end loop;
end
$$;

create or replace function public.can_read_campaign(campaign_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and (
      exists (
        select 1
        from public.campaigns campaign
        where campaign.id = campaign_uuid
          and campaign.owner_id = auth.uid()
      )
      or exists (
        select 1
        from public.campaign_members member
        where member.campaign_id = campaign_uuid
          and member.user_id = auth.uid()
      )
    );
$$;

create or replace function public.can_manage_campaign(campaign_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.campaigns campaign
      where campaign.id = campaign_uuid
        and campaign.owner_id = auth.uid()
    );
$$;

grant execute on function public.can_read_campaign(uuid) to authenticated;
grant execute on function public.can_manage_campaign(uuid) to authenticated;

alter table public.campaigns enable row level security;
alter table public.campaign_members enable row level security;
alter table public.characters enable row level security;
alter table public.campaign_rolls enable row level security;

create policy "campaigns_select_for_members"
on public.campaigns
for select
using (public.can_read_campaign(id));

create policy "campaigns_insert_by_owner"
on public.campaigns
for insert
with check (auth.uid() = owner_id);

create policy "campaigns_update_by_owner"
on public.campaigns
for update
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy "campaigns_delete_by_owner"
on public.campaigns
for delete
using (auth.uid() = owner_id);

create policy "campaign_members_select_for_campaign"
on public.campaign_members
for select
using (public.can_read_campaign(campaign_id));

create policy "campaign_members_insert_by_master"
on public.campaign_members
for insert
with check (public.can_manage_campaign(campaign_id));

create policy "campaign_members_update_by_master"
on public.campaign_members
for update
using (public.can_manage_campaign(campaign_id))
with check (public.can_manage_campaign(campaign_id));

create policy "campaign_members_delete_self_or_master"
on public.campaign_members
for delete
using (auth.uid() = user_id or public.can_manage_campaign(campaign_id));

create policy "characters_select_owner_or_campaign"
on public.characters
for select
using (
  auth.uid() = owner_id
  or public.can_read_campaign(campaign_id)
);

create policy "characters_insert_by_owner"
on public.characters
for insert
with check (
  auth.uid() = owner_id
  and (
    campaign_id is null
    or public.can_read_campaign(campaign_id)
  )
);

create policy "characters_update_by_owner"
on public.characters
for update
using (auth.uid() = owner_id)
with check (
  auth.uid() = owner_id
  and (
    campaign_id is null
    or public.can_read_campaign(campaign_id)
  )
);

create policy "characters_delete_by_owner"
on public.characters
for delete
using (auth.uid() = owner_id);

create policy "campaign_rolls_select_for_members"
on public.campaign_rolls
for select
using (public.can_manage_campaign(campaign_id));

create policy "campaign_rolls_insert_for_members"
on public.campaign_rolls
for insert
with check (
  auth.uid() = user_id
  and public.can_read_campaign(campaign_id)
);

create policy "campaign_rolls_delete_self_or_master"
on public.campaign_rolls
for delete
using (
  auth.uid() = user_id
  or public.can_manage_campaign(campaign_id)
);

grant select, insert, update, delete on public.campaigns to authenticated;
grant select, insert, update, delete on public.campaign_members to authenticated;
grant select, insert, update, delete on public.characters to authenticated;
grant select, insert, delete on public.campaign_rolls to authenticated;
