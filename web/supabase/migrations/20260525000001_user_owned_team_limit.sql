create or replace function public.fn_equipes_criar_dono_automatico()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_total_equipes integer;
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

  return new;
end;
$$;
