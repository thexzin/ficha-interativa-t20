-- Campaign-link auditing and permission hardening.
-- Safe to run once through the Supabase migration runner.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.character_campaign_audit (
  id bigint generated always as identity primary key,
  character_id uuid not null,
  owner_id uuid,
  old_campaign_id uuid,
  new_campaign_id uuid,
  changed_by uuid,
  request_role text,
  changed_at timestamptz not null default now(),
  transaction_id bigint not null default pg_catalog.txid_current()
);

create index if not exists character_campaign_audit_character_changed_idx
  on private.character_campaign_audit (character_id, changed_at desc);

create index if not exists character_campaign_audit_changed_by_idx
  on private.character_campaign_audit (changed_by, changed_at desc);

create or replace function private.audit_character_campaign_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.campaign_id is distinct from new.campaign_id then
    insert into private.character_campaign_audit (
      character_id,
      owner_id,
      old_campaign_id,
      new_campaign_id,
      changed_by,
      request_role
    )
    values (
      old.id,
      old.owner_id,
      old.campaign_id,
      new.campaign_id,
      auth.uid(),
      nullif(pg_catalog.current_setting('request.jwt.claim.role', true), '')
    );
  end if;

  return new;
end;
$$;

revoke all on function private.audit_character_campaign_change() from public, anon, authenticated;

drop trigger if exists audit_character_campaign_change on public.characters;
create trigger audit_character_campaign_change
after update of campaign_id on public.characters
for each row
when (old.campaign_id is distinct from new.campaign_id)
execute function private.audit_character_campaign_change();

create index if not exists campaigns_owner_id_idx
  on public.campaigns (owner_id);

create index if not exists characters_owner_id_idx
  on public.characters (owner_id);

create index if not exists characters_campaign_id_idx
  on public.characters (campaign_id);

create index if not exists campaign_members_user_id_idx
  on public.campaign_members (user_id);

create index if not exists campaign_rolls_character_id_idx
  on public.campaign_rolls (character_id);

create index if not exists campaign_rolls_user_id_idx
  on public.campaign_rolls (user_id);

