-- Fichas ocultas para jogadores.
-- Execute uma vez no SQL Editor do Supabase se o banco ja foi configurado.

alter table public.characters
  add column if not exists is_private boolean not null default false;

drop policy if exists "characters_select_owner_or_campaign" on public.characters;
drop policy if exists "characters_insert_by_owner" on public.characters;
drop policy if exists "characters_update_by_owner" on public.characters;

create policy "characters_select_owner_or_campaign"
on public.characters
for select
using (
  auth.uid() = owner_id
  or public.can_manage_campaign(campaign_id)
  or (
    coalesce(is_private, false) = false
    and public.can_read_campaign(campaign_id)
  )
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
  and (
    coalesce(is_private, false) = false
    or campaign_id is null
    or public.can_manage_campaign(campaign_id)
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
  and (
    coalesce(is_private, false) = false
    or campaign_id is null
    or public.can_manage_campaign(campaign_id)
  )
);
