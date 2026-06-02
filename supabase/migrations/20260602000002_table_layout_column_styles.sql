alter table public.campeonato_layout
add column if not exists column_styles jsonb not null default '{}'::jsonb;
