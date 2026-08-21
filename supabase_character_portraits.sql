-- Retratos publicos, com escrita isolada pela pasta do usuario autenticado.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'character-portraits',
  'character-portraits',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "portrait_objects_select_own" on storage.objects;
drop policy if exists "portrait_objects_insert_own" on storage.objects;
drop policy if exists "portrait_objects_update_own" on storage.objects;
drop policy if exists "portrait_objects_delete_own" on storage.objects;

create policy "portrait_objects_select_own"
on storage.objects for select
to authenticated
using (
  bucket_id = 'character-portraits'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "portrait_objects_insert_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'character-portraits'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "portrait_objects_update_own"
on storage.objects for update
to authenticated
using (
  bucket_id = 'character-portraits'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'character-portraits'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "portrait_objects_delete_own"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'character-portraits'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
