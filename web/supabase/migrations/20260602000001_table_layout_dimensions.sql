alter table public.campeonato_layout
  add column if not exists table_width integer default 100,
  add column if not exists column_widths jsonb default '{}'::jsonb,
  add column if not exists row_bg_image_url text,
  add column if not exists row_bg_image_opacity integer default 100;
