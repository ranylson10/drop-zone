-- Funções auxiliares para saldo, retenção e webhook Pix

create or replace function public.incrementar_saldo(uid uuid, valor numeric)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.wallet_saldo (user_id, saldo, saldo_retido)
  values (uid, valor, 0)
  on conflict (user_id)
  do update
    set saldo = coalesce(public.wallet_saldo.saldo, 0) + valor;
end;
$$;

create or replace function public.reservar_saldo_confronto(uid uuid, valor numeric)
returns void
language plpgsql
security definer
as $$
begin
  update public.wallet_saldo
     set saldo = coalesce(saldo, 0) - valor,
         saldo_retido = coalesce(saldo_retido, 0) + valor
   where user_id = uid
     and coalesce(saldo, 0) >= valor;

  if not found then
    raise exception 'Saldo insuficiente para reservar o valor do confronto.';
  end if;
end;
$$;

create or replace function public.desfazer_reserva_saldo_confronto(uid uuid, valor numeric)
returns void
language plpgsql
security definer
as $$
begin
  update public.wallet_saldo
     set saldo = coalesce(saldo, 0) + valor,
         saldo_retido = greatest(coalesce(saldo_retido, 0) - valor, 0)
   where user_id = uid;
end;
$$;

create or replace function public.remover_retido(uid uuid, valor numeric)
returns void
language plpgsql
security definer
as $$
begin
  update public.wallet_saldo
     set saldo_retido = greatest(coalesce(saldo_retido, 0) - valor, 0)
   where user_id = uid;
end;
$$;

alter table if exists public.pagamentos_depositos
  add column if not exists user_id uuid,
  add column if not exists txid text,
  add column if not exists gateway text,
  add column if not exists gateway_status text,
  add column if not exists end_to_end_id text,
  add column if not exists qr_code text,
  add column if not exists pix_copia_cola text,
  add column if not exists payload jsonb,
  add column if not exists pago_em timestamptz;

create unique index if not exists pagamentos_depositos_txid_key
  on public.pagamentos_depositos (txid);
