alter table public.stories
  alter column id set default gen_random_uuid();

grant select on public.stories to anon;
grant select, insert, update, delete on public.stories to authenticated;
