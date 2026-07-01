create or replace function public.fn_equipes_criar_dono_automatico()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_total_equipes integer;
  v_line_id uuid;
begin
  if new.criado_por is null then
    return new;
  end if;

  select count(*)
    into v_total_equipes
  from public.equipes e
  where e.criado_por = new.criado_por;

  if v_total_equipes > 2 then
    raise exception 'Limite de 2 equipes por usuario atingido.' using errcode = '23514';
  end if;

  if not exists (
    select 1
    from public.membros_equipe me
    where me.equipe_id = new.id
      and me.user_id = new.criado_por
      and me.ativo = true
  ) then
    insert into public.membros_equipe (equipe_id, user_id, tipo, ativo, entrou_em, created_at)
    values (new.id, new.criado_por, 'dono', true, now(), now());
  end if;

  if to_regclass('public.lines') is not null
    and not exists (
      select 1
      from public.lines l
      where l.equipe_id = new.id
        and coalesce(l.tipo, '') = 'principal'
    )
  then
    insert into public.lines (
      nome,
      tipo,
      visibilidade,
      plataforma,
      ativa,
      created_by,
      equipe_id,
      created_at,
      updated_at
    )
    values (
      coalesce(nullif(new.nome, ''), 'Equipe') || ' - Principal',
      'principal',
      'equipe',
      null,
      true,
      new.criado_por,
      new.id,
      now(),
      now()
    )
    returning id into v_line_id;

    if to_regclass('public.equipes_lines_vinculos') is not null
      and not exists (
        select 1
        from public.equipes_lines_vinculos elv
        where elv.equipe_id = new.id
          and elv.line_id = v_line_id
      )
    then
      insert into public.equipes_lines_vinculos (equipe_id, line_id, tipo_vinculo, created_at)
      values (new.id, v_line_id, 'principal', now());
    end if;
  end if;

  return new;
end;
$$;
