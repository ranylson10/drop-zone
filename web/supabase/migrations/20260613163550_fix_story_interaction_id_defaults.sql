alter table public.story_curtidas
  alter column id set default gen_random_uuid();

alter table public.story_comentarios
  alter column id set default gen_random_uuid();

alter table public.story_visualizacoes
  alter column id set default gen_random_uuid();
