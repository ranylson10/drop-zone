create table if not exists public.convites_produtora (
  id uuid primary key default gen_random_uuid(),
  produtora_id uuid not null references public.produtoras(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  convidado_por uuid not null references auth.users(id) on delete cascade,
  tipo public.tipo_membro not null default 'admin',
  status text not null default 'pendente' check (status in ('pendente', 'aceito', 'recusado', 'cancelado')),
  mensagem text,
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

create unique index if not exists ux_convites_produtora_pendente
  on public.convites_produtora (produtora_id, user_id)
  where status = 'pendente';

alter table public.convites_produtora enable row level security;

drop policy if exists "convites_produtora_select_related" on public.convites_produtora;
create policy "convites_produtora_select_related"
  on public.convites_produtora
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.produtoras p
      where p.id = convites_produtora.produtora_id
        and p.dono_id = auth.uid()
    )
    or exists (
      select 1 from public.membros_produtora mp
      where mp.produtora_id = convites_produtora.produtora_id
        and mp.user_id = auth.uid()
        and mp.tipo in ('dono', 'admin')
    )
  );
