create table if not exists public.user_image_gallery (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bucket text not null,
  path text not null,
  public_url text not null,
  nome text,
  mime_type text,
  size_bytes bigint,
  context text,
  created_at timestamptz not null default now()
);

create unique index if not exists user_image_gallery_bucket_path_key
on public.user_image_gallery(bucket, path);

create index if not exists user_image_gallery_user_created_idx
on public.user_image_gallery(user_id, created_at desc);

alter table public.user_image_gallery enable row level security;

drop policy if exists user_image_gallery_select_own on public.user_image_gallery;
create policy user_image_gallery_select_own
on public.user_image_gallery
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists user_image_gallery_insert_own on public.user_image_gallery;
create policy user_image_gallery_insert_own
on public.user_image_gallery
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists user_image_gallery_update_own on public.user_image_gallery;
create policy user_image_gallery_update_own
on public.user_image_gallery
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists user_image_gallery_delete_own on public.user_image_gallery;
create policy user_image_gallery_delete_own
on public.user_image_gallery
for delete
to authenticated
using (user_id = auth.uid());
