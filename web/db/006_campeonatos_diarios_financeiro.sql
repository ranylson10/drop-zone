-- Financeiro dos campeonatos diários
-- inscrição pela carteira, retenção, taxa do site, pagamento do campeão e crédito do organizador

create table if not exists public.campeonato_diario_inscricoes_pagamento (
  id uuid primary key default gen_random_uuid(),
  campeonato_id uuid not null references public.campeonatos(id) on delete cascade,
  equipe_id uuid not null references public.equipes(id) on delete cascade,
  responsavel_user_id uuid not null references auth.users(id) on delete cascade,
  valor numeric(12,2) not null default 0,
  percentual_site numeric(6,2) not null default 10,
  percentual_premiacao numeric(6,2) not null default 70,
  valor_site numeric(12,2) not null default 0,
  valor_organizacao numeric(12,2) not null default 0,
  valor_premiacao numeric(12,2) not null default 0,
  status text not null default 'pago',
  origem text not null default 'carteira',
  txid text,
  gateway text,
  gateway_status text,
  payload jsonb,
  pago_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campeonato_id, equipe_id)
);

create index if not exists idx_campeonato_diario_inscricoes_campeonato
  on public.campeonato_diario_inscricoes_pagamento (campeonato_id, status);

create table if not exists public.campeonato_diario_escrow (
  campeonato_id uuid primary key references public.campeonatos(id) on delete cascade,
  valor_total_bruto numeric(12,2) not null default 0,
  valor_total_site numeric(12,2) not null default 0,
  valor_total_organizacao numeric(12,2) not null default 0,
  valor_total_premiacao numeric(12,2) not null default 0,
  total_equipes_pagas integer not null default 0,
  status text not null default 'aberto',
  campeao_equipe_id uuid references public.equipes(id) on delete set null,
  fechado_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campeonato_diario_pagamentos_finais (
  id uuid primary key default gen_random_uuid(),
  campeonato_id uuid not null references public.campeonatos(id) on delete cascade,
  destinatario_tipo text not null,
  destinatario_user_id uuid references auth.users(id) on delete set null,
  equipe_id uuid references public.equipes(id) on delete set null,
  valor numeric(12,2) not null default 0,
  status text not null default 'pago',
  observacoes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_campeonato_diario_pagamentos_finais_campeonato
  on public.campeonato_diario_pagamentos_finais (campeonato_id, destinatario_tipo);

create or replace function public.recalcular_escrow_campeonato_diario(p_campeonato_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_total_bruto numeric(12,2);
  v_total_site numeric(12,2);
  v_total_organizacao numeric(12,2);
  v_total_premiacao numeric(12,2);
  v_total_equipes integer;
begin
  select
    coalesce(sum(valor), 0),
    coalesce(sum(valor_site), 0),
    coalesce(sum(valor_organizacao), 0),
    coalesce(sum(valor_premiacao), 0),
    count(*)
  into
    v_total_bruto,
    v_total_site,
    v_total_organizacao,
    v_total_premiacao,
    v_total_equipes
  from public.campeonato_diario_inscricoes_pagamento
  where campeonato_id = p_campeonato_id
    and status = 'pago';

  insert into public.campeonato_diario_escrow (
    campeonato_id,
    valor_total_bruto,
    valor_total_site,
    valor_total_organizacao,
    valor_total_premiacao,
    total_equipes_pagas,
    status
  ) values (
    p_campeonato_id,
    v_total_bruto,
    v_total_site,
    v_total_organizacao,
    v_total_premiacao,
    v_total_equipes,
    'aberto'
  )
  on conflict (campeonato_id)
  do update set
    valor_total_bruto = excluded.valor_total_bruto,
    valor_total_site = excluded.valor_total_site,
    valor_total_organizacao = excluded.valor_total_organizacao,
    valor_total_premiacao = excluded.valor_total_premiacao,
    total_equipes_pagas = excluded.total_equipes_pagas,
    updated_at = now();
end;
$$;

create or replace function public.reservar_inscricao_campeonato_diario(
  p_campeonato_id uuid,
  p_equipe_id uuid,
  p_user_id uuid,
  p_valor numeric,
  p_percentual_site numeric default 10,
  p_percentual_premiacao numeric default 70
)
returns void
language plpgsql
security definer
as $$
declare
  v_percentual_site numeric(6,2);
  v_percentual_premiacao numeric(6,2);
  v_valor_site numeric(12,2);
  v_valor_premiacao numeric(12,2);
  v_valor_organizacao numeric(12,2);
begin
  if coalesce(p_valor, 0) <= 0 then
    raise exception 'Valor de inscrição inválido.';
  end if;

  if exists (
    select 1
    from public.campeonato_diario_inscricoes_pagamento
    where campeonato_id = p_campeonato_id
      and equipe_id = p_equipe_id
  ) then
    raise exception 'Essa equipe já pagou a inscrição deste campeonato diário.';
  end if;

  update public.wallet_saldo
     set saldo = coalesce(saldo, 0) - p_valor,
         saldo_retido = coalesce(saldo_retido, 0) + p_valor
   where user_id = p_user_id
     and coalesce(saldo, 0) >= p_valor;

  if not found then
    raise exception 'Saldo insuficiente para pagar a inscrição.';
  end if;

  v_percentual_site := greatest(0, least(100, coalesce(p_percentual_site, 10)));
  v_percentual_premiacao := greatest(0, least(100 - v_percentual_site, coalesce(p_percentual_premiacao, 70)));

  v_valor_site := round((p_valor * v_percentual_site / 100.0)::numeric, 2);
  v_valor_premiacao := round((p_valor * v_percentual_premiacao / 100.0)::numeric, 2);
  v_valor_organizacao := round((p_valor - v_valor_site - v_valor_premiacao)::numeric, 2);

  insert into public.campeonato_diario_inscricoes_pagamento (
    campeonato_id,
    equipe_id,
    responsavel_user_id,
    valor,
    percentual_site,
    percentual_premiacao,
    valor_site,
    valor_organizacao,
    valor_premiacao,
    status,
    origem,
    pago_em
  ) values (
    p_campeonato_id,
    p_equipe_id,
    p_user_id,
    p_valor,
    v_percentual_site,
    v_percentual_premiacao,
    v_valor_site,
    v_valor_organizacao,
    v_valor_premiacao,
    'pago',
    'carteira',
    now()
  );

  insert into public.campeonato_equipes (
    campeonato_id,
    equipe_id,
    equipe_avulsa_id,
    tipo_origem,
    status
  ) values (
    p_campeonato_id,
    p_equipe_id,
    null,
    'oficial',
    'ativa'
  )
  on conflict do nothing;

  perform public.recalcular_escrow_campeonato_diario(p_campeonato_id);
end;
$$;

create or replace function public.finalizar_campeonato_diario(
  p_campeonato_id uuid,
  p_equipe_campea_id uuid,
  p_organizador_user_id uuid
)
returns void
language plpgsql
security definer
as $$
declare
  v_total_bruto numeric(12,2);
  v_total_site numeric(12,2);
  v_total_organizacao numeric(12,2);
  v_total_premiacao numeric(12,2);
  v_user_inscricao record;
begin
  select
    valor_total_bruto,
    valor_total_site,
    valor_total_organizacao,
    valor_total_premiacao
  into
    v_total_bruto,
    v_total_site,
    v_total_organizacao,
    v_total_premiacao
  from public.campeonato_diario_escrow
  where campeonato_id = p_campeonato_id
  for update;

  if not found then
    raise exception 'Escrow do campeonato diário não encontrado.';
  end if;

  if exists (
    select 1 from public.campeonato_diario_escrow
    where campeonato_id = p_campeonato_id and status = 'finalizado'
  ) then
    raise exception 'Esse campeonato diário já foi finalizado.';
  end if;

  for v_user_inscricao in
    select responsavel_user_id, valor
    from public.campeonato_diario_inscricoes_pagamento
    where campeonato_id = p_campeonato_id
      and status = 'pago'
  loop
    update public.wallet_saldo
       set saldo_retido = greatest(coalesce(saldo_retido, 0) - v_user_inscricao.valor, 0)
     where user_id = v_user_inscricao.responsavel_user_id;
  end loop;

  if coalesce(v_total_premiacao, 0) > 0 then
    perform public.incrementar_saldo(
      (
        select e.criado_por
        from public.equipes e
        where e.id = p_equipe_campea_id
        limit 1
      ),
      v_total_premiacao
    );

    insert into public.campeonato_diario_pagamentos_finais (
      campeonato_id,
      destinatario_tipo,
      equipe_id,
      valor,
      status,
      observacoes
    ) values (
      p_campeonato_id,
      'campeao',
      p_equipe_campea_id,
      v_total_premiacao,
      'pago',
      'Premiação do campeão do campeonato diário'
    );
  end if;

  if coalesce(v_total_organizacao, 0) > 0 then
    perform public.incrementar_saldo(p_organizador_user_id, v_total_organizacao);

    insert into public.campeonato_diario_pagamentos_finais (
      campeonato_id,
      destinatario_tipo,
      destinatario_user_id,
      valor,
      status,
      observacoes
    ) values (
      p_campeonato_id,
      'organizador',
      p_organizador_user_id,
      v_total_organizacao,
      'pago',
      'Crédito líquido do organizador do campeonato diário'
    );
  end if;

  insert into public.campeonato_diario_pagamentos_finais (
    campeonato_id,
    destinatario_tipo,
    valor,
    status,
    observacoes
  ) values (
    p_campeonato_id,
    'site',
    coalesce(v_total_site, 0),
    'retido',
    'Taxa da plataforma descontada do campeonato diário'
  );

  update public.campeonato_diario_escrow
     set status = 'finalizado',
         campeao_equipe_id = p_equipe_campea_id,
         fechado_em = now(),
         updated_at = now()
   where campeonato_id = p_campeonato_id;

  update public.campeonatos
     set status = 'finalizado'
   where id = p_campeonato_id;
end;
$$;

drop trigger if exists trg_campeonato_diario_inscricoes_updated_at on public.campeonato_diario_inscricoes_pagamento;
create trigger trg_campeonato_diario_inscricoes_updated_at
before update on public.campeonato_diario_inscricoes_pagamento
for each row execute function public.set_updated_at();

drop trigger if exists trg_campeonato_diario_escrow_updated_at on public.campeonato_diario_escrow;
create trigger trg_campeonato_diario_escrow_updated_at
before update on public.campeonato_diario_escrow
for each row execute function public.set_updated_at();
