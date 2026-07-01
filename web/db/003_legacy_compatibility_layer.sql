-- Camada de compatibilidade para o projeto antigo continuar funcionando
-- com o banco novo sem destruir o layout nem reescrever tudo de uma vez.

-- =========================================================
-- VIEW: perfis -> profiles
-- =========================================================
create or replace view public.perfis as
select
  p.id,
  p.username,
  coalesce(p.nome_exibicao, p.username) as nome,
  p.foto_url as avatar_url,
  null::text as capa_url,
  p.bio,
  concat_ws(', ', p.cidade, p.estado, p.pais) as localidade,
  null::date as data_nascimento,
  p.instagram,
  p.youtube,
  p.tiktok,
  p.created_at,
  p.updated_at
from public.profiles p;

-- =========================================================
-- VIEW: perfil_jogo -> perfis_jogo
-- =========================================================
create or replace view public.perfil_jogo as
select
  pj.id,
  pj.user_id as perfil_id,
  pj.user_id,
  pj.nick as nome,
  pj.nick,
  pj.uid_jogo as game_id,
  pj.uid_jogo,
  pj.funcao::text as funcao,
  null::text as avatar_url,
  pj.foto_capa as capa_url,
  pj.servidor,
  pj.plataforma::text as plataforma,
  pj.ativo,
  pj.created_at,
  pj.updated_at
from public.perfis_jogo pj;

-- =========================================================
-- FUNÇÃO: inserir/atualizar em perfis pela view antiga
-- =========================================================
create or replace function public.fn_perfis_view_upsert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cidade text;
  v_estado text;
  v_pais text;
begin
  v_cidade := nullif(split_part(coalesce(new.localidade, ''), ',', 1), '');
  v_estado := nullif(split_part(coalesce(new.localidade, ''), ',', 2), '');
  v_pais := nullif(split_part(coalesce(new.localidade, ''), ',', 3), '');

  insert into public.profiles (
    id,
    username,
    nome_exibicao,
    foto_url,
    bio,
    cidade,
    estado,
    pais,
    instagram,
    youtube,
    tiktok
  ) values (
    new.id,
    new.username,
    coalesce(new.nome, new.username),
    new.avatar_url,
    new.bio,
    v_cidade,
    v_estado,
    v_pais,
    new.instagram,
    new.youtube,
    new.tiktok
  )
  on conflict (id) do update set
    username = excluded.username,
    nome_exibicao = excluded.nome_exibicao,
    foto_url = excluded.foto_url,
    bio = excluded.bio,
    cidade = excluded.cidade,
    estado = excluded.estado,
    pais = excluded.pais,
    instagram = excluded.instagram,
    youtube = excluded.youtube,
    tiktok = excluded.tiktok,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists trg_perfis_view_upsert on public.perfis;
create trigger trg_perfis_view_upsert
instead of insert or update on public.perfis
for each row
execute function public.fn_perfis_view_upsert();

-- =========================================================
-- FUNÇÃO: inserir/atualizar em perfil_jogo pela view antiga
-- =========================================================
create or replace function public.fn_perfil_jogo_view_upsert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.perfis_jogo (
      user_id,
      nick,
      uid_jogo,
      servidor,
      funcao,
      plataforma,
      foto_capa,
      ativo
    ) values (
      coalesce(new.perfil_id, new.user_id),
      coalesce(new.nick, new.nome),
      coalesce(new.uid_jogo, new.game_id),
      new.servidor,
      nullif(new.funcao, '')::funcao_jogador,
      coalesce(nullif(new.plataforma, '')::plataforma_jogo, 'mobile'::plataforma_jogo),
      new.capa_url,
      coalesce(new.ativo, true)
    );
  else
    update public.perfis_jogo
    set
      nick = coalesce(new.nick, new.nome),
      uid_jogo = coalesce(new.uid_jogo, new.game_id),
      servidor = new.servidor,
      funcao = case when new.funcao is null or new.funcao = '' then null else new.funcao::funcao_jogador end,
      plataforma = coalesce(nullif(new.plataforma, '')::plataforma_jogo, plataforma),
      foto_capa = new.capa_url,
      ativo = coalesce(new.ativo, ativo),
      updated_at = now()
    where id = old.id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_perfil_jogo_view_upsert on public.perfil_jogo;
create trigger trg_perfil_jogo_view_upsert
instead of insert or update on public.perfil_jogo
for each row
execute function public.fn_perfil_jogo_view_upsert();
