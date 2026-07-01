-- Base para separar os modos de competição do Free Fire
-- 4x4, diário, xtreino, copa e liga

alter table public.campeonatos
  add column if not exists tipo_competicao text;

alter table public.campeonatos
  add column if not exists modelo_competicao text;

update public.campeonatos
set tipo_competicao = case
  when lower(coalesce(formato, '')) in ('diário', 'diario') then 'diario'
  when lower(coalesce(formato, '')) = 'liga' then 'liga'
  when lower(coalesce(formato, '')) = 'copa' then 'copa'
  when lower(coalesce(formato, '')) in ('4x4', 'confronto') then '4x4'
  when lower(coalesce(formato, '')) in ('xtreino', 'treino', 'showmatch', 'semanal') then 'xtreino'
  else coalesce(tipo_competicao, 'diario')
end
where tipo_competicao is null;

update public.campeonatos
set modelo_competicao = case
  when tipo_competicao = '4x4' then 'confronto'
  when tipo_competicao = 'diario' then 'grupo_unico'
  when tipo_competicao = 'xtreino' then 'flexivel'
  when tipo_competicao = 'copa' then 'mata_mata'
  when tipo_competicao = 'liga' then 'pontos_corridos'
  else coalesce(modelo_competicao, 'grupo_unico')
end
where modelo_competicao is null;

alter table public.campeonatos
  drop constraint if exists campeonatos_tipo_competicao_check;

alter table public.campeonatos
  add constraint campeonatos_tipo_competicao_check
  check (tipo_competicao in ('4x4', 'diario', 'xtreino', 'copa', 'liga'));

alter table public.campeonatos
  drop constraint if exists campeonatos_modelo_competicao_check;

alter table public.campeonatos
  add constraint campeonatos_modelo_competicao_check
  check (modelo_competicao in ('confronto', 'grupo_unico', 'flexivel', 'mata_mata', 'pontos_corridos'));

create index if not exists idx_campeonatos_tipo_competicao
  on public.campeonatos (tipo_competicao);

create index if not exists idx_campeonatos_modelo_competicao
  on public.campeonatos (modelo_competicao);

create table if not exists public.campeonatos_4x4_config (
  campeonato_id uuid primary key references public.campeonatos(id) on delete cascade,
  melhor_de integer default 1,
  rounds_por_lado integer default 6,
  troca_de_lado boolean default true,
  admin_mode text,
  regra_wo text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.campeonatos_diarios_config (
  campeonato_id uuid primary key references public.campeonatos(id) on delete cascade,
  quantidade_quedas integer default 6,
  equipes_por_jogo integer default 12,
  grupo_unico boolean default true,
  criterio_desempate text,
  quantidade_classificados integer,
  mapa_rotacao text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.campeonatos_xtreinos_config (
  campeonato_id uuid primary key references public.campeonatos(id) on delete cascade,
  quantidade_quedas integer default 4,
  sala_aberta boolean default false,
  pontua boolean default true,
  vale_ranking boolean default false,
  permite_convidado boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.campeonatos_copas_config (
  campeonato_id uuid primary key references public.campeonatos(id) on delete cascade,
  melhor_de integer default 1,
  formato_chave text default 'mata_mata_simples',
  quantidade_fases integer,
  terceiro_lugar boolean default false,
  criterio_desempate text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.campeonatos_ligas_config (
  campeonato_id uuid primary key references public.campeonatos(id) on delete cascade,
  quantidade_rodadas integer default 1,
  quantidade_quedas integer default 6,
  pontos_por_abate numeric(10,2) default 1,
  sistema_pontos_tipo text default 'padrao',
  descarte_de_rodadas boolean default false,
  quantidade_classificados_playoff integer,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.campeonato_fases_v2 (
  id uuid primary key default gen_random_uuid(),
  campeonato_id uuid not null references public.campeonatos(id) on delete cascade,
  nome text not null,
  tipo_fase text not null,
  ordem integer not null default 1,
  status text default 'rascunho',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_campeonato_fases_v2_campeonato
  on public.campeonato_fases_v2 (campeonato_id, ordem);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_campeonatos_4x4_config_updated_at on public.campeonatos_4x4_config;
create trigger trg_campeonatos_4x4_config_updated_at
before update on public.campeonatos_4x4_config
for each row execute function public.set_updated_at();

drop trigger if exists trg_campeonatos_diarios_config_updated_at on public.campeonatos_diarios_config;
create trigger trg_campeonatos_diarios_config_updated_at
before update on public.campeonatos_diarios_config
for each row execute function public.set_updated_at();

drop trigger if exists trg_campeonatos_xtreinos_config_updated_at on public.campeonatos_xtreinos_config;
create trigger trg_campeonatos_xtreinos_config_updated_at
before update on public.campeonatos_xtreinos_config
for each row execute function public.set_updated_at();

drop trigger if exists trg_campeonatos_copas_config_updated_at on public.campeonatos_copas_config;
create trigger trg_campeonatos_copas_config_updated_at
before update on public.campeonatos_copas_config
for each row execute function public.set_updated_at();

drop trigger if exists trg_campeonatos_ligas_config_updated_at on public.campeonatos_ligas_config;
create trigger trg_campeonatos_ligas_config_updated_at
before update on public.campeonatos_ligas_config
for each row execute function public.set_updated_at();

drop trigger if exists trg_campeonato_fases_v2_updated_at on public.campeonato_fases_v2;
create trigger trg_campeonato_fases_v2_updated_at
before update on public.campeonato_fases_v2
for each row execute function public.set_updated_at();
