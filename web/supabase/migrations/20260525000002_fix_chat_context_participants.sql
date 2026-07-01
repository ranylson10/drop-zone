create or replace function public.chat_sincronizar_participantes_contexto(p_conversa_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_tipo text;
  v_referencia_tipo text;
  v_referencia_id uuid;
begin
  select tipo, referencia_tipo, referencia_id
    into v_tipo, v_referencia_tipo, v_referencia_id
  from public.chat_conversas
  where id = p_conversa_id;

  if v_referencia_id is null then
    return;
  end if;

  if v_tipo = 'equipe' or v_referencia_tipo = 'equipe' then
    insert into public.chat_participantes (conversa_id, user_id, papel)
    select distinct p_conversa_id, user_id, papel
    from (
      select e.criado_por as user_id, 'dono'::text as papel
      from public.equipes e
      where e.id = v_referencia_id
        and e.criado_por is not null
      union all
      select me.user_id, coalesce(me.tipo::text, 'membro') as papel
      from public.membros_equipe me
      where me.equipe_id = v_referencia_id
        and coalesce(me.ativo, true) = true
        and me.user_id is not null
      union all
      select pj.user_id, coalesce(me.tipo::text, 'membro') as papel
      from public.membros_equipe me
      join public.perfis_jogo pj on pj.id = me.perfil_jogo_id
      where me.equipe_id = v_referencia_id
        and coalesce(me.ativo, true) = true
        and pj.user_id is not null
    ) participantes
    where user_id is not null
    on conflict (conversa_id, user_id) do nothing;
  end if;

  if v_tipo = 'campeonato' or v_referencia_tipo = 'campeonato' then
    insert into public.chat_participantes (conversa_id, user_id, papel)
    select distinct p_conversa_id, user_id, 'membro'
    from (
      select me.user_id
      from public.campeonato_equipes ce
      join public.membros_equipe me on me.equipe_id = ce.equipe_id
      where ce.campeonato_id = v_referencia_id
        and ce.equipe_id is not null
        and coalesce(me.ativo, true) = true
        and me.user_id is not null
      union all
      select pj.user_id
      from public.campeonato_equipes ce
      join public.membros_equipe me on me.equipe_id = ce.equipe_id
      join public.perfis_jogo pj on pj.id = me.perfil_jogo_id
      where ce.campeonato_id = v_referencia_id
        and ce.equipe_id is not null
        and coalesce(me.ativo, true) = true
        and pj.user_id is not null
    ) participantes
    where user_id is not null
    on conflict (conversa_id, user_id) do nothing;
  end if;

  if v_tipo = 'grupo_campeonato' or v_referencia_tipo in ('grupo', 'grupo_campeonato', 'campeonato_grupo') then
    insert into public.chat_participantes (conversa_id, user_id, papel)
    select distinct p_conversa_id, user_id, 'membro'
    from (
      select me.user_id
      from public.campeonato_grupo_slots cgs
      join public.campeonato_equipes ce on ce.id = cgs.campeonato_equipe_id
      join public.membros_equipe me on me.equipe_id = ce.equipe_id
      where cgs.grupo_id = v_referencia_id
        and ce.equipe_id is not null
        and coalesce(me.ativo, true) = true
        and me.user_id is not null
      union all
      select pj.user_id
      from public.campeonato_grupo_slots cgs
      join public.campeonato_equipes ce on ce.id = cgs.campeonato_equipe_id
      join public.membros_equipe me on me.equipe_id = ce.equipe_id
      join public.perfis_jogo pj on pj.id = me.perfil_jogo_id
      where cgs.grupo_id = v_referencia_id
        and ce.equipe_id is not null
        and coalesce(me.ativo, true) = true
        and pj.user_id is not null
    ) participantes
    where user_id is not null
    on conflict (conversa_id, user_id) do nothing;
  end if;

  if v_tipo = 'dm' or v_referencia_tipo = 'jogador' then
    insert into public.chat_participantes (conversa_id, user_id, papel)
    select distinct p_conversa_id, pj.user_id, 'membro'
    from public.perfis_jogo pj
    where pj.id = v_referencia_id
      and pj.user_id is not null
    on conflict (conversa_id, user_id) do nothing;
  end if;
end;
$$;

create or replace function public.chat_abrir_conversa(
  p_tipo text,
  p_titulo text,
  p_avatar_url text,
  p_referencia_tipo text,
  p_referencia_id uuid
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_user_id uuid;
  v_conversa_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Usuario nao autenticado';
  end if;

  select id
    into v_conversa_id
  from public.chat_conversas
  where tipo = p_tipo
    and referencia_tipo = p_referencia_tipo
    and referencia_id = p_referencia_id
  limit 1;

  if v_conversa_id is null then
    insert into public.chat_conversas (
      tipo,
      titulo,
      avatar_url,
      referencia_tipo,
      referencia_id,
      criado_por_user_id
    )
    values (
      p_tipo,
      p_titulo,
      p_avatar_url,
      p_referencia_tipo,
      p_referencia_id,
      v_user_id
    )
    returning id into v_conversa_id;
  end if;

  insert into public.chat_participantes (conversa_id, user_id, papel)
  values (v_conversa_id, v_user_id, 'membro')
  on conflict (conversa_id, user_id) do nothing;

  perform public.chat_sincronizar_participantes_contexto(v_conversa_id);

  return v_conversa_id;
end;
$$;
