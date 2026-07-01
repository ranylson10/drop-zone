do $$
begin
  if to_regclass('public.classificacao_geral') is not null then
    grant select on table public.classificacao_geral to anon, authenticated;
  end if;
end $$;
