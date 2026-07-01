create or replace function public.chat_usuario_pode_participar_contexto(
  p_tipo text,
  p_referencia_tipo text,
  p_referencia_id uuid,
  p_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if p_user_id is null then
    return false;
  end if;

  if p_referencia_id is null then
    return p_tipo in ('geral', 'dm');
  end if;

  if p_tipo in ('geral', 'dm', 'equipe', 'produtora')
    or p_referencia_tipo in ('geral', 'jogador', 'perfil', 'equipe', 'produtora') then
    return true;
  end if;

  if p_tipo = 'campeonato' or p_referencia_tipo = 'campeonato' then
    return exists (
      select 1
      from public.campeonatos c
      where c.id = p_referencia_id
        and (
          c.criado_por = p_user_id
          or exists (
            select 1
            from public.produtoras pr
            where pr.id = c.produtora_id
              and pr.dono_id = p_user_id
          )
          or exists (
            select 1
            from public.membros_produtora mp
            where mp.produtora_id = c.produtora_id
              and mp.user_id = p_user_id
          )
          or exists (
            select 1
            from public.campeonato_equipes ce
            where ce.campeonato_id = c.id
              and ce.registrado_por = p_user_id
          )
          or exists (
            select 1
            from public.campeonato_equipes ce
            join public.membros_equipe me on me.equipe_id = ce.equipe_id
            where ce.campeonato_id = c.id
              and coalesce(me.ativo, true) = true
              and me.user_id = p_user_id
          )
          or exists (
            select 1
            from public.campeonato_equipes ce
            join public.membros_equipe me on me.equipe_id = ce.equipe_id
            join public.perfis_jogo pj on pj.id = me.perfil_jogo_id
            where ce.campeonato_id = c.id
              and coalesce(me.ativo, true) = true
              and pj.user_id = p_user_id
          )
        )
    );
  end if;

  if p_tipo = 'grupo_campeonato' or p_referencia_tipo in ('grupo', 'grupo_campeonato', 'campeonato_grupo') then
    return exists (
      select 1
      from public.campeonato_grupos cg
      join public.campeonatos c on c.id = cg.campeonato_id
      where cg.id = p_referencia_id
        and (
          c.criado_por = p_user_id
          or exists (
            select 1
            from public.produtoras pr
            where pr.id = c.produtora_id
              and pr.dono_id = p_user_id
          )
          or exists (
            select 1
            from public.membros_produtora mp
            where mp.produtora_id = c.produtora_id
              and mp.user_id = p_user_id
          )
          or exists (
            select 1
            from public.campeonato_grupo_slots cgs
            join public.campeonato_equipes ce on ce.id = cgs.campeonato_equipe_id
            where cgs.grupo_id = cg.id
              and ce.registrado_por = p_user_id
          )
          or exists (
            select 1
            from public.campeonato_grupo_slots cgs
            join public.campeonato_equipes ce on ce.id = cgs.campeonato_equipe_id
            join public.membros_equipe me on me.equipe_id = ce.equipe_id
            where cgs.grupo_id = cg.id
              and coalesce(me.ativo, true) = true
              and me.user_id = p_user_id
          )
          or exists (
            select 1
            from public.campeonato_grupo_slots cgs
            join public.campeonato_equipes ce on ce.id = cgs.campeonato_equipe_id
            join public.membros_equipe me on me.equipe_id = ce.equipe_id
            join public.perfis_jogo pj on pj.id = me.perfil_jogo_id
            where cgs.grupo_id = cg.id
              and coalesce(me.ativo, true) = true
              and pj.user_id = p_user_id
          )
        )
    );
  end if;

  return true;
end;
$$;

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
      where e.id = v_referencia_id and e.criado_por is not null
      union all
      select me.user_id, coalesce(me.tipo::text, 'membro') as papel
      from public.membros_equipe me
      where me.equipe_id = v_referencia_id and coalesce(me.ativo, true) = true and me.user_id is not null
      union all
      select pj.user_id, coalesce(me.tipo::text, 'membro') as papel
      from public.membros_equipe me
      join public.perfis_jogo pj on pj.id = me.perfil_jogo_id
      where me.equipe_id = v_referencia_id and coalesce(me.ativo, true) = true and pj.user_id is not null
    ) participantes
    where user_id is not null
    on conflict (conversa_id, user_id) do nothing;
  end if;

  if v_tipo = 'produtora' or v_referencia_tipo = 'produtora' then
    insert into public.chat_participantes (conversa_id, user_id, papel)
    select distinct p_conversa_id, user_id, papel
    from (
      select p.dono_id as user_id, 'dono'::text as papel
      from public.produtoras p
      where p.id = v_referencia_id and p.dono_id is not null
      union all
      select mp.user_id, coalesce(mp.tipo::text, 'staff') as papel
      from public.membros_produtora mp
      where mp.produtora_id = v_referencia_id and mp.user_id is not null
    ) participantes
    where user_id is not null
    on conflict (conversa_id, user_id) do nothing;
  end if;

  if v_tipo = 'campeonato' or v_referencia_tipo = 'campeonato' then
    insert into public.chat_participantes (conversa_id, user_id, papel)
    select distinct p_conversa_id, user_id, papel
    from (
      select c.criado_por as user_id, 'organizador'::text as papel
      from public.campeonatos c
      where c.id = v_referencia_id and c.criado_por is not null
      union all
      select pr.dono_id, 'produtora'
      from public.campeonatos c
      join public.produtoras pr on pr.id = c.produtora_id
      where c.id = v_referencia_id and pr.dono_id is not null
      union all
      select mp.user_id, coalesce(mp.tipo::text, 'staff')
      from public.campeonatos c
      join public.membros_produtora mp on mp.produtora_id = c.produtora_id
      where c.id = v_referencia_id and mp.user_id is not null
      union all
      select ce.registrado_por, 'inscrito'
      from public.campeonato_equipes ce
      where ce.campeonato_id = v_referencia_id and ce.registrado_por is not null
      union all
      select me.user_id, 'membro'
      from public.campeonato_equipes ce
      join public.membros_equipe me on me.equipe_id = ce.equipe_id
      where ce.campeonato_id = v_referencia_id and coalesce(me.ativo, true) = true and me.user_id is not null
      union all
      select pj.user_id, 'membro'
      from public.campeonato_equipes ce
      join public.membros_equipe me on me.equipe_id = ce.equipe_id
      join public.perfis_jogo pj on pj.id = me.perfil_jogo_id
      where ce.campeonato_id = v_referencia_id and coalesce(me.ativo, true) = true and pj.user_id is not null
    ) participantes
    where user_id is not null
    on conflict (conversa_id, user_id) do nothing;
  end if;

  if v_tipo = 'grupo_campeonato' or v_referencia_tipo in ('grupo', 'grupo_campeonato', 'campeonato_grupo') then
    insert into public.chat_participantes (conversa_id, user_id, papel)
    select distinct p_conversa_id, user_id, papel
    from (
      select c.criado_por as user_id, 'organizador'::text as papel
      from public.campeonato_grupos cg
      join public.campeonatos c on c.id = cg.campeonato_id
      where cg.id = v_referencia_id and c.criado_por is not null
      union all
      select pr.dono_id, 'produtora'
      from public.campeonato_grupos cg
      join public.campeonatos c on c.id = cg.campeonato_id
      join public.produtoras pr on pr.id = c.produtora_id
      where cg.id = v_referencia_id and pr.dono_id is not null
      union all
      select mp.user_id, coalesce(mp.tipo::text, 'staff')
      from public.campeonato_grupos cg
      join public.campeonatos c on c.id = cg.campeonato_id
      join public.membros_produtora mp on mp.produtora_id = c.produtora_id
      where cg.id = v_referencia_id and mp.user_id is not null
      union all
      select ce.registrado_por, 'inscrito'
      from public.campeonato_grupo_slots cgs
      join public.campeonato_equipes ce on ce.id = cgs.campeonato_equipe_id
      where cgs.grupo_id = v_referencia_id and ce.registrado_por is not null
      union all
      select me.user_id, 'membro'
      from public.campeonato_grupo_slots cgs
      join public.campeonato_equipes ce on ce.id = cgs.campeonato_equipe_id
      join public.membros_equipe me on me.equipe_id = ce.equipe_id
      where cgs.grupo_id = v_referencia_id and coalesce(me.ativo, true) = true and me.user_id is not null
      union all
      select pj.user_id, 'membro'
      from public.campeonato_grupo_slots cgs
      join public.campeonato_equipes ce on ce.id = cgs.campeonato_equipe_id
      join public.membros_equipe me on me.equipe_id = ce.equipe_id
      join public.perfis_jogo pj on pj.id = me.perfil_jogo_id
      where cgs.grupo_id = v_referencia_id and coalesce(me.ativo, true) = true and pj.user_id is not null
    ) participantes
    where user_id is not null
    on conflict (conversa_id, user_id) do nothing;
  end if;

  if v_tipo = 'dm' or v_referencia_tipo = 'jogador' then
    insert into public.chat_participantes (conversa_id, user_id, papel)
    select distinct p_conversa_id, pj.user_id, 'membro'
    from public.perfis_jogo pj
    where pj.id = v_referencia_id and pj.user_id is not null
    on conflict (conversa_id, user_id) do nothing;
  end if;

  if v_referencia_tipo = 'perfil' then
    insert into public.chat_participantes (conversa_id, user_id, papel)
    select p_conversa_id, p.id, 'membro'
    from public.profiles p
    where p.id = v_referencia_id
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

  if not public.chat_usuario_pode_participar_contexto(p_tipo, p_referencia_tipo, p_referencia_id, v_user_id) then
    raise exception 'Apenas inscritos, organizadores ou staff podem participar deste chat';
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

drop policy if exists public_select_chat_conversas on public.chat_conversas;
drop policy if exists public_select_chat_mensagens on public.chat_mensagens;
drop policy if exists chat_participantes_insert_self on public.chat_participantes;

create policy chat_participantes_insert_self
on public.chat_participantes
for insert
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.chat_conversas c
    where c.id = conversa_id
      and public.chat_usuario_pode_participar_contexto(c.tipo, c.referencia_tipo, c.referencia_id, auth.uid())
  )
);