create or replace function public.can_read_campaign(campaign_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and (
      exists (
        select 1
        from public.campaigns campaign
        where campaign.id = campaign_uuid
          and campaign.owner_id = (select auth.uid())
      )
      or exists (
        select 1
        from public.campaign_members member
        where member.campaign_id = campaign_uuid
          and member.user_id = (select auth.uid())
          and member.status = 'ativo'
      )
    );
$$;

create or replace function public.can_manage_campaign(campaign_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and (
      exists (
        select 1
        from public.campaigns campaign
        where campaign.id = campaign_uuid
          and campaign.owner_id = (select auth.uid())
      )
      or exists (
        select 1
        from public.campaign_members member
        where member.campaign_id = campaign_uuid
          and member.user_id = (select auth.uid())
          and member.status = 'ativo'
          and member.role in ('master', 'mestre', 'dm')
      )
    );
$$;

create or replace function public.is_campaign_master(target_campaign_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select public.can_manage_campaign(target_campaign_id);
$$;

create or replace function public.is_campaign_member(target_campaign_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select public.can_read_campaign(target_campaign_id);
$$;

create or replace function public.join_campaign_by_code(code text)
returns table(id uuid, name text, invite_code text, updated_at timestamptz)
language plpgsql
security definer
set search_path = ''
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

  select campaign.*
    into target_campaign
  from public.campaigns campaign
  where upper(campaign.invite_code) = clean_code
  limit 1;

  if target_campaign.id is null then
    raise exception 'campaign_not_found';
  end if;

  insert into public.campaign_members as existing (
    campaign_id,
    user_id,
    role,
    status
  )
  values (
    target_campaign.id,
    auth.uid(),
    'player',
    'ativo'
  )
  on conflict (campaign_id, user_id) do update
    set role = case
          when existing.role in ('master', 'mestre', 'dm') then existing.role
          else 'player'
        end,
        status = 'ativo',
        updated_at = now();

  return query
    select
      target_campaign.id,
      target_campaign.name,
      target_campaign.invite_code,
      target_campaign.updated_at;
end;
$$;

alter function public.touch_updated_at() set search_path = '';

drop policy if exists campaigns_select_for_members on public.campaigns;
create policy campaigns_select_for_members
on public.campaigns
for select
to authenticated
using (public.can_read_campaign(id));

drop policy if exists campaigns_insert_by_owner on public.campaigns;
create policy campaigns_insert_by_owner
on public.campaigns
for insert
to authenticated
with check ((select auth.uid()) = owner_id);

drop policy if exists campaigns_update_by_owner on public.campaigns;
create policy campaigns_update_by_owner
on public.campaigns
for update
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

drop policy if exists campaigns_delete_by_owner on public.campaigns;
create policy campaigns_delete_by_owner
on public.campaigns
for delete
to authenticated
using ((select auth.uid()) = owner_id);

drop policy if exists campaign_members_select_for_campaign on public.campaign_members;
create policy campaign_members_select_for_campaign
on public.campaign_members
for select
to authenticated
using (public.can_read_campaign(campaign_id));

drop policy if exists campaign_members_insert_by_master on public.campaign_members;
create policy campaign_members_insert_by_master
on public.campaign_members
for insert
to authenticated
with check (public.can_manage_campaign(campaign_id));

drop policy if exists campaign_members_update_by_master on public.campaign_members;
create policy campaign_members_update_by_master
on public.campaign_members
for update
to authenticated
using (public.can_manage_campaign(campaign_id))
with check (public.can_manage_campaign(campaign_id));

drop policy if exists campaign_members_delete_self_or_master on public.campaign_members;
create policy campaign_members_delete_self_or_master
on public.campaign_members
for delete
to authenticated
using ((select auth.uid()) = user_id or public.can_manage_campaign(campaign_id));

drop policy if exists characters_select_owner_or_campaign on public.characters;
create policy characters_select_owner_or_campaign
on public.characters
for select
to authenticated
using (
  (select auth.uid()) = owner_id
  or public.can_manage_campaign(campaign_id)
  or (
    coalesce(is_private, false) = false
    and public.can_read_campaign(campaign_id)
  )
);

drop policy if exists characters_insert_by_owner on public.characters;
create policy characters_insert_by_owner
on public.characters
for insert
to authenticated
with check (
  (select auth.uid()) = owner_id
  and (campaign_id is null or public.can_read_campaign(campaign_id))
  and (
    coalesce(is_private, false) = false
    or campaign_id is null
    or public.can_manage_campaign(campaign_id)
  )
);

drop policy if exists characters_update_by_owner on public.characters;
create policy characters_update_by_owner
on public.characters
for update
to authenticated
using ((select auth.uid()) = owner_id)
with check (
  (select auth.uid()) = owner_id
  and (campaign_id is null or public.can_read_campaign(campaign_id))
  and (
    coalesce(is_private, false) = false
    or campaign_id is null
    or public.can_manage_campaign(campaign_id)
  )
);

drop policy if exists characters_delete_by_owner on public.characters;
create policy characters_delete_by_owner
on public.characters
for delete
to authenticated
using ((select auth.uid()) = owner_id);

drop policy if exists campaign_rolls_select_for_members on public.campaign_rolls;
create policy campaign_rolls_select_for_members
on public.campaign_rolls
for select
to authenticated
using (public.can_read_campaign(campaign_id));

drop policy if exists campaign_rolls_insert_for_members on public.campaign_rolls;
create policy campaign_rolls_insert_for_members
on public.campaign_rolls
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and public.can_read_campaign(campaign_id)
);

drop policy if exists campaign_rolls_delete_self_or_master on public.campaign_rolls;
create policy campaign_rolls_delete_self_or_master
on public.campaign_rolls
for delete
to authenticated
using (
  (select auth.uid()) = user_id
  or public.can_manage_campaign(campaign_id)
);

revoke all on public.campaigns from anon;
revoke all on public.characters from anon;
revoke all on public.campaign_members from anon;
revoke all on public.campaign_rolls from anon;

revoke truncate, references, trigger on public.campaigns from authenticated;
revoke truncate, references, trigger on public.characters from authenticated;
revoke truncate, references, trigger on public.campaign_members from authenticated;
revoke truncate, references, trigger on public.campaign_rolls from authenticated;

grant select, insert, update, delete on public.campaigns to authenticated;
grant select, insert, update, delete on public.characters to authenticated;
grant select, insert, update, delete on public.campaign_members to authenticated;
grant select, insert, delete on public.campaign_rolls to authenticated;

revoke execute on function public.add_campaign_owner_member() from public, anon, authenticated;
revoke execute on function public.touch_updated_at() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

revoke execute on function public.can_read_campaign(uuid) from public, anon;
revoke execute on function public.can_manage_campaign(uuid) from public, anon;
revoke execute on function public.is_campaign_master(uuid) from public, anon;
revoke execute on function public.is_campaign_member(uuid) from public, anon;
revoke execute on function public.create_campaign(text, text) from public, anon;
revoke execute on function public.join_campaign_by_code(text) from public, anon;
revoke execute on function public.link_character_to_campaign(uuid, text) from public, anon;
revoke execute on function public.remove_character_from_campaign(uuid) from public, anon;

grant execute on function public.can_read_campaign(uuid) to authenticated;
grant execute on function public.can_manage_campaign(uuid) to authenticated;
grant execute on function public.is_campaign_master(uuid) to authenticated;
grant execute on function public.is_campaign_member(uuid) to authenticated;
grant execute on function public.create_campaign(text, text) to authenticated;
grant execute on function public.join_campaign_by_code(text) to authenticated;
grant execute on function public.link_character_to_campaign(uuid, text) to authenticated;
grant execute on function public.remove_character_from_campaign(uuid) to authenticated;
