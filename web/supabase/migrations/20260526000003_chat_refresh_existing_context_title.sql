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
  else
    update public.chat_conversas
      set titulo = coalesce(nullif(p_titulo, ''), titulo),
          avatar_url = coalesce(p_avatar_url, avatar_url)
    where id = v_conversa_id;
  end if;

  insert into public.chat_participantes (conversa_id, user_id, papel)
  values (v_conversa_id, v_user_id, 'membro')
  on conflict (conversa_id, user_id) do nothing;

  perform public.chat_sincronizar_participantes_contexto(v_conversa_id);

  return v_conversa_id;
end;
$$;
