alter table public.agenda_eventos
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists criado_por uuid references auth.users(id) on delete set null;

create index if not exists agenda_eventos_user_id_idx
  on public.agenda_eventos(user_id);

create index if not exists agenda_eventos_criado_por_idx
  on public.agenda_eventos(criado_por);

grant select, insert, update, delete on table public.agenda_eventos to authenticated;

alter table public.agenda_eventos enable row level security;

drop policy if exists agenda_eventos_select on public.agenda_eventos;
drop policy if exists agenda_eventos_insert_own on public.agenda_eventos;
drop policy if exists agenda_eventos_update_own on public.agenda_eventos;
drop policy if exists agenda_eventos_delete_own on public.agenda_eventos;

create policy agenda_eventos_select
on public.agenda_eventos
for select
to authenticated
using (
  coalesce(user_id, criado_por) = auth.uid()
  or campeonato_id is not null
);

create policy agenda_eventos_insert_own
on public.agenda_eventos
for insert
to authenticated
with check (
  coalesce(user_id, criado_por) = auth.uid()
);

create policy agenda_eventos_update_own
on public.agenda_eventos
for update
to authenticated
using (
  coalesce(user_id, criado_por) = auth.uid()
)
with check (
  coalesce(user_id, criado_por) = auth.uid()
);

create policy agenda_eventos_delete_own
on public.agenda_eventos
for delete
to authenticated
using (
  coalesce(user_id, criado_por) = auth.uid()
);
