-- Feed interactions used by app/feed:
-- - curtidas_post: likes
-- - comentarios: comments and replies
-- - reposts: shares/reposts
--
-- This migration is intentionally idempotent because some production projects
-- already have these tables created manually.

create table if not exists public.curtidas_post (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null,
  user_id uuid not null,
  created_at timestamptz not null default now()
);

alter table public.curtidas_post
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists post_id uuid,
  add column if not exists user_id uuid,
  add column if not exists created_at timestamptz not null default now();

create unique index if not exists curtidas_post_post_user_key
  on public.curtidas_post(post_id, user_id);

create index if not exists curtidas_post_post_id_idx
  on public.curtidas_post(post_id);

create index if not exists curtidas_post_user_id_idx
  on public.curtidas_post(user_id);

create table if not exists public.comentarios (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null,
  autor_user_id uuid not null,
  conteudo text not null,
  comentario_pai_id uuid null,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.comentarios
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists post_id uuid,
  add column if not exists autor_user_id uuid,
  add column if not exists conteudo text,
  add column if not exists comentario_pai_id uuid,
  add column if not exists ativo boolean not null default true,
  add column if not exists created_at timestamptz not null default now();

create index if not exists comentarios_post_id_created_idx
  on public.comentarios(post_id, created_at);

create index if not exists comentarios_autor_user_id_idx
  on public.comentarios(autor_user_id);

create index if not exists comentarios_comentario_pai_id_idx
  on public.comentarios(comentario_pai_id);

create table if not exists public.reposts (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null,
  user_id uuid not null,
  comentario text null,
  created_at timestamptz not null default now()
);

alter table public.reposts
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists post_id uuid,
  add column if not exists user_id uuid,
  add column if not exists comentario text,
  add column if not exists created_at timestamptz not null default now();

create unique index if not exists reposts_post_user_key
  on public.reposts(post_id, user_id);

create index if not exists reposts_post_id_idx
  on public.reposts(post_id);

create index if not exists reposts_user_id_idx
  on public.reposts(user_id);

do $$
begin
  if to_regclass('public.posts') is not null then
    if not exists (
      select 1 from pg_constraint where conname = 'curtidas_post_post_id_fkey'
    ) then
      alter table public.curtidas_post
        add constraint curtidas_post_post_id_fkey
        foreign key (post_id) references public.posts(id) on delete cascade;
    end if;

    if not exists (
      select 1 from pg_constraint where conname = 'comentarios_post_id_fkey'
    ) then
      alter table public.comentarios
        add constraint comentarios_post_id_fkey
        foreign key (post_id) references public.posts(id) on delete cascade;
    end if;

    if not exists (
      select 1 from pg_constraint where conname = 'reposts_post_id_fkey'
    ) then
      alter table public.reposts
        add constraint reposts_post_id_fkey
        foreign key (post_id) references public.posts(id) on delete cascade;
    end if;
  end if;

  if to_regclass('auth.users') is not null then
    if not exists (
      select 1 from pg_constraint where conname = 'curtidas_post_user_id_fkey'
    ) then
      alter table public.curtidas_post
        add constraint curtidas_post_user_id_fkey
        foreign key (user_id) references auth.users(id) on delete cascade;
    end if;

    if not exists (
      select 1 from pg_constraint where conname = 'comentarios_autor_user_id_fkey'
    ) then
      alter table public.comentarios
        add constraint comentarios_autor_user_id_fkey
        foreign key (autor_user_id) references auth.users(id) on delete cascade;
    end if;

    if not exists (
      select 1 from pg_constraint where conname = 'reposts_user_id_fkey'
    ) then
      alter table public.reposts
        add constraint reposts_user_id_fkey
        foreign key (user_id) references auth.users(id) on delete cascade;
    end if;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'comentarios_comentario_pai_id_fkey'
  ) then
    alter table public.comentarios
      add constraint comentarios_comentario_pai_id_fkey
      foreign key (comentario_pai_id) references public.comentarios(id) on delete cascade;
  end if;
end $$;

alter table public.curtidas_post enable row level security;
alter table public.comentarios enable row level security;
alter table public.reposts enable row level security;

grant select on public.curtidas_post to anon, authenticated;
grant select on public.comentarios to anon, authenticated;
grant select on public.reposts to anon, authenticated;

grant insert, update, delete on public.curtidas_post to authenticated;
grant insert, update, delete on public.comentarios to authenticated;
grant insert, update, delete on public.reposts to authenticated;

drop policy if exists curtidas_post_read on public.curtidas_post;
create policy curtidas_post_read
on public.curtidas_post
for select
to anon, authenticated
using (true);

drop policy if exists curtidas_post_insert_own on public.curtidas_post;
create policy curtidas_post_insert_own
on public.curtidas_post
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists curtidas_post_delete_own on public.curtidas_post;
create policy curtidas_post_delete_own
on public.curtidas_post
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists curtidas_post_update_own on public.curtidas_post;
create policy curtidas_post_update_own
on public.curtidas_post
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists comentarios_read_active on public.comentarios;
create policy comentarios_read_active
on public.comentarios
for select
to anon, authenticated
using (ativo = true);

drop policy if exists comentarios_insert_own on public.comentarios;
create policy comentarios_insert_own
on public.comentarios
for insert
to authenticated
with check (autor_user_id = auth.uid());

drop policy if exists comentarios_update_own on public.comentarios;
create policy comentarios_update_own
on public.comentarios
for update
to authenticated
using (autor_user_id = auth.uid())
with check (autor_user_id = auth.uid());

drop policy if exists comentarios_delete_own on public.comentarios;
create policy comentarios_delete_own
on public.comentarios
for delete
to authenticated
using (autor_user_id = auth.uid());

drop policy if exists reposts_read on public.reposts;
create policy reposts_read
on public.reposts
for select
to anon, authenticated
using (true);

drop policy if exists reposts_insert_own on public.reposts;
create policy reposts_insert_own
on public.reposts
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists reposts_delete_own on public.reposts;
create policy reposts_delete_own
on public.reposts
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists reposts_update_own on public.reposts;
create policy reposts_update_own
on public.reposts
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
