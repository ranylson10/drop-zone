create table if not exists public.stream_pontuador_links (
  id uuid primary key default gen_random_uuid(),
  campeonato_id uuid not null,
  token text not null unique,
  label text not null default 'Pontuador da live',
  delay_seconds integer not null default 300,
  ativo boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists stream_pontuador_links_campeonato_idx
  on public.stream_pontuador_links (campeonato_id);

create table if not exists public.stream_live_resultados_jogos (
  id uuid primary key default gen_random_uuid(),
  campeonato_id uuid not null,
  fase_id uuid,
  jogo_id uuid not null,
  equipe_id uuid not null,
  grupo_id uuid,
  mapa text not null,
  abates integer not null default 0,
  posicao integer not null default 12,
  total_pontos integer not null default 0,
  source text not null default 'sumula',
  updated_by_link_id uuid references public.stream_pontuador_links(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (jogo_id, mapa, equipe_id)
);

create index if not exists stream_live_resultados_jogos_campeonato_idx
  on public.stream_live_resultados_jogos (campeonato_id);

create index if not exists stream_live_resultados_jogos_jogo_mapa_idx
  on public.stream_live_resultados_jogos (jogo_id, mapa);

grant select, insert, update, delete on public.stream_live_resultados_jogos to anon, authenticated;
grant select, insert, update on public.stream_pontuador_links to anon, authenticated;
